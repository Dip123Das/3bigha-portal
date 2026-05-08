import Link from "next/link";

export default function VendorLandingPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <section className="rounded-2xl border p-8">
        <h1 className="text-3xl font-bold">
          3Bigha Vendor Marketplace
        </h1>

        <p className="mt-3 text-gray-600">
          Discover trusted vendors, suppliers and service providers using AI-powered marketplace intelligence.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/vendor/discovery"
            className="rounded-xl border px-5 py-3 font-medium transition hover:bg-gray-50"
          >
            Explore AI Vendor Discovery
          </Link>

          <Link
            href="/dashboard/vendor"
            className="rounded-xl border px-5 py-3 font-medium transition hover:bg-gray-50"
          >
            Vendor Dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}