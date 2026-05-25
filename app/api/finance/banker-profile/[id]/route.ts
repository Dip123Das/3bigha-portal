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

function normalizeLenderType(type?: string | null) {
  const value = String(type || "").toLowerCase();

  if (value.includes("public")) return "public_bank";
  if (value.includes("private")) return "private_bank";
  if (value.includes("hfc") || value.includes("housing")) return "hfc";
  if (value.includes("nbfc")) return "nbfc";
  if (value.includes("rrb") || value.includes("gramin")) return "rrb";
  if (value.includes("coop")) return "cooperative";

  return "bank";
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

    const { data: banker, error: bankerError } = await supabase
      .from("finance_banker_profiles")
      .select("*")
      .eq("id", params.id)
      .single();

    if (bankerError) {
      return NextResponse.json(
        { ok: false, error: bankerError.message },
        { status: 500 }
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

    if (finalStatus === "verified" && banker?.bank_name) {
      const bankName = String(banker.bank_name || "").trim();

      const { data: existingLender } = await supabase
        .from("finance_lender_registry")
        .select("id")
        .ilike("lender_name", bankName)
        .maybeSingle();

      if (existingLender?.id) {
        await supabase
          .from("finance_lender_registry")
          .update({
            is_active: true,
            is_verified: true,
            lender_type: normalizeLenderType(banker.lender_type),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingLender.id);
      } else {
        await supabase.from("finance_lender_registry").insert({
          lender_name: bankName,
          lender_type: normalizeLenderType(banker.lender_type),
          ifsc_prefix: String(banker.ifsc_code || "").slice(0, 4) || null,
          is_active: true,
          is_verified: true,
          created_by: banker.user_id || null,
        });
      }
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