import { createOgImage, ogImageSize } from "@/lib/seo/og-image";

export const runtime = "edge";
export const alt = "3Bigha Construction Services";
export const size = ogImageSize;
export const contentType = "image/png";

export default function Image() {
  return createOgImage({
    badge: "Construction Services",
    title: "Hire Local Service Providers",
    subtitle: "Rajmistri, electrician, plumber, painter, engineer and contractors.",
    footer: "Services • Labour • Contractor • Experts",
    icon: "👷",
    theme: "services",
  });
}
