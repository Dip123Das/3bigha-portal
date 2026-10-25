import type { Session } from "@supabase/supabase-js";
import { mobileApiRequest } from "@/lib/api/request";

// Kept local because the Expo app is typechecked as a separate TypeScript project.
export type MobileOnboardingPath = "customer" | "business" | "individual_professional";

export type MobileIdentityOption = {
  key: string;
  label: string;
  localLabel: string | null;
  family: string;
  description: string | null;
  registrationScopes: string[];
  requiresBusinessOnboarding: boolean;
  requiresVerification: boolean;
  lifetimeFreeCandidate: boolean;
  redirectToBusiness: boolean;
};

export type MobileRegistrationLegalConstitution = {
  key: string;
  label: string;
  description: string | null;
};

export type MobileRegistrationBusinessSector = {
  key: string;
  title: string;
  description: string | null;
  symbol: string | null;
};

export type MobileRegistrationSectorMapping = {
  identityKey: string;
  sectorKey: string;
  natureModules: string[];
};

export type MobileRegistrationCatalogue = {
  legalConstitutions: MobileRegistrationLegalConstitution[];
  businessSectors: MobileRegistrationBusinessSector[];
  sectorMappings: MobileRegistrationSectorMapping[];
};

export type MobileOnboardingState = {
  path: MobileOnboardingPath | null;
  catalogue: MobileRegistrationCatalogue;
  identityOptions: MobileIdentityOption[];
  selectedIdentityKeys: string[];
  primaryIdentityKey: string | null;
  profile: { fullName: string; phone: string; state: string; district: string; pincode: string };
  business: {
    businessName: string;
    businessType: string;
    businessIdentities: string[];
    individualIdentities: string[];
    natureOfBusiness: string[];
    contactPerson: string;
    phonePrimary: string;
    phoneWhatsapp: string;
    emailBusiness: string;
    gstin: string;
    pan: string;
    tradeLicenseNo: string;
    udyamNo: string;
    addressLine1: string;
    addressLine2: string;
    landmark: string;
    premisesType: string;
    housePlotFlatNo: string;
    buildingMarketName: string;
    streetRoadLocality: string;
    state: string;
    district: string;
    city: string;
    pincode: string;
    deliveryRadiusKm: number | null;
    preferredServiceArea: string;
    statewideService: boolean;
    nationwideService: boolean;
    reraRegistrationNo: string;
    reraState: string;
    reraExpiryDate: string;
    authorDisplayName: string;
    authorCategory: string;
    authorBio: string;
    authorPortfolioUrl: string;
    aboutPerson: string;
    aboutBusiness: string;
    locationStatus: string;
    approvalStatus: string;
    registrationComplete: boolean;
  };
  professional: {
    secondarySkillKeys: string[];
    yearsExperience: number | null;
    availabilityStatus: string;
    serviceRadiusKm: number | null;
    dailyWage: boolean;
    hourlyWork: boolean;
    perJobWork: boolean;
    workerDeclarationAccepted: boolean;
    originalNameWarningAccepted: boolean;
    identityDocumentType: string;
    identityDocumentMaskedReference: string;
  };
  evidence: {
    selfieCaptured: boolean;
    workPhotoCount: number;
    documentCount: number;
    completeBusinessProofCount: number;
    businessPracticalPhotoCount: number;
  };
  verification: { status: string; reasons: string[]; canActivateDashboard: boolean };
};

export async function loadOnboarding(session: Session) {
  return mobileApiRequest<MobileOnboardingState>(session, "/api/v1/mobile/onboarding", {}, "Registration could not be loaded.");
}

export async function performOnboardingAction(session: Session, action: string, payload: Record<string, unknown> = {}) {
  return mobileApiRequest<MobileOnboardingState>(session, "/api/v1/mobile/onboarding", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, payload }),
  }, "Registration could not be updated.");
}
