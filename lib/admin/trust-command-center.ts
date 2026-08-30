import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

type TrustMetric = { label: string; value: number | null; detail: string; tone: "neutral" | "positive" | "warning" | "critical" };
type TrustQueue = { label: string; count: number | null; detail: string; href: string; priority: "normal" | "attention" | "urgent" };
type TrustCase = { id: string; userId: string; status: string; ageHours: number; priority: string; assigned: boolean; href: string };

export type TrustCommandCenter = {
  generatedAt: string;
  metrics: TrustMetric[];
  queues: TrustQueue[];
  oldestCases: TrustCase[];
  recentDecisionCount: number | null;
  activeReviewerCount: number | null;
  unresolvedNotificationCount: number | null;
  issues: string[];
};

type QueryResult = { data: any[] | null; error: { message: string } | null };

function ageHours(value: unknown) {
  const time = new Date(String(value || "")).getTime();
  return Number.isFinite(time) ? Math.max(0, Math.floor((Date.now() - time) / 3_600_000)) : 0;
}

function rows(result: QueryResult, label: string, issues: string[]) {
  if (result.error) {
    issues.push(`${label}: ${result.error.message}`);
    return null;
  }
  return result.data || [];
}

function filteredCount(data: any[] | null, predicate: (item: any) => boolean) {
  return data === null ? null : data.filter(predicate).length;
}

export async function loadTrustCommandCenter(admin: SupabaseClient<any>): Promise<TrustCommandCenter> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const results = await Promise.all([
    admin.from("registration_verification_cases").select("id,user_id,status,confidence,created_at").order("created_at", { ascending: false }).limit(1500),
    admin.from("registration_review_assignments").select("case_id,assigned_to,priority,status").limit(2500),
    admin.from("registration_document_intelligence").select("id,status").limit(1500),
    admin.from("registration_cross_verification").select("id,status,recommended_action").limit(1500),
    admin.from("registration_verification_events").select("id,event_type,decided_by,created_at").gte("created_at", weekAgo).limit(2500),
    admin.from("individual_professional_profiles").select("user_id,verification_status,contractor_risk_status,ai_verification_status,selfie_verification_status,work_evidence_verification_status").limit(1500),
    admin.from("trusted_capture_sessions").select("id,integrity_status,listing_entity_type,created_at").limit(2500),
    admin.from("listing_media_verifications").select("id,requires_admin_review,severity,resolved_at,listing_entity_type").limit(2500),
    admin.from("registration_operations_notifications").select("id,severity,status").limit(1000),
    admin.from("admin_account_action_audit").select("id,action,created_at").gte("created_at", monthAgo).limit(1000),
    admin.from("property_listings").select("id,status").eq("status", "pending").limit(1500),
    admin.from("builder_projects").select("id,status").eq("status", "pending").limit(1500),
  ]) as unknown as QueryResult[];

  const issues: string[] = [];
  const cases = rows(results[0], "Registration cases", issues);
  const assignments = rows(results[1], "Review assignments", issues);
  const documents = rows(results[2], "Document intelligence", issues);
  const crossChecks = rows(results[3], "Cross-verification", issues);
  const events = rows(results[4], "Verification events", issues);
  const professionals = rows(results[5], "Skilled professional verification", issues);
  const captures = rows(results[6], "GPS capture sessions", issues);
  const mediaReviews = rows(results[7], "Media verification", issues);
  const notifications = rows(results[8], "Trust notifications", issues);
  const accountActions = rows(results[9], "Account action audit", issues);
  const properties = rows(results[10], "Property verification", issues);
  const builders = rows(results[11], "Builder verification", issues);

  const closed = new Set(["auto_verified", "admin_verified", "verified_by_ai", "restricted", "rejected"]);
  const latestByUser = new Map<string, any>();
  for (const item of cases || []) if (!latestByUser.has(item.user_id)) latestByUser.set(item.user_id, item);
  const pending = cases === null ? null : [...latestByUser.values()].filter((item) => !closed.has(item.status));
  const assignmentMap = new Map((assignments || []).map((item) => [item.case_id, item]));
  const oldestCases = (pending || [])
    .map((item) => {
      const assignment = assignmentMap.get(item.id);
      return {
        id: item.id,
        userId: item.user_id,
        status: item.status,
        ageHours: ageHours(item.created_at),
        priority: assignment?.priority || "normal",
        assigned: Boolean(assignment?.assigned_to),
        href: `/admin/verification-reviews?case=${encodeURIComponent(item.id)}`,
      };
    })
    .sort((a, b) => b.ageHours - a.ageHours)
    .slice(0, 12);

  const pendingCount = pending?.length ?? null;
  const pending24 = pending === null ? null : pending.filter((item) => ageHours(item.created_at) >= 24).length;
  const pending72 = pending === null ? null : pending.filter((item) => ageHours(item.created_at) >= 72).length;
  const documentReview = filteredCount(documents, (item) => item.status === "needs_manual_review");
  const crossReview = filteredCount(crossChecks, (item) => item.status === "needs_manual_review");
  const professionalReview = filteredCount(professionals, (item) => item.verification_status === "pending_review" || item.contractor_risk_status === "review_required" || item.ai_verification_status === "review_required");
  const selfieReview = filteredCount(professionals, (item) => item.selfie_verification_status === "pending_review" || item.selfie_verification_status === "review_required");
  const gpsReview = filteredCount(captures, (item) => item.integrity_status === "review_required" || item.integrity_status === "rejected");
  const aiMismatchReview = filteredCount(mediaReviews, (item) => item.requires_admin_review === true && !item.resolved_at);
  const unresolvedNotifications = filteredCount(notifications, (item) => item.status !== "resolved");
  const recentDecisions = filteredCount(events, (item) => String(item.event_type || "").startsWith("admin_registration_"));
  const reviewerCount = events === null ? null : new Set(events.filter((item) => String(item.event_type || "").startsWith("admin_registration_")).map((item) => item.decided_by).filter(Boolean)).size;

  return {
    generatedAt: new Date().toISOString(),
    metrics: [
      { label: "Open registration cases", value: pendingCount, detail: "Latest unresolved business registrations", tone: pendingCount ? "warning" : "positive" },
      { label: "SLA risk 24h+", value: pending24, detail: "Cases approaching escalation", tone: pending24 ? "warning" : "positive" },
      { label: "SLA breach 72h+", value: pending72, detail: "Cases requiring immediate ownership", tone: pending72 ? "critical" : "positive" },
      { label: "GPS evidence review", value: gpsReview, detail: "Capture integrity review or rejection", tone: gpsReview ? "warning" : "positive" },
      { label: "AI mismatch review", value: aiMismatchReview, detail: "Unresolved listing-media mismatches", tone: aiMismatchReview ? "critical" : "positive" },
      { label: "Recent account actions", value: accountActions?.length ?? null, detail: "Suspension and activation actions in 30 days", tone: "neutral" },
    ],
    queues: [
      { label: "Business verification", count: pendingCount, detail: "Registration cases requiring human decision", href: "/admin/verification-workbench", priority: pending72 ? "urgent" : "attention" },
      { label: "Document intelligence", count: documentReview, detail: "Low-confidence or inconsistent documents", href: "/admin/verification-reviews", priority: "attention" },
      { label: "Cross-verification mismatches", count: crossReview, detail: "Duplicate or identity mismatch review", href: "/admin/verification-reviews", priority: crossReview ? "urgent" : "normal" },
      { label: "Skilled worker verification", count: professionalReview, detail: "Identity, evidence or contractor-risk review", href: "/admin/individual-professional-reviews", priority: "attention" },
      { label: "Live selfie review", count: selfieReview, detail: "Professional selfie evidence requiring review", href: "/admin/individual-professional-reviews", priority: "attention" },
      { label: "Property verification", count: properties?.length ?? null, detail: "Pending property publication decisions", href: "/admin/property", priority: "attention" },
      { label: "Builder verification", count: builders?.length ?? null, detail: "Pending builder-project decisions", href: "/admin/property/projects", priority: "attention" },
      { label: "GPS evidence integrity", count: gpsReview, detail: "Trusted capture sessions requiring investigation", href: "/admin/property", priority: gpsReview ? "urgent" : "normal" },
      { label: "AI media mismatch", count: aiMismatchReview, detail: "Human override or correction decision", href: "/admin/property", priority: aiMismatchReview ? "urgent" : "normal" },
      { label: "Fraud and suspension", count: unresolvedNotifications, detail: "Operational alerts and account restriction workflow", href: "/admin/verification-notifications", priority: unresolvedNotifications ? "urgent" : "normal" },
    ],
    oldestCases,
    recentDecisionCount: recentDecisions,
    activeReviewerCount: reviewerCount,
    unresolvedNotificationCount: unresolvedNotifications,
    issues,
  };
}
