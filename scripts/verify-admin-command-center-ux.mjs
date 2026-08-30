import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(`ADMIN UX verification failed: ${message}`);
};

const page = read("app/admin/dashboard/page.tsx");
const explorer = read("app/admin/dashboard/AdminModuleExplorer.tsx");
const styles = read("app/admin/dashboard/AdminCommandCenterUX.module.css");

assert(page.includes("loadAdminCommandCenter"), "canonical command-center model must remain authoritative");
assert(page.includes("<AdminModuleExplorer modules={command.modules}"), "role-scoped modules must feed the explorer");
assert(explorer.startsWith('"use client"'), "workspace search must remain an isolated client enhancement");
assert(explorer.includes('activeGroup === "All" || module.group === activeGroup'), "domain filtering is missing");
assert(explorer.includes("normalizedQuery") && explorer.includes("module.description"), "workspace search is incomplete");
assert(explorer.includes("aria-pressed") && explorer.includes('type="search"'), "filter accessibility contract is missing");
assert(styles.includes("@media(max-width:470px)"), "narrow-mobile refinement is missing");
assert(!explorer.includes("fetch(") && !explorer.includes("supabase"), "visual explorer must not create a parallel data authority");

console.log("Admin Command Center UX assertions passed.");
