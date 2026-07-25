export type BusinessRegistrationProgressInput = {
  nature_of_business?: unknown;
  business_name?: unknown;
  author_display_name?: unknown;
  contact_person?: unknown;
  phone_primary?: unknown;
  email_business?: unknown;

  address_line1?: unknown;
  address_line2?: unknown;
  city?: unknown;
  district?: unknown;
  state?: unknown;
  pincode?: unknown;
  location_verification_status?: unknown;

  about_person?: unknown;
  about_business?: unknown;
  author_bio?: unknown;

  delivery_radius_km?: unknown;
  preferred_service_area?: unknown;
  statewide_service?: unknown;
  nationwide_service?: unknown;
  preferred_geo_districts?: unknown;
  preferred_geo_blocks?: unknown;
  preferred_geo_places?: unknown;

  business_media_json?: unknown;
  selfie_capture_status?: unknown;
  selfie_media_json?: unknown;
  workplace_evidence_status?: unknown;
  workplace_media_json?: unknown;

  vendor_document_verification_json?: unknown;
  automated_verification_json?: unknown;

  is_complete?: unknown;
  completion_score?: unknown;
  registration_complete?: unknown;
};

export type BusinessRegistrationProgressCheck = {
  key: string;
  label: string;
  complete: boolean;
};

export type BusinessRegistrationProgress = {
  businessProfilePercent: number;
  businessProfileComplete: boolean;
  registrationJourneyPercent: number;
  registrationJourneyReady: boolean;
  registrationComplete: boolean;
  checks: BusinessRegistrationProgressCheck[];
  missingSteps: string[];
};

function text(value: unknown) {
  return String(value || "").trim();
}

function normalized(value: unknown) {
  return text(value).toLowerCase();
}

function array(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

function jsonObject(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

function clampPercent(value: unknown) {
  const number = Number(value);

  if (!Number.isFinite(number)) return 0;

  return Math.max(0, Math.min(100, Math.round(number)));
}

function hasJsonEvidence(value: unknown) {
  if (Array.isArray(value)) return value.length > 0;

  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>).length > 0;
  }

  return Boolean(text(value));
}

function mediaAssets(input: BusinessRegistrationProgressInput) {
  return array(input.business_media_json);
}

function mediaPath(asset: any) {
  return text(asset?.path || asset?.object_path).toLowerCase();
}

function hasMediaPath(
  input: BusinessRegistrationProgressInput,
  fragment: string
) {
  return mediaAssets(input).some((asset) =>
    mediaPath(asset).includes(fragment)
  );
}

function documentVerification(input: BusinessRegistrationProgressInput) {
  const direct = jsonObject(
    input.vendor_document_verification_json
  );

  if (Object.keys(direct).length) return direct;

  const automated = jsonObject(
    input.automated_verification_json
  );

  return (
    jsonObject(automated.documentVerification) ||
    jsonObject(automated.document_verification) ||
    jsonObject(automated.document)
  );
}

function documentVerificationReady(
  input: BusinessRegistrationProgressInput,
  pureBlog: boolean
) {
  if (pureBlog) return true;

  const verification = documentVerification(input);
  const status = normalized(
    verification.status ||
      verification.document_verification_status
  );

  const confidence = Number(
    verification.confidence ||
      verification.document_verification_confidence ||
      0
  );

  return (
    ["verified_by_ai", "verified", "matched"].includes(status) &&
    Number.isFinite(confidence) &&
    confidence >= 85
  );
}

export function resolveBusinessRegistrationProgress(
  input: BusinessRegistrationProgressInput
): BusinessRegistrationProgress {
  const activities = array(input.nature_of_business)
    .map(text)
    .filter(Boolean);

  const hasBlog = activities.includes("blog");
  const hasBusiness = activities.some((activity) =>
    ["property", "materials", "services", "rentals"].includes(activity)
  );
  const pureBlog = hasBlog && !hasBusiness;

  const identityReady = Boolean(
    activities.length &&
      text(input.contact_person) &&
      (text(input.business_name) ||
        text(input.author_display_name)) &&
      (text(input.phone_primary) ||
        text(input.email_business))
  );

  const addressReady =
    normalized(input.location_verification_status) === "verified" &&
    Boolean(
      text(input.address_line1) ||
        text(input.address_line2) ||
        text(input.city) ||
        text(input.district) ||
        text(input.state) ||
        text(input.pincode)
    );

  const aboutReady = Boolean(
    text(input.about_person) &&
      (
        text(input.about_business) ||
        (hasBlog && text(input.author_bio))
      )
  );

  const coverageReady = Boolean(
    Number(input.delivery_radius_km || 0) > 0 ||
      text(input.preferred_service_area) ||
      input.statewide_service === true ||
      input.nationwide_service === true ||
      array(input.preferred_geo_districts).length ||
      array(input.preferred_geo_blocks).length ||
      array(input.preferred_geo_places).length
  );

  const legalProofReady =
    pureBlog ||
    hasMediaPath(input, "/legal-proof/");

  const workplaceMediaReady =
    pureBlog ||
    hasMediaPath(input, "/practical-proof/") ||
    hasJsonEvidence(input.workplace_media_json);

  const workplaceVerified =
    pureBlog ||
    normalized(input.workplace_evidence_status) === "verified";

  const selfieMediaReady =
    pureBlog ||
    hasMediaPath(input, "/live-selfie/") ||
    hasJsonEvidence(input.selfie_media_json);

  const selfieVerified =
    pureBlog ||
    normalized(input.selfie_capture_status) === "verified";

  const checks: BusinessRegistrationProgressCheck[] = [
    {
      key: "identity",
      label: "Identity and contact details",
      complete: identityReady,
    },
    {
      key: "address",
      label: "Verified business address",
      complete: addressReady,
    },
    {
      key: "about",
      label: "About you and your business",
      complete: aboutReady,
    },
    {
      key: "coverage",
      label: "Business coverage area",
      complete: coverageReady,
    },
    {
      key: "legal-proof",
      label: "Legal business proof",
      complete: legalProofReady,
    },
    {
      key: "workplace",
      label: "Verified workplace evidence",
      complete: workplaceMediaReady && workplaceVerified,
    },
    {
      key: "selfie",
      label: "Verified live selfie",
      complete: selfieMediaReady && selfieVerified,
    },
    {
      key: "document-verification",
      label: "Verified legal documents",
      complete: documentVerificationReady(input, pureBlog),
    },
  ];

  const completedChecks = checks.filter(
    (check) => check.complete
  ).length;

  const registrationJourneyPercent = checks.length
    ? Math.round((completedChecks / checks.length) * 100)
    : 0;

  return {
    businessProfilePercent: clampPercent(
      input.completion_score
    ),
    businessProfileComplete:
      input.is_complete === true,
    registrationJourneyPercent,
    registrationJourneyReady:
      checks.every((check) => check.complete),
    registrationComplete:
      input.registration_complete === true,
    checks,
    missingSteps: checks
      .filter((check) => !check.complete)
      .map((check) => check.label),
  };
}
