import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteCtx = {
  params: {
    billNo: string;
  };
};

function money(v: unknown) {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? `₹ ${Math.round(n).toLocaleString("en-IN")}` : "₹ 0";
}

function safeDate(v: string | null) {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleString("en-IN");
  } catch {
    return v;
  }
}

export async function GET(_req: Request, ctx: RouteCtx) {
  const billNo = decodeURIComponent(ctx.params.billNo || "").trim();

  if (!billNo) {
    return NextResponse.json({ ok: false, error: "Bill number is required." }, { status: 400 });
  }

  const supabase = getSupabaseServerClient(cookies());

  const { data: bill, error } = await supabase
    .from("inventory_bills")
    .select(
      "id,bill_no,bill_type,customer_name,customer_phone,total_amount,payment_status,payment_mode,bill_items,created_at,vendor_user_id"
    )
    .eq("bill_no", billNo)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  if (!bill) {
    return NextResponse.json({ ok: false, error: "Bill not found or not verified." }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    verified: true,
    platform: "3Bigha",
    message: "This bill/challan exists in the 3Bigha vendor billing system.",
    bill: {
      bill_no: bill.bill_no,
      bill_type: String(bill.bill_type || "").replace(/_/g, " "),
      customer_name: bill.customer_name || null,
      customer_phone: bill.customer_phone || null,
      total_amount: money(bill.total_amount),
      payment_status: bill.payment_status || "unpaid",
      payment_mode: bill.payment_mode || null,
      created_at: safeDate(bill.created_at),
      item_count: Array.isArray(bill.bill_items) ? bill.bill_items.length : 0,
    },
  });
}