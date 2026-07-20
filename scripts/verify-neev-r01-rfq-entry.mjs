import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [entry, review, createRoute, globalAi] = await Promise.all([
  readFile(new URL("../app/rfq/SahajRfqClient.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/rfq/review/page.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/api/rfq/create/route.ts", import.meta.url), "utf8"),
  readFile(new URL("../app/_components/GlobalAiCopilot.tsx", import.meta.url), "utf8"),
]);

for (const choice of [
  "I need materials",
  "I need a service",
  "I need machinery or equipment",
  "I need property help",
]) {
  assert.ok(entry.includes(choice), `RFQ entry must preserve ${choice}`);
}

assert.ok(entry.includes("Step 1 of 3"));
assert.ok(entry.includes("Step 2 of 3"));
assert.ok(entry.includes("Nothing is sent until you review and confirm it."));
assert.ok(entry.includes("<GeoSelector"), "LGD geography selector must remain authoritative");
assert.ok(entry.includes('window.location.href = "/rfq/review"'));
assert.ok(entry.includes("/rfq/new?module="), "professional tools must remain available");
assert.ok(entry.includes("Existing audio recording"), "audio input must be described honestly");
assert.ok(!entry.includes("Project SAHAJ"));
assert.ok(!entry.includes("How will you tell us"));
assert.ok(!entry.includes("Speak it"));
assert.ok(!entry.includes("Help me step by step"));
assert.ok(!entry.includes("professional RFQ engine"));

assert.ok(review.includes("FINAL HUMAN CONFIRMATION"));
assert.ok(review.includes("Assistance does not send this requirement"));
assert.ok(createRoute.includes('export async function POST(req: Request)'));
assert.ok(createRoute.includes('.from("rfqs")'));
assert.ok(createRoute.includes('.from("rfq_targets")'));
assert.ok(globalAi.includes('pathname.startsWith("/rfq")'));
assert.ok(globalAi.includes("globalAiShellQuiet"));

console.log("NEEV-R01 RFQ entry assertions passed (human flow, compatibility, LGD and quiet assistance)");
