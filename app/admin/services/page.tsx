// app/admin/services/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Card, CardBody, CardFooter } from "@/components/ui/Card";
import { ActionButton } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";
import { Grid } from "@/components/ui/Grid";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterBar, FilterBarItem } from "@/components/ui/FilterBar";

type Status = "draft" | "pending" | "approved" | "rejected";

type Row = {
  id: string;
  owner_id: string;

  title: string | null;
  description: string | null;

  status: Status;
  created_at: string;
  updated_at: string;
  published_at: string | null;

  group: string | null;
  category: string | null;

  city: string | null;
  state: string | null;

  pricing_unit: string | null;
  rate: number | null;
};

function fmt(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

const FILTERS: FilterBarItem[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "draft", label: "Draft" },
];

function isAdminRole(role: string | null | undefined) {
  return role === "master_admin" || role === "services_admin";
}

export default function AdminServicesPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [role, setRole] = useState<string | null>(null);

  const [filter, setFilter] = useState<string>("pending");
  const [rows, setRows] = useState<Row[]>([]);
  const [actingId, setActingId] = useState<string | null>(null);

  async function loadRoleAndData() {
    setLoading(true);
    setErr(null);

    const { data: s } = await supabase.auth.getSession();
    const session = s.session;

    if (!session) {
      router.replace("/login");
      return;
    }

    // role lookup (same pattern as other admin modules)
    const { data: prof, error: profErr } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .maybeSingle();

    if (profErr) {
      setErr(profErr.message);
      setLoading(false);
      return;
    }

    const r = (prof?.role ?? null) as string | null;
    setRole(r);

    if (!isAdminRole(r)) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("service_listings")
      .select(
        [
          "id",
          "owner_id",
          "title",
          "description",
          "status",
          "created_at",
          "updated_at",
          "published_at",
          "group",
          "category",
          "city",
          "state",
          "pricing_unit",
          "rate",
        ].join(",")
      )
      .order("status", { ascending: true })
      .order("updated_at", { ascending: false })
      .limit(200);

    if (error) {
      setErr(error.message);
      setRows([]);
      setLoading(false);
      return;
    }

    setRows((data ?? []) as unknown as Row[]);

    setLoading(false);
  }

  useEffect(() => {
    loadRoleAndData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return rows;
    return rows.filter((r) => r.status === filter);
  }, [rows, filter]);

  async function setStatus(id: string, next: Status) {
    setActingId(id);
    setErr(null);

    try {
      const response = await fetch(
        "/api/admin/services/decision",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify({
            listingId: id,
            decision: next,
          }),
        },
      );

      const result = await response
        .json()
        .catch(() => null);

      if (!response.ok || !result?.ok) {
        throw new Error(
          result?.trustedPublication?.message ||
            result?.error?.message ||
            (typeof result?.error === "string"
              ? result.error
              : null) ||
            "Unable to update service listing.",
        );
      }

      await loadRoleAndData();
    } catch (error: any) {
      setErr(
        error?.message ||
          "Unable to update service listing.",
      );
    } finally {
      setActingId(null);
    }
  }

  if (loading) {
    return (
      <main>
        <Container>
          <SectionHeader title="Admin · Services" subtitle="Loading..." />
          <div style={{ opacity: 0.8 }}>Fetching service listings…</div>
        </Container>
      </main>
    );
  }

  if (!isAdminRole(role)) {
    return (
      <main>
        <Container>
          <SectionHeader title="Admin · Services" subtitle="" />
          <div style={{ color: "crimson", fontWeight: 900, marginBottom: 10 }}>
            Access denied. (Admin role required)
          </div>
          <Link href="/" style={{ fontWeight: 800 }}>
            ← Back to Home
          </Link>
        </Container>
      </main>
    );
  }

  return (
    <main>
      <Container>
        <SectionHeader
          title="Admin · Services"
          subtitle="Review, approve, or reject service listings."
        />

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
          <ActionButton href="/services" variant="secondary">
            Public Services
          </ActionButton>
          <Link href="/admin/dashboard" style={{ fontWeight: 800, alignSelf: "center" }}>
            ← Admin Dashboard
          </Link>
        </div>

        {err ? (
          <div style={{ color: "crimson", fontWeight: 800, marginBottom: 10 }}>{err}</div>
        ) : null}

        <FilterBar
          items={FILTERS}
          activeKey={filter}
          onChange={(k) => setFilter(k)}
          ariaLabel="Service listing status filter"
        />

        <div style={{ marginTop: 14 }}>
          {filtered.length === 0 ? (
            <EmptyState message="No service listings found for this filter." />
          ) : (
            <Grid min={300} gap={12}>
              {filtered.map((r) => {
                const location = [r.city, r.state].filter(Boolean).join(", ");
                const price =
                  r.rate != null
                    ? `₹${r.rate}${r.pricing_unit ? ` / ${r.pricing_unit}` : ""}`
                    : null;

                return (
                  <Card key={r.id}>
                    <CardBody>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                        <div style={{ fontWeight: 900, lineHeight: 1.2 }}>
                          {(r.title ?? "").trim() || "Untitled service"}
                          <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <Badge>{r.status}</Badge>
                            {r.group ? <Badge>{r.group}</Badge> : null}
                            {r.category ? <Badge>{r.category}</Badge> : null}
                          </div>
                        </div>
                        <ActionButton href={`/admin/services/${r.id}`} variant="secondary">
                          Open →
                        </ActionButton>
                      </div>

                      <div style={{ marginTop: 10, color: "#5b6472", fontSize: 13, display: "grid", gap: 6 }}>
                        <div>Updated: {fmt(r.updated_at)}</div>
                        <div>Published: {fmt(r.published_at)}</div>
                        {location ? <div>Location: {location}</div> : null}
                        {price ? <div>Pricing: {price}</div> : null}
                      </div>

                      {r.description ? (
                        <div style={{ marginTop: 10, color: "#5b6472", fontSize: 13, whiteSpace: "pre-wrap" }}>
                          {r.description.slice(0, 160)}
                          {r.description.length > 160 ? "…" : ""}
                        </div>
                      ) : null}

                      <div style={{ marginTop: 10, opacity: 0.7, fontSize: 12 }}>
                        ID:{" "}
                        <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
                          {r.id}
                        </span>
                      </div>
                    </CardBody>

                    <CardFooter>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", width: "100%" }}>
                        <ActionButton
                          variant="primary"
                          onClick={() => setStatus(r.id, "approved")}
                          disabled={actingId === r.id}
                        >
                          {actingId === r.id ? "Working..." : "Approve"}
                        </ActionButton>

                        <ActionButton
                          variant="secondary"
                          onClick={() => setStatus(r.id, "rejected")}
                          disabled={actingId === r.id}
                        >
                          Reject
                        </ActionButton>

                        <ActionButton
                          variant="secondary"
                          onClick={() => setStatus(r.id, "pending")}
                          disabled={actingId === r.id}
                        >
                          Set Pending
                        </ActionButton>
                      </div>
                    </CardFooter>
                  </Card>
                );
              })}
            </Grid>
          )}
        </div>
      </Container>
    </main>
  );
}
