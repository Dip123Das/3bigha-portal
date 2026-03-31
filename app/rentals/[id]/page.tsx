// app/rentals/[id]/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Card, CardBody, CardFooter } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

import SendEnquiryButton from "@/app/components/enquiry/SendEnquiryButton";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isBadId(v?: string | null) {
  const s = String(v ?? "").trim();
  return !s || s === "id" || s === "[id]" || s === "<id>" || !UUID_RE.test(s);
}

type Row = {
  id: string;
  title: string | null;
  description: string | null;
  pricing_unit: string | null;
  rate: number | null;
  rate_unit_label?: string | null;
  security_deposit: number | null;
  country: string | null;
  state: string | null;
  district: string | null;
  city: string | null;
  locality: string | null;
  status: string | null;
  updated_at: string | null;
  photos: any | null;
  vendor_user_id: string | null;
};

function fmt(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso);
  }
}

function fmtRate(rate: number | null, pricingUnit: string | null, rateUnitLabel?: string | null) {
  if (rate == null) return "—";
  const unit = rateUnitLabel || pricingUnit || "";
  return `₹ ${rate}${unit ? `/${unit}` : ""}`;
}

function normalizeRow(x: any): Row | null {
  if (!x || typeof x !== "object") return null;
  if (!x.id) return null;

  return {
    id: String(x.id),
    title: x.title == null ? null : String(x.title),
    description: x.description == null ? null : String(x.description),
    pricing_unit: x.pricing_unit == null ? null : String(x.pricing_unit),
    rate: x.rate == null ? null : Number(x.rate),
    rate_unit_label: x.rate_unit_label == null ? null : String(x.rate_unit_label),
    security_deposit: x.security_deposit == null ? null : Number(x.security_deposit),
    country: x.country == null ? null : String(x.country),
    state: x.state == null ? null : String(x.state),
    district: x.district == null ? null : String(x.district),
    city: x.city == null ? null : String(x.city),
    locality: x.locality == null ? null : String(x.locality),
    status: x.status == null ? null : String(x.status),
    updated_at: x.updated_at == null ? null : String(x.updated_at),
    photos: x.photos ?? null,
    vendor_user_id: x.vendor_user_id == null ? null : String(x.vendor_user_id),
  };
}

function photoUrls(photos: any): string[] {
  if (!photos) return [];
  if (Array.isArray(photos)) {
    return photos
      .map((p) => {
        if (!p) return null;
        if (typeof p === "string") return p;
        if (typeof p === "object") return (p as any).url ?? (p as any).src ?? null;
        return null;
      })
      .filter(Boolean)
      .map((u) => String(u));
  }
  if (typeof photos === "object") {
    const u = (photos as any).url ?? (photos as any).src ?? null;
    return u ? [String(u)] : [];
  }
  return [];
}

function MessageBox(props: { title: string; description?: string }) {
  return (
    <div style={{ border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: 16, background: "rgba(0,0,0,0.02)" }}>
      <div style={{ fontWeight: 800, marginBottom: 6 }}>{props.title}</div>
      {props.description ? <div style={{ opacity: 0.8, lineHeight: 1.5 }}>{props.description}</div> : null}
    </div>
  );
}

export default function RentalPublicDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [row, setRow] = useState<Row | null>(null);

  useEffect(() => {
    if (!id) return;

    if (isBadId(id)) {
      setErr('Invalid rental id in URL.');
      setRow(null);
      setLoading(false);
      return;
    }

    let alive = true;

    async function load() {
      setLoading(true);
      setErr(null);

      const publicRes = await supabase
        .from("rental_listings_public")
        .select(
          [
            "id",
            "title",
            "description",
            "pricing_unit",
            "rate",
            "rate_unit_label",
            "security_deposit",
            "country",
            "state",
            "district",
            "city",
            "locality",
            "status",
            "updated_at",
            "photos",
          ].join(",")
        )
        .eq("id", id)
        .maybeSingle();

      if (!alive) return;

      if (publicRes.error) {
        setErr(publicRes.error.message);
        setRow(null);
        setLoading(false);
        return;
      }

      const publicData =
        publicRes.data && typeof publicRes.data === "object" ? (publicRes.data as Record<string, any>) : null;

      if (!publicData) {
        setErr("This rental is not available (not public/published).");
        setRow(null);
        setLoading(false);
        return;
      }

      let vendorUserId: string | null = null;

      try {
        const vendorRes = await supabase
          .from("rental_listings")
          .select("id,vendor_user_id")
          .eq("id", id)
          .maybeSingle();

        if (!vendorRes.error && vendorRes.data?.vendor_user_id) {
          vendorUserId = String(vendorRes.data.vendor_user_id);
        }
      } catch {
        vendorUserId = null;
      }

      const merged = normalizeRow({
        ...publicData,
        vendor_user_id: vendorUserId,
      });

      if (!merged) {
        setErr("This rental is not available (not public/published).");
        setRow(null);
        setLoading(false);
        return;
      }

      setRow(merged);
      setLoading(false);
    }

    load();

    return () => {
      alive = false;
    };
  }, [id, supabase]);

  const urls = useMemo(() => photoUrls(row?.photos), [row?.photos]);
  const cover = urls[0] ?? null;

  const loc = useMemo(() => {
    if (!row) return "—";
    return [row.locality, row.city, row.district, row.state, row.country].filter(Boolean).join(", ") || "—";
  }, [row]);

  const priceText = row ? fmtRate(row.rate, row.pricing_unit, row.rate_unit_label) : "";

  return (
    <Container>
      <SectionHeader title="Rental Details" subtitle="Public listing details" />

      <div style={{ marginBottom: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link href="/rentals" style={{ fontWeight: 900, textDecoration: "none" }}>
          ← Back to Rentals
        </Link>
      </div>

      {err ? (
        <MessageBox title="Could not load" description={err} />
      ) : loading ? (
        <MessageBox title="Loading..." description="Fetching rental details..." />
      ) : !row ? (
        <MessageBox title="Not found" description="No data returned." />
      ) : (
        <div className="rentGrid" style={{ display: "grid", gap: 14, gridTemplateColumns: "2fr 1fr", alignItems: "start" }}>
          <Card>
            <CardBody>
              {cover ? (
                <div style={{ marginBottom: 14 }}>
                  <img
                    src={cover}
                    alt={row.title ?? "Rental"}
                    style={{
                      width: "100%",
                      maxHeight: 420,
                      objectFit: "cover",
                      borderRadius: 12,
                      border: "1px solid rgba(0,0,0,0.08)",
                    }}
                  />
                </div>
              ) : null}

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                <Badge>{(row.status ?? "published").toLowerCase()}</Badge>
                <Badge>Updated: {fmt(row.updated_at)}</Badge>
                {row.pricing_unit ? <Badge>Unit: {row.pricing_unit}</Badge> : null}
                {row.security_deposit != null ? <Badge>Deposit: ₹ {row.security_deposit}</Badge> : null}
              </div>

              <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 8 }}>{(row.title ?? "").trim() || "Untitled rental"}</div>

              <div style={{ opacity: 0.85, marginBottom: 10 }}>
                {loc} • {priceText}
              </div>

              {row.description ? (
                <div style={{ marginTop: 14, lineHeight: 1.65, opacity: 0.9, whiteSpace: "pre-wrap" }}>{row.description}</div>
              ) : (
                <div style={{ marginTop: 14, opacity: 0.7 }}>No description provided.</div>
              )}
            </CardBody>
          </Card>

      <Card>
        <CardBody>

          <div style={{ fontWeight: 950, marginBottom: 8 }}>
            Send Enquiry
          </div>

          {!row.vendor_user_id && (
            <div style={{ fontSize:12, opacity:.6, marginBottom:8 }}>
              Vendor account not linked to this rental.
            </div>
          )}

          <SendEnquiryButton
            module="rental"
            refId={String(row.id)}
            title={row.title ?? "Rental"}
            priceText={priceText}
            vendorUserId={row.vendor_user_id ?? null}
            nextUrl={`/rentals/${encodeURIComponent(String(id))}`}
          />

        </CardBody>
      </Card>
        </div>
      )}

      <style>{`
        @media (max-width: 980px){
          .rentGrid{ grid-template-columns: 1fr !important; }
        }
      `}</style>
    </Container>
  );
}