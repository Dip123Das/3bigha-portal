import Link from "next/link";

export default function ConstructionCostFreeEntry() {
  return (
    <section className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-lime-50 p-5 shadow-sm sm:p-6">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
        Free AI Construction Calculator
      </p>

      <h2 className="mt-2 text-2xl font-black text-slate-950">
        Calculate your future house construction budget
      </h2>

      <p className="mt-3 text-sm leading-6 text-slate-700">
        Estimate built-up area, floor count, grade-wise budget, rate per sq.ft,
        material split, labour split and finishing cost before creating an RFQ.
      </p>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href="/construction-cost/west-bengal/cooch-behar"
          className="rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-black text-white hover:bg-emerald-800"
        >
          Use Free Calculator
        </Link>

        <Link
          href="/rfq"
          className="rounded-2xl border border-emerald-200 bg-white px-5 py-3 text-sm font-black text-emerald-800 hover:bg-emerald-50"
        >
          Create Construction RFQ
        </Link>
      </div>
    </section>
  );
}