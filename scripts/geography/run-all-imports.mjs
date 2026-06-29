import { spawnSync } from "child_process";
import { LGD_STATES } from "./lgd-states.mjs";

const startFrom = process.argv[2] || null;

let started = !startFrom;

for (const state of LGD_STATES) {
  if (startFrom && state.slug === startFrom) started = true;
  if (!started) continue;

  console.log(`\n\n==============================`);
  console.log(`STATE: ${state.name}`);
  console.log(`==============================`);

  const result = spawnSync(
    "node",
    ["scripts/geography/run-state-import.mjs", state.slug],
    {
      stdio: "inherit",
        env: process.env,
    }
  );

  if (result.status !== 0) {
    console.error(`\nSTOPPED AT: ${state.name}`);
    console.error(`After fixing, resume with:`);
    console.error(`node scripts/geography/run-all-imports.mjs ${state.slug}`);
    process.exit(result.status || 1);
  }
}

console.log("\nALL AVAILABLE STATE IMPORTS COMPLETE");
