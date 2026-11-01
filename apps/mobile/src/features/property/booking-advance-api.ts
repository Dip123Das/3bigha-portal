import type { Session } from "@supabase/supabase-js";

import { mobileApiRequest } from "@/lib/api/request";

import type {
  PropertyBookingApplication,
} from "./booking-application-api";
import type {
  PropertyLegalReviewWorkspace,
} from "./legal-review-api";

export const PROPERTY_BOOKING_ADVANCE_CONSENT_VERSION =
  "property-booking-advance-v1" as const;

export type PropertyBookingAdvanceStatus =
  | "owner_proposed"
  | "buyer_confirmed"
  | "gateway_configuration_pending"
  | "gateway_order_created"
  | "payment_pending"
  | "paid"
  | "failed"
  | "expired"
  | "cancelled"
  | "review_required";

export type PropertyBookingAdvanceGatewayReadiness =
  | "configuration_pending"
  | "ready";

export type PropertyBookingAdvance = {
  id: string;
  applicationId: string;
  holdId: string;
  unitId: string;
  projectId: string;
  quotedPropertyPricePaise: number;
  advanceAmountPaise: number;
  currency: "INR";
  provider: "razorpay_route";
  pricingSource: "builder_inventory_pricing";
  pricingSnapshotAt: string;
  ownerTermsNote: string | null;
  ownerProposedAt: string;
  buyerConsentVersion: string | null;
  buyerConsentedAt: string | null;
  status: PropertyBookingAdvanceStatus;
  expiresAt: string;
  cancelledAt: string | null;
  remainingSeconds: number;
};

export type PropertyBookingAdvancePermissions = {
  actor: "buyer" | "owner";
  canProposeAdvance: boolean;
  canConfirmAdvance: boolean;
  canCancelAdvance: boolean;
  canViewAdvance: boolean;
  canCreateGatewayOrder: boolean;
  canRequestFullRefund: boolean;
  canConfirmDealCompletion: boolean;
};

export type PropertyBookingAdvancePayment = {
  status:
    | "order_preparing"
    | "payment_pending"
    | "paid_held"
    | "refund_pending"
    | "refunded"
    | "settlement_release_pending"
    | "settled"
    | "failed"
    | "review_required";
  amountPaise: number;
  refundAmountPaise: number;
  refundedAt: string | null;
  buyerCompletionConfirmedAt: string | null;
  ownerCompletionConfirmedAt: string | null;
  settlementReleaseRequestedAt: string | null;
  settlementReleasedAt: string | null;
  settledAt: string | null;
};

export type PropertyBookingAdvanceWorkspace = {
  generatedAt: string;
  unit: PropertyLegalReviewWorkspace["unit"];
  application: PropertyBookingApplication | null;
  advance: PropertyBookingAdvance | null;
  payment: PropertyBookingAdvancePayment | null;
  permissions: PropertyBookingAdvancePermissions;
  gateway: {
    provider: "razorpay_route";
    readiness: PropertyBookingAdvanceGatewayReadiness;
    configured: boolean;
    sellerAccountStatus: "not_configured" | "onboarding_pending" | "review_pending" | "active" | "disabled";
  };
  policy: {
    consentVersion:
      typeof PROPERTY_BOOKING_ADVANCE_CONSENT_VERSION;
    requiresAcceptedApplication: true;
    requiresReservedInventory: true;
    usesServerOwnedPropertyPrice: true;
    createsGatewayOrder: true;
    collectsMoney: true;
    createsAgreement: false;
    marksInventorySold: false;
    transfersTitle: false;
    transfersOwnership: false;
  };
};

const JSON_HEADERS = {
  "Content-Type": "application/json",
};

export function loadPropertyBookingAdvance(
  session: Session,
  unitId: string,
): Promise<PropertyBookingAdvanceWorkspace> {
  const params = new URLSearchParams({
    unitId: unitId.trim(),
  });

  const requestPath =
    "/api/v1/mobile/property-booking-advance?" +
    params.toString();

  return mobileApiRequest(
    session,
    requestPath,
    {},
    "The private property-advance workspace could not be loaded.",
  );
}

export function proposePropertyBookingAdvance(
  session: Session,
  input: {
    applicationId: string;
    advanceAmountPaise: number;
    ownerTermsNote?: string | null;
  },
): Promise<PropertyBookingAdvanceWorkspace> {
  return mobileApiRequest(
    session,
    "/api/v1/mobile/property-booking-advance",
    {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        applicationId: input.applicationId.trim(),
        advanceAmountPaise: input.advanceAmountPaise,
        ownerTermsNote:
          input.ownerTermsNote?.trim() || null,
      }),
    },
    "The private property-advance proposal could not be saved.",
  );
}

export function confirmPropertyBookingAdvance(
  session: Session,
  input: {
    advanceRequestId: string;
    consentAccepted: true;
  },
): Promise<PropertyBookingAdvanceWorkspace> {
  const advanceRequestId = input.advanceRequestId.trim();

  const requestPath =
    "/api/v1/mobile/property-booking-advance/" +
    encodeURIComponent(advanceRequestId) +
    "/confirm";

  return mobileApiRequest(
    session,
    requestPath,
    {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        advanceRequestId,
        consentVersion:
          PROPERTY_BOOKING_ADVANCE_CONSENT_VERSION,
        consentAccepted: input.consentAccepted,
      }),
    },
    "The private property-advance acknowledgement could not be saved.",
  );
}

export function cancelPropertyBookingAdvance(
  session: Session,
  input: {
    advanceRequestId: string;
    reason?: string | null;
  },
): Promise<PropertyBookingAdvanceWorkspace> {
  const advanceRequestId = input.advanceRequestId.trim();

  const requestPath =
    "/api/v1/mobile/property-booking-advance/" +
    encodeURIComponent(advanceRequestId) +
    "/cancel";

  return mobileApiRequest(
    session,
    requestPath,
    {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        advanceRequestId,
        reason: input.reason?.trim() || null,
      }),
    },
    "The private property-advance request could not be cancelled.",
  );
}

export type PropertyBookingAdvanceOrder = {
  paymentId: string;
  orderId: string;
  amountPaise: number;
  currency: "INR";
  keyId: string;
  status: "payment_pending";
};

export function createPropertyBookingAdvanceOrder(
  session: Session,
  input: { advanceRequestId: string; idempotencyKey: string },
): Promise<PropertyBookingAdvanceOrder> {
  return mobileApiRequest(
    session,
    "/api/v1/mobile/property-booking-advance/" +
      encodeURIComponent(input.advanceRequestId.trim()) +
      "/order",
    {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ idempotencyKey: input.idempotencyKey }),
    },
    "Razorpay could not prepare the property advance checkout.",
  );
}

export function verifyPropertyBookingAdvancePayment(
  session: Session,
  input: {
    advanceRequestId: string;
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  },
): Promise<{ status: string }> {
  return mobileApiRequest(
    session,
    "/api/v1/mobile/property-booking-advance/" +
      encodeURIComponent(input.advanceRequestId.trim()) +
      "/verify",
    {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify(input),
    },
    "Razorpay has not confirmed this payment yet. Refresh the payment status.",
  );
}

export function requestPropertyBookingAdvanceRefund(
  session: Session,
  advanceRequestId: string,
): Promise<{ status: string; refundAmountPaise?: number }> {
  return mobileApiRequest(
    session,
    "/api/v1/mobile/property-booking-advance/" +
      encodeURIComponent(advanceRequestId.trim()) +
      "/refund",
    { method: "POST", headers: JSON_HEADERS },
    "The full property advance refund could not be completed.",
  );
}

export function confirmPropertyBookingDealCompletion(
  session: Session,
  advanceRequestId: string,
): Promise<{ status: string; message?: string }> {
  return mobileApiRequest(
    session,
    "/api/v1/mobile/property-booking-advance/" +
      encodeURIComponent(advanceRequestId.trim()) +
      "/completion",
    { method: "POST", headers: JSON_HEADERS },
    "Deal completion could not be recorded.",
  );
}
