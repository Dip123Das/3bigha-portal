import type { ReactNode } from "react";
import { createMetadata } from "@/lib/seo/metadata";

export const metadata = createMetadata({
  title: "Building Materials Marketplace | Cement, Steel, Sand, Bricks & Construction Supplies",
  description:
    "Buy and compare building materials on 3bigha.com including cement, steel, sand, bricks, plumbing, electrical, roofing, flooring and construction supplies from verified vendors.",
  path: "/materials",
  image: "/og/materials.svg",
  keywords: [
    "building materials",
    "cement supplier",
    "steel rod price",
    "sand supplier",
    "bricks supplier",
    "construction materials India",
    "materials marketplace",
    "3bigha materials",
  ],
});

export default function MaterialsLayout({ children }: { children: ReactNode }) {
  return children;
}