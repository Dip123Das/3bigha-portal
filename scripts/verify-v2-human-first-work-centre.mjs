import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const workCentrePath = path.join(
  root,
  "components/3bos/vendor/VendorHumanFirstWorkCentre.tsx"
);

const missionPath = path.join(
  root,
  "components/3bos/vendor/VendorExecutiveMission.tsx"
);

const pagePath = path.join(
  root,
  "app/dashboard/vendor/page.tsx"
);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(
  fs.existsSync(workCentrePath),
  "VendorHumanFirstWorkCentre component is missing."
);

const workCentre = fs.readFileSync(workCentrePath, "utf8");
const mission = fs.readFileSync(missionPath, "utf8");
const page = fs.readFileSync(pagePath, "utf8");

assert(
  workCentre.includes("projection: VendorWorkspaceProjection"),
  "Work Centre must consume the canonical VendorWorkspaceProjection."
);

assert(
  workCentre.includes("const actions = projection.workNow"),
  "Work Centre must use canonical workNow actions."
);

assert(
  workCentre.includes("const primaryAction = actions[0]"),
  "Work Centre must identify one clear first action."
);

assert(
  workCentre.includes("What should I do now?"),
  "Human-first work question is missing."
);

assert(
  workCentre.includes("Start here"),
  "Primary work guidance is missing."
);

assert(
  workCentre.includes("Complete human responsibilities"),
  "Human-first priority statement is missing."
);

assert(
  workCentre.includes('data-v2-human-first-work-centre="active"'),
  "V-2 runtime marker is missing."
);

assert(
  !workCentre.includes("getSupabaseBrowser"),
  "Work Centre must not access Supabase."
);

assert(
  !workCentre.includes("fetch("),
  "Work Centre must not call APIs."
);

assert(
  !workCentre.includes("useEffect("),
  "Work Centre must not load data."
);

assert(
  !mission.includes("projection.workNow"),
  "Executive Mission must no longer duplicate workNow actions."
);

assert(
  !mission.includes("Today&apos;s priorities"),
  "Executive Mission still contains duplicated priorities."
);

assert(
  page.includes(
    'import VendorHumanFirstWorkCentre from "@/components/3bos/vendor/VendorHumanFirstWorkCentre";'
  ),
  "Vendor Dashboard does not import the Human-First Work Centre."
);

assert(
  page.includes("V2_HUMAN_FIRST_WORK_CENTRE"),
  "Vendor Dashboard V-2 migration marker is missing."
);

assert(
  page.includes("<VendorHumanFirstWorkCentre") &&
    page.includes("projection={vendorWorkspaceProjection}"),
  "Vendor Dashboard does not render the projection-driven Work Centre."
);

console.log("V-2 Human-First Work Centre assertions passed.");
console.log(
  "Canonical workNow actions now have one dedicated human-first presentation."
);
console.log(
  "Executive Mission no longer duplicates the daily work queue."
);
console.log(
  "No Supabase, API or data-loading logic was introduced into presentation components."
);
