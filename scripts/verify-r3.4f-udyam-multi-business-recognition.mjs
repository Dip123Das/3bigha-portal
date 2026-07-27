import fs from "node:fs";

const route = fs.readFileSync(
  "app/api/ai/vendor-document-verify/route.ts",
  "utf8"
);

const intelligence = fs.readFileSync(
  "lib/registration/governmentDocumentIntelligence.ts",
  "utf8"
);

const assertions = [
  [
    route.includes(
      "An UDYAM registration may contain multiple businesses"
    ),
    "AI is explicitly told that UDYAM may contain multiple businesses",
  ],
  [
    route.includes(
      "Search the entire UDYAM certificate"
    ),
    "AI searches the complete certificate for the portal business",
  ],
  [
    route.includes(
      "businessRelationshipMatched"
    ),
    "business relationship is represented separately",
  ],
  [
    route.includes(
      '"listed_unit"'
    ),
    "listed UDYAM units are recognised",
  ],
  [
    route.includes(
      '"listed_business"'
    ),
    "listed UDYAM businesses are recognised",
  ],
  [
    route.includes(
      '"listed_brand"'
    ),
    "listed brands are recognised",
  ],
  [
    route.includes(
      '"listed_branch"'
    ),
    "listed branches are recognised",
  ],
  [
    route.includes(
      '"listed_trade_name"'
    ),
    "listed trade names are recognised",
  ],
  [
    route.includes(
      'document.documentType === "udyam"'
    ),
    "UDYAM receives the multi-business decision rule",
  ],
  [
    route.includes(
      "businessNameAccepted"
    ),
    "accepted business relationships govern the name review",
  ],
  [
    route.includes(
      "businessRelationshipMatched=true"
    ),
    "valid relationships are instructed as positive matches",
  ],
  [
    route.includes(
      "must not be described as a mismatch or warning"
    ),
    "valid enterprise-unit relationships do not create false warnings",
  ],
  [
    intelligence.includes(
      "unresolvedHardField"
    ),
    "soft business-name observations do not force manual review",
  ],
  [
    intelligence.includes(
      'return "verified_by_ai"'
    ),
    "successful autonomous decision remains available",
  ],
];

let failures = 0;

for (const [passed, label] of assertions) {
  console.log(
    `${passed ? "PASS" : "FAIL"}: ${label}`
  );

  if (!passed) failures += 1;
}

if (failures) {
  console.error(
    `${failures} R3.4F assertion(s) failed.`
  );
  process.exit(1);
}

console.log(
  "R3.4F UDYAM multi-business recognition assertions passed."
);
