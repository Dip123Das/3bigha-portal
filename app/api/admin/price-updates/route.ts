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

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function requireMasterAdmin(req: Request) {
  const supabase = getSupabaseAdmin();
  const authHeader = req.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return { user: null, error: "Unauthorized. Missing admin session token." };
  }

  const token = authHeader.replace("Bearer ", "").trim();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return { user: null, error: "Invalid or expired admin session." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role,email")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return { user: null, error: profileError.message };
  }

  const role = String(profile?.role || "").trim().toLowerCase();

  if (role !== "master_admin") {
    return {
      user: null,
      error: `Master admin required. Current role: ${role || "none"}`,
    };
  }

  return { user, error: null };
}

export async function GET(req: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const auth = await requireMasterAdmin(req);

    if (auth.error) {
      return NextResponse.json({ ok: false, error: auth.error }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("material_price_updates")
      .select(
        "id,category,item,brand,grade,price_min,price_max,unit,location,trend,offer,source_type,created_by,verified,created_at"
      )
      .or("verified.is.false,verified.is.null")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, rows: data || [] });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Failed to load pending prices." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const auth = await requireMasterAdmin(req);

    if (auth.error) {
      return NextResponse.json({ ok: false, error: auth.error }, { status: 403 });
    }

    const body = await req.json();
    const id = String(body?.id || "").trim();
    const action = String(body?.action || "").trim();

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Missing price update id." },
        { status: 400 }
      );
    }

    if (action === "verify") {
      const { error } = await supabase
        .from("material_price_updates")
        .update({ verified: true })
        .eq("id", id);

      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }

      return NextResponse.json({ ok: true });
    }

    if (action === "reject") {
      const { error } = await supabase
        .from("material_price_updates")
        .delete()
        .eq("id", id);

      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: "Invalid action." }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Action failed." },
      { status: 500 }
    );
  }
}