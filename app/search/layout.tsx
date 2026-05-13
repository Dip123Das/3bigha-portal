import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      nosnippet: true,
    },
  },

  alternates: {
    canonical: "https://www.3bigha.com/search",
  },
};

export default function SearchLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}