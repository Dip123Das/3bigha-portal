/** Customer totals include applicable tax. Merchant tax settings must be configured before live enablement. */
export const CATALOGUE_VERSION = "2026-10-local-business-v1";
export const SUBSCRIPTION_PLANS = {
  basic_vendor: { amountPaise: 9900, months: 1, label: "Basic" },
  silver_vendor: { amountPaise: 19900, months: 1, label: "Silver" },
  gold_vendor: { amountPaise: 29900, months: 1, label: "Gold" },
  platinum_vendor: { amountPaise: 49900, months: 1, label: "Platinum" },
} as const;
export type PaidSubscriptionPlan = keyof typeof SUBSCRIPTION_PLANS;
export function isPaidSubscriptionPlan(
  value: string,
): value is PaidSubscriptionPlan {
  return Object.prototype.hasOwnProperty.call(SUBSCRIPTION_PLANS, value);
}
export const COMMERCIAL_PRODUCTS = {
  ...Object.fromEntries(
    Object.entries(SUBSCRIPTION_PLANS).map(([key, p]) => [
      key,
      { ...p, kind: "base", allowance: 1 },
    ]),
  ),
  property_5: {
    label: "5 extra active properties",
    amountPaise: 9900,
    months: 1,
    kind: "property_pack",
    allowance: 5,
  },
  property_20: {
    label: "20 extra active properties",
    amountPaise: 29900,
    months: 1,
    kind: "property_pack",
    allowance: 20,
  },
  property_50: {
    label: "50 extra active properties",
    amountPaise: 49900,
    months: 1,
    kind: "property_pack",
    allowance: 50,
  },
  manufacturing: {
    label: "Manufacturing costing · 5 active registers",
    amountPaise: 9900,
    months: 1,
    kind: "manufacturing",
    allowance: 5,
  },
  construction: {
    label: "Construction costing · one project",
    amountPaise: 9900,
    months: 1,
    kind: "construction",
    allowance: 1,
  },
} as Record<
  string,
  {
    label: string;
    amountPaise: number;
    months: number;
    kind: string;
    allowance: number;
  }
>;
export function priceLabel(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")} / month`;
}
