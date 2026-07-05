type SupabaseLike = {
  from: (table: string) => any;
};

type VendorLike = {
  user_id?: string | null;
  business_type?: string | null;
  nature_of_business?: string[] | null;
  reputation_score?: number | string | null;
  authority_score?: number | string | null;
  conversion_rate?: number | string | null;
  response_rate?: number | string | null;
  activity_score?: number | string | null;
  demand_score?: number | string | null;
  liquidity_score?: number | string | null;
};

type IntelligencePatch = {
  reputation_score?: number;
  authority_score?: number;
  conversion_rate?: number;
  response_rate?: number;
  activity_score?: number;
  demand_score?: number;
  liquidity_score?: number;
};

function clampScore(value: unknown, max = 100): number {
  const parsed = typeof value === "number" ? value : Number(value || 0);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(max, parsed));
}

function idsFromVendors(vendors: VendorLike[]) {
  return Array.from(
    new Set(
      vendors
        .map((vendor) => vendor.user_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );
}

function mergePatch(
  patches: Map<string, IntelligencePatch>,
  userId: string | null | undefined,
  patch: IntelligencePatch,
) {
  if (!userId) return;
  patches.set(userId, { ...(patches.get(userId) || {}), ...patch });
}

async function applyVendorControlScores(
  supabase: SupabaseLike,
  ids: string[],
  patches: Map<string, IntelligencePatch>,
) {
  try {
    const { data, error } = await supabase
      .from("vendor_control")
      .select("user_id,reputation_score,authority_score,activity_score")
      .in("user_id", ids);

    if (error || !Array.isArray(data)) return;

    for (const row of data) {
      mergePatch(patches, row.user_id, {
        reputation_score: clampScore(row.reputation_score),
        authority_score: clampScore(row.authority_score),
        activity_score: clampScore(row.activity_score),
      });
    }
  } catch {
    // Optional table/columns may not exist in all environments.
  }
}

async function applyConversionScores(
  supabase: SupabaseLike,
  ids: string[],
  patches: Map<string, IntelligencePatch>,
) {
  try {
    const { data, error } = await supabase
      .from("vendor_conversion_events")
      .select("vendor_id,event_type,created_at")
      .in("vendor_id", ids)
      .limit(5000);

    if (error || !Array.isArray(data)) return;

    const stats = new Map<string, { events: number; strong: number }>();

    for (const row of data) {
      const vendorId = row.vendor_id;
      if (!vendorId) continue;

      const current = stats.get(vendorId) || { events: 0, strong: 0 };
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

      stats.set(vendorId, current);
    }

    for (const [vendorId, stat] of stats.entries()) {
      mergePatch(patches, vendorId, {
        conversion_rate: clampScore(stat.strong * 12 + stat.events * 2),
        activity_score: clampScore(stat.events * 8),
      });
    }
  } catch {
    // Optional table/columns may not exist in all environments.
  }
}

async function applyRfqIntelligenceScores(
  supabase: SupabaseLike,
  ids: string[],
  patches: Map<string, IntelligencePatch>,
) {
  try {
    const { data, error } = await supabase
      .from("marketplace_rfq_intelligence")
      .select("vendor_id,response_rate,demand_score,activity_score")
      .in("vendor_id", ids);

    if (error || !Array.isArray(data)) return;

    for (const row of data) {
      mergePatch(patches, row.vendor_id, {
        response_rate: clampScore(row.response_rate),
        demand_score: clampScore(row.demand_score),
        activity_score: clampScore(row.activity_score),
      });
    }
  } catch {
    // Optional table/columns may not exist in all environments.
  }
}

async function applyLiquidityScores(
  supabase: SupabaseLike,
  vendors: VendorLike[],
  patches: Map<string, IntelligencePatch>,
) {
  try {
    const categories = Array.from(
      new Set(
        vendors
          .flatMap((vendor) => [
            vendor.business_type,
            ...(Array.isArray(vendor.nature_of_business)
              ? vendor.nature_of_business
              : []),
          ])
          .filter((value): value is string => Boolean(value)),
      ),
    );

    if (!categories.length) return;

    const { data, error } = await supabase
      .from("marketplace_liquidity_scores")
      .select("category,liquidity_score,demand_score")
      .in("category", categories)
      .limit(1000);

    if (error || !Array.isArray(data)) return;

    const byCategory = new Map<string, IntelligencePatch>();
    for (const row of data) {
      if (!row.category) continue;
      byCategory.set(String(row.category).toLowerCase(), {
        liquidity_score: clampScore(row.liquidity_score),
        demand_score: clampScore(row.demand_score),
      });
    }

    for (const vendor of vendors) {
      const vendorCategories = [
        vendor.business_type,
        ...(Array.isArray(vendor.nature_of_business)
          ? vendor.nature_of_business
          : []),
      ]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());

      const match = vendorCategories
        .map((category) => byCategory.get(category))
        .find(Boolean);

      if (match) mergePatch(patches, vendor.user_id, match);
    }
  } catch {
    // Optional table/columns may not exist in all environments.
  }
}

export async function enrichVendorMarketplaceIntelligence<T extends VendorLike>(
  supabase: SupabaseLike,
  vendors: T[],
): Promise<T[]> {
  if (!vendors.length) return vendors;

  const ids = idsFromVendors(vendors);
  if (!ids.length) return vendors;

  const patches = new Map<string, IntelligencePatch>();

  await Promise.all([
    applyVendorControlScores(supabase, ids, patches),
    applyConversionScores(supabase, ids, patches),
    applyRfqIntelligenceScores(supabase, ids, patches),
    applyLiquidityScores(supabase, vendors, patches),
  ]);

  return vendors.map((vendor) => {
    const patch = patches.get(String(vendor.user_id || "")) || {};

    return {
      ...vendor,
      reputation_score: patch.reputation_score ?? vendor.reputation_score ?? 0,
      authority_score: patch.authority_score ?? vendor.authority_score ?? 0,
      conversion_rate: patch.conversion_rate ?? vendor.conversion_rate ?? 0,
      response_rate: patch.response_rate ?? vendor.response_rate ?? 0,
      activity_score: patch.activity_score ?? vendor.activity_score ?? 0,
      demand_score: patch.demand_score ?? vendor.demand_score ?? 0,
      liquidity_score: patch.liquidity_score ?? vendor.liquidity_score ?? 0,
    };
  });
}
