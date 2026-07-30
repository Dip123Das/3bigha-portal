import type { BusinessOsProjection } from "@/components/3bos/framework";

export type VendorBusinessOsProjectionInput = {
  businessName: string;
  businessSubtitle?: string;
  profileImageUrl?: string | null;
  profileComplete?: boolean;
  active?: boolean;
  readinessPercent?: number | null;
  activeSegmentCount?: number;
  unreadAlerts?: number;
  buyerConversations?: number;
  assignedRfqs?: number;
  activeListings?: number;
  priceSignals?: number;
  completedDeals?: number;
  readyDeals?: number;
};

function safeCount(value: number | null | undefined) {
  return Math.max(0, Number.isFinite(Number(value)) ? Number(value) : 0);
}

function readinessLabel(value: number | null | undefined) {
  if (value === null || value === undefined) return "Readiness pending";
  return `${Math.max(0, Math.min(100, Math.round(value)))}% ready`;
}

export function createVendorBusinessOsProjection(
  input: VendorBusinessOsProjectionInput,
): BusinessOsProjection {
  const unreadAlerts = safeCount(input.unreadAlerts);
  const buyerConversations = safeCount(input.buyerConversations);
  const assignedRfqs = safeCount(input.assignedRfqs);
  const activeListings = safeCount(input.activeListings);
  const priceSignals = safeCount(input.priceSignals);
  const completedDeals = safeCount(input.completedDeals);
  const readyDeals = safeCount(input.readyDeals);
  const activeSegmentCount = safeCount(input.activeSegmentCount);

  const totalAttention = unreadAlerts + buyerConversations + assignedRfqs;
  const primaryLabel =
    buyerConversations > 0
      ? `Reply to ${buyerConversations} buyer conversation${buyerConversations === 1 ? "" : "s"}`
      : assignedRfqs > 0
        ? `Review ${assignedRfqs} assigned RFQ${assignedRfqs === 1 ? "" : "s"}`
        : unreadAlerts > 0
          ? `Review ${unreadAlerts} business alert${unreadAlerts === 1 ? "" : "s"}`
          : "Continue Today's Work";

  const primaryHref =
    buyerConversations > 0
      ? "/dashboard/vendor/enquiries"
      : assignedRfqs > 0
        ? "/dashboard/vendor/rfqs"
        : unreadAlerts > 0
          ? "/dashboard/vendor/notifications"
          : "/dashboard/vendor/workspace";

  return {
    identity: {
      eyebrow: "Today's business",
      title: input.businessName || "My Business",
      subtitle:
        input.businessSubtitle ??
        `Vendor Hub${activeSegmentCount > 0 ? ` · ${activeSegmentCount} active segment${activeSegmentCount === 1 ? "" : "s"}` : ""}${
          totalAttention > 0 ? ` · ${totalAttention} update${totalAttention === 1 ? "" : "s"} need attention` : ""
        }`,
      imageUrl: input.profileImageUrl ?? null,
      trustLabels: [
        input.profileComplete ? "Profile complete" : "Profile needs attention",
        input.active ? "Active" : "Activation pending",
        readinessLabel(input.readinessPercent),
      ],
    },

    primaryAction: {
      key: "continue-work",
      label: primaryLabel,
      href: primaryHref,
      tone: totalAttention > 0 ? "primary" : "success",
    },

    workNow: [
      {
        key: "sell-manage",
        label: "Sell & Manage",
        description: "Listings, products and services",
        href: "/dashboard/vendor/workspace",
        icon: "▤",
        tone: "primary",
        count: activeListings,
      },
      {
        key: "find-opportunities",
        label: "Find Opportunities",
        description: "Review assigned requirements",
        href: "/dashboard/vendor/rfqs",
        icon: "◫",
        tone: assignedRfqs > 0 ? "warning" : "neutral",
        count: assignedRfqs,
      },
      {
        key: "talk-buyers",
        label: "Talk to Buyers",
        description: "Reply and move discussions forward",
        href: "/dashboard/vendor/enquiries",
        icon: "✉",
        tone: buyerConversations > 0 ? "success" : "neutral",
        count: buyerConversations,
      },
      {
        key: "review-performance",
        label: "Review Performance",
        description: "Understand activity and progress",
        href: "/dashboard/vendor/inventory-intelligence",
        icon: "↗",
        tone: "signal",
      },
    ],

    journey: [
      {
        key: "opportunity",
        label: "Opportunities",
        description: "New RFQs and buyer requirements",
        href: "/dashboard/vendor/rfqs",
        status: assignedRfqs > 0 ? "current" : "upcoming",
      },
      {
        key: "conversation",
        label: "Conversations",
        description: "Understand needs and agree next steps",
        href: "/dashboard/vendor/enquiries",
        status: buyerConversations > 0 ? "current" : assignedRfqs > 0 ? "upcoming" : "complete",
      },
      {
        key: "quotation",
        label: "Quotations",
        description: "Send clear price and delivery terms",
        href: "/dashboard/vendor/rfqs",
        status: assignedRfqs > 0 ? "current" : "upcoming",
      },
      {
        key: "orders",
        label: "Orders & Deals",
        description: "Manage confirmed business work",
        href: "/dashboard/vendor/workspace",
        status: readyDeals > 0 ? "current" : completedDeals > 0 ? "complete" : "upcoming",
      },
      {
        key: "delivery",
        label: "Delivery",
        description: "Dispatch and fulfil commitments",
        href: "/dashboard/vendor/dispatch",
        status: readyDeals > 0 ? "current" : "upcoming",
      },
      {
        key: "payment",
        label: "Payments",
        description: "Billing and payment records",
        href: "/dashboard/vendor/billing",
        status: completedDeals > 0 ? "complete" : "upcoming",
      },
    ],

    priorities: [
      {
        key: "unread-alerts",
        label: "Unread vendor alerts",
        description: "Review time-sensitive opportunities",
        href: "/dashboard/vendor/notifications",
        count: unreadAlerts,
        tone: unreadAlerts > 0 ? "warning" : "neutral",
      },
      {
        key: "buyer-conversations",
        label: "Buyer conversations",
        description: "Reply and move discussions forward",
        href: "/dashboard/vendor/enquiries",
        count: buyerConversations,
        tone: buyerConversations > 0 ? "success" : "neutral",
      },
      {
        key: "assigned-rfqs",
        label: "Assigned RFQs",
        description: "Open matching requirements",
        href: "/dashboard/vendor/rfqs",
        count: assignedRfqs,
        tone: assignedRfqs > 0 ? "primary" : "neutral",
      },
    ],

    pulse: [
      {
        key: "rfqs",
        label: "RFQs",
        value: assignedRfqs,
        description: "Assigned to you",
        href: "/dashboard/vendor/rfqs",
        tone: "primary",
      },
      {
        key: "messages",
        label: "Messages",
        value: buyerConversations,
        description: "Open conversations",
        href: "/dashboard/vendor/enquiries",
        tone: "success",
      },
      {
        key: "alerts",
        label: "Alerts",
        value: unreadAlerts,
        description: unreadAlerts > 0 ? "Need attention" : "Nothing urgent",
        href: "/dashboard/vendor/notifications",
        tone: "warning",
      },
      {
        key: "price-signals",
        label: "Price signals",
        value: priceSignals,
        description: "New market updates",
        href: "/vendor/price-updates/new",
        tone: "signal",
      },
    ],

    assistance: {
      eyebrow: "3BOS assistance",
      title:
        buyerConversations > 0
          ? `Reply to ${buyerConversations} active buyer conversation${buyerConversations === 1 ? "" : "s"}`
          : assignedRfqs > 0
            ? `Review ${assignedRfqs} matching requirement${assignedRfqs === 1 ? "" : "s"}`
            : unreadAlerts > 0
              ? `Review ${unreadAlerts} vendor alert${unreadAlerts === 1 ? "" : "s"}`
              : "Your immediate work is under control",
      description:
        buyerConversations > 0
          ? "Buyers are waiting for your response. Replying now can move work towards quotation and order."
          : assignedRfqs > 0
            ? "Open the most relevant RFQ first and decide whether to quote."
            : unreadAlerts > 0
              ? "Start with the most time-sensitive alert and keep the final decision under your control."
              : "Use the workspace to manage listings, opportunities, orders and payments.",
      action: {
        key: "assistance-action",
        label: totalAttention > 0 ? "Take Action" : "Open Workspace",
        href: primaryHref,
        tone: "success",
      },
    },

    mobileNavigation: [
      {
        key: "home",
        label: "Home",
        href: "/dashboard/vendor",
        icon: "▦",
      },
      {
        key: "rfqs",
        label: "RFQs",
        href: "/dashboard/vendor/rfqs",
        icon: "◫",
        count: assignedRfqs,
      },
      {
        key: "inbox",
        label: "Inbox",
        href: "/dashboard/vendor/enquiries",
        icon: "✉",
        count: buyerConversations,
      },
      {
        key: "listings",
        label: "Listings",
        href: "/dashboard/vendor/workspace",
        icon: "▤",
        count: activeListings,
      },
    ],
  };
}
