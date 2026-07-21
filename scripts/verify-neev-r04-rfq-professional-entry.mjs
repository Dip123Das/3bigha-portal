import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [entry, professional, createRoute] = await Promise.all([
  readFile(new URL("../app/rfq/SahajRfqClient.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/rfq/new/page.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/api/rfq/create/route.ts", import.meta.url), "utf8"),
]);

const categoryPosition = entry.indexOf("I need materials");
const professionalPosition = entry.indexOf("Open Professional Requirement Tools");

assert.ok(categoryPosition >= 0, "simple requirement choices must remain present");
assert.ok(professionalPosition > categoryPosition, "professional entry must remain secondary to the simple choices");
assert.ok(entry.includes("Need BOQ, item rows, document uploads or technical details?"));
assert.ok(entry.includes("The simple choices above are best for most people"));
assert.ok(entry.includes('href="/rfq/new"'));
assert.ok(entry.includes("/rfq/new?module="), "contextual professional handoff must remain available");
assert.ok(professional.includes("PROFESSIONAL REQUIREMENT TOOLS"));
assert.ok(createRoute.includes('.from("rfqs")'));
assert.ok(createRoute.includes('.from("rfq_items")'));
assert.ok(createRoute.includes('.from("rfq_targets")'));

console.log("NEEV-R04 professional entry assertions passed (visible secondary route and compatibility)");
