import type { ReactNode } from "react";
import { createMetadata } from "@/lib/seo/metadata";

export const metadata = createMetadata({
  title: "Price Today | Building Materials, Property, Services & Rentals Market Rates",
  description:
    "Track today's market prices on 3bigha.com for building materials, property, construction services, rentals, vendor rates and AI-powered price prediction insights.",
  path: "/price-today",
  image: "/og-image-new.jpg",
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

export default function PriceTodayLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}