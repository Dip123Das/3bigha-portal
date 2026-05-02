import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function requireMasterAdmin(req: Request) {
  const supabase = getSupabaseAdmin();
  const authHeader = req.headers.get("authorization");

  if (!authHeader) return { supabase, user: null, error: "Unauthorized" };

  const token = authHeader.replace("Bearer ", "");

  const {
    data: { user },
  } = await supabase.auth.getUser(token);

  if (!user) return { supabase, user: null, error: "Invalid user" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "master_admin") {
    return { supabase, user: null, error: "Master admin required" };
  }

  return { supabase, user, error: null };
}

export async function GET(req: Request) {
  const auth = await requireMasterAdmin(req);

  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  const { data, error } = await auth.supabase
    .from("business_profiles")
    .select("user_id,business_name,phone,city,district,subscription_plan,subscription_status,boost_priority,boost_expires_at,ai_visibility_status,ai_visibility_reason,ai_revenue_score,updated_at")
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const flagged = (data || []).map((r: any) => {
    let risk = 0;

    if (!r.business_name || r.business_name.length < 3) risk += 20;
    if ((r.boost_priority || 0) > 30) risk += 20;
    if (!r.city && !r.district) risk += 10;

    const reputation =
      100 -
      Math.min(100, risk) +
      (r.boost_priority ? 5 : 0);

    const dominance_score =
      Number(r.ai_revenue_score || 0) * 0.5 +
      (r.boost_priority || 0) * 0.3 +
      (reputation || 0) * 0.2;

    return {
      ...r,
      dominance_score: Math.round(dominance_score),
      risk_score: Math.min(100, risk),
      reputation_score: Math.max(0, Math.min(100, reputation)),
      revenue_score: Number(r.ai_revenue_score || 0),
      fraud_flag:
        !r.business_name ||
        (r.business_name || "").length < 3 ||
        (r.boost_priority || 0) > 50,
    };
  });

  return NextResponse.json({ ok: true, rows: flagged });
}

export async function PATCH(req: Request) {
  const auth = await requireMasterAdmin(req);

  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  const body = await req.json();
  const vendorUserId = String(body?.vendor_user_id || "");
  const action = String(body?.action || "");

  if (!vendorUserId) {
    return NextResponse.json({ error: "Missing vendor_user_id" }, { status: 400 });
  }

  if (action === "boost" || action === "reset" || action === "soft_ban" || action === "restore") {
    const boostPriority = action === "boost" ? Number(body?.boost_priority || 20) : 0;
    const expiresAt =
      boostPriority > 0
        ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        : null;

    const updatePayload =
      action === "soft_ban"
        ? {
            boost_priority: 0,
            boost_expires_at: null,
            ai_visibility_status: "restricted",
            ai_visibility_reason: "Restricted by Admin Control AI",
          }
        : action === "restore"
        ? {
            ai_visibility_status: "normal",
            ai_visibility_reason: null,
          }
        : {
            boost_priority: boostPriority,
            boost_expires_at: expiresAt,
          };

    const { error } = await auth.supabase
      .from("business_profiles")
      .update(updatePayload)
      .eq("user_id", vendorUserId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await auth.supabase.from("vendor_notifications").insert({
      user_id: vendorUserId,
      type: action === "boost" ? "admin_boost" : "admin_boost_reset",
      title: action === "boost" ? "Admin boost activated" : "Boost reset",
      message:
        action === "boost"
          ? "🚀 Admin has activated visibility boost for your vendor profile."
          : "⚠️ Your admin visibility boost has been reset.",
      is_read: false,
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}