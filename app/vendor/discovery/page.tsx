import Link from "next/link";

import {
  buildMarketplaceDiscovery,
  filterVendorsForDiscovery,
} from "@/lib/seo/marketplace-discovery-engine";

import { getMarketplaceDiscoveryVendors } from "@/lib/seo/marketplace-discovery-data";
import { buildProcurementKnowledgeGraph } from "@/lib/seo/procurement-knowledge-graph";

export const dynamic = "force-dynamic";

type SearchParams = {
  q?: string;
  city?: string;
  district?: string;
  locality?: string;
  category?: string;
  module?: string;
};

export default async function VendorDiscoveryPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const query = searchParams.q || searchParams.category || "recommended vendors";

  const vendors = await getMarketplaceDiscoveryVendors();

  const filteredVendors = filterVendorsForDiscovery(
    vendors,
    searchParams.q || searchParams.category
  );

  const discovery = buildMarketplaceDiscovery({
    query,
    city: searchParams.city || null,
    district: searchParams.district || null,
    locality: searchParams.locality || null,
    category: searchParams.category || null,
    vendors: filteredVendors.length > 0 ? filteredVendors : vendors,
  });

  const graph = buildProcurementKnowledgeGraph({
    title: query,
    module: searchParams.module || "marketplace",
    category: searchParams.category || null,
    city: searchParams.city || null,
    district: searchParams.district || null,
    locality: searchParams.locality || null,
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <section className="rounded-2xl border p-6">
        <div className="inline-flex rounded-full border px-3 py-1 text-xs font-semibold">
          AI Procurement Assistant
        </div>

        <h1 className="mt-4 text-3xl font-bold">
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

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border p-4">
            <div className="text-sm text-gray-500">Search Intent</div>
            <div className="mt-1 font-semibold">{query}</div>
          </div>

          <div className="rounded-xl border p-4">
            <div className="text-sm text-gray-500">Location</div>
            <div className="mt-1 font-semibold">
              {[searchParams.locality, searchParams.city, searchParams.district]
                .filter(Boolean)
                .join(", ") || "Marketplace wide"}
            </div>
          </div>

          <div className="rounded-xl border p-4">
            <div className="text-sm text-gray-500">Recommended Vendors</div>
            <div className="mt-1 font-semibold">
              {discovery.recommendedVendors.length}
            </div>
          </div>

          <div className="rounded-xl border p-4">
            <div className="text-sm text-gray-500">AI Decision</div>
            <div className="mt-1 font-semibold">
              Compare top trusted vendors
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-2xl border p-6">
        <h2 className="text-2xl font-bold">
          AI Procurement Guidance
        </h2>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border p-4">
            <div className="font-semibold">Recommended next steps</div>

            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-gray-600">
              <li>Compare the top recommended vendors before finalizing.</li>
              <li>Share quantity, delivery location and expected timeline.</li>
              <li>Prefer verified vendors with stronger marketplace signals.</li>
              <li>Create an RFQ if you want multiple competitive quotes.</li>
            </ul>
          </div>

          <div className="rounded-xl border p-4">
            <div className="font-semibold">Procurement graph summary</div>

            <p className="mt-3 text-sm text-gray-600">
              {graph.summary}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {graph.entities.slice(0, 6).map((entity) => (
                <span
                  key={entity.id}
                  className="rounded-full border px-3 py-2 text-xs"
                >
                  {entity.label}
                </span>
              ))}
            </div>
          </div>
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