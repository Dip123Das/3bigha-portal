import fs from "node:fs";

const types = fs.readFileSync(
  "lib/3bos/workspace/types.ts",
  "utf8"
);

const registry = fs.readFileSync(
  "lib/3bos/workspace/registry.ts",
  "utf8"
);

const requiredWorkspaces = [
  "customer",
  "property",
  "builder",
  "construction_business",
  "contractor",
  "material_business",
  "rental_business",
  "professional",
  "legal_professional",
  "banker",
  "financial_institution",
  "investment",
  "skilled_workforce",
  "transport_business",
  "agriculture_business",
  "government",
  "author",
  "multi_business",
];

const missing = requiredWorkspaces.filter(
  (key) => !registry.includes(`  ${key}: workspace({`)
);

if (missing.length) {
  console.error("Missing workspace definitions:", missing);
  process.exit(1);
}

const requiredExistingRoutes = [
  "/dashboard/buyer",
  "/property/my",
  "/property/builder/projects",
  "/dashboard/construction-projects",
  "/dashboard/vendor",
  "/materials/my",
  "/rentals/my",
  "/services/my",
  "/dashboard/banker",
  "/dashboard/investor",
  "/blog/my",
];

const missingRoutes = requiredExistingRoutes.filter(
  (route) => !registry.includes(route)
);

if (missingRoutes.length) {
  console.error(
    "Missing reviewed compatibility routes:",
    missingRoutes
  );
  process.exit(1);
}

if (!types.includes("WorkspaceLifecycleStatus")) {
  console.error("Workspace lifecycle status is missing.");
  process.exit(1);
}

console.log("Workspace registry source checks passed.");
