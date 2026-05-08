import Link from "next/link";
import type { Metadata } from "next";

import { siteConfig } from "@/lib/seo/site";
import { parseAiSearchIntent } from "@/lib/search/ai-search-intent";
import { getAiSearchContent } from "@/lib/search/ai-search-content";
import { getSearchKeywordClusters } from "@/lib/search/search-keyword-clusters";
import { getLiveMarketSignals, getMarketInsights } from "@/lib/seo/live-market-signals";

type PageProps = {
  params: {
    slug: string;
  };
};

function slugToQuery(slug: string) {
  return decodeURIComponent(slug)
    .replace(/-/g, " ")
    .trim();
}

function queryToSlug(query: string) {
  return query
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const query = slugToQuery(params.slug);
  const intent = parseAiSearchIntent(query);
  const content = getAiSearchContent(intent);

  return {
    title: content.title,
    description: content.description,
    alternates: {
      canonical: `${siteConfig.url}/search/${params.slug}`,
    },
  };
}

export default function SearchSeoLandingPage({ params }: PageProps) {
  const query = slugToQuery(params.slug);
  const intent = parseAiSearchIntent(query);
  const content = getAiSearchContent(intent);

  const area = intent.areaHint || "your area";

  const clusters = getSearchKeywordClusters({
    query,
    module: intent.module,
    area,
  });

  const signals = intent.module
    ? getLiveMarketSignals({
        module: intent.module,
        area,
      })
    : [];

  const insights = intent.module
    ? getMarketInsights({
        module: intent.module,
        area,
      })
    : [];

  const searchUrl = `/search?q=${encodeURIComponent(query)}${
    intent.module ? `&module=${intent.module}` : ""
  }`;

  const rfqUrl = `/rfq/general/new?q=${encodeURIComponent(query)}${
    intent.module ? `&module=${intent.module}` : ""
  }`;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg,#f8fafc 0%,#ffffff 100%)",
      }}
    >
      <section
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "56px 16px 34px",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            background: "#eff6ff",
            color: "#1d4ed8",
            border: "1px solid #bfdbfe",
            borderRadius: 999,
            padding: "8px 14px",
            fontWeight: 950,
            fontSize: 12,
            textTransform: "uppercase",
            letterSpacing: 0.4,
          }}
        >
          AI Search SEO Landing
        </div>

        <h1
          style={{
            marginTop: 18,
            marginBottom: 16,
            color: "#0f172a",
            fontSize: 44,
            lineHeight: 1.1,
          }}
        >
          {content.heading}
        </h1>

        <p
          style={{
            maxWidth: 920,
            color: "#475569",
            fontSize: 18,
            lineHeight: 1.8,
            margin: 0,
            fontWeight: 600,
          }}
        >
          {content.description}
        </p>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            marginTop: 24,
          }}
        >
          <Link
            href={searchUrl}
            style={{
              background: "#16a34a",
              color: "#ffffff",
              borderRadius: 999,
              padding: "12px 18px",
              textDecoration: "none",
              fontWeight: 950,
            }}
          >
            🔎 View live results
          </Link>

          <Link
            href={rfqUrl}
            style={{
              background: "#4f46e5",
              color: "#ffffff",
              borderRadius: 999,
              padding: "12px 18px",
              textDecoration: "none",
              fontWeight: 950,
            }}
          >
            📝 Post requirement
          </Link>
        </div>
      </section>

      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "0 16px 34px" }}>
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 26,
            padding: 28,
          }}
        >
          <h2 style={{ marginTop: 0, color: "#0f172a", fontSize: 30 }}>
            Search intent explained
          </h2>

          {content.paragraphs.map((paragraph) => (
            <p
              key={paragraph}
              style={{
                color: "#334155",
                lineHeight: 1.9,
                fontSize: 16,
                fontWeight: 500,
              }}
            >
              {paragraph}
            </p>
          ))}
        </div>
      </section>

      {signals.length ? (
        <section style={{ maxWidth: 1180, margin: "0 auto", padding: "0 16px 34px" }}>
          <div
            style={{
              background: "linear-gradient(135deg,#ecfeff,#ffffff)",
              border: "1px solid #a5f3fc",
              borderRadius: 26,
              padding: 28,
            }}
          >
            <h2 style={{ marginTop: 0, color: "#0f172a", fontSize: 30 }}>
              Marketplace signals for {area}
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
                gap: 16,
                marginTop: 22,
              }}
            >
              {signals.map((signal) => (
                <div
                  key={signal.label}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #dbeafe",
                    borderRadius: 22,
                    padding: 22,
                  }}
                >
                  <div style={{ color: "#475569", fontSize: 14, fontWeight: 800 }}>
                    {signal.label}
                  </div>

                  <div
                    style={{
                      marginTop: 10,
                      fontSize: 34,
                      fontWeight: 950,
                      color: "#0f172a",
                    }}
                  >
                    {signal.value}
                  </div>

                  <div
                    style={{
                      marginTop: 10,
                      color: signal.trend === "up" ? "#16a34a" : "#475569",
                      fontWeight: 850,
                    }}
                  >
                    {signal.trend === "up" ? "▲ Trending Up" : "● Stable"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {insights.length ? (
        <section style={{ maxWidth: 1180, margin: "0 auto", padding: "0 16px 34px" }}>
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 26,
              padding: 28,
            }}
          >
            <h2 style={{ marginTop: 0, color: "#0f172a", fontSize: 30 }}>
              Local market insights
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
                gap: 16,
              }}
            >
              {insights.map((item) => (
                <div
                  key={item.title}
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: 20,
                    padding: 20,
                  }}
                >
                  <h3 style={{ marginTop: 0, color: "#0f172a" }}>{item.title}</h3>
                  <p style={{ margin: 0, color: "#475569", lineHeight: 1.8 }}>
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "0 16px 60px" }}>
        <div
          style={{
            background: "linear-gradient(135deg,#f5f3ff,#ffffff)",
            border: "1px solid #ddd6fe",
            borderRadius: 26,
            padding: 28,
          }}
        >
          <h2 style={{ marginTop: 0, color: "#0f172a", fontSize: 30 }}>
            Related AI search clusters
          </h2>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 18 }}>
            {[...clusters.related.slice(0, 12), ...clusters.price.slice(0, 6)].map((item) => (
              <Link
                key={item}
                href={`/search/${queryToSlug(item)}`}
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 999,
                  padding: "10px 14px",
                  color: "#0f172a",
                  textDecoration: "none",
                  fontWeight: 850,
                  fontSize: 13,
                }}
              >
                🔎 {item}
              </Link>
            ))}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 16 }}>
            {clusters.rfq.slice(0, 8).map((item) => (
              <Link
                key={item}
                href={`/rfq/general/new?q=${encodeURIComponent(item)}${
                  intent.module ? `&module=${intent.module}` : ""
                }`}
                style={{
                  background: "#ffffff",
                  border: "1px solid #ddd6fe",
                  borderRadius: 999,
                  padding: "10px 14px",
                  color: "#4c1d95",
                  textDecoration: "none",
                  fontWeight: 900,
                  fontSize: 13,
                }}
              >
                📝 {item}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}