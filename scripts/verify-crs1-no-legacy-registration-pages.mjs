import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const removedPaths = [
  "app/auth/register-role/LegacyRegisterRolePageClient.tsx",
  "app/auth/awaiting-approval/page.tsx",
];

for (const relativePath of removedPaths) {
  if (fs.existsSync(path.join(root, relativePath))) {
    throw new Error(
      `Obsolete registration page still exists: ${relativePath}`
    );
  }
}

const scanRoots = [
  "app",
  "components",
  "lib",
  "middleware.ts",
];

function collectFiles(target) {
  const absolute = path.join(root, target);

  if (!fs.existsSync(absolute)) return [];

  const stat = fs.statSync(absolute);

  if (stat.isFile()) return [absolute];

  return fs.readdirSync(absolute, {
    withFileTypes: true,
  }).flatMap((entry) => {
    if (
      entry.name === "node_modules" ||
      entry.name === ".next" ||
      entry.name === ".git"
    ) {
      return [];
    }

    return collectFiles(
      path.join(target, entry.name)
    );
  });
}

for (const file of scanRoots.flatMap(collectFiles)) {
  if (!/\.(ts|tsx|js|jsx|mjs)$/.test(file)) {
    continue;
  }

  const source = fs.readFileSync(file, "utf8");

  for (const forbidden of [
    "/auth/awaiting-approval",
    "LegacyRegisterRolePageClient",
  ]) {
    if (source.includes(forbidden)) {
      throw new Error(
        `Legacy registration reference remains in ${path.relative(
          root,
          file
        )}: ${forbidden}`
      );
    }
  }
}

console.log(
  "CRS-1 legacy registration pages and redirects are absent."
);
