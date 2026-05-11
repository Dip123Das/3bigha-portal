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

function vendorTrustLabel(score: number) {
  if (score >= 85) return "AI Trusted";
  if (score >= 70) return "Strong Match";
  if (score >= 55) return "Good Fit";
  return "Discovery Match";
}

function responseProbability(score: number) {
  if (score >= 85) return "High response probability";
  if (score >= 70) return "Good response probability";
  if (score >= 55) return "Moderate response probability";
  return "Standard response probability";
}

function procurementFit(score: number) {
  if (score >= 85) return "Excellent procurement fit";
  if (score >= 70) return "Strong procurement fit";
  if (score >= 55) return "Useful procurement fit";
  return "Basic procurement fit";
}

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

  const rankedVendors = [...discovery.recommendedVendors].sort(
    (a, b) => (b.recommendationScore || 0) - (a.recommendationScore || 0)
  );

  const topVendor = rankedVendors[0] || null;

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

          <div className="rounded-xl border bg-slate-950 p-4 text-white">
            <div className="text-sm text-blue-200">AI Decision</div>
            <div className="mt-1 font-semibold">
              {topVendor
                ? `${vendorTrustLabel(topVendor.recommendationScore)}: ${topVendor.businessName}`
                : "Compare top trusted vendors"}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-2xl border bg-gradient-to-r from-slate-950 to-blue-800 p-6 text-white">
        <div className="text-xs font-black uppercase tracking-wide text-blue-200">
          AI Vendor Discovery Intelligence
        </div>

        <h2 className="mt-2 text-2xl font-bold">
          Rank vendors by trust, response probability and procurement fit.
        </h2>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl bg-white/10 p-4">
            <div className="text-sm text-blue-100">Trust Engine</div>
            <div className="mt-1 text-lg font-bold">AI Verified Matching</div>
          </div>

          <div className="rounded-xl bg-white/10 p-4">
            <div className="text-sm text-blue-100">Response Signal</div>
            <div className="mt-1 text-lg font-bold">Fast Vendor Priority</div>
          </div>

          <div className="rounded-xl bg-white/10 p-4">
            <div className="text-sm text-blue-100">Procurement Fit</div>
            <div className="mt-1 text-lg font-bold">RFQ-ready Discovery</div>
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
        {rankedVendors.map((vendor, index) => {
          const score = vendor.recommendationScore || 0;

          return (
            <div
              key={vendor.vendorId}
              className="rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-black uppercase tracking-wide text-blue-700">
                    {index === 0 ? "🏆 Top AI Recommended" : "🤖 AI Ranked Vendor"}
                  </div>

                  <div className="mt-2 text-lg font-bold text-slate-950">
                    {vendor.businessName}
                  </div>
                </div>

                <div className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                  {score}/100
                </div>
              </div>

              <div className="mt-2 text-sm text-gray-500">
                {[vendor.locality, vendor.city, vendor.district]
                  .filter(Boolean)
                  .join(", ") || "Location available on profile"}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                  ✅ {vendorTrustLabel(score)}
                </span>
                <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-orange-700">
                  ⚡ {responseProbability(score)}
                </span>
                <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-black text-purple-700">
                  🎯 {procurementFit(score)}
                </span>
              </div>

              <p className="mt-4 text-sm leading-6 text-gray-600">
                {vendor.recommendationReason}
              </p>

              <div className="mt-5 grid gap-2">
                <Link
                  href={`/vendor/${vendor.slug}`}
                  className="rounded-xl bg-blue-700 px-4 py-3 text-center text-sm font-black text-white no-underline"
                >
                  View Vendor →
                </Link>

                <Link
                  href={`/rfq/general/new?query=${encodeURIComponent(query)}&vendor=${encodeURIComponent(vendor.vendorId)}`}
                  className="rounded-xl border px-4 py-3 text-center text-sm font-black text-slate-900 no-underline"
                >
                  Start RFQ with this vendor
                </Link>
              </div>
            </div>
          );
        })}
      </section>
    </main>
  );
}