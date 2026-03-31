"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Grid } from "@/components/ui/Grid";
import { ActionButton } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";

type ProjectRow = { id: string; name: string };

type ListingRow = {
  id: string;
  status: string | null;
  title: string | null;
  slug: string | null;
  created_at: string | null;
  updated_at: string | null;
  owner_id?: string | null;
  owner_user_id?: string | null;
  is_builder_listing?: boolean | null;
  builder_project_id?: string | null;
  published_at?: string | null;
  is_public?: boolean | null;
  price?: number | null;
  expected_price?: number | null;
  city?: string | null;
  state?: string | null;
  listing_intent?: string | null;
};

type InventoryRow = {
  id: string;
  project_id: string;
  listing_id: string | null;
  unit_code: string | null;
  title: string | null;
  availability_status: string | null;
  price: number | null;
};

const PROJECT_TABLE_PRIMARY = "builder_projects" as const;
const PROJECT_TABLE_FALLBACK = "projects" as const;

const LISTING_TABLE = "property_listings" as const;
const INVENTORY_TABLE = "inventory_items" as const;

const STATUS_DRAFT = "draft";
const STATUS_PENDING = "pending";
const STATUS_PUBLISHED = "published";
const STATUS_REJECTED = "rejected";

const INV_AVAILABLE = "available";
const INV_RESERVED = "reserved";
const INV_SOLD = "sold";

const REJECTION_REASON_STORAGE_KEY = "admin_property_rejection_reasons_v1";

function norm(s: any): string {
  return String(s ?? "").trim().toLowerCase();
}

function friendlyDbError(err: any): string {
  return String(err?.message ?? err?.hint ?? err?.details ?? err ?? "Unknown error");
}

function isJwtExpiredError(err: any): boolean {
  const msg = String(err?.message ?? err?.details ?? err ?? "").toLowerCase();
  return msg.includes("jwt expired");
}

function invStatusLabel(s: string | null): string {
  const v = norm(s);
  return v || INV_AVAILABLE;
}

function validateCanPublish(invRows: InventoryRow[]): { ok: boolean; reason?: string } {
  if (!invRows || invRows.length === 0) {
    return { ok: false, reason: "No linked inventory items. Create/link inventory before publishing." };
  }

  const missingPrice = invRows.filter((r) => r.price === null);
  if (missingPrice.length > 0) {
    const sample = missingPrice
      .slice(0, 3)
      .map((r) => r.unit_code ?? r.id.slice(0, 8))
      .join(", ");
    return {
      ok: false,
      reason: `Price missing for ${missingPrice.length} inventory item(s) (e.g. ${sample}). Set price(s) first.`,
    };
  }

  const anyActive = invRows.some((r) => {
    const st = invStatusLabel(r.availability_status);
    return st === INV_AVAILABLE || st === INV_RESERVED;
  });

  if (!anyActive) {
    return { ok: false, reason: "All linked inventory items are SOLD. Publishing is not allowed." };
  }

  return { ok: true };
}

function fmt(v?: string | null) {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleString();
  } catch {
    return String(v);
  }
}

function safeNum(v: any): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function fmtPrice(n?: number | null) {
  if (n == null) return "Price not set";
  try {
    return `₹${n.toLocaleString("en-IN")}`;
  } catch {
    return `₹${n}`;
  }
}

function inferTypeFromTitle(title?: string | null) {
  const t = String(title ?? "").trim();
  if (!t) return "Property";
  const idx = t.indexOf(" - ");
  return idx > 0 ? t.slice(0, idx).trim() : t;
}

function inferPlaceFromListing(l: ListingRow) {
  const city = String(l.city ?? "").trim();
  const state = String(l.state ?? "").trim();

  if (city && state) return `${city}, ${state}`;
  if (city) return city;
  if (state) return state;

  const title = String(l.title ?? "").trim();
  const parts = title.split(" - ");
  if (parts.length >= 2) return parts.slice(1).join(" - ").trim();

  return "Location not set";
}

function statusBadgeLabel(status: string) {
  const s = norm(status);
  if (s === STATUS_PUBLISHED) return "Published";
  if (s === STATUS_PENDING) return "Pending Review";
  if (s === STATUS_DRAFT) return "Draft";
  if (s === STATUS_REJECTED) return "Rejected";
  return s || "Unknown";
}

export default function AdminPropertyListingsPage() {
  const router = useRouter();

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
      } catch {}
      const res2: any = await makeQuery();
      return res2;
    }

    return res1;
  }

  const pendingRef = useRef<HTMLDivElement | null>(null);
  const publishedRef = useRef<HTMLDivElement | null>(null);
  const draftRef = useRef<HTMLDivElement | null>(null);
  const rejectedRef = useRef<HTMLDivElement | null>(null);

  const [loading, setLoading] = useState(true);

  const [projectTable, setProjectTable] = useState<string>("");
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");

  const [builderListings, setBuilderListings] = useState<ListingRow[]>([]);
  const [inventoryByListingId, setInventoryByListingId] = useState<Record<string, InventoryRow[]>>({});

  const [directListings, setDirectListings] = useState<ListingRow[]>([]);

  const [globalError, setGlobalError] = useState("");
  const [globalNote, setGlobalNote] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [rowError, setRowError] = useState<Record<string, string>>({});
  const [savingRow, setSavingRow] = useState<Record<string, boolean>>({});
  const [rowHelp, setRowHelp] = useState<Record<string, string>>({});
  const [rejectionReasonById, setRejectionReasonById] = useState<Record<string, string>>({});

  function persistRejectionReasons(nextMap: Record<string, string>) {
    setRejectionReasonById(nextMap);
    try {
      localStorage.setItem(REJECTION_REASON_STORAGE_KEY, JSON.stringify(nextMap));
    } catch {}
  }

  function scrollToSection(section: "pending" | "published" | "draft" | "rejected") {
    const target =
      section === "pending"
        ? pendingRef.current
        : section === "published"
        ? publishedRef.current
        : section === "draft"
        ? draftRef.current
        : rejectedRef.current;

    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem(REJECTION_REASON_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          setRejectionReasonById(parsed);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      setLoading(true);
      setGlobalError("");
      setGlobalNote("");

      const tryPrimary = await runWithJwtRetry(() =>
        supabase.from(PROJECT_TABLE_PRIMARY).select("id,name").order("name", { ascending: true })
      );

      if (!tryPrimary.error) {
        const pData = (tryPrimary.data ?? []) as ProjectRow[];
        if (!cancelled) {
          setProjectTable(PROJECT_TABLE_PRIMARY);
          setProjects(pData);
          setSelectedProjectId((prev) => prev || (pData[0]?.id ?? ""));
        }
        setLoading(false);
        return;
      }

      const tryFallback = await runWithJwtRetry(() =>
        supabase.from(PROJECT_TABLE_FALLBACK).select("id,name").order("name", { ascending: true })
      );

      if (tryFallback.error) {
        if (!cancelled) {
          setProjectTable("");
          setProjects([]);
          setGlobalError(
            `Could not load projects from either table.\n\n` +
              `Tried: ${PROJECT_TABLE_PRIMARY} → ${friendlyDbError(tryPrimary.error)}\n` +
              `Tried: ${PROJECT_TABLE_FALLBACK} → ${friendlyDbError(tryFallback.error)}`
          );
        }
        setLoading(false);
        return;
      }

      const pData = (tryFallback.data ?? []) as ProjectRow[];
      if (!cancelled) {
        setProjectTable(PROJECT_TABLE_FALLBACK);
        setProjects(pData);
        setSelectedProjectId((prev) => prev || (pData[0]?.id ?? ""));
      }

      setLoading(false);
    }

    boot();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;

    async function loadCombined() {
      setGlobalError("");
      setGlobalNote("");
      setRowError({});
      setRowHelp({});
      setBuilderListings([]);
      setInventoryByListingId({});
      setDirectListings([]);

      setLoading(true);

      const directRes = await runWithJwtRetry(() =>
        supabase
          .from(LISTING_TABLE)
          .select(
            "id,status,title,slug,created_at,updated_at,owner_id,owner_user_id,is_builder_listing,builder_project_id,published_at,is_public,price,expected_price,city,state,listing_intent"
          )
          .or("is_builder_listing.is.false,builder_project_id.is.null")
          .order("created_at", { ascending: false })
      );

      if (!cancelled && directRes.error) {
        setGlobalError(`Direct listings load failed: ${friendlyDbError(directRes.error)}`);
      } else if (!cancelled) {
        setDirectListings((directRes.data ?? []) as ListingRow[]);
      }

      if (!selectedProjectId) {
        setLoading(false);
        return;
      }

      const invRes = await runWithJwtRetry(() =>
        supabase
          .from(INVENTORY_TABLE)
          .select("id,project_id,listing_id,unit_code,title,availability_status,price")
          .eq("project_id", selectedProjectId)
      );

      if (!cancelled && invRes.error) {
        setGlobalError((prev) =>
          prev
            ? prev + `\n\nBuilder listings load failed: ${friendlyDbError(invRes.error)}`
            : `Builder listings load failed: ${friendlyDbError(invRes.error)}`
        );
        setLoading(false);
        return;
      }

      const invData = (invRes.data ?? []) as InventoryRow[];

      const invMap: Record<string, InventoryRow[]> = {};
      const listingIds: string[] = [];

      for (const r of invData) {
        if (!r.listing_id) continue;
        if (!invMap[r.listing_id]) {
          invMap[r.listing_id] = [];
          listingIds.push(r.listing_id);
        }
        invMap[r.listing_id].push(r);
      }

      if (listingIds.length === 0) {
        if (!cancelled) {
          setInventoryByListingId(invMap);
          setBuilderListings([]);
          setGlobalNote(
            "No builder listings are linked to inventory for this project yet. Direct / non-builder listings are shown below separately."
          );
        }
        setLoading(false);
        return;
      }

      const lRes = await runWithJwtRetry(() =>
        supabase
          .from(LISTING_TABLE)
          .select(
            "id,status,title,slug,created_at,updated_at,owner_id,owner_user_id,is_builder_listing,builder_project_id,published_at,is_public,price,expected_price,city,state,listing_intent"
          )
          .in("id", listingIds)
          .order("created_at", { ascending: false })
      );

      if (!cancelled && lRes.error) {
        setGlobalError((prev) =>
          prev
            ? prev + `\n\nBuilder listings query failed: ${friendlyDbError(lRes.error)}`
            : `Builder listings query failed: ${friendlyDbError(lRes.error)}`
        );
        setInventoryByListingId(invMap);
        setLoading(false);
        return;
      }

      const lData = (lRes.data ?? []) as ListingRow[];

      if (!cancelled) {
        setInventoryByListingId(invMap);
        setBuilderListings(lData);

        if (lData.length !== listingIds.length) {
          setGlobalNote(
            `Loaded ${lData.length} builder listing(s) linked via inventory. ${listingIds.length - lData.length} linked listing(s) could not be loaded. Direct / non-builder listings are shown below separately.`
          );
        }
      }

      setLoading(false);
    }

    loadCombined();
    return () => {
      cancelled = true;
    };
  }, [selectedProjectId, supabase]);

  async function ensurePendingBeforeReject(listing: ListingRow) {
    const current = norm(listing.status);

    if (current === STATUS_PENDING) {
      return { ok: true };
    }

    const moveRes = await runWithJwtRetry(() =>
      supabase
        .from(LISTING_TABLE)
        .update({
          status: STATUS_PENDING,
          updated_at: new Date().toISOString(),
          is_public: false,
          published_at: null,
        })
        .eq("id", listing.id)
        .select(
          "id,status,title,slug,created_at,updated_at,owner_id,owner_user_id,is_builder_listing,builder_project_id,published_at,is_public,price,expected_price,city,state,listing_intent"
        )
        .maybeSingle()
    );

    if (moveRes?.error) {
      return {
        ok: false,
        error: friendlyDbError(moveRes.error),
      };
    }

    const updated = (moveRes?.data ?? null) as ListingRow | null;

    if (!updated) {
      return {
        ok: false,
        error: "Could not move listing to pending before rejection.",
      };
    }

    setBuilderListings((prev) => prev.map((r) => (r.id === listing.id ? updated : r)));
    setDirectListings((prev) => prev.map((r) => (r.id === listing.id ? updated : r)));

    return { ok: true, updated };
  }

  async function setListingStatus(
    listing: ListingRow,
    requestedStatus: string,
    rejectionReason?: string
  ) {
    const id = listing.id;

    setRowError((prev) => ({ ...prev, [id]: "" }));
    setRowHelp((prev) => ({ ...prev, [id]: "" }));
    setSavingRow((prev) => ({ ...prev, [id]: true }));
    setGlobalError("");
    setSuccessMsg("");

    try {
      const next = norm(requestedStatus);
      const isBuilder = listing.is_builder_listing === true;

      if (isBuilder && next === STATUS_PUBLISHED) {
        const invRows = inventoryByListingId[id] ?? [];
        const check = validateCanPublish(invRows);
        if (!check.ok) {
          setRowHelp((prev) => ({
            ...prev,
            [id]: check.reason ?? "Cannot publish due to inventory rules.",
          }));
          return;
        }
      }

      const updatePayload: Record<string, any> = {
        status: next,
        updated_at: new Date().toISOString(),
      };

      if (next === STATUS_PUBLISHED) {
        updatePayload.is_public = true;
        updatePayload.published_at = new Date().toISOString();
      } else {
        updatePayload.is_public = false;
        updatePayload.published_at = null;
      }

      console.log("ADMIN_LISTING_STATUS_UPDATE_START", {
        id,
        next,
        isBuilder,
        updatePayload,
      });

      const upRes = await runWithJwtRetry(() =>
        supabase
          .from(LISTING_TABLE)
          .update(updatePayload)
          .eq("id", id)
          .select(
            "id,status,title,slug,created_at,updated_at,owner_id,owner_user_id,is_builder_listing,builder_project_id,published_at,is_public,price,expected_price,city,state,listing_intent"
          )
          .maybeSingle()
      );

      console.log("ADMIN_LISTING_STATUS_UPDATE_RESULT", upRes);

      if (upRes?.error) {
        setRowError((prev) => ({
          ...prev,
          [id]: friendlyDbError(upRes.error),
        }));
        return;
      }

      const updated = (upRes?.data ?? null) as ListingRow | null;

      if (!updated) {
        setRowError((prev) => ({
          ...prev,
          [id]: "Update failed: no row returned.",
        }));
        return;
      }

      setBuilderListings((prev) => prev.map((r) => (r.id === id ? updated : r)));
      setDirectListings((prev) => prev.map((r) => (r.id === id ? updated : r)));

      if (next === STATUS_REJECTED) {
        const nextReasons = { ...rejectionReasonById, [id]: rejectionReason || "" };
        persistRejectionReasons(nextReasons);
      } else if (rejectionReasonById[id]) {
        const nextReasons = { ...rejectionReasonById };
        delete nextReasons[id];
        persistRejectionReasons(nextReasons);
      }

      if (next === STATUS_PUBLISHED) {
        setSuccessMsg(`✅ Listing published successfully: ${updated.title ?? id}`);
        setTimeout(() => scrollToSection("published"), 200);
      } else if (next === STATUS_PENDING) {
        setSuccessMsg(`✅ Listing moved to pending: ${updated.title ?? id}`);
        setTimeout(() => scrollToSection("pending"), 200);
      } else if (next === STATUS_DRAFT) {
        setSuccessMsg(`✅ Listing moved to draft: ${updated.title ?? id}`);
        setTimeout(() => scrollToSection("draft"), 200);
      } else if (next === STATUS_REJECTED) {
        setSuccessMsg(
          `✅ Listing rejected: ${updated.title ?? id}${
            rejectionReason ? ` | Reason: ${rejectionReason}` : ""
          }`
        );
        setTimeout(() => scrollToSection("rejected"), 200);
      }
    } catch (e: any) {
      console.error("ADMIN_LISTING_STATUS_UPDATE_FATAL", e);
      setRowError((prev) => ({
        ...prev,
        [id]: e?.message || "Unknown update error",
      }));
    } finally {
      setSavingRow((prev) => ({ ...prev, [id]: false }));
    }
  }

  async function askRejectReasonAndReject(l: ListingRow) {
    const reason = window.prompt("Please enter rejection reason for this listing:", "");
    if (reason === null) return;

    const trimmed = reason.trim();
    if (!trimmed) {
      setRowError((prev) => ({
        ...prev,
        [l.id]: "Rejection cancelled: reason is required.",
      }));
      return;
    }

    setRowError((prev) => ({ ...prev, [l.id]: "" }));
    setRowHelp((prev) => ({ ...prev, [l.id]: "" }));
    setSavingRow((prev) => ({ ...prev, [l.id]: true }));
    setSuccessMsg("");
    setGlobalError("");

    try {
      const current = norm(l.status);

      if (current !== STATUS_PENDING) {
        const pre = await ensurePendingBeforeReject(l);
        if (!pre.ok) {
          setRowError((prev) => ({
            ...prev,
            [l.id]: pre.error || "Could not move listing to pending before rejecting.",
          }));
          return;
        }
      }

      const latest =
        builderListings.find((x) => x.id === l.id) ||
        directListings.find((x) => x.id === l.id) ||
        l;

      await setListingStatus(latest, STATUS_REJECTED, trimmed);
    } finally {
      setSavingRow((prev) => ({ ...prev, [l.id]: false }));
    }
  }

  function renderListingCard(l: ListingRow, opts?: { builder?: boolean }) {
    const id = l.id;
    const status = norm(l.status) || STATUS_DRAFT;
    const invRows = inventoryByListingId[id] ?? [];
    const isBuilder = opts?.builder === true || l.is_builder_listing === true;

    const invCount = invRows.length;
    const missingPriceCount = invRows.filter((r) => r.price === null).length;
    const soldCount = invRows.filter((r) => invStatusLabel(r.availability_status) === INV_SOLD).length;
    const activeCount = invRows.filter((r) => {
      const st = invStatusLabel(r.availability_status);
      return st === INV_AVAILABLE || st === INV_RESERVED;
    }).length;

    const canPublishCheck = validateCanPublish(invRows);
    const previewHref = `/admin/property/preview?id=${encodeURIComponent(id)}`;
    const publicHref = l.slug ? `/property/${encodeURIComponent(l.slug)}` : "";

    const priceValue = safeNum(l.expected_price) ?? safeNum(l.price);
    const propertyType = inferTypeFromTitle(l.title);
    const propertyPlace = inferPlaceFromListing(l);
    const rejectionReason = rejectionReasonById[id] || "";

    return (
      <Card key={id}>
        <CardBody>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div style={{ minWidth: 310, flex: 1 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
                <Badge>{statusBadgeLabel(status)}</Badge>
                <Badge>{isBuilder ? "builder" : "direct"}</Badge>
                {l.is_public === true ? <Badge>public</Badge> : <Badge>not public</Badge>}
                {isBuilder ? <Badge>{invCount} inventory</Badge> : null}
                {isBuilder ? (
                  missingPriceCount > 0 ? <Badge>{missingPriceCount} price-missing</Badge> : <Badge>prices ok</Badge>
                ) : null}
              </div>

              <div style={{ fontSize: 18, fontWeight: 900, lineHeight: 1.25, marginBottom: 6 }}>
                {propertyType}
              </div>

              <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>
                {propertyPlace}
              </div>

              <div style={{ fontSize: 18, fontWeight: 900, color: "#0f3ea9", marginBottom: 8 }}>
                {fmtPrice(priceValue)}
              </div>

              <div style={{ fontSize: 12, opacity: 0.82, marginBottom: 10 }}>
                Title: {l.title ?? "(untitled listing)"}
              </div>

              <div style={{ fontSize: 13, opacity: 0.88, marginBottom: 10 }}>
                <div><strong>Created:</strong> {fmt(l.created_at)}</div>
                <div><strong>Updated:</strong> {fmt(l.updated_at)}</div>
                <div><strong>Published:</strong> {fmt(l.published_at)}</div>
              </div>

              {status === STATUS_REJECTED && rejectionReason ? (
                <div
                  style={{
                    marginTop: 8,
                    marginBottom: 10,
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid #f3c1c1",
                    background: "#fff5f5",
                    fontSize: 13,
                  }}
                >
                  <div style={{ fontWeight: 800, marginBottom: 4 }}>Rejection reason</div>
                  <div>{rejectionReason}</div>
                </div>
              ) : null}

              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {isBuilder ? (
                  <Link
                    href={`/admin/property/inventory?projectId=${encodeURIComponent(
                      selectedProjectId
                    )}&listing_id=${encodeURIComponent(id)}`}
                  >
                    <ActionButton variant="secondary">Open Inventory</ActionButton>
                  </Link>
                ) : null}

                <Link href={previewHref}>
                  <ActionButton variant="secondary">Open Preview</ActionButton>
                </Link>

                {l.slug ? (
                  <Link href={publicHref} target="_blank" rel="noreferrer">
                    <ActionButton variant="secondary">Open Public Page</ActionButton>
                  </Link>
                ) : null}
              </div>

              {isBuilder ? (
                <div
                  style={{
                    marginTop: 12,
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: canPublishCheck.ok ? "1px solid #cfe8cf" : "1px solid #f3c1c1",
                    background: canPublishCheck.ok ? "#f3fff3" : "#fff5f5",
                  }}
                >
                  <div style={{ fontWeight: 800, marginBottom: 6 }}>Publish readiness</div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <Badge>{invCount} total</Badge>
                    <Badge>{activeCount} active</Badge>
                    <Badge>{soldCount} sold</Badge>
                    <Badge>{missingPriceCount} missing price</Badge>
                  </div>

                  <div style={{ marginTop: 8, fontSize: 13 }}>
                    <span style={{ fontWeight: 800 }}>{canPublishCheck.ok ? "✅" : "⛔"} </span>
                    {canPublishCheck.ok ? "Ready to publish" : canPublishCheck.reason ?? "Not ready to publish"}
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    marginTop: 12,
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(46, 160, 67, 0.25)",
                    background: "rgba(46, 160, 67, 0.08)",
                    fontSize: 13,
                  }}
                >
                  Direct / non-builder listing. Admin can publish this directly without builder inventory linkage.
                </div>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end", minWidth: 250 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <ActionButton
                  variant="secondary"
                  onClick={() => setListingStatus(l, STATUS_DRAFT)}
                  disabled={!!savingRow[id] || status === STATUS_DRAFT}
                >
                  {savingRow[id] && status !== STATUS_DRAFT ? "Saving..." : "Draft"}
                </ActionButton>

                <ActionButton
                  variant="secondary"
                  onClick={() => setListingStatus(l, STATUS_PENDING)}
                  disabled={!!savingRow[id] || status === STATUS_PENDING}
                >
                  {savingRow[id] && status !== STATUS_PENDING ? "Saving..." : "Pending"}
                </ActionButton>

                <ActionButton
                  variant="secondary"
                  onClick={async () => {
                    await askRejectReasonAndReject(l);
                  }}
                  disabled={!!savingRow[id] || status === STATUS_REJECTED}
                >
                  {savingRow[id] && status !== STATUS_REJECTED ? "Saving..." : "Reject"}
                </ActionButton>
                <ActionButton
                  onClick={() => setListingStatus(l, STATUS_PUBLISHED)}
                  disabled={!!savingRow[id] || status === STATUS_PUBLISHED}
                >
                  {savingRow[id] ? "Saving..." : isBuilder ? "Publish" : "Approve / Publish"}
                </ActionButton>
              </div>

              {rowHelp[id] ? (
                <div
                  style={{
                    marginTop: 6,
                    maxWidth: 360,
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid #f3c1c1",
                    background: "#fff5f5",
                    fontSize: 13,
                    whiteSpace: "pre-wrap",
                    textAlign: "left",
                  }}
                >
                  <div style={{ fontWeight: 800, marginBottom: 4 }}>Publish blocked</div>
                  {rowHelp[id]}
                </div>
              ) : null}

              {rowError[id] ? (
                <div
                  style={{
                    marginTop: 6,
                    maxWidth: 360,
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid #f3c1c1",
                    background: "#fff5f5",
                    fontSize: 13,
                    whiteSpace: "pre-wrap",
                    textAlign: "left",
                  }}
                >
                  <div style={{ fontWeight: 800, marginBottom: 4 }}>Update failed</div>
                  {rowError[id]}
                </div>
              ) : null}
            </div>
          </div>
        </CardBody>
      </Card>
    );
  }

  const allListings = [...builderListings, ...directListings];

  const pendingListings = allListings.filter((l) => norm(l.status) === STATUS_PENDING);
  const publishedListings = allListings.filter((l) => norm(l.status) === STATUS_PUBLISHED);
  const draftListings = allListings.filter((l) => norm(l.status) === STATUS_DRAFT);
  const rejectedListings = allListings.filter((l) => norm(l.status) === STATUS_REJECTED);

  function CounterButton(props: {
    label: string;
    count: number;
    onClick: () => void;
  }) {
    return (
      <button
        type="button"
        onClick={props.onClick}
        style={{
          height: 34,
          padding: "0 12px",
          borderRadius: 999,
          border: "1px solid rgba(0,0,0,0.08)",
          background: "white",
          fontWeight: 800,
          cursor: "pointer",
        }}
      >
        {props.count} {props.label}
      </button>
    );
  }

  return (
    <Container>
      <SectionHeader
        title="Property • Listings"
        subtitle="Listings are now grouped by status so approval becomes easier to manage."
        right={
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <ActionButton variant="secondary" onClick={() => router.refresh()}>
              Refresh
            </ActionButton>
          </div>
        }
      />

      <Card>
        <CardBody>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ minWidth: 280 }}>
              <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Builder project</div>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              {projectTable ? (
                <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>Source: {projectTable}</div>
              ) : null}
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <CounterButton label="pending" count={pendingListings.length} onClick={() => scrollToSection("pending")} />
              <CounterButton label="published" count={publishedListings.length} onClick={() => scrollToSection("published")} />
              <CounterButton label="draft" count={draftListings.length} onClick={() => scrollToSection("draft")} />
              <CounterButton label="rejected" count={rejectedListings.length} onClick={() => scrollToSection("rejected")} />
            </div>
          </div>

          {successMsg ? (
            <div
              style={{
                marginTop: 14,
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(46, 160, 67, 0.25)",
                background: "rgba(46, 160, 67, 0.08)",
                fontSize: 13,
                whiteSpace: "pre-wrap",
              }}
            >
              {successMsg}
            </div>
          ) : null}

          {globalNote ? (
            <div
              style={{
                marginTop: 14,
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(46, 160, 67, 0.25)",
                background: "rgba(46, 160, 67, 0.08)",
                fontSize: 13,
                whiteSpace: "pre-wrap",
              }}
            >
              {globalNote}
            </div>
          ) : null}

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
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Error</div>
              <div style={{ whiteSpace: "pre-wrap" }}>{globalError}</div>
            </div>
          ) : null}
        </CardBody>
      </Card>

      <div style={{ height: 14 }} />

      <div ref={pendingRef} style={{ marginBottom: 12, fontWeight: 900, fontSize: 18 }}>Pending Listings</div>
      {loading ? (
        <Card><CardBody>Loading…</CardBody></Card>
      ) : pendingListings.length === 0 ? (
        <Card><CardBody>No pending listings.</CardBody></Card>
      ) : (
        <Grid>{pendingListings.map((l) => renderListingCard(l, { builder: l.is_builder_listing === true }))}</Grid>
      )}

      <div style={{ height: 18 }} />

      <div ref={publishedRef} style={{ marginBottom: 12, fontWeight: 900, fontSize: 18 }}>Published Listings</div>
      {loading ? null : publishedListings.length === 0 ? (
        <Card><CardBody>No published listings.</CardBody></Card>
      ) : (
        <Grid>{publishedListings.map((l) => renderListingCard(l, { builder: l.is_builder_listing === true }))}</Grid>
      )}

      <div style={{ height: 18 }} />

      <div ref={draftRef} style={{ marginBottom: 12, fontWeight: 900, fontSize: 18 }}>Draft Listings</div>
      {loading ? null : draftListings.length === 0 ? (
        <Card><CardBody>No draft listings.</CardBody></Card>
      ) : (
        <Grid>{draftListings.map((l) => renderListingCard(l, { builder: l.is_builder_listing === true }))}</Grid>
      )}

      <div style={{ height: 18 }} />

      <div ref={rejectedRef} style={{ marginBottom: 12, fontWeight: 900, fontSize: 18 }}>Rejected Listings</div>
      {loading ? null : rejectedListings.length === 0 ? (
        <Card><CardBody>No rejected listings.</CardBody></Card>
      ) : (
        <Grid>{rejectedListings.map((l) => renderListingCard(l, { builder: l.is_builder_listing === true }))}</Grid>
      )}
    </Container>
  );
}