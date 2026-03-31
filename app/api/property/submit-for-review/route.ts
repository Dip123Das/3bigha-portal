import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = getSupabaseServerClient(cookieStore);

    const body = await req.json().catch(() => null);
    const listingId = String(body?.listingId || "").trim();

    console.log("[submit-for-review] start", { listingId });

    if (!listingId) {
      return NextResponse.json(
        { error: { message: "listingId is required." } },
        { status: 400 }
      );
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    console.log("[submit-for-review] auth", {
      userId: user?.id || null,
      authError: authError?.message || null,
    });

    if (authError || !user?.id) {
      return NextResponse.json(
        { error: { message: "Unauthorized." } },
        { status: 401 }
      );
    }

    const existing = await supabase
      .from("property_listings")
      .select("id, owner_id, owner_user_id, status")
      .eq("id", listingId)
      .or(`owner_id.eq.${user.id},owner_user_id.eq.${user.id}`)
      .maybeSingle();

    console.log("[submit-for-review] existing", {
      error: existing.error?.message || null,
      data: existing.data || null,
    });

    if (existing.error) {
      return NextResponse.json(
        { error: { message: existing.error.message } },
        { status: 500 }
      );
    }

    if (!existing.data?.id) {
      return NextResponse.json(
        { error: { message: "Listing not found." } },
        { status: 404 }
      );
    }

    if (existing.data.status === "pending") {
      return NextResponse.json({
        ok: true,
        data: {
          id: existing.data.id,
          status: "pending",
        },
      });
    }

    if (existing.data.status === "approved") {
      return NextResponse.json({
        ok: true,
        data: {
          id: existing.data.id,
          status: "approved",
        },
      });
    }

    const updateRes = await supabase
      .from("property_listings")
      .update({
        status: "pending",
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", listingId)
      .select("id,status")
      .single();

    console.log("[submit-for-review] updateRes", {
      error: updateRes.error?.message || null,
      data: updateRes.data || null,
    });

    if (updateRes.error) {
      return NextResponse.json(
        { error: { message: updateRes.error.message } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: updateRes.data,
    });
  } catch (e: any) {
    console.error("[submit-for-review] fatal", e);

    return NextResponse.json(
      {
        error: {
          message: e?.message || "Unknown server error",
        },
      },
      { status: 500 }
    );
  }
}