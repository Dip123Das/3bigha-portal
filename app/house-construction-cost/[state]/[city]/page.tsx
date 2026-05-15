import Link from "next/link";
import type { Metadata } from "next";

import { generateConstructionSeoContent } from "@/lib/construction-cost/seo-content";
import { formatIndianCurrency } from "@/lib/construction-cost/cost-utils";
import ConstructionCostCalculator from "@/components/construction-cost/ConstructionCostCalculator";

type PageProps = {
  params: {
    state: string;
    city: string;
  };
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const content = generateConstructionSeoContent({
    state: params.state,
    city: params.city,
  });

  return {
    title: content.title.replace(
      "House Construction Cost",
      "House Building Cost",
    ),
    description: content.description,
    alternates: {
      canonical: `/house-construction-cost/${params.state}/${params.city}`,
    },
    openGraph: {
      title: content.title,
      description: content.description,
      url: `/house-construction-cost/${params.state}/${params.city}`,
      type: "website",
    },
  };
}

export default function HouseConstructionCostPage({ params }: PageProps) {
  const content = generateConstructionSeoContent({
    state: params.state,
    city: params.city,
  });

  const estimate = content.estimate;

  return (
    <main className="min-h-screen bg-white">
      <section className="bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900 text-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">
              House Building Budget Calculator
            </p>

            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">
              {content.h1}
            </h1>

            <p className="mt-5 text-base leading-7 text-slate-200 sm:text-lg">
              {content.intro}
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl bg-white/10 p-5 ring-1 ring-white/15">
              <p className="text-xs font-black uppercase text-emerald-200">
                1000 sq.ft Estimate
              </p>
              <p className="mt-2 text-2xl font-black">
                {formatIndianCurrency(estimate.summary.estimatedBudget)}
              </p>
            </div>

            <div className="rounded-3xl bg-white/10 p-5 ring-1 ring-white/15">
              <p className="text-xs font-black uppercase text-emerald-200">
                Per Sq.ft
              </p>
              <p className="mt-2 text-2xl font-black">
                {formatIndianCurrency(estimate.summary.estimatedRatePerSqFt)}
              </p>
            </div>

            <div className="rounded-3xl bg-white/10 p-5 ring-1 ring-white/15">
              <p className="text-xs font-black uppercase text-emerald-200">
                Confidence
              </p>
              <p className="mt-2 text-2xl font-black">
                {estimate.analytics.pricingConfidenceScore}%
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/rfq/general/new"
              className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950"
            >
              Get Contractor Quote
            </Link>

            <Link
              href="/services/turnkey"
              className="rounded-2xl border border-white/20 px-5 py-3 text-sm font-black text-white hover:bg-white/10"
            >
              View Turnkey Services
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-10 sm:px-6 lg:px-8">
        <ConstructionCostCalculator />
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <h2 className="text-2xl font-black text-slate-950">
                AI House Construction Cost Estimate
              </h2>

              <p className="mt-4 leading-7 text-slate-700">
                {content.estimatedCostText}
              </p>

              <p className="mt-4 leading-7 text-slate-700">
                {content.pricingSummary}
              </p>
            </div>

            {content.sections.map((section: { title: string; content: string }) => (
              <article
                key={section.title}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <h2 className="text-xl font-black text-slate-950">
                  {section.title}
                </h2>
                <p className="mt-3 leading-7 text-slate-700">
                  {section.content}
                </p>
              </article>
            ))}
          </div>

          <aside className="space-y-5">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-black text-slate-950">
                Budget Components
              </h2>

              <div className="mt-4 space-y-3">
                {Object.entries(estimate.costing).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm"
                  >
                    <span className="font-bold capitalize text-slate-600">
                      {key.replace(/([A-Z])/g, " $1")}
                    </span>
                    <span className="font-black text-slate-950">
                      {formatIndianCurrency(Number(value))}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
              <h2 className="text-lg font-black text-emerald-950">
                Plan your house with 3bigha
              </h2>

              <p className="mt-3 text-sm leading-6 text-emerald-900">
                Compare local contractors, construction materials, turnkey
                packages and vendor quotations from one marketplace.
              </p>

              <Link
                href="/rfq/general/new"
                className="mt-5 inline-flex rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-black text-white"
              >
                Create Free RFQ
              </Link>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-black text-slate-950">
                Related Construction Pages
              </h2>

              <div className="mt-4 space-y-3 text-sm font-bold">
                <Link
                  href={`/construction-cost/${params.state}/${params.city}`}
                  className="block text-emerald-700 hover:text-emerald-900"
                >
                  Construction cost estimate
                </Link>

                <Link
                  href="/materials"
                  className="block text-emerald-700 hover:text-emerald-900"
                >
                  Building materials
                </Link>

                <Link
                  href="/services"
                  className="block text-emerald-700 hover:text-emerald-900"
                >
                  Construction services
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}