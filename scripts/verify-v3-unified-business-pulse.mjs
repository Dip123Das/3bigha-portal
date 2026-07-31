import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const pulsePath = path.join(
  root,
  "components/3bos/vendor/VendorUnifiedBusinessPulse.tsx"
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
  fs.existsSync(pulsePath),
  "VendorUnifiedBusinessPulse component is missing."
);

const pulse = fs.readFileSync(pulsePath, "utf8");
const mission = fs.readFileSync(missionPath, "utf8");
const page = fs.readFileSync(pagePath, "utf8");

assert(
  pulse.includes("projection: VendorWorkspaceProjection"),
  "Unified Pulse must consume VendorWorkspaceProjection."
);

[
  "projection.pulse.newLeads",
  "projection.pulse.unreadConversations",
  "projection.pulse.readyDeals",
  "projection.pulse.missedLeads",
  "projection.pulse.alerts",
  "projection.pulse.priceSignals",
].forEach((signal) => {
  assert(
    pulse.includes(signal),
    `Unified Pulse is missing canonical signal: ${signal}`
  );
});

[
  "projection.performance.visibilityScore",
  "projection.performance.replyRate",
  "projection.performance.closeRate",
].forEach((indicator) => {
  assert(
    pulse.includes(indicator),
    `Unified Pulse is missing performance indicator: ${indicator}`
  );
});

assert(
  pulse.includes('data-v3-unified-business-pulse="active"'),
  "V-3 runtime marker is missing."
);

assert(
  pulse.includes("What is happening in my business?"),
  "Human-readable pulse question is missing."
);

assert(
  !pulse.includes("getSupabaseBrowser"),
  "Unified Pulse must not access Supabase."
);

assert(
  !pulse.includes("fetch("),
  "Unified Pulse must not call APIs."
);

assert(
  !pulse.includes("useEffect("),
  "Unified Pulse must not load data."
);

assert(
  !mission.includes("projection.pulse"),
  "Executive Mission still duplicates business pulse signals."
);

assert(
  page.includes(
    'import VendorUnifiedBusinessPulse from "@/components/3bos/vendor/VendorUnifiedBusinessPulse";'
  ),
  "Vendor Dashboard does not import VendorUnifiedBusinessPulse."
);

assert(
  page.includes("V3_UNIFIED_BUSINESS_PULSE"),
  "Vendor Dashboard V-3 marker is missing."
);

assert(
  page.includes("<VendorUnifiedBusinessPulse") &&
    page.includes("projection={vendorWorkspaceProjection}"),
  "Vendor Dashboard does not render the canonical Unified Pulse."
);

console.log("V-3 Unified Business Pulse assertions passed.");
console.log(
  "Canonical pulse and performance signals now have one dedicated presentation."
);
console.log(
  "Executive Mission no longer duplicates operational pulse information."
);
console.log(
  "No Supabase, API or data-loading logic was added to the presentation layer."
);
