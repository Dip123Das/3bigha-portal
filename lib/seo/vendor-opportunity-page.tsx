import Link from "next/link";
import { notFound } from "next/navigation";
import { siteConfig } from "@/lib/seo/site";
import { getVendorOpportunityRows, opportunityTitle } from "@/lib/seo/vendor-opportunity-seo";

export async function VendorOpportunitySeoPage({
  state,
  district,
  place,
}: {
  state: string;
  district?: string;
  place?: string;
}) {
  const rows = (await getVendorOpportunityRows()).filter((row) => {
    if (row.stateSlug !== state) return false;
    if (district && row.districtSlug !== district) return false;
    if (place && row.placeSlug !== place) return false;
    return true;
  });

  if (!rows.length) notFound();

  const first = rows[0];
  const location = place
    ? first.place
    : district
    ? first.district
    : first.state;

  const canonical = `${siteConfig.url}/vendor-opportunities/${state}${district ? `/${district}` : ""}${place ? `/${place}` : ""}`;

  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `Vendor opportunities in ${location}`,
    description: `Find active vendor requirements in ${location} for property, materials, services and rentals on 3Bigha.`,
    url: canonical,
    provider: {
      "@type": "Organization",
      name: "3Bigha",
      url: siteConfig.url,
    },
  };

  return (
    <main style={{ minHeight: "100vh", background: "#f8fafc", padding: "34px 16px" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      <section style={{ maxWidth: 1080, margin: "0 auto" }}>
        <div style={{ background: "white", border: "1px solid #dcfce7", borderRadius: 24, padding: 28 }}>
          <p style={{ margin: 0, color: "#15803d", fontWeight: 900 }}>Become vendor with AI powered 3Bigha</p>
          <h1 style={{ margin: "10px 0 0", fontSize: "clamp(30px,5vw,52px)", lineHeight: 1.05 }}>
            Vendor opportunities in {location}
          </h1>
          <p style={{ color: "#475569", fontSize: 17, maxWidth: 820 }}>
            3Bigha is identifying active marketplace gaps where local vendors, suppliers, service providers and rental businesses are needed.
          </p>
        </div>

        <div style={{ display: "grid", gap: 14, marginTop: 18 }}>
          {rows.map((row) => (
            <article key={row.id} style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 18, padding: 18 }}>
              <h2 style={{ margin: 0, fontSize: 22 }}>{opportunityTitle(row)}</h2>
              <p style={{ margin: "8px 0 0", color: "#475569" }}>
                Module: {row.module}. Recommended vendors needed: {row.recommended_vendor_count || 1}.
              </p>
              <Link href="/signup" style={{ display: "inline-block", marginTop: 12, fontWeight: 900, color: "#166534" }}>
                Register as vendor →
              </Link>
            </article>
          ))}
        </div>

        <p style={{ marginTop: 22 }}>
          <Link href="/vendor-opportunities">View all vendor opportunities</Link>
        </p>
      </section>
    </main>
  );
}
