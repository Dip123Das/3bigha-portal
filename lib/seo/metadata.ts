import type { Metadata } from "next";
import { absoluteUrl, siteConfig } from "./site";

type SeoInput = {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  keywords?: string[];
  noIndex?: boolean;

  city?: string;
  district?: string;
  locality?: string;
  category?: string;
  type?: string;

  publishedTime?: string;
  modifiedTime?: string;
};

function uniq(arr: string[]) {
  return [...new Set(arr.filter(Boolean))];
}

export function createMetadata(input: SeoInput = {}): Metadata {
  const title = input.title
    ? `${input.title} | ${siteConfig.name}`
    : siteConfig.title;

  const geoParts = [
    input.locality,
    input.city,
    input.district,
  ].filter(Boolean);

  const geoText = geoParts.length ? geoParts.join(", ") : "India";

  const description =
    input.description ||
    `${title} available on ${siteConfig.name}. Explore verified listings, compare prices, contact vendors and discover opportunities in ${geoText}.`;

  const path = input.path || "/";
  const image = input.image || siteConfig.ogImage;

  const keywords = uniq([
    ...(input.keywords || []),

    title,

    input.category || "",
    input.type || "",

    input.locality || "",
    input.city || "",
    input.district || "",

    `${input.category || "property"} in ${input.city || "India"}`,
    `${input.category || "property"} in ${input.locality || input.city || "India"}`,

    "3bigha",
    "3bigha property",
    "real estate India",
    "verified property listings",
    "property marketplace",
    "buy property",
    "sell property",
    "property near me",
    "property investment",
    "land for sale",
    "house for sale",
    "commercial property",
    "real estate marketplace",
  ]);

  return {
    title,
    description,
    keywords,

    metadataBase: new URL(siteConfig.url),

    alternates: {
      canonical: absoluteUrl(path),
    },

    openGraph: {
      title,
      description,
      url: absoluteUrl(path),
      siteName: siteConfig.name,

      images: [
        {
          url: absoluteUrl(image),
          width: 1200,
          height: 630,
          alt: title,
        },
      ],

      locale: "en_IN",
      type: "website",
    },

    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [absoluteUrl(image)],
    },

    robots: input.noIndex
      ? {
          index: false,
          follow: false,
        }
      : {
          index: true,
          follow: true,

          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        },
  };
}