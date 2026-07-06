export type SmartReengagementNotification = {
  id: string;
  title: string;
  message: string;
  href: string;
  cta: string;
  priority: "low" | "normal" | "high" | "urgent";
  icon: string;
};

export function buildBuyerSmartNotifications(input: {
  totalRfqs: number;
  activeRfqs: number;
  urgentRfqs: number;
  memoryCount: number;
  recentRfqs?: Array<{
    id?: string | null;
    title?: string | null;
    status?: string | null;
    needed_by?: string | null;
  }>;
}): SmartReengagementNotification[] {
  const rows: SmartReengagementNotification[] = [];

  if (input.totalRfqs === 0) {
    rows.push({
      id: "buyer-start-rfq",
      title: "Start your first smart requirement",
      message: "Post one requirement and 3Bigha can begin vendor matching, quote comparison and follow-up intelligence.",
      href: "/rfq",
      cta: "Post Requirement",
      priority: "high",
      icon: "🚀",
    });
  }

  if (input.urgentRfqs > 0) {
    rows.push({
      id: "buyer-urgent-rfqs",
      title: `${input.urgentRfqs} urgent requirement${input.urgentRfqs > 1 ? "s" : ""}`,
      message: "Some requirements are close to their needed date. Review quotes or continue vendor conversations today.",
      href: "/dashboard/buyer/rfqs",
      cta: "Review RFQs",
      priority: "urgent",
      icon: "⏰",
    });
  }

  if (input.activeRfqs > 0) {
    rows.push({
      id: "buyer-active-followup",
      title: "Active procurement follow-up needed",
      message: `${input.activeRfqs} active RFQ${input.activeRfqs > 1 ? "s" : ""} can still become deals if you compare vendors and reply quickly.`,
      href: "/dashboard/inbox-v2",
      cta: "Open Inbox",
      priority: "high",
      icon: "💬",
    });
  }

  if (input.memoryCount > 0) {
    rows.push({
      id: "buyer-reuse-memory",
      title: "Reuse your procurement memory",
      message: `${input.memoryCount} saved buying signal${input.memoryCount > 1 ? "s" : ""} can help draft your next requirement faster.`,
      href: "/rfq",
      cta: "Use Memory",
      priority: "normal",
      icon: "🧠",
    });
  }

  rows.push({
    id: "buyer-marketplace-discovery",
    title: "Discover related marketplace options",
    message: "Explore properties, materials, services and rentals from one search flow based on your buying activity.",
    href: "/search",
    cta: "Explore",
    priority: "normal",
    icon: "✨",
  });

  return rows.slice(0, 4);
}

export function buildVendorSmartNotifications(input: {
  newLeadCount: number;
  unreadNotificationCount: number;
  missedLeads: number;
  readyDeals: number;
  replyRate: number;
  estimatedRank: number;
  growthVisibilityScore: number;
  priceNeedsCorrection: number;
}): SmartReengagementNotification[] {
  const rows: SmartReengagementNotification[] = [];

  if (input.newLeadCount > 0) {
    rows.push({
      id: "vendor-new-leads",
      title: `${input.newLeadCount} new buyer lead${input.newLeadCount > 1 ? "s" : ""}`,
      message: "Reply quickly to improve conversion probability and vendor ranking signals.",
      href: "/dashboard/vendor/enquiries",
      cta: "Open Leads",
      priority: "urgent",
      icon: "🔥",
    });
  }

  if (input.missedLeads > 0) {
    rows.push({
      id: "vendor-missed-followups",
      title: "Follow-up opportunity detected",
      message: `${input.missedLeads} lead${input.missedLeads > 1 ? "s" : ""} may need attention before buyers move to competitors.`,
      href: "/dashboard/inbox-v2",
      cta: "Follow Up",
      priority: "high",
      icon: "📞",
    });
  }

  if (input.readyDeals > 0) {
    rows.push({
      id: "vendor-ready-deals",
      title: `${input.readyDeals} deal-ready signal${input.readyDeals > 1 ? "s" : ""}`,
      message: "Some conversations show strong buying intent. Move them toward quotation or closure.",
      href: "/dashboard/inbox-v2",
      cta: "Close Deals",
      priority: "high",
      icon: "🤝",
    });
  }

  if (input.replyRate < 40) {
    rows.push({
      id: "vendor-reply-rate",
      title: "Reply rate needs improvement",
      message: `Your current reply rate is ${input.replyRate}%. Faster replies can improve buyer trust and lead visibility.`,
      href: "/dashboard/vendor/enquiries",
      cta: "Improve Reply",
      priority: "high",
      icon: "⚡",
    });
  }

  if (input.estimatedRank >= 5) {
    rows.push({
      id: "vendor-rank-risk",
      title: "Visibility risk detected",
      message: `Your estimated rank is #${input.estimatedRank}. Boosting visibility can help buyers find you faster.`,
      href: "/dashboard/subscription/boost",
      cta: "Improve Rank",
      priority: "high",
      icon: "📈",
    });
  }

  if (input.priceNeedsCorrection > 0) {
    rows.push({
      id: "vendor-price-correction",
      title: "Pricing correction recommended",
      message: `${input.priceNeedsCorrection} price update${input.priceNeedsCorrection > 1 ? "s" : ""} may be hurting buyer conversion.`,
      href: "/vendor/price-updates/new",
      cta: "Update Price",
      priority: "normal",
      icon: "💡",
    });
  }

  return rows.slice(0, 5);
}