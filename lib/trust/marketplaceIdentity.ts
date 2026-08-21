import type {
  CanonicalTrustModel,
  CanonicalTrustSubject,
} from "./types";

export type MarketplaceModule =
  | "property"
  | "materials"
  | "services"
  | "rentals"
  | "vendor"
  | "search"
  | "featured";

export type MarketplaceIdentitySource = {
  module: MarketplaceModule;
  ownerUserId?: string | null;
  displayName?: string | null;
  businessName?: string | null;
  profileHref?: string | null;
  subject?: CanonicalTrustSubject;
};

export type MarketplaceIdentity = {
  module: MarketplaceModule;
  ownerUserId: string | null;
  displayName: string;
  businessName: string | null;
  profileHref: string | null;
  subject: CanonicalTrustSubject;
  trust: CanonicalTrustModel | null;
  isVerified: boolean;
  mayDisplayVerifiedBadge: boolean;
  certificateNumber: string | null;
  certificateHref: string | null;
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function defaultDisplayName(module: MarketplaceModule) {
  switch (module) {
    case "property":
      return "Property owner";
    case "materials":
      return "Material vendor";
    case "services":
      return "Service provider";
    case "rentals":
      return "Rental provider";
    case "vendor":
      return "Vendor";
    case "search":
      return "Marketplace member";
    case "featured":
      return "Marketplace listing";
    default:
      return "Marketplace member";
  }
}

function defaultSubject(
  module: MarketplaceModule
): CanonicalTrustSubject {
  if (module === "services") {
    return "individual_professional";
  }

  return "business";
}

/**
 * REG-INT-02A
 *
 * Converts marketplace owner/provider data and canonical trust into
 * one presentation-safe identity contract.
 *
 * This adapter never infers verification from subscription, ranking,
 * profile status, listing state, AI score or marketplace performance.
 */
export function buildMarketplaceIdentity(
  source: MarketplaceIdentitySource,
  trust: CanonicalTrustModel | null | undefined
): MarketplaceIdentity {
  const ownerUserId = clean(source.ownerUserId) || null;
  const businessName = clean(source.businessName) || null;
  const displayName =
    clean(source.displayName) ||
    businessName ||
    defaultDisplayName(source.module);

  const canonicalTrust =
    trust && (!ownerUserId || trust.userId === ownerUserId)
      ? trust
      : null;

  const mayDisplayVerifiedBadge =
    canonicalTrust?.mayDisplayVerifiedBadge === true;

  return {
    module: source.module,
    ownerUserId,
    displayName,
    businessName,
    profileHref: clean(source.profileHref) || null,
    subject:
      source.subject ||
      canonicalTrust?.subject ||
      defaultSubject(source.module),
    trust: canonicalTrust,
    isVerified: canonicalTrust?.isVerified === true,
    mayDisplayVerifiedBadge,
    certificateNumber:
      mayDisplayVerifiedBadge
        ? canonicalTrust?.certificate.certificateNumber ?? null
        : null,
    certificateHref:
      mayDisplayVerifiedBadge
        ? canonicalTrust?.certificate.verificationHref ?? null
        : null,
  };
}

export function getMarketplaceIdentityFromMap(
  source: MarketplaceIdentitySource,
  trustByUserId:
    | Record<string, CanonicalTrustModel>
    | Map<string, CanonicalTrustModel>
): MarketplaceIdentity {
  const ownerUserId = clean(source.ownerUserId);
  let trust: CanonicalTrustModel | null = null;

  if (ownerUserId) {
    trust =
      trustByUserId instanceof Map
        ? trustByUserId.get(ownerUserId) ?? null
        : trustByUserId[ownerUserId] ?? null;
  }

  return buildMarketplaceIdentity(source, trust);
}
