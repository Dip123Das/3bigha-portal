import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  adminRoleHasCapability,
  type AdminCapability,
  type AdminRole,
} from "@/lib/admin/access-policy";

export type CommandMetric = {
  label: string;
  value: number | null;
  detail: string;
  href: string;
  tone: "neutral" | "positive" | "warning" | "critical";
};

export type CommandQueueItem = {
  label: string;
  count: number | null;
  detail: string;
  href: string;
  priority: "urgent" | "attention" | "normal";
};

export type CommandModule = {
  title: string;
  description: string;
  href: string;
  group: "Trust" | "Marketplace" | "Intelligence" | "Revenue" | "Platform";
  capability: AdminCapability;
};

export type AdminCommandCenter = {
  generatedAt: string;
  metrics: CommandMetric[];
  queues: CommandQueueItem[];
  modules: CommandModule[];
  dataIssues: string[];
};

type CountFilter =
  | { kind: "eq"; column: string; value: string | boolean }
  | { kind: "gte"; column: string; value: string };

type CountResult = { value: number | null; issue?: string };

const MODULES: CommandModule[] = [
  { title: "AI Moderation Center", description: "Human review of AI confidence, media mismatch and duplicate evidence.", href: "/admin/moderation", group: "Trust", capability: "admin:registration" },
  { title: "Trust & Verification Center", description: "Trust queues, evidence integrity, fraud signals and SLA control.", href: "/admin/verification-operations", group: "Trust", capability: "admin:registration" },
  { title: "Member Administration", description: "Accounts, roles, permissions and security status.", href: "/admin/users", group: "Trust", capability: "admin:users" },
  { title: "Verification Workbench", description: "Business registration evidence and reviewer workflow.", href: "/admin/verification-workbench", group: "Trust", capability: "admin:registration" },
  { title: "Verification Reviews", description: "Trust decisions, AI briefs and cross-verification.", href: "/admin/verification-reviews", group: "Trust", capability: "admin:registration" },
  { title: "Skilled Professional Reviews", description: "Identity, selfie and work-evidence decisions.", href: "/admin/individual-professional-reviews", group: "Trust", capability: "admin:registration" },
  { title: "Property Control", description: "Property and builder-project moderation.", href: "/admin/property", group: "Marketplace", capability: "admin:property" },
  { title: "Marketplace Control Center", description: "Cross-module supply, publication queues and promotion governance.", href: "/admin/marketplace-control", group: "Marketplace", capability: "admin:marketplace" },
  { title: "Materials Control", description: "Material listing review and publication.", href: "/admin/materials", group: "Marketplace", capability: "admin:materials" },
  { title: "Services Control", description: "Service and turnkey package moderation.", href: "/admin/services", group: "Marketplace", capability: "admin:services" },
  { title: "Rentals Control", description: "Rental inventory review and publication.", href: "/admin/rentals", group: "Marketplace", capability: "admin:rentals" },
  { title: "Blog Publishing", description: "Editorial moderation and publishing.", href: "/admin/blog", group: "Marketplace", capability: "admin:blog" },
  { title: "Content & Communications", description: "Publishing, SEO, notification and channel-delivery governance.", href: "/admin/content-communications", group: "Marketplace", capability: "admin:blog" },
  { title: "Price Verification", description: "Review vendor-submitted market prices.", href: "/admin/dashboard/price-updates", group: "Marketplace", capability: "admin:marketplace" },
  { title: "Marketplace Intelligence", description: "Demand, supply, liquidity and shortage signals.", href: "/admin/dashboard/marketplace-intelligence", group: "Intelligence", capability: "admin:marketplace" },
  { title: "RFQ Intelligence Center", description: "Live RFQs, vendor response, quote and buyer behaviour analytics.", href: "/admin/rfq-intelligence", group: "Intelligence", capability: "admin:marketplace" },
  { title: "Inventory & Vendor Operations", description: "Cross-vendor stock, reconciliation, billing, dispatch and fleet integrity.", href: "/admin/inventory-operations", group: "Intelligence", capability: "admin:marketplace" },
  { title: "Construction OS Control", description: "Estimator configuration, regional rates, PWD coverage and project execution health.", href: "/admin/construction-control", group: "Intelligence", capability: "admin:configuration" },
  { title: "Vendor Control", description: "Visibility, boost and ranking governance.", href: "/admin/dashboard/vendor-control", group: "Intelligence", capability: "admin:marketplace" },
  { title: "Vendor Recruitment", description: "Regional supply-gap acquisition priorities.", href: "/admin/dashboard/vendor-recruitment", group: "Intelligence", capability: "admin:marketplace" },
  { title: "Finance Leads", description: "Loan leads, assignment and conversion workflow.", href: "/admin/dashboard/finance-leads", group: "Revenue", capability: "admin:configuration" },
  { title: "Banker Verification", description: "Banker KYC and lender-offer governance.", href: "/admin/dashboard/banker-verification", group: "Revenue", capability: "admin:configuration" },
  { title: "Billing, Subscription & Revenue", description: "Settled payments, entitlements, renewals and revenue-governance coverage.", href: "/admin/revenue-control", group: "Revenue", capability: "admin:configuration" },
  { title: "Investment Control", description: "Investment plans and opportunities.", href: "/admin/dashboard/investment", group: "Revenue", capability: "admin:investment" },
  { title: "Support Desk", description: "Complaints, tickets, appeals and resolution.", href: "/admin/dashboard/support", group: "Platform", capability: "admin:configuration" },
  { title: "Support, Complaints & Appeals", description: "SLA triage, escalations, risk signals and appeal-coverage governance.", href: "/admin/support-operations", group: "Platform", capability: "admin:configuration" },
  { title: "Geography Control", description: "LGD geography, resolver and coverage governance.", href: "/admin/dashboard/geography", group: "Platform", capability: "admin:geography" },
  { title: "Master Data", description: "Canonical taxonomies, identities and measurement.", href: "/admin/dashboard/master-data", group: "Platform", capability: "admin:configuration" },
  { title: "SEO Control", description: "Indexing, sitemap and regional discovery.", href: "/admin/dashboard/seo", group: "Platform", capability: "admin:configuration" },
  { title: "Production Operations", description: "VPS, PM2, deployments and service health.", href: "/admin/dashboard/operations", group: "Platform", capability: "admin:operations" },
];

async function countRows(
  supabase: SupabaseClient<any>,
  table: string,
  label: string,
  filters: CountFilter[] = []
): Promise<CountResult> {
  let query: any = supabase.from(table).select("*", { count: "exact", head: true });

  for (const filter of filters) {
    query = filter.kind === "eq"
      ? query.eq(filter.column, filter.value)
      : query.gte(filter.column, filter.value);
  }

  const { count, error } = await query;
  return error
    ? { value: null, issue: `${label}: ${error.message}` }
    : { value: count ?? 0 };
}

function metric(
  label: string,
  result: CountResult,
  detail: string,
  href: string,
  tone: CommandMetric["tone"] = "neutral"
): CommandMetric {
  return { label, value: result.value, detail, href, tone };
}

export async function loadAdminCommandCenter(
  supabase: SupabaseClient<any>,
  role: AdminRole
): Promise<AdminCommandCenter> {
  const isMaster = role === "master_admin";
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const can = (capability: AdminCapability) => adminRoleHasCapability(role, capability);

  const requests: Record<string, Promise<CountResult>> = {};
  const add = (key: string, table: string, label: string, filters: CountFilter[] = []) => {
    requests[key] = countRows(supabase, table, label, filters);
  };

  if (isMaster) {
    add("users", "profiles", "Platform users");
    add("growth", "profiles", "New users", [{ kind: "gte", column: "created_at", value: thirtyDaysAgo }]);
    add("vendors", "business_profiles", "Businesses");
    add("pendingUsers", "profiles", "Pending member reviews", [{ kind: "eq", column: "approval_status", value: "pending" }]);
    add("subscriptions", "business_profiles", "Active subscriptions", [{ kind: "eq", column: "subscription_status", value: "active" }]);
    add("subscriptionRequests", "business_profiles", "Subscription requests", [{ kind: "eq", column: "subscription_status", value: "requested" }]);
    add("rfqs", "rfqs", "RFQ activity");
    add("support", "support_tickets", "Open support tickets", [{ kind: "eq", column: "status", value: "open" }]);
    add("aiAlerts", "vendor_notifications", "Unread AI alerts", [{ kind: "eq", column: "is_read", value: false }]);
  }

  const listingAuthorities = [
    { key: "property", table: "property_listings", label: "Properties", capability: "admin:property" as const, href: "/admin/property" },
    { key: "materials", table: "material_listings", label: "Materials", capability: "admin:materials" as const, href: "/admin/materials" },
    { key: "services", table: "service_listings", label: "Services", capability: "admin:services" as const, href: "/admin/services" },
    { key: "rentals", table: "rental_listings", label: "Rentals", capability: "admin:rentals" as const, href: "/admin/rentals" },
  ].filter((item) => can(item.capability));

  for (const item of listingAuthorities) {
    add(`${item.key}Total`, item.table, `${item.label} total`);
    add(`${item.key}Pending`, item.table, `${item.label} pending`, [{ kind: "eq", column: "status", value: "pending" }]);
  }

  const entries = await Promise.all(
    Object.entries(requests).map(async ([key, request]) => [key, await request] as const)
  );
  const values = Object.fromEntries(entries) as Record<string, CountResult>;
  const fallback: CountResult = { value: null };
  const dataIssues = entries.flatMap(([, result]) => result.issue ? [result.issue] : []);

  const listingTotal = listingAuthorities.reduce<number | null>((total, item) => {
    const value = values[`${item.key}Total`]?.value;
    return total === null || value === null || value === undefined ? null : total + value;
  }, 0);
  const pendingTotal = listingAuthorities.reduce<number | null>((total, item) => {
    const value = values[`${item.key}Pending`]?.value;
    return total === null || value === null || value === undefined ? null : total + value;
  }, 0);

  const metrics: CommandMetric[] = isMaster
    ? [
        metric("Platform users", values.users ?? fallback, "All registered accounts", "/admin/users"),
        metric("30-day growth", values.growth ?? fallback, "New accounts in the last 30 days", "/admin/users", "positive"),
        metric("Verified businesses", values.vendors ?? fallback, "Business profiles in the operating network", "/admin/users"),
        { label: "Marketplace supply", value: listingTotal, detail: "Listings across controlled modules", href: "/admin/dashboard/marketplace-intelligence", tone: "neutral" },
        metric("RFQ activity", values.rfqs ?? fallback, "Total procurement requests", "/admin/dashboard/marketplace-intelligence"),
        metric("Active subscriptions", values.subscriptions ?? fallback, "Currently active business plans", "/admin/users", "positive"),
      ]
    : [
        { label: "Module supply", value: listingTotal, detail: "Listings inside your authority", href: listingAuthorities[0]?.href ?? "/admin/dashboard", tone: "neutral" },
        { label: "Awaiting review", value: pendingTotal, detail: "Items requiring a moderation decision", href: listingAuthorities[0]?.href ?? "/admin/dashboard", tone: pendingTotal ? "warning" : "positive" },
      ];

  const queues: CommandQueueItem[] = [];
  if (isMaster) {
    queues.push(
      { label: "Member verification", count: values.pendingUsers?.value ?? null, detail: "Identity and role approvals", href: "/admin/users?approval=pending", priority: "urgent" },
      { label: "Support escalation", count: values.support?.value ?? null, detail: "Open customer support tickets", href: "/admin/dashboard/support", priority: "urgent" },
      { label: "AI alert review", count: values.aiAlerts?.value ?? null, detail: "Unread marketplace alerts", href: "/admin/dashboard/vendor-control", priority: "attention" },
      { label: "Subscription requests", count: values.subscriptionRequests?.value ?? null, detail: "Requests awaiting payment workflow", href: "/admin/users", priority: "attention" }
    );
  }
  for (const item of listingAuthorities) {
    queues.push({
      label: `${item.label} moderation`,
      count: values[`${item.key}Pending`]?.value ?? null,
      detail: "Pending publication decisions",
      href: item.href,
      priority: "attention",
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    metrics,
    queues,
    modules: MODULES.filter((item) => can(item.capability)),
    dataIssues,
  };
}
