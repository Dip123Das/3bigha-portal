import fs from "node:fs";

const files = [
  "app/layout.tsx",
  "components/layout/GlobalHeaderClient.tsx",
  "components/layout/TopHeaderClient.tsx",
  "components/layout/SiteHeader.tsx",
];

for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  const logoImages = source.match(/<Image[\s\S]*?src="\/logo\.png"[\s\S]*?\/>/g) ?? [];

  if (logoImages.length === 0) {
    throw new Error(`Logo delivery verification failed: no logo image in ${file}`);
  }

  for (const image of logoImages) {
    if (!/\bunoptimized\b/.test(image)) {
      throw new Error(`Logo delivery verification failed: optimized logo remains in ${file}`);
    }
  }
}

console.log("Global logo direct-delivery assertions passed.");
