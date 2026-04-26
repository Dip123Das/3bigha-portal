import Link from "next/link";

export const metadata = {
  title: "Price Today | 3bigha",
  description:
    "Check today’s material prices and property price trends by city, town, and district on 3bigha.",
};

export default function PriceTodayPage() {
  return (
    <main className="min-h-screen bg-[#f8faf7]">
      <section className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-5">
          <Link
            href="/"
            className="text-sm font-medium text-emerald-700 hover:text-emerald-800"
          >
            ← Back to Home
          </Link>
        </div>

        <div className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-8">
          <div className="max-w-3xl">
            <p className="mb-2 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              Price Today
            </p>

            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Today’s Material & Property Price Trends
            </h1>

            <p className="mt-3 text-base leading-7 text-slate-600">
              Check approximate daily prices of construction materials and local
              property trends for land, flats, shops, offices, and commercial
              spaces.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-slate-950">
              Material Prices
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Cement, steel, sand, brick, aggregate and other construction
              material prices will appear here.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-slate-950">
              Property Price Trends
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Land per katha, flat per sq.ft., shop, office and commercial price
              trends will appear here.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}