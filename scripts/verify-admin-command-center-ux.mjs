import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(`ADMIN UX verification failed: ${message}`);
};

const page = read("app/admin/dashboard/page.tsx");
const explorer = read("app/admin/dashboard/AdminModuleExplorer.tsx");
const styles = read("app/admin/dashboard/AdminCommandCenterUX.module.css");
const globalAi = read("app/_components/GlobalAiCopilot.tsx");
const menuController = read("app/_components/MobileMenuAutoClose.tsx");

assert(page.includes("loadAdminCommandCenter"), "canonical command-center model must remain authoritative");
assert(page.includes("<AdminModuleExplorer modules={command.modules}"), "role-scoped modules must feed the explorer");
assert(explorer.startsWith('"use client"'), "workspace search must remain an isolated client enhancement");
assert(explorer.includes('activeGroup === "All" || module.group === activeGroup'), "domain filtering is missing");
assert(explorer.includes("normalizedQuery") && explorer.includes("module.description"), "workspace search is incomplete");
assert(explorer.includes("aria-pressed") && explorer.includes('type="search"'), "filter accessibility contract is missing");
assert(/@media\s*\(max-width:\s*470px\)/.test(styles), "narrow-mobile refinement is missing");
assert(page.includes("className={ux.navWithCount}") && page.includes("items requiring action"), "live work-queue navigation count is missing");
assert(globalAi.includes('const isAdminRoute = pathname.startsWith("/admin")'), "admin route detection is missing from the global AI launcher");
assert(globalAi.includes("isDashboardHome || isAdminRoute"), "global AI launcher must not overlap admin workspaces");
assert(menuController.includes('pathname.startsWith("/admin")'), "admin route detection is missing from the global menu controller");
assert(menuController.includes(".topSubBar") && menuController.includes("display: none !important"), "public workspace dropdowns must not overlap admin workspaces");
assert(!explorer.includes("fetch(") && !explorer.includes("supabase"), "visual explorer must not create a parallel data authority");

console.log("Admin Command Center UX assertions passed.");
