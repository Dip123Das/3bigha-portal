import { createOgImage, ogImageSize } from "@/lib/seo/og-image";

export const runtime = "edge";
export const alt = "3Bigha Equipment Rentals";
export const size = ogImageSize;
export const contentType = "image/png";

export default function Image() {
  return createOgImage({
    badge: "3Bigha Rentals",
    title: "Construction Equipment Rentals",
    subtitle: "JCB, mixer machine, scaffolding, tools and equipment rental marketplace.",
    footer: "JCB • Mixer • Tools • Rentals",
    theme: "amber",
  });
}
