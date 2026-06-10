require("dotenv").config({ path: ".env.local" });

const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let quoted = false;

  for (const ch of line) {
    if (ch === '"') quoted = !quoted;
    else if (ch === "," && !quoted) {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }

  out.push(cur.trim());
  return out;
}

function readCsv(filePath) {
  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const headers = parseCsvLine(lines[0]).map((h) => h.trim());

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((h, i) => [h, values[i] || ""]));
  });
}

async function findOne(table, column, value, extra = {}) {
  if (!value) return null;

  let q = supabase.from(table).select("*").eq(column, value).limit(1).maybeSingle();

  for (const [k, v] of Object.entries(extra)) {
    if (v) q = q.eq(k, v);
  }

  const { data, error } = await q;
  if (error) return null;
  return data;
}

async function upsertDistrict(state, district, sortOrder) {
  if (!state || !district) return null;

  const stateRow = await findOne("geo_states", "slug", slugify(state));
  if (!stateRow) {
    console.log("SKIP missing state:", state);
    return null;
  }

  const slug = slugify(district);
  const existing = await findOne("geo_districts", "slug", slug, {
    state_id: stateRow.id,
  });

  const payload = {
    state_id: stateRow.id,
    name: district,
    slug,
    is_active: true,
    sort_order: sortOrder,
  };

  if (existing?.id) {
    await supabase.from("geo_districts").update(payload).eq("id", existing.id);
    return existing.id;
  }

  const { data, error } = await supabase
    .from("geo_districts")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    console.log("DISTRICT INSERT FAILED:", district, error.message);
    return null;
  }

  return data.id;
}

async function upsertSubdivision(districtId, subdivision, sortOrder) {
  if (!districtId || !subdivision) return null;

  const slug = slugify(subdivision);
  const existing = await findOne("geo_subdivisions", "slug", slug, {
    district_id: districtId,
  });

  const payload = {
    district_id: districtId,
    name: subdivision,
    slug,
    subdivision_type: "subdivision",
    is_active: true,
    sort_order: sortOrder,
  };

  if (existing?.id) {
    await supabase.from("geo_subdivisions").update(payload).eq("id", existing.id);
    return existing.id;
  }

  const { data, error } = await supabase
    .from("geo_subdivisions")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    console.log("SUBDIVISION INSERT FAILED:", subdivision, error.message);
    return null;
  }

  return data.id;
}

async function upsertBlock(districtId, subdivisionId, block, sortOrder) {
  if (!districtId || !block) return null;

  const slug = slugify(block);
  const existing = await findOne("geo_blocks", "slug", slug, {
    district_id: districtId,
  });

  const payload = {
    district_id: districtId,
    subdivision_id: subdivisionId,
    name: block,
    slug,
    block_type: "block",
    is_active: true,
    sort_order: sortOrder,
  };

  if (existing?.id) {
    await supabase.from("geo_blocks").update(payload).eq("id", existing.id);
    return existing.id;
  }

  const { data, error } = await supabase
    .from("geo_blocks")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    console.log("BLOCK INSERT FAILED:", block, error.message);
    return null;
  }

  return data.id;
}

async function upsertPlace(districtId, subdivisionId, blockId, row, sortOrder) {
  const place = row.place;
  if (!districtId || !place) return null;

  const slug = slugify(place);
  const existing = await findOne("geo_places", "slug", slug, {
    district_id: districtId,
  });

  const payload = {
    district_id: districtId,
    subdivision_id: subdivisionId || null,
    block_id: blockId || null,
    name: place,
    slug,
    place_type: row.place_type || "locality",
    pincode: row.pincode || null,
    is_verified: true,
    is_active: true,
    sort_order: sortOrder,
    search_keywords: [
      slug,
      String(place).toLowerCase(),
      String(row.block || "").toLowerCase(),
      String(row.subdivision || "").toLowerCase(),
      String(row.district || "").toLowerCase(),
      String(row.state || "").toLowerCase(),
    ].filter(Boolean),
  };

  if (existing?.id) {
    await supabase.from("geo_places").update(payload).eq("id", existing.id);
    return existing.id;
  }

  const { data, error } = await supabase
    .from("geo_places")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    console.log("PLACE INSERT FAILED:", place, error.message);
    return null;
  }

  return data.id;
}

async function main() {
  const file = process.argv[2];

  if (!file) {
    console.log("Usage:");
    console.log("node scripts/geography/import-geography-csv.js data/geography/sample.csv");
    process.exit(1);
  }

  const rows = readCsv(file);

  let districtCount = 0;
  let subdivisionCount = 0;
  let blockCount = 0;
  let placeCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const sortOrder = (i + 1) * 10;

    const districtId = await upsertDistrict(row.state, row.district, sortOrder);
    if (districtId) districtCount++;

    const subdivisionId = await upsertSubdivision(
      districtId,
      row.subdivision,
      sortOrder
    );
    if (subdivisionId) subdivisionCount++;

    const blockId = await upsertBlock(
      districtId,
      subdivisionId,
      row.block,
      sortOrder
    );
    if (blockId) blockCount++;

    const placeId = await upsertPlace(
      districtId,
      subdivisionId,
      blockId,
      row,
      sortOrder
    );
    if (placeId) placeCount++;
  }

  console.log({
    rows: rows.length,
    districtCount,
    subdivisionCount,
    blockCount,
    placeCount,
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
