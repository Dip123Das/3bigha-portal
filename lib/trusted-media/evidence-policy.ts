import type {
  TrustedMediaEntityType,
  TrustedMediaEvidenceRole,
  TrustedMediaPublicLocationPrecision,
} from "./trusted-media-types";

export type TrustedMediaEvidencePolicy = {
  key: string;
  version: string;
  entityType: TrustedMediaEntityType;
  minimumLiveImages: number;
  recommendedLiveImages: number;
  maximumLiveImages?: number;
  mandatoryRoles: TrustedMediaEvidenceRole[];
  allowedMandatoryRoles: TrustedMediaEvidenceRole[];
  gpsRequired: boolean;
  aiVerificationRequired: boolean;
  galleryMaySatisfyMandatory: false;
  maximumGpsAccuracyMetres: number;
  reviewGpsAccuracyMetres: number;
  maximumCaptureAgeMinutes: number;
  publicLocationPrecision: TrustedMediaPublicLocationPrecision;
  userGuidance: string;
  trustEncouragement: string;
};

const COMMON_WARNING =
  "Do not upload fake, unrelated or misleading property, project, product, rental or service media. Misrepresentation may lead to rejection, suspension and legal action where applicable.";

export const TRUSTED_MEDIA_LEGAL_WARNING = COMMON_WARNING;

export const TRUSTED_MEDIA_EVIDENCE_POLICIES: Record<
  TrustedMediaEntityType,
  TrustedMediaEvidencePolicy
> = {
  property: {
    key: "property.v1",
    version: "1.0.0",
    entityType: "property",
    minimumLiveImages: 1,
    recommendedLiveImages: 2,
    maximumLiveImages: 12,
    mandatoryRoles: ["property_overview"],
    allowedMandatoryRoles: [
      "property_overview",
      "additional_live_capture",
    ],
    gpsRequired: true,
    aiVerificationRequired: true,
    galleryMaySatisfyMandatory: false,
    maximumGpsAccuracyMetres: 100,
    reviewGpsAccuracyMetres: 250,
    maximumCaptureAgeMinutes: 30,
    publicLocationPrecision: "approximate",
    userGuidance:
      "Capture a clear live overview of the actual property. Keep the full property, plot, house or main visible area inside the frame.",
    trustEncouragement:
      "For greater buyer trust, capture two different live overview angles and use live camera for all photographs wherever practical.",
  },

  builder_project: {
    key: "builder_project.v1",
    version: "1.0.0",
    entityType: "builder_project",
    minimumLiveImages: 1,
    recommendedLiveImages: 2,
    maximumLiveImages: 12,
    mandatoryRoles: ["project_overview"],
    allowedMandatoryRoles: [
      "project_overview",
      "project_entrance",
      "construction_progress",
      "project_surroundings",
      "additional_live_capture",
    ],
    gpsRequired: true,
    aiVerificationRequired: true,
    galleryMaySatisfyMandatory: false,
    maximumGpsAccuracyMetres: 100,
    reviewGpsAccuracyMetres: 250,
    maximumCaptureAgeMinutes: 30,
    publicLocationPrecision: "approximate",
    userGuidance:
      "Capture a clear live overview of the actual builder project or construction site. Show the main project area, structure or entrance.",
    trustEncouragement:
      "For greater buyer trust, capture two different live project views and use live camera for all site photographs wherever practical.",
  },

  project_unit: {
    key: "project_unit.v1",
    version: "1.0.0",
    entityType: "project_unit",
    minimumLiveImages: 1,
    recommendedLiveImages: 2,
    maximumLiveImages: 12,
    mandatoryRoles: ["unit_overview"],
    allowedMandatoryRoles: [
      "unit_overview",
      "additional_live_capture",
    ],
    gpsRequired: true,
    aiVerificationRequired: true,
    galleryMaySatisfyMandatory: false,
    maximumGpsAccuracyMetres: 100,
    reviewGpsAccuracyMetres: 250,
    maximumCaptureAgeMinutes: 30,
    publicLocationPrecision: "approximate",
    userGuidance:
      "Capture a clear live overview of the actual project unit when unit-specific evidence is required.",
    trustEncouragement:
      "Use live capture for additional unit photographs wherever practical.",
  },

  material: {
    key: "material.v1",
    version: "1.0.0",
    entityType: "material",
    minimumLiveImages: 1,
    recommendedLiveImages: 1,
    maximumLiveImages: 12,
    mandatoryRoles: ["material_overview"],
    allowedMandatoryRoles: [
      "material_overview",
      "additional_live_capture",
    ],
    gpsRequired: true,
    aiVerificationRequired: true,
    galleryMaySatisfyMandatory: false,
    maximumGpsAccuracyMetres: 100,
    reviewGpsAccuracyMetres: 250,
    maximumCaptureAgeMinutes: 30,
    publicLocationPrecision: "locality",
    userGuidance:
      "Capture the actual material, product, stock or packaging clearly. Show enough of the item to confirm its type and visible condition.",
    trustEncouragement:
      "Use live camera for all product and stock photographs wherever practical to build stronger buyer trust.",
  },

  rental: {
    key: "rental.v1",
    version: "1.0.0",
    entityType: "rental",
    minimumLiveImages: 1,
    recommendedLiveImages: 1,
    maximumLiveImages: 12,
    mandatoryRoles: ["rental_asset_overview"],
    allowedMandatoryRoles: [
      "rental_asset_overview",
      "additional_live_capture",
    ],
    gpsRequired: true,
    aiVerificationRequired: true,
    galleryMaySatisfyMandatory: false,
    maximumGpsAccuracyMetres: 100,
    reviewGpsAccuracyMetres: 250,
    maximumCaptureAgeMinutes: 30,
    publicLocationPrecision: "locality",
    userGuidance:
      "Capture the actual rentable equipment, tool, vehicle or asset. Show the complete item and its visible condition.",
    trustEncouragement:
      "Use live camera for additional views, identification plates and condition photographs wherever practical.",
  },

  service: {
    key: "service.v1",
    version: "1.0.0",
    entityType: "service",
    minimumLiveImages: 1,
    recommendedLiveImages: 1,
    maximumLiveImages: 12,
    mandatoryRoles: ["service_work_evidence"],
    allowedMandatoryRoles: [
      "service_work_evidence",
      "service_tools_or_premises",
      "additional_live_capture",
    ],
    gpsRequired: true,
    aiVerificationRequired: true,
    galleryMaySatisfyMandatory: false,
    maximumGpsAccuracyMetres: 100,
    reviewGpsAccuracyMetres: 250,
    maximumCaptureAgeMinutes: 30,
    publicLocationPrecision: "locality",
    userGuidance:
      "Capture actual work, completed work, tools, equipment, workshop or service premises relevant to the service you are listing.",
    trustEncouragement:
      "Use live camera for all service evidence wherever practical. Avoid unrelated promotional or stock photographs.",
  },
};

export function getTrustedMediaEvidencePolicy(
  entityType: TrustedMediaEntityType
): TrustedMediaEvidencePolicy {
  return TRUSTED_MEDIA_EVIDENCE_POLICIES[entityType];
}

export function isMandatoryEvidenceRoleAllowed(
  entityType: TrustedMediaEntityType,
  role: TrustedMediaEvidenceRole
): boolean {
  return TRUSTED_MEDIA_EVIDENCE_POLICIES[
    entityType
  ].allowedMandatoryRoles.includes(role);
}
