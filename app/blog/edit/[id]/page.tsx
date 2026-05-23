"use client";

import { ensureBusinessProfileComplete } from "@/lib/ensureBusinessProfileComplete";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Card, CardBody, CardFooter } from "@/components/ui/Card";
import { ActionButton } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";

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

type BlogPostEditRow = {
  id: string;
  author_id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  status: "draft" | "published";
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

function fmtDateTime(iso: string | null) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return "";
  }
}

export default function BlogEditPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";

  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [isAdmin, setIsAdmin] = useState(false);
  const [row, setRow] = useState<BlogPostEditRow | null>(null);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");

  const [error, setError] = useState<string | null>(null);

  // Hard login guard
  useEffect(() => {
    let alive = true;

    async function guard() {
      const { data } = await supabase.auth.getSession();
      if (!alive) return;

      if (!data.session) {
        router.replace(`/login?next=${encodeURIComponent(`/blog/edit/${id}`)}`);
        return;
      }

      setChecking(false);
    }

    if (id) guard();

    return () => {
      alive = false;
    };
  }, [router, supabase, id]);

  async function reloadRow() {
    const { data, error } = await supabase
      .from("blog_posts")
      .select("id,author_id,title,slug,excerpt,content,status,published_at,created_at,updated_at")
      .eq("id", id)
      .single();

    if (error) {
      setError(error.message);
      setRow(null);
      return;
    }

    const r = data as BlogPostEditRow;
    setRow(r);
    setTitle(r.title);
    setSlug(r.slug);
    setExcerpt(r.excerpt ?? "");
    setContent(r.content);
  }

  // Load post + admin flag
  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError(null);

      const { data: sess } = await supabase.auth.getSession();
      const user = sess.session?.user;

      if (!user) {
        router.replace(`/login?next=${encodeURIComponent(`/blog/edit/${id}`)}`);
        return;
      }

      // Admin check via RPC (safe with RLS)
      const { data: isAdminBool } = await supabase.rpc("is_current_user_blog_admin");
      if (!alive) return;
      setIsAdmin(!!isAdminBool);

      await reloadRow();
      if (!alive) return;

      setLoading(false);
    }

    if (id && !checking) load();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, router, id, checking]);

  function basicValidate(): string | null {
    const t = title.trim();
    const s = slugify(slug || title);

    if (!t) return "Title is required.";
    if (!s) return "Slug is required.";
    if (!content.trim()) return "Content is required.";
    return null;
  }

  async function gatedSave() {
    const gate = await ensureBusinessProfileComplete(`/blog/edit/${id}`);
    if (!gate.ok) {
      router.push(gate.redirectTo);
      return;
    }
    await saveDraftOrEdits();
  }

  async function saveDraftOrEdits() {
    setError(null);

    const vErr = basicValidate();
    if (vErr) return setError(vErr);

    const t = title.trim();
    const s = slugify(slug || title);

    setSaving(true);

    const { error } = await supabase
      .from("blog_posts")
      .update({
        title: t,
        slug: s,
        excerpt: excerpt.trim() || null,
        content,
      })
      .eq("id", id);

    setSaving(false);
    if (error) return setError(error.message);

    await reloadRow();
  }

  async function gatedAdminSetStatus(nextStatus: "published" | "draft") {
    if (!isAdmin) return;

    const gate = await ensureBusinessProfileComplete(`/blog/edit/${id}`);
    if (!gate.ok) {
      router.push(gate.redirectTo);
      return;
    }

    await adminSetStatus(nextStatus);
  }

  async function adminSetStatus(nextStatus: "published" | "draft") {
    if (!isAdmin) return;

    setError(null);
    setSaving(true);

    const { error } = await supabase.from("blog_posts").update({ status: nextStatus }).eq("id", id);

    setSaving(false);
    if (error) return setError(error.message);

    await reloadRow();
  }

  if (checking) {
    return (
      <Container>
        <SectionHeader title="Edit Blog Post" subtitle="Checking login..." />
        <MessageBox title="Please wait" description="Verifying your session..." />
      </Container>
    );
  }

  if (loading) {
    return (
      <Container>
        <SectionHeader title="Edit Blog Post" subtitle="Loading..." />
        <MessageBox title="Loading..." description="Fetching post..." />
      </Container>
    );
  }

  if (error || !row) {
    return (
      <Container>
        <SectionHeader title="Edit Blog Post" subtitle="" />
        <MessageBox title="Unable to open post" description={error ?? "Not found or access denied."} />
      </Container>
    );
  }

  const previewHref =
    row.status === "published" && row.slug ? `/blog/${encodeURIComponent(row.slug)}` : null;

  return (
    <Container>
      <SectionHeader title="Edit Blog Post" subtitle={row.status === "published" ? "Published post" : "Draft post"} />

      {/* Top panel like Services */}
      <Card>
        <CardBody>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16 }}>Your Blog Workspace</div>
              <div style={{ color: "#5b6472", fontSize: 13 }}>
                Manage drafts here. Only admins can publish.
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <ActionButton href="/blog/my" variant="secondary">
                Go to My Posts →
              </ActionButton>

              {previewHref ? (
                <ActionButton href={previewHref} variant="secondary">
                  Preview →
                </ActionButton>
              ) : (
                <ActionButton variant="secondary" disabled>
                  Preview (publish first)
                </ActionButton>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
            <Badge>Status: {row.status}</Badge>
            {row.published_at ? <Badge>Published: {fmtDateTime(row.published_at)}</Badge> : null}
            <Badge>Updated: {fmtDateTime(row.updated_at)}</Badge>
          </div>
        </CardBody>
      </Card>

      {error ? <div style={{ marginTop: 12, color: "crimson", fontWeight: 700 }}>{error}</div> : null}

      <div style={{ marginTop: 14 }}>
        <Card>
          <CardBody>
            <label style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ width: "100%", padding: 10, marginBottom: 12 }}
            />

            <label style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>Slug</label>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              style={{ width: "100%", padding: 10, marginBottom: 12 }}
            />

            <label style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>Excerpt (optional)</label>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              style={{ width: "100%", padding: 10, minHeight: 80, marginBottom: 12 }}
            />

            <label style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              style={{ width: "100%", padding: 10, minHeight: 280 }}
            />
          </CardBody>

          <CardFooter>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <ActionButton variant="primary" onClick={gatedSave} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </ActionButton>

              <ActionButton variant="secondary" onClick={() => reloadRow()} disabled={saving}>
                Reload
              </ActionButton>

              {isAdmin ? (
                row.status === "published" ? (
                  <ActionButton variant="secondary" onClick={() => gatedAdminSetStatus("draft")} disabled={saving}>
                    Unpublish → Draft
                  </ActionButton>
                ) : (
                  <ActionButton variant="secondary" onClick={() => gatedAdminSetStatus("published")} disabled={saving}>
                    Publish
                  </ActionButton>
                )
              ) : null}

              <span style={{ color: "#5b6472", fontSize: 13 }}>
                {isAdmin ? "Admin can publish/unpublish." : "Only admins can publish."}
              </span>
            </div>
          </CardFooter>
        </Card>
      </div>

      {/* Optional back link */}
      <div style={{ marginTop: 14 }}>
        <Link href="/blog" style={{ fontWeight: 700 }}>
          ← Back to Blog
        </Link>
      </div>
    </Container>
  );
}
