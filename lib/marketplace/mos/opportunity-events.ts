import type { DemandAroundMe } from "./types";
import { buildVendorAction } from "./vendor-action-engine";

function priorityFromScore(score: number) {
  if (score >= 85) return "urgent";
  if (score >= 65) return "high";
  if (score >= 40) return "medium";
  return "low";
}

export async function createMarketplaceOpportunityEvent(params: {
  supabase: any;
  userId: string;
  demandAroundMe: DemandAroundMe;
}) {
  const score = Number(params.demandAroundMe.opportunity?.score || 0);
  const action = buildVendorAction(params.demandAroundMe);
  const today = new Date().toISOString().slice(0, 10);

  const { data: existing } = await params.supabase
    .from("vendor_notifications")
    .select("id")
    .eq("user_id", params.userId)
    .eq("type", "marketplace_opportunity")
    .gte("created_at", `${today}T00:00:00.000Z`)
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    return { created: false, notificationId: existing.id, reason: "already_created_today" };
  }

  const { data, error } = await params.supabase
    .from("vendor_notifications")
    .insert({
      user_id: params.userId,
      type: "marketplace_opportunity",
      title: params.demandAroundMe.recommendation.title,
      message: params.demandAroundMe.recommendation.description,
      is_read: false,
      channel: "in_app",
      status: "pending",
      whatsapp_status: "pending",
      data: {
        priority: priorityFromScore(score),
        source: "marketplace_operating_system",
        event_type: "marketplace_opportunity",
        opportunity_score: score,
        action,
        action_type: action.action_type,
        action_label: action.action_label,
        action_href: action.action_href,
        confidence: action.confidence,
        estimated_value: action.estimated_value,
        reason: action.reason,
        geography: params.demandAroundMe.geography,
        demand: params.demandAroundMe.demand,
        supply: params.demandAroundMe.supply,
        generated_at: params.demandAroundMe.generatedAt,
        channel_ready: {
          dashboard: true,
          whatsapp: true,
          push: false
        }
      }
    })
    .select("id")
    .single();

  if (error) {
    return { created: false, error: error.message };
  }

  return { created: true, notificationId: data?.id || null };
}
