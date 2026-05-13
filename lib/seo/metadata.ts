import type { Metadata } from "next";
import { absoluteUrl, siteConfig } from "./site";

type SeoInput = {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  keywords?: string[];
  noIndex?: boolean;

  state?: string;
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

function languageAlternates(path: string) {
  return {
    "en-IN": absoluteUrl(path),
    "bn-IN": absoluteUrl(`/bn${path === "/" ? "" : path}`),
    "hi-IN": absoluteUrl(`/hi${path === "/" ? "" : path}`),
    "as-IN": absoluteUrl(`/as${path === "/" ? "" : path}`),
    "or-IN": absoluteUrl(`/or${path === "/" ? "" : path}`),
    "x-default": absoluteUrl(path),
  };
}

export function createMetadata(input: SeoInput = {}): Metadata {
  const cleanInputTitle = input.title?.trim();

  const title = cleanInputTitle
    ? cleanInputTitle.includes("3bigha") || cleanInputTitle.includes("3Bigha")
      ? cleanInputTitle
      : `${cleanInputTitle} | 3Bigha`
    : siteConfig.title;

  const geoParts = [
    input.locality,
    input.city,
    input.district,
  ].filter(Boolean);

  const geoText = geoParts.length ? geoParts.join(", ") : "India";

  const geoKeywords = uniq([
  input.locality ? `${input.locality} marketplace` : "",
  input.city ? `${input.city} marketplace` : "",
  input.city ? `${input.city} property` : "",
  input.city ? `${input.city} construction services` : "",
  input.city ? `${input.city} building materials` : "",
  input.city ? `${input.city} rentals` : "",
  input.district ? `${input.district} marketplace` : "",
  input.district ? `${input.district} property` : "",
  input.district ? `${input.district} RFQ marketplace` : "",
  input.state ? `${input.state} marketplace` : "",
]);

  const description =
    input.description ||
    `${title} available on ${siteConfig.name}. Explore verified listings, compare vendors, discover property, construction materials, RFQ procurement, rentals, services and AI-powered marketplace workflows in ${geoText}.`;

  const path = input.path || "/";
  const image = input.image || siteConfig.ogImage;

  const keywords = uniq([
  ...(input.keywords || []),

  ...geoKeywords,

  cleanInputTitle || "",

  input.category || "",
  input.type || "",

  input.locality || "",
  input.city || "",
  input.district || "",

  `${input.category || "property"} in ${input.city || "India"}`,
  `${input.category || "property"} in ${
    input.locality || input.city || "India"
  }`,

  "3bigha",
  "3 bigha",
  "3bigha.com",

  "AI marketplace",
  "AI procurement platform",
  "AI RFQ platform",

  "property marketplace",
  "real estate marketplace India",
  "construction marketplace",
  "materials marketplace",
  "RFQ marketplace",
  "vendor marketplace",

  "building materials marketplace",
  "construction services marketplace",
  "rental marketplace",

  "buy property",
  "sell property",
  "land for sale",
  "house for sale",
  "commercial property",

  "local vendors",
  "verified vendors",
  "construction suppliers",

  "property investment",
  "property near me",
  "cement supplier",
  "steel supplier",
  "rajmistri near me",
]);

  return {
    title,
    description,
    keywords,

    metadataBase: new URL(siteConfig.url),

    alternates: {
      canonical: absoluteUrl(path),

      languages: languageAlternates(path),
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
        countryName: "India",
        type: "website",
      },

    other: {
      geography: geoText,
      region: input.state || "India",
      locality: input.locality || "",
      city: input.city || "",
      district: input.district || "",
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