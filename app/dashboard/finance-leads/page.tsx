import { createClient } from "@supabase/supabase-js";

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

function formatINR(value: number | null | undefined) {
  if (!Number.isFinite(Number(value))) return "₹0";
  return `₹${Math.round(Number(value)).toLocaleString("en-IN")}`;
}

export default async function AdminFinanceLeadsPage() {
  const supabase = getAdminClient();

  const { data: leads, error } = await supabase
    .from("finance_loan_leads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  const totalLeads = leads?.length || 0;
  const newLeads = leads?.filter((lead) => lead.status === "new").length || 0;

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
            View loan requests submitted from EMI Calculator. These leads can later
            be assigned to banks, NBFCs, LIC Housing Finance, cooperative banks and
            gramin banks.
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

        <div className="mt-5 overflow-x-auto rounded-3xl border bg-white shadow-sm">
          <table className="min-w-[1100px] w-full border-collapse">
            <thead>
              <tr className="bg-slate-100 text-left">
                <th className="px-4 py-3 text-xs font-bold text-slate-600">Borrower</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-600">Contact</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-600">Purpose</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-600">Income</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-600">CIBIL</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-600">Eligible Loan</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-600">Preferred Bank</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-600">Status</th>
              </tr>
            </thead>

            <tbody>
              {(leads || []).map((lead) => (
                <tr key={lead.id} className="border-t">
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-900">
                      {lead.name || "Unnamed"}
                    </div>
                    <div className="text-xs text-slate-500">
                      {new Date(lead.created_at).toLocaleString("en-IN")}
                    </div>
                  </td>

                  <td className="px-4 py-3 text-sm text-slate-700">
                    <div>{lead.phone || "No phone"}</div>
                    <div className="text-xs text-slate-500">
                      {lead.email || "No email"}
                    </div>
                  </td>

                  <td className="px-4 py-3 text-sm font-semibold capitalize text-slate-700">
                    {lead.loan_purpose || "home"}
                  </td>

                  <td className="px-4 py-3 text-sm text-slate-700">
                    <div>{formatINR(lead.monthly_income)}</div>
                    <div className="text-xs text-slate-500">
                      Co-app: {formatINR(lead.co_applicant_income)}
                    </div>
                  </td>

                  <td className="px-4 py-3 text-sm font-bold text-slate-700">
                    {lead.cibil_score || "-"}
                  </td>

                  <td className="px-4 py-3 text-sm font-bold text-slate-900">
                    {formatINR(lead.eligible_loan)}
                  </td>

                  <td className="px-4 py-3 text-sm text-slate-700">
                    {lead.preferred_bank || "Best match"}
                  </td>

                  <td className="px-4 py-3">
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                      {lead.status || "new"}
                    </span>
                  </td>
                </tr>
              ))}

              {!leads?.length ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-500">
                    No finance leads yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}