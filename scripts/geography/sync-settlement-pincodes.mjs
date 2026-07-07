import { getSupabase } from "./lgd-import-utils.mjs";

const supabase = getSupabase();

async function fetchAll(table, select, filters = {}) {
  let all = [];
  let from = 0;
  const size = 1000;

  while (true) {
    let q = supabase.from(table).select(select);
    for (const [k, v] of Object.entries(filters)) q = q.eq(k, v);

    const { data, error } = await q.range(from, from + size - 1);
    if (error) throw new Error(`${table} fetch failed: ${error.message}`);

    all = all.concat(data || []);
    if (!data || data.length < size) break;
    from += size;
  }

  return all;
}

console.log("Starting settlement PIN sync...");

const mappings = await fetchAll(
  "geo_settlement_postal",
  "settlement_key,pincode"
);

let settlementUpdated = 0;

for (const row of mappings.filter((r) => r.settlement_key && r.pincode)) {
  const { error } = await supabase
    .from("geo_lgd_settlements")
    .update({ pincode: row.pincode })
    .eq("settlement_key", row.settlement_key);

  if (error) throw new Error(`settlement update failed: ${error.message}`);
  settlementUpdated++;
}

console.log(`✅ Settlements synced: ${settlementUpdated}`);

const settlements = await fetchAll(
  "geo_lgd_settlements",
  "lgd_village_code,pincode"
);

let villageUpdated = 0;

for (const row of settlements.filter((r) => r.lgd_village_code && r.pincode)) {
  const { error } = await supabase
    .from("geo_lgd_villages")
    .update({ pincode: row.pincode })
    .eq("lgd_village_code", row.lgd_village_code);

  if (error) throw new Error(`village update failed: ${error.message}`);
  villageUpdated++;
}

console.log(`✅ Villages synced: ${villageUpdated}`);

const summaryRows = await fetchAll(
  "geo_lgd_settlements",
  "settlement_type,pincode"
);

const summary = {};
for (const row of summaryRows) {
  const type = row.settlement_type || "UNKNOWN";
  summary[type] ||= { total: 0, withPin: 0 };
  summary[type].total++;
  if (row.pincode) summary[type].withPin++;
}

console.table(summary);
console.log("✅ Settlement PIN sync complete.");
