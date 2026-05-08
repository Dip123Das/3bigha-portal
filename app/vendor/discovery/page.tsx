import Link from "next/link";

import {
  buildMarketplaceDiscovery,
  filterVendorsForDiscovery,
} from "@/lib/seo/marketplace-discovery-engine";

import { getMarketplaceDiscoveryVendors } from "@/lib/seo/marketplace-discovery-data";

export const dynamic = "force-dynamic";

type SearchParams = {
  q?: string;
  city?: string;
  district?: string;
  locality?: string;
  category?: string;
};

export default async function VendorDiscoveryPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const vendors = await getMarketplaceDiscoveryVendors();

  const filteredVendors = filterVendorsForDiscovery(
    vendors,
    searchParams.q || searchParams.category
  );

  const discovery = buildMarketplaceDiscovery({
    query: searchParams.q || searchParams.category || "recommended vendors",
    city: searchParams.city || null,
    district: searchParams.district || null,
    locality: searchParams.locality || null,
    category: searchParams.category || null,
    vendors: filteredVendors.length > 0 ? filteredVendors : vendors,
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <section className="rounded-2xl border p-6">
        <h1 className="text-3xl font-bold">
          AI Vendor Discovery
        </h1>

        <p className="mt-3 text-gray-600">
          {discovery.summary}
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          {discovery.discoverySignals.map((signal) => (
            <span
              key={signal}
              className="rounded-full border px-4 py-2 text-sm"
            >
              {signal}
            </span>
          ))}
        </div>
      </section>

      <section className="mt-8 grid gap-5 md:grid-cols-3">
        {discovery.recommendedVendors.map((vendor) => (
          <Link
            key={vendor.vendorId}
            href={`/vendor/${vendor.slug}`}
            className="rounded-2xl border p-5 transition hover:bg-gray-50"
          >
            <div className="text-lg font-semibold">
              {vendor.businessName}
            </div>

            <div className="mt-1 text-sm text-gray-500">
              {[vendor.locality, vendor.city, vendor.district]
                .filter(Boolean)
                .join(", ")}
            </div>

            <div className="mt-4 text-sm text-gray-500">
              Recommendation Score
            </div>

            <div className="mt-1 text-3xl font-bold">
              {vendor.recommendationScore}/100
            </div>

            <p className="mt-3 text-sm text-gray-600">
              {vendor.recommendationReason}
            </p>
          </Link>
        ))}
      </section>
    </main>
  );
}