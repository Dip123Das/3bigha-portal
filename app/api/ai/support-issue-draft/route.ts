import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SupportGovernance = {
  ai_issue_category: string;
  ai_urgency: string;
  ai_risk_flag: string;
  escalation_level: number;
};

function fallbackDraft(input: string) {
  const text = String(input || "").trim();

  return `I am facing the following issue on 3bigha.com:

${text || "I need help regarding my account, listing, enquiry, or transaction workflow."}

Please check this issue and guide me through the written support ticket system. I understand that support will be provided in writing only and no phone call is required.`;
}

function fallbackGovernance(category?: string): SupportGovernance {
  return {
    ai_issue_category: String(category || "general").toLowerCase(),
    ai_urgency: "normal",
    ai_risk_flag: "none",
    escalation_level: 0,
  };
}

function extractText(payload: any): string {
  if (typeof payload?.output_text === "string") return payload.output_text;

  const parts = payload?.output
    ?.flatMap((item: any) => item?.content || [])
    ?.map((content: any) => content?.text)
    ?.filter(Boolean);

  return parts?.join("\n") || "";
}

function extractJsonObject(raw: string): any | null {
  const text = String(raw || "").trim();

  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;

    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function normalizeGovernance(input: any, category: string): SupportGovernance {
  const allowedCategories = [
    "login",
    "listing",
    "payment",
    "rfq",
    "chat",
    "vendor",
    "buyer",
    "technical",
    "fraud",
    "abuse",
    "legal",
    "general",
  ];

  const allowedUrgencies = ["low", "normal", "high", "critical"];

  const allowedRiskFlags = [
    "none",
    "fraud_risk",
    "payment_risk",
    "abuse_risk",
    "legal_risk",
    "technical_risk",
  ];

  const base = fallbackGovernance(category);

  const issueCategory = String(input?.ai_issue_category || base.ai_issue_category)
    .toLowerCase()
    .trim();

  const urgency = String(input?.ai_urgency || base.ai_urgency)
    .toLowerCase()
    .trim();

  const riskFlag = String(input?.ai_risk_flag || base.ai_risk_flag)
    .toLowerCase()
    .trim();

  const rawEscalation = Number(input?.escalation_level ?? base.escalation_level);
  const escalationLevel = Number.isFinite(rawEscalation)
    ? Math.max(0, Math.min(3, Math.round(rawEscalation)))
    : 0;

  return {
    ai_issue_category: allowedCategories.includes(issueCategory)
      ? issueCategory
      : base.ai_issue_category,
    ai_urgency: allowedUrgencies.includes(urgency) ? urgency : base.ai_urgency,
    ai_risk_flag: allowedRiskFlags.includes(riskFlag) ? riskFlag : base.ai_risk_flag,
    escalation_level: escalationLevel,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const issueText = String(body?.issueText || "").trim();
    const role = String(body?.role || "user").trim();
    const userId = String(body?.userId || "").trim();
    const category = String(body?.category || "general").trim();

    if (!issueText) {
      return NextResponse.json(
        { ok: false, error: "Please write a few words about your issue." },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        ok: true,
        source: "fallback",
        draft: fallbackDraft(issueText),
        governance: fallbackGovernance(category),
      });
    }

    const prompt = `
You are the written support and governance assistant of 3bigha.com.

A user wants to raise a support ticket.

Return ONLY valid JSON with this exact shape:
{
  "draft": "clear improved complaint text written in first person as the user",
  "governance": {
    "ai_issue_category": "login | listing | payment | rfq | chat | vendor | buyer | technical | fraud | abuse | legal | general",
    "ai_urgency": "low | normal | high | critical",
    "ai_risk_flag": "none | fraud_risk | payment_risk | abuse_risk | legal_risk | technical_risk",
    "escalation_level": 0
  }
}

Draft rules:
- Do not add false facts.
- Do not mention phone call.
- Support must remain written only.
- Keep the complaint respectful and clear.
- Mention the user role and issue category only if useful.
- Do not invent order IDs, listing IDs, payment IDs, names, dates, or approvals.
- Write in first person as the user.
- Keep it under 180 words.

Governance rules:
- Use "listing" for property/material/service/rental posting/listing problems.
- Use "login" for login, account access, OTP, password, or authentication issues.
- Use "payment" for payment, refund, invoice, subscription, boost, or billing issues.
- Use "fraud" only when fraud/scam/cheating/fake party is clearly alleged.
- Use "legal" only for legal notice, police, court, lawyer, document dispute, or land dispute issues.
- Use "technical" for broken buttons, server errors, page crashes, upload failures, or bugs.
- Escalation level must be 0 to 3.
- escalation_level 0 = normal.
- escalation_level 1 = high priority operational review.
- escalation_level 2 = urgent admin escalation.
- escalation_level 3 = critical fraud/legal/payment/security risk.
- Do not over-escalate ordinary listing or login issues.
- If unsure, use general, normal, none, 0.

User role: ${role}
User ID: ${userId || "not provided"}
Selected issue category: ${category}

User rough issue:
${issueText}
`;

    const aiRes = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        input: [{ role: "user", content: prompt }],
        temperature: 0.15,
        max_output_tokens: 520,
      }),
    });

    const aiJson = await aiRes.json().catch(() => null);
    const raw = extractText(aiJson).trim();

    const parsed = extractJsonObject(raw);

    const draft =
      String(parsed?.draft || "").trim() ||
      fallbackDraft(issueText);

    const governance = normalizeGovernance(parsed?.governance || {}, category);

    return NextResponse.json({
      ok: true,
      source: aiRes.ok ? "ai" : "fallback",
      draft,
      governance,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "AI support issue draft failed." },
      { status: 500 }
    );
  }
}