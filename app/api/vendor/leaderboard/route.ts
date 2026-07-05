import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const revalidate = 60;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function clean(v: unknown) {
  return String(v ?? "").trim();
}

export async function GET() {
  try {
    const { data: vendors, error: vendorError } = await supabase
      .from("business_profiles")
      .select(
        "user_id,business_name,company_name,owner_name,city,locality,subscription_plan,boost_priority,approval_status",
      )
      .limit(100);

    if (vendorError) {
      return NextResponse.json(
        { ok: false, error: vendorError.message },
        { status: 500 },
      );
    }

    const vendorIds = (vendors || [])
      .map((v: any) => clean(v.user_id))
      .filter(Boolean);

    const { data: dealEvents, error: dealError } =
      vendorIds.length > 0
        ? await supabase
            .from("ai_deal_events")
            .select("vendor_user_id,ready")
            .in("vendor_user_id", vendorIds)
        : { data: [], error: null };

    if (dealError) {
      return NextResponse.json(
        { ok: false, error: dealError.message },
        { status: 500 },
      );
    }

    const statsByVendor = new Map<string, { total: number; ready: number }>();

    (dealEvents || []).forEach((event: any) => {
      const vendorId = clean(event.vendor_user_id);
      if (!vendorId) return;

      const current = statsByVendor.get(vendorId) || { total: 0, ready: 0 };
      statsByVendor.set(vendorId, {
        total: current.total + 1,
        ready: current.ready + (event.ready === true ? 1 : 0),
      });
    });

    const rows = (vendors || [])
      .map((vendor: any) => {
        const vendorId = clean(vendor.user_id);
        const stats = statsByVendor.get(vendorId) || { total: 0, ready: 0 };

        const boost = Math.max(0, Number(vendor.boost_priority || 0));
        const verified =
          clean(vendor.approval_status).toLowerCase() === "approved";

        const score = Math.min(
          100,
          stats.ready * 12 +
            stats.total * 3 +
            Math.min(boost, 20) +
            (verified ? 10 : 0),
        );

        return {
          vendorUserId: vendorId,
          name:
            clean(vendor.business_name) ||
            clean(vendor.company_name) ||
            clean(vendor.owner_name) ||
            "Local Vendor",
          city: clean(vendor.city),
          locality: clean(vendor.locality),
          plan: clean(vendor.subscription_plan) || "free",
          totalSignals: stats.total,
          readySignals: stats.ready,
          score,
          badge:
            stats.ready >= 5
              ? "🔥 Top Closer"
              : stats.ready >= 2
                ? "⚡ Rising Closer"
                : boost > 0
                  ? "⭐ Boosted Vendor"
                  : "Active Vendor",
        };
      })
      .filter((row: any) => row.score > 0)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 5)
      .map((row: any, index: number) => ({
        ...row,
        rank: index + 1,
      }));

    return NextResponse.json({
      ok: true,
      rows,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Unknown error" },
      { status: 500 },
    );
  }
}
