import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const material = fs.readFileSync(
  path.join(root, "app/materials/add/page.tsx"),
  "utf8"
);
const builder = fs.readFileSync(
  path.join(
    root,
    "app/property/builder/projects/[projectId]/units/add/page.tsx"
  ),
  "utf8"
);
const register = fs.readFileSync(
  path.join(root, "app/dashboard/cost-register/page.tsx"),
  "utf8"
);
const panel = fs.readFileSync(
  path.join(
    root,
    "components/cost-execution/FinishedOutputHandoffPanel.tsx"
  ),
  "utf8"
);
const helper = fs.readFileSync(
  path.join(root, "lib/cost-execution/handoff-prefill.ts"),
  "utf8"
);

function check(condition, message) {
  if (!condition) throw new Error(message);
}

check(
  register.includes("FinishedOutputHandoffPanel") &&
    register.includes("bos_cost_outputs"),
  "Cost Register must load and present finished outputs."
);

check(
  panel.includes("output_name") &&
    panel.includes("target_inventory_type"),
  "Finished-output panel must use the actual COST-01A output schema."
);

for (const marker of [
  "loadCostInventoryHandoff",
  "confirmCostInventoryHandoff",
]) {
  check(helper.includes(marker), `Handoff helper missing: ${marker}`);
}

check(
  material.includes("loadCostInventoryHandoff") &&
    material.includes('"seller_material_inventory"'),
  "Materials add form must consume seller-inventory handoff context."
);

check(
  material.includes("confirmCostInventoryHandoff") &&
    material.includes("createdMaterial.id"),
  "Materials add form must confirm only after the listing is created."
);

check(
  builder.includes("loadCostInventoryHandoff") &&
    builder.includes('"builder_property_unit_inventory"'),
  "Builder unit wizard must consume builder handoff context."
);

check(
  builder.includes("confirmCostInventoryHandoff") &&
    builder.includes("createdUnitIds"),
  "Builder wizard must confirm the handoff only after units are created."
);

check(
  material.includes('status: "draft"'),
  "Finished production transfer must not auto-publish the material listing."
);

console.log(
  "COST-01E.2 destination integration assertions passed."
);
