import fs from "fs";
import { getSupabase } from "./lgd-import-utils.mjs";
import { spawnSync } from "child_process";

const supabase = getSupabase();
const progressFile = "data/lgd/logs/h1-settlement-intelligence-progress.json";

let done = new Set();

if (fs.existsSync(progressFile)) {
  const saved = JSON.parse(fs.readFileSync(progressFile, "utf8"));
  done = new Set(saved.doneDistrictCodes || []);
}

const { data, error } = await supabase
  .from("geo_lgd_districts")
  .select("lgd_district_code,name_en,lgd_state_code")
  .order("lgd_state_code", { ascending: true })
  .order("name_en", { ascending: true });

if (error) throw new Error(error.message);

for (const d of data || []) {
  const code = String(d.lgd_district_code);

  if (done.has(code)) {
    console.log(`SKIP ${code} ${d.name_en}`);
    continue;
  }

  console.log(`\n=== DISTRICT ${code}: ${d.name_en} ===`);

  const result = spawnSync(
    "node",
    ["scripts/geography/populate-settlement-intelligence-district.mjs", code],
    { stdio: "inherit", env: process.env }
  );

  if (result.status !== 0) {
    console.error(`FAILED district ${code}: ${d.name_en}`);
    process.exit(result.status || 1);
  }

  done.add(code);

  fs.mkdirSync("data/lgd/logs", { recursive: true });
  fs.writeFileSync(
    progressFile,
    JSON.stringify(
      {
        doneDistrictCodes: Array.from(done),
        lastDistrictCode: code,
        lastDistrictName: d.name_en,
        updatedAt: new Date().toISOString(),
      },
      null,
      2
    )
  );
}

console.log("\n✅ All district settlement intelligence complete.");
