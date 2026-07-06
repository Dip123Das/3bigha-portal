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
    title: content.title,
    description: content.description,
    alternates: {
      canonical: `/construction-cost/${params.state}/${params.city}`,
    },
    openGraph: {
      title: content.title,
      description: content.description,
      url: `/construction-cost/${params.state}/${params.city}`,
      type: "website",
    },
  };
}

export default function ConstructionCostPage({ params }: PageProps) {
  const content = generateConstructionSeoContent({
    state: params.state,
    city: params.city,
  });

  const estimate = content.estimate;

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-lime-50">
        <div className="w-full px-4 py-12 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">
              AI Construction Cost Intelligence
            </p>

            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
              {content.h1}
            </h1>

            <p className="mt-5 text-base leading-7 text-slate-700 sm:text-lg">
              {content.intro}
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/services/turnkey"
                className="rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-emerald-800"
              >
                Compare Turnkey Packages
              </Link>

              <Link
                href="/rfq"
                className="rounded-2xl border border-emerald-200 bg-white px-5 py-3 text-sm font-black text-emerald-800 shadow-sm hover:bg-emerald-50"
              >
                Create Construction RFQ
              </Link>
            </div>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm">
              <p className="text-xs font-black uppercase text-slate-500">
                Estimated Budget
              </p>
              <p className="mt-2 text-2xl font-black text-slate-950">
                {formatIndianCurrency(estimate.summary.estimatedBudget)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                For 1000 sq.ft standard construction
              </p>
            </div>

            <div className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm">
              <p className="text-xs font-black uppercase text-slate-500">
                Rate Per Sq.ft
              </p>
              <p className="mt-2 text-2xl font-black text-slate-950">
                {formatIndianCurrency(estimate.summary.estimatedRatePerSqFt)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                AI-estimated regional rate
              </p>
            </div>

            <div className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm">
              <p className="text-xs font-black uppercase text-slate-500">
                Budget Range
              </p>
              <p className="mt-2 text-xl font-black text-slate-950">
                {formatIndianCurrency(estimate.summary.estimatedBudgetMin)} -{" "}
                {formatIndianCurrency(estimate.summary.estimatedBudgetMax)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Depends on grade and scope
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="w-full px-4 pt-10 sm:px-6 lg:px-8">
        <ConstructionCostCalculator />
      </section>

      <section className="w-full px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-black text-slate-950">
                {content.estimatedCostText}
              </h2>

              <p className="mt-4 leading-7 text-slate-700">
                {content.pricingSummary}
              </p>
            </div>

            {content.sections.map((section) => (
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
            <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-black text-slate-950">
                Cost Breakup
              </h2>

              <div className="mt-4 space-y-3">
                {estimate.costing &&
                  Object.entries(estimate.costing).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm"
                    >
                      <span className="font-bold capitalize text-slate-600">
                        {key.replace(/([A-Z])/g, " $1")}
                      </span>
                      <span className="font-black text-slate-950">
                        {formatIndianCurrency(value)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="rounded-3xl bg-slate-950 p-6 text-white shadow-sm">
              <h2 className="text-lg font-black">
                Need exact quotation?
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Post your construction requirement and get contractor responses
                from 3bigha marketplace.
              </p>

              <Link
                href="/rfq"
                className="mt-5 inline-flex rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950"
              >
                Start RFQ
              </Link>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-black text-slate-950">
                Related Pages
              </h2>

              <div className="mt-4 space-y-3 text-sm font-bold">
                <Link
                  href={`/house-construction-cost/${params.state}/${params.city}`}
                  className="block text-emerald-700 hover:text-emerald-900"
                >
                  House construction cost page
                </Link>

                <Link
                  href="/services/turnkey"
                  className="block text-emerald-700 hover:text-emerald-900"
                >
                  Turnkey construction services
                </Link>

                <Link
                  href="/materials"
                  className="block text-emerald-700 hover:text-emerald-900"
                >
                  Construction materials
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}