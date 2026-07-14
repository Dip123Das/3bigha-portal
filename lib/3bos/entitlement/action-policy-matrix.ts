import type { GrowthPlanKey } from "../capability";
import type { HumanIdentityKey } from "../identity";
import type { WorkspaceKey } from "../workspace";
import {
  ENTITLEMENT_ACTION_CATALOGUE,
  type EntitlementActionDefinition,
  type EntitlementActionKey,
} from "./action-catalogue";
import type {
  EntitlementActionPolicy,
  EntitlementVerificationRequirement,
} from "./types";

export type PlanAllowance = {
  available: boolean;
  limit?: number | null;
  note?: string;
};

export type EntitlementPolicyDefinition = {
  action: EntitlementActionKey;
  applicableIdentities?: readonly HumanIdentityKey[];
  applicableWorkspaces?: readonly WorkspaceKey[];
  verificationRequired?: readonly EntitlementVerificationRequirement[];
  planAllowances: Readonly<Record<GrowthPlanKey, PlanAllowance>>;
  upgradeHref?: string;
  commercialReviewRequired?: boolean;
};

const allPlans = (input: {
  start: PlanAllowance;
  grow?: PlanAllowance;
  manage?: PlanAllowance;
  scale?: PlanAllowance;
}): Readonly<Record<GrowthPlanKey, PlanAllowance>> =>
  Object.freeze({
    start: Object.freeze(input.start),
    grow: Object.freeze(input.grow ?? input.start),
    manage: Object.freeze(input.manage ?? input.grow ?? input.start),
    scale: Object.freeze(
      input.scale ?? input.manage ?? input.grow ?? input.start
    ),
  });

const allowed = (limit: number | null = null, note?: string): PlanAllowance => ({
  available: true,
  limit,
  note,
});

const blocked = (note?: string): PlanAllowance => ({
  available: false,
  limit: 0,
  note,
});

const customerOnly: readonly HumanIdentityKey[] = ["customer"];
const businessWorkspaces: readonly WorkspaceKey[] = [
  "property",
  "builder",
  "construction_business",
  "contractor",
  "material_business",
  "rental_business",
  "professional",
  "legal_professional",
  "banker",
  "financial_institution",
  "investment",
  "skilled_workforce",
  "transport_business",
  "agriculture_business",
  "author",
  "multi_business",
];

const businessIdentities: readonly HumanIdentityKey[] = [
  "property_owner",
  "builder",
  "contractor",
  "material_business",
  "rental_business",
  "professional",
  "architect",
  "engineer",
  "lawyer",
  "banker",
  "financial_institution",
  "investor",
  "skilled_workforce",
  "transport_business",
  "farmer",
  "agriculture_business",
  "author",
  "institution",
];

export const ENTITLEMENT_POLICY_MATRIX: Readonly<
  Record<EntitlementActionKey, EntitlementPolicyDefinition>
> = Object.freeze({
  "profile.view": {
    action: "profile.view",
    planAllowances: allPlans({
      start: allowed(),
    }),
  },

  "profile.manage": {
    action: "profile.manage",
    planAllowances: allPlans({
      start: allowed(),
    }),
  },

  "rfq.create.manual": {
    action: "rfq.create.manual",
    applicableIdentities: customerOnly,
    applicableWorkspaces: ["customer"],
    planAllowances: allPlans({
      start: allowed(),
    }),
  },

  "rfq.review": {
    action: "rfq.review",
    applicableIdentities: customerOnly,
    applicableWorkspaces: ["customer"],
    planAllowances: allPlans({
      start: allowed(),
    }),
  },

  "rfq.submit": {
    action: "rfq.submit",
    applicableIdentities: customerOnly,
    applicableWorkspaces: ["customer"],
    planAllowances: allPlans({
      start: allowed(),
    }),
  },

  "rfq.manage": {
    action: "rfq.manage",
    applicableIdentities: customerOnly,
    applicableWorkspaces: ["customer"],
    planAllowances: allPlans({
      start: allowed(),
    }),
  },

  "rfq.respond": {
    action: "rfq.respond",
    applicableWorkspaces: businessWorkspaces,
    planAllowances: allPlans({
      start: allowed(10, "Essential RFQ response capacity."),
      grow: allowed(50, "Expanded RFQ response capacity."),
      manage: allowed(null, "Priority operational capacity."),
      scale: allowed(null, "Enterprise operating capacity."),
    }),
    commercialReviewRequired: true,
  },

  "quote.create": {
    action: "quote.create",
    applicableWorkspaces: businessWorkspaces,
    planAllowances: allPlans({
      start: allowed(10),
      grow: allowed(50),
      manage: allowed(null),
      scale: allowed(null),
    }),
    commercialReviewRequired: true,
  },

  "quote.compare.manual": {
    action: "quote.compare.manual",
    applicableIdentities: customerOnly,
    applicableWorkspaces: ["customer"],
    planAllowances: allPlans({
      start: allowed(),
    }),
  },

  "quote.accept": {
    action: "quote.accept",
    applicableIdentities: customerOnly,
    applicableWorkspaces: ["customer"],
    planAllowances: allPlans({
      start: allowed(),
    }),
  },

  "conversation.read": {
    action: "conversation.read",
    planAllowances: allPlans({
      start: allowed(),
    }),
  },

  "conversation.send": {
    action: "conversation.send",
    planAllowances: allPlans({
      start: allowed(),
    }),
  },

  "marketplace.search": {
    action: "marketplace.search",
    planAllowances: allPlans({
      start: allowed(),
    }),
  },

  "marketplace.listing.create": {
    action: "marketplace.listing.create",
    applicableIdentities: businessIdentities,
    applicableWorkspaces: businessWorkspaces,
    verificationRequired: ["location"],
    planAllowances: allPlans({
      start: allowed(3, "Essential marketplace participation."),
      grow: allowed(25),
      manage: allowed(100),
      scale: allowed(null),
    }),
    commercialReviewRequired: true,
  },

  "marketplace.listing.manage": {
    action: "marketplace.listing.manage",
    applicableIdentities: businessIdentities,
    applicableWorkspaces: businessWorkspaces,
    planAllowances: allPlans({
      start: allowed(),
    }),
  },

  "marketplace.listing.boost": {
    action: "marketplace.listing.boost",
    applicableIdentities: businessIdentities,
    applicableWorkspaces: businessWorkspaces,
    verificationRequired: ["business", "location"],
    planAllowances: allPlans({
      start: blocked("Paid marketplace promotion is not included."),
      grow: allowed(3, "Limited transparent promotion capacity."),
      manage: allowed(10),
      scale: allowed(null),
    }),
    commercialReviewRequired: true,
  },

  "inventory.view": {
    action: "inventory.view",
    applicableWorkspaces: businessWorkspaces,
    planAllowances: allPlans({
      start: allowed(),
    }),
  },

  "inventory.manage": {
    action: "inventory.manage",
    applicableWorkspaces: businessWorkspaces,
    planAllowances: allPlans({
      start: allowed(50, "Essential inventory capacity."),
      grow: allowed(500),
      manage: allowed(5000),
      scale: allowed(null),
    }),
    commercialReviewRequired: true,
  },

  "billing.create": {
    action: "billing.create",
    applicableWorkspaces: businessWorkspaces,
    verificationRequired: ["business"],
    planAllowances: allPlans({
      start: allowed(10, "Essential billing capacity."),
      grow: allowed(100),
      manage: allowed(1000),
      scale: allowed(null),
    }),
    commercialReviewRequired: true,
  },

  "dispatch.manage": {
    action: "dispatch.manage",
    applicableWorkspaces: [
      "material_business",
      "rental_business",
      "transport_business",
      "multi_business",
    ],
    verificationRequired: ["business", "location"],
    planAllowances: allPlans({
      start: blocked(),
      grow: allowed(25),
      manage: allowed(250),
      scale: allowed(null),
    }),
    commercialReviewRequired: true,
  },

  "fleet.manage": {
    action: "fleet.manage",
    applicableWorkspaces: [
      "rental_business",
      "transport_business",
      "multi_business",
    ],
    verificationRequired: ["business"],
    planAllowances: allPlans({
      start: blocked(),
      grow: allowed(5),
      manage: allowed(50),
      scale: allowed(null),
    }),
    commercialReviewRequired: true,
  },

  "project.manage": {
    action: "project.manage",
    applicableWorkspaces: [
      "builder",
      "construction_business",
      "contractor",
      "professional",
      "multi_business",
    ],
    verificationRequired: ["business"],
    planAllowances: allPlans({
      start: blocked(),
      grow: allowed(3),
      manage: allowed(25),
      scale: allowed(null),
    }),
    commercialReviewRequired: true,
  },

  "finance.manage": {
    action: "finance.manage",
    applicableWorkspaces: ["banker", "financial_institution", "multi_business"],
    verificationRequired: ["identity", "business"],
    planAllowances: allPlans({
      start: blocked(),
      grow: allowed(25),
      manage: allowed(250),
      scale: allowed(null),
    }),
    commercialReviewRequired: true,
  },

  "investment.manage": {
    action: "investment.manage",
    applicableWorkspaces: ["investment", "builder", "multi_business"],
    verificationRequired: ["identity"],
    planAllowances: allPlans({
      start: allowed(3),
      grow: allowed(25),
      manage: allowed(250),
      scale: allowed(null),
    }),
    commercialReviewRequired: true,
  },

  "knowledge.publish": {
    action: "knowledge.publish",
    applicableWorkspaces: ["author", "professional", "multi_business"],
    verificationRequired: ["identity"],
    planAllowances: allPlans({
      start: allowed(3),
      grow: allowed(25),
      manage: allowed(250),
      scale: allowed(null),
    }),
    commercialReviewRequired: true,
  },

  "analytics.basic": {
    action: "analytics.basic",
    applicableWorkspaces: businessWorkspaces,
    planAllowances: allPlans({
      start: blocked("Advanced business insights are not included."),
      grow: allowed(),
      manage: allowed(),
      scale: allowed(),
    }),
  },

  "analytics.advanced": {
    action: "analytics.advanced",
    applicableWorkspaces: businessWorkspaces,
    planAllowances: allPlans({
      start: blocked(),
      grow: blocked(),
      manage: allowed(),
      scale: allowed(),
    }),
  },

  "ai.rfq.prepare": {
    action: "ai.rfq.prepare",
    applicableIdentities: customerOnly,
    applicableWorkspaces: ["customer"],
    planAllowances: allPlans({
      start: allowed(1, "One assisted trial while manual RFQ remains available."),
      grow: allowed(25),
      manage: allowed(250),
      scale: allowed(null),
    }),
    commercialReviewRequired: true,
  },

  "ai.quote.analyse": {
    action: "ai.quote.analyse",
    applicableIdentities: customerOnly,
    applicableWorkspaces: ["customer"],
    planAllowances: allPlans({
      start: blocked("Manual quote comparison remains available."),
      grow: allowed(10),
      manage: allowed(100),
      scale: allowed(null),
    }),
    commercialReviewRequired: true,
  },

  "ai.message.suggest": {
    action: "ai.message.suggest",
    planAllowances: allPlans({
      start: allowed(3, "Limited drafting assistance."),
      grow: allowed(50),
      manage: allowed(500),
      scale: allowed(null),
    }),
    commercialReviewRequired: true,
  },

  "ai.listing.prepare": {
    action: "ai.listing.prepare",
    applicableIdentities: businessIdentities,
    applicableWorkspaces: businessWorkspaces,
    planAllowances: allPlans({
      start: allowed(1, "One assisted trial while manual listing remains available."),
      grow: allowed(25),
      manage: allowed(250),
      scale: allowed(null),
    }),
    commercialReviewRequired: true,
  },

  "ai.price.recommend": {
    action: "ai.price.recommend",
    applicableWorkspaces: businessWorkspaces,
    planAllowances: allPlans({
      start: blocked("Manual pricing remains available."),
      grow: allowed(10),
      manage: allowed(100),
      scale: allowed(null),
    }),
    commercialReviewRequired: true,
  },

  "ai.document.analyse": {
    action: "ai.document.analyse",
    applicableWorkspaces: [
      "builder",
      "construction_business",
      "contractor",
      "professional",
      "multi_business",
    ],
    verificationRequired: ["identity"],
    planAllowances: allPlans({
      start: blocked("Manual and professional review remain available."),
      grow: allowed(5),
      manage: allowed(50),
      scale: allowed(null),
    }),
    commercialReviewRequired: true,
  },

  "ai.marketplace.insight": {
    action: "ai.marketplace.insight",
    applicableWorkspaces: businessWorkspaces,
    planAllowances: allPlans({
      start: blocked("Manual marketplace browsing remains available."),
      grow: allowed(10),
      manage: allowed(100),
      scale: allowed(null),
    }),
    commercialReviewRequired: true,
  },

  "ai.business.insight": {
    action: "ai.business.insight",
    applicableWorkspaces: businessWorkspaces,
    planAllowances: allPlans({
      start: blocked("Basic operational summaries remain available."),
      grow: blocked(),
      manage: allowed(50),
      scale: allowed(null),
    }),
    commercialReviewRequired: true,
  },

  "ai.workflow.automate": {
    action: "ai.workflow.automate",
    applicableWorkspaces: businessWorkspaces,
    verificationRequired: ["identity", "business"],
    planAllowances: allPlans({
      start: blocked("Manual workflow remains available."),
      grow: blocked("Manual workflow remains available."),
      manage: allowed(25),
      scale: allowed(null),
    }),
    commercialReviewRequired: true,
  },

  "team.manage": {
    action: "team.manage",
    applicableWorkspaces: businessWorkspaces,
    verificationRequired: ["business"],
    planAllowances: allPlans({
      start: allowed(1),
      grow: allowed(3),
      manage: allowed(10),
      scale: allowed(null),
    }),
  },

  "branch.manage": {
    action: "branch.manage",
    applicableWorkspaces: businessWorkspaces,
    verificationRequired: ["business"],
    planAllowances: allPlans({
      start: allowed(1),
      grow: allowed(1),
      manage: allowed(3),
      scale: allowed(null),
    }),
  },

  "admin.subscription.manage": {
    action: "admin.subscription.manage",
    applicableWorkspaces: ["multi_business"],
    verificationRequired: ["identity"],
    planAllowances: allPlans({
      start: allowed(),
      grow: allowed(),
      manage: allowed(),
      scale: allowed(),
    }),
  },
});

const planOrder: readonly GrowthPlanKey[] = [
  "start",
  "grow",
  "manage",
  "scale",
];

export function getEntitlementPolicyDefinition(
  action: EntitlementActionKey
): EntitlementPolicyDefinition {
  return ENTITLEMENT_POLICY_MATRIX[action];
}

export function getMinimumAvailablePlan(
  action: EntitlementActionKey
): GrowthPlanKey {
  const definition = getEntitlementPolicyDefinition(action);

  return (
    planOrder.find(
      (plan) => definition.planAllowances[plan].available
    ) ?? "scale"
  );
}

export function getActionPolicyForPlan(input: {
  action: EntitlementActionKey;
  plan: GrowthPlanKey;
}): EntitlementActionPolicy {
  const catalogue: EntitlementActionDefinition =
    ENTITLEMENT_ACTION_CATALOGUE[input.action];
  const policy = ENTITLEMENT_POLICY_MATRIX[input.action];
  const allowance = policy.planAllowances[input.plan];

  return Object.freeze({
    action: catalogue.action,
    label: catalogue.label,
    description: catalogue.description,
    parentCapability: catalogue.parentCapability,

    applicableIdentities: policy.applicableIdentities,
    applicableWorkspaces: policy.applicableWorkspaces,

    minimumPlan: getMinimumAvailablePlan(input.action),
    limit: allowance.available ? allowance.limit ?? null : 0,
    verificationRequired: policy.verificationRequired,

    aiAssisted: catalogue.kind.startsWith("ai_"),
    serverEnforced: catalogue.serverEnforcementRecommended,
    temporarilyAvailable: allowance.available,

    freeAlternative: catalogue.freeHumanAlternative ?? null,
    upgradeHref:
      policy.upgradeHref ?? "/dashboard/subscription",
  });
}
