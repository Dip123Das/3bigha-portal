import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ✅ POST → track deal events
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { conversationId, vendorUserId, stage, ready } = body || {};

    if (!conversationId || !vendorUserId) {
      return NextResponse.json(
        { ok: false, error: "Missing conversationId or vendorUserId" },
        { status: 400 }
      );
    }

    const { error } = await supabase.from("ai_deal_events").insert({
      conversation_id: conversationId,
      vendor_user_id: vendorUserId,
      stage: String(stage || ""),
      ready: Boolean(ready),
      created_at: new Date().toISOString(),
    });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, tracked: true });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}

// ✅ GET → fetch vendor stats
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const vendorUserId = String(url.searchParams.get("vendorUserId") || "").trim();

    if (!vendorUserId) {
      return NextResponse.json(
        { ok: false, error: "Missing vendorUserId" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("ai_deal_events")
      .select("ready")
      .eq("vendor_user_id", vendorUserId);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    const rows = data || [];
    const total = rows.length;
    const ready = rows.filter((r) => r.ready === true).length;

    return NextResponse.json({
      ok: true,
      total,
      ready,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}