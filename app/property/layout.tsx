import type { ReactNode } from "react";

import { createMetadata } from "@/lib/seo/metadata";

export const metadata = createMetadata({
  title: "Property Marketplace | Land, House, Commercial & Investment Property",
  description:
    "Explore land, houses, commercial property, investment property and real estate listings on 3bigha.com. Search, compare, enquire and connect with verified property sellers, builders and agents.",
  path: "/property",
  image: "/og/property.svg",
  keywords: [
    "property marketplace",
    "land for sale",
    "house for sale",
    "commercial property",
    "real estate India",
    "property in West Bengal",
    "property in Cooch Behar",
    "builder projects",
    "investment property",
    "plot for sale",
    "3bigha property",
  ],
});

export default function PropertyLayout({ children }: { children: ReactNode }) {
  return children;
}