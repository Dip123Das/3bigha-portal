import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Land Area Calculator | 3Bigha",
  description:
    "Calculate and convert land measurements using regional Indian land units and common plot shapes.",
  alternates: {
    canonical: "/land-area-calculator",
  },
};

export default function LandAreaCalculatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
