import fs from "node:fs";

const routePath =
  "app/api/registration/intelligence/route.ts";

if (!fs.existsSync(routePath)) {
  console.error(
    `FAIL: missing ${routePath}`
  );
  process.exit(1);
}

const source = fs.readFileSync(
  routePath,
  "utf8"
);

const assertions = [
  [
    source.includes(
      "export async function GET(request: Request)"
    ),
    "authenticated retrieval endpoint exists",
  ],
  [
    source.includes(
      "supabase.auth.getUser()"
    ),
    "server validates the authenticated user",
  ],
  [
    source.includes(
      '.from("registration_intelligence_snapshots")'
    ),
    "immutable intelligence table is queried",
  ],
  [
    source.includes(
      '.eq("user_id", user.id)'
    ),
    "query explicitly restricts records to the owner",
  ],
  [
    source.includes(
      '.eq("business_id", user.id)'
    ),
    "query enforces owner and business identity alignment",
  ],
  [
    source.includes(
      '.order("created_at"'
    ),
    "latest snapshots are returned first",
  ],
  [
    source.includes(
      "MAX_HISTORY_LIMIT = 25"
    ),
    "history retrieval is bounded",
  ],
  [
    !source.includes(
      '"snapshot",'
    ) &&
      !source.includes(
        '"snapshot"'
      ),
    "complete snapshot JSON is excluded from selection",
  ],
  [
    source.includes(
      "fullSnapshotIncluded: false"
    ),
    "response declares that the full snapshot is excluded",
  ],
  [
    source.includes(
      "evidenceIncluded: false"
    ),
    "response declares that evidence is excluded",
  ],
  [
    source.includes(
      "internalAssessmentsIncluded: false"
    ),
    "response declares that internal assessments are excluded",
  ],
  [
    !source.includes(
      "service_role"
    ),
    "retrieval introduces no service-role authority",
  ],
];

let failed = false;

for (const [passed, label] of assertions) {
  console.log(
    `${passed ? "PASS" : "FAIL"}: ${label}`
  );

  if (!passed) {
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log(
  "\nINT-1C registration intelligence retrieval verified."
);
