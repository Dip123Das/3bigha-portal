import fs from "fs";

const routes = fs.readFileSync("audits/sahaj/full/app-routes.txt", "utf8")
  .split(/\r?\n/)
  .filter(Boolean);

function domain(route) {
  if (route.includes("/api/")) return "API";
  if (route.includes("/admin")) return "Administration";
  if (route.includes("/dashboard")) return "Dashboard / Manage";
  if (route.includes("/property")) return "Property";
  if (route.includes("/rfq") || route.includes("/market-rfq")) return "Procurement";
  if (route.includes("/materials")) return "Marketplace / Materials";
  if (route.includes("/services")) return "Marketplace / Services";
  if (route.includes("/rentals")) return "Rentals / Equipment";
  if (route.includes("/vendor")) return "Business / Vendor";
  if (route.includes("/investment")) return "Investment";
  if (route.includes("/construction-cost") || route.includes("/cost-calculator")) return "Construction";
  if (route.includes("/seo") || route.includes("/location") || route.includes("/need") || route.includes("/market")) return "SEO / Discovery";
  if (route.includes("/auth") || route.includes("/login") || route.includes("/signup")) return "Identity";
  return "General";
}

function journey(route) {
  if (route.includes("/property/add") || route.includes("/materials/add") || route.includes("/services/add") || route.includes("/rentals/add")) return "Sell / Grow";
  if (route.includes("/rfq")) return "Buy / Manage";
  if (route.includes("/dashboard") || route.includes("/admin")) return "Manage";
  if (route.includes("/construction")) return "Build";
  if (route.includes("/search") || route.includes("/market") || route.includes("/seo") || route.includes("/need")) return "Buy / Discover";
  if (route.includes("/vendor") || route.includes("/onboarding")) return "Grow";
  return "Discover";
}

const groups = {};
for (const r of routes) {
  const d = domain(r);
  const j = journey(r);
  groups[d] ??= {};
  groups[d][j] ??= [];
  groups[d][j].push(r);
}

let out = `# 004 — Platform Map\n\n`;
out += `Generated from SAHAJ full audit.\n\n`;
out += `Total audited routes: ${routes.length}\n\n`;
out += `## Product Domains\n\n`;

for (const [d, journeys] of Object.entries(groups).sort()) {
  const count = Object.values(journeys).flat().length;
  out += `### ${d} (${count})\n\n`;
  for (const [j, rs] of Object.entries(journeys).sort()) {
    out += `#### Journey: ${j}\n\n`;
    for (const r of rs.slice(0, 60)) out += `- \`${r}\`\n`;
    if (rs.length > 60) out += `- ...and ${rs.length - 60} more\n`;
    out += `\n`;
  }
}

out += `## SAHAJ Execution Decision\n\n`;
out += `3Bigha will not be redesigned page-by-page. Routes will be migrated by shared foundation, product domain, and human journey.\n\n`;
out += `Priority migration order:\n\n`;
out += `1. Shared Foundation\n2. Procurement / RFQ\n3. Search & Discovery\n4. Property\n5. Marketplace Materials & Services\n6. Business / Vendor\n7. Dashboard / Manage\n8. Administration\n`;

fs.writeFileSync("docs/sahaj/004-platform-map.md", out);
console.log("Generated docs/sahaj/004-platform-map.md");
