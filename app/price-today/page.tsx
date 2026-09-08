import type { Metadata } from "next";

import { createMetadata } from "@/lib/seo/metadata";
import PriceTodayClient from "./PriceTodayClient";

type PriceTodaySearchParams = Record<
  string,
  string | string[] | undefined
>;

const TRACKING_QUERY_PARAMETERS = new Set([
  "fbclid",
  "gclid",
  "ref",
  "source",
  "tracking",
  "utm_campaign",
  "utm_content",
  "utm_id",
  "utm_medium",
  "utm_source",
  "utm_term",
]);

function hasSearchOrFilterParameters(
  searchParams: PriceTodaySearchParams
) {
  return Object.entries(searchParams).some(
    ([rawKey, rawValue]) => {
      const key = rawKey.toLowerCase().trim();

      if (
        !key ||
        key.startsWith("utm_") ||
        TRACKING_QUERY_PARAMETERS.has(key)
      ) {
        return false;
      }

      if (Array.isArray(rawValue)) {
        return rawValue.some(
          (value) =>
            String(value || "").trim().length > 0
        );
      }

      return (
        String(rawValue || "").trim().length > 0
      );
    }
  );
}

export function generateMetadata({
  searchParams,
}: {
  searchParams: PriceTodaySearchParams;
}): Metadata {
  return createMetadata({
    title:
      "Price Today | Building Materials, Property, Services & Rentals Market Rates",
    description:
      "Track today's market prices on 3bigha.com for building materials, property, construction services, rentals, vendor rates and AI-powered price prediction insights.",
    path: "/price-today",
    image: "/og-image-new.jpg",
    noIndex: hasSearchOrFilterParameters(
      searchParams || {}
    ),
    keywords: [
      "price today",
      "cement price today",
      "steel price today",
      "sand price today",
      "building material price",
      "property price prediction",
      "construction market rates",
      "3bigha price today",
    ],
  });
}

export default function PriceTodayPage() {
  return <PriceTodayClient />;
}
