// app/property/[id]/page.tsx
import Link from "next/link";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

import SendEnquiryButton from "@/app/components/enquiry/SendEnquiryButton";
import InvestmentApplyButton from "./InvestmentApplyButton";

type AnyRow = Record<string, any>;

type InvestmentPlanInfo = {
  id: string;
  title: string | null;
  category: string | null;
  status: string | null;
  source: "listing" | "project";
};

type InvestmentOpportunityInfo = {
  id: string;
  min_investment: number | null;
  max_investment: number | null;
  expected_holding_months: number | null;
  risk_level: string | null;
  status: string | null;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isBadId(v?: string | null) {
  const s = String(v ?? "").trim();
  return !s || s === "id" || s === "[id]" || s === "<id>" || !UUID_RE.test(s);
}

function getSupabaseServer() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {},
        remove() {},
      },
    }
  );
}

function safeText(x: any) {
  return String(x ?? "").trim();
}

function fmtDate(iso: any) {
  const s = safeText(iso);
  if (!s) return "—";
  try {
    return new Date(s).toLocaleString();
  } catch {
    return s;
  }
}

function fmtMoney(v: any) {
  if (v === null || v === undefined || v === "") return "—";

  const n = Number(v);
  if (!Number.isFinite(n)) return "—";

  try {
    return new Intl.NumberFormat("en-IN", {
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return String(n);
  }
}

export const dynamic = "force-dynamic";

export default async function PropertyPublicDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = decodeURIComponent(params.id || "");

  if (isBadId(id)) {
    return (
      <Container>
        <SectionHeader title="Property" subtitle="Not available" />
        <EmptyState message="Invalid property id in URL." />
      </Container>
    );
  }

  const supabase = getSupabaseServer();

  const tables = ["property_listings_public", "property_listings"];

  let row: AnyRow | null = null;
  let sourceTable: string | null = null;

  for (const t of tables) {
    const res = await supabase.from(t).select("*").eq("id", id).maybeSingle();
    if (!res.error && res.data) {
      row = res.data;
      sourceTable = t;
      break;
    }
  }

  if (!row) {
    return (
      <Container>
        <SectionHeader title="Property" subtitle="Not available" />
        <EmptyState message="Not found." />
      </Container>
    );
  }

    let resolvedVendorUserId =
    safeText(row.vendor_user_id) ||
    safeText(row.owner_id) ||
    null;

  // Important:
  // If the row came from property_listings_public, that view may not expose vendor_user_id.
  // In that case, do one safe read from the base table only for vendor linkage fields.
  if (!resolvedVendorUserId && sourceTable === "property_listings_public") {
    const vendorRes = await supabase
      .from("property_listings")
      .select("vendor_user_id, owner_id")
      .eq("id", id)
      .maybeSingle();

    if (!vendorRes.error && vendorRes.data) {
      resolvedVendorUserId =
        safeText((vendorRes.data as AnyRow).vendor_user_id) ||
        safeText((vendorRes.data as AnyRow).owner_id) ||
        null;
    }
  }

    let resolvedBuilderProjectId =
    safeText(row.builder_project_id) ||
    null;

  let resolvedInvestmentPlan: InvestmentPlanInfo | null = null;
    let resolvedInvestmentOpportunity: InvestmentOpportunityInfo | null = null;

  // Read safe base listing fields when the public view may not expose them
  if (
    sourceTable === "property_listings_public" &&
    (!resolvedBuilderProjectId || !safeText(row.investment_plan_master_id))
  ) {
    const baseListingRes = await supabase
      .from("property_listings")
      .select("builder_project_id, investment_plan_master_id")
      .eq("id", id)
      .maybeSingle();

    if (!baseListingRes.error && baseListingRes.data) {
      resolvedBuilderProjectId =
        safeText((baseListingRes.data as AnyRow).builder_project_id) ||
        resolvedBuilderProjectId;

      const listingPlanId = safeText((baseListingRes.data as AnyRow).investment_plan_master_id);
      if (listingPlanId) {
        const planRes = await supabase
          .from("investment_plan_master")
          .select("id,title,category,status")
          .eq("id", listingPlanId)
          .maybeSingle();

        if (!planRes.error && planRes.data) {
          resolvedInvestmentPlan = {
            id: String((planRes.data as AnyRow).id),
            title: (planRes.data as AnyRow).title ?? null,
            category: (planRes.data as AnyRow).category ?? null,
            status: (planRes.data as AnyRow).status ?? null,
            source: "listing",
          };
        }
      }
    }
  }

  // If the current row itself already has a direct plan, prefer it
  if (!resolvedInvestmentPlan) {
    const rowPlanId = safeText(row.investment_plan_master_id);
    if (rowPlanId) {
      const planRes = await supabase
        .from("investment_plan_master")
        .select("id,title,category,status")
        .eq("id", rowPlanId)
        .maybeSingle();

      if (!planRes.error && planRes.data) {
        resolvedInvestmentPlan = {
          id: String((planRes.data as AnyRow).id),
          title: (planRes.data as AnyRow).title ?? null,
          category: (planRes.data as AnyRow).category ?? null,
          status: (planRes.data as AnyRow).status ?? null,
          source: "listing",
        };
      }
    }
  }

  let hasInvestmentOpportunity = false;

  const oppCheckRes = await supabase
    .from("investment_opportunities")
    .select(`
      id,
      min_investment,
      max_investment,
      expected_holding_months,
      risk_level,
      status
    `)
    .eq("source_type", "property")
    .eq("source_id", id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1);

  if (!oppCheckRes.error && oppCheckRes.data?.length) {
    const opp = oppCheckRes.data[0] as AnyRow;

    hasInvestmentOpportunity = true;
    resolvedInvestmentOpportunity = {
      id: String(opp.id),
      min_investment: opp.min_investment ?? null,
      max_investment: opp.max_investment ?? null,
      expected_holding_months: opp.expected_holding_months ?? null,
      risk_level: opp.risk_level ?? null,
      status: opp.status ?? null,
    };
  }

  // Otherwise fall back to project-level default plan
  if (!resolvedInvestmentPlan && resolvedBuilderProjectId) {
    const projectPlanRes = await supabase
      .from("builder_projects")
      .select(`
        investment_plan_master_id,
        investment_plan_master:investment_plan_master_id (
          id,
          title,
          category,
          status
        )
      `)
      .eq("id", resolvedBuilderProjectId)
      .maybeSingle();

    if (!projectPlanRes.error && projectPlanRes.data) {
      const projectPlan = (projectPlanRes.data as AnyRow).investment_plan_master as AnyRow | null;
      if (projectPlan?.id) {
        resolvedInvestmentPlan = {
          id: String(projectPlan.id),
          title: projectPlan.title ?? null,
          category: projectPlan.category ?? null,
          status: projectPlan.status ?? null,
          source: "project",
        };
      }
    }
  }

  const title = safeText(row.title) || "Property";

  const location = [row.city, row.district, row.state]
    .filter(Boolean)
    .join(", ");

  const investmentMin =
    resolvedInvestmentOpportunity?.min_investment ?? null;

  const investmentMax =
    resolvedInvestmentOpportunity?.max_investment ?? null;

  const investmentHoldingMonths =
    resolvedInvestmentOpportunity?.expected_holding_months ?? null;

  const investmentRiskLevel =
    resolvedInvestmentOpportunity?.risk_level ?? null;

  return (
    <Container>
      <SectionHeader title={title} subtitle="Property details" />

      <div style={{ marginBottom: 12, display: "flex", gap: 10 }}>
        <Link href="/property">← Back</Link>
        {row.status ? <Badge>{row.status}</Badge> : null}
        {row.updated_at ? <Badge>Updated: {fmtDate(row.updated_at)}</Badge> : null}
        {location ? <Badge>{location}</Badge> : null}
      </div>

      <div className="propGrid">

        <Card>
          <CardBody>
            {row.description ? (
              <div style={{ whiteSpace: "pre-wrap" }}>{row.description}</div>
            ) : (
              <div style={{ opacity: 0.7 }}>No description provided.</div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            {(resolvedInvestmentPlan || hasInvestmentOpportunity) ? (
              <div
                style={{
                  marginBottom: 14,
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  background: "#fafafa",
                }}
              >
                <div style={{ fontWeight: 950, marginBottom: 8 }}>
                  Investment Opportunity
                </div>

                <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 4 }}>
                  {safeText(resolvedInvestmentPlan?.title) || "Investment Plan Available"}
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                  {resolvedInvestmentPlan?.category ? <Badge>{resolvedInvestmentPlan.category}</Badge> : null}
                  {resolvedInvestmentPlan?.status ? <Badge>{resolvedInvestmentPlan.status}</Badge> : null}
                  {resolvedInvestmentPlan?.source ? (
                    <Badge>
                      {resolvedInvestmentPlan.source === "listing"
                        ? "Unit-specific plan"
                        : "Project default plan"}
                    </Badge>
                  ) : (
                    <Badge>Property-linked opportunity</Badge>
                  )}
                  {resolvedInvestmentOpportunity?.risk_level ? (
                    <Badge>{resolvedInvestmentOpportunity.risk_level}</Badge>
                  ) : null}
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 10,
                    marginBottom: 10,
                  }}
                >
                  <div
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 10,
                      padding: "10px 12px",
                      background: "#fff",
                    }}
                  >
                    <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>
                      Min Investment
                    </div>
                    <div style={{ fontWeight: 800 }}>
                      {investmentMin !== null
                        ? `₹ ${fmtMoney(investmentMin)}`
                        : "—"}
                    </div>
                  </div>

                  <div
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 10,
                      padding: "10px 12px",
                      background: "#fff",
                    }}
                  >
                    <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>
                      Max Investment
                    </div>
                    <div style={{ fontWeight: 800 }}>
                      {investmentMax !== null
                        ? `₹ ${fmtMoney(investmentMax)}`
                        : "—"}
                    </div>
                  </div>

                  <div
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 10,
                      padding: "10px 12px",
                      background: "#fff",
                    }}
                  >
                    <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>
                      Expected Holding
                    </div>
                    <div style={{ fontWeight: 800 }}>
                      {investmentHoldingMonths !== null
                        ? `${investmentHoldingMonths} months`
                        : "—"}
                    </div>
                  </div>

                  <div
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 10,
                      padding: "10px 12px",
                      background: "#fff",
                    }}
                  >
                    <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>
                      Risk Level
                    </div>
                    <div style={{ fontWeight: 800 }}>
                      {safeText(investmentRiskLevel) || "—"}
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: 13, opacity: 0.82 }}>
                  {resolvedInvestmentOpportunity?.id
                    ? "This property is linked with an investment opportunity and may be available for investor participation."
                    : "This property is showing a project-level investment plan. Invest Now will appear after a property-level investment opportunity is created for this listing."}
                </div>
              </div>
            ) : null}

            <div style={{ fontWeight: 950, marginBottom: 8 }}>
              Send Enquiry
            </div>

            {!resolvedVendorUserId && (
              <div style={{ fontSize: 12, opacity: 0.6 }}>
                Vendor account not linked to this listing.
              </div>
            )}

            <SendEnquiryButton
              module="property"
              refId={String(row.id)}
              title={title}
              priceText={row.price ? `₹ ${row.price}` : undefined}
              vendorUserId={resolvedVendorUserId}
              nextUrl={`/property/${encodeURIComponent(id)}`}
            />

            {resolvedInvestmentOpportunity?.id ? (
              <div style={{ marginTop: 10 }}>
                <InvestmentApplyButton
                  listingId={String(row.id)}
                  opportunityId={resolvedInvestmentOpportunity.id}
                  title={title}
                />
              </div>
            ) : null}
          </CardBody>
        </Card>

      </div>

      <style>{`
        .propGrid{
          display:grid;
          grid-template-columns:2fr 1fr;
          gap:14px;
        }
        @media (max-width:980px){
          .propGrid{grid-template-columns:1fr}
        }
      `}</style>
    </Container>
  );
}