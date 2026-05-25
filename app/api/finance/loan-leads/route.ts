import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import {
  calculateFinanceLeadScore,
  getLeadPriority,
  getLoanDocumentChecklist,
  getRegionalBorrowerGuidance,
  getSanctionProbability,
} from "@/lib/finance/financeLeadScoring";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase server environment variables.");
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const supabase = getAdminClient();

    const loanPurpose = String(body.loanPurpose || "home");
    const state = String(body.state || "West Bengal");

    const leadScore = calculateFinanceLeadScore({
      monthlyIncome: Number(body.monthlyIncome || 0),
      cibilScore: Number(body.cibilScore || 0),
      existingEmi: Number(body.existingEmi || 0),
      eligibleLoan: Number(body.eligibleLoan || 0),
    });

    const sanctionProbability =
      getSanctionProbability(leadScore);

    const preferredBank =
      String(body.preferredBank || "").trim() || null;

    const payload = {
      name: String(body.name || "").trim() || null,
      phone: String(body.phone || "").trim() || null,
      email: String(body.email || "").trim() || null,

      loan_purpose: loanPurpose,
      state,
      district: String(body.district || "").trim() || null,

      monthly_income: Number(body.monthlyIncome || 0),
      co_applicant_income: Number(body.coApplicantIncome || 0),
      existing_emi: Number(body.existingEmi || 0),
      cibil_score: Number(body.cibilScore || 0),

      eligible_loan: Number(body.eligibleLoan || 0),
      estimated_property_budget: Number(
        body.estimatedPropertyBudget || 0
      ),
      preferred_bank: preferredBank,

      lead_score: leadScore,
      sanction_probability: sanctionProbability,
      priority: getLeadPriority(leadScore),
      recommended_lender: preferredBank,
      document_checklist: getLoanDocumentChecklist(loanPurpose),
      regional_guidance: getRegionalBorrowerGuidance(state),

      source: "emi-calculator",
      status: "new",
    };

    const { data, error } = await supabase
      .from("finance_loan_leads")
      .insert(payload)
      .select("id")
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      leadId: data?.id,
      leadScore,
      sanctionProbability,
    });
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