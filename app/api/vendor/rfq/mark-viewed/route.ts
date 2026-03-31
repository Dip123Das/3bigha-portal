// app/api/vendor/rfq/mark-viewed/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const supabase = getSupabaseServerClient(cookies());

    // Must be logged in
    const { data: u, error: uErr } = await supabase.auth.getUser();
    if (uErr) {
      return NextResponse.json({ ok: false, error: uErr.message }, { status: 401 });
    }
    const userId = u.user?.id;
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Not logged in." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const rfqId = String(body?.rfq_id ?? body?.rfqId ?? "").trim();

    if (!rfqId) {
      return NextResponse.json({ ok: false, error: "rfq_id is required." }, { status: 400 });
    }

    // Call your SQL function (SQL-A4)
    // IMPORTANT: the function should use auth.uid() internally
    const { error } = await supabase.rpc("mark_rfq_viewed", { p_rfq_id: rfqId });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}