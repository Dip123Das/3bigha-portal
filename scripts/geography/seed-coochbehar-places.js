require("dotenv").config({ path: ".env.local" });

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

const places = [
  ["Cooch Behar Town", "cooch-behar-i", "town", "736101"],
  ["Khagrabari", "cooch-behar-ii", "locality", "736179"],
  ["Mahishbathan", "cooch-behar-ii", "village", "736179"],
  ["Battala", "cooch-behar-ii", "locality", "736179"],
  ["Pilkhana", "cooch-behar-i", "locality", "736101"],
  ["New Town", "cooch-behar-i", "locality", "736101"],
  ["Rail Ghumti", "cooch-behar-i", "locality", "736101"],
  ["Dinhata Road", "cooch-behar-i", "locality", "736101"],
  ["Baneswar", "cooch-behar-ii", "locality", "736133"],
  ["Pundibari", "cooch-behar-ii", "locality", "736165"],
  ["Gopalpur", "cooch-behar-ii", "village", "736165"],
  ["Dewanhat", "cooch-behar-i", "locality", "736134"],
  ["Guriahati", "cooch-behar-i", "locality", "736170"],
  ["Haribhanga", "cooch-behar-i", "village", "736101"],
  ["Tufanganj", "tufanganj-i", "town", "736159"],
  ["Natabari", "tufanganj-i", "locality", "736159"],
  ["Balabhut", "tufanganj-i", "village", "736159"],
  ["Andaran Fulbari", "tufanganj-i", "village", "736159"],
  ["Balarampur", "tufanganj-i", "village", "736159"],
  ["Boxirhat", "tufanganj-ii", "town", "736131"],
  ["Barokodali", "tufanganj-ii", "village", "736159"],
  ["Dinhata", "dinhata-i", "town", "736135"],
  ["Gosanimari", "dinhata-i", "village", "736145"],
  ["Bhetaguri", "dinhata-i", "village", "736134"],
  ["Sahebganj", "dinhata-ii", "locality", "736176"],
  ["Chowdhurihat", "dinhata-ii", "locality", "736135"],
  ["Sitai", "sitai", "town", "736167"],
  ["Sitalkuchi", "sitalkuchi", "town", "736158"],
  ["Mathabhanga", "mathabhanga-i", "town", "736146"],
  ["Ghoksadanga", "mathabhanga-ii", "locality", "736171"],
  ["Nishiganj", "mathabhanga-ii", "locality", "736157"],
  ["Mekhliganj", "mekhliganj", "town", "735304"],
  ["Changrabandha", "mekhliganj", "locality", "735301"],
  ["Haldibari", "haldibari", "town", "735122"],
  ["Kuchlibari", "mekhliganj", "village", "735304"],
];

async function getDistrict() {
  const { data, error } = await supabase
    .from("geo_districts")
    .select("id")
    .eq("slug", "cooch-behar")
    .maybeSingle();

  if (error || !data) throw new Error("Cooch Behar district not found");
  return data.id;
}

async function getBlockMap() {
  const { data, error } = await supabase
    .from("geo_blocks")
    .select("id,slug,subdivision_id")
    .eq("district_id", await getDistrict());

  if (error) throw error;

  return Object.fromEntries(
    (data || []).map((row) => [
      row.slug,
      { id: row.id, subdivision_id: row.subdivision_id },
    ])
  );
}

async function main() {
  const districtId = await getDistrict();
  const blockMap = await getBlockMap();

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (let i = 0; i < places.length; i++) {
    const [name, blockSlug, placeType, pincode] = places[i];
    const slug = slugify(name);
    const block = blockMap[blockSlug];

    if (!block) {
      console.log("SKIP missing block:", name, blockSlug);
      skipped++;
      continue;
    }

    const payload = {
      district_id: districtId,
      subdivision_id: block.subdivision_id,
      block_id: block.id,
      name,
      slug,
      place_type: placeType,
      pincode,
      is_verified: true,
      is_active: true,
      sort_order: (i + 1) * 10,
      search_keywords: [
        slug,
        name.toLowerCase(),
        "cooch behar",
        "west bengal",
        blockSlug,
      ],
    };

    const { data: existing } = await supabase
      .from("geo_places")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await supabase
        .from("geo_places")
        .update(payload)
        .eq("id", existing.id);

      if (error) {
        console.log("UPDATE FAILED:", name, error.message);
        skipped++;
      } else {
        updated++;
        console.log("Updated:", name);
      }
    } else {
      const { error } = await supabase.from("geo_places").insert(payload);

      if (error) {
        console.log("INSERT FAILED:", name, error.message);
        skipped++;
      } else {
        inserted++;
        console.log("Inserted:", name);
      }
    }
  }

  console.log({ inserted, updated, skipped });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
