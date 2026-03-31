// app/property/[slug]/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
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

  // Optional fields (safe to keep as nullable for forward-compat)
  listing_intent?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const LISTING_TABLE = "property_listings" as const;

function friendlyDbError(err: any): string {
  return String(err?.message ?? err?.hint ?? err?.details ?? err ?? "Unknown error");
}

function norm(s: any): string {
  return String(s ?? "").trim().toLowerCase();
}

export default function PropertyDetailPage() {
  const params = useParams<{ slug: string }>();
  const supabase = useMemo(() => getSupabasePublicBrowser(), []);

  const slug = String(params?.slug ?? "").trim();

  const [loading, setLoading] = useState(true);
  const [globalError, setGlobalError] = useState("");

  const [listing, setListing] = useState<ListingRow | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setGlobalError("");
      setListing(null);

      if (!slug) {
        setGlobalError("Missing listing slug in URL.");
        setLoading(false);
        return;
      }

      // IMPORTANT:
      // Keep this SELECT minimal/stable to avoid breaking if your schema evolves.
      const res = await supabase
        .from(LISTING_TABLE)
        .select("id,status,title,slug,listing_intent,city,state,country,created_at,updated_at")
        .eq("slug", slug)
        .maybeSingle();

      if (!cancelled && res.error) {
        setGlobalError(friendlyDbError(res.error));
        setLoading(false);
        return;
      }

      const row = (res.data ?? null) as ListingRow | null;
      if (!cancelled) {
        setListing(row);
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [supabase, slug]);

  const inventoryHref = useMemo(() => {
    if (!slug) return "/property/inventory";
    return `/property/inventory?slug=${encodeURIComponent(slug)}`;
  }, [slug]);

  const status = norm(listing?.status) || "";

  return (
    <Container>
      <SectionHeader
        title={listing?.title ?? (loading ? "Loading…" : "Property")}
        subtitle={listing?.slug ? `/property/${listing.slug}` : slug ? `/property/${slug}` : "Property detail"}
        right={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <Link href="/property">
              <ActionButton variant="secondary">Back to Properties</ActionButton>
            </Link>

            {/* ✅ NEW CTA */}
            <Link href={inventoryHref}>
              <ActionButton>View Unit Availability</ActionButton>
            </Link>
          </div>
        }
      />

      {globalError ? (
        <Card>
          <CardBody>
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid #f3c1c1",
                background: "#fff5f5",
              }}
            >
              <div style={{ fontWeight: 900, marginBottom: 6 }}>Error</div>
              <div style={{ whiteSpace: "pre-wrap" }}>{globalError}</div>
            </div>
          </CardBody>
        </Card>
      ) : null}

      {loading ? (
        <Card>
          <CardBody>Loading…</CardBody>
        </Card>
      ) : !listing ? (
        <Card>
          <CardBody>
            <div style={{ fontWeight: 900 }}>Listing not found</div>
            <div style={{ marginTop: 6, opacity: 0.85 }}>
              No listing exists for slug: <b>{slug}</b>
            </div>
            <div style={{ marginTop: 12 }}>
              <Link href="/property">
                <ActionButton variant="secondary">Go to Properties</ActionButton>
              </Link>
            </div>
          </CardBody>
        </Card>
      ) : (
        <Grid>
          <Card>
            <CardBody>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                {status ? <Badge>{status}</Badge> : <Badge>status unknown</Badge>}
                {listing.listing_intent ? <Badge>{listing.listing_intent}</Badge> : null}
              </div>

              {(listing.city || listing.state || listing.country) ? (
                <div style={{ marginTop: 10, opacity: 0.85 }}>
                  Location:{" "}
                  {[listing.city, listing.state, listing.country].filter(Boolean).join(", ")}
                </div>
              ) : null}

              <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link href={inventoryHref}>
                  <ActionButton>View Unit Availability</ActionButton>
                </Link>
                <Link href="/property">
                  <ActionButton variant="secondary">Browse more properties</ActionButton>
                </Link>
              </div>

              <div style={{ marginTop: 12, fontSize: 12, opacity: 0.7 }}>
                Tip: Unit availability updates live from the builder inventory.
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <div style={{ fontWeight: 900, marginBottom: 8 }}>Listing details</div>

              <div style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.7 }}>
                <div>
                  <b>Listing ID:</b> {listing.id}
                </div>
                <div>
                  <b>Slug:</b> {listing.slug}
                </div>
                <div>
                  <b>Status:</b> {listing.status ?? "unknown"}
                </div>
                {listing.created_at ? (
                  <div>
                    <b>Created:</b> {listing.created_at}
                  </div>
                ) : null}
                {listing.updated_at ? (
                  <div>
                    <b>Updated:</b> {listing.updated_at}
                  </div>
                ) : null}
              </div>
            </CardBody>
          </Card>
        </Grid>
      )}
    </Container>
  );
}
