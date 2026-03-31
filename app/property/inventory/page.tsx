// app/property/inventory/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getSupabasePublicBrowser } from "@/lib/supabasePublicBrowser";

import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Grid } from "@/components/ui/Grid";
import { Badge } from "@/components/ui/Badge";
import { ActionButton } from "@/components/ui/ActionButton";

type ListingRow = {
  id: string;
  status: string | null;
  title: string | null;
  slug: string | null;
  project_id: string | null;
};

type InventoryRow = {
  id: string;
  listing_id: string | null;
  unit_code: string | null;
  title: string | null;
  availability_status: string | null;
  price: number | null;
  updated_at: string | null;
};

const LISTING_TABLE = "property_listings" as const;
const INVENTORY_TABLE = "inventory_items" as const;

const STATUS_PUBLISHED = "published";

const INV_AVAILABLE = "available";
const INV_RESERVED = "reserved";
const INV_SOLD = "sold";

function norm(s: any): string {
  return String(s ?? "").trim().toLowerCase();
}

function friendlyDbError(err: any): string {
  return String(err?.message ?? err?.hint ?? err?.details ?? err ?? "Unknown error");
}

function formatMoneyINR(value: number | null): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "";
  try {
    return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value);
  } catch {
    return String(value);
  }
}

function availabilityLabel(s: string | null): string {
  const v = norm(s);
  return v || INV_AVAILABLE;
}

function unitLabel(row: InventoryRow): string {
  return row.unit_code ? row.unit_code : row.id.slice(0, 8);
}

function setUrlSlug(slug: string) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (slug) url.searchParams.set("slug", slug);
  else url.searchParams.delete("slug");
  url.searchParams.delete("listing_id"); // keep canonical as slug
  window.history.replaceState({}, "", url.toString());
}

export default function PublicInventoryPage() {
  const searchParams = useSearchParams();
  const supabase = useMemo(() => getSupabasePublicBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [globalError, setGlobalError] = useState("");

  const [publishedListings, setPublishedListings] = useState<ListingRow[]>([]);
  const [selectedListingId, setSelectedListingId] = useState<string>("");

  const [inventory, setInventory] = useState<InventoryRow[]>([]);

  // UX toggles
  const [onlyAvailable, setOnlyAvailable] = useState(true);

  // URL params
  const urlListingId = String(searchParams.get("listing_id") ?? "").trim();
  const urlSlug = String(searchParams.get("slug") ?? "").trim();

  // Load published listings
  useEffect(() => {
    let cancelled = false;

    async function loadListings() {
      setGlobalError("");
      setLoading(true);

      const lRes = await supabase
        .from(LISTING_TABLE)
        .select("id,status,title,slug,project_id")
        .eq("status", STATUS_PUBLISHED)
        .order("created_at", { ascending: false });

      if (!cancelled && lRes.error) {
        setGlobalError(friendlyDbError(lRes.error));
        setPublishedListings([]);
        setLoading(false);
        return;
      }

      const lData = (lRes.data ?? []) as ListingRow[];
      if (!cancelled) {
        setPublishedListings(lData);

        // Resolve initial selection:
        // 1) listing_id param
        // 2) slug param
        // 3) first published listing
        let initial = "";

        if (urlListingId && lData.some((x) => x.id === urlListingId)) {
          initial = urlListingId;
        } else if (urlSlug) {
          const match = lData.find((x) => (x.slug ?? "") === urlSlug);
          if (match) initial = match.id;
        } else {
          initial = lData[0]?.id ?? "";
        }

        setSelectedListingId(initial);

        // If we picked based on fallback (no slug), set a canonical slug in URL
        const sel = lData.find((x) => x.id === initial);
        if (sel?.slug) setUrlSlug(sel.slug);
      }

      setLoading(false);
    }

    loadListings();
    return () => {
      cancelled = true;
    };
  }, [supabase, urlListingId, urlSlug]);

  const selectedListing = useMemo(
    () => publishedListings.find((x) => x.id === selectedListingId) ?? null,
    [publishedListings, selectedListingId]
  );

  const listingSlug = selectedListing?.slug ?? "";
  const listingTitle = selectedListing?.title ?? "(untitled listing)";

  // Keep URL in sync whenever selection changes
  useEffect(() => {
    if (!selectedListing) return;
    if (selectedListing.slug) setUrlSlug(selectedListing.slug);
  }, [selectedListing?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load inventory for selected listing
  useEffect(() => {
    let cancelled = false;

    async function loadInventory() {
      setGlobalError("");
      setInventory([]);

      if (!selectedListingId) return;

      setLoading(true);

      const invRes = await supabase
        .from(INVENTORY_TABLE)
        .select("id,listing_id,unit_code,title,availability_status,price,updated_at")
        .eq("listing_id", selectedListingId)
        .order("unit_code", { ascending: true });

      if (!cancelled && invRes.error) {
        setGlobalError(friendlyDbError(invRes.error));
        setInventory([]);
        setLoading(false);
        return;
      }

      const invData = (invRes.data ?? []) as InventoryRow[];
      if (!cancelled) setInventory(invData);

      setLoading(false);
    }

    loadInventory();
    return () => {
      cancelled = true;
    };
  }, [supabase, selectedListingId]);

  const counts = useMemo(() => {
    let available = 0;
    let reserved = 0;
    let sold = 0;
    for (const r of inventory) {
      const st = availabilityLabel(r.availability_status);
      if (st === INV_AVAILABLE) available += 1;
      else if (st === INV_RESERVED) reserved += 1;
      else if (st === INV_SOLD) sold += 1;
    }
    return { available, reserved, sold, total: inventory.length };
  }, [inventory]);

  const visibleInventory = useMemo(() => {
    if (!onlyAvailable) return inventory;
    return inventory.filter((r) => availabilityLabel(r.availability_status) === INV_AVAILABLE);
  }, [inventory, onlyAvailable]);

  const listingHref = listingSlug ? `/property/${listingSlug}` : "/property";

  return (
    <Container>
      <SectionHeader
        title="Property • Inventory"
        subtitle="Live unit availability for published listings (read-only). Shareable URLs stay in sync."
        right={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <Link href={listingHref}>
              <ActionButton variant="secondary">{listingSlug ? "Back to Listing" : "Back to Properties"}</ActionButton>
            </Link>
          </div>
        }
      />

      {/* Breadcrumb bar */}
      <Card>
        <CardBody>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <Link href="/property" style={{ textDecoration: "none" }}>
              <ActionButton variant="secondary">Properties</ActionButton>
            </Link>
            {listingSlug ? (
              <>
                <span style={{ opacity: 0.6 }}>→</span>
                <Link href={`/property/${listingSlug}`} style={{ textDecoration: "none" }}>
                  <ActionButton variant="secondary">{listingTitle}</ActionButton>
                </Link>
              </>
            ) : null}
            <span style={{ opacity: 0.6 }}>→</span>
            <Badge>Inventory</Badge>
          </div>
        </CardBody>
      </Card>

      <div style={{ height: 14 }} />

      <Card>
        <CardBody>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ minWidth: 360 }}>
              <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Published listing</div>
              <select
                value={selectedListingId}
                onChange={(e) => setSelectedListingId(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
                disabled={loading || publishedListings.length === 0}
              >
                {publishedListings.length === 0 ? (
                  <option value="">No published listings</option>
                ) : (
                  publishedListings.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.title ?? "(untitled)"} {l.slug ? `• ${l.slug}` : ""}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <Badge>{counts.total} total</Badge>
              <Badge>{counts.available} available</Badge>
              {counts.reserved > 0 ? <Badge>{counts.reserved} reserved</Badge> : null}
              {counts.sold > 0 ? <Badge>{counts.sold} sold</Badge> : null}
              {selectedListing ? <Badge>{listingTitle}</Badge> : null}
              {listingSlug ? <Badge>/property/{listingSlug}</Badge> : null}
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <div
              style={{
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                alignItems: "center",
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid #e8e8e8",
                background: "#fafafa",
              }}
            >
              <label style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={onlyAvailable}
                  onChange={(e) => setOnlyAvailable(e.target.checked)}
                />
                <span style={{ fontSize: 13, fontWeight: 800 }}>Only show available units</span>
              </label>

              <div style={{ flex: 1 }} />

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <Badge>Legend</Badge>
                <Badge>{INV_AVAILABLE} = open</Badge>
                <Badge>{INV_RESERVED} = booked (pending)</Badge>
                <Badge>{INV_SOLD} = not available</Badge>
              </div>
            </div>

            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
              Share this inventory page: copy the URL (it stays synced as you change listing).
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
      ) : publishedListings.length === 0 ? (
        <Card>
          <CardBody>
            <div style={{ fontWeight: 900 }}>No published listings</div>
            <div style={{ marginTop: 6, opacity: 0.8 }}>
              Inventory is shown only for listings with status = <b>published</b>.
            </div>
          </CardBody>
        </Card>
      ) : !selectedListingId ? (
        <Card>
          <CardBody>Select a listing to see inventory.</CardBody>
        </Card>
      ) : visibleInventory.length === 0 ? (
        <Card>
          <CardBody>
            <div style={{ fontWeight: 900 }}>
              {onlyAvailable ? "No available units" : "No inventory linked"}
            </div>
            <div style={{ marginTop: 6, opacity: 0.8 }}>
              {onlyAvailable
                ? "Try turning off “Only show available units” to view reserved/sold units."
                : "This published listing currently has no linked inventory items."}
            </div>
          </CardBody>
        </Card>
      ) : (
        <Grid>
          {visibleInventory.map((row) => {
            const label = unitLabel(row);
            const avail = availabilityLabel(row.availability_status);

            return (
              <Card key={row.id}>
                <CardBody>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: 14 }}>{label}</div>
                      <div style={{ marginTop: 6, opacity: 0.85 }}>{row.title ?? ""}</div>

                      <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <Badge>{avail}</Badge>
                        {row.price !== null ? (
                          <Badge>₹ {formatMoneyINR(row.price)}</Badge>
                        ) : (
                          <Badge>Price on request</Badge>
                        )}
                      </div>
                    </div>

                    {listingSlug ? (
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <Link href={`/property/${listingSlug}`}>
                          <ActionButton variant="secondary">View Listing</ActionButton>
                        </Link>
                      </div>
                    ) : null}
                  </div>

                  {row.updated_at ? (
                    <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>Updated: {row.updated_at}</div>
                  ) : null}
                </CardBody>
              </Card>
            );
          })}
        </Grid>
      )}
    </Container>
  );
}
