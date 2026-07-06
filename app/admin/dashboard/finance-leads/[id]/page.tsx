import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import FinanceLeadActionPanel from "./FinanceLeadActionPanel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
      },
    }
  );
}

function formatINR(value: number | null | undefined) {
  if (!Number.isFinite(Number(value))) return "₹0";

  return `₹${Math.round(Number(value)).toLocaleString(
    "en-IN"
  )}`;
}

function getPriorityColor(priority?: string | null) {
  if (priority === "high") {
    return "bg-red-100 text-red-700";
  }

  if (priority === "follow_up") {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-blue-100 text-blue-700";
}

export default async function FinanceLeadDetailPage({
  params,
}: {
  params: {
    id: string;
  };
}) {
  const supabase = getAdminClient();

  const { data: lead } = await supabase
    .from("finance_loan_leads")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!lead) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6">
      <section className="w-full">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link
              href="/admin/dashboard/finance-leads"
              className="text-sm font-semibold text-blue-600"
            >
              ← Back to finance leads
            </Link>

            <h1 className="mt-2 text-3xl font-black text-slate-900">
              Finance Lead Details
            </h1>

            <p className="mt-2 text-sm text-slate-600">
              Manage borrower qualification,
              lender assignment and sanction readiness.
            </p>
          </div>

          <div
            className={`rounded-full px-4 py-2 text-xs font-black ${getPriorityColor(
              lead.priority
            )}`}
          >
            {lead.priority || "normal"} priority
          </div>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          <div className="rounded-3xl border bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Borrower
            </p>

            <h2 className="mt-2 text-2xl font-black text-slate-900">
              {lead.name || "Unnamed"}
            </h2>

            <div className="mt-4 space-y-3 text-sm">
              <div>
                <p className="font-bold text-slate-700">
                  Mobile
                </p>

                <p className="text-slate-600">
                  {lead.phone || "-"}
                </p>
              </div>

              <div>
                <p className="font-bold text-slate-700">
                  Email
                </p>

                <p className="text-slate-600">
                  {lead.email || "-"}
                </p>
              </div>

              <div>
                <p className="font-bold text-slate-700">
                  Loan Purpose
                </p>

                <p className="capitalize text-slate-600">
                  {lead.loan_purpose || "home"}
                </p>
              </div>

              <div>
                <p className="font-bold text-slate-700">
                  Preferred Bank
                </p>

                <p className="text-slate-600">
                  {lead.preferred_bank ||
                    "Best match"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Qualification
            </p>

            <div className="mt-5 grid gap-4">
              <div className="rounded-2xl bg-blue-50 p-4">
                <p className="text-xs font-bold text-blue-700">
                  Eligible Loan
                </p>

                <strong className="mt-1 block text-2xl text-slate-900">
                  {formatINR(
                    lead.eligible_loan
                  )}
                </strong>
              </div>

              <div className="rounded-2xl bg-emerald-50 p-4">
                <p className="text-xs font-bold text-emerald-700">
                  Sanction Probability
                </p>

                <strong className="mt-1 block text-2xl text-slate-900">
                  {lead.sanction_probability || 0}%
                </strong>
              </div>

              <div className="rounded-2xl bg-amber-50 p-4">
                <p className="text-xs font-bold text-amber-700">
                  Lead Score
                </p>

                <strong className="mt-1 block text-2xl text-slate-900">
                  {lead.lead_score || 0}/100
                </strong>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Financial Profile
            </p>

            <div className="mt-4 space-y-3 text-sm">
              <div>
                <p className="font-bold text-slate-700">
                  Monthly Income
                </p>

                <p className="text-slate-600">
                  {formatINR(
                    lead.monthly_income
                  )}
                </p>
              </div>

              <div>
                <p className="font-bold text-slate-700">
                  Co-applicant Income
                </p>

                <p className="text-slate-600">
                  {formatINR(
                    lead.co_applicant_income
                  )}
                </p>
              </div>

              <div>
                <p className="font-bold text-slate-700">
                  Existing EMI
                </p>

                <p className="text-slate-600">
                  {formatINR(
                    lead.existing_emi
                  )}
                </p>
              </div>

              <div>
                <p className="font-bold text-slate-700">
                  CIBIL Score
                </p>

                <p className="text-slate-600">
                  {lead.cibil_score || "-"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <FinanceLeadActionPanel
            leadId={lead.id}
            currentStatus={lead.status}
            currentLender={lead.assigned_lender}
            currentLenderType={lead.assigned_lender_type}
            currentNotes={lead.admin_notes}
          />
        </div>

        <div className="mt-5 rounded-3xl border bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Lead Activity Timeline
          </p>

          <div className="mt-5 space-y-4">
            <div className="flex gap-3">
              <div className="mt-1 h-3 w-3 rounded-full bg-blue-500" />

              <div>
                <p className="text-sm font-bold text-slate-900">
                  Lead Created
                </p>

                <p className="text-xs text-slate-500">
                  Borrower submitted finance assistance request.
                </p>
              </div>
            </div>

            {lead.assigned_lender ? (
              <div className="flex gap-3">
                <div className="mt-1 h-3 w-3 rounded-full bg-amber-500" />

                <div>
                  <p className="text-sm font-bold text-slate-900">
                    Lender Assigned
                  </p>

                  <p className="text-xs text-slate-500">
                    Assigned to {lead.assigned_lender}
                  </p>
                </div>
              </div>
            ) : null}

            {lead.status === "under_review" ? (
              <div className="flex gap-3">
                <div className="mt-1 h-3 w-3 rounded-full bg-indigo-500" />

                <div>
                  <p className="text-sm font-bold text-slate-900">
                    Under Review
                  </p>

                  <p className="text-xs text-slate-500">
                    Documents and eligibility under verification.
                  </p>
                </div>
              </div>
            ) : null}

            {lead.status === "converted" ? (
              <div className="flex gap-3">
                <div className="mt-1 h-3 w-3 rounded-full bg-emerald-500" />

                <div>
                  <p className="text-sm font-bold text-slate-900">
                    Loan Converted
                  </p>

                  <p className="text-xs text-slate-500">
                    Borrower successfully converted.
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <div className="rounded-3xl border bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Document Checklist
            </p>

            <ul className="mt-4 space-y-3 text-sm text-slate-700">
              {(lead.document_checklist || []).map(
                (doc: string) => (
                  <li
                    key={doc}
                    className="rounded-2xl bg-slate-50 px-4 py-3"
                  >
                    {doc}
                  </li>
                )
              )}
            </ul>
          </div>

          <div className="rounded-3xl border bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Regional Borrower Guidance
            </p>

            <div className="mt-4 rounded-2xl bg-blue-50 p-4">
              <p className="font-bold text-blue-800">
                {
                  lead.regional_guidance
                    ?.language
                }
              </p>

              <p className="mt-2 text-sm leading-6 text-blue-700">
                {
                  lead.regional_guidance
                    ?.note
                }
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}