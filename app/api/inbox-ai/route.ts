import { NextResponse } from "next/server";
import OpenAI from "openai";

export const dynamic = "force-dynamic";

const apiKey = process.env.OPENAI_API_KEY;
const client = apiKey ? new OpenAI({ apiKey }) : null;

type InboxAiInput = {
  title?: string;
  subtitle?: string;
  counterpart?: string;
  statusLabel?: string;
  stageLabel?: string;
  module?: string;
  side?: string;
  unreadCount?: number;
  metaLine?: string;
};

function fallbackAI(data: InboxAiInput) {
  const unreadCount = Number(data.unreadCount ?? 0);
  const moduleName = String(data.module ?? "").toLowerCase();
  const stageLabel = String(data.stageLabel ?? "").toLowerCase();
  const statusLabel = String(data.statusLabel ?? "Active");

  let aiTag = "—";
  let reason = "Stable thread";
  let summary = `${statusLabel} – ${data.stageLabel || "active"}`;

  if (unreadCount > 0) {
    aiTag = "⚡ Needs attention";
    reason = "Unread messages pending";
    summary = `Unread ${data.module || "thread"} needs review`;
  }

  if (moduleName === "investment") {
    aiTag = "💰 Opportunity";
    reason = "Investment discussion active";
    summary = `Investment thread in ${data.stageLabel || "active"} stage`;
  }

  if (stageLabel.includes("discussion")) {
    aiTag = "🔥 Urgent";
    reason = "Active discussion ongoing";
    summary = `Discussion stage requires attention`;
  }

  if (!summary.trim()) {
    summary = "Inbox thread summary unavailable";
  }

  return {
    summary,
    aiTag,
    reason,
    source: "fallback",
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as InboxAiInput;

    const {
      title,
      subtitle,
      counterpart,
      statusLabel,
      stageLabel,
      module,
      side,
      unreadCount,
      metaLine,
    } = body || {};

    if (!client) {
      const fallback = fallbackAI(body);
      return NextResponse.json({
        ok: true,
        ...fallback,
      });
    }

    const prompt = `
You are helping rank and summarize a unified inbox thread for a real-estate / RFQ / investment platform.

Return JSON with exactly these keys:
- summary: short one-line summary (max 18 words)
- aiTag: one of ["🔥 Urgent", "⚡ Needs attention", "💰 Opportunity", "🕒 Follow up", "—"]
- reason: short reason (max 12 words)

Thread data:
Title: ${String(title ?? "")}
Subtitle: ${String(subtitle ?? "")}
Counterpart: ${String(counterpart ?? "")}
Status: ${String(statusLabel ?? "")}
Stage: ${String(stageLabel ?? "")}
Module: ${String(module ?? "")}
Side: ${String(side ?? "")}
UnreadCount: ${String(unreadCount ?? 0)}
Meta: ${String(metaLine ?? "")}
    `.trim();

    try {
      const response = await client.responses.create({
        model: "gpt-4.1-mini",
        input: prompt,
        text: {
          format: {
            type: "json_schema",
            name: "inbox_ai_summary",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                summary: { type: "string" },
                aiTag: {
                  type: "string",
                  enum: [
                    "🔥 Urgent",
                    "⚡ Needs attention",
                    "💰 Opportunity",
                    "🕒 Follow up",
                    "—",
                  ],
                },
                reason: { type: "string" },
              },
              required: ["summary", "aiTag", "reason"],
            },
          },
        },
      });

      const raw = response.output_text?.trim() || "{}";

      let parsed: {
        summary?: string;
        aiTag?: string;
        reason?: string;
      } = {};

      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = {};
      }

      return NextResponse.json({
        ok: true,
        summary: parsed.summary ?? "",
        aiTag: parsed.aiTag ?? "—",
        reason: parsed.reason ?? "",
        source: "openai",
      });
    } catch {
      const fallback = fallbackAI(body);
      return NextResponse.json({
        ok: true,
        ...fallback,
      });
    }
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to process request.",
      },
      { status: 500 }
    );
  }
}