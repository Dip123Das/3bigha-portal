import type { ReactNode } from "react";
import { createMetadata } from "@/lib/seo/metadata";

export const metadata = createMetadata({
  title: "Real Estate, Construction, Materials & Investment Blog",
  description:
    "Read 3bigha.com blog articles on real estate, land, construction materials, building services, rentals, investment, market prices and AI-powered marketplace insights.",
  path: "/blog",
  image: "/og-image-new.jpg",
  keywords: [
    "real estate blog",
    "construction blog",
    "building materials news",
    "property investment",
    "construction market India",
    "3bigha blog",
  ],
});

export default function BlogLayout({ children }: { children: ReactNode }) {
  return children;
}