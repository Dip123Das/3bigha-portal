import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type ModuleConfig = {
  module: "materials" | "services" | "rentals" | "property";
  listingTable: string;
  vendorColumn: string;
};

const MODULES: ModuleConfig[] = [
  { module: "materials", listingTable: "material_listings", vendorColumn: "vendor_user_id" },
  { module: "services", listingTable: "provider_services", vendorColumn: "user_id" },
  { module: "rentals", listingTable: "rental_listings", vendorColumn: "vendor_user_id" },
  { module: "property", listingTable: "property_listings", vendorColumn: "user_id" },
];

type GeoKey = {
  geo_state_id: string | null;
  geo_district_id: string | null;
  geo_subdivision_id: string | null;
  geo_block_id: string | null;
  geo_place_id: string | null;
};

function keyOf(row: Partial<GeoKey>) {
  return [
    row.geo_state_id || "",
    row.geo_district_id || "",
    row.geo_subdivision_id || "",
    row.geo_block_id || "",
    row.geo_place_id || "",
  ].join("|");
}

function parseKey(key: string): GeoKey {
  const [geo_state_id, geo_district_id, geo_subdivision_id, geo_block_id, geo_place_id] =
    key.split("|");

  return {
    geo_state_id: geo_state_id || null,
    geo_district_id: geo_district_id || null,
    geo_subdivision_id: geo_subdivision_id || null,
    geo_block_id: geo_block_id || null,
    geo_place_id: geo_place_id || null,
  };
}

function liquidityLevel(score: number) {
  if (score >= 75) return "strong";
  if (score >= 50) return "active";
  if (score >= 25) return "thin";
  return "weak";
}

function zoneType(score: number, rfqs: number, vendors: number, listings: number) {
  if (rfqs >= 5 && vendors === 0) return "dead_zone";
  if (score >= 75) return "hot_zone";
  if (score >= 50) return "active_zone";
  if (vendors > 0 && listings === 0) return "activation_gap";
  return "watch";
}

function recommendation(level: string, zone: string) {
  if (zone === "dead_zone") return "Demand exists but vendor response capacity is weak. Recruit vendors immediately.";
  if (zone === "hot_zone") return "Marketplace liquidity is strong. Promote this area and expand nearby.";
  if (zone === "activation_gap") return "Vendors exist but listings are missing. Push vendors to create first listings.";
  if (level === "thin") return "Liquidity is thin. Increase vendor onboarding and listing creation.";
  if (level === "active") return "Marketplace is active. Continue recruitment and buyer acquisition.";
  return "Monitor marketplace liquidity.";
}

async function fetchRows(supabase: any, table: string, select: string) {
  const { data, error } = await supabase.from(table).select(select).limit(5000);
  if (error) return [];
  return data || [];
}

export async function refreshMarketplaceLiquidityScores() {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const payload: any[] = [];

  for (const config of MODULES) {
    const [listings, rfqs, activations] = await Promise.all([
      fetchRows(
        supabase,
        config.listingTable,
        `${config.vendorColumn},geo_state_id,geo_district_id,geo_subdivision_id,geo_block_id,geo_place_id`
      ),
      fetchRows(
        supabase,
        "rfqs",
        "id,module,geo_state_id,geo_district_id,geo_subdivision_id,geo_block_id,geo_place_id"
      ),
      fetchRows(
        supabase,
        "vendor_conversion_events",
        "event_type,module,geo_state_id,geo_district_id,geo_subdivision_id,geo_block_id,geo_place_id"
      ),
    ]);

    const map = new Map<
      string,
      {
        vendorIds: Set<string>;
        listing_count: number;
        rfq_count: number;
        activation_count: number;
      }
    >();

    const ensure = (key: string) => {
      const current =
        map.get(key) || {
          vendorIds: new Set<string>(),
          listing_count: 0,
          rfq_count: 0,
          activation_count: 0,
        };
      map.set(key, current);
      return current;
    };

    for (const listing of listings) {
      const key = keyOf(listing);
      if (!key.replaceAll("|", "")) continue;

      const current = ensure(key);
      current.listing_count += 1;

      const vendorId = listing?.[config.vendorColumn];
      if (vendorId) current.vendorIds.add(String(vendorId));
    }

    for (const rfq of rfqs) {
      if (String(rfq.module || "") !== config.module) continue;

      const key = keyOf(rfq);
      if (!key.replaceAll("|", "")) continue;

      ensure(key).rfq_count += 1;
    }

    for (const event of activations) {
      if (String(event.module || "") !== config.module) continue;
      if (event.event_type !== "first_listing_created" && event.event_type !== "vendor_approved") continue;

      const key = keyOf(event);
      if (!key.replaceAll("|", "")) continue;

      ensure(key).activation_count += 1;
    }

    for (const [key, value] of map.entries()) {
      const vendor_count = value.vendorIds.size;
      const listing_count = value.listing_count;
      const rfq_count = value.rfq_count;
      const activation_count = value.activation_count;

      const score = Math.min(
        100,
        Math.round(
          vendor_count * 25 +
            listing_count * 10 +
            rfq_count * 12 +
            activation_count * 18
        )
      );

      const level = liquidityLevel(score);
      const zone = zoneType(score, rfq_count, vendor_count, listing_count);

      payload.push({
        module: config.module,
        category: "all",
        ...parseKey(key),
        vendor_count,
        listing_count,
        rfq_count,
        activation_count,
        liquidity_score: score,
        liquidity_level: level,
        zone_type: zone,
        recommendation: recommendation(level, zone),
        source: "phase_7a_liquidity_engine",
        updated_at: now,
      });
    }
  }

  await supabase
    .from("marketplace_liquidity_scores")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (!payload.length) return { ok: true, inserted: 0 };

  const { error } = await supabase.from("marketplace_liquidity_scores").insert(payload);

  if (error) return { ok: false, inserted: 0, error: error.message };

  return { ok: true, inserted: payload.length };
}
