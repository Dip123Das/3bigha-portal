import { createClient } from "@supabase/supabase-js";
import FinanceLeadFilters from "./FinanceLeadFilters";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase environment variables.");
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

export default async function AdminFinanceLeadsPage() {
  const supabase = getAdminClient();

  const { data: leads, error } = await supabase
    .from("finance_loan_leads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  const totalLeads = leads?.length || 0;
  const newLeads =
    leads?.filter((lead) => lead.status === "new").length || 0;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6">
      <section className="mx-auto max-w-7xl">
        <div className="rounded-3xl border bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
            Finance Operations
          </p>

          <h1 className="mt-2 text-2xl font-black text-slate-900">
            Loan Assistance Leads
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            View, search and manage loan requests submitted from EMI Calculator.
            These leads can later be assigned to banks, NBFCs, LIC Housing Finance,
            cooperative banks and gramin banks.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-blue-50 p-4">
              <p className="text-xs font-bold text-blue-700">Total Leads</p>
              <strong className="mt-1 block text-2xl text-slate-900">
                {totalLeads}
              </strong>
            </div>

            <div className="rounded-2xl bg-emerald-50 p-4">
              <p className="text-xs font-bold text-emerald-700">New Leads</p>
              <strong className="mt-1 block text-2xl text-slate-900">
                {newLeads}
              </strong>
            </div>

            <div className="rounded-2xl bg-amber-50 p-4">
              <p className="text-xs font-bold text-amber-700">Next Step</p>
              <strong className="mt-1 block text-base text-slate-900">
                Assign to lender
              </strong>
            </div>
          </div>
        </div>

        {error ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error.message}
          </div>
        ) : null}

        <FinanceLeadFilters
          leads={(leads || []).map((lead) => ({
            id: lead.id,
            name: lead.name,
            phone: lead.phone,
            loan_purpose: lead.loan_purpose,
            priority: lead.priority,
            status: lead.status,
            preferred_bank: lead.preferred_bank,
            sanction_probability: lead.sanction_probability,
            lead_score: lead.lead_score,
            created_at: lead.created_at,
          }))}
        />
      </section>
    </main>
  );
}