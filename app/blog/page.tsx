"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Card, CardBody, CardFooter } from "@/components/ui/Card";
import { Grid } from "@/components/ui/Grid";
import { Badge } from "@/components/ui/Badge";
import JsonLd from "@/components/seo/JsonLd";
import { breadcrumbSchema } from "@/lib/seo/schema";
import { ActionButton } from "@/components/ui/ActionButton";

type BlogPostListRow = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  published_at: string | null;
  created_at: string;
};

type CatalogItem = {
  name: string;
  slug: string;
  keywords: string[];
};

type CatalogGroup = {
  group: string;
  items: CatalogItem[];
};

function fmtDate(iso: string | null) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return "";
  }
}

function normalizeText(s: string) {
  return (s || "").toLowerCase();
}

// ✅ Your categories + expanded (with best-effort keywords)
const BLOG_CATALOG: CatalogGroup[] = [
  {
    group: "Platform & Ecosystem",
    items: [
      { name: "Announcements", slug: "announcements", keywords: ["announcement", "launch", "released", "partnership", "notice"] },
      { name: "Platform Updates", slug: "platform-updates", keywords: ["update", "feature", "release", "ui", "bug", "roadmap"] },
    ],
  },
  {
    group: "Property, Construction & Engineering",
    items: [
      { name: "How-To Guides (General)", slug: "how-to-guides", keywords: ["how to", "guide", "steps", "process", "checklist"] },
      { name: "Construction Guides", slug: "construction-guides", keywords: ["construction", "contractor", "site", "supervision", "plan", "estimate"] },
      { name: "Engineering & Structural (Civil)", slug: "engineering-civil", keywords: ["engineering", "civil", "structural", "rcc", "beam", "column", "foundation", "slab"] },
      { name: "Materials & Product Insights", slug: "materials-insights", keywords: ["cement", "tmt", "steel", "brick", "aggregate", "sand", "paint", "tiles", "quality"] },
      { name: "Services & Hiring Tips", slug: "services-hiring", keywords: ["engineer", "architect", "contractor", "hire", "quotation", "scope", "warranty"] },
      { name: "Rentals & Equipment", slug: "rentals-equipment", keywords: ["rental", "rent", "equipment", "jcb", "mixer", "scaffolding", "generator"] },
    ],
  },
  {
    group: "Land, Registration & Documentation",
    items: [
      {
        name: "Land & Property Registration (State-wise)",
        slug: "registration-state-wise",
        keywords: ["registration", "register", "sale deed", "sub registrar", "sro", "state wise", "online registration", "flat registration", "land registration"],
      },
      { name: "Stamp Duty, Registration Fees & Charges", slug: "stamp-duty-fees", keywords: ["stamp duty", "fees", "charges", "registration fee", "circle rate", "guideline value"] },
      { name: "Mutation, Conversion & Records", slug: "mutation-records", keywords: ["mutation", "conversion", "khatiyan", "ror", "record of rights", "jamabandi", "land records"] },
    ],
  },
  {
    group: "Law, Disputes & Compliance",
    items: [
      { name: "Legal & Documentation Basics", slug: "legal-basics", keywords: ["agreement", "sale deed", "will", "inheritance", "gpa", "power of attorney", "documents"] },
      { name: "Land Disputes & Resolution", slug: "land-disputes", keywords: ["dispute", "boundary", "encroachment", "partition", "possession", "title", "case"] },
      { name: "Regulations & Policy Updates", slug: "policy-updates", keywords: ["rera", "rule", "notification", "circular", "policy", "amendment", "gazette"] },
    ],
  },
  {
    group: "Local Authority Rules",
    items: [
      {
        name: "Municipality / Corporation / Panchayat Rules",
        slug: "local-authority-rules",
        keywords: ["municipality", "corporation", "panchayat", "building plan", "sanction", "setback", "approval", "noc", "permit"],
      },
    ],
  },
  {
    group: "Market & Finance",
    items: [
      { name: "Real Estate Market & Trends", slug: "market-trends", keywords: ["market", "trend", "price", "rate", "demand", "supply", "locality"] },
      { name: "Finance, Loans & Tax", slug: "finance-loans-tax", keywords: ["loan", "emi", "bank", "subsidy", "tax", "gst", "income tax", "tds"] },
    ],
  },
  {
    group: "Safety & Standards",
    items: [
      { name: "Safety, Quality & Standards", slug: "safety-standards", keywords: ["safety", "quality", "standard", "is code", "testing", "check", "inspection"] },
    ],
  },
  {
    group: "Community & Regional",
    items: [
      { name: "Local Spotlight (Cooch Behar & Bengal)", slug: "local-spotlight", keywords: ["cooch behar", "bengal", "west bengal", "local", "area", "development"] },
      { name: "Case Studies & Success Stories", slug: "case-studies", keywords: ["case study", "success", "story", "project", "before after", "lessons"] },
      { name: "Community & CSR", slug: "community-csr", keywords: ["community", "csr", "awareness", "help", "initiative", "campaign"] },
    ],
  },
  {
    group: "Quick Reads & News",
    items: [
      { name: "Tips & Checklists", slug: "tips-checklists", keywords: ["tips", "checklist", "do's", "donts", "quick"] },
      { name: "Industry News", slug: "industry-news", keywords: ["news", "industry", "scheme", "government", "project", "tender"] },
    ],
  },
];

function findCatalogItem(slug: string | null) {
  if (!slug) return null;
  for (const g of BLOG_CATALOG) {
    const it = g.items.find((x) => x.slug === slug);
    if (it) return it;
  }
  return null;
}

function MessageBox(props: { title: string; description?: string }) {
  return (
    <div
      style={{
        border: "1px solid rgba(0,0,0,0.08)",
        borderRadius: 12,
        padding: 16,
        background: "rgba(0,0,0,0.02)",
      }}
    >
      <div style={{ fontWeight: 800, marginBottom: 6 }}>{props.title}</div>
      {props.description ? <div style={{ opacity: 0.8, lineHeight: 1.5 }}>{props.description}</div> : null}
    </div>
  );
}

export default function BlogIndexPage() {
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<BlogPostListRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [selectedCat, setSelectedCat] = useState<string>("all");
  const [q, setQ] = useState("");

  async function loadPublished() {
    setLoading(true);
    setError(null);

    const first = await supabase
      .from("blog_posts")
      .select("id,title,slug,excerpt,published_at,created_at")
      .eq("status", "published")
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(60);

    if (first.error && /jwt expired/i.test(first.error.message)) {
      try {
        await supabase.auth.signOut();
      } catch {}
      const retry = await supabase
        .from("blog_posts")
        .select("id,title,slug,excerpt,published_at,created_at")
        .eq("status", "published")
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(60);

      if (retry.error) {
        setError(retry.error.message);
        setPosts([]);
        setLoading(false);
        return;
      }

      setPosts((retry.data ?? []) as BlogPostListRow[]);
      setLoading(false);
      return;
    }

    if (first.error) {
      setError(first.error.message);
      setPosts([]);
      setLoading(false);
      return;
    }

    setPosts((first.data ?? []) as BlogPostListRow[]);
    setLoading(false);
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!alive) return;
      await loadPublished();
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  const selectedItem = useMemo(() => {
    if (selectedCat === "all") return null;
    return findCatalogItem(selectedCat);
  }, [selectedCat]);

  const filtered = useMemo(() => {
    const query = normalizeText(q);
    const base = posts.filter((p) => {
      if (!query) return true;
      const hay = normalizeText(`${p.title}\n${p.excerpt ?? ""}`);
      return hay.includes(query);
    });

    if (!selectedItem) return base;

    const kws = selectedItem.keywords.map((k) => k.toLowerCase());
    return base.filter((p) => {
      const hay = normalizeText(`${p.title}\n${p.excerpt ?? ""}`);
      return kws.some((k) => hay.includes(k));
    });
  }, [posts, q, selectedItem]);

  return (
    <Container>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", url: "https://www.3bigha.com" },
          { name: "Blog", url: "https://www.3bigha.com/blog" },
        ])}
      />

      <SectionHeader title="Blog" subtitle="Latest updates, guides, and announcements from 3bigha.com" />

      <Card>
        <CardBody>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ fontWeight: 800, fontSize: 16 }}>Explore Posts</div>
              <div style={{ color: "#5b6472", fontSize: 13 }}>
                Read published posts publicly. Create drafts from your account.
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <select
                value={selectedCat}
                onChange={(e) => setSelectedCat(e.target.value)}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  background: "white",
                  fontWeight: 700,
                }}
              >
                <option value="all">Browse Catalog — All</option>
                {BLOG_CATALOG.map((g) => (
                  <optgroup key={g.group} label={g.group}>
                    {g.items.map((it) => (
                      <option key={it.slug} value={it.slug}>
                        {it.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>

              <ActionButton href="/blog/my" variant="secondary">
                My Posts →
              </ActionButton>

              <ActionButton href="/blog/new" variant="primary">
                Write a Post →
              </ActionButton>

              {/* ✅ Use normal button (ActionButton may not support onClick/disabled) */}
              <button
                type="button"
                onClick={() => loadPublished()}
                disabled={loading}
                style={{
                  height: 40,
                  padding: "0 14px",
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,0.12)",
                  background: "white",
                  fontWeight: 900,
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search posts (title, excerpt)…"
              style={{
                flex: "1 1 360px",
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                outline: "none",
              }}
            />

            <Badge>Total: {filtered.length}</Badge>
            {selectedItem ? <Badge>Category: {selectedItem.name}</Badge> : <Badge>Category: All</Badge>}
          </div>

          {selectedItem ? (
            <div style={{ marginTop: 10, color: "#5b6472", fontSize: 12 }}>
              Showing posts that match this category by keywords (title/excerpt). When we add a category field in DB,
              this filter will become exact.
            </div>
          ) : null}
        </CardBody>
      </Card>

      <div style={{ marginTop: 14 }}>
        {error ? (
          <MessageBox title="Could not load posts" description={error} />
        ) : loading ? (
          <MessageBox title="Loading..." description="Fetching published posts..." />
        ) : filtered.length === 0 ? (
          <MessageBox title="No posts yet" description="Published posts will appear here." />
        ) : (
          <Grid>
            {filtered.map((p) => (
              <Card key={p.id}>
                <CardBody>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
                    <Badge>{fmtDate(p.published_at ?? p.created_at) || "Published"}</Badge>
                    {selectedItem ? <Badge>{selectedItem.name}</Badge> : null}
                  </div>

                  <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
                    <Link href={`/blog/${encodeURIComponent(p.slug)}`} style={{ textDecoration: "none" }}>
                      {p.title}
                    </Link>
                  </h3>

                  {p.excerpt ? (
                    <p style={{ margin: 0, opacity: 0.85 }}>{p.excerpt}</p>
                  ) : (
                    <p style={{ margin: 0, opacity: 0.6 }}>No excerpt.</p>
                  )}
                </CardBody>

                <CardFooter>
                  <Link href={`/blog/${encodeURIComponent(p.slug)}`} style={{ fontWeight: 600 }}>
                    Read →
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </Grid>
        )}
      </div>
    </Container>
  );
}
