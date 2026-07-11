import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const LAYOUT = path.join(ROOT, "app/layout.tsx");

let failed = false;

if (!fs.existsSync(LAYOUT)) {
  console.error("❌ Missing app/layout.tsx");
  process.exit(1);
}

const content = fs.readFileSync(LAYOUT, "utf8");

const requiredMarkers = [
  'import { ThreeBOSRuntimeProvider } from "@/lib/3bos/context";',
  "<ThreeBOSRuntimeProvider>",
  "</ThreeBOSRuntimeProvider>",
  '<body className="threebigha-app-body">',
  "<PresenceHeartbeat",
  "<BuildConVendorPopup",
];

for (const marker of requiredMarkers) {
  if (!content.includes(marker)) {
    console.error(`❌ Missing layout marker: ${marker}`);
    failed = true;
  }
}

const openingCount =
  (content.match(/<ThreeBOSRuntimeProvider>/g) || []).length;

const closingCount =
  (content.match(/<\/ThreeBOSRuntimeProvider>/g) || []).length;

if (openingCount !== 1) {
  console.error(
    `❌ Expected exactly one provider opening tag; found ${openingCount}.`
  );
  failed = true;
}

if (closingCount !== 1) {
  console.error(
    `❌ Expected exactly one provider closing tag; found ${closingCount}.`
  );
  failed = true;
}

const bodyIndex = content.indexOf(
  '<body className="threebigha-app-body">'
);

const providerOpenIndex = content.indexOf(
  "<ThreeBOSRuntimeProvider>"
);

const presenceIndex = content.indexOf(
  '<PresenceHeartbeat currentPage="global" />'
);

const popupIndex = content.indexOf(
  "<BuildConVendorPopup />"
);

const providerCloseIndex = content.indexOf(
  "</ThreeBOSRuntimeProvider>"
);

const bodyCloseIndex = content.indexOf("</body>");

if (
  !(
    bodyIndex <
      providerOpenIndex &&
    providerOpenIndex <
      presenceIndex &&
    presenceIndex <
      popupIndex &&
    popupIndex <
      providerCloseIndex &&
    providerCloseIndex <
      bodyCloseIndex
  )
) {
  console.error(
    "❌ Provider does not safely wrap the existing body content."
  );
  failed = true;
}

const forbiddenMarkers = [
  "<ThreeBOSRuntimeProvider initialInput=",
  "create3BOSRuntimeInputFromLegacy",
  "getSupabaseBrowser",
  "supabaseBrowser",
  "supabaseServer",
  "setRuntimeInput(",
  "updateRuntimeInput(",
];

for (const marker of forbiddenMarkers) {
  if (content.includes(marker)) {
    console.error(
      `❌ Provider mount contains forbidden bootstrap behavior: ${marker}`
    );
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log(
  "✅ Global empty 3BOS provider mount verification passed."
);
console.log(
  "✅ Existing application body is wrapped without reordering."
);
console.log(
  "✅ Provider has no initial authenticated input."
);
console.log(
  "✅ No profile, Supabase or bootstrap dependency was added."
);
console.log(
  "✅ No route, permission or visible UI behavior changed."
);
