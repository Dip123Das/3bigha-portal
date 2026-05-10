import { NextResponse } from "next/server";
import { trackMemoryEvent } from "@/lib/ai/memory-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const result = await trackMemoryEvent({
      userId: body?.userId || null,
      sessionId: body?.sessionId || null,
      eventType: body?.eventType,
      module: body?.module || null,
      entityId: body?.entityId || null,
      entityTitle: body?.entityTitle || null,
      category: body?.category || null,
      type: body?.type || null,
      city: body?.city || null,
      district: body?.district || null,
      locality: body?.locality || null,
      metadata: body?.metadata || {},
      score:
        typeof body?.score === "number"
          ? body.score
          : null,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error:
          err?.message ||
          "Memory event API failed.",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "AI memory event API is active.",
  });
}