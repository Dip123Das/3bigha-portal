// app/blog/[slug]/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Card, CardBody, CardFooter } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import JsonLd from "@/components/seo/JsonLd";
import { breadcrumbSchema } from "@/lib/seo/schema";
import { siteConfig } from "@/lib/seo/site";
import { EmptyState } from "@/components/ui/EmptyState";

type BlogRow = {
  id: string; // ✅ needed for inquiries.ref_id
  author_id: string;
  title: string | null;
  slug: string;
  excerpt: string | null;
  content: string | null;
  status: string | null;
  published_at: string | null;
};

type InquiryInsert = {
  module: "blog";
  ref_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  message: string | null;
};

function fmt(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function estimateReadingTime(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 220));
  return { words, minutes };
}

function safeLower(s: string | null | undefined) {
  return (s ?? "").toLowerCase().trim();
}

export default function BlogPostPage() {
  const params = useParams<{ slug: string }>();
  const slug = (params?.slug ?? "") as string;

  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [loading, setLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string | null>(null);
  const [post, setPost] = useState<BlogRow | null>(null);

  // Inquiry form
  const [inqName, setInqName] = useState("");
  const [inqPhone, setInqPhone] = useState("");
  const [inqEmail, setInqEmail] = useState("");
  const [inqMsg, setInqMsg] = useState("");
  const [inqBusy, setInqBusy] = useState(false);
  const [inqOk, setInqOk] = useState<string | null>(null);
  const [inqErr, setInqErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setErr(null);
      setPost(null);

      if (!slug) {
        setErr("Missing blog slug.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("blog_posts")
        .select("id,author_id,title,slug,excerpt,content,status,published_at") // ✅ include id
        .eq("slug", slug)
        .maybeSingle();

      if (!alive) return;

      if (error) {
        setErr(error.message);
        setLoading(false);
        return;
      }

      const row = (data ?? null) as unknown as BlogRow | null;

      // Public rule: show only published posts
      if (!row || safeLower(row.status) !== "published") {
        setPost(null);
        setErr(null);
        setLoading(false);
        return;
      }

      setPost(row);
      setLoading(false);
    }

    load();
    return () => {
      alive = false;
    };
  }, [supabase, slug]);

  async function submitInquiry() {
    setInqOk(null);
    setInqErr(null);

    if (!post?.id) {
      setInqErr("Post not loaded.");
      return;
    }

    const name = inqName.trim();
    const phone = inqPhone.trim();
    const email = inqEmail.trim();
    const message = inqMsg.trim();

    if (!name) {
      setInqErr("Please enter your name.");
      return;
    }
    if (!phone && !email) {
      setInqErr("Please enter phone or email.");
      return;
    }

    const payload: InquiryInsert = {
      module: "blog",
      ref_id: post.id,
      name,
      phone: phone || null,
      email: email || null,
      message: message || null,
    };

    setInqBusy(true);
    try {
      const ins = await supabase.from("inquiries").insert(payload as any);
      if (ins.error) throw ins.error;

      setInqOk("Thanks! Your message has been sent.");
      setInqName("");
      setInqPhone("");
      setInqEmail("");
      setInqMsg("");
    } catch (e: any) {
      setInqErr(e?.message || "Failed to send message.");
    } finally {
      setInqBusy(false);
    }
  }

  if (loading) {
    return (
      <main>
        <Container>
          <SectionHeader title="Blog" subtitle="Loading..." />
          <EmptyState message="Loading post…" />
        </Container>
      </main>
    );
  }

  if (err) {
    return (
      <main>
        <Container>
          <SectionHeader title="Blog" subtitle="" />
          <div style={{ color: "crimson", fontWeight: 800, marginBottom: 10 }}>{err}</div>
          <Link href="/blog" style={{ fontWeight: 800 }}>
            ← Back to Blog
          </Link>
        </Container>
      </main>
    );
  }

  if (!post) {
    return (
      <main>
        <Container>
          <SectionHeader title="Blog" subtitle="" />
          <div style={{ opacity: 0.85, marginBottom: 10 }}>
            This post is not available publicly (not found or not published).
          </div>
          <Link href="/blog" style={{ fontWeight: 800 }}>
            ← Back to Blog
          </Link>
        </Container>
      </main>
    );
  }

  const title = (post.title ?? "").trim() || "Untitled post";
  const excerpt = (post.excerpt ?? "").trim();
  const content = (post.content ?? "").trim();

  const rt = estimateReadingTime([title, excerpt, content].join("\n\n"));

  const canonicalUrl = `${siteConfig.url}/blog/${encodeURIComponent(post.slug || slug)}`;

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description:
      excerpt ||
      "Real estate, construction, materials, rentals and investment article from 3bigha.com.",
    url: canonicalUrl,
    datePublished: post.published_at || undefined,
    author: {
      "@type": "Organization",
      name: "3bigha",
    },
    publisher: {
      "@type": "Organization",
      name: "3bigha",
      logo: {
        "@type": "ImageObject",
        url: `${siteConfig.url}/logo.png`,
      },
    },
  };

  return (
    <main>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: "Home", url: siteConfig.url },
            { name: "Blog", url: `${siteConfig.url}/blog` },
            { name: title, url: canonicalUrl },
          ]),
          articleSchema,
        ]}
      />

      <Container>
        <SectionHeader title={title} subtitle={excerpt || ""} />

        {/* Top bar */}
        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            marginBottom: 12,
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <Link href="/blog" style={{ fontWeight: 800 }}>
              ← Back to Blog
            </Link>
            <Badge>published</Badge>
            <Badge>{rt.minutes} min read</Badge>
            <Badge>{rt.words.toLocaleString()} words</Badge>
            <Badge>Published: {fmt(post.published_at)}</Badge>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={() => {
                const url = typeof window !== "undefined" ? window.location.href : "";
                if (!url) return;
                navigator.clipboard?.writeText(url);
              }}
              style={{
                border: "1px solid rgba(0,0,0,0.12)",
                borderRadius: 12,
                padding: "10px 12px",
                fontWeight: 800,
                background: "#fff",
                cursor: "pointer",
              }}
            >
              Copy link
            </button>
          </div>
        </div>

        {/* Content + Inquiry */}
        <div style={{ display: "grid", gap: 14, gridTemplateColumns: "2fr 1fr", alignItems: "start" }}>
          {/* Content */}
          <Card>
            <CardBody>
              <div style={{ maxWidth: 860, margin: "0 auto" }}>
                {excerpt ? (
                  <div
                    style={{
                      padding: "12px 14px",
                      borderRadius: 12,
                      border: "1px solid rgba(0,0,0,0.08)",
                      background: "rgba(0,0,0,0.02)",
                      marginBottom: 14,
                      lineHeight: 1.65,
                      fontSize: 14,
                      opacity: 0.92,
                    }}
                  >
                    <div style={{ fontWeight: 900, marginBottom: 6 }}>Summary</div>
                    {excerpt}
                  </div>
                ) : null}

                <div
                  style={{
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.9,
                    fontSize: 15,
                    color: "#1f2937",
                  }}
                >
                  {content || "No content."}
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Inquiry */}
          <Card>
            <CardBody>
              <div style={{ fontWeight: 950, marginBottom: 8 }}>Contact / Inquiry</div>

              <div style={{ opacity: 0.75, fontSize: 13, marginBottom: 10 }}>
                Want help related to this topic? Send a message and we’ll contact you.
              </div>

              {inqOk ? (
                <div
                  style={{
                    padding: 10,
                    borderRadius: 12,
                    background: "#ecfdf5",
                    border: "1px solid #a7f3d0",
                    fontWeight: 800,
                    marginBottom: 10,
                  }}
                >
                  {inqOk}
                </div>
              ) : null}

              {inqErr ? (
                <div
                  style={{
                    padding: 10,
                    borderRadius: 12,
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    fontWeight: 800,
                    color: "#991b1b",
                    marginBottom: 10,
                  }}
                >
                  {inqErr}
                </div>
              ) : null}

              <div style={{ display: "grid", gap: 10 }}>
                <label style={{ fontWeight: 800 }}>Your Name *</label>
                <input
                  value={inqName}
                  onChange={(e) => setInqName(e.target.value)}
                  style={{ height: 44, borderRadius: 12, border: "1px solid #e5e7eb", padding: "0 12px" }}
                />

                <label style={{ fontWeight: 800 }}>Phone</label>
                <input
                  value={inqPhone}
                  onChange={(e) => setInqPhone(e.target.value)}
                  placeholder="10-digit mobile preferred"
                  style={{ height: 44, borderRadius: 12, border: "1px solid #e5e7eb", padding: "0 12px" }}
                />

                <label style={{ fontWeight: 800 }}>Email</label>
                <input
                  value={inqEmail}
                  onChange={(e) => setInqEmail(e.target.value)}
                  placeholder="you@example.com"
                  style={{ height: 44, borderRadius: 12, border: "1px solid #e5e7eb", padding: "0 12px" }}
                />

                <label style={{ fontWeight: 800 }}>Message</label>
                <textarea
                  value={inqMsg}
                  onChange={(e) => setInqMsg(e.target.value)}
                  placeholder="Write your question or requirement…"
                  style={{ minHeight: 110, borderRadius: 12, border: "1px solid #e5e7eb", padding: 12 }}
                />
              </div>
            </CardBody>

            <CardFooter>
              <button
                type="button"
                onClick={submitInquiry}
                disabled={inqBusy}
                style={{
                  width: "100%",
                  height: 44,
                  padding: "0 14px",
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  background: inqBusy ? "#6b7280" : "#111827",
                  color: "white",
                  fontWeight: 900,
                  cursor: inqBusy ? "not-allowed" : "pointer",
                }}
              >
                {inqBusy ? "Submitting…" : "Send Message"}
              </button>
            </CardFooter>
          </Card>
        </div>

        <div style={{ marginTop: 14, opacity: 0.65, fontSize: 12 }}>
          Slug:{" "}
          <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
            {post.slug}
          </span>
        </div>
      </Container>
    </main>
  );
}
