import { Metadata } from "next";
import Script from "next/script";
import Link from "next/link";

import {
  RegistrationVerificationBadge,
  TrustStatusChip,
} from "@/components/trust";
import { buildVendorTrustSignals } from "@/lib/seo/vendor-trust-signals";
import { buildRelatedVendorEntities } from "@/lib/seo/vendor-related-entities";
import { getVendorAuthorityDataBySlug } from "@/lib/seo/vendor-authority-data";
import { getVendorReputationData } from "@/lib/seo/vendor-reputation-data";
import { calculateVendorLeaderboardScore } from "@/lib/seo/vendor-leaderboard-engine";
import { calculateVendorRecommendationScore } from "@/lib/seo/vendor-recommendation-engine";
import { buildVendorRecommendationClusters } from "@/lib/seo/vendor-recommendation-graph";
import { getVendorRecommendationCandidates } from "@/lib/seo/vendor-recommendation-data";

import { buildVendorInternalLinks } from "@/lib/seo/vendor-internal-links";

import {
  buildVendorAuthorityGraph,
  getVendorAuthoritySummary,
} from "@/lib/seo/vendor-authority-graph";

import { buildVendorAuthorityJsonLd } from "@/lib/seo/vendor-authority-jsonld";
import { buildVendorTrustReputation } from "@/lib/vendors/vendor-trust-reputation";

type Props = {
  params: {
    slug: string;
  };
};

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const fallbackVendorName = params.slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const vendorData = await getVendorAuthorityDataBySlug(params.slug);

  const vendorName = vendorData?.businessName || fallbackVendorName;

  return {
    title: `${vendorName} | Vendor Authority | 3Bigha`,
    description: `${vendorName} marketplace authority profile, services, materials, locations, trust signals and supplier expertise on 3Bigha.`,
  };
}

export default async function VendorAuthorityPage({
  params,
}: Props) {
  const fallbackVendorName = params.slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const vendorData = await getVendorAuthorityDataBySlug(params.slug);

  const vendorName = vendorData?.businessName || fallbackVendorName;

  const reputation = await getVendorReputationData(
    vendorData?.vendorId || params.slug
  );

  const graph = buildVendorAuthorityGraph({
    vendorId: vendorData?.vendorId || params.slug,

    businessName: vendorName,

    city: vendorData?.city || "Cooch Behar",

    district: vendorData?.district || "Cooch Behar",

    state: vendorData?.state || "West Bengal",

    locality: vendorData?.locality || "Khagrabari",

    categories: [
      "Construction Materials",
      "Building Suppliers",
    ],

    services: [
      "Cement Supply",
      "Steel Supply",
      "Construction Delivery",
    ],

    materials: [
      "Cement",
      "TMT Steel",
      "Sand",
      "Bricks",
    ],

    trustSignals: [
      "RFQ Active",
      ...(vendorData?.trust.mayDisplayVerifiedBadge
        ? ["Registration Verified"]
        : []),
      "Fast Response",
    ],

    rfqIntents: [
      "buy cement",
      "construction materials supplier",
      "best building materials vendor",
    ],

    reputationScore: reputation.reputationScore,
  });

  const summary = getVendorAuthoritySummary(graph);

    const leaderboard = calculateVendorLeaderboardScore({
    vendorId: vendorData?.vendorId || params.slug,
    businessName: vendorName,
    slug: params.slug,
    city: vendorData?.city || "Cooch Behar",
    district: vendorData?.district || "Cooch Behar",
    state: vendorData?.state || "West Bengal",
    category: summary.categories[0] || "Marketplace Vendor",
    subscriptionPlan: vendorData?.subscriptionPlan || "Gold",
    isVerified: vendorData?.trust.mayDisplayVerifiedBadge === true,
    boostActive: vendorData?.boostActive ?? true,
    reputationScore: reputation.reputationScore,
    authorityScore: summary.authorityScore,
    rfqActivityCount: reputation.rfqActivityCount,
    conversionRate: reputation.conversionRate,
  });

    const recommendationCandidates = await getVendorRecommendationCandidates(
    vendorData?.vendorId || params.slug
  );

    const recommendation = calculateVendorRecommendationScore({
    vendorId: vendorData?.vendorId || params.slug,
    businessName: vendorName,
    slug: params.slug,
    city: vendorData?.city || "Cooch Behar",
    district: vendorData?.district || "Cooch Behar",
    state: vendorData?.state || "West Bengal",
    locality: vendorData?.locality || "Khagrabari",
    category: summary.categories[0] || "Marketplace Vendor",
    services: summary.services,
    materials: summary.materials,
    searchIntent: summary.materials[0] || summary.services[0] || summary.categories[0],
    buyerCity: vendorData?.city || "Cooch Behar",
    buyerDistrict: vendorData?.district || "Cooch Behar",
    buyerLocality: vendorData?.locality || "Khagrabari",
    reputationScore: reputation.reputationScore,
    leaderboardScore: leaderboard.leaderboardScore,
    authorityScore: summary.authorityScore,
    conversionRate: reputation.conversionRate,
    isVerified: vendorData?.trust.mayDisplayVerifiedBadge === true,
    boostActive: vendorData?.boostActive ?? true,
  });

    const aiTrustReputation = buildVendorTrustReputation({
    isVerified: vendorData?.trust.mayDisplayVerifiedBadge === true,
    approvalStatus: undefined,
    city: vendorData?.city,
    locality: vendorData?.locality,
    district: vendorData?.district,
    description: summary.summary,
    boostPriority: vendorData?.boostActive ? 10 : 0,
    reputationScore: reputation.reputationScore,
    leaderboardScore: leaderboard.leaderboardScore,
    recommendationScore: recommendation.recommendationScore,
    totalMatches: reputation.totalMatches,
    totalConverted: reputation.totalConverted,
    readyDealSignals: reputation.totalConverted,
    riskScore: reputation.reputationScore >= 70 ? 10 : reputation.reputationScore >= 55 ? 25 : 40,
  });


    const recommendationClusters = buildVendorRecommendationClusters({
    baseVendor: {
      vendorId: vendorData?.vendorId || params.slug,
      businessName: vendorName,
      slug: params.slug,
      city: vendorData?.city || "Cooch Behar",
      district: vendorData?.district || "Cooch Behar",
      state: vendorData?.state || "West Bengal",
      locality: vendorData?.locality || "Khagrabari",
      category: summary.categories[0] || "Construction Materials",
      services: summary.services,
      materials: summary.materials,
      reputationScore: reputation.reputationScore,
      leaderboardScore: leaderboard.leaderboardScore,
      authorityScore: summary.authorityScore,
      conversionRate: reputation.conversionRate,
      isVerified: vendorData?.trust.mayDisplayVerifiedBadge === true,
      boostActive: vendorData?.boostActive ?? true,
    },
    candidateVendors: recommendationCandidates,
  });

  const trust = buildVendorTrustSignals({
    subscriptionPlan: vendorData?.subscriptionPlan || "Gold",

    isVerified: vendorData?.trust.mayDisplayVerifiedBadge === true,

    responseRate: 92,

    completedDeals: reputation.totalConverted,

    rfqResponses: reputation.rfqActivityCount,

    yearsActive: 5,

    boostActive: vendorData?.boostActive ?? true,
  });

  const jsonLd = buildVendorAuthorityJsonLd({
    graph,
    url: `https://www.3bigha.com/vendor/${params.slug}`,
  });

const internalLinks = buildVendorInternalLinks({
  vendorSlug: params.slug,

  state: vendorData?.state || "West Bengal",

  district: vendorData?.district || "Cooch Behar",

  city: vendorData?.city || "Cooch Behar Town",

  locality: vendorData?.locality || "Khagrabari",

  categories: summary.categories,

  services: summary.services,

  materials: summary.materials,
});

const relatedEntities = buildRelatedVendorEntities({
  state: vendorData?.state || "West Bengal",

  district: vendorData?.district || "Cooch Behar",

  city: vendorData?.city || "Cooch Behar Town",

  categories: summary.categories,

  services: summary.services,

  materials: summary.materials,
});

  return (
    <>
      <Script
        id="vendor-authority-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd),
        }}
      />

      <main className="w-full px-4 py-10">
        <div className="rounded-2xl border p-6">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold">
              {summary.vendorName}
            </h1>

            {vendorData?.trust ? (
              <>
                <TrustStatusChip trust={vendorData.trust} />
                <RegistrationVerificationBadge
                  trust={vendorData.trust}
                />
              </>
            ) : null}
          </div>

          <p className="mt-3 text-gray-600">
            {summary.summary}
          </p>
        
        <div className="mb-6 rounded-2xl border p-4">
          <Link
            href={`/vendor/discovery?q=${encodeURIComponent(
              summary.categories[0] || "recommended vendors"
            )}&city=${encodeURIComponent(
              vendorData?.city || "Cooch Behar"
            )}&district=${encodeURIComponent(
              vendorData?.district || "Cooch Behar"
            )}&locality=${encodeURIComponent(
              vendorData?.locality || "Khagrabari"
            )}`}
            className="font-medium"
          >
            Explore AI Recommended Vendors →
          </Link>

          <p className="mt-1 text-sm text-gray-500">
            Discover nearby and related vendors using AI marketplace intelligence.
          </p>
        </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-sm text-gray-500">
                Vendor Authority Score
              </div>

              <div className="mt-1 text-4xl font-bold">
                {summary.authorityScore}/100
              </div>
            </div>

            <div className="rounded-2xl border bg-amber-50 p-4">
              <div className="text-sm font-bold text-amber-700">
                Marketplace performance insight
              </div>

              <div className="mt-1 text-3xl font-black text-slate-900">
                {aiTrustReputation.score}/100
              </div>

              <div className="mt-1 text-sm font-bold text-amber-700">
                {aiTrustReputation.label}
              </div>

              <p className="mt-2 text-xs leading-5 text-gray-600">
                {aiTrustReputation.reason}
              </p>

              <p className="mt-2 text-xs leading-5 text-gray-500">
                Performance insights do not replace registration
                verification. The verified badge above is controlled
                only by canonical registration trust.
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {aiTrustReputation.badges.map((badge) => (
              <span
                key={badge}
                className="rounded-full border bg-white px-3 py-1 text-xs font-bold text-gray-700"
              >
                {badge}
              </span>
            ))}
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <section>
              <h2 className="text-xl font-semibold">
                Service Areas
              </h2>

              <ul className="mt-3 space-y-2">
                {summary.locations.map((location) => (
                  <li
                    key={location}
                    className="rounded-lg border px-3 py-2"
                  >
                    {location}
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold">
                Categories
              </h2>

              <ul className="mt-3 space-y-2">
                {summary.categories.map((category) => (
                  <li
                    key={category}
                    className="rounded-lg border px-3 py-2"
                  >
                    {category}
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold">
                Services
              </h2>

              <ul className="mt-3 space-y-2">
                {summary.services.map((service) => (
                  <li
                    key={service}
                    className="rounded-lg border px-3 py-2"
                  >
                    {service}
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold">
                Materials
              </h2>

              <ul className="mt-3 space-y-2">
                {summary.materials.map((material) => (
                  <li
                    key={material}
                    className="rounded-lg border px-3 py-2"
                  >
                    {material}
                  </li>
                ))}
              </ul>
            </section>
          </div>

                    <div className="mt-10 rounded-2xl border p-6">
            <h2 className="text-xl font-semibold">
              AI Recommendation Intelligence
            </h2>

            <div className="mt-4">
              <div className="text-sm text-gray-500">
                Recommendation Score
              </div>

              <div className="mt-1 text-4xl font-bold">
                {recommendation.recommendationScore}/100
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              {recommendation.matchSignals.map((signal) => (
                <div
                  key={signal}
                  className="rounded-full border px-4 py-2 text-sm"
                >
                  {signal}
                </div>
              ))}
            </div>

            <p className="mt-4 text-sm text-gray-600">
              {recommendation.recommendationReason}
            </p>
          </div>

                    <div className="mt-10 rounded-2xl border p-6">
            <h2 className="text-xl font-semibold">
              AI Marketplace Rank
            </h2>

            <div className="mt-4">
              <div className="text-sm text-gray-500">
                Leaderboard Score
              </div>

              <div className="mt-1 text-4xl font-bold">
                {leaderboard.leaderboardScore}/100
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              {leaderboard.rankSignals.map((signal) => (
                <div
                  key={signal}
                  className="rounded-full border px-4 py-2 text-sm"
                >
                  {signal}
                </div>
              ))}
            </div>

            <p className="mt-4 text-sm text-gray-600">
              {leaderboard.rankReason}
            </p>
          </div>

                    <div className="mt-10 rounded-2xl border p-6">
            <h2 className="text-xl font-semibold">
              Reputation Intelligence
            </h2>

            <div className="mt-5 grid gap-4 md:grid-cols-4">
              <div className="rounded-xl border p-4">
                <div className="text-sm text-gray-500">
                  RFQ Activity
                </div>

                <div className="mt-1 text-2xl font-bold">
                  {reputation.rfqActivityCount}
                </div>
              </div>

              <div className="rounded-xl border p-4">
                <div className="text-sm text-gray-500">
                  Matches
                </div>

                <div className="mt-1 text-2xl font-bold">
                  {reputation.totalMatches}
                </div>
              </div>

              <div className="rounded-xl border p-4">
                <div className="text-sm text-gray-500">
                  Converted Deals
                </div>

                <div className="mt-1 text-2xl font-bold">
                  {reputation.totalConverted}
                </div>
              </div>

              <div className="rounded-xl border p-4">
                <div className="text-sm text-gray-500">
                  Conversion Rate
                </div>

                <div className="mt-1 text-2xl font-bold">
                  {reputation.conversionRate}%
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-xl border p-4">
              <div className="text-sm text-gray-500">
                AI Reputation Score
              </div>

              <div className="mt-1 text-3xl font-bold">
                {reputation.reputationScore}/100
              </div>
            </div>
          </div>

          <h2 className="text-xl font-semibold">
            Trust Intelligence
          </h2>

          <div className="mt-4">
            <div className="text-sm text-gray-500">
              Marketplace Trust Score
            </div>

            <div className="mt-1 text-3xl font-bold">
              {trust.totalScore}/100
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            {trust.signals.map((signal) => (
              <div
                key={signal.label}
                className="rounded-full border px-4 py-2 text-sm"
              >
                {signal.label}
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {trust.signals.map((signal) => (
              <div
                key={signal.label}
                className="rounded-xl border p-4"
              >
                <div className="font-medium">
                  {signal.label}
                </div>

                <div className="mt-1 text-sm text-gray-500">
                  {signal.reason}
                </div>

                <div className="mt-2 text-sm font-semibold">
                  +{signal.score} authority points
                </div>
              </div>
            ))}
          </div>
          </div>
                  {recommendationClusters.length > 0 && (
          <div className="mt-12 rounded-2xl border p-6">
            <h2 className="text-2xl font-semibold">
              Recommended Vendor Clusters
            </h2>

            <p className="mt-2 text-sm text-gray-600">
              AI-generated supplier clusters based on locality, category, material, service and trust intelligence.
            </p>

            <div className="mt-6 space-y-6">
              {recommendationClusters.map((cluster) => (
                <section key={cluster.title} className="rounded-xl border p-4">
                  <h3 className="font-semibold">
                    {cluster.title}
                  </h3>

                  <p className="mt-1 text-sm text-gray-500">
                    {cluster.reason}
                  </p>

                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    {cluster.vendors.map((vendor) => (
                      <Link
                        key={vendor.vendorId}
                        href={`/vendor/${vendor.slug}`}
                        className="rounded-xl border p-4 transition hover:bg-gray-50"
                      >
                        <div className="font-medium">
                          {vendor.businessName}
                        </div>

                        <div className="mt-1 text-sm text-gray-500">
                          {vendor.locality || vendor.city || vendor.district}
                        </div>

                        <div className="mt-3 text-sm font-semibold">
                          Recommendation: {vendor.recommendationScore}/100
                        </div>

                        <div className="mt-2 text-xs text-gray-500">
                          {vendor.recommendationReason}
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        )}
        <div className="mt-12 rounded-2xl border p-6">
          <h2 className="text-2xl font-semibold">
            Related Marketplace Intelligence
          </h2>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {internalLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-xl border p-4 transition hover:bg-gray-50"
              >
                <div className="font-medium">
                  {link.title}
                </div>

                <div className="mt-1 text-sm text-gray-500">
                  {link.reason}
                </div>
              </Link>
            ))}
          </div>
        </div>
        <div className="mt-12 rounded-2xl border p-6">
          <h2 className="text-2xl font-semibold">
            Related Vendor Intelligence
          </h2>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {relatedEntities.map((entity) => (
              <Link
                key={entity.href}
                href={entity.href}
                className="rounded-xl border p-4 transition hover:bg-gray-50"
              >
                <div className="font-medium">
                  {entity.title}
                </div>

                <div className="mt-1 text-sm text-gray-500">
                  {entity.reason}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
