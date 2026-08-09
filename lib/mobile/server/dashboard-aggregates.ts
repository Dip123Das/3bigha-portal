import type { SupabaseClient, User } from "@supabase/supabase-js";

import { resolveCanonicalIdentity } from "@/lib/identity/resolveCanonicalIdentity";
import type { MobileDashboardAggregate, MobileDashboardKey, MobileDashboardMetric } from "@/lib/mobile/contracts/v1";
import { resolveMobileDashboardKey } from "@/lib/mobile/server/bootstrap";

type CountQuery = PromiseLike<{ count: number | null; error: unknown }>;

async function metric(key: string, label: string, webPath: string, query: CountQuery): Promise<MobileDashboardMetric> {
  try {
    const result = await query;
    return { key, label, webPath, value: result.error ? null : result.count ?? 0 };
  } catch {
    return { key, label, webPath, value: null };
  }
}

function count(supabase: SupabaseClient, table: string) {
  return supabase.from(table).select("id", { count: "exact", head: true });
}

function dashboardMetrics(supabase: SupabaseClient, user: User, dashboard: MobileDashboardKey): Array<Promise<MobileDashboardMetric>> {
  switch (dashboard) {
    case "vendor_home": return [
      metric("assigned_rfqs", "Assigned RFQs", "/vendor/inbox-v2", count(supabase, "rfq_targets").eq("vendor_user_id", user.id)),
      metric("inventory_items", "Inventory items", "/dashboard/vendor/inventory", count(supabase, "inventory_entities").eq("vendor_user_id", user.id)),
      metric("unread_alerts", "Unread alerts", "/dashboard/vendor/notifications", count(supabase, "vendor_notifications").eq("user_id", user.id).eq("is_read", false)),
      metric("conversations", "Conversations", "/dashboard/inbox-v2", count(supabase, "conversations").eq("vendor_user_id", user.id)),
    ];
    case "banker_home": return [
      metric("active_offers", "Active lender offers", "/dashboard/banker", count(supabase, "finance_lender_offers").eq("is_active", true).eq("is_verified", true)),
      metric("unread_alerts", "Unread alerts", "/notifications", count(supabase, "vendor_notifications").eq("user_id", user.id).eq("is_read", false)),
      metric("conversations", "Conversations", "/dashboard/inbox-v2", count(supabase, "conversations").or(`buyer_user_id.eq.${user.id},vendor_user_id.eq.${user.id}`)),
    ];
    case "investor_home": return [
      metric("opportunities", "Your opportunities", "/dashboard/investor/opportunities", count(supabase, "investment_opportunities").eq("created_by", user.id)),
      metric("applications", "Applications", "/dashboard/investor/applications", count(supabase, "investment_applications").eq("investor_user_id", user.id)),
      metric("deal_rooms", "Deal rooms", "/dashboard/investor/deal-rooms", count(supabase, "investment_deal_rooms").eq("investor_user_id", user.id)),
    ];
    case "publisher_home": return [
      metric("drafts", "Draft posts", "/blog/my", count(supabase, "blog_posts").eq("author_id", user.id).eq("status", "draft")),
      metric("published", "Published posts", "/blog/my", count(supabase, "blog_posts").eq("author_id", user.id).eq("status", "published")),
      metric("all_posts", "All posts", "/blog/my", count(supabase, "blog_posts").eq("author_id", user.id)),
    ];
    case "blog_admin_home": return [
      metric("drafts", "Draft posts", "/admin/blog", count(supabase, "blog_posts").eq("status", "draft")),
      metric("published", "Published posts", "/admin/blog", count(supabase, "blog_posts").eq("status", "published")),
    ];
    case "admin_home": return [
      metric("subscription_requests", "Subscription requests", "/admin/dashboard", count(supabase, "business_profiles").eq("subscription_status", "requested")),
      metric("active_subscriptions", "Active subscriptions", "/admin/dashboard", count(supabase, "business_profiles").eq("subscription_status", "active")),
      metric("unread_alerts", "Unread alerts", "/admin/dashboard", count(supabase, "vendor_notifications").eq("is_read", false)),
    ];
    case "buyer_home": default: return [
      metric("all_rfqs", "Your RFQs", "/dashboard/buyer/rfqs", count(supabase, "rfqs").eq("requester_user_id", user.id)),
      metric("active_rfqs", "Active RFQs", "/dashboard/buyer/rfqs", count(supabase, "rfqs").eq("requester_user_id", user.id).neq("status", "closed")),
      metric("conversations", "Conversations", "/dashboard/inbox-v2", count(supabase, "conversations").eq("buyer_user_id", user.id)),
    ];
  }
}

export async function buildMobileDashboardAggregate(supabase: SupabaseClient, user: User): Promise<MobileDashboardAggregate> {
  const canonical = await resolveCanonicalIdentity(supabase, user);
  const dashboard = resolveMobileDashboardKey(canonical.workspaceProjection.defaultPath);
  return { dashboard, generatedAt: new Date().toISOString(), metrics: await Promise.all(dashboardMetrics(supabase, user, dashboard)) };
}
