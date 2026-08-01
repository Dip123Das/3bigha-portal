import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const files = {
  dashboard: "app/dashboard/buyer/page.tsx",
  menu: "components/buyer/BuyerWorkMenu.tsx",
  rfqs: "app/dashboard/buyer/rfqs/page.tsx",
  inbox: "app/dashboard/buyer/inbox/page.tsx",
  quoteCompare: "app/dashboard/buyer/quote-compare/[rfqId]/page.tsx",
  css: "app/dashboard/buyer-constitutional-dashboard.css",
};

function read(relativePath) {
  const fullPath = path.join(root, relativePath);
  return fs.existsSync(fullPath)
    ? fs.readFileSync(fullPath, "utf8")
    : "";
}

function result(level, code, message, file) {
  return { level, code, message, file };
}

const findings = [];

const dashboard = read(files.dashboard);
const menu = read(files.menu);
const rfqs = read(files.rfqs);

if (!dashboard) {
  findings.push(result("CRITICAL","BUYER-DASHBOARD-MISSING","Buyer dashboard page is missing.",files.dashboard));
} else {

  if (
    dashboard.includes('.from("rfqs")') &&
    dashboard.includes('.select("id,title,module,status,created_at,needed_by")') &&
    !/\.eq\(\s*["'](?:requester_user_id|created_by)["']/.test(dashboard)
  ) {
    findings.push(result(
      "CRITICAL",
      "BUYER-RFQ-OWNERSHIP",
      "Buyer dashboard query is not explicitly scoped to the logged-in buyer.",
      files.dashboard
    ));
  }

  const shellCount = [
    dashboard.includes("UniversalDashboardShell"),
    dashboard.includes("WorkspaceHome"),
    dashboard.includes("BuyerWorkMenu"),
    dashboard.includes("Container")
  ].filter(Boolean).length;

  if (shellCount >= 3) {
    findings.push(result(
      "MAJOR",
      "BUYER-SHELL-FRAGMENTATION",
      "Multiple dashboard shells are combined into one page.",
      files.dashboard
    ));
  }

  const aiCount =
    (dashboard.match(/@\/lib\/ai\//g) || []).length +
    (dashboard.match(/\/api\/ai\//g) || []).length;

  if (aiCount >= 5) {
    findings.push(result(
      "MAJOR",
      "BUYER-AI-FIRST",
      "AI logic appears before the human procurement workflow.",
      files.dashboard
    ));
  }

  if (dashboard.includes('title="Buyer Work Desk"')) {
    findings.push(result(
      "MODERATE",
      "BUYER-NAMING",
      "Buyer Dashboard and Buyer Work Desk should be separated.",
      files.dashboard
    ));
  }
}

if (!menu) {
  findings.push(result("CRITICAL","BUYER-MENU-MISSING","Buyer menu missing.",files.menu));
} else {

  if (menu.includes('href: "/property"')) {
    findings.push(result(
      "MAJOR",
      "BUYER-MARKETPLACE",
      "Marketplace points only to Property.",
      files.menu
    ));
  }

  if (menu.includes('href: "/investment"')) {
    findings.push(result(
      "MODERATE",
      "BUYER-INVESTMENT",
      "Investment should not be in the primary buyer workflow.",
      files.menu
    ));
  }

  if (
    menu.includes("/dashboard/buyer/inbox") &&
    menu.includes("/dashboard/inbox")
  ) {
    findings.push(result(
      "MAJOR",
      "BUYER-INBOX-DUPLICATE",
      "Buyer Inbox and Unified Inbox duplicate navigation.",
      files.menu
    ));
  }

  if (!menu.includes("My Profile")) {
    findings.push(result(
      "MAJOR",
      "BUYER-PROFILE",
      "Buyer menu lacks a direct profile entry.",
      files.menu
    ));
  }

  if (
    !menu.includes("Create Requirement") &&
    !menu.includes("Create RFQ")
  ) {
    findings.push(result(
      "MAJOR",
      "BUYER-PRIMARY-ACTION",
      "Buyer menu lacks a primary Create Requirement action.",
      files.menu
    ));
  }
}

if (!rfqs) {
  findings.push(result("CRITICAL","BUYER-RFQS","Buyer RFQ page missing.",files.rfqs));
} else {

  if (
    rfqs.includes("getAiRfqCommandInsight") &&
    rfqs.includes("aiFocusFilter")
  ) {
    findings.push(result(
      "MODERATE",
      "BUYER-RFQ-COMPLEXITY",
      "RFQ page contains too much operational logic in one component.",
      files.rfqs
    ));
  }
}

const order = {
  CRITICAL:0,
  MAJOR:1,
  MODERATE:2,
  MINOR:3
};

findings.sort((a,b)=>order[a.level]-order[b.level]);

const summary={};

for(const f of findings){
  summary[f.level]=(summary[f.level]||0)+1;
}

console.log("");
console.log("=========================================");
console.log(" Buyer Workspace Architecture Audit");
console.log("=========================================");
console.log("");

console.log("Critical :",summary.CRITICAL||0);
console.log("Major    :",summary.MAJOR||0);
console.log("Moderate :",summary.MODERATE||0);
console.log("");

for(const f of findings){
  console.log(`[${f.level}] ${f.code}`);
  console.log(f.message);
  console.log("File :",f.file);
  console.log("");
}

console.log("=========================================");
console.log("Audit completed.");
console.log("=========================================");

if(summary.CRITICAL){
  process.exitCode=2;
}
