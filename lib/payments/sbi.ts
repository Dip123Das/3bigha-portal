export const SBI_GATEWAY_PROVIDER = "sbi_payment_gateway" as const;

export const SBI_INTEGRATION_READY =
  process.env.SBI_PAYMENT_GATEWAY_ENABLED === "true" &&
  Boolean(process.env.SBI_PAYMENT_GATEWAY_MERCHANT_ID) &&
  Boolean(process.env.SBI_PAYMENT_GATEWAY_REQUEST_URL);

export const SUBSCRIPTION_PLANS = {
  basic_vendor: { amountPaise: 29900, months: 1, label: "Basic" },
  silver_vendor: { amountPaise: 49900, months: 1, label: "Silver" },
  gold_vendor: { amountPaise: 99900, months: 1, label: "Gold" },
  platinum_vendor: { amountPaise: 199900, months: 1, label: "Platinum" },
} as const;

export type PaidSubscriptionPlan = keyof typeof SUBSCRIPTION_PLANS;

export function isPaidSubscriptionPlan(
  value: string
): value is PaidSubscriptionPlan {
  return Object.prototype.hasOwnProperty.call(SUBSCRIPTION_PLANS, value);
}
