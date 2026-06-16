import Link from "next/link";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import BuyerWorkMenu from "@/components/buyer/BuyerWorkMenu";
import { createMetadata } from "@/lib/seo/metadata";

export const metadata = createMetadata({
  title: "Investment Opportunities",
  description:
    "Explore property, construction and marketplace-backed investment opportunities on 3Bigha.",
  path: "/investment",
  image: "/og/investment.svg",
});

export const dynamic = "force-dynamic";

type OpportunityRow = {
  id: string;
  slug: string | null;
  title: string | null;
  description: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  min_investment: number | null;
  max_investment: number | null;
  expected_holding_months: number | null;
  risk_level: string | null;
  cover_image_url: string | null;
  status: string | null;
  visibility: string | null;
  created_at: string | null;
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

function clip(text?: string | null, n = 140) {
  const t = String(text ?? "").trim();
  if (!t) return "Builder project open for investment.";
  if (t.length <= n) return t;
  return `${t.slice(0, n - 1)}…`;
}

function getRiskBadgeClass(risk?: string | null) {
  if (risk === "low") {
    return {
      border: "1px solid #bbf7d0",
      background: "#f0fdf4",
      color: "#15803d",
    };
  }

  if (risk === "high") {
    return {
      border: "1px solid #fecdd3",
      background: "#fff1f2",
      color: "#be123c",
    };
  }

  return {
    border: "1px solid #fde68a",
    background: "#fffbeb",
    color: "#b45309",
  };
}

export default async function InvestmentPage() {
  const cookieStore = await cookies();
  const supabase = getSupabaseServerClient(cookieStore);

  const { data, error } = await supabase
    .from("investment_opportunities")
    .select(`
      id,
      slug,
      title,
      description,
      city,
      state,
      country,
      min_investment,
      max_investment,
      expected_holding_months,
      risk_level,
      cover_image_url,
      status,
      visibility,
      created_at
    `)
    .eq("visibility", "public")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  const items = (data ?? []) as OpportunityRow[];

  return (
    <div style={{ padding: 14 }}>
      <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 8 }}>
        Investment Opportunities
      </h1>

      <BuyerWorkMenu />

      <p style={{ color: "#555", marginBottom: 20 }}>
        Explore only those builder projects and properties that are open for investment.
      </p>

      {error ? (
        <div
          style={{
            border: "1px solid #fecaca",
            borderRadius: 12,
            padding: 14,
            background: "#fff1f2",
            color: "#9f1239",
          }}
        >
          <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 6 }}>
            Could not load public investment opportunities
          </div>
          <div>{error.message}</div>
        </div>
      ) : items.length === 0 ? (
        <div
          style={{
            border: "1px solid #ddd",
            borderRadius: 12,
            padding: 14,
            background: "#fff",
          }}
        >
          <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 6 }}>
            No public investment opportunities available right now
          </div>
          <div style={{ color: "#666" }}>
            Please check again later for new builder projects open for investment.
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 16,
          }}
        >
          {items.map((item) => {
            const detailHref = `/investment/opportunities/${encodeURIComponent(
              item.slug || item.id
            )}`;

            const riskStyle = getRiskBadgeClass(item.risk_level);

            return (
              <div
                key={item.id}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: 12,
                  overflow: "hidden",
                  background: "#fff",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div
                  style={{
                    height: 180,
                    background: "#f8fafc",
                    borderBottom: "1px solid #eee",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {item.cover_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.cover_image_url}
                      alt={item.title || "Investment opportunity"}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <div style={{ color: "#64748b", fontWeight: 700 }}>
                      Investment Opportunity
                    </div>
                  )}
                </div>

                <div style={{ padding: 12, display: "grid", gap: 10 }}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span
                      style={{
                        border: "1px solid #dbeafe",
                        background: "#eff6ff",
                        color: "#1d4ed8",
                        borderRadius: 12,
                        padding: "4px 10px",
                        fontSize: 12,
                        fontWeight: 800,
                      }}
                    >
                      Public Investment
                    </span>

                    <span
                      style={{
                        ...riskStyle,
                        borderRadius: 12,
                        padding: "4px 10px",
                        fontSize: 12,
                        fontWeight: 800,
                      }}
                    >
                      {item.risk_level ? `${item.risk_level} risk` : "medium risk"}
                    </span>
                  </div>

                  <div style={{ fontWeight: 900, fontSize: 20 }}>
                    {item.title || "Untitled Opportunity"}
                  </div>

                  <div style={{ color: "#555", fontSize: 14 }}>
                    {getLocationText(item) || "Location not specified"}
                  </div>

                  <div style={{ color: "#444", lineHeight: 1.5 }}>
                    {clip(item.description)}
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        border: "1px solid #eee",
                        borderRadius: 12,
                        padding: 10,
                        background: "#fafafa",
                      }}
                    >
                      <div style={{ fontSize: 12, color: "#777", marginBottom: 4 }}>
                        Min Investment
                      </div>
                      <div style={{ fontWeight: 800 }}>
                        {formatINR(item.min_investment)}
                      </div>
                    </div>

                    <div
                      style={{
                        border: "1px solid #eee",
                        borderRadius: 12,
                        padding: 10,
                        background: "#fafafa",
                      }}
                    >
                      <div style={{ fontSize: 12, color: "#777", marginBottom: 4 }}>
                        Max Investment
                      </div>
                      <div style={{ fontWeight: 800 }}>
                        {formatINR(item.max_investment)}
                      </div>
                    </div>

                    <div
                      style={{
                        border: "1px solid #eee",
                        borderRadius: 12,
                        padding: 10,
                        background: "#fafafa",
                        gridColumn: "1 / span 2",
                      }}
                    >
                      <div style={{ fontSize: 12, color: "#777", marginBottom: 4 }}>
                        Expected Holding
                      </div>
                      <div style={{ fontWeight: 800 }}>
                        {item.expected_holding_months
                          ? `${item.expected_holding_months} months`
                          : "Not specified"}
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: 12, color: "#777" }}>
                    Listed on {formatDate(item.created_at)}
                  </div>

                  <Link
                    href={detailHref}
                    style={{
                      display: "inline-block",
                      marginTop: 4,
                      fontWeight: 800,
                      color: "#0b57d0",
                    }}
                  >
                    View Details →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}