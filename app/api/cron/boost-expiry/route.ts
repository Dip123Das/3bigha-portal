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

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const now = new Date().toISOString();

    // 1️⃣ Get expired boost users
    const { data: expiredUsers } = await supabase
      .from("business_profiles")
      .select("user_id")
      .lt("boost_expires_at", now)
      .gt("boost_priority", 0);

    if (!expiredUsers || expiredUsers.length === 0) {
      return NextResponse.json({ ok: true, message: "No expired boosts" });
    }

    const userIds = expiredUsers.map((u) => u.user_id);

    // 2️⃣ Reset boost
    await supabase
      .from("business_profiles")
      .update({
        boost_priority: 0,
        boost_expires_at: null,
      })
      .in("user_id", userIds);

    // 3️⃣ Create notification
    await supabase.from("vendor_notifications").insert(
      userIds.map((uid) => ({
        user_id: uid,
        type: "boost_expired",
        title: "Boost expired",
        message:
          "⚠️ Your boost has expired. Your ranking may drop. Renew boost to stay visible.",
        is_read: false,
      }))
    );

    return NextResponse.json({
      ok: true,
      expiredCount: userIds.length,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Cron failed" },
      { status: 500 }
    );
  }
}