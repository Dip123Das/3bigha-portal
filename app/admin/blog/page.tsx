// app/admin/blog/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Card, CardBody, CardFooter } from "@/components/ui/Card";
import { ActionButton } from "@/components/ui/ActionButton";
import { Grid } from "@/components/ui/Grid";
import { Badge } from "@/components/ui/Badge";

type AdminPostRow = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  status: "draft" | "published";
  author_id: string;
  created_at: string;
  published_at: string | null;
};

function fmtDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function isJwtExpiredError(msg: string) {
  const m = (msg || "").toLowerCase();
  return m.includes("jwt expired") || m.includes("invalid jwt") || m.includes("token has expired");
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
      {props.description ? <div style={{ opacity: 0.8 }}>{props.description}</div> : null}
    </div>
  );
}

export default function AdminBlogPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<AdminPostRow[]>([]);
  const [published, setPublished] = useState<AdminPostRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function ensureFreshSession(nextPath: string) {
    const refreshed = await supabase.auth.refreshSession();
    if (refreshed.error) {
      router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
      return false;
    }
    return true;
  }

  useEffect(() => {
    let alive = true;

    async function guard() {
      setChecking(true);
      setError(null);

      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;

      if (!user) {
        router.replace(`/login?next=${encodeURIComponent("/admin/blog")}`);
        return;
      }

      // 1) Try RPC first (if you have it)
      let rpcOk: boolean | null = null;
      const rpcRes = await supabase.rpc("is_current_user_blog_admin");
      if (rpcRes.error) {
        // If JWT expired, refresh and retry once
        if (isJwtExpiredError(rpcRes.error.message)) {
          const ok = await ensureFreshSession("/admin/blog");
          if (!ok || !alive) return;

          const rpcRetry = await supabase.rpc("is_current_user_blog_admin");
          if (!alive) return;
          rpcOk = rpcRetry.error ? null : (rpcRetry.data as any) === true;
        } else {
          rpcOk = null;
        }
      } else {
        rpcOk = (rpcRes.data as any) === true;
      }

      // 2) Fallback: check profiles.role directly (master_admin or blog_admin)
      // This protects you even if RPC is missing or returns false incorrectly.
      let roleOk = false;
      const prof = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();

      if (prof.error && isJwtExpiredError(prof.error.message)) {
        const ok = await ensureFreshSession("/admin/blog");
        if (!ok || !alive) return;

        const profRetry = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
        if (!alive) return;
        roleOk = !!profRetry.data && ["master_admin", "blog_admin"].includes((profRetry.data as any).role);
      } else if (!prof.error) {
        roleOk = !!prof.data && ["master_admin", "blog_admin"].includes((prof.data as any).role);
      }

      if (!alive) return;

      setIsAdmin(rpcOk === true || roleOk === true);
      setChecking(false);
    }

    guard();
    return () => {
      alive = false;
    };
  }, [router, supabase]);

  async function load() {
    setLoading(true);
    setError(null);

    async function runOnce() {
      const d1 = await supabase
        .from("blog_posts")
        .select("id,title,slug,excerpt,status,author_id,created_at,published_at")
        .eq("status", "draft")
        .order("created_at", { ascending: false })
        .limit(80);

      const d2 = await supabase
        .from("blog_posts")
        .select("id,title,slug,excerpt,status,author_id,created_at,published_at")
        .eq("status", "published")
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(80);

      return { d1, d2 };
    }

    let { d1, d2 } = await runOnce();

    // If JWT expired on either, refresh and retry once
    const jwtExpired =
      (d1.error?.message && isJwtExpiredError(d1.error.message)) ||
      (d2.error?.message && isJwtExpiredError(d2.error.message));

    if (jwtExpired) {
      const ok = await ensureFreshSession("/admin/blog");
      if (!ok) return;

      const retry = await runOnce();
      d1 = retry.d1;
      d2 = retry.d2;
    }

    if (d1.error) setError(d1.error.message);
    if (d2.error) setError((prev) => prev ?? d2.error.message);

    setDrafts((d1.data ?? []) as AdminPostRow[]);
    setPublished((d2.data ?? []) as AdminPostRow[]);
    setLoading(false);
  }

  useEffect(() => {
    if (!checking && isAdmin) load();
    if (!checking && !isAdmin) setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checking, isAdmin]);

  async function setStatus(id: string, status: "draft" | "published") {
    setError(null);

    async function runOnce() {
      return await supabase.from("blog_posts").update({ status }).eq("id", id);
    }

    let res = await runOnce();

    if (res.error?.message && isJwtExpiredError(res.error.message)) {
      const ok = await ensureFreshSession("/admin/blog");
      if (!ok) return;
      res = await runOnce();
    }

    if (res.error) {
      setError(res.error.message);
      return;
    }

    await load();
  }

  if (checking) {
    return (
      <Container>
        <SectionHeader title="Admin Blog Review" subtitle="Checking access..." />
        <MessageBox title="Please wait" description="Verifying your admin access..." />
      </Container>
    );
  }

  if (!isAdmin) {
    return (
      <Container>
        <SectionHeader title="Admin Blog Review" subtitle="" />
        <MessageBox title="Access denied" description="You are not a blog admin." />
        <div style={{ marginTop: 12 }}>
          <Link href="/admin/dashboard" style={{ fontWeight: 800 }}>
            ← Back to Admin Dashboard
          </Link>
        </div>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container>
        <SectionHeader title="Admin Blog Review" subtitle="Loading..." />
        <MessageBox title="Loading..." description="Fetching drafts and published posts..." />
      </Container>
    );
  }

  return (
    <Container>
      <SectionHeader title="Admin Blog Review" subtitle="Publish / unpublish posts" />

      {error ? <div style={{ marginBottom: 12, color: "crimson", fontWeight: 700 }}>{error}</div> : null}

      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <ActionButton variant="secondary" href="/blog/new">
          + New Draft
        </ActionButton>

        {/* ActionButton is Link-only → use normal button for refresh */}
        <button
          type="button"
          onClick={() => load()}
          style={{
            height: 40,
            padding: "0 14px",
            borderRadius: 12,
            border: "1px solid rgba(0,0,0,0.12)",
            background: "white",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          Refresh
        </button>

        <Link href="/admin/dashboard" style={{ fontWeight: 800, alignSelf: "center" }}>
          ← Admin Dashboard
        </Link>
      </div>

      <h2 style={{ fontSize: 18, fontWeight: 800, margin: "16px 0 10px" }}>Drafts</h2>
      {drafts.length === 0 ? (
        <MessageBox title="No drafts" description="Draft posts will appear here." />
      ) : (
        <Grid>
          {drafts.map((p) => (
            <Card key={p.id}>
              <CardBody>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                  <Badge>Draft</Badge>
                  <Badge>{fmtDateTime(p.created_at)}</Badge>
                </div>

                <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>
                  <Link href={`/blog/edit/${p.id}`} style={{ textDecoration: "none" }}>
                    {p.title}
                  </Link>
                </h3>

                <p style={{ margin: 0, opacity: 0.8 }}>{p.excerpt ?? "No excerpt."}</p>
              </CardBody>

              <CardFooter>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Link href={`/blog/edit/${p.id}`} style={{ fontWeight: 700 }}>
                    Edit →
                  </Link>

                  {/* ActionButton is Link-only → use normal button */}
                  <button
                    type="button"
                    onClick={() => setStatus(p.id, "published")}
                    style={{
                      height: 40,
                      padding: "0 14px",
                      borderRadius: 12,
                      border: "1px solid rgba(0,0,0,0.12)",
                      background: "black",
                      color: "white",
                      fontWeight: 900,
                      cursor: "pointer",
                    }}
                  >
                    Publish
                  </button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </Grid>
      )}

      <h2 style={{ fontSize: 18, fontWeight: 800, margin: "22px 0 10px" }}>Published</h2>
      {published.length === 0 ? (
        <MessageBox title="No published posts" description="Published posts will appear here." />
      ) : (
        <Grid>
          {published.map((p) => (
            <Card key={p.id}>
              <CardBody>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                  <Badge>Published</Badge>
                  <Badge>{fmtDateTime(p.published_at ?? p.created_at)}</Badge>
                </div>

                <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>
                  <Link href={`/blog/edit/${p.id}`} style={{ textDecoration: "none" }}>
                    {p.title}
                  </Link>
                </h3>

                <p style={{ margin: 0, opacity: 0.8 }}>{p.excerpt ?? "No excerpt."}</p>
              </CardBody>

              <CardFooter>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Link href={`/blog/${encodeURIComponent(p.slug)}`} style={{ fontWeight: 700 }}>
                    View →
                  </Link>
                  <Link href={`/blog/edit/${p.id}`} style={{ fontWeight: 700 }}>
                    Edit →
                  </Link>

                  {/* ActionButton is Link-only → use normal button */}
                  <button
                    type="button"
                    onClick={() => setStatus(p.id, "draft")}
                    style={{
                      height: 40,
                      padding: "0 14px",
                      borderRadius: 12,
                      border: "1px solid rgba(0,0,0,0.12)",
                      background: "white",
                      fontWeight: 900,
                      cursor: "pointer",
                    }}
                  >
                    Unpublish
                  </button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </Grid>
      )}
    </Container>
  );
}
