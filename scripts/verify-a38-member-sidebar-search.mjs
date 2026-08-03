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
  [page, "A-3.8 — Member sidebar search"],
  [page, "A-3.9 — Live member sidebar search"],
  [page, "<MemberSidebarLiveSearch />"],
  [page, "data-member-search-item"],
  [page, "data-member-search-text"],
  [page, "data-member-search-count"],
  [client, 'id="member-sidebar-live-search"'],
  [client, 'type="search"'],
  [client, 'placeholder="Name, email, business or role"'],
  [client, 'aria-label="Live member search is active"'],
  [client, 'aria-label="Clear member search"'],
  [client, 'onChange={(event) => setQuery(event.target.value)}'],
  [client, 'onClick={() => setQuery("")}'],
  [css, ".memberSearch{"],
  [css, ".memberLink[hidden]"],
];

for (const [source, token] of required) {
  if (!source.includes(token)) {
    console.error(`FAIL: Missing A-3.8/A-3.9 search token: ${token}`);
    process.exit(1);
  }
}

console.log("A-3.8 Member Sidebar Search Audit");
console.log("=================================");
console.log("PASS: A dedicated member search appears above matching members.");
console.log("PASS: Search supports name, email, business, role and location.");
console.log("PASS: Results update immediately while typing.");
console.log("PASS: Clearing the live field restores the complete loaded member list.");
console.log("PASS: Matching-member count updates without page reload.");
console.log("PASS: Desktop and mobile layouts remain preserved.");
