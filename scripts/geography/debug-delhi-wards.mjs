import { readLgdRows } from "./lgd-import-utils.mjs";

const wardRows = readLgdRows("urban-local-body-wards", "delhi");

const wardCodes = new Set();

for (const row of wardRows) {
  const code =
    row.local_body_code ??
    row["Local Body Code"] ??
    row["Localbody Code"] ??
    row["Localbody code"];

  if (code) wardCodes.add(Number(code));
}

console.log("Ward file local body codes:");
console.log([...wardCodes].sort((a,b)=>a-b));
