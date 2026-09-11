import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "EMI Calculator | 3Bigha",
  description:
    "Calculate loan EMI, repayment estimates and borrowing affordability for property and construction finance.",
  alternates: {
    canonical: "/emi-calculator",
  },
};

export default function EmiCalculatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
