import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function requireMasterAdmin(req: Request) {
  const authHeader = req.headers.get("authorization");

  if (!authHeader) {
    return { user: null, error: "Unauthorized" };
  }

  const token = authHeader.replace("Bearer ", "");

  const {
    data: { user },
  } = await supabase.auth.getUser(token);

  if (!user) {
    return { user: null, error: "Invalid user" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "master_admin") {
    return { user: null, error: "Master admin required" };
  }

  return { user, error: null };
}

export async function GET(req: Request) {
  const auth = await requireMasterAdmin(req);

  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("material_price_updates")
    .select(
      "id,category,item,brand,grade,price_min,price_max,unit,location,trend,offer,source_type,created_by,verified,created_at"
    )
    .eq("verified", false)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, rows: data || [] });
}

export async function PATCH(req: Request) {
  const auth = await requireMasterAdmin(req);

  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  const body = await req.json();
  const id = String(body?.id || "");
  const action = String(body?.action || "");

  if (!id) {
    return NextResponse.json({ error: "Missing price update id" }, { status: 400 });
  }

  if (action === "verify") {
    const { error } = await supabase
      .from("material_price_updates")
      .update({ verified: true })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  }

  if (action === "reject") {
    const { error } = await supabase
      .from("material_price_updates")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}