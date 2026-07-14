import type { CapabilityKey } from "../capability";

export type ActionKind =
  | "human_core"
  | "human_advanced"
  | "ai_prepare"
  | "ai_analyse"
  | "ai_recommend"
  | "ai_automate"
  | "administrative";

export type AiCapabilityGroup =
  | "drafting"
  | "analysis"
  | "recommendations"
  | "automation"
  | "marketplace_intelligence"
  | "business_insights";

export type EntitlementActionDefinition = {
  action: string;
  label: string;
  description: string;
  parentCapability: CapabilityKey;
  kind: ActionKind;
  aiGroup?: AiCapabilityGroup;
  humanDecisionRequired: boolean;
  serverEnforcementRecommended: boolean;
  freeHumanAlternative?: string | null;
  routeHints?: readonly string[];
};

function action<T extends EntitlementActionDefinition>(value: T): T {
  return Object.freeze(value);
}

export const ENTITLEMENT_ACTION_CATALOGUE = Object.freeze({
  "profile.view": action({
    action: "profile.view",
    label: "View profile",
    description: "View a human or business profile.",
    parentCapability: "business_profile",
    kind: "human_core",
    humanDecisionRequired: false,
    serverEnforcementRecommended: false,
    routeHints: ["/vendor/[slug]", "/settings"],
  }),
  "profile.manage": action({
    action: "profile.manage",
    label: "Manage profile",
    description: "Maintain identity, contact and business information.",
    parentCapability: "business_profile",
    kind: "human_core",
    humanDecisionRequired: true,
    serverEnforcementRecommended: true,
    routeHints: ["/onboarding/business", "/settings"],
  }),
  "rfq.create.manual": action({
    action: "rfq.create.manual",
    label: "Create requirement manually",
    description: "Create an RFQ through a human-led form.",
    parentCapability: "rfq",
    kind: "human_core",
    humanDecisionRequired: true,
    serverEnforcementRecommended: true,
    routeHints: ["/rfq", "/rfq/new", "/rfq/general/new"],
  }),
  "rfq.review": action({
    action: "rfq.review",
    label: "Review requirement",
    description: "Review and edit RFQ information before submission.",
    parentCapability: "rfq",
    kind: "human_core",
    humanDecisionRequired: true,
    serverEnforcementRecommended: false,
    routeHints: ["/rfq/review"],
  }),
  "rfq.submit": action({
    action: "rfq.submit",
    label: "Submit requirement",
    description: "Submit a human-confirmed RFQ.",
    parentCapability: "rfq",
    kind: "human_core",
    humanDecisionRequired: true,
    serverEnforcementRecommended: true,
    routeHints: ["/api/rfq/create"],
  }),
  "rfq.manage": action({
    action: "rfq.manage",
    label: "Manage requirements",
    description: "Track RFQ status, responses, conversations and outcomes.",
    parentCapability: "rfq",
    kind: "human_core",
    humanDecisionRequired: true,
    serverEnforcementRecommended: true,
    routeHints: ["/dashboard/buyer/rfqs"],
  }),
  "rfq.respond": action({
    action: "rfq.respond",
    label: "Respond to requirement",
    description: "Review and respond to matching RFQs.",
    parentCapability: "rfq",
    kind: "human_core",
    humanDecisionRequired: true,
    serverEnforcementRecommended: true,
    routeHints: ["/dashboard/vendor/rfqs", "/vendor/inbox-v2"],
  }),
  "quote.create": action({
    action: "quote.create",
    label: "Create quotation",
    description: "Prepare and submit a quotation.",
    parentCapability: "rfq",
    kind: "human_core",
    humanDecisionRequired: true,
    serverEnforcementRecommended: true,
    routeHints: ["/dashboard/vendor/rfqs/[id]"],
  }),
  "quote.compare.manual": action({
    action: "quote.compare.manual",
    label: "Compare quotations manually",
    description: "Compare quotations using human judgement.",
    parentCapability: "rfq",
    kind: "human_core",
    humanDecisionRequired: true,
    serverEnforcementRecommended: true,
    routeHints: ["/dashboard/buyer/quote-compare/[rfqId]"],
  }),
  "quote.accept": action({
    action: "quote.accept",
    label: "Accept quotation",
    description: "Select a quotation through explicit confirmation.",
    parentCapability: "rfq",
    kind: "human_core",
    humanDecisionRequired: true,
    serverEnforcementRecommended: true,
    routeHints: ["/api/buyer/rfq/[rfqId]/accept"],
  }),
  "conversation.read": action({
    action: "conversation.read",
    label: "Read conversations",
    description: "Read authorised business conversations.",
    parentCapability: "communication",
    kind: "human_core",
    humanDecisionRequired: false,
    serverEnforcementRecommended: true,
    routeHints: ["/dashboard/inbox-v2", "/dashboard/thread/[conversationId]"],
  }),
  "conversation.send": action({
    action: "conversation.send",
    label: "Send message",
    description: "Send a human-authored message.",
    parentCapability: "communication",
    kind: "human_core",
    humanDecisionRequired: true,
    serverEnforcementRecommended: true,
    routeHints: ["/api/conversations/[conversationId]/messages"],
  }),
  "marketplace.search": action({
    action: "marketplace.search",
    label: "Search marketplace",
    description: "Search property, materials, services and rentals.",
    parentCapability: "marketplace",
    kind: "human_core",
    humanDecisionRequired: false,
    serverEnforcementRecommended: false,
    routeHints: ["/search", "/property", "/materials", "/services", "/rentals"],
  }),
  "marketplace.listing.create": action({
    action: "marketplace.listing.create",
    label: "Create listing",
    description: "Create a marketplace listing.",
    parentCapability: "marketplace",
    kind: "human_core",
    humanDecisionRequired: true,
    serverEnforcementRecommended: true,
    routeHints: ["/property/add", "/materials/add", "/services/add", "/rentals/add"],
  }),
  "marketplace.listing.manage": action({
    action: "marketplace.listing.manage",
    label: "Manage listings",
    description: "Review and manage owned listings.",
    parentCapability: "marketplace",
    kind: "human_core",
    humanDecisionRequired: true,
    serverEnforcementRecommended: true,
    routeHints: ["/property/my", "/materials/my", "/services/my", "/rentals/my"],
  }),
  "marketplace.listing.boost": action({
    action: "marketplace.listing.boost",
    label: "Boost marketplace visibility",
    description: "Use transparent paid promotion.",
    parentCapability: "promotion",
    kind: "human_advanced",
    humanDecisionRequired: true,
    serverEnforcementRecommended: true,
    routeHints: ["/dashboard/subscription/boost"],
  }),
  "inventory.view": action({
    action: "inventory.view",
    label: "View inventory",
    description: "Review stock, assets and availability.",
    parentCapability: "inventory",
    kind: "human_core",
    humanDecisionRequired: false,
    serverEnforcementRecommended: true,
    routeHints: ["/dashboard/vendor/inventory"],
  }),
  "inventory.manage": action({
    action: "inventory.manage",
    label: "Manage inventory",
    description: "Create and update inventory records.",
    parentCapability: "inventory",
    kind: "human_advanced",
    humanDecisionRequired: true,
    serverEnforcementRecommended: true,
    routeHints: ["/dashboard/vendor/inventory"],
  }),
  "billing.create": action({
    action: "billing.create",
    label: "Create bill or invoice",
    description: "Prepare billing records for review and issue.",
    parentCapability: "billing",
    kind: "human_advanced",
    humanDecisionRequired: true,
    serverEnforcementRecommended: true,
    routeHints: ["/dashboard/vendor/billing"],
  }),
  "dispatch.manage": action({
    action: "dispatch.manage",
    label: "Manage dispatch",
    description: "Coordinate delivery and dispatch activity.",
    parentCapability: "dispatch",
    kind: "human_advanced",
    humanDecisionRequired: true,
    serverEnforcementRecommended: true,
    routeHints: ["/dashboard/vendor/dispatch"],
  }),
  "fleet.manage": action({
    action: "fleet.manage",
    label: "Manage fleet",
    description: "Maintain vehicles and operating assets.",
    parentCapability: "fleet",
    kind: "human_advanced",
    humanDecisionRequired: true,
    serverEnforcementRecommended: true,
    routeHints: ["/dashboard/vendor/fleet"],
  }),
  "project.manage": action({
    action: "project.manage",
    label: "Manage project",
    description: "Coordinate construction or builder projects.",
    parentCapability: "project_management",
    kind: "human_advanced",
    humanDecisionRequired: true,
    serverEnforcementRecommended: true,
    routeHints: ["/dashboard/construction-projects", "/property/builder/projects"],
  }),
  "finance.manage": action({
    action: "finance.manage",
    label: "Manage finance work",
    description: "Work with authorised finance leads and offers.",
    parentCapability: "finance",
    kind: "human_advanced",
    humanDecisionRequired: true,
    serverEnforcementRecommended: true,
    routeHints: ["/dashboard/banker"],
  }),
  "investment.manage": action({
    action: "investment.manage",
    label: "Manage investment activity",
    description: "Review opportunities, applications and deal rooms.",
    parentCapability: "investment",
    kind: "human_advanced",
    humanDecisionRequired: true,
    serverEnforcementRecommended: true,
    routeHints: ["/dashboard/investor"],
  }),
  "knowledge.publish": action({
    action: "knowledge.publish",
    label: "Publish knowledge",
    description: "Create and publish professional articles.",
    parentCapability: "knowledge",
    kind: "human_advanced",
    humanDecisionRequired: true,
    serverEnforcementRecommended: true,
    routeHints: ["/blog/new", "/blog/my"],
  }),
  "analytics.basic": action({
    action: "analytics.basic",
    label: "View basic insights",
    description: "View essential activity summaries.",
    parentCapability: "business_insights",
    kind: "human_advanced",
    humanDecisionRequired: false,
    serverEnforcementRecommended: true,
  }),
  "analytics.advanced": action({
    action: "analytics.advanced",
    label: "View advanced insights",
    description: "Use deeper business and marketplace analysis.",
    parentCapability: "business_insights",
    kind: "human_advanced",
    humanDecisionRequired: false,
    serverEnforcementRecommended: true,
  }),
  "ai.rfq.prepare": action({
    action: "ai.rfq.prepare",
    label: "Prepare RFQ with AI assistance",
    description: "Let AI prepare an RFQ draft for human review.",
    parentCapability: "intelligent_assistance",
    kind: "ai_prepare",
    aiGroup: "drafting",
    humanDecisionRequired: true,
    serverEnforcementRecommended: true,
    freeHumanAlternative: "Continue creating the RFQ manually.",
    routeHints: ["/api/ai/rfq-generator", "/api/ai/smart-fill"],
  }),
  "ai.quote.analyse": action({
    action: "ai.quote.analyse",
    label: "Analyse quotations with AI",
    description: "Prepare comparison and risk observations.",
    parentCapability: "intelligent_assistance",
    kind: "ai_analyse",
    aiGroup: "analysis",
    humanDecisionRequired: true,
    serverEnforcementRecommended: true,
    freeHumanAlternative: "Continue comparing quotations manually.",
    routeHints: ["/api/ai/quote-risk-analysis", "/api/ai/smart-decision"],
  }),
  "ai.message.suggest": action({
    action: "ai.message.suggest",
    label: "Prepare message suggestion",
    description: "Prepare a message draft for human editing.",
    parentCapability: "intelligent_assistance",
    kind: "ai_prepare",
    aiGroup: "drafting",
    humanDecisionRequired: true,
    serverEnforcementRecommended: true,
    freeHumanAlternative: "Write and send the message manually.",
    routeHints: ["/api/ai/chat-reply-suggestions"],
  }),
  "ai.listing.prepare": action({
    action: "ai.listing.prepare",
    label: "Prepare listing with AI",
    description: "Prepare listing content for human review.",
    parentCapability: "intelligent_assistance",
    kind: "ai_prepare",
    aiGroup: "drafting",
    humanDecisionRequired: true,
    serverEnforcementRecommended: true,
    freeHumanAlternative: "Continue creating the listing manually.",
  }),
  "ai.price.recommend": action({
    action: "ai.price.recommend",
    label: "Prepare price recommendation",
    description: "Prepare price observations for human decision.",
    parentCapability: "intelligent_assistance",
    kind: "ai_recommend",
    aiGroup: "recommendations",
    humanDecisionRequired: true,
    serverEnforcementRecommended: true,
    freeHumanAlternative: "Enter or assess the price manually.",
    routeHints: ["/api/ai/price-suggestion", "/api/ai/price-prediction"],
  }),
  "ai.document.analyse": action({
    action: "ai.document.analyse",
    label: "Analyse document with AI",
    description: "Prepare observations from drawings or documents.",
    parentCapability: "intelligent_assistance",
    kind: "ai_analyse",
    aiGroup: "analysis",
    humanDecisionRequired: true,
    serverEnforcementRecommended: true,
    freeHumanAlternative: "Review the document manually or with a qualified professional.",
    routeHints: ["/api/construction-drawing/analyze"],
  }),
  "ai.marketplace.insight": action({
    action: "ai.marketplace.insight",
    label: "View marketplace intelligence",
    description: "Use AI-supported marketplace and opportunity insights.",
    parentCapability: "business_insights",
    kind: "ai_analyse",
    aiGroup: "marketplace_intelligence",
    humanDecisionRequired: true,
    serverEnforcementRecommended: true,
    freeHumanAlternative: "Continue browsing and comparing information manually.",
    routeHints: ["/api/ai/marketplace-discovery", "/admin/dashboard/marketplace-intelligence"],
  }),
  "ai.business.insight": action({
    action: "ai.business.insight",
    label: "View AI-supported business insight",
    description: "Prepare business performance observations.",
    parentCapability: "business_insights",
    kind: "ai_analyse",
    aiGroup: "business_insights",
    humanDecisionRequired: true,
    serverEnforcementRecommended: true,
    freeHumanAlternative: "Continue using basic operational summaries.",
  }),
  "ai.workflow.automate": action({
    action: "ai.workflow.automate",
    label: "Use AI workflow automation",
    description: "Use governed AI assistance for approved operational steps.",
    parentCapability: "intelligent_assistance",
    kind: "ai_automate",
    aiGroup: "automation",
    humanDecisionRequired: true,
    serverEnforcementRecommended: true,
    freeHumanAlternative: "Continue the workflow manually.",
    routeHints: ["/api/ai/execute-task", "/api/ai/autonomous-execution"],
  }),
  "team.manage": action({
    action: "team.manage",
    label: "Manage team members",
    description: "Coordinate authorised team members.",
    parentCapability: "enterprise",
    kind: "human_advanced",
    humanDecisionRequired: true,
    serverEnforcementRecommended: true,
  }),
  "branch.manage": action({
    action: "branch.manage",
    label: "Manage branches",
    description: "Coordinate multiple operating branches.",
    parentCapability: "enterprise",
    kind: "human_advanced",
    humanDecisionRequired: true,
    serverEnforcementRecommended: true,
  }),
  "admin.subscription.manage": action({
    action: "admin.subscription.manage",
    label: "Manage subscriptions administratively",
    description: "Administer subscriptions under authorised governance.",
    parentCapability: "enterprise",
    kind: "administrative",
    humanDecisionRequired: true,
    serverEnforcementRecommended: true,
    routeHints: ["/api/admin/update-subscription"],
  }),
} as const);

export type EntitlementActionKey =
  keyof typeof ENTITLEMENT_ACTION_CATALOGUE;

export function getEntitlementAction(
  key: EntitlementActionKey
): EntitlementActionDefinition {
  return ENTITLEMENT_ACTION_CATALOGUE[key];
}

export function getActionsByCapability(
  capability: CapabilityKey
): EntitlementActionDefinition[] {
  return Object.values(ENTITLEMENT_ACTION_CATALOGUE).filter(
    (item) => item.parentCapability === capability
  );
}

export function getAiActions(): EntitlementActionDefinition[] {
  return Object.values(ENTITLEMENT_ACTION_CATALOGUE).filter(
    (item) => item.kind.startsWith("ai_")
  );
}
