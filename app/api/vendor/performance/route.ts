import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getVendorPerformanceAnalytics } from "@/lib/marketplace/vendor-performance-analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET(req: Request) {
  const supabase = getSupabaseAdmin();
  const url = new URL(req.url);
  const vendorUserId = String(url.searchParams.get("vendorUserId") || "");

  if (!vendorUserId) {
    return NextResponse.json(
      { ok: false, error: "Missing vendorUserId" },
      { status: 400 },
    );
  }

  const result = await getVendorPerformanceAnalytics(supabase, vendorUserId);

  return NextResponse.json(result, {
    status: result.ok ? 200 : 500,
  });
}
