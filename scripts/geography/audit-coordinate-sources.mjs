import fs from "fs";
import path from "path";

const ROOTS = [
  "data/geography",
  "data/lgd",
  "data/postal"
];

const hits = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const item of fs.readdirSync(dir)) {
    const p = path.join(dir, item);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p);
    else if (/\.(json|csv|txt|xls|xlsx)$/i.test(p)) hits.push(p);
  }
}

for (const r of ROOTS) walk(r);

console.log("Candidate files:");
for (const f of hits) console.log(f);

console.log("\nCoordinate keyword scan:");
for (const f of hits) {
  if (!/\.(json|csv|txt)$/i.test(f)) continue;

  const s = fs.readFileSync(f, "utf8").slice(0, 200000).toLowerCase();
  const hasCoord =
    s.includes("latitude") ||
    s.includes("longitude") ||
    s.includes('"lat"') ||
    s.includes('"lng"') ||
    s.includes("gps") ||
    s.includes("centroid");

  if (hasCoord) console.log("COORD?", f);
}
