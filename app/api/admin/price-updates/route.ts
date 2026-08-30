import { NextResponse } from "next/server";
import { requireMasterAdmin } from "@/lib/admin/requireMasterAdmin";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const auth = await requireMasterAdmin(req);

    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const supabase = auth.admin;

    const { data, error } = await supabase
      .from("material_price_updates")
      .select(
        "id,category,item,brand,grade,price_min,price_max,unit,location,trend,offer,source_type,created_by,verified,boost_priority,created_at"
      )
      .or("verified.eq.false,verified.is.null")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, rows: data || [] });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to load pending prices." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = await requireMasterAdmin(req);

    if ("error" in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }
    const supabase = auth.admin;

    const user = auth.user;
    const body = await req.json();
    const id = String(body?.id || "");
    const action = String(body?.action || "");

    if (!id) {
      return NextResponse.json(
        { error: "Missing price update id." },
        { status: 400 }
      );
    }

    if (action === "verify") {
      const { error } = await supabase
        .from("material_price_updates")
        .update({
          verified: true,
          verified_by: user.id,
          verified_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({ ok: true });
    }

        if (action === "boost") {
      const { error } = await supabase
        .from("material_price_updates")
        .update({
          boost_priority: 10,
        })
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

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Admin action failed." },
      { status: 500 }
    );
  }
}
