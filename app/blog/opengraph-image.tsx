import { createOgImage, ogImageSize } from "@/lib/seo/og-image";

export const runtime = "edge";
export const alt = "3Bigha Blog";
export const size = ogImageSize;
export const contentType = "image/png";

export default function Image() {
  return createOgImage({
    badge: "3Bigha Blog",
    title: "Property & Construction Insights",
    subtitle: "Guides, market updates, property tips and construction knowledge.",
    footer: "Learn • Compare • Build • Invest",
    theme: "slate",
  });
}
