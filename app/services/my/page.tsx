// app/services/my/page.tsx
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

type RecordStatus = "draft" | "published" | "paused" | "archived";

type Row = {
  id: string;
  provider_id: string;

  // display
  custom_service: string | null;
  custom_category: string | null;
  custom_subcategory: string | null;

  service_description: string | null;

  pricing_kind: string | null;
  min_price: number | null;
  max_price: number | null;
  currency: string | null;

  record_status: RecordStatus;

  created_at: string | null;
  updated_at: string | null;
};

function fmt(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function canPublish(status: RecordStatus) {
  return status === "draft" || status === "paused";
}

function canPause(status: RecordStatus) {
  return status === "published";
}

function canArchive(status: RecordStatus) {
  return status !== "archived";
}

export default function MyServicesPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [actingId, setActingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);

    const { data: s } = await supabase.auth.getSession();
    const session = s.session;

    if (!session) {
      router.replace("/login");
      return;
    }

    // provider_services belongs to provider_id; providers belong to user
    // We'll fetch my provider_id from service_providers using user_id.
    const { data: prov, error: provErr } = await supabase
      .from("service_providers")
      .select("id")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (provErr) {
      setErr(provErr.message);
      setRows([]);
      setLoading(false);
      return;
    }

    const providerId = prov?.id as string | undefined;
    if (!providerId) {
      setRows([]);
      setLoading(false);
      return;
    }

    const q = supabase
      .from("provider_services")
      .select(
        [
          "id",
          "provider_id",
          "custom_service",
          "custom_category",
          "custom_subcategory",
          "service_description",
          "pricing_kind",
          "min_price",
          "max_price",
          "currency",
          "record_status",
          "created_at",
          "updated_at",
        ].join(",")
      )
      .eq("provider_id", providerId)
      .order("updated_at", { ascending: false });

    // ✅ avoid GenericStringError[] typing issue
    const { data, error } = await q.returns<Row[]>();

    if (error) {
      setErr(error.message);
      setRows([]);
      setLoading(false);
      return;
    }

    setRows((data ?? []) as Row[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function setStatus(id: string, next: RecordStatus) {
    setActingId(id);
    setErr(null);

    const { error } = await supabase
      .from("provider_services")
      .update({ record_status: next })
      .eq("id", id);

    if (error) {
      setErr(error.message);
      setActingId(null);
      return;
    }

    await load();
    setActingId(null);
  }

  return (
    <main>
      <Container>
        <SectionHeader
          title="My Services"
          subtitle="Manage your service listings — drafts, published, paused, archived."
        />

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
          <ActionButton href="/services/add" variant="primary">
            + Add Service
          </ActionButton>

          <ActionButton href="/services" variant="secondary">
            Browse Public Services
          </ActionButton>

          <Link href="/" style={{ fontWeight: 800, alignSelf: "center" }}>
            ← Home
          </Link>
        </div>

        {loading ? (
          <div style={{ opacity: 0.8 }}>Loading your services…</div>
        ) : err ? (
          <div style={{ color: "crimson", fontWeight: 800 }}>{err}</div>
        ) : rows.length === 0 ? (
          <EmptyState message="No service listings yet. Click “Add Service” to create your first listing." />
        ) : (
          <Grid min={280} gap={12}>
            {rows.map((r) => {
              const title = (r.custom_service ?? "").trim() || "Service";
              const catLine = [r.custom_category, r.custom_subcategory].filter(Boolean).join(" → ") || "—";

              return (
                <Card key={r.id}>
                  <CardBody>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                      <div style={{ fontWeight: 900, fontSize: 16, lineHeight: 1.2 }}>{title}</div>
                      <Badge>{r.record_status}</Badge>
                    </div>

                    <div style={{ marginTop: 8, color: "#5b6472", fontSize: 13 }}>
                      Category: {catLine}
                    </div>

                    <div style={{ marginTop: 10, display: "grid", gap: 6, color: "#5b6472", fontSize: 13 }}>
                      <div>Created: {fmt(r.created_at)}</div>
                      <div>Updated: {fmt(r.updated_at)}</div>
                    </div>

                    <div style={{ marginTop: 10, opacity: 0.7, fontSize: 12 }}>
                      ID:{" "}
                      <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
                        {r.id}
                      </span>
                    </div>
                  </CardBody>

                  <CardFooter>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", width: "100%" }}>
                      <ActionButton href={`/services/${r.id}`} variant="secondary">
                        View →
                      </ActionButton>

                      {canPublish(r.record_status) ? (
                        <ActionButton
                          variant="primary"
                          onClick={() => setStatus(r.id, "published")}
                          disabled={actingId === r.id}
                        >
                          {actingId === r.id ? "Publishing..." : "Publish"}
                        </ActionButton>
                      ) : null}

                      {canPause(r.record_status) ? (
                        <ActionButton
                          variant="secondary"
                          onClick={() => setStatus(r.id, "paused")}
                          disabled={actingId === r.id}
                        >
                          {actingId === r.id ? "Pausing..." : "Pause"}
                        </ActionButton>
                      ) : null}

                      {canArchive(r.record_status) ? (
                        <ActionButton
                          variant="secondary"
                          onClick={() => setStatus(r.id, "archived")}
                          disabled={actingId === r.id}
                        >
                          {actingId === r.id ? "Archiving..." : "Archive"}
                        </ActionButton>
                      ) : (
                        <div
                          style={{
                            border: "1px solid rgba(0,0,0,0.12)",
                            borderRadius: 12,
                            padding: "10px 12px",
                            fontWeight: 800,
                            opacity: 0.55,
                          }}
                        >
                          Archived
                        </div>
                      )}
                    </div>
                  </CardFooter>
                </Card>
              );
            })}
          </Grid>
        )}
      </Container>
    </main>
  );
}
