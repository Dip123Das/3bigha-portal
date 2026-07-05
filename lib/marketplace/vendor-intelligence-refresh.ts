import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type VendorRow = {
  user_id: string;
  business_type?: string | null;
  nature_of_business?: string[] | null;
  boost_priority?: number | null;
  subscription_status?: string | null;
  subscription_plan?: string | null;
  updated_at?: string | null;
};

type Patch = {
  reputation_score: number;
  authority_score: number;
  conversion_rate: number;
  response_rate: number;
  activity_score: number;
  demand_score: number;
  liquidity_score: number;
};

function clamp(value: unknown) {
  const n = typeof value === "number" ? value : Number(value || 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function emptyPatch(): Patch {
  return {
    reputation_score: 0,
    authority_score: 0,
    conversion_rate: 0,
    response_rate: 0,
    activity_score: 0,
    demand_score: 0,
    liquidity_score: 0,
  };
}

function mergePatch(
  map: Map<string, Patch>,
  userId: string,
  patch: Partial<Patch>,
) {
  const current = map.get(userId) || emptyPatch();
  map.set(userId, {
    ...current,
    ...Object.fromEntries(
      Object.entries(patch).map(([key, value]) => [key, clamp(value)]),
    ),
  });
}

function categoriesFor(vendor: VendorRow) {
  return [
    vendor.business_type,
    ...(Array.isArray(vendor.nature_of_business)
      ? vendor.nature_of_business
      : []),
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());
}

async function applyVendorControl(
  supabase: any,
  ids: string[],
  map: Map<string, Patch>,
) {
  try {
    const { data, error } = await supabase
      .from("vendor_control")
      .select("user_id,reputation_score,authority_score,activity_score")
      .in("user_id", ids);

    if (error || !Array.isArray(data)) return;

    for (const row of data) {
      mergePatch(map, row.user_id, {
        reputation_score: row.reputation_score,
        authority_score: row.authority_score,
        activity_score: row.activity_score,
      });
    }
  } catch {}
}

async function applyConversions(
  supabase: any,
  ids: string[],
  map: Map<string, Patch>,
) {
  try {
    const { data, error } = await supabase
      .from("vendor_conversion_events")
      .select("vendor_id,event_type,created_at")
      .in("vendor_id", ids)
      .limit(10000);

    if (error || !Array.isArray(data)) return;

    const stats = new Map<string, { events: number; strong: number }>();

    for (const row of data) {
      if (!row.vendor_id) continue;
      const current = stats.get(row.vendor_id) || { events: 0, strong: 0 };
      current.events += 1;

      if (
        [
          "registration_completed",
          "vendor_approved",
          "first_listing_created",
          "opportunity_clicked",
        ].includes(String(row.event_type || ""))
      ) {
        current.strong += 1;
      }

      stats.set(row.vendor_id, current);
    }

    for (const [vendorId, stat] of stats.entries()) {
      mergePatch(map, vendorId, {
        conversion_rate: stat.strong * 12 + stat.events * 2,
        activity_score: Math.max(
          map.get(vendorId)?.activity_score || 0,
          stat.events * 8,
        ),
      });
    }
  } catch {}
}

async function applyRfqIntelligence(
  supabase: any,
  ids: string[],
  map: Map<string, Patch>,
) {
  try {
    const { data, error } = await supabase
      .from("marketplace_rfq_intelligence")
      .select("response_rate,demand_score,activity_score")
      .limit(1000);

    if (error || !Array.isArray(data) || !data.length) return;

    const avgResponse =
      data.reduce((sum, row) => sum + Number(row.response_rate || 0), 0) /
      data.length;
    const avgDemand =
      data.reduce((sum, row) => sum + Number(row.demand_score || 0), 0) /
      data.length;
    const avgActivity =
      data.reduce((sum, row) => sum + Number(row.activity_score || 0), 0) /
      data.length;

    for (const id of ids) {
      mergePatch(map, id, {
        response_rate: avgResponse,
        demand_score: avgDemand,
        activity_score: Math.max(map.get(id)?.activity_score || 0, avgActivity),
      });
    }
  } catch {}
}

async function applyLiquidity(
  supabase: any,
  vendors: VendorRow[],
  map: Map<string, Patch>,
) {
  try {
    const categories = Array.from(new Set(vendors.flatMap(categoriesFor)));
    if (!categories.length) return;

    const { data, error } = await supabase
      .from("marketplace_liquidity_scores")
      .select("category,liquidity_score,demand_score")
      .in("category", categories)
      .limit(1000);

    if (error || !Array.isArray(data)) return;

    const byCategory = new Map<string, any>();
    for (const row of data) {
      if (row.category) byCategory.set(String(row.category).toLowerCase(), row);
    }

    for (const vendor of vendors) {
      const match = categoriesFor(vendor)
        .map((category) => byCategory.get(category))
        .find(Boolean);

      if (!match) continue;

      mergePatch(map, vendor.user_id, {
        liquidity_score: match.liquidity_score,
        demand_score: Math.max(
          map.get(vendor.user_id)?.demand_score || 0,
          match.demand_score || 0,
        ),
      });
    }
  } catch {}
}

function applyProfileDefaults(vendors: VendorRow[], map: Map<string, Patch>) {
  for (const vendor of vendors) {
    const boost = Number(vendor.boost_priority || 0);
    const subscription = vendor.subscription_status === "active" ? 10 : 0;
    const premium = vendor.subscription_plan === "premium" ? 10 : 0;

    mergePatch(map, vendor.user_id, {
      reputation_score: Math.max(
        map.get(vendor.user_id)?.reputation_score || 0,
        50 + subscription,
      ),
      authority_score: Math.max(
        map.get(vendor.user_id)?.authority_score || 0,
        40 + premium + boost,
      ),
      activity_score: Math.max(
        map.get(vendor.user_id)?.activity_score || 0,
        20 + boost,
      ),
    });
  }
}

export async function refreshVendorMarketplaceIntelligence() {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  const { data: vendors, error } = await supabase
    .from("business_profiles")
    .select(
      "user_id,business_type,nature_of_business,boost_priority,subscription_status,subscription_plan,updated_at",
    )
    .not("user_id", "is", null)
    .limit(5000);

  if (error) {
    return { ok: false, updated: 0, error: error.message };
  }

  const rows = ((vendors || []) as VendorRow[]).filter((row) => row.user_id);
  const ids = rows.map((row) => row.user_id);
  const map = new Map<string, Patch>();

  applyProfileDefaults(rows, map);

  await Promise.all([
    applyVendorControl(supabase, ids, map),
    applyConversions(supabase, ids, map),
    applyRfqIntelligence(supabase, ids, map),
    applyLiquidity(supabase, rows, map),
  ]);

  let updated = 0;

  for (const vendor of rows) {
    const patch = map.get(vendor.user_id) || emptyPatch();

    const { error: updateError } = await supabase
      .from("business_profiles")
      .update({
        ...patch,
        marketplace_intelligence_updated_at: now,
      })
      .eq("user_id", vendor.user_id);

    if (!updateError) updated += 1;
  }

  return {
    ok: true,
    scanned: rows.length,
    updated,
  };
}
