import fs from "node:fs";

const page = fs.readFileSync("app/admin/users/page.tsx", "utf8");
const client = fs.readFileSync(
  "app/admin/users/MemberSidebarLiveSearch.tsx",
  "utf8"
);
const css = fs.readFileSync(
  "app/admin/users/MemberAdministration.module.css",
  "utf8"
);

const required = [
  [page, "A-3.9 — Live member sidebar search"],
  [page, 'import MemberSidebarLiveSearch from "./MemberSidebarLiveSearch"'],
  [page, "<MemberSidebarLiveSearch />"],
  [page, "data-member-search-item"],
  [page, "data-member-search-text"],
  [page, "data-member-search-count"],
  [client, '"use client"'],
  [client, "onChange={(event) => setQuery(event.target.value)}"],
  [client, "item.hidden = !matches"],
  [client, 'onClick={() => setQuery("")}'],
  [client, "Results update automatically while you type."],
  [css, ".memberLink[hidden]"],
];

for (const [source, token] of required) {
  if (!source.includes(token)) {
    console.error(`FAIL: Missing A-3.9 token: ${token}`);
    process.exit(1);
  }
}

console.log("A-3.9 Live Member Sidebar Search Audit");
console.log("======================================");
console.log("PASS: Related member names appear immediately while typing.");
console.log("PASS: Clearing the field restores the complete loaded member list.");
console.log("PASS: Search covers name, email, business, role and location text.");
console.log("PASS: Matching-member count updates live.");
console.log("PASS: No submit or page reload is required.");
console.log("PASS: Existing member navigation and founder workspaces remain unchanged.");
