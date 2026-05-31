import type { ReactNode } from "react";
import { createMetadata } from "@/lib/seo/metadata";

export const metadata = createMetadata({
  title: "Search",
  description:
    "Search properties, materials, services, rentals and vendors on 3bigha.com.",
  path: "/search",
  noIndex: true,
});

export default function SearchLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
