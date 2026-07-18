import {
  createWorkspaceSummaryAdapter,
} from "./base";

export const customerWorkspaceSummaryAdapter =
  createWorkspaceSummaryAdapter({
    key: "customer",
    workspaceKeys: ["customer"],
    defaultRecentActionKeys: [
      "requirements",
      "inbox",
    ],
    defaultAttentionActionKeys: [
      "requirements",
      "inbox",
    ],
    defaultRecommendedActionLimit: 4,
  });

export const propertyWorkspaceSummaryAdapter =
  createWorkspaceSummaryAdapter({
    key: "property",
    workspaceKeys: ["property"],
    defaultRecentActionKeys: [
      "my_properties",
    ],
    defaultAttentionActionKeys: [
      "my_properties",
    ],
    defaultRecommendedActionLimit: 4,
  });

export const builderWorkspaceSummaryAdapter =
  createWorkspaceSummaryAdapter({
    key: "builder",
    workspaceKeys: [
      "builder",
      "construction_business",
    ],
    defaultRecentActionKeys: [
      "projects",
      "construction_projects",
    ],
    defaultAttentionActionKeys: [
      "requirements",
    ],
    defaultRecommendedActionLimit: 5,
  });

export const serviceWorkspaceSummaryAdapter =
  createWorkspaceSummaryAdapter({
    key: "service-business",
    workspaceKeys: [
      "contractor",
      "professional",
      "legal_professional",
      "skilled_workforce",
    ],
    defaultRecentActionKeys: [
      "my_services",
      "messages",
    ],
    defaultAttentionActionKeys: [
      "buyer_requirements",
      "messages",
    ],
    defaultRecommendedActionLimit: 5,
  });

export const materialWorkspaceSummaryAdapter =
  createWorkspaceSummaryAdapter({
    key: "material-business",
    workspaceKeys: ["material_business"],
    defaultRecentActionKeys: [
      "business_overview",
      "materials",
      "inventory",
    ],
    defaultAttentionActionKeys: [
      "requirements",
      "dispatch",
    ],
    defaultRecommendedActionLimit: 6,
  });

export const rentalWorkspaceSummaryAdapter =
  createWorkspaceSummaryAdapter({
    key: "rental-business",
    workspaceKeys: ["rental_business"],
    defaultRecentActionKeys: [
      "my_rentals",
      "fleet",
    ],
    defaultAttentionActionKeys: [
      "requirements",
    ],
    defaultRecommendedActionLimit: 5,
  });

export const financeWorkspaceSummaryAdapter =
  createWorkspaceSummaryAdapter({
    key: "finance",
    workspaceKeys: [
      "banker",
      "financial_institution",
    ],
    defaultRecommendedActionLimit: 5,
  });

export const investmentWorkspaceSummaryAdapter =
  createWorkspaceSummaryAdapter({
    key: "investment",
    workspaceKeys: ["investment"],
    defaultRecommendedActionLimit: 5,
  });

export const operationsWorkspaceSummaryAdapter =
  createWorkspaceSummaryAdapter({
    key: "operations",
    workspaceKeys: [
      "transport_business",
      "agriculture_business",
      "government",
      "author",
      "multi_business",
    ],
    defaultRecommendedActionLimit: 5,
  });
