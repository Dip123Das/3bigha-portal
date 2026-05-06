import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SupportMessage = {
  sender_role?: string | null;
  message_text?: string | null;
  is_admin_message?: boolean | null;
  created_at?: string | null;
};

function extractText(payload: any): string {
  if (typeof payload?.output_text === "string") return payload.output_text;

  const parts = payload?.output
    ?.flatMap((item: any) => item?.content || [])
    ?.map((content: any) => content?.text)
    ?.filter(Boolean);

  return parts?.join("\n") || "";
}

function fallbackSummary(ticket: any) {
  const complaint = String(
    ticket?.ai_drafted_text || ticket?.original_text || ""
  ).slice(0, 260);

  return {
    issue_summary: complaint || "Support issue needs admin review.",
    likely_category: String(ticket?.category || "general"),
    urgency: String(ticket?.priority || "normal"),
    risk_flag: "none",
    suggested_next_action: "Review the written complaint and reply in the ticket thread.",
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const ticket = body?.ticket || {};
    const messages: SupportMessage[] = Array.isArray(body?.messages)
      ? body.messages.slice(-12)
      : [];

    const complaint = String(
      ticket?.ai_drafted_text || ticket?.original_text || ""
    ).trim();

    if (!complaint && messages.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Ticket details are required." },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        ok: true,
        source: "fallback",
        summary: fallbackSummary(ticket),
      });
    }

    const history = messages
      .map((m) => {
        const side = m?.is_admin_message ? "Admin" : "User";
        return `${side}: ${String(m?.message_text || "").slice(0, 600)}`;
      })
      .join("\n");

    const prompt = `
You are the AI support governance assistant of 3bigha.com.

Analyze this support ticket and return ONLY valid JSON.

Return this exact JSON shape:
{
  "issue_summary": "short summary under 35 words",
  "likely_category": "login | listing | payment | rfq | chat | vendor | buyer | technical | fraud | general",
  "urgency": "low | normal | high | critical",
  "risk_flag": "none | fraud_risk | payment_risk | abuse_risk | legal_risk | technical_risk",
  "suggested_next_action": "one practical next action under 30 words"
}

Rules:
- Do not invent facts.
- Base everything only on ticket and conversation.
- If unsure, use general/normal/none.
- Keep all text concise.

Ticket:
Ticket No: ${ticket?.ticket_no || "not provided"}
Category: ${ticket?.category || "general"}
Priority: ${ticket?.priority || "normal"}
Status: ${ticket?.status || "open"}
User role: ${ticket?.user_role || "user"}
User display ID: ${ticket?.user_display_id || "not provided"}

Complaint:
${complaint}

Conversation:
${history || "No conversation yet."}
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
        max_output_tokens: 260,
      }),
    });

    const aiJson = await aiRes.json().catch(() => null);
    const raw = extractText(aiJson).trim();

    let summary = fallbackSummary(ticket);

    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        summary = {
          issue_summary: String(parsed.issue_summary || summary.issue_summary),
          likely_category: String(parsed.likely_category || summary.likely_category),
          urgency: String(parsed.urgency || summary.urgency),
          risk_flag: String(parsed.risk_flag || summary.risk_flag),
          suggested_next_action: String(
            parsed.suggested_next_action || summary.suggested_next_action
          ),
        };
      }
    } catch {
      summary = fallbackSummary(ticket);
    }

    return NextResponse.json({
      ok: true,
      source: aiRes.ok ? "ai" : "fallback",
      summary,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "AI ticket summary failed." },
      { status: 500 }
    );
  }
}