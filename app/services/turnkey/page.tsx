// app/services/turnkey/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Card, CardBody, CardFooter } from "@/components/ui/Card";
import { Grid } from "@/components/ui/Grid";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ActionButton } from "@/components/ui/ActionButton";

type ProviderMini = {
  display_name: string | null;
  slug: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  photo_url: string | null;
  status: string | null;
};

type TurnkeyPkgRow = {
  id: string;
  provider_id: string;
  package_code: string | null;
  package_name: string | null;
  marketing_title: string | null;

  rate_per_unit: number | null;
  rate_unit: string | null;
  currency: string | null;

  short_highlights: string[] | null;
  full_scope: string | null;
  material_specification: string | null;

  coverage_area: string | null;
  expected_start_time: string | null;
  estimated_duration: string | null;
  warranty: string | null;

  gst_applicable: boolean | null;
  gst_pct: number | null;

  payment_terms: any | null;
  inclusions: string | null;
  exclusions: string | null;
  notes: string | null;

  service_providers?: ProviderMini | null;
};

const styles = {
  toolbar: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap" as const,
  },
  minor: { color: "#5b6472", fontSize: 13 },
  miniBtn: (active?: boolean): React.CSSProperties => ({
    border: active ? "2px solid #111827" : "1px solid #e5e7eb",
    background: "#fff",
    padding: "8px 10px",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 13,
  }),
  box: {
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 12,
    background: "#fff",
  },
  modalOverlay: {
    position: "fixed" as const,
    inset: 0,
    background: "rgba(0,0,0,0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    zIndex: 60,
  },
  modal: {
    width: "min(920px, 100%)",
    maxHeight: "85vh",
    overflow: "auto" as const,
    background: "#fff",
    borderRadius: 18,
    border: "1px solid #e5e7eb",
    boxShadow: "0 18px 60px rgba(0,0,0,0.25)",
  },
};

function formatLocation(p?: ProviderMini | null) {
  const parts = [p?.city, p?.district, p?.state].filter(Boolean);
  return parts.length ? parts.join(", ") : "—";
}

function money(v: number | null | undefined, currency: string | null | undefined) {
  if (typeof v !== "number") return "—";
  const c = currency || "INR";
  return c === "INR" ? `₹${v}` : `${c} ${v}`;
}

function normalizeRateUnit(u: string | null | undefined) {
  if (!u) return "—";
  if (u === "per_sqft") return "/sqft";
  return u.startsWith("/") ? u : `/${u.replace(/^per_/, "")}`;
}

export default function PublicTurnkeyPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<TurnkeyPkgRow[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  const openRow = useMemo(() => rows.find((r) => r.id === openId) ?? null, [rows, openId]);

  async function load() {
    setErr(null);
    setLoading(true);

    try {
      // IMPORTANT:
      // This assumes provider_turnkey_packages.provider_id -> service_providers.id FK exists.
      // Using !inner ensures only rows with provider.
      const { data, error } = await supabase
        .from("provider_turnkey_packages")
        .select(
          [
            "id",
            "provider_id",
            "package_code",
            "package_name",
            "marketing_title",
            "rate_per_unit",
            "rate_unit",
            "currency",
            "short_highlights",
            "full_scope",
            "material_specification",
            "coverage_area",
            "expected_start_time",
            "estimated_duration",
            "warranty",
            "gst_applicable",
            "gst_pct",
            "payment_terms",
            "inclusions",
            "exclusions",
            "notes",
            "service_providers!inner(display_name,slug,city,district,state,photo_url,status)",
          ].join(",")
        )
        .eq("service_providers.status", "published")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;

      setRows(((data || []) as unknown) as TurnkeyPkgRow[]);
    } catch (e: any) {
      setRows([]);
      setErr(e?.message || "Failed to load turnkey packages.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main>
      <Container>
        <SectionHeader
          title="Turnkey House Construction"
          subtitle="Browse turnkey packages from verified providers. Use View Details for scope, payment schedule, and terms."
        />

        <div style={{ marginBottom: 12 }}>
          <div style={styles.toolbar}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <ActionButton href="/services" variant="secondary">
                ← Back to Services
              </ActionButton>
              <ActionButton href="/services/providers" variant="secondary">
                Browse Providers →
              </ActionButton>
            </div>

            <button onClick={load} style={styles.miniBtn()}>
              Refresh
            </button>
          </div>

          <div style={{ marginTop: 10, ...styles.box }}>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Quick navigation</div>
            <div style={styles.minor}>
              You can go back to <b>Services</b> anytime and browse other service categories.
            </div>
          </div>
        </div>

        {err ? <div style={{ marginBottom: 12, color: "crimson", fontWeight: 900 }}>{err}</div> : null}

        <Card>
          <CardBody>
            {loading ? (
              <div style={{ padding: 10, color: "#5b6472" }}>Loading...</div>
            ) : rows.length === 0 ? (
              <EmptyState message="No turnkey packages found yet." />
            ) : (
              <Grid min={280} gap={12}>
                {rows.map((r) => {
                  const p = r.service_providers ?? null;
                  const title = (r.marketing_title || r.package_name || r.package_code || "Turnkey Package").trim();

                  return (
                    <Card key={r.id}>
                      <CardBody>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                          <div style={{ fontWeight: 900 }}>
                            {title}
                            <div style={{ color: "#5b6472", fontSize: 12, fontWeight: 700, marginTop: 2 }}>
                              Provider: <b>{p?.display_name ?? "—"}</b> • {formatLocation(p)}
                            </div>
                          </div>
                          <Badge>{(r.package_code || r.package_name || "PKG").toString()}</Badge>
                        </div>

                        <div style={{ marginTop: 10, ...styles.minor }}>
                          Rate: <b>{money(r.rate_per_unit, r.currency)}</b>
                          {r.rate_unit ? ` ${normalizeRateUnit(r.rate_unit)}` : ""} • GST:{" "}
                          <b>{r.gst_applicable ? `Yes (${r.gst_pct ?? "—"}%)` : "No"}</b>
                        </div>

                        <div style={{ marginTop: 6, ...styles.minor }}>
                          Coverage: <b>{r.coverage_area ?? "—"}</b> • Start: <b>{r.expected_start_time ?? "—"}</b> • Duration:{" "}
                          <b>{r.estimated_duration ?? "—"}</b>
                        </div>

                        {r.short_highlights?.length ? (
                          <div style={{ marginTop: 10, ...styles.box }}>
                            <div style={{ fontWeight: 900, marginBottom: 6, fontSize: 13 }}>Highlights</div>
                            <div style={{ ...styles.minor, whiteSpace: "pre-wrap" }}>
                              {r.short_highlights.slice(0, 4).map((h) => `• ${h}`).join("\n")}
                              {r.short_highlights.length > 4 ? `\n• +${r.short_highlights.length - 4} more…` : ""}
                            </div>
                          </div>
                        ) : null}
                      </CardBody>

                      <CardFooter>
                        <div style={{ display: "flex", justifyContent: "space-between", width: "100%", gap: 10, flexWrap: "wrap" }}>
                          <button
                            onClick={() => setOpenId(r.id)}
                            style={{ ...styles.miniBtn(), border: "1px solid #111827", fontWeight: 900 }}
                          >
                            View details
                          </button>

                          <ActionButton
                            href={p?.slug ? `/services/providers/${p.slug}` : "/services/providers"}
                            variant="secondary"
                          >
                            View provider →
                          </ActionButton>
                        </div>
                      </CardFooter>
                    </Card>
                  );
                })}
              </Grid>
            )}
          </CardBody>
        </Card>
      </Container>

      {/* DETAILS MODAL */}
      {openRow ? (
        <div
          style={styles.modalOverlay}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpenId(null);
          }}
        >
          <div style={styles.modal}>
            <Card>
              <CardBody>
                <div style={styles.toolbar}>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 18 }}>
                      {(openRow.marketing_title || openRow.package_name || openRow.package_code || "Turnkey Package").trim()}
                    </div>
                    <div style={{ color: "#5b6472", fontSize: 13, marginTop: 4 }}>
                      Provider: <b>{openRow.service_providers?.display_name ?? "—"}</b> • {formatLocation(openRow.service_providers)}
                    </div>
                  </div>

                  <button onClick={() => setOpenId(null)} style={{ ...styles.miniBtn(), border: "1px solid #ef4444" }}>
                    Close
                  </button>
                </div>

                <div style={{ marginTop: 12, ...styles.box }}>
                  <div style={{ fontWeight: 900, marginBottom: 6 }}>Pricing</div>
                  <div style={styles.minor}>
                    Rate: <b>{money(openRow.rate_per_unit, openRow.currency)}</b> {normalizeRateUnit(openRow.rate_unit)} • GST:{" "}
                    <b>{openRow.gst_applicable ? `Yes (${openRow.gst_pct ?? "—"}%)` : "No"}</b>
                  </div>
                </div>

                <div style={{ marginTop: 12, ...styles.box }}>
                  <div style={{ fontWeight: 900, marginBottom: 6 }}>Timeline & Coverage</div>
                  <div style={styles.minor}>
                    Coverage: <b>{openRow.coverage_area ?? "—"}</b>
                    <br />
                    Expected start: <b>{openRow.expected_start_time ?? "—"}</b>
                    <br />
                    Estimated duration: <b>{openRow.estimated_duration ?? "—"}</b>
                    <br />
                    Warranty: <b>{openRow.warranty ?? "—"}</b>
                  </div>
                </div>

                {openRow.payment_terms ? (
                  <div style={{ marginTop: 12, ...styles.box }}>
                    <div style={{ fontWeight: 900, marginBottom: 6 }}>Payment milestones</div>
                    <div style={{ ...styles.minor, whiteSpace: "pre-wrap" }}>
                      {Array.isArray(openRow.payment_terms)
                        ? (openRow.payment_terms as any[]).map((m) => `• ${m.label ?? "—"}: ${m.pct ?? "—"}%`).join("\n")
                        : JSON.stringify(openRow.payment_terms, null, 2)}
                    </div>
                  </div>
                ) : null}

                {openRow.full_scope ? (
                  <div style={{ marginTop: 12, ...styles.box }}>
                    <div style={{ fontWeight: 900, marginBottom: 6 }}>Full scope</div>
                    <div style={{ ...styles.minor, whiteSpace: "pre-wrap" }}>{openRow.full_scope}</div>
                  </div>
                ) : null}

                {openRow.material_specification ? (
                  <div style={{ marginTop: 12, ...styles.box }}>
                    <div style={{ fontWeight: 900, marginBottom: 6 }}>Material specification</div>
                    <div style={{ ...styles.minor, whiteSpace: "pre-wrap" }}>{openRow.material_specification}</div>
                  </div>
                ) : null}

                {openRow.inclusions ? (
                  <div style={{ marginTop: 12, ...styles.box }}>
                    <div style={{ fontWeight: 900, marginBottom: 6 }}>Inclusions</div>
                    <div style={{ ...styles.minor, whiteSpace: "pre-wrap" }}>{openRow.inclusions}</div>
                  </div>
                ) : null}

                {openRow.exclusions ? (
                  <div style={{ marginTop: 12, ...styles.box }}>
                    <div style={{ fontWeight: 900, marginBottom: 6 }}>Exclusions</div>
                    <div style={{ ...styles.minor, whiteSpace: "pre-wrap" }}>{openRow.exclusions}</div>
                  </div>
                ) : null}

                {openRow.notes ? (
                  <div style={{ marginTop: 12, ...styles.box }}>
                    <div style={{ fontWeight: 900, marginBottom: 6 }}>Notes</div>
                    <div style={{ ...styles.minor, whiteSpace: "pre-wrap" }}>{openRow.notes}</div>
                  </div>
                ) : null}
              </CardBody>

              <CardFooter>
                <div style={{ display: "flex", justifyContent: "space-between", width: "100%", gap: 10, flexWrap: "wrap" }}>
                  <ActionButton href="/services" variant="secondary">
                    ← Back to Services
                  </ActionButton>
                  <ActionButton
                    href={
                      openRow.service_providers?.slug ? `/services/providers/${openRow.service_providers.slug}` : "/services/providers"
                    }
                    variant="primary"
                  >
                    Contact / View Provider →
                  </ActionButton>
                </div>
              </CardFooter>
            </Card>
          </div>
        </div>
      ) : null}

      <style jsx global>{`
        body {
          background: #f8fafc;
        }
      `}</style>
    </main>
  );
}
