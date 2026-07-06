import { createClient } from "@supabase/supabase-js";
import BankerVerificationActions from "./BankerVerificationActions";
import LenderOfferActions from "./LenderOfferActions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

function statusColor(status?: string | null) {
  if (status === "verified") return "bg-emerald-100 text-emerald-700";
  if (status === "rejected") return "bg-red-100 text-red-700";
  if (status === "needs_manual_review") return "bg-amber-100 text-amber-700";
  return "bg-blue-100 text-blue-700";
}

export default async function BankerVerificationPage() {
  const supabase = getAdminClient();

  const { data: bankers, error } = await supabase
    .from("finance_banker_profiles")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  const total = bankers?.length || 0;
  const { data: lenderOffers } = await supabase
    .from("finance_lender_offers")
    .select(`
      id,
      lender_name,
      lender_type,
      state,
      district,
      product_type,
      min_roi,
      max_roi,
      min_cibil,
      max_foir_percent,
      max_tenure_years,
      is_verified,
      is_active,
      updated_at
    `)
    .order("updated_at", { ascending: false })
    .limit(50);

  const activeOffers =
    lenderOffers?.filter(
      (offer) =>
        offer.is_verified && offer.is_active
    ).length || 0;
  const pending = bankers?.filter((b) => b.final_status === "pending").length || 0;
  const verified = bankers?.filter((b) => b.final_status === "verified").length || 0;

  return (
    <main data-finance-workflow="true" className="min-h-screen bg-slate-50 px-4 py-6">
      <section className="w-full">
        <div className="rounded-3xl border bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
            Banker Verification Desk
          </p>

          <h1 className="mt-2 text-2xl font-black text-slate-900">
            Banker Applications
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Review banker identity, bank credentials, IFSC, branch details,
            employee ID and verification status before allowing banker dashboard access.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-4">
            <div className="rounded-2xl bg-blue-50 p-4">
              <p className="text-xs font-bold text-blue-700">Total Applications</p>
              <strong className="mt-1 block text-2xl text-slate-900">{total}</strong>
            </div>

            <div className="rounded-2xl bg-amber-50 p-4">
              <p className="text-xs font-bold text-amber-700">Pending</p>
              <strong className="mt-1 block text-2xl text-slate-900">{pending}</strong>
            </div>

            <div className="rounded-2xl bg-emerald-50 p-4">
              <p className="text-xs font-bold text-emerald-700">Verified</p>
              <strong className="mt-1 block text-2xl text-slate-900">{verified}</strong>
            </div>

            <div className="rounded-2xl bg-violet-50 p-4">
              <p className="text-xs font-bold text-violet-700">Active Lender Offers</p>
              <strong className="mt-1 block text-2xl text-slate-900">{activeOffers}</strong>
            </div>
          </div>
        </div>

        {error ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error.message}
          </div>
        ) : null}

        <div className="mt-5 overflow-x-auto rounded-3xl border bg-white shadow-sm">
          <table className="min-w-[1200px] w-full border-collapse">
            <thead>
              <tr className="bg-slate-100 text-left">
                <th className="px-4 py-3 text-xs font-bold text-slate-600">Banker</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-600">Bank</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-600">Branch / IFSC</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-600">Employee</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-600">Contact</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-600">Employee Card</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-600">AI Status</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-600">Final Status</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-600">Action</th>
              </tr>
            </thead>

            <tbody>
              {(bankers || []).map((banker) => (
                <tr key={banker.id} className="border-t">
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-900">
                      {banker.full_name}
                    </div>
                    <div className="text-xs text-slate-500">
                      {new Date(banker.created_at).toLocaleString("en-IN")}
                    </div>
                  </td>

                  <td className="px-4 py-3 text-sm text-slate-700">
                    {banker.bank_name}
                  </td>

                  <td className="px-4 py-3 text-sm text-slate-700">
                    <div>{banker.branch_name}</div>
                    <div className="text-xs font-bold text-slate-500">
                      {banker.ifsc_code}
                    </div>
                    <div className="text-xs text-slate-500">
                      Branch Code: {banker.branch_code || "-"}
                    </div>
                  </td>

                  <td className="px-4 py-3 text-sm text-slate-700">
                    <div>{banker.employee_id}</div>
                    <div className="text-xs text-slate-500">
                      {banker.designation}
                    </div>
                  </td>

                  <td className="px-4 py-3 text-sm text-slate-700">
                    <div>{banker.official_mobile || "-"}</div>
                    <div className="text-xs text-slate-500">
                      {banker.official_email || "-"}
                    </div>
                  </td>

                  <td className="px-4 py-3 text-sm">
                    {banker.employee_card_url ? (
                      <a
                        href={`/api/finance/banker-documents/view?path=${encodeURIComponent(
                          banker.employee_card_url
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold text-blue-600 hover:text-blue-800"
                      >
                        View Card
                      </a>
                    ) : (
                      <span className="text-slate-400">Not added</span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${statusColor(banker.ai_verification_status)}`}>
                      {banker.ai_verification_status}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${statusColor(banker.final_status)}`}>
                      {banker.final_status}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <BankerVerificationActions bankerId={banker.id} />
                  </td>
                </tr>
              ))}

              {!bankers?.length ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-500">
                    No banker applications yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
      <div className="mt-6 rounded-3xl border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-violet-600">
              Lender Offer Approval
            </p>

            <h2 className="mt-1 text-xl font-black text-slate-900">
              Banker Submitted Lender Offers
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Approve only genuine lender offers. Approved and active offers can appear
              inside EMI calculator live ROI comparison.
            </p>
          </div>

          <span className="rounded-full bg-violet-50 px-4 py-2 text-xs font-black text-violet-700">
            {lenderOffers?.length || 0} offers
          </span>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-[1050px] w-full border-collapse">
            <thead>
              <tr className="bg-slate-100 text-left">
                <th className="px-4 py-3 text-xs font-bold text-slate-600">
                  Lender
                </th>

                <th className="px-4 py-3 text-xs font-bold text-slate-600">
                  Product
                </th>

                <th className="px-4 py-3 text-xs font-bold text-slate-600">
                  ROI
                </th>

                <th className="px-4 py-3 text-xs font-bold text-slate-600">
                  Rules
                </th>

                <th className="px-4 py-3 text-xs font-bold text-slate-600">
                  Status
                </th>

                <th className="px-4 py-3 text-xs font-bold text-slate-600">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {(lenderOffers || []).map((offer) => (
                <tr key={offer.id} className="border-t">
                  <td className="px-4 py-3">
                    <div className="text-sm font-black text-slate-900">
                      {offer.lender_name}
                    </div>

                    <div className="text-xs text-slate-500">
                      {offer.lender_type || "bank"} • {offer.state || "West Bengal"}
                      {offer.district ? ` • ${offer.district}` : ""}
                    </div>
                  </td>

                  <td className="px-4 py-3 text-sm font-bold capitalize text-slate-700">
                    {offer.product_type || "home"}
                  </td>

                  <td className="px-4 py-3 text-sm text-slate-700">
                    {offer.min_roi || 0}% - {offer.max_roi || 0}%
                  </td>

                  <td className="px-4 py-3 text-xs leading-5 text-slate-600">
                    CIBIL: {offer.min_cibil || "-"} <br />
                    FOIR: {offer.max_foir_percent || "-"}% <br />
                    Tenure: {offer.max_tenure_years || "-"} yrs
                  </td>

                  <td className="px-4 py-3">
                    {offer.is_verified && offer.is_active ? (
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">
                        Active
                      </span>
                    ) : offer.is_verified && !offer.is_active ? (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                        Paused
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700">
                        Pending
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <LenderOfferActions offerId={offer.id} />
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
    </main>
  );
}
