import { createOgImage, ogImageSize } from "@/lib/seo/og-image";

export const runtime = "edge";
export const alt = "3Bigha Investment Opportunities";
export const size = ogImageSize;
export const contentType = "image/png";

export default function Image() {
  return createOgImage({
    badge: "Investment Opportunities",
    title: "Property & Construction Investment",
    subtitle: "Discover marketplace-backed investment opportunities and growth projects.",
    footer: "Invest • Property • Growth • Deal Room",
    icon: "📈",
    theme: "investment",
  });
}
