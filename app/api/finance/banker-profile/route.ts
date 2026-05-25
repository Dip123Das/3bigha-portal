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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = getAdminClient();

    const bankName =
      String(body.bankName || "").trim() ||
      String(body.newBankName || "").trim();

    if (!bankName) {
      return NextResponse.json(
        { ok: false, error: "Bank name is required." },
        { status: 400 }
      );
    }

    const payload = {
      full_name: String(body.fullName || "").trim(),
      bank_name: bankName,
      branch_name: String(body.branchName || "").trim(),
      ifsc_code: String(body.ifscCode || "").trim().toUpperCase(),
      branch_code: String(body.branchCode || "").trim() || null,
      employee_id: String(body.employeeId || "").trim(),
      designation: String(body.designation || "").trim(),
      official_email: String(body.officialEmail || "").trim() || null,
      official_mobile: String(body.officialMobile || "").trim() || null,
      employee_card_url:
        String(body.employeeCardUrl || "").trim() || null,

      ai_verification_status: "pending",
      manual_verification_status: "pending",
      final_status: "pending",
    };

    const { data, error } = await supabase
      .from("finance_banker_profiles")
      .insert(payload)
      .select("id")
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    if (body.newBankName) {
      await supabase.from("finance_lender_registry").insert({
        lender_name: String(body.newBankName || "").trim(),
        lender_type: String(body.newBankType || "bank"),
        is_active: true,
        is_verified: false,
      });
    }

    return NextResponse.json({
      ok: true,
      bankerProfileId: data?.id,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}