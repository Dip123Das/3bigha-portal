// app/api/vendor/rfq/mark-viewed-bulk/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  const cookieStore = cookies();
  const supabase = getSupabaseServerClient(cookieStore);

  const { rfqIds } = await req.json();

  if (!Array.isArray(rfqIds) || rfqIds.length === 0) {
    return NextResponse.json({ error: "Invalid RFQ list" }, { status: 400 });
  }

  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const vendorId = userRes.user.id;

  const { error } = await supabase
    .from("rfq_targets")
    .update({ viewed_at: new Date().toISOString() })
    .eq("vendor_user_id", vendorId)
    .in("rfq_id", rfqIds);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}