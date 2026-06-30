import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type SettlementCoordinate = {
  settlement_key: string;
  latitude: number;
  longitude: number;
  source: string;
  confidence: number;
};

export async function getSettlementCoordinates(
  settlementKey: string
): Promise<SettlementCoordinate | null> {
  const { data, error } = await supabase
    .from("geo_settlement_coordinates")
    .select(
      "settlement_key,latitude,longitude,source,confidence"
    )
    .eq("settlement_key", settlementKey)
    .maybeSingle();

  if (error || !data) return null;

  return {
    settlement_key: data.settlement_key,
    latitude: Number(data.latitude),
    longitude: Number(data.longitude),
    source: data.source,
    confidence: Number(data.confidence),
  };
}

export function hasCoordinates(
  value: Partial<SettlementCoordinate> | null | undefined
) {
  return !!(
    value &&
    Number.isFinite(Number(value.latitude)) &&
    Number.isFinite(Number(value.longitude))
  );
}
