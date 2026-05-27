import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "3bigha.com",
    short_name: "3bigha",
    description:
      "AI-powered real estate, construction, materials, RFQ and procurement platform for India.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#166534",
    orientation: "portrait",
    categories: ["business", "productivity", "shopping"],
    icons: [
      {
        src: "/icons/logo-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/logo-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      }
    ],
  };
}
