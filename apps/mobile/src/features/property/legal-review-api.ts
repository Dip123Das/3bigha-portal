import type { Session } from "@supabase/supabase-js";

import { mobileApiRequest } from "@/lib/api/request";

export const PROPERTY_LEGAL_REVIEW_CONSENT_VERSION =
  "property-legal-review-v1";

export type PropertyLegalReviewStatus =
  | "requested"
  | "granted"
  | "declined"
  | "revoked"
  | "expired";

export type PropertyLegalReviewRequest = {
  id: string;
  projectId: string;
  unitId: string;
  status: PropertyLegalReviewStatus;
  purpose: string;
  consentVersion: string;
  buyerConsentAt: string;
  requestedAt: string;
  decidedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  decisionNote: string | null;
};

export type PropertyLegalReviewDocument = {
  id: string;
  documentType: string;
  title: string;
  originalFilename: string | null;
  mimeType: string | null;
  fileSizeBytes: number | null;
  analysisStatus: string | null;
  analysisConfidence: number | null;
  summary: string | null;
  warnings: string[];
  createdAt: string;
};

export type PropertyLegalReviewWorkspace = {
  generatedAt: string;
  unit: {
    id: string;
    projectId: string;
    projectName: string;
    projectSlug: string;
    unitCode: string | null;
    title: string | null;
    unitKind: string;
    status:
      | "available"
      | "hold"
      | "booked"
      | "sold"
      | "blocked";
    trustStatus: "verified";
  };
  request: PropertyLegalReviewRequest | null;
  documents: PropertyLegalReviewDocument[];
  permissions: {
    actor: "buyer" | "owner";
    canRequestReview: boolean;
    canDecideReview: boolean;
    canRevokeReview: boolean;
    canViewDocuments: boolean;
  };
  policy: {
    consentVersion: string;
    accessExpires: boolean;
    documentViewsAreAudited: true;
    signedAccessIsShortLived: true;
  };
};

export type PropertyLegalDocumentAccess = {
  documentId: string;
  expiresAt: string;
  accessUrl: string;
};

function jsonHeaders() {
  return {
    "Content-Type": "application/json",
  };
}

export function loadPropertyLegalReview(
  session: Session,
  unitId: string,
  requestId?: string | null,
): Promise<PropertyLegalReviewWorkspace> {
  const params = new URLSearchParams({
    unitId: unitId.trim(),
  });

  const selectedRequest = requestId?.trim();
  if (selectedRequest) {
    params.set("requestId", selectedRequest);
  }

  return mobileApiRequest(
    session,
    `/api/v1/mobile/property-legal-review?${params.toString()}`,
    {},
    "The confidential legal-review workspace could not be loaded.",
  );
}

export function requestPropertyLegalReview(
  session: Session,
  input: {
    unitId: string;
    purpose: string;
    consentAccepted: boolean;
  },
): Promise<PropertyLegalReviewWorkspace> {
  return mobileApiRequest(
    session,
    "/api/v1/mobile/property-legal-review",
    {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify({
        unitId: input.unitId,
        purpose: input.purpose,
        consentVersion: PROPERTY_LEGAL_REVIEW_CONSENT_VERSION,
        consentAccepted: input.consentAccepted,
      }),
    },
    "The confidential legal-review request could not be submitted.",
  );
}

export function decidePropertyLegalReview(
  session: Session,
  input: {
    requestId: string;
    decision: "granted" | "declined" | "revoked";
    decisionNote?: string | null;
  },
): Promise<PropertyLegalReviewWorkspace> {
  return mobileApiRequest(
    session,
    `/api/v1/mobile/property-legal-review/${encodeURIComponent(
      input.requestId,
    )}/decision`,
    {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify({
        decision: input.decision,
        decisionNote: input.decisionNote ?? null,
      }),
    },
    "The confidential legal-review decision could not be saved.",
  );
}

export function createPropertyLegalDocumentAccess(
  session: Session,
  input: {
    requestId: string;
    documentId: string;
  },
): Promise<PropertyLegalDocumentAccess> {
  return mobileApiRequest(
    session,
    `/api/v1/mobile/property-legal-review/${encodeURIComponent(
      input.requestId,
    )}/documents/${encodeURIComponent(
      input.documentId,
    )}/access`,
    {
      method: "POST",
      headers: jsonHeaders(),
    },
    "Temporary confidential legal-paper access could not be created.",
  );
}
