import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { requireVerifiedBanker } from "@/lib/finance/requireVerifiedBanker";
import BankerLenderOfferForm from "./BankerLenderOfferForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

function formatINR(value: number | null | undefined) {
  if (!Number.isFinite(Number(value))) return "₹0";
  return `₹${Math.round(Number(value)).toLocaleString("en-IN")}`;
}

function getPriorityColor(priority?: string | null) {
  if (priority === "high") return "bg-red-100 text-red-700";
  if (priority === "follow_up") return "bg-amber-100 text-amber-700";
  return "bg-blue-100 text-blue-700";
}

export default async function BankerDashboardPage() {
  const bankerProfile =
    await requireVerifiedBanker();
  const supabase = getAdminClient();

  const { data: leads, error } = await supabase
    .from("finance_loan_leads")
    .select("*")
    .eq("assigned_lender", bankerProfile.bank_name)
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: lenderOffers } = await supabase
    .from("finance_lender_offers")
    .select("*")
    .eq("lender_name", bankerProfile.bank_name)
    .order("updated_at", { ascending: false })
    .limit(20);

  const totalAssigned = leads?.length || 0;
  const highPriority =
    leads?.filter((lead) => lead.priority === "high").length || 0;
  const converted =
    leads?.filter((lead) => lead.status === "converted").length || 0;

  const documentsPending =
    leads?.filter((lead) => lead.status === "documents_pending").length || 0;

  const sanctionLikely =
    leads?.filter(
      (lead) =>
        Number(lead.sanction_probability || 0) >= 70 ||
        lead.status === "sanction_possible"
    ).length || 0;

  const activeOffers =
    lenderOffers?.filter(
      (offer) => offer.is_verified && offer.is_active
    ).length || 0;

  const priorityLeads = (leads || [])
    .filter(
      (lead) =>
        lead.priority === "high" ||
        Number(lead.sanction_probability || 0) >= 70 ||
        lead.status === "documents_pending"
    )
    .slice(0, 4);

  return (
    <main data-finance-workflow="true" className="min-h-screen bg-slate-50 px-4 py-6">
      <section className="mx-auto max-w-7xl">
        <div className="rounded-3xl border bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
            Banker Operations
          </p>

          <h1 className="mt-2 text-2xl font-black text-slate-900">
            Banker Finance Work Desk
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Your daily workspace for borrower follow-up, document collection, lender offers and loan progress.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-blue-50 p-4 md:col-span-2">
              <p className="text-sm font-bold text-slate-900">
                {bankerProfile.full_name}
              </p>

              <p className="mt-1 text-xs text-slate-600">
                {bankerProfile.bank_name}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {bankerProfile.branch_name} • {bankerProfile.designation}
              </p>
            </div>

            <div className="rounded-2xl bg-emerald-50 p-4">
              <p className="text-xs font-bold text-emerald-700">
                Verified Banker Access
              </p>

              <strong className="mt-1 block text-sm text-slate-900">
                Active
              </strong>

              <p className="mt-1 text-xs leading-5 text-slate-600">
                You can receive assigned finance leads, submit lender offers and track borrower progress.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-4">
            <div className="rounded-2xl bg-blue-50 p-4">
              <p className="text-xs font-bold text-blue-700">Assigned Leads</p>
              <strong className="mt-1 block text-2xl text-slate-900">
                {totalAssigned}
              </strong>
            </div>

            <div className="rounded-2xl bg-red-50 p-4">
              <p className="text-xs font-bold text-red-700">High Priority</p>
              <strong className="mt-1 block text-2xl text-slate-900">
                {highPriority}
              </strong>
            </div>

            <div className="rounded-2xl bg-emerald-50 p-4">
              <p className="text-xs font-bold text-emerald-700">Converted</p>
              <strong className="mt-1 block text-2xl text-slate-900">
                {converted}
              </strong>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-violet-50 p-4">
          <p className="text-xs font-bold text-violet-700">Active Offers</p>
          <strong className="mt-1 block text-2xl text-slate-900">
            {activeOffers}
          </strong>
        </div>

        {error ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error.message}
          </div>
        ) : null}

        <div className="mt-5 rounded-3xl border bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-orange-600">
                Today’s Work
              </p>

              <h2 className="mt-1 text-lg font-black text-slate-900">
                Priority Borrower Follow-ups
              </h2>

              <p className="mt-1 text-sm text-slate-600">
                Start with high-score borrowers, document-pending cases and sanction-likely leads.
              </p>
            </div>

            <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-orange-700">
              {priorityLeads.length} priority
            </span>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {priorityLeads.map((lead) => (
              <Link
                key={lead.id}
                href={`/admin/dashboard/finance-leads/${lead.id}`}
                className="rounded-2xl border bg-slate-50 p-4 hover:bg-blue-50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-slate-900">
                      {lead.name || "Borrower"}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {lead.phone || "-"} • {lead.loan_purpose || "loan"}
                    </p>
                  </div>

                  <span className={`rounded-full px-3 py-1 text-xs font-black ${getPriorityColor(lead.priority)}`}>
                    {lead.priority || "normal"}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl bg-white p-2">
                    <span className="text-slate-500">Sanction</span>
                    <strong className="block text-slate-900">
                      {lead.sanction_probability || 0}%
                    </strong>
                  </div>

                  <div className="rounded-xl bg-white p-2">
                    <span className="text-slate-500">Eligible</span>
                    <strong className="block text-slate-900">
                      {formatINR(lead.eligible_loan)}
                    </strong>
                  </div>
                </div>
              </Link>
            ))}

            {!priorityLeads.length ? (
              <div className="rounded-2xl bg-slate-50 p-5 text-sm font-bold text-slate-500 md:col-span-2">
                No urgent borrower follow-up right now.
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-5">
          <BankerLenderOfferForm lenderName={bankerProfile.bank_name} />
        </div>

        <div className="mt-5 rounded-3xl border bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
                Submitted Offers
              </p>

              <h2 className="mt-1 text-lg font-black text-slate-900">
                Your Latest Lender Offers
              </h2>
            </div>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
              {lenderOffers?.length || 0} offers
            </span>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-[900px] w-full border-collapse">
              <thead>
                <tr className="bg-slate-100 text-left">
                  <th className="px-4 py-3 text-xs font-bold text-slate-600">
                    Product
                  </th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-600">
                    ROI
                  </th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-600">
                    CIBIL
                  </th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-600">
                    FOIR
                  </th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-600">
                    Tenure
                  </th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-600">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody>
                {(lenderOffers || []).map((offer) => (
                  <tr key={offer.id} className="border-t">
                    <td className="px-4 py-3 text-sm font-bold capitalize text-slate-900">
                      {offer.product_type || "home"}
                      <div className="text-xs font-normal text-slate-500">
                        {offer.state || "West Bengal"}
                        {offer.district ? ` • ${offer.district}` : ""}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-sm text-slate-700">
                      {offer.min_roi || 0}% - {offer.max_roi || 0}%
                    </td>

                    <td className="px-4 py-3 text-sm text-slate-700">
                      {offer.min_cibil || "-"}
                    </td>

                    <td className="px-4 py-3 text-sm text-slate-700">
                      {offer.max_foir_percent || "-"}%
                    </td>

                    <td className="px-4 py-3 text-sm text-slate-700">
                      {offer.max_tenure_years || "-"} yrs
                    </td>

                    <td className="px-4 py-3">
                      {offer.is_verified && offer.is_active ? (
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">
                          Active
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700">
                          Pending Admin
                        </span>
                      )}
                    </td>
                  </tr>
                ))}

                {!lenderOffers?.length ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-sm text-slate-500"
                    >
                      No lender offers submitted yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto rounded-3xl border bg-white shadow-sm">
          <table className="min-w-[1100px] w-full border-collapse">
            <thead>
              <tr className="bg-slate-100 text-left">
                <th className="px-4 py-3 text-xs font-bold text-slate-600">
                  Borrower
                </th>
                <th className="px-4 py-3 text-xs font-bold text-slate-600">
                  Assigned Lender
                </th>
                <th className="px-4 py-3 text-xs font-bold text-slate-600">
                  Purpose
                </th>
                <th className="px-4 py-3 text-xs font-bold text-slate-600">
                  Eligible Loan
                </th>
                <th className="px-4 py-3 text-xs font-bold text-slate-600">
                  Score
                </th>
                <th className="px-4 py-3 text-xs font-bold text-slate-600">
                  Sanction
                </th>
                <th className="px-4 py-3 text-xs font-bold text-slate-600">
                  Priority
                </th>
                <th className="px-4 py-3 text-xs font-bold text-slate-600">
                  Status
                </th>
              </tr>
            </thead>

            <tbody>
              {(leads || []).map((lead) => (
                <tr key={lead.id} className="border-t">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/dashboard/finance-leads/${lead.id}`}
                      className="font-bold text-slate-900 hover:text-blue-600"
                    >
                      {lead.name || "Unnamed"}
                    </Link>
                    <div className="text-xs text-slate-500">
                      {lead.phone || "-"}
                    </div>
                  </td>

                  <td className="px-4 py-3 text-sm text-slate-700">
                    <div className="font-bold">
                      {lead.assigned_lender || "-"}
                    </div>
                    <div className="text-xs text-slate-500">
                      {lead.assigned_lender_type || "lender"}
                    </div>
                  </td>

                  <td className="px-4 py-3 text-sm capitalize text-slate-700">
                    {lead.loan_purpose || "home"}
                  </td>

                  <td className="px-4 py-3 text-sm font-bold text-slate-900">
                    {formatINR(lead.eligible_loan)}
                  </td>

                  <td className="px-4 py-3 text-sm font-bold text-slate-900">
                    {lead.lead_score || 0}/100
                  </td>

                  <td className="px-4 py-3 text-sm font-bold text-emerald-700">
                    {lead.sanction_probability || 0}%
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${getPriorityColor(
                        lead.priority
                      )}`}
                    >
                      {lead.priority || "normal"}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                      {lead.status || "new"}
                    </span>
                  </td>
                </tr>
              ))}

              {!leads?.length ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-sm text-slate-500"
                  >
                    No assigned lender leads yet.
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