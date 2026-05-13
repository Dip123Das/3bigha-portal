import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: true,
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