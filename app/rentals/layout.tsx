import type { ReactNode } from "react";
import { createMetadata } from "@/lib/seo/metadata";

export const metadata = createMetadata({
  title: "Rental Marketplace | Construction Equipment, Machinery, Tools & Property Rentals",
  description:
    "Explore rentals on 3bigha.com including construction equipment, machinery, tools, vehicles, property rentals and local rental services for real estate and construction needs.",
  path: "/rentals",
  image: "/og-image-new.jpg",
  keywords: [
    "construction equipment rental",
    "machinery rental",
    "tool rental",
    "property rental",
    "rental services India",
    "equipment hire",
    "3bigha rentals",
  ],
});

export default function RentalsLayout({ children }: { children: ReactNode }) {
  return children;
}