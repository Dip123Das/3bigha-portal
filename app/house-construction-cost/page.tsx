import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "House Construction Cost Calculator | 3Bigha",
  description:
    "Estimate house construction costs, materials, timelines and budgets for your building project.",
  alternates: {
    canonical: "/house-construction-cost",
  },
};

export { default } from "../construction-cost/page";
