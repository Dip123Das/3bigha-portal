require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function normalize(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, " ");
}

function slugify(value) {
  return normalize(value).replace(/\s+/g, "-");
}

async function findOne(table, value) {
  const clean = normalize(value);
  const slug = slugify(value);

  if (!clean) return null;

  const { data, error } = await supabase
    .from(table)
    .select("id,name,slug")
    .or(`slug.eq.${slug},name.ilike.${clean}`)
    .limit(1)
    .maybeSingle();

  if (error) return null;
  return data || null;
}

async function resolve(input) {
  const state = await findOne("geo_states", input.state);
  const district = await findOne("geo_districts", input.district);

  const subdivision = await findOne("geo_subdivisions", input.subdivision);
  const block = await findOne("geo_blocks", input.block);

  const placeCandidate =
    input.place ||
    input.locality ||
    input.sub_locality ||
    input.village ||
    input.city ||
    input.location ||
    input.address;

  const place = await findOne("geo_places", placeCandidate);

  return {
    geo_state_id: state?.id || null,
    geo_district_id: district?.id || null,
    geo_subdivision_id: subdivision?.id || null,
    geo_block_id: block?.id || null,
    geo_place_id: place?.id || null,
    matched: {
      state: state?.name || null,
      district: district?.name || null,
      subdivision: subdivision?.name || null,
      block: block?.name || null,
      place: place?.name || null,
    },
  };
}

function readInput(table, row) {
  if (table === "property_listings") {
    return {
      state: row.state,
      district: row.district,
      city: row.city,
      locality: row.locality,
      sub_locality: row.sub_locality,
      address: row.address_text || row.street_address,
      pincode: row.postal_code,
    };
  }

  if (table === "material_listings") {
    const serviceArea = row.attributes?.service_area;

    return {
      state: "West Bengal",
      district: serviceArea,
      city: serviceArea,
      locality: serviceArea,
      address: serviceArea,
      pincode: row.attributes?.pincode,
    };
  }

  if (table === "service_listings") {
    return {
      state: row.state,
      district: row.district,
      city: row.city,
      locality: row.locality,
      pincode: row.pincode,
    };
  }

  if (table === "rental_listings") {
    return {
      state: row.state,
      district: row.district,
      city: row.city,
      locality: row.locality,
      pincode: row.pincode,
    };
  }

  if (table === "business_profiles") {
    return {
      state: row.state || row.verified_state,
      district: row.district || row.verified_district,
      city: row.city,
      locality: row.locality || row.verified_locality || row.address_line2,
      address: [row.address_line1, row.address_line2].filter(Boolean).join(", "),
      pincode: row.pincode || row.verified_postcode,
    };
  }

  return {};
}

async function backfillTable(table, idColumn = "id") {
  console.log(`\n===== ${table} =====`);

  const { data, error } = await supabase
    .from(table)
    .select("*")
    .is("geo_state_id", null)
    .limit(500);

  if (error) {
    console.error("Read error:", error.message);
    return;
  }

  console.log(`Rows to inspect: ${data.length}`);

  let updated = 0;
  let skipped = 0;

  for (const row of data) {
    const input = readInput(table, row);
    const resolved = await resolve(input);

    const patch = {
      geo_state_id: resolved.geo_state_id,
      geo_district_id: resolved.geo_district_id,
      geo_subdivision_id: resolved.geo_subdivision_id,
      geo_block_id: resolved.geo_block_id,
      geo_place_id: resolved.geo_place_id,
    };

    const hasAnyGeo = Object.values(patch).some(Boolean);

    if (!hasAnyGeo) {
      skipped++;
      continue;
    }

    const rowId = row[idColumn];

    const { error: updateError } = await supabase
      .from(table)
      .update(patch)
      .eq(idColumn, rowId);

    if (updateError) {
      console.error(`Update failed ${table} ${rowId}:`, updateError.message);
      skipped++;
      continue;
    }

    updated++;
    console.log(`Updated ${table} ${rowId}`, resolved.matched);
  }

  console.log(`Done ${table}: updated=${updated}, skipped=${skipped}`);
}

async function main() {
  await backfillTable("property_listings", "id");
  await backfillTable("material_listings", "id");
  await backfillTable("service_listings", "id");
  await backfillTable("rental_listings", "id");
  await backfillTable("business_profiles", "user_id");
}

main()
  .then(() => {
    console.log("\nMarketplace geography backfill complete.");
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
