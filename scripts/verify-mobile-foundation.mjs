import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const expectedFinalMilestone = 24;
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const verifiers = readdirSync(join(repoRoot, "scripts"))
  .map((name) => ({ name, match: /^verify-mob-(\d{2})-.*\.mjs$/.exec(name) }))
  .filter(({ match }) => match)
  .map(({ name, match }) => ({ name, number: Number(match[1]) }))
  .sort((left, right) => left.number - right.number);

const expected = Array.from({ length: expectedFinalMilestone }, (_, index) => index + 1);
const actual = verifiers.map(({ number }) => number);

if (JSON.stringify(actual) !== JSON.stringify(expected)) {
  throw new Error(
    `Mobile Foundation verifier sequence must be exactly MOB-01 through MOB-${expectedFinalMilestone}; received ${actual.join(", ")}`,
  );
}

for (const verifier of verifiers) {
  const result = spawnSync(process.execPath, [`scripts/${verifier.name}`], {
    cwd: repoRoot,
    stdio: "inherit",
  });

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log("MOB-01 through MOB-24 Mobile Foundation regression suite passed.");
