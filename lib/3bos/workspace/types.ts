import type { HumanIdentityKey } from "../identity";

export type WorkspaceKey =
  | "customer"
  | "property"
  | "builder"
  | "construction_business"
  | "contractor"
  | "material_business"
  | "rental_business"
  | "professional"
  | "legal_professional"
  | "banker"
  | "financial_institution"
  | "investment"
  | "skilled_workforce"
  | "transport_business"
  | "agriculture_business"
  | "government"
  | "author"
  | "multi_business";

export type WorkspaceLifecycleStatus =
  | "production"
  | "partial"
  | "compatibility"
  | "future";

export type WorkspaceCapabilityKey =
  | "marketplace"
  | "inventory"
  | "billing"
  | "business_operations"
  | "customer_relationships"
  | "rfq"
  | "intelligent_assistance"
  | "business_insights"
  | "promotion"
  | "enterprise"
  | "communication"
  | "trust"
  | "knowledge"
  | "property_management"
  | "project_management"
  | "finance"
  | "investment"
  | "dispatch"
  | "fleet";

export type WorkspaceNavigationItem = {
  key: string;
  label: string;
  description: string;
  href: string;
  capability: WorkspaceCapabilityKey;
  status: "production" | "partial" | "future";
};

export type WorkspaceDefinition = {
  key: WorkspaceKey;
  label: string;
  shortLabel: string;
  description: string;
  status: WorkspaceLifecycleStatus;

  /**
   * Existing route used during migration.
   * No route should be replaced until the new workspace composer is live.
   */
  landingPath: string;

  identities: HumanIdentityKey[];
  capabilities: WorkspaceCapabilityKey[];
  navigation: WorkspaceNavigationItem[];

  /**
   * Legacy values that may indicate access to this workspace.
   * These are compatibility signals only.
   */
  legacyRoles?: string[];
  legacyModules?: string[];
  legacyBusinessActivities?: string[];
};
