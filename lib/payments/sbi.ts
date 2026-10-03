export const SBI_GATEWAY_PROVIDER = "sbi_payment_gateway" as const;

export const SBI_INTEGRATION_READY =
  process.env.SBI_PAYMENT_GATEWAY_ENABLED === "true" &&
  Boolean(process.env.SBI_PAYMENT_GATEWAY_MERCHANT_ID) &&
  Boolean(process.env.SBI_PAYMENT_GATEWAY_REQUEST_URL);

export { SUBSCRIPTION_PLANS, isPaidSubscriptionPlan, type PaidSubscriptionPlan } from "./catalogue";
