import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fallbackDraft(input: string) {
  const text = String(input || "").trim();

  return `I am facing the following issue on 3bigha.com:

${text || "I need help regarding my account, listing, enquiry, or transaction workflow."}

Please check this issue and guide me through the written support ticket system. I understand that support will be provided in writing only and no phone call is required.`;
}

function extractText(payload: any): string {
  if (typeof payload?.output_text === "string") return payload.output_text;

  const parts = payload?.output
    ?.flatMap((item: any) => item?.content || [])
    ?.map((content: any) => content?.text)
    ?.filter(Boolean);

  return parts?.join("\n") || "";
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
      });
    }

    const prompt = `
You are the written support assistant of 3bigha.com.

A user wants to raise a support ticket. Rewrite their rough words into a clear written complaint.

Important rules:
- Do not add false facts.
- Do not mention phone call.
- Support must remain written only.
- Keep the complaint respectful and clear.
- Mention the user role and issue category if useful.
- Do not invent order IDs, listing IDs, payment IDs, or names.
- Write in first person as the user.
- Keep it under 180 words.

User role: ${role}
User ID: ${userId || "not provided"}
Issue category: ${category}

User rough issue:
${issueText}

Return only the improved complaint text.
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
        temperature: 0.25,
        max_output_tokens: 320,
      }),
    });

    const aiJson = await aiRes.json().catch(() => null);
    const draft = extractText(aiJson).trim() || fallbackDraft(issueText);

    return NextResponse.json({
      ok: true,
      source: aiRes.ok ? "ai" : "fallback",
      draft,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "AI support issue draft failed." },
      { status: 500 }
    );
  }
}