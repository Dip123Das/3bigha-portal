import type { Metadata } from "next";
import { absoluteUrl, siteConfig } from "./site";

type SeoInput = {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  keywords?: string[];
  noIndex?: boolean;
};

export function createMetadata(input: SeoInput = {}): Metadata {
  const title = input.title
    ? `${input.title} | ${siteConfig.name}`
    : siteConfig.title;

  const description = input.description || siteConfig.description;
  const path = input.path || "/";
  const image = input.image || siteConfig.ogImage;

  return {
    title,
    description,
    keywords: input.keywords || siteConfig.keywords,
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
        },
  };
}