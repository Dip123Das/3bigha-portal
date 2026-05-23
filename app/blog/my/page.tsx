"use client";

import { ensureBusinessProfileComplete } from "@/lib/ensureBusinessProfileComplete";

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

type Row = {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published";
  created_at: string;
  updated_at: string;
};

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
      {props.description ? <div style={{ opacity: 0.8, lineHeight: 1.5 }}>{props.description}</div> : null}
    </div>
  );
}

export default function BlogMyPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function goNewDraftGated() {
    const gate = await ensureBusinessProfileComplete("/blog/new");
    if (!gate.ok) {
      router.push(gate.redirectTo);
      return;
    }
    router.push("/blog/new");
  }

  useEffect(() => {
    let alive = true;

    async function guardAndLoad() {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;

      if (!user) {
        router.replace(`/login?next=${encodeURIComponent("/blog/my")}`);
        return;
      }

      if (!alive) return;

      setChecking(false);
      setLoading(true);

      const { data: list, error } = await supabase
        .from("blog_posts")
        .select("id,title,slug,status,created_at,updated_at")
        .eq("author_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(80);

      if (!alive) return;

      if (error) {
        setError(error.message);
        setRows([]);
      } else {
        setError(null);
        setRows((list ?? []) as Row[]);
      }

      setLoading(false);
    }

    guardAndLoad();
    return () => {
      alive = false;
    };
  }, [router, supabase]);

  if (checking) {
    return (
      <Container>
        <SectionHeader title="My Blog Posts" subtitle="Checking login..." />
        <MessageBox title="Please wait" description="Verifying your session..." />
      </Container>
    );
  }

  return (
    <Container>
      <SectionHeader title="My Blog Posts" subtitle="Your drafts and posts" />

      {/* Top panel like Services */}
      <Card>
        <CardBody>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16 }}>Your Blog Posts</div>
              <div style={{ color: "#5b6472", fontSize: 13 }}>
                Drafts are private. Published posts appear on <span style={{ fontWeight: 700 }}>/blog</span>.
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <ActionButton variant="secondary" href="/blog">
                Go to Blog →
              </ActionButton>

              <ActionButton variant="primary" onClick={goNewDraftGated}>
                + New Draft
              </ActionButton>
            </div>
          </div>
        </CardBody>
      </Card>

      <div style={{ marginTop: 14 }}>
        {error ? (
          <MessageBox title="Could not load" description={error} />
        ) : loading ? (
          <MessageBox title="Loading..." description="Fetching your posts..." />
        ) : rows.length === 0 ? (
          <MessageBox title="No posts yet" description="Create your first draft." />
        ) : (
          <Grid>
            {rows.map((p) => (
              <Card key={p.id}>
                <CardBody>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
                    <Badge>{p.status}</Badge>
                    <Badge>{new Date(p.updated_at).toLocaleString()}</Badge>
                  </div>

                  <div style={{ fontWeight: 800, marginBottom: 8 }}>{p.title}</div>
                </CardBody>
                <CardFooter>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <Link href={`/blog/edit/${p.id}`} style={{ fontWeight: 700 }}>
                      Edit →
                    </Link>
                    {p.status === "published" ? (
                      <Link href={`/blog/${encodeURIComponent(p.slug)}`} style={{ fontWeight: 700 }}>
                        View →
                      </Link>
                    ) : null}
                  </div>
                </CardFooter>
              </Card>
            ))}
          </Grid>
        )}
      </div>
    </Container>
  );
}
