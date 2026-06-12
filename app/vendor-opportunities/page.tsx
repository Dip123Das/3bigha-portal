import { createClient } from "@supabase/supabase-js";
import PublicVendorOpportunityCard from "@/components/marketplace/PublicVendorOpportunityCard";
import PublicVendorOpportunityHero from "@/components/marketplace/PublicVendorOpportunityHero";
import type { PublicOpportunityModule } from "@/components/marketplace/public-vendor-opportunity-utils";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

export const metadata = {
  title: "Become a Vendor on 3Bigha | Vendor Opportunities",
  description:
    "Discover public vendor opportunities on 3Bigha for suppliers, contractors, service providers, rental owners and property sellers.",
};

export default async function VendorOpportunitiesPage() {
  const [targetsRes, stateNames, districtNames, placeNames] = await Promise.all([
    supabase
      .from("marketplace_promotion_intelligence")
      .select(
        "id,module,category,promotion_score,promotion_type,shortage_score,geo_state_id,geo_district_id,geo_place_id"
      )
      .in("module", ["property", "materials", "services", "rentals"])
      .order("promotion_rank", { ascending: true })
      .limit(24),
    loadGeoNameMap("geo_states"),
    loadGeoNameMap("geo_districts"),
    loadGeoNameMap("geo_places"),
  ]);

  const targets = (targetsRes.data || []).filter(
    (row) => Number(row.shortage_score || 0) > 0
  );

  return (
    <main style={{ padding: "22px 14px 46px", background: "#f8fafc", minHeight: "100vh" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <PublicVendorOpportunityHero />

        <section id="opportunities" style={{ marginTop: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 950,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "#047857",
                }}
              >
                Public Vendor Opportunities
              </div>

              <h2 style={{ marginTop: 6, fontSize: 28, fontWeight: 950, color: "#0f172a" }}>
                Join where buyers already need vendors
              </h2>

              <p style={{ marginTop: 6, maxWidth: 760, fontSize: 14, lineHeight: 1.7, fontWeight: 700, color: "#475569" }}>
                These opportunities are generated from marketplace demand areas. Internal scores and admin intelligence remain private.
              </p>
            </div>
          </div>

          {targets.length ? (
            <div
              style={{
                marginTop: 18,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))",
                gap: 14,
              }}
            >
              {targets.map((row) => {
                const district = geoName(districtNames, row.geo_district_id);
                const place = geoName(placeNames, row.geo_place_id);
                const state = geoName(stateNames, row.geo_state_id);

                return (
                  <PublicVendorOpportunityCard
                    key={row.id}
                    module={row.module as PublicOpportunityModule}
                    category={row.category}
                    location={place || district || state || "Active location"}
                    district={district}
                    state={state}
                    vendorsNeeded={Math.max(1, Math.round(Number(row.shortage_score || 0) / 10))}
                    priority={
                      row.promotion_type === "featured"
                        ? "critical"
                        : row.promotion_type === "promoted"
                        ? "high"
                        : "medium"
                    }
                    promotionType={row.promotion_type}
                    promotionScore={row.promotion_score}
                  />
                );
              })}
            </div>
          ) : (
            <div
              style={{
                marginTop: 18,
                border: "1px solid #e2e8f0",
                borderRadius: 22,
                background: "#ffffff",
                padding: 18,
                fontSize: 14,
                fontWeight: 800,
                color: "#475569",
              }}
            >
              No public vendor opportunities are available right now. Please check again soon.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
