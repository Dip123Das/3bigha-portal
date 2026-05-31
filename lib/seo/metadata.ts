import type { Metadata } from "next";
import { canonicalUrl, cleanPath } from "@/lib/seo/url-policy";

const SITE_NAME = "3bigha.com";

export type MetadataInput = {
  title: string;
  description: string;
  path: string;
  image?: string;
  noIndex?: boolean;
  keywords?: string[];
  city?: string;
  district?: string;
  locality?: string;
  category?: string;
  type?: string;
  publishedTime?: string;
  modifiedTime?: string;
};

export function createMetadata({
  title,
  description,
  path,
  image,
  noIndex,
  keywords,
  publishedTime,
  modifiedTime,
}: MetadataInput): Metadata {
  const clean = cleanPath(path);
  const canonical = canonicalUrl(clean);

  const finalTitle = title.includes(SITE_NAME)
    ? title
    : `${title} | ${SITE_NAME}`;

  const finalDescription = String(description || "")
    .trim()
    .slice(0, 160);

  return {
    metadataBase: new URL("https://www.3bigha.com"),

    title: finalTitle,
    description: finalDescription,
    keywords,

    alternates: {
      canonical,
    },

    robots: noIndex
      ? {
          index: false,
          follow: true,
          googleBot: {
            index: false,
            follow: true,
          },
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
          },
        },

    openGraph: {
      title: finalTitle,
      description: finalDescription,
      url: canonical,
      siteName: SITE_NAME,
      type: "website",
      images: image
        ? [
            {
              url: image,
            },
          ]
        : undefined,
    },

    twitter: {
      card: "summary_large_image",
      title: finalTitle,
      description: finalDescription,
      images: image ? [image] : undefined,
    },

    other: {
      ...(publishedTime ? { "article:published_time": publishedTime } : {}),
      ...(modifiedTime ? { "article:modified_time": modifiedTime } : {}),
    },
  };
}
