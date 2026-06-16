import { createOgImage, ogImageSize } from "@/lib/seo/og-image";

export const runtime = "edge";
export const alt = "3Bigha Property Marketplace";
export const size = ogImageSize;
export const contentType = "image/png";

export default function Image() {
  return createOgImage({
    badge: "Property Marketplace",
    title: "Buy & Sell Property Across India",
    subtitle: "Residential plots, land, houses and real estate listings by location.",
    footer: "Property • Land • Plot • House",
    icon: "🏡",
    theme: "property",
  });
}
