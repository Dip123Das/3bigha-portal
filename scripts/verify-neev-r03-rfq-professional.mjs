import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [professional, createRoute, addressEngine, globalAssistant] = await Promise.all([
  readFile(new URL("../app/rfq/new/page.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/api/rfq/create/route.ts", import.meta.url), "utf8"),
  readFile(new URL("../components/geography/AddressEngine.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/_components/GlobalAiCopilot.tsx", import.meta.url), "utf8"),
]);

assert.ok(professional.includes("PROFESSIONAL REQUIREMENT TOOLS"));
assert.ok(professional.includes("Prepare a detailed requirement"));
assert.ok(professional.includes("You review everything before it is sent"));
assert.ok(professional.includes("Get help preparing item suggestions"));
assert.ok(professional.includes("Optional assistance only"));
assert.ok(professional.includes("you remain in control"));
assert.ok(professional.includes("if (!v.trim()) return null"));
assert.ok(professional.includes("await supabase.auth.getUser()"));
assert.ok(professional.includes("!authData.user && !phone && !email"));
assert.equal((professional.match(/\/api\/ai\/rfq-generator/g) || []).length, 1);
assert.ok(!professional.includes("AI Generate"));
assert.ok(!professional.includes("Generate RFQ with AI"));
assert.ok(!professional.includes("RFQ Assistant"));
assert.ok(professional.includes("professionalItemRow"));
assert.ok(professional.includes("@media (max-width: 520px)"));
assert.ok(professional.includes("addressEngineToBusinessPayload"));
assert.ok(professional.includes("rfq_attachments"));
assert.ok(professional.includes('fetch("/api/rfq/create"'));
assert.ok(professional.includes('href="/rfq"'));

assert.ok(addressEngine.includes("GeoSelector"));
assert.ok(addressEngine.includes("formatAddress"));
assert.ok(createRoute.includes('.from("rfqs")'));
assert.ok(createRoute.includes('.from("rfq_items")'));
assert.ok(createRoute.includes('.from("rfq_targets")'));
assert.ok(globalAssistant.includes('pathname.startsWith("/rfq")'));
assert.ok(globalAssistant.includes("globalAiShellRfq:not(.globalAiShellOpen)"));
assert.ok(globalAssistant.includes("display: none"));

console.log("NEEV-R03 professional requirement assertions passed (one assistance path, human control, mobile flow and compatibility)");
