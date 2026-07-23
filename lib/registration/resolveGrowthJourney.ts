import {
  hasActivePaidGrowthPlan,
  type RegistrationStatusTone,
} from "@/lib/registration/resolveRegistrationStatusPresentation";

export type GrowthJourneyState =
  | "essential"
  | "gateway_waiting"
  | "payment_pending"
  | "active"
  | "inactive";

export type GrowthJourneyInput = {
  subscriptionPlan?: string | null;
  subscriptionStatus?: string | null;
  subscriptionExpiresAt?: string | null;
  gatewayReady: boolean;
  now?: number;
};

export type GrowthJourneyPresentation = {
  state: GrowthJourneyState;
  plan: string;
  statusLabel: string;
  title: string;
  detail: string;
  tone: RegistrationStatusTone;
  isPaidActive: boolean;
  isEssential: boolean;
};

const WAITING_STATUSES = new Set([
  "payment_pending",
  "requested",
  "gateway_order_created",
  "gateway_configuration_pending",
]);

function clean(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
}

function hasValidExpiry(
  expiresAt: string | null | undefined,
  now: number
) {
  if (!expiresAt) return true;

  const expiry = new Date(expiresAt).getTime();
  return Number.isFinite(expiry) && expiry > now;
}

export function resolveGrowthJourney(
  input: GrowthJourneyInput
): GrowthJourneyPresentation {
  const plan = clean(input.subscriptionPlan || "free");
  const status = clean(input.subscriptionStatus || "free");
  const now = input.now ?? Date.now();

  const isEssential = !plan || plan === "free";
  const activeByStatus = hasActivePaidGrowthPlan({
    subscriptionPlan: plan,
    subscriptionStatus: status,
    gatewayReady: input.gatewayReady,
  });

  const isPaidActive =
    activeByStatus &&
    hasValidExpiry(input.subscriptionExpiresAt, now);

  if (isEssential) {
    return {
      state: "essential",
      plan: "free",
      statusLabel: "Available",
      title: "Essential Workspace",
      detail:
        "Your Essential Workspace is available independently of any paid Growth Plan.",
      tone: "positive",
      isPaidActive: false,
      isEssential: true,
    };
  }

  if (isPaidActive) {
    return {
      state: "active",
      plan,
      statusLabel: "Active",
      title: "Paid Growth Plan",
      detail:
        "Your paid Growth benefits are active following verified payment confirmation.",
      tone: "positive",
      isPaidActive: true,
      isEssential: false,
    };
  }

  if (!input.gatewayReady) {
    return {
      state: "gateway_waiting",
      plan,
      statusLabel: "Waiting for SBI Gateway",
      title: "Selected Growth Plan",
      detail:
        "Your plan selection is recorded, but SBI online payment is not available yet. No payment has been collected and no paid benefit has been activated.",
      tone: "attention",
      isPaidActive: false,
      isEssential: false,
    };
  }

  if (WAITING_STATUSES.has(status)) {
    return {
      state: "payment_pending",
      plan,
      statusLabel: "Payment pending",
      title: "Selected Growth Plan",
      detail:
        "Complete the secure SBI payment when you are ready. Your Essential Workspace remains available separately.",
      tone: "attention",
      isPaidActive: false,
      isEssential: false,
    };
  }

  return {
    state: "inactive",
    plan,
    statusLabel: "Not active",
    title: "Selected Growth Plan",
    detail:
      "This paid Growth Plan has not been activated by verified SBI payment confirmation.",
    tone: "neutral",
    isPaidActive: false,
    isEssential: false,
  };
}
