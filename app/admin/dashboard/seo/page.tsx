import Link from "next/link";

export const dynamic = "force-dynamic";

const seoTools = [
  {
    title: "robots.txt",
    description:
      "Controls what search engines can and cannot crawl on 3bigha.com.",
    href: "/robots.txt",
  },
  {
    title: "sitemap.xml",
    description:
      "Lists public marketplace pages for Google and other search engines.",
    href: "/sitemap.xml",
  },
  {
    title: "Google Search Console",
    description:
      "Submit sitemap, monitor indexing, search traffic, ranking keywords and crawl errors.",
    href: "https://search.google.com/search-console",
  },
];

const futureFeatures = [
  "AI SEO health score",
  "Missing metadata detector",
  "Duplicate title detector",
  "Regional keyword suggestions",
  "Multilingual SEO monitoring",
  "District-wise SEO page generator",
  "AI blog SEO optimizer",
  "OpenGraph preview",
  "Schema validator",
  "Broken SEO checker",
];

export default function AdminSeoPage() {
  return (
    <main style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 8 }}>
          SEO Control Center
        </h1>
        <p style={{ color: "#64748b", fontSize: 15, lineHeight: 1.7 }}>
          Manage technical SEO, sitemap, robots.txt, search indexing, regional
          SEO planning and future AI-powered SEO growth for 3bigha.com.
        </p>
      </div>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        {seoTools.map((tool) => (
          <Link
            key={tool.title}
            href={tool.href}
            target={tool.href.startsWith("http") ? "_blank" : undefined}
            style={{
              display: "block",
              padding: 18,
              borderRadius: 18,
              border: "1px solid rgba(15,23,42,0.10)",
              background: "#fff",
              textDecoration: "none",
              color: "#0f172a",
              boxShadow: "0 10px 24px rgba(15,23,42,0.06)",
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 8 }}>
              {tool.title}
            </div>
            <p style={{ margin: 0, color: "#64748b", lineHeight: 1.6 }}>
              {tool.description}
            </p>
          </Link>
        ))}
      </section>

      <section
        style={{
          padding: 20,
          borderRadius: 20,
          border: "1px solid rgba(37,99,235,0.18)",
          background:
            "linear-gradient(135deg, rgba(37,99,235,0.08), rgba(16,185,129,0.08))",
          marginBottom: 24,
        }}
      >
        <h2 style={{ fontSize: 22, fontWeight: 900, marginBottom: 10 }}>
          Current SEO Foundation Status
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          {[
            "Central SEO config active",
            "Metadata helper ready",
            "robots.txt active",
            "sitemap.xml active",
            "Multilingual config active",
            "Global language switcher active",
          ].map((item) => (
            <div
              key={item}
              style={{
                padding: 14,
                borderRadius: 14,
                background: "#fff",
                fontWeight: 800,
                border: "1px solid rgba(15,23,42,0.08)",
              }}
            >
              ✅ {item}
            </div>
          ))}
        </div>
      </section>

      <section
        style={{
          padding: 20,
          borderRadius: 20,
          border: "1px solid rgba(15,23,42,0.10)",
          background: "#fff",
        }}
      >
        <h2 style={{ fontSize: 22, fontWeight: 900, marginBottom: 10 }}>
          Coming AI SEO Features
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 10,
          }}
        >
          {futureFeatures.map((feature) => (
            <div
              key={feature}
              style={{
                padding: 12,
                borderRadius: 12,
                background: "#f8fafc",
                border: "1px solid rgba(15,23,42,0.06)",
                fontWeight: 700,
              }}
            >
              🚀 {feature}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}