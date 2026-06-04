import ProjectWorkflowHub from "@/components/project/ProjectWorkflowHub";
import Link from "next/link";

import ConstructionCostCalculator from "@/components/construction-cost/ConstructionCostCalculator";
import FinanceAssistanceCta from "@/components/finance/FinanceAssistanceCta";

export default function ConstructionCostIndexPage() {
  
return (

    <main className="min-h-screen bg-slate-50">
      <section className="border-b border-blue-100 bg-gradient-to-br from-blue-50 via-white to-orange-50">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-700">
            AI Construction Cost Calculator
          </p>

          <h1 className="mt-4 max-w-3xl text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
            Calculate house construction cost for any city
          </h1>

          <p className="mt-5 max-w-3xl text-base leading-7 text-slate-700 sm:text-lg">
            Select your state and city, enter area, floor structure, rooms, bathrooms,
            kitchens and finishing scope to estimate construction budget, BOQ,
            materials and timeline.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/dashboard/construction-projects"
              className="rounded-2xl bg-blue-700 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-blue-800"
            >
              My Construction Projects
            </Link>

            <Link
              href="/services/turnkey"
              className="rounded-2xl border border-blue-200 bg-white px-5 py-3 text-sm font-black text-blue-800 shadow-sm hover:bg-blue-50"
            >
              Compare Turnkey Services
            </Link>
          </div>
        </div>
        <div className="mt-6">
          <FinanceAssistanceCta
            title="Need construction loan or staged finance?"
            description="After estimating house construction cost, check EMI, loan eligibility and banker assistance for construction finance."
            source="construction-cost"
          />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <ConstructionCostCalculator />
      </section>
    </main>
    );
}
