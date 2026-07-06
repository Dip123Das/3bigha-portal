import Link from "next/link";

export const dynamic = "force-dynamic";

const seoTools = [
  {
    title: "robots.txt",
    description: "Controls what search engines can and cannot crawl on 3bigha.com.",
    href: "/robots.txt",
  },
  {
    title: "sitemap.xml",
    description: "Lists public marketplace, state, district and city SEO pages.",
    href: "/sitemap.xml",
  },
  {
    title: "Google Search Console",
    description: "Submit sitemap, monitor indexing, search traffic, ranking keywords and crawl errors.",
    href: "https://search.google.com/search-console",
  },
];

const completedFeatures = [
  "Central SEO config active",
  "Metadata helper ready",
  "robots.txt active",
  "sitemap.xml active",
  "Multilingual config active",
  "Global language switcher active",
  "State SEO hubs active",
  "District SEO hubs active",
  "City SEO pages active",
  "Live marketplace signals active",
  "Regional internal linking active",
  "FAQ schema active",
];

const seoExamples = [
  {
    title: "State SEO Hub",
    href: "/seo/property/west-bengal",
    path: "/seo/property/west-bengal",
  },
  {
    title: "District SEO Hub",
    href: "/seo/property/west-bengal/cooch-behar",
    path: "/seo/property/west-bengal/cooch-behar",
  },
  {
    title: "City SEO Page",
    href: "/seo/property/west-bengal/cooch-behar/cooch-behar-town",
    path: "/seo/property/west-bengal/cooch-behar/cooch-behar-town",
  },
];

const futureFeatures = [
  "AI SEO health score",
  "Missing metadata detector",
  "Duplicate title detector",
  "Regional keyword suggestions",
  "Multilingual SEO monitoring",
  "AI blog SEO optimizer",
  "OpenGraph preview",
  "Schema validator",
  "Broken SEO checker",
  "Smart search intent landing pages",
  "AI price trend SEO pages",
  "Pincode and locality SEO pages",
];

export default function AdminSeoPage() {
  return (
    <main style={{ width: "100%", padding: "24px clamp(14px,2vw,32px)" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 8 }}>
          SEO Control Center
        </h1>
        <p style={{ color: "#64748b", fontSize: 15, lineHeight: 1.7 }}>
          Manage technical SEO, sitemap, robots.txt, search indexing, regional SEO
          pages, AI marketplace discovery and future SEO growth for 3bigha.com.
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
              padding: 14,
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
          padding: 14,
          borderRadius: 20,
          border: "1px solid rgba(37,99,235,0.18)",
          background: "#ffffff",
          marginBottom: 24,
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 10 }}>
          Completed SEO Infrastructure
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          {completedFeatures.map((item) => (
            <div
              key={item}
              style={{
                padding: 14,
                borderRadius: 12,
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
          padding: 14,
          borderRadius: 20,
          border: "1px solid rgba(16,185,129,0.22)",
          background: "#ecfdf5",
          marginBottom: 24,
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 10 }}>
          Live Regional SEO Hierarchy
        </h2>

        <p style={{ color: "#047857", fontWeight: 800, lineHeight: 1.7 }}>
          3Bigha now supports State → District → City SEO pages with sitemap inclusion,
          internal linking and live marketplace signals.
        </p>

        <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
          {seoExamples.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              target="_blank"
              style={{
                padding: 14,
                borderRadius: 12,
                background: "#fff",
                border: "1px solid rgba(16,185,129,0.25)",
                color: "#064e3b",
                textDecoration: "none",
                fontWeight: 900,
              }}
            >
              {item.title}: {item.path}
            </Link>
          ))}
        </div>
      </section>

      <section
        style={{
          padding: 14,
          borderRadius: 20,
          border: "1px solid rgba(245,158,11,0.25)",
          background: "#fffbeb",
          marginBottom: 24,
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 10 }}>
          Google Search Console Action Plan
        </h2>

        <div style={{ display: "grid", gap: 10 }}>
          {[
            "Open Google Search Console and add https://www.3bigha.com as a domain/property.",
            "Verify domain ownership through DNS or HTML verification.",
            "Submit sitemap URL: https://www.3bigha.com/sitemap.xml",
            "Inspect homepage URL and request indexing.",
            "Inspect state SEO page: /seo/property/west-bengal.",
            "Inspect district SEO page: /seo/property/west-bengal/cooch-behar.",
            "Inspect city SEO page: /seo/property/west-bengal/cooch-behar/cooch-behar-town.",
            "Check indexing status weekly after new SEO pages, listings or blogs are published.",
          ].map((item, index) => (
            <div
              key={item}
              style={{
                padding: 14,
                borderRadius: 12,
                background: "#fff",
                border: "1px solid rgba(245,158,11,0.20)",
                fontWeight: 800,
                color: "#78350f",
              }}
            >
              {index + 1}. {item}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 16 }}>
          <Link
            href="https://search.google.com/search-console"
            target="_blank"
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              background: "#f59e0b",
              color: "#fff",
              fontWeight: 900,
              textDecoration: "none",
            }}
          >
            Open Search Console →
          </Link>

          <Link
            href="/sitemap.xml"
            target="_blank"
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              background: "#fff",
              color: "#92400e",
              fontWeight: 900,
              textDecoration: "none",
              border: "1px solid rgba(245,158,11,0.35)",
            }}
          >
            View Live Sitemap →
          </Link>
        </div>
      </section>

      <section
        style={{
          padding: 14,
          borderRadius: 20,
          border: "1px solid rgba(15,23,42,0.10)",
          background: "#fff",
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 10 }}>
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