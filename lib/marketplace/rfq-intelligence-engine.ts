import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type GeoKey = {
  geo_state_id: string | null;
  geo_district_id: string | null;
  geo_subdivision_id: string | null;
  geo_block_id: string | null;
  geo_place_id: string | null;
};

type RfqRow = GeoKey & {
  id: string;
  module: string | null;
  status?: string | null;
  created_at?: string | null;
};

type MessageRow = {
  id: string;
  rfq_id?: string | null;
  sender_role?: string | null;
  created_at?: string | null;
};

function keyOf(row: Partial<GeoKey> & { module?: string | null }) {
  return [
    row.module || "unknown",
    row.geo_state_id || "",
    row.geo_district_id || "",
    row.geo_subdivision_id || "",
    row.geo_block_id || "",
    row.geo_place_id || "",
  ].join("|");
}

function parseKey(key: string) {
  const [module, geo_state_id, geo_district_id, geo_subdivision_id, geo_block_id, geo_place_id] =
    key.split("|");

  return {
    module,
    geo_state_id: geo_state_id || null,
    geo_district_id: geo_district_id || null,
    geo_subdivision_id: geo_subdivision_id || null,
    geo_block_id: geo_block_id || null,
    geo_place_id: geo_place_id || null,
  };
}

function scoreDemand(rfqCount: number, responseCount: number, failureCount: number) {
  return Math.min(
    100,
    Math.round(rfqCount * 18 + responseCount * 12 + failureCount * 22)
  );
}

function statusFor(rfqCount: number, responseCount: number, failureCount: number) {
  if (rfqCount >= 3 && responseCount === 0) return "vendor_shortage";
  if (failureCount > responseCount) return "response_gap";
  if (responseCount >= rfqCount && rfqCount > 0) return "healthy";
  return "active";
}

async function fetchMessagesSafely(supabase: any) {
  const possibleTables = ["rfq_messages", "conversation_messages", "messages"];

  for (const table of possibleTables) {
    const { data, error } = await supabase
      .from(table)
      .select("id,rfq_id,sender_role,created_at")
      .limit(10000);

    if (!error && Array.isArray(data)) {
      return data as MessageRow[];
    }
  }

  return [] as MessageRow[];
}

export async function refreshMarketplaceRfqIntelligence() {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  const { data: rfqRows, error: rfqError } = await supabase
    .from("rfqs")
    .select("id,module,status,created_at,geo_state_id,geo_district_id,geo_subdivision_id,geo_block_id,geo_place_id")
    .limit(10000);

  if (rfqError) {
    return { ok: false, inserted: 0, failures: 0, error: rfqError.message };
  }

  const messages = await fetchMessagesSafely(supabase);

  const responseRfqIds = new Set(
    messages
      .filter((message) => String(message.sender_role || "").toLowerCase() === "vendor")
      .map((message) => String(message.rfq_id || ""))
      .filter(Boolean)
  );

  const map = new Map<
    string,
    {
      rfqIds: Set<string>;
      responseIds: Set<string>;
      failureIds: Set<string>;
    }
  >();

  const ensure = (key: string) => {
    const current =
      map.get(key) || {
        rfqIds: new Set<string>(),
        responseIds: new Set<string>(),
        failureIds: new Set<string>(),
      };

    map.set(key, current);
    return current;
  };

  const failurePayload: any[] = [];

  for (const rfq of ((rfqRows || []) as RfqRow[])) {
    if (!rfq.module) continue;

    const key = keyOf(rfq);
    if (!key.replaceAll("|", "").replace("unknown", "")) continue;

    const current = ensure(key);
    current.rfqIds.add(rfq.id);

    if (responseRfqIds.has(rfq.id)) {
      current.responseIds.add(rfq.id);
    } else {
      current.failureIds.add(rfq.id);

      failurePayload.push({
        rfq_id: rfq.id,
        module: rfq.module,
        geo_state_id: rfq.geo_state_id,
        geo_district_id: rfq.geo_district_id,
        geo_subdivision_id: rfq.geo_subdivision_id,
        geo_block_id: rfq.geo_block_id,
        geo_place_id: rfq.geo_place_id,
        failure_reason: "No vendor response detected yet.",
        severity: "medium",
      });
    }
  }

  const intelligencePayload = Array.from(map.entries()).map(([key, value]) => {
    const parsed = parseKey(key);
    const rfqCount = value.rfqIds.size;
    const responseCount = value.responseIds.size;
    const failureCount = value.failureIds.size;
    const responseRate =
      rfqCount > 0 ? Math.round((responseCount / rfqCount) * 100) : 0;

    return {
      module: parsed.module,
      category: "all",
      geo_state_id: parsed.geo_state_id,
      geo_district_id: parsed.geo_district_id,
      geo_subdivision_id: parsed.geo_subdivision_id,
      geo_block_id: parsed.geo_block_id,
      geo_place_id: parsed.geo_place_id,
      rfq_count: rfqCount,
      response_count: responseCount,
      failure_count: failureCount,
      response_rate: responseRate,
      demand_score: scoreDemand(rfqCount, responseCount, failureCount),
      status: statusFor(rfqCount, responseCount, failureCount),
      updated_at: now,
    };
  });

  await supabase
    .from("marketplace_rfq_intelligence")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  await supabase
    .from("marketplace_rfq_failure_signals")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (intelligencePayload.length) {
    const { error } = await supabase
      .from("marketplace_rfq_intelligence")
      .insert(intelligencePayload);

    if (error) {
      return { ok: false, inserted: 0, failures: 0, error: error.message };
    }
  }

  if (failurePayload.length) {
    const { error } = await supabase
      .from("marketplace_rfq_failure_signals")
      .insert(failurePayload.slice(0, 1000));

    if (error) {
      return {
        ok: false,
        inserted: intelligencePayload.length,
        failures: 0,
        error: error.message,
      };
    }
  }

  return {
    ok: true,
    inserted: intelligencePayload.length,
    failures: failurePayload.length,
  };
}
