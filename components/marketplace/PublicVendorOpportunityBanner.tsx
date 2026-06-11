import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type ModuleKey = "property" | "materials" | "services" | "rentals";

type GeoNameMap = Map<string, string>;

async function loadGeoNameMap(table: string) {
  const { data } = await supabase.from(table).select("id,name").limit(1000);
  const map: GeoNameMap = new Map();

  for (const row of data || []) {
    if (row?.id && row?.name) map.set(String(row.id), String(row.name));
  }

  return map;
}

function geoName(map: GeoNameMap, id: string | null | undefined) {
  if (!id) return "";
  return map.get(id) || "";
}

function moduleLabel(module: ModuleKey) {
  if (module === "property") return "Property sellers / builders";
  if (module === "materials") return "Materials vendors";
  if (module === "services") return "Service providers";
  return "Rental equipment vendors";
}

export default async function PublicVendorOpportunityBanner({
  module,
}: {
  module: ModuleKey;
}) {
  const [targetsRes, stateNames, districtNames, placeNames] = await Promise.all([
    supabase
      .from("marketplace_vendor_recruitment_queue")
      .select("*")
      .eq("module", module)
      .not("geo_state_id", "is", null)
      .order("recommended_vendor_count", { ascending: false })
      .limit(3),
    loadGeoNameMap("geo_states"),
    loadGeoNameMap("geo_districts"),
    loadGeoNameMap("geo_places"),
  ]);

  const targets = targetsRes.data || [];

  if (!targets.length) return null;

  const totalNeed = targets.reduce(
    (sum, row) => sum + Number(row.recommended_vendor_count || 0),
    0
  );

  return (
    <section
      style={{
        marginTop: 16,
        border: "1px solid #bbf7d0",
        borderRadius: 22,
        background: "linear-gradient(135deg,#ecfdf5,#f0f9ff)",
        padding: 16,
        boxShadow: "0 12px 30px rgba(15,23,42,0.06)",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 14,
          alignItems: "flex-start",
          justifyContent: "space-between",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 950,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#047857",
            }}
          >
            🚀 Vendor Opportunity
          </div>

          <h2
            style={{
              marginTop: 6,
              fontSize: 20,
              fontWeight: 950,
              color: "#064e3b",
            }}
          >
            {moduleLabel(module)} required in active demand areas
          </h2>

          <p
            style={{
              marginTop: 6,
              maxWidth: 760,
              fontSize: 13,
              fontWeight: 700,
              lineHeight: 1.6,
              color: "#334155",
            }}
          >
            Buyer demand is active in these locations. Verified vendors joining
            now may receive better visibility and local enquiries.
          </p>
        </div>

        <div
          style={{
            border: "1px solid #a7f3d0",
            borderRadius: 18,
            background: "#ffffff",
            padding: "10px 14px",
            minWidth: 140,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 900, color: "#64748b" }}>
            Suggested vendors
          </div>
          <div style={{ fontSize: 28, fontWeight: 950, color: "#065f46" }}>
            {totalNeed}
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 14,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
          gap: 10,
        }}
      >
        {targets.map((row) => {
          const district = geoName(districtNames, row.geo_district_id);
          const place = geoName(placeNames, row.geo_place_id);
          const state = geoName(stateNames, row.geo_state_id);

          return (
            <div
              key={row.id}
              style={{
                border: "1px solid #d1fae5",
                borderRadius: 18,
                background: "#ffffff",
                padding: 12,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 950, color: "#0f172a" }}>
                {place || district || state || "Active location"}
              </div>

              <div
                style={{
                  marginTop: 4,
                  fontSize: 12,
                  fontWeight: 750,
                  color: "#475569",
                }}
              >
                {[district, state].filter(Boolean).join(", ")}
              </div>

              <div
                style={{
                  marginTop: 8,
                  fontSize: 13,
                  fontWeight: 900,
                  color: "#047857",
                }}
              >
                Need {row.recommended_vendor_count} vendor
                {Number(row.recommended_vendor_count) > 1 ? "s" : ""}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link
          href="/onboarding/business"
          style={{
            borderRadius: 999,
            background: "#059669",
            color: "#ffffff",
            padding: "10px 14px",
            fontSize: 13,
            fontWeight: 900,
            textDecoration: "none",
          }}
        >
          Register as Vendor →
        </Link>

        <Link
          href="/vendor"
          style={{
            borderRadius: 999,
            border: "1px solid #a7f3d0",
            background: "#ffffff",
            color: "#047857",
            padding: "10px 14px",
            fontSize: 13,
            fontWeight: 900,
            textDecoration: "none",
          }}
        >
          View Vendor Benefits
        </Link>
      </div>
    </section>
  );
}
