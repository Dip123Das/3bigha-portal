import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Investment Opportunities | 3Bigha",
  description:
    "Explore property, construction and marketplace-backed investment opportunities on 3Bigha.",
  alternates: {
    canonical: "https://www.3bigha.com/investment",
  },
  openGraph: {
    title: "Investment Opportunities | 3Bigha",
    description:
      "Explore property, construction and marketplace-backed investment opportunities on 3Bigha.",
    url: "https://www.3bigha.com/investment",
    siteName: "3Bigha",
    type: "website",
    images: [
      {
        url: "https://www.3bigha.com/og/investment.svg",
        width: 1200,
        height: 630,
        alt: "3Bigha Investment Opportunities",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Investment Opportunities | 3Bigha",
    description:
      "Explore property, construction and marketplace-backed investment opportunities on 3Bigha.",
    images: ["https://www.3bigha.com/og/investment.svg"],
  },
};

export default function InvestmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
