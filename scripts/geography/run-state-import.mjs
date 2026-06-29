import { spawnSync } from "child_process";
import { requireState } from "./lgd-import-utils.mjs";

const stateSlug = process.argv[2];

if (!stateSlug) {
  console.error("Usage: node scripts/geography/run-state-import.mjs <state-slug>");
  process.exit(1);
}

const state = requireState(stateSlug);

const steps = [
  ["Districts", "scripts/geography/import-lgd-districts.mjs"],
  ["Subdistricts", "scripts/geography/import-lgd-subdistricts.mjs"],
  ["Blocks", "scripts/geography/import-lgd-blocks.mjs"],
  ["Villages", "scripts/geography/import-lgd-villages.mjs"],
  ["Block-village links", "scripts/geography/import-lgd-block-villages.mjs"],
  ["Urban local bodies", "scripts/geography/import-lgd-local-bodies.mjs"],
];

console.log(`\n=== LGD State Import: ${state.name} (${state.slug}) ===`);

for (const [label, script] of steps) {
  console.log(`\n--- ${label} ---`);

  const result = spawnSync("node", [script, state.slug], {
    stdio: "inherit",
    env: process.env,
  });

  if (result.status !== 0) {
    console.error(`\nFAILED: ${label}`);
    process.exit(result.status || 1);
  }
}

console.log(`\nDONE: ${state.name}`);
