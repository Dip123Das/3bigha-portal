import Link from "next/link";

export default function MeasurementMasterDataPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <section className="rounded-3xl border bg-white p-5 shadow-sm md:p-7">
        <p className="text-sm font-semibold text-emerald-700">Master Data</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-950 md:text-4xl">
          Measurement Master Data
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 md:text-base">
          This control center will manage local land measurement systems, state-wise and
          district-wise conversion values, city practices, warnings and verification status.
        </p>

        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          This page is intentionally created as a safe foundation first. In the next phase,
          connect it with database tables so Master Admin can add or update local measurement
          units without changing code.
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {[
            "State / Union Territory",
            "District / City / Block",
            "Local unit name",
            "Square feet value",
            "Local warning / note",
            "Verified / unverified status",
          ].map((item) => (
            <div key={item} className="rounded-2xl border bg-slate-50 p-4 text-sm font-bold text-slate-800">
              {item}
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/land-area-calculator"
            className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white"
          >
            Open Public Calculator
          </Link>
          <Link
            href="/admin/dashboard"
            className="rounded-2xl border px-4 py-3 text-sm font-bold text-slate-700"
          >
            Back to Admin Dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
