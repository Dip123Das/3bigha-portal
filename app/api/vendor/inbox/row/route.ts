import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rfqId = searchParams.get("rfq_id");

  if (!rfqId) {
    return NextResponse.json({ ok: false, error: "rfq_id is required" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient(await cookies());

  // Must be logged in vendor
  const { data: u, error: uErr } = await supabase.auth.getUser();
  if (uErr) return NextResponse.json({ ok: false, error: uErr.message }, { status: 401 });

  const userId = u.user?.id;
  if (!userId) return NextResponse.json({ ok: false, error: "Not logged in" }, { status: 401 });

  // ✅ read from the same V2 view used by fetchVendorInbox
  const { data, error } = await supabase
    .from("vendor_inbox_v2")
    .select("*")
    .eq("vendor_user_id", userId)
    .eq("rfq_id", rfqId)
    .maybeSingle();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, row: data ?? null });
}