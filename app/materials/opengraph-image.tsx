import { createOgImage, ogImageSize } from "@/lib/seo/og-image";

export const runtime = "edge";
export const alt = "3Bigha Building Materials Marketplace";
export const size = ogImageSize;
export const contentType = "image/png";

export default function Image() {
  return createOgImage({
    badge: "Building Materials",
    title: "Building Materials Near You",
    subtitle: "Cement, sand, steel, bricks, stone chips and local suppliers.",
    footer: "Cement • Sand • Steel • Bricks",
    icon: "🧱",
    theme: "materials",
  });
}
