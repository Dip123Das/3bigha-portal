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

    let finalStatus = "pending";
    let manualStatus = "pending";

    if (action === "approve") {
      finalStatus = "verified";
      manualStatus = "verified";
    } else if (action === "reject") {
      finalStatus = "rejected";
      manualStatus = "rejected";
    } else if (action === "clarification") {
      finalStatus = "needs_manual_review";
      manualStatus = "needs_manual_review";
    } else if (action === "suspicious") {
      finalStatus = "needs_manual_review";
      manualStatus = "needs_manual_review";
    } else {
      return NextResponse.json(
        { ok: false, error: "Invalid verification action." },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("finance_banker_profiles")
      .update({
        final_status: finalStatus,
        manual_verification_status: manualStatus,
        manual_verification_notes:
          String(body.notes || "").trim() || null,
        updated_at: new Date().toISOString(),
        verified_at:
          finalStatus === "verified"
            ? new Date().toISOString()
            : null,
      })
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
