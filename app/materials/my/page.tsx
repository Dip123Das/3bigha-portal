// app/materials/my/page.tsx
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

type Status = "draft" | "pending" | "approved" | "rejected" | string;

type Row = {
  id: string;
  vendor_user_id: string;

  title: string | null;
  description: string | null;
  local_name: string | null;
  packaging_unit: string | null;

  status: Status;
  created_at: string;
  updated_at: string;
  published_at: string | null;
};

function money(v: number | null) {
  if (typeof v !== "number") return "₹ —";
  return `₹ ${v}`;
}

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function statusLabel(s: Status) {
  switch (s) {
    case "draft":
      return "Draft";
    case "pending":
      return "Pending";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    default:
      return String(s);
  }
}

function MessageBox(props: { title: string; description?: string }) {
  return (
    <div style={{ border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: 12 }}>
      <div style={{ fontWeight: 800, marginBottom: 6 }}>{props.title}</div>
      {props.description ? <div style={{ opacity: 0.8, lineHeight: 1.5 }}>{props.description}</div> : null}
    </div>
  );
}

export default function MaterialsMyPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(true);

  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  async function submitForReview(listingId: string) {
    setError(null);
    setSubmittingId(listingId);

    try {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;

      if (!user) {
        router.replace(`/login?next=${encodeURIComponent("/materials/my")}`);
        return;
      }

      const res = await fetch(
        "/api/materials/submit-for-review",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify({
            listingId,
          }),
        },
      );

      const json = await res
        .json()
        .catch(() => null);

      if (!res.ok || !json?.ok) {
        throw new Error(
          json?.error?.message ||
            "Submit for review failed.",
        );
      }

      await load(user.id);
    } catch (e: any) {
      setError(e?.message ?? "Submit for review failed");
    } finally {
      setSubmittingId(null);
    }
  }

  async function load(userId: string) {
    setLoading(true);
    setError(null);

    const cols = [
      "id",
      "vendor_user_id",
      "title",
      "description",
      "local_name",
      "packaging_unit",
      "status",
      "created_at",
      "updated_at",
      "published_at",
    ].join(",");

    const { data, error } = await supabase
      .from("material_listings")
      .select(cols)
      .eq("vendor_user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(100);

    if (error) {
      setError(error.message);
      setRows([]);
    } else {
      setRows((data ?? []) as unknown as Row[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    let alive = true;

    async function guardAndLoad() {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;

      if (!user) {
        router.replace(`/login?next=${encodeURIComponent("/materials/my")}`);
        return;
      }

      if (!alive) return;

      setChecking(false);
      await load(user.id);
    }

    guardAndLoad();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        <SectionHeader title="My Materials" subtitle="Checking login..." />
        <MessageBox title="Please wait" description="Verifying your session..." />
      </Container>
    );
  }

  return (
    <Container>
      <SectionHeader title="My Materials" subtitle="Drafts • Pending • Approved • Rejected" />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <ActionButton variant="primary" href="/materials/add">
          + Add Material Listing
        </ActionButton>

        <ActionButton variant="secondary" href="/materials">
          Browse Materials →
        </ActionButton>

        {/* refresh as normal button */}
        <button
          type="button"
          onClick={async () => {
            if (loading) return;
            const { data } = await supabase.auth.getSession();
            const user = data.session?.user;
            if (user) await load(user.id);
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
        <MessageBox title="No materials yet" description="Click “Add Material Listing” to create your first listing." />
      ) : (
        <Grid min={300} gap={12}>
          {rows.map((m) => {
            const title = (m.title ?? "").trim() || "Untitled material";
            const priceLine = m.packaging_unit ? `Unit: ${m.packaging_unit}` : "Unit: —";
            const isApproved = m.status === "approved";

            return (
              <Card key={m.id}>
                <CardBody>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
                    <Badge>{statusLabel(m.status)}</Badge>
                    <Badge>{isApproved ? "Public" : "Not public"}</Badge>
                    <Badge>Updated: {fmt(m.updated_at)}</Badge>
                    {m.published_at ? <Badge>Published: {fmt(m.published_at)}</Badge> : null}
                  </div>

                  <div style={{ fontWeight: 900, marginBottom: 6 }}>{title}</div>

                  <div style={{ opacity: 0.8 }}>
                    {m.local_name ? `Local name: ${m.local_name}` : "Local name: —"} • {priceLine}
                  </div>
                </CardBody>

                <CardFooter>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <Link href={`/materials/${m.id}`} style={{ fontWeight: 700 }}>
                      View →
                    </Link>

                    {m.status === "draft" || m.status === "rejected" ? (
                      <button
                        type="button"
                        onClick={() => submitForReview(m.id)}
                        disabled={submittingId === m.id}
                        style={{
                          border: "1px solid rgba(22,163,74,0.35)",
                          background: submittingId === m.id ? "#dcfce7" : "#f0fdf4",
                          color: "#166534",
                          borderRadius: 12,
                          padding: "6px 10px",
                          fontWeight: 900,
                          cursor: submittingId === m.id ? "not-allowed" : "pointer",
                        }}
                      >
                        {submittingId === m.id ? "Submitting..." : "Submit for Review"}
                      </button>
                    ) : null}

                    {/* If you create an edit route later, add it here */}
                    {/* <Link href={`/materials/edit/${m.id}`} style={{ fontWeight: 700 }}>Edit →</Link> */}
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
