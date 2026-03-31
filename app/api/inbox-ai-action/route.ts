import { NextResponse } from "next/server";
import OpenAI from "openai";

export const dynamic = "force-dynamic";

const apiKey = process.env.OPENAI_API_KEY;
const client = apiKey ? new OpenAI({ apiKey }) : null;

export async function POST(req: Request) {
  try {
    if (!client) {
      return NextResponse.json(
        {
          ok: false,
          error: "OPENAI_API_KEY is missing in environment variables.",
        },
        { status: 500 }
      );
    }

    const body = await req.json();

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

    const prompt = `
You are deciding the next best action for a unified inbox thread in a real-estate / RFQ / investment platform.

Return JSON with exactly these keys:
- action: one of ["Reply now", "Follow up", "Review details", "Monitor"]
- confidence: one of ["High", "Medium", "Low"]

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

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
      text: {
        format: {
          type: "json_schema",
          name: "inbox_ai_action",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              action: {
                type: "string",
                enum: ["Reply now", "Follow up", "Review details", "Monitor"],
              },
              confidence: {
                type: "string",
                enum: ["High", "Medium", "Low"],
              },
            },
            required: ["action", "confidence"],
          },
        },
      },
    });

    const raw = response.output_text?.trim() || "{}";

    let parsed: {
      action?: string;
      confidence?: string;
    } = {};

    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {};
    }

    return NextResponse.json({
      ok: true,
      action: parsed.action ?? "",
      confidence: parsed.confidence ?? "",
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to generate inbox AI action.";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 }
    );
  }
}