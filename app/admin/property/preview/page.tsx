// app/admin/property/preview/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { ActionButton } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";

type ListingRow = {
  id: string;
  status: string | null;
  title: string | null;
  slug: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type InventoryRow = {
  id: string;
  project_id: string | null;
  listing_id: string | null;
  unit_code: string | null;
  title: string | null;
  availability_status: string | null;
  price: number | null;
};

const LISTING_TABLE = "property_listings" as const;
const INVENTORY_TABLE = "inventory_items" as const;

function isJwtExpiredError(err: any): boolean {
  const msg = String(err?.message ?? err?.details ?? err ?? "").toLowerCase();
  return msg.includes("jwt expired");
}

function friendlyDbError(err: any): string {
  return String(err?.message ?? err?.hint ?? err?.details ?? err ?? "Unknown error");
}

// simple UUID check (accepts any UUID format)
function looksLikeUuid(v: string): boolean {
  const s = String(v || "").trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

function norm(s: any): string {
  return String(s ?? "").trim().toLowerCase();
}

function formatMoneyINR(value: number | null): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "(not set)";
  try {
    return "₹ " + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value);
  } catch {
    return "₹ " + String(value);
  }
}

export default function AdminPropertyPreviewPage() {
  const searchParams = useSearchParams();

  // ✅ TS-safe Supabase (avoid TS2589)
  const supabase: any = useMemo(() => {
    const factory: any = getSupabaseBrowser as any;
    return factory();
  }, []);

  async function runWithJwtRetry(makeQuery: () => Promise<any>): Promise<any> {
    const res1: any = await makeQuery();
    if (!res1?.error) return res1;

    if (isJwtExpiredError(res1.error)) {
      try {
        await supabase.auth.refreshSession();
      } catch {
        // ignore
      }
      const res2: any = await makeQuery();
      return res2;
    }

    return res1;
  }

  // read id from URL
  const urlIdRaw =
    String(searchParams.get("id") ?? "").trim() ||
    String(searchParams.get("listing_id") ?? "").trim() ||
    String(searchParams.get("uuid") ?? "").trim();

  const [inputId, setInputId] = useState(urlIdRaw);
  const [activeId, setActiveId] = useState(urlIdRaw);

  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState("");

  const [listing, setListing] = useState<ListingRow | null>(null);
  const [invRows, setInvRows] = useState<InventoryRow[]>([]);
  const [projectId, setProjectId] = useState<string>(""); // ✅ derived from linked inventory

  // keep input + active in sync when URL changes
  useEffect(() => {
    setInputId(urlIdRaw);
    setActiveId(urlIdRaw);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlIdRaw]);

  function setUrlId(next: string) {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);

    if (next) url.searchParams.set("id", next);
    else url.searchParams.delete("id");

    // keep URL clean
    url.searchParams.delete("listing_id");
    url.searchParams.delete("uuid");

    window.history.replaceState({}, "", url.toString());
  }

  function go(nextOverride?: string) {
    const next = String(nextOverride ?? inputId ?? "").trim();
    setActiveId(next);
    setUrlId(next);
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setGlobalError("");
      setListing(null);
      setInvRows([]);
      setProjectId("");

      const id = String(activeId || "").trim();
      if (!id) return;

      if (!looksLikeUuid(id)) {
        setGlobalError("Invalid id: please provide a valid property listing UUID.");
        return;
      }

      setLoading(true);

      const lRes = await runWithJwtRetry(() =>
        supabase
          .from(LISTING_TABLE)
          .select("id,status,title,slug,created_at,updated_at")
          .eq("id", id)
          .maybeSingle()
      );

      if (!cancelled && lRes.error) {
        setGlobalError(friendlyDbError(lRes.error));
        setLoading(false);
        return;
      }

      const lData = (lRes.data ?? null) as ListingRow | null;
      if (!lData) {
        setGlobalError("Listing not found (or blocked by RLS).");
        setLoading(false);
        return;
      }

      const iRes = await runWithJwtRetry(() =>
        supabase
          .from(INVENTORY_TABLE)
          .select("id,project_id,listing_id,unit_code,title,availability_status,price")
          .eq("listing_id", id)
      );

      if (!cancelled && iRes.error) {
        setGlobalError((prev) => prev || friendlyDbError(iRes.error));
      }

      const rows = (iRes.data ?? []) as InventoryRow[];
      const derivedProjectId = rows.find((r) => !!r.project_id)?.project_id ?? "";

      if (!cancelled) {
        setListing(lData);
        setInvRows(rows);
        setProjectId(derivedProjectId ? String(derivedProjectId) : "");
      }

      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const slug = listing?.slug ?? "";
  const publicHref = slug ? `/property/${encodeURIComponent(slug)}` : "";
  const status = norm(listing?.status) || "draft";

  const invCount = invRows.length;
  const missingPriceCount = invRows.filter((r) => r.price === null).length;
  const soldCount = invRows.filter((r) => norm(r.availability_status) === "sold").length;
  const activeCount = invRows.filter((r) => {
    const st = norm(r.availability_status) || "available";
    return st === "available" || st === "reserved";
  }).length;

  const invHref = `/admin/property/inventory?project_id=${encodeURIComponent(projectId || "")}&listing_id=${encodeURIComponent(
    listing?.id || ""
  )}`;

  return (
    <Container>
      <SectionHeader
        title="Admin Property Preview"
        subtitle="Preview a single listing by UUID. Shows linked inventory summary and quick links."
        right={
          <Link href="/admin/property">
            <ActionButton variant="secondary">← Back to Admin Property</ActionButton>
          </Link>
        }
      />

      <Card>
        <CardBody>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ flex: "1 1 520px", minWidth: 260 }}>
              <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Listing UUID</div>
              <input
                value={inputId}
                onChange={(e) => setInputId(e.target.value)}
                placeholder="Paste listing UUID here"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #ddd",
                }}
              />
              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
                Tip: open this page like <b>/admin/property/preview?id=UUID</b>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <ActionButton
                variant="secondary"
                onClick={() => {
                  setInputId("");
                  setActiveId("");
                  setUrlId("");
                  setListing(null);
                  setInvRows([]);
                  setProjectId("");
                  setGlobalError("");
                }}
              >
                Clear
              </ActionButton>

              <ActionButton onClick={() => go()}>Load</ActionButton>
            </div>
          </div>

          {globalError ? (
            <div
              style={{
                marginTop: 14,
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid #f3c1c1",
                background: "#fff5f5",
              }}
            >
              <div style={{ fontWeight: 800, marginBottom: 4 }}>Error</div>
              <div style={{ whiteSpace: "pre-wrap" }}>{globalError}</div>
            </div>
          ) : null}
        </CardBody>
      </Card>

      <div style={{ height: 14 }} />

      {loading ? (
        <Card>
          <CardBody>Loading…</CardBody>
        </Card>
      ) : !listing ? (
        <Card>
          <CardBody>
            <div style={{ fontWeight: 800, fontSize: 14 }}>No listing loaded</div>
            <div style={{ marginTop: 6, opacity: 0.8 }}>Paste a listing UUID above and click Load.</div>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody>
            <div style={{ fontWeight: 900, fontSize: 16 }}>{listing.title ?? "(untitled listing)"}</div>

            <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <Badge>{status}</Badge>
              <Badge>{invCount} inventory</Badge>
              <Badge>{activeCount} active</Badge>
              {soldCount ? <Badge>{soldCount} sold</Badge> : null}
              {missingPriceCount ? <Badge>{missingPriceCount} missing price</Badge> : <Badge>prices ok</Badge>}
              {projectId ? <Badge>project ok</Badge> : <Badge>project unknown</Badge>}
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Link href={invHref}>
                <ActionButton variant="secondary">Open Inventory (Filtered)</ActionButton>
              </Link>

              {publicHref ? (
                <Link href={publicHref} target="_blank">
                  <ActionButton variant="secondary">Open Public Page</ActionButton>
                </Link>
              ) : null}
            </div>

            <div style={{ marginTop: 14, fontSize: 13, opacity: 0.85 }}>
              <div>
                <b>ID:</b> {listing.id}
              </div>
              <div>
                <b>Slug:</b> {listing.slug ?? "(none)"}
              </div>
              <div>
                <b>Project:</b> {projectId || "(unknown)"}{" "}
                {!projectId ? <span style={{ opacity: 0.7 }}>• (no linked inventory rows found)</span> : null}
              </div>
            </div>

            <div style={{ height: 12 }} />

            <div style={{ fontWeight: 800, marginBottom: 8 }}>Linked inventory</div>
            {invRows.length === 0 ? (
              <div style={{ opacity: 0.8 }}>No inventory linked.</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {invRows.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      border: "1px solid #eee",
                      borderRadius: 12,
                      padding: "10px 12px",
                      background: "#fbfbfb",
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800 }}>
                        {r.unit_code ?? r.id.slice(0, 8)}{" "}
                        <span style={{ fontWeight: 600, opacity: 0.7 }}>• {r.title ?? "(no title)"}</span>
                      </div>
                      <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <Badge>{norm(r.availability_status) || "available"}</Badge>
                        <Badge>{formatMoneyINR(r.price)}</Badge>
                      </div>
                    </div>

                    <div style={{ fontSize: 12, opacity: 0.7 }}>inv_id: {r.id}</div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}
    </Container>
  );
}
