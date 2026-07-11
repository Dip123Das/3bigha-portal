import fs from "node:fs";

const source = fs.readFileSync(
  "lib/3bos/identity/compatibility.ts",
  "utf8"
);

const requiredTerms = [
  "resolveLegacyIdentitySuggestions",
  "getPrimaryLegacyIdentitySuggestion",
  "material_business",
  "rental_business",
  "property_owner",
  "builder",
  "author",
  "investor",
  "professional",
  "contractor",
  "skilled_workforce",
];

const missing = requiredTerms.filter((term) => !source.includes(term));

if (missing.length > 0) {
  console.error("Missing required compatibility terms:", missing);
  process.exit(1);
}

if (
  source.includes('role === "vendor") {\n    addSuggestion') ||
  source.includes('role === "hub_vendor") {\n    addSuggestion')
) {
  console.error(
    "Legacy vendor roles must not directly assign a human identity."
  );
  process.exit(1);
}

console.log("Identity compatibility source checks passed.");
