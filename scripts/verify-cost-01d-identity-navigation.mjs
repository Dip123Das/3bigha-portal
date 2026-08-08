import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const hookPath = path.join(
  root,
  "lib/identity/useMemberOperatingCapabilityProjection.ts"
);
const panelPath = path.join(
  root,
  "components/cost-execution/OperatingCostWorkspacePanel.tsx"
);
const gatePath = path.join(
  root,
  "components/cost-execution/CostRegisterCapabilityGate.tsx"
);
const workspacePath = path.join(
  root,
  "app/dashboard/workspace/page.tsx"
);
const costRegisterPath = path.join(
  root,
  "app/dashboard/cost-register/page.tsx"
);

function read(file, label) {
  if (!fs.existsSync(file)) {
    throw new Error(`${label} missing: ${file}`);
  }
  return fs.readFileSync(file, "utf8");
}

function check(condition, message) {
  if (!condition) throw new Error(message);
}

const hook = read(hookPath, "Operating projection hook");
const panel = read(panelPath, "Cost workspace panel");
const gate = read(gatePath, "Cost Register capability gate");
const workspace = read(workspacePath, "Unified Workspace");
const register = read(costRegisterPath, "Cost Register");

for (const marker of [
  "loadMemberCanonicalIdentityKeys",
  "loadOperatingCapabilityProjection",
  "allIdentityKeys",
]) {
  check(
    hook.includes(marker),
    `Canonical operating projection hook marker missing: ${marker}`
  );
}

check(
  panel.includes('hasCapability("product_costing")') &&
    panel.includes('hasCapability("project_costing")'),
  "Workspace costing navigation must come from BOS operating capabilities."
);

check(
  panel.includes("/construction-cost"),
  "Builder costing navigation must retain the existing construction calculator."
);

check(
  panel.includes("/dashboard/cost-register?mode=product") &&
    panel.includes("/dashboard/cost-register?mode=project"),
  "Cost Register must receive explicit human operating context."
);

check(
  workspace.includes("OperatingCostWorkspacePanel"),
  "Unified Workspace must mount capability-driven Cost & Execution navigation."
);

check(
  gate.includes("Cost Register is not active for your current business identity"),
  "Direct Cost Register access must be capability guarded."
);

check(
  register.includes("CostRegisterCapabilityGate"),
  "Cost Register page must use the operating capability gate."
);


check(
  !register.includes("useSearchParams") &&
    register.includes("window.location.search"),
  "Cost Register query context must not trigger Next.js useSearchParams prerender bailout."
);

check(
  !panel.includes('identity === "manufacturer"') &&
    !panel.includes('identity === "builder"'),
  "COST-01D must not hard-code business identity names."
);

console.log(
  "COST-01D identity-driven costing navigation assertions passed."
);
