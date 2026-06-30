import { spawnSync } from "child_process";
import { LGD_STATES } from "./lgd-states.mjs";

for (const state of LGD_STATES) {
  console.log(`\n=== Ward coverage mapping: ${state.name} ===`);

  const result = spawnSync("node", [
    "scripts/geography/import-lgd-urban-ward-coverage.mjs",
    state.slug,
  ], {
    stdio: "inherit",
    env: process.env,
  });

  if (result.status !== 0) {
    console.error(`STOPPED AT: ${state.name}`);
    process.exit(result.status || 1);
  }
}
