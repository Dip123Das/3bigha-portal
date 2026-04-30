import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Server missing env vars: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

export async function POST(req: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await req.json();

    const authHeader = req.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");

    const {
      data: { user },
    } = await supabase.auth.getUser(token);

    if (!user) {
      return NextResponse.json({ error: "Invalid user" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role,is_vendor,approval_status")
      .eq("id", user.id)
      .single();

    const allowedRoles = [
      "vendor",
      "builder",
      "property_owner",
      "property_builder",
      "hub_vendor",
      "master_admin",
    ];

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 403 });
    }

    if (
      !allowedRoles.includes(profile.role) ||
      !["approved", "active"].includes(profile.approval_status)
    ) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { data: bp } = await supabase
      .from("business_profiles")
      .select("location_verification_status")
      .eq("user_id", user.id)
      .single();

    if (bp?.location_verification_status !== "verified") {
      return NextResponse.json(
        { error: "Location not verified" },
        { status: 403 }
      );
    }

    const today = new Date().toISOString().slice(0, 10);

    const { count } = await supabase
      .from("material_price_updates")
      .select("*", { count: "exact", head: true })
      .eq("created_by", user.id)
      .gte("created_at", `${today}T00:00:00`);

    if ((count || 0) >= 5) {
      return NextResponse.json(
        { error: "Daily limit reached (5 submissions)" },
        { status: 429 }
      );
    }

    let sourceType = profile.role;

    if (profile.role === "vendor") sourceType = "vendor";
    if (profile.role === "builder") sourceType = "builder";

    const { boost_priority, boost_expires_at, boost_payment_id, ...safeBody } =
      body || {};

    const payload = {
      ...safeBody,
      boost_priority: 0,
      boost_expires_at: null,
      boost_payment_id: null,
      source_type: sourceType,
      created_by: user.id,
      verified: false,
    };

    const { error } = await supabase
      .from("material_price_updates")
      .insert([payload]);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Something went wrong" },
      { status: 500 }
    );
  }
}