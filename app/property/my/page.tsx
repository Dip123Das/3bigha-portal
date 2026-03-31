"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import { requireBrowserSession } from "@/lib/requireBrowserSession";

import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Card, CardBody, CardFooter } from "@/components/ui/Card";
import { ActionButton } from "@/components/ui/ActionButton";
import { Grid } from "@/components/ui/Grid";
import { Badge } from "@/components/ui/Badge";

type Status = "draft" | "pending" | "approved" | "rejected" | string;

type Row = {
  id: string;
  title: string | null;
  slug: string | null;
  status: Status;
  created_at: string;
  updated_at: string;
  published_at?: string | null;
  expected_price: number | null;
  city: string | null;
  state: string | null;
  is_public?: boolean | null;
};

function MessageBox(props: { title: string; description?: string }) {
  return (
    <div style={{ border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: 16 }}>
      <div style={{ fontWeight: 800, marginBottom: 6 }}>{props.title}</div>
      {props.description ? <div style={{ opacity: 0.8, lineHeight: 1.5 }}>{props.description}</div> : null}
    </div>
  );
}

function fmt(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso);
  }
}

function statusLabel(s: Status) {
  switch (s) {
    case "draft":
      return "Draft";
    case "pending":
      return "Pending Review";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    default:
      return s;
  }
}

function looksLikeMissingColumnError(message: string) {
  const msg = (message || "").toLowerCase();
  return (
    msg.includes("schema cache") ||
    msg.includes("could not find the") ||
    msg.includes("does not exist") ||
    msg.includes("unknown field")
  );
}

function extractMissingColumnName(message: string): string | null {
  const msg = message || "";

  const m1 = msg.match(/could not find the '([^']+)' column/i);
  if (m1?.[1]) return m1[1];

  const m2 = msg.match(/column "([^"]+)" .* does not exist/i);
  if (m2?.[1]) return m2[1];

  return null;
}

function normalizeRow(x: any): Row | null {
  if (!x || typeof x !== "object") return null;

  const id = x.id != null ? String(x.id) : "";
  const status = x.status != null ? String(x.status) : "";
  const created_at = x.created_at != null ? String(x.created_at) : "";
  const updated_at = x.updated_at != null ? String(x.updated_at) : "";

  if (!id || !status || !created_at || !updated_at) return null;

  let expected_price: number | null = null;
  if (x.expected_price != null) expected_price = Number(x.expected_price);
  else if (x.price != null) expected_price = Number(x.price);

  return {
    id,
    title: x.title == null ? null : String(x.title),
    slug: x.slug == null ? null : String(x.slug),
    status,
    created_at,
    updated_at,
    published_at: x.published_at == null ? null : String(x.published_at),
    expected_price: expected_price == null || Number.isNaN(expected_price) ? null : expected_price,
    city: x.city == null ? null : String(x.city),
    state: x.state == null ? null : String(x.state),
    is_public:
      typeof x.is_public === "boolean"
        ? x.is_public
        : x.is_public == null
        ? null
        : Boolean(x.is_public),
  };
}

export default function PropertyMyPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function runSelect(cols: string[], userId: string) {
    const csv = cols.join(",");

    try {
      const byOwnerId = await supabase
        .from("property_listings")
        .select(csv)
        .eq("owner_id", userId)
        .order("updated_at", { ascending: false })
        .limit(100);

      if (!byOwnerId.error) return { data: byOwnerId.data ?? [], error: null };

      const msg = String(byOwnerId.error.message || "");
      if (!looksLikeMissingColumnError(msg) || !msg.toLowerCase().includes("owner_id")) {
        return { data: [], error: byOwnerId.error };
      }
    } catch (e: any) {}

    try {
      const byOwnerUserId = await supabase
        .from("property_listings")
        .select(csv)
        .eq("owner_user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(100);

      if (!byOwnerUserId.error) return { data: byOwnerUserId.data ?? [], error: null };

      return { data: [], error: byOwnerUserId.error };
    } catch (e: any) {
      return { data: [], error: e };
    }
  }

  async function safeSelectMyListings(userId: string) {
    let cols = [
      "id",
      "title",
      "slug",
      "status",
      "created_at",
      "updated_at",
      "published_at",
      "expected_price",
      "city",
      "state",
      "is_public",
      "price",
    ];

    for (let i = 0; i < 8; i++) {
      const res = await runSelect(cols, userId);

      if (!res.error) return { data: res.data ?? [], error: null };

      const msg = String(res.error?.message || "");
      if (!looksLikeMissingColumnError(msg)) return { data: [], error: res.error };

      const missing = extractMissingColumnName(msg);
      if (!missing) return { data: [], error: res.error };

      if (cols.includes(missing)) {
        cols = cols.filter((c) => c !== missing);
        continue;
      }

      return { data: [], error: res.error };
    }

    return { data: [], error: new Error("Could not resolve property_listings columns.") };
  }

  const load = async (userId: string, aliveRef?: { alive: boolean }) => {
    setLoading(true);
    setError(null);

    const { data, error } = await safeSelectMyListings(userId);
    if (aliveRef && !aliveRef.alive) return;

    if (error) {
      setError(error.message || "Could not load listings.");
      setRows([]);
      setLoading(false);
      return;
    }

    const normalized = (data ?? []).map(normalizeRow).filter(Boolean) as Row[];
    setRows(normalized);
    setLoading(false);
  };

  useEffect(() => {
    const aliveRef = { alive: true };

    async function guardAndLoad() {
      try {
        console.log("PROPERTY_MY_PAGE_AUTH_START");

        const session = await requireBrowserSession({
          supabase,
          router,
          nextUrl: "/property/my",
        });

        if (!aliveRef.alive) return;
        if (!session?.user?.id) return;

        console.log("PROPERTY_MY_PAGE_AUTH_OK", { userId: session.user.id });

        setChecking(false);
        await load(session.user.id, aliveRef);
      } catch (e: any) {
        console.error("PROPERTY_MY_PAGE_AUTH_FAIL", e);

        if (!aliveRef.alive) return;
        setChecking(false);
        setLoading(false);
        setError(e?.message || "Could not verify session.");
      }
    }

    guardAndLoad();

    return () => {
      aliveRef.alive = false;
    };
  }, [router, supabase]);

  const stats = useMemo(() => {
    const total = rows.length;
    const draft = rows.filter((r) => r.status === "draft").length;
    const pending = rows.filter((r) => r.status === "pending").length;
    const approved = rows.filter((r) => r.status === "approved").length;
    const rejected = rows.filter((r) => r.status === "rejected").length;
    return { total, draft, pending, approved, rejected };
  }, [rows]);

  if (checking) {
    return (
      <Container>
        <SectionHeader title="My Properties" subtitle="Checking login..." />
        <MessageBox title="Please wait" description="Verifying your session..." />
      </Container>
    );
  }

  return (
    <Container>
      <SectionHeader title="My Properties" subtitle="Drafts • Pending • Approved • Rejected" />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <ActionButton variant="primary" href="/property/add">
          + Post Property
        </ActionButton>

        <button
          type="button"
          onClick={async () => {
            if (loading) return;

            const sRes: any = await supabase.auth.getSession();
            const userId = sRes?.data?.session?.user?.id || null;
            if (!userId) {
              router.replace(`/login?next=${encodeURIComponent("/property/my")}`);
              return;
            }

            await load(userId);
          }}
          disabled={loading}
          style={{
            height: 40,
            padding: "0 14px",
            borderRadius: 12,
            border: "1px solid rgba(0,0,0,0.12)",
            background: "white",
            fontWeight: 800,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          Refresh
        </button>
      </div>

      {rows.length > 0 && !loading ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          <Badge>Total: {stats.total}</Badge>
          <Badge>Draft: {stats.draft}</Badge>
          <Badge>Pending: {stats.pending}</Badge>
          <Badge>Approved: {stats.approved}</Badge>
          <Badge>Rejected: {stats.rejected}</Badge>
        </div>
      ) : null}

      {error ? (
        <MessageBox title="Could not load" description={error} />
      ) : loading ? (
        <MessageBox title="Loading..." description="Fetching your listings..." />
      ) : rows.length === 0 ? (
        <MessageBox title="No properties yet" description="Click “Post Property” to create your first listing." />
      ) : (
        <Grid>
          {rows.map((p) => {
            const isApproved = p.status === "approved";
            const canEdit =
              p.status === "draft" || p.status === "pending" || p.status === "rejected";

            return (
              <Card key={p.id}>
                <CardBody>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
                    <Badge>{statusLabel(p.status)}</Badge>
                    {"is_public" in p ? (
                      <Badge>{p.is_public ? "Public" : "Not public"}</Badge>
                    ) : (
                      <Badge>Visibility: —</Badge>
                    )}
                    <Badge>Updated: {fmt(p.updated_at)}</Badge>
                    {p.published_at ? <Badge>Published: {fmt(p.published_at)}</Badge> : null}
                  </div>

                  <div style={{ fontWeight: 900, marginBottom: 6 }}>
                    {(p.title ?? "").trim() || "Untitled"}
                  </div>

                  <div style={{ opacity: 0.8 }}>
                    {p.city ? p.city : "—"}
                    {p.state ? `, ${p.state}` : ""}
                    {p.expected_price != null ? ` • ₹${p.expected_price}` : ""}
                  </div>
                </CardBody>

                <CardFooter>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {isApproved ? (
                      <Link href={`/property/${p.id}`} style={{ fontWeight: 700 }}>
                        View →
                      </Link>
                    ) : (
                      <span style={{ opacity: 0.7, fontWeight: 700 }}>Not public yet</span>
                    )}

                    {canEdit ? (
                      <Link href={`/property/edit/${p.id}`} style={{ fontWeight: 700 }}>
                        Edit →
                      </Link>
                    ) : null}
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </Grid>
      )}
    </Container>
  );
}