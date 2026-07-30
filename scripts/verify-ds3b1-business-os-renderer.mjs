import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const rendererPath = path.join(
  root,
  "components/3bos/framework/BusinessOsRenderer.tsx",
);
const indexPath = path.join(root, "components/3bos/framework/index.ts");

if (!fs.existsSync(rendererPath)) {
  throw new Error("Missing BusinessOsRenderer.tsx");
}

const renderer = fs.readFileSync(rendererPath, "utf8");
const index = fs.readFileSync(indexPath, "utf8");

for (const assertion of [
  'data-business-os-renderer="true"',
  "projection.workNow.map",
  "projection.journey.map",
  "projection.priorities.map",
  "projection.pulse",
  "projection.assistance",
  "projection.mobileNavigation",
]) {
  if (!renderer.includes(assertion)) {
    throw new Error(`Renderer assertion failed: ${assertion}`);
  }
}

if (!index.includes('BusinessOsRenderer')) {
  throw new Error("BusinessOsRenderer is not exported from framework/index.ts");
}

console.log("DS-3B.1 Business OS renderer assertions passed.");
