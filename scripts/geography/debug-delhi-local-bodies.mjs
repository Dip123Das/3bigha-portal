import { readLgdRows } from "./lgd-import-utils.mjs";

for (const folder of ["urban-local-bodies", "urban-local-body-wards", "urban-local-body-wards-covered"]) {
  console.log("\nFOLDER:", folder);
  const rows = readLgdRows(folder, "delhi");

  for (const row of rows) {
    const text = JSON.stringify(row);
    if (text.includes("276403")) {
      console.log(row);
    }
  }
}
