import type { ReactNode } from "react";
import { createMetadata } from "@/lib/seo/metadata";

export const metadata = createMetadata({
  title: "Construction Services Marketplace | Contractors, Labour, Architects & Turnkey Services",
  description:
    "Find construction services on 3bigha.com including contractors, architects, engineers, electricians, plumbers, labour, turnkey construction and building service providers.",
  path: "/services",
  image: "/og-image-new.jpg",
  keywords: [
    "construction services",
    "building contractor",
    "architect services",
    "electrician",
    "plumber",
    "civil contractor",
    "turnkey construction",
    "labour contractor",
    "3bigha services",
  ],
});

export default function ServicesLayout({ children }: { children: ReactNode }) {
  return children;
}