"use client";

import { ensureBusinessProfileComplete } from "@/lib/ensureBusinessProfileComplete";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Card, CardBody, CardFooter } from "@/components/ui/Card";
import { ActionButton } from "@/components/ui/ActionButton";

type CatalogItem = { name: string; slug: string; group: string };

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function MessageBox(props: { title: string; description?: string }) {
  return (
    <div
      style={{
        border: "1px solid rgba(0,0,0,0.08)",
        borderRadius: 12,
        padding: 12,
        background: "rgba(0,0,0,0.02)",
      }}
    >
      <div style={{ fontWeight: 800, marginBottom: 6 }}>{props.title}</div>
      {props.description ? (
        <div style={{ opacity: 0.8, lineHeight: 1.5 }}>{props.description}</div>
      ) : null}
    </div>
  );
}

/**
 * BLOG CATALOG (same naming as app/blog/page.tsx)
 * NOTE: blog_posts table currently has no category field.
 * We store category into content meta block (and tags) so we can recover later.
 */
const BLOG_CATALOG: { group: string; items: { name: string; slug: string }[] }[] = [
  {
    group: "Platform & Ecosystem",
    items: [
      { name: "Announcements", slug: "announcements" },
      { name: "Platform Updates", slug: "platform-updates" },
    ],
  },
  {
    group: "Property, Construction & Engineering",
    items: [
      { name: "How-To Guides (General)", slug: "how-to-guides" },
      { name: "Construction Guides", slug: "construction-guides" },
      { name: "Engineering & Structural (Civil)", slug: "engineering-civil" },
      { name: "Materials & Product Insights", slug: "materials-insights" },
      { name: "Services & Hiring Tips", slug: "services-hiring" },
      { name: "Rentals & Equipment", slug: "rentals-equipment" },
    ],
  },
  {
    group: "Land, Registration & Documentation",
    items: [
      { name: "Land & Property Registration (State-wise)", slug: "registration-state-wise" },
      { name: "Stamp Duty, Registration Fees & Charges", slug: "stamp-duty-fees" },
      { name: "Mutation, Conversion & Records", slug: "mutation-records" },
    ],
  },
  {
    group: "Law, Disputes & Compliance",
    items: [
      { name: "Legal & Documentation Basics", slug: "legal-basics" },
      { name: "Land Disputes & Resolution", slug: "land-disputes" },
      { name: "Regulations & Policy Updates", slug: "policy-updates" },
    ],
  },
  {
    group: "Local Authority Rules",
    items: [
      { name: "Municipality / Corporation / Panchayat Rules", slug: "local-authority-rules" },
    ],
  },
  {
    group: "Market & Finance",
    items: [
      { name: "Real Estate Market & Trends", slug: "market-trends" },
      { name: "Finance, Loans & Tax", slug: "finance-loans-tax" },
    ],
  },
  {
    group: "Safety & Standards",
    items: [{ name: "Safety, Quality & Standards", slug: "safety-standards" }],
  },
  {
    group: "Community & Regional",
    items: [
      { name: "Local Spotlight (Cooch Behar & Bengal)", slug: "local-spotlight" },
      { name: "Case Studies & Success Stories", slug: "case-studies" },
      { name: "Community & CSR", slug: "community-csr" },
    ],
  },
  {
    group: "Quick Reads & News",
    items: [
      { name: "Tips & Checklists", slug: "tips-checklists" },
      { name: "Industry News", slug: "industry-news" },
    ],
  },
];

const CATALOG_FLAT: CatalogItem[] = BLOG_CATALOG.flatMap((g) =>
  g.items.map((it) => ({ ...it, group: g.group }))
);

function findCatalog(slug: string) {
  return CATALOG_FLAT.find((x) => x.slug === slug) ?? null;
}

function buildContentWithMeta(opts: {
  categorySlug: string;
  categoryName: string;
  categoryGroup: string;
  body: string;
}) {
  // Keep user content first, then a compact meta block at bottom
  const body = (opts.body || "").trim();
  const meta = [
    "---",
    `Category: ${opts.categoryName}`,
    `Category Group: ${opts.categoryGroup}`,
    `Category Slug: ${opts.categorySlug}`,
  ].join("\n");
  return (body ? `${body}\n\n${meta}` : meta).trim();
}

export default function BlogNewPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);

  // ✅ category selection required
  const [categorySlug, setCategorySlug] = useState<string>("");

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");

  const [error, setError] = useState<string | null>(null);

  // Hard login guard: redirect to /login?next=...
  useEffect(() => {
    let alive = true;

    async function guard() {
      const { data } = await supabase.auth.getSession();
      if (!alive) return;

      if (!data.session) {
        router.replace(`/login?next=${encodeURIComponent("/blog/new")}`);
        return;
      }
      setChecking(false);
    }

    guard();
    return () => {
      alive = false;
    };
  }, [router, supabase]);

  // auto slug from title
  useEffect(() => {
    if (!slug && title.trim()) setSlug(slugify(title));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title]);

  async function createDraftGated() {
    const gate = await ensureBusinessProfileComplete("/blog/new");
    if (!gate.ok) {
      router.push(gate.redirectTo);
      return;
    }
    await createDraft();
  }

  async function createDraft() {
    setError(null);

    const cat = findCatalog(categorySlug);

    if (!cat) return setError("Please select a blog category first.");

    const t = title.trim();
    const s = slugify(slug || title);

    if (!t) return setError("Title is required.");
    if (!s) return setError("Slug is required.");
    if (!content.trim()) return setError("Content is required.");

    setSaving(true);

    const { data: sess } = await supabase.auth.getSession();
    const user = sess.session?.user;

    if (!user) {
      setSaving(false);
      router.replace(`/login?next=${encodeURIComponent("/blog/new")}`);
      return;
    }

    // ✅ Store category in a meta block at bottom of content (since DB has no category column)
    const contentWithMeta = buildContentWithMeta({
      categorySlug: cat.slug,
      categoryName: cat.name,
      categoryGroup: cat.group,
      body: content,
    });

    // ✅ Also embed category into excerpt if excerpt is empty (optional nice UX)
    const excerptFinal =
      excerpt.trim() ||
      `Category: ${cat.name} • ${cat.group}`;

    const { data, error } = await supabase
      .from("blog_posts")
      .insert({
        author_id: user.id,
        title: t,
        slug: s,
        excerpt: excerptFinal || null,
        content: contentWithMeta,
        status: "draft",
      })
      .select("id")
      .single();

    setSaving(false);

    if (error) return setError(error.message);

    router.push(`/blog/edit/${data.id}`);
  }

  if (checking) {
    return (
      <Container>
        <SectionHeader title="New Blog Post" subtitle="Checking login..." />
        <MessageBox title="Please wait" description="Verifying your session..." />
      </Container>
    );
  }

  const selected = categorySlug ? findCatalog(categorySlug) : null;

  return (
    <Container>
      <SectionHeader
        title="New Blog Post"
        subtitle="Select a category first, then write your post. Draft only (publish by admin)."
      />

      {error ? (
        <div style={{ marginBottom: 12, color: "crimson", fontWeight: 700 }}>{error}</div>
      ) : null}

      <Card>
        <CardBody>
          {/* ✅ Category picker (required) */}
          <label style={{ display: "block", fontWeight: 800, marginBottom: 6 }}>
            Browse Catalog (Required)
          </label>
          <select
            value={categorySlug}
            onChange={(e) => setCategorySlug(e.target.value)}
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.12)",
              marginBottom: 12,
              fontWeight: 700,
              background: "white",
            }}
          >
            <option value="">Select category…</option>
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

          {selected ? (
            <div style={{ marginBottom: 14, opacity: 0.85, lineHeight: 1.4 }}>
              <div style={{ fontWeight: 800 }}>Selected:</div>
              <div>
                <b>{selected.name}</b> <span style={{ opacity: 0.7 }}>({selected.group})</span>
              </div>
              <div style={{ fontSize: 12, opacity: 0.75 }}>
                You should write only about this category in this post.
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: 14, fontSize: 12, opacity: 0.75 }}>
              Tip: Choose the correct category first. This helps your post appear under Browse Catalog.
            </div>
          )}

          <label style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter title"
            style={{
              width: "100%",
              padding: 10,
              marginBottom: 12,
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.12)",
            }}
          />

          <label style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>Slug</label>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="auto-generated-from-title"
            style={{
              width: "100%",
              padding: 10,
              marginBottom: 12,
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.12)",
            }}
          />

          <label style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>Excerpt (optional)</label>
          <textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            placeholder="Short summary for listing page"
            style={{
              width: "100%",
              padding: 10,
              minHeight: 80,
              marginBottom: 12,
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.12)",
            }}
          />

          <label style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>Content</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your post..."
            style={{
              width: "100%",
              padding: 10,
              minHeight: 260,
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.12)",
            }}
          />

          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75, lineHeight: 1.5 }}>
            Note: Category is saved into the post as a small meta block at the bottom (temporary approach).
            Later, we’ll add a real <b>category_slug</b> column for perfect filtering.
          </div>
        </CardBody>

        <CardFooter>
          <ActionButton
            variant="primary"
            onClick={createDraftGated}
            disabled={saving || !categorySlug}
          >
            {saving ? "Creating..." : "Create Draft"}
          </ActionButton>
        </CardFooter>
      </Card>
    </Container>
  );
}
