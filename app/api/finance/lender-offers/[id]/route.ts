import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const supabase = getAdminClient();

    const action = String(body.action || "").trim();

    let payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (action === "approve") {
      payload = {
        ...payload,
        is_active: true,
        is_verified: true,
      };
    } else if (action === "deactivate") {
      payload = {
        ...payload,
        is_active: false,
      };
    } else if (action === "reject") {
      payload = {
        ...payload,
        is_active: false,
        is_verified: false,
      };
    } else {
      return NextResponse.json(
        { ok: false, error: "Invalid lender offer action." },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("finance_lender_offers")
      .update(payload)
      .eq("id", params.id);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 }
    );
  }
}