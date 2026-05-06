import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SupportMessage = {
  sender_role?: string | null;
  sender_email?: string | null;
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

function fallbackReply(ticket: any, messages: SupportMessage[]) {
  const category = String(ticket?.category || "support issue").replace(/_/g, " ");
  const latestUserMessage =
    [...messages]
      .reverse()
      .find((m) => !m?.is_admin_message && String(m?.message_text || "").trim())
      ?.message_text || ticket?.ai_drafted_text || ticket?.original_text || "";

  return `Thank you for writing to 3bigha Support.

We have received your ${category} issue and will review the details provided in this written ticket.

Issue details:
${String(latestUserMessage || "").slice(0, 500)}

Please continue to share any additional information, screenshots, listing details, or related references in this ticket thread only. Support will remain in writing for proper tracking and resolution.`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const mode = String(body?.mode || "user").trim();
    const draftText = String(body?.draftText || "").trim();

    const ticket = body?.ticket || {};
    const messages: SupportMessage[] = Array.isArray(body?.messages)
      ? body.messages.slice(-10)
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
        reply: fallbackReply(ticket, messages),
      });
    }

    const history = messages
      .map((m) => {
        const side = m?.is_admin_message ? "Admin" : "User";
        return `${side} (${String(m?.sender_role || "user")}): ${String(
          m?.message_text || ""
        ).slice(0, 700)}`;
      })
      .join("\n");

    const latestUserDraft =
      draftText ||
      [...messages]
        .reverse()
        .find((m) => !m?.is_admin_message && String(m?.message_text || "").trim())
        ?.message_text ||
      "";

    const adminDraft =
      draftText ||
      [...messages]
        .reverse()
        .find((m) => String(m?.message_text || "").trim())
        ?.message_text ||
      complaint;

    let prompt = "";

    if (mode === "admin") {
      prompt = `
You are the official written support assistant of 3bigha.com.

Your task:
Generate a professional SUPPORT TEAM reply for the admin.

IMPORTANT:
- Write as 3bigha Support Team.
- Be polite and practical.
- Support must remain written only.
- Do not promise calls.
- Do not invent fake resolutions.
- Ask for missing details if needed.
- Keep response professional and concise.
- Return ONLY the reply text.

Ticket:
Ticket No: ${ticket?.ticket_no || "not provided"}
Category: ${ticket?.category || "general"}
Priority: ${ticket?.priority || "normal"}
Status: ${ticket?.status || "open"}

Original complaint:
${complaint}

Conversation history:
${history || "No previous replies."}

Admin draft:
${adminDraft}
`;
    } else {
      prompt = `
You are an AI writing assistant for 3bigha.com support conversations.

Your job is ONLY to improve and professionally rewrite the USER'S OWN MESSAGE.

IMPORTANT:
- Do NOT write as 3bigha Support Team.
- Do NOT pretend to be admin.
- Do NOT answer the complaint.
- Do NOT generate support resolutions.
- ONLY improve the user's written message.
- Keep same meaning and intention.
- Make it clearer and more professional.
- Keep it concise and natural.
- Do not add imaginary details.
- Keep communication written-only.
- Return ONLY the improved message.

User original draft:
${latestUserDraft || complaint}

Ticket category:
${ticket?.category || "general"}

Priority:
${ticket?.priority || "normal"}
`;
    }

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
        max_output_tokens: 360,
      }),
    });

    const aiJson = await aiRes.json().catch(() => null);
    const reply = extractText(aiJson).trim() || fallbackReply(ticket, messages);

    return NextResponse.json({
      ok: true,
      source: aiRes.ok ? "ai" : "fallback",
      reply,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "AI support reply suggestion failed." },
      { status: 500 }
    );
  }
}