import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [entry, review, createRoute] = await Promise.all([
  readFile(new URL("../app/rfq/SahajRfqClient.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/rfq/review/page.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/api/rfq/create/route.ts", import.meta.url), "utf8"),
]);

assert.ok(entry.includes('module === "materials" || module === "rentals"'));
assert.ok(entry.includes("Quantity (optional)"));
assert.ok(entry.includes("Unit (optional)"));
assert.ok(entry.includes("LGD remains the official location"));
assert.ok(entry.includes("Use my current location"));
assert.ok(entry.includes("Paste Google Maps link containing a map point"));
assert.ok(entry.includes("Open exact point in Google Maps"));
assert.ok(entry.includes("formattedAddress: exactAddress"));
assert.ok(entry.includes("latitude: exact.latitude"));
assert.ok(entry.includes("longitude: exact.longitude"));

assert.ok(review.includes("if (!value.trim()) return null"));
assert.ok(review.includes("needsMeasurement && !handoff.qty.trim()"));
assert.ok(review.includes("needsMeasurement && !handoff.unit.trim()"));
assert.ok(review.includes("!isAuthenticated && !handoff.phone.trim()"));
assert.ok(review.includes("Confirm exact point in Google Maps"));
assert.ok(review.includes("Confirm and send requirement"));
assert.ok(review.includes("handoff.exact?.formattedAddress"));

assert.ok(createRoute.includes('export async function POST(req: Request)'));
assert.ok(createRoute.includes('.from("rfqs")'));
assert.ok(createRoute.includes('.from("rfq_items")'));
assert.ok(createRoute.includes('.from("rfq_targets")'));

console.log("NEEV-R02 RFQ detail assertions passed (category context, LGD, exact point and human review)");
