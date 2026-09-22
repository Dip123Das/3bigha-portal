import type { Session } from "@supabase/supabase-js";

import { mobileApiRequest } from "@/lib/api/request";

import type { PropertyUnitHold } from "./booking-hold-api";
import type { PropertyLegalReviewWorkspace } from "./legal-review-api";

export const PROPERTY_BOOKING_APPLICATION_INTENT_VERSION =
  "property-unit-booking-application-v1" as const;

export type PropertyBookingApplicationStatus =
  | "submitted"
  | "accepted"
  | "declined"
  | "cancelled"
  | "expired";

export type PropertyBookingApplication = {
  id: string;
  holdId: string;
  unitId: string;
  projectId: string;
  legalReviewRequestId: string;
  status: PropertyBookingApplicationStatus;
  buyerMessage: string | null;
  submittedAt: string;
  decisionDueAt: string;
  ownerDecidedAt: string | null;
  ownerDecisionNote: string | null;
  acceptedUntil: string | null;
  endedAt: string | null;
  remainingDecisionSeconds: number;
  remainingAcceptedSeconds: number;
};

export type PropertyBookingApplicationPermissions = {
  actor: "buyer" | "owner";
  canSubmitApplication: boolean;
  canCancelApplication: boolean;
  canAcceptApplication: boolean;
  canDeclineApplication: boolean;
  canViewApplication: boolean;
};

export type PropertyBookingApplicationWorkspace = {
  generatedAt: string;
  unit: PropertyLegalReviewWorkspace["unit"];
  hold: PropertyUnitHold | null;
  application: PropertyBookingApplication | null;
  permissions: PropertyBookingApplicationPermissions;
  policy: {
    intentVersion:
      typeof PROPERTY_BOOKING_APPLICATION_INTENT_VERSION;
    ownerDecisionWindowSeconds: 172800;
    acceptedNextStepWindowSeconds: 172800;
    requiresActiveBuyerHold: true;
    keepsInventoryReserved: true;
    createsPayment: false;
    createsAgreement: false;
    marksInventorySold: false;
    transfersOwnership: false;
  };
};

const JSON_HEADERS = {
  "Content-Type": "application/json",
};

export function loadPropertyBookingApplication(
  session: Session,
  unitId: string,
): Promise<PropertyBookingApplicationWorkspace> {
  const params = new URLSearchParams({
    unitId: unitId.trim(),
  });

  return mobileApiRequest(
    session,
    `/api/v1/mobile/property-booking-application?${params.toString()}`,
    {},
    "The private property booking-application workspace could not be loaded.",
  );
}

export function submitPropertyBookingApplication(
  session: Session,
  input: {
    holdId: string;
    buyerMessage?: string | null;
    acknowledgedAt?: string;
  },
): Promise<PropertyBookingApplicationWorkspace> {
  return mobileApiRequest(
    session,
    "/api/v1/mobile/property-booking-application",
    {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        holdId: input.holdId.trim(),
        intentVersion:
          PROPERTY_BOOKING_APPLICATION_INTENT_VERSION,
        acknowledgedAt:
          input.acknowledgedAt?.trim() ||
          new Date().toISOString(),
        buyerMessage: input.buyerMessage?.trim() || null,
      }),
    },
    "The private property booking application could not be submitted.",
  );
}

export function decidePropertyBookingApplication(
  session: Session,
  input: {
    applicationId: string;
    decision: "accepted" | "declined";
    decisionNote?: string | null;
  },
): Promise<PropertyBookingApplicationWorkspace> {
  return mobileApiRequest(
    session,
    `/api/v1/mobile/property-booking-application/${encodeURIComponent(
      input.applicationId.trim(),
    )}/decision`,
    {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        decision: input.decision,
        decisionNote: input.decisionNote?.trim() || null,
      }),
    },
    "The property booking-application decision could not be saved.",
  );
}

export function cancelPropertyBookingApplication(
  session: Session,
  input: {
    applicationId: string;
    reason?: string | null;
  },
): Promise<PropertyBookingApplicationWorkspace> {
  return mobileApiRequest(
    session,
    `/api/v1/mobile/property-booking-application/${encodeURIComponent(
      input.applicationId.trim(),
    )}/cancel`,
    {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        reason: input.reason?.trim() || null,
      }),
    },
    "The property booking application could not be cancelled.",
  );
}
