import type { Session } from "@supabase/supabase-js";

import { mobileApiRequest } from "@/lib/api/request";

import type { PropertyLegalReviewWorkspace } from "./legal-review-api";

export const PROPERTY_UNIT_BOOKING_INTENT_VERSION =
  "property-unit-booking-intent-v1" as const;

export type PropertyUnitHoldStatus =
  | "active"
  | "cancelled"
  | "expired"
  | "converted";

export type PropertyUnitHoldEligibilityReason =
  | "eligible"
  | "legal_review_required"
  | "legal_review_expired"
  | "unit_not_verified"
  | "unit_not_transaction_ready"
  | "unit_not_available"
  | "unit_already_held"
  | "self_hold_forbidden";

export type PropertyUnitHold = {
  id: string;
  unitId: string;
  projectId: string;
  legalReviewRequestId: string;
  status: PropertyUnitHoldStatus;
  heldAt: string;
  expiresAt: string;
  releasedAt: string | null;
  remainingSeconds: number;
};

export type PropertyUnitHoldEligibility = {
  eligible: boolean;
  reason: PropertyUnitHoldEligibilityReason;
  legalReviewRequestId: string | null;
};

export type PropertyUnitHoldPermissions = {
  actor: "buyer" | "owner";
  canAcquireHold: boolean;
  canCancelHold: boolean;
  canViewHold: boolean;
};

export type PropertyUnitHoldWorkspace = {
  generatedAt: string;
  unit: PropertyLegalReviewWorkspace["unit"];
  eligibility: PropertyUnitHoldEligibility;
  hold: PropertyUnitHold | null;
  permissions: PropertyUnitHoldPermissions;
  policy: {
    intentVersion: typeof PROPERTY_UNIT_BOOKING_INTENT_VERSION;
    holdDurationSeconds: 900;
    requiresGrantedLegalReview: true;
    createsPayment: false;
    createsAgreement: false;
    transfersOwnership: false;
  };
};

const JSON_HEADERS = {
  "Content-Type": "application/json",
};

export function loadPropertyUnitHold(
  session: Session,
  unitId: string,
): Promise<PropertyUnitHoldWorkspace> {
  const params = new URLSearchParams({
    unitId: unitId.trim(),
  });

  return mobileApiRequest(
    session,
    `/api/v1/mobile/property-booking-hold?${params.toString()}`,
    {},
    "The property-unit booking-hold workspace could not be loaded.",
  );
}

export function acquirePropertyUnitHold(
  session: Session,
  input: {
    unitId: string;
    legalReviewRequestId: string;
    acknowledgedAt?: string;
  },
): Promise<PropertyUnitHoldWorkspace> {
  return mobileApiRequest(
    session,
    "/api/v1/mobile/property-booking-hold",
    {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        unitId: input.unitId.trim(),
        legalReviewRequestId: input.legalReviewRequestId.trim(),
        intentVersion: PROPERTY_UNIT_BOOKING_INTENT_VERSION,
        acknowledgedAt:
          input.acknowledgedAt?.trim() || new Date().toISOString(),
      }),
    },
    "The temporary property-unit hold could not be created.",
  );
}

export function cancelPropertyUnitHold(
  session: Session,
  input: {
    holdId: string;
    reason?: string | null;
  },
): Promise<PropertyUnitHoldWorkspace> {
  return mobileApiRequest(
    session,
    `/api/v1/mobile/property-booking-hold/${encodeURIComponent(
      input.holdId.trim(),
    )}/cancel`,
    {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        reason: input.reason?.trim() || null,
      }),
    },
    "The temporary property-unit hold could not be cancelled.",
  );
}
