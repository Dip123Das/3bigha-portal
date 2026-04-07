import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import OpportunitySidebarClient from "./OpportunitySidebarClient";

export const dynamic = "force-dynamic";

type OpportunityRow = {
  id: string;
  slug: string | null;
  title: string | null;
  description: string | null;
  opportunity_type: string | null;
  source_type: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  visibility: string | null;
  status: string | null;
  min_investment: number | null;
  max_investment: number | null;
  expected_holding_months: number | null;
  risk_level: "low" | "medium" | "high" | null;
  cover_image_url: string | null;
  created_at: string | null;
  updated_at?: string | null;
  created_by_user_id?: string | null;
};

type BuilderSummary = {
  displayName: string;
  role: string | null;
  activeOpportunities: number;
  activeDealRooms: number;
};

function formatINR(value?: number | null) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return "Not specified";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function getLocationText(item: OpportunityRow) {
  return [item.city, item.state, item.country].filter(Boolean).join(", ");
}

function getRiskBadgeClass(risk?: string | null) {
  if (risk === "low") {
    return "border-emerald-200/80 bg-emerald-50/90 text-emerald-700";
  }
  if (risk === "high") {
    return "border-rose-200/80 bg-rose-50/90 text-rose-700";
  }
  return "border-amber-200/80 bg-amber-50/90 text-amber-700";
}

async function getOpportunityBySlugOrId(slugOrId: string) {
  const cleanValue = String(slugOrId || "").trim();
  if (!cleanValue) return null;

  const cookieStore = await cookies();
  const supabase = getSupabaseServerClient(cookieStore);

  const baseSelect = `
    id,
    slug,
    title,
    description,
    opportunity_type,
    source_type,
    city,
    state,
    country,
    visibility,
    status,
    min_investment,
    max_investment,
    expected_holding_months,
    risk_level,
    cover_image_url,
    created_at,
    updated_at,
    created_by_user_id
  `;

  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      cleanValue
    );

  let query = supabase
    .from("investment_opportunities")
    .select(baseSelect)
    .eq("visibility", "public")
    .eq("status", "active");

  if (isUuid) {
    query = query.or(`slug.eq.${cleanValue},id.eq.${cleanValue}`);
  } else {
    query = query.eq("slug", cleanValue);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error("INVESTMENT_DETAIL_ERROR", {
      cleanValue,
      isUuid,
      error,
    });
    return null;
  }

  return (data ?? null) as OpportunityRow | null;
}

async function getBuilderSummary(
  builderUserId?: string | null
): Promise<BuilderSummary | null> {
  if (!builderUserId) return null;

  const cookieStore = await cookies();
  const supabase = getSupabaseServerClient(cookieStore);

  let displayName = "Builder";
  let role: string | null = null;

  const profileTables = ["profiles", "user_profiles", "users"] as const;

  for (const table of profileTables) {
    try {
      const byId = await supabase
        .from(table)
        .select("*")
        .eq("id", builderUserId)
        .maybeSingle();

      const row = byId.data as Record<string, any> | null;

      if (row) {
        displayName =
          row.company_name ||
          row.full_name ||
          row.name ||
          row.display_name ||
          row.business_name ||
          row.builder_name ||
          displayName;

        role = row.role ? String(row.role) : role;
        break;
      }
    } catch {}

    try {
      const byUserId = await supabase
        .from(table)
        .select("*")
        .eq("user_id", builderUserId)
        .maybeSingle();

      const row = byUserId.data as Record<string, any> | null;

      if (row) {
        displayName =
          row.company_name ||
          row.full_name ||
          row.name ||
          row.display_name ||
          row.business_name ||
          row.builder_name ||
          displayName;

        role = row.role ? String(row.role) : role;
        break;
      }
    } catch {}
  }

  let activeOpportunities = 0;
  let activeDealRooms = 0;

  try {
    const { count } = await supabase
      .from("investment_opportunities")
      .select("id", { count: "exact", head: true })
      .eq("builder_user_id", builderUserId)
      .eq("status", "active");

    activeOpportunities = count || 0;
  } catch {}

  try {
    const { count } = await supabase
      .from("investment_deal_rooms")
      .select("id", { count: "exact", head: true })
      .eq("builder_user_id", builderUserId)
      .in("status", ["active", "open", "in_progress"]);

    activeDealRooms = count || 0;
  } catch {}

  return {
    displayName,
    role,
    activeOpportunities,
    activeDealRooms,
  };
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur">
      <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-base font-semibold text-slate-950">{value}</div>
    </div>
  );
}

export default async function InvestmentOpportunityDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const slugOrId = decodeURIComponent(params.slug || "").trim();
  const opportunity = await getOpportunityBySlugOrId(slugOrId);

  if (!opportunity) notFound();

  const title = opportunity.title || "Untitled Opportunity";
  const description =
    opportunity.description?.trim() ||
    "Full investment details will be shared after initial review and interest confirmation.";
  const location = getLocationText(opportunity);
  const builderSummary = await getBuilderSummary(opportunity.created_by_user_id);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100">
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            href="/investment/opportunities"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
          >
            ← Back to Opportunities
          </Link>
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-[0_20px_60px_-20px_rgba(15,23,42,0.20)]">
          <div className="relative h-[300px] w-full overflow-hidden bg-slate-100 sm:h-[380px] lg:h-[460px]">
            {opportunity.cover_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={opportunity.cover_image_url}
                alt={title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(148,163,184,0.35),_transparent_35%),linear-gradient(135deg,#f8fafc,#e2e8f0)] text-base font-medium text-slate-500">
                Investment Opportunity
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/35 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/45 via-transparent to-transparent" />

            <div className="absolute left-4 top-4 flex flex-wrap gap-2 sm:left-6 sm:top-6">
              {opportunity.opportunity_type ? (
                <span className="rounded-full border border-white/25 bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
                  {opportunity.opportunity_type}
                </span>
              ) : null}

              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold backdrop-blur-md ${getRiskBadgeClass(
                  opportunity.risk_level
                )}`}
              >
                {opportunity.risk_level
                  ? `${opportunity.risk_level} risk`
                  : "medium risk"}
              </span>

              {opportunity.source_type ? (
                <span className="rounded-full border border-white/25 bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
                  {opportunity.source_type}
                </span>
              ) : null}
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-7 lg:p-10">
              <div className="max-w-4xl">
                <div className="mb-3 inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/85 backdrop-blur">
                  Investment Marketplace
                </div>

                <h1 className="max-w-4xl text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
                  {title}
                </h1>

                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/85">
                  {location ? <span>📍 {location}</span> : null}
                  {opportunity.created_at ? (
                    <span>🗓 Listed on {formatDate(opportunity.created_at)}</span>
                  ) : null}
                  {opportunity.expected_holding_months ? (
                    <span>⏳ {opportunity.expected_holding_months} months</span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 bg-[linear-gradient(180deg,#ffffff,#f8fafc)] p-4 sm:p-6 lg:grid-cols-3 lg:p-8">
            <div className="space-y-6 lg:col-span-2">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  label="Minimum"
                  value={formatINR(opportunity.min_investment)}
                />
                <MetricCard
                  label="Maximum"
                  value={formatINR(opportunity.max_investment)}
                />
                <MetricCard
                  label="Holding"
                  value={
                    opportunity.expected_holding_months
                      ? `${opportunity.expected_holding_months} months`
                      : "Not specified"
                  }
                />
                <MetricCard
                  label="Expected ROI"
                  value="Not specified"
                />
              </div>

              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Overview
                    </div>
                    <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
                      Opportunity Overview
                    </h2>
                  </div>
                </div>

                <div className="mt-5 h-px bg-gradient-to-r from-slate-200 via-slate-200 to-transparent" />

                <div className="mt-5 whitespace-pre-line text-[15px] leading-8 text-slate-700">
                  {description}
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Details
                  </div>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
                    Investment Details
                  </h2>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Opportunity Type
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {opportunity.opportunity_type || "Not specified"}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Source Type
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {opportunity.source_type || "Not specified"}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Minimum Investment
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {formatINR(opportunity.min_investment)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Maximum Investment
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {formatINR(opportunity.max_investment)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Expected Holding
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {opportunity.expected_holding_months
                        ? `${opportunity.expected_holding_months} months`
                        : "Not specified"}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Expected ROI
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      Not specified
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <aside className="lg:col-span-1">
              <OpportunitySidebarClient
                opportunityId={opportunity.id}
                title={title}
                visibility={opportunity.visibility}
                location={location}
                minInvestment={opportunity.min_investment}
                maxInvestment={opportunity.max_investment}
                expectedHoldingMonths={opportunity.expected_holding_months}
                riskLevel={opportunity.risk_level}
                builderName={builderSummary?.displayName || "Builder"}
                builderRole={builderSummary?.role || "builder"}
                builderActiveOpportunities={
                  builderSummary?.activeOpportunities || 0
                }
                builderActiveDealRooms={builderSummary?.activeDealRooms || 0}
              />
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
}