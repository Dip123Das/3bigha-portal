export type CanonicalTrustState =
  | "unverified"
  | "in_progress"
  | "under_review"
  | "correction_required"
  | "verified"
  | "restricted"
  | "rejected";

export type CanonicalTrustLevel =
  | "none"
  | "basic"
  | "established"
  | "verified";

export type CanonicalTrustSubject =
  | "member"
  | "business"
  | "individual_professional"
  | "banker";

export type CanonicalTrustReasonCode =
  | "registration_not_started"
  | "registration_in_progress"
  | "registration_under_review"
  | "registration_correction_required"
  | "registration_verified"
  | "registration_restricted"
  | "registration_rejected"
  | "identity_approved"
  | "identity_pending"
  | "business_profile_complete"
  | "business_profile_incomplete"
  | "business_location_verified"
  | "business_location_unverified"
  | "professional_verified"
  | "professional_pending"
  | "certificate_active"
  | "certificate_unavailable";

export type CanonicalTrustReason = {
  code: CanonicalTrustReasonCode;
  label: string;
  satisfied: boolean;
};

export type CanonicalTrustCertificate = {
  available: boolean;
  active: boolean;
  certificateNumber: string | null;
  verificationHref: string | null;
  issuedAt: string | null;
};

export type CanonicalTrustNextAction = {
  key:
    | "start_registration"
    | "continue_registration"
    | "await_review"
    | "submit_correction"
    | "contact_support"
    | "open_certificate"
    | "none";
  label: string;
  href: string | null;
};

export type CanonicalTrustModel = {
  version: "reg-int-01a-v1";
  userId: string;
  subject: CanonicalTrustSubject;
  state: CanonicalTrustState;
  level: CanonicalTrustLevel;
  isVerified: boolean;
  mayDisplayVerifiedBadge: boolean;
  registrationStatus: string;
  approvalStatus: string;
  businessVerificationStatus: string;
  locationVerificationStatus: string;
  professionalVerificationStatus: string;
  verifiedAt: string | null;
  score: number | null;
  certificate: CanonicalTrustCertificate;
  reasons: CanonicalTrustReason[];
  missingRequirements: CanonicalTrustReasonCode[];
  nextAction: CanonicalTrustNextAction;
};

export type CanonicalTrustInput = {
  userId: string;
  subject?: CanonicalTrustSubject;
  profile?: Record<string, unknown> | null;
  businessProfile?: Record<string, unknown> | null;
  professionalProfile?: Record<string, unknown> | null;
  certificate?: Record<string, unknown> | null;
};
