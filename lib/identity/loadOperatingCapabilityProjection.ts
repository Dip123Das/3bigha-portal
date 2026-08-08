import type { SupabaseClient } from "@supabase/supabase-js";

export type OperatingCapabilityProjection = {
  capabilityKeys: string[];
  groups: Record<string, string[]>;
  defaultPaths: Record<string, string>;
};

type MappingRow = {
  identity_key: string;
  capability_key: string;
  sort_order: number;
  is_active: boolean;
};

type CapabilityRow = {
  capability_key: string;
  capability_group: string;
  default_path: string | null;
  sort_order: number;
  is_active: boolean;
};

function cleanKeys(values: unknown): string[] {
  if (!Array.isArray(values)) return [];

  return Array.from(
    new Set(
      values
        .map((value) => String(value || "").trim())
        .filter(Boolean)
    )
  );
}

export async function loadOperatingCapabilityProjection(
  supabase: SupabaseClient,
  identityKeys: unknown
): Promise<OperatingCapabilityProjection> {
  const keys = cleanKeys(identityKeys);

  if (!keys.length) {
    return {
      capabilityKeys: [],
      groups: {},
      defaultPaths: {},
    };
  }

  const { data: mappingData, error: mappingError } =
    await supabase
      .from("identity_bos_operating_capabilities")
      .select(
        "identity_key,capability_key,sort_order,is_active"
      )
      .in("identity_key", keys)
      .eq("is_active", true)
      .order("sort_order");

  if (mappingError) {
    throw new Error(
      `3BOS operating capability mapping lookup failed: ${mappingError.message}`
    );
  }

  const mappings = (mappingData || []) as MappingRow[];
  const capabilityKeys = Array.from(
    new Set(
      mappings
        .map((row) => row.capability_key)
        .filter(Boolean)
    )
  );

  if (!capabilityKeys.length) {
    return {
      capabilityKeys: [],
      groups: {},
      defaultPaths: {},
    };
  }

  const { data: capabilityData, error: capabilityError } =
    await supabase
      .from("bos_operating_capabilities")
      .select(
        "capability_key,capability_group,default_path,sort_order,is_active"
      )
      .in("capability_key", capabilityKeys)
      .eq("is_active", true)
      .order("sort_order");

  if (capabilityError) {
    throw new Error(
      `3BOS operating capability catalogue lookup failed: ${capabilityError.message}`
    );
  }

  const groups: Record<string, string[]> = {};
  const defaultPaths: Record<string, string> = {};
  const activeKeys: string[] = [];

  for (const row of (capabilityData || []) as CapabilityRow[]) {
    const key = String(row.capability_key || "").trim();
    const group = String(row.capability_group || "").trim();

    if (!key || !group) continue;

    activeKeys.push(key);
    groups[group] = groups[group] || [];
    groups[group].push(key);

    const path = String(row.default_path || "").trim();
    if (path) defaultPaths[key] = path;
  }

  return {
    capabilityKeys: Array.from(new Set(activeKeys)),
    groups,
    defaultPaths,
  };
}
