// app/services/[id]/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Card, CardBody, CardFooter } from "@/components/ui/Card";
import { ActionButton } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

import SendEnquiryButton from "@/app/components/enquiry/SendEnquiryButton";
import JsonLd from "@/components/seo/JsonLd";
import { breadcrumbSchema } from "@/lib/seo/schema";
import { siteConfig } from "@/lib/seo/site";
import { Link } from "lucide-react";

type ServiceRow = {
  provider_service_id: string;

  provider_id: string | null;
  provider_name: string | null;
  provider_slug: string | null;
  provider_kind: string | null;
  provider_phone: string | null;
  provider_email: string | null;

  city: string | null;
  district: string | null;
  state: string | null;

  provider_status: string | null;

  custom_category: string | null;
  custom_subcategory: string | null;
  custom_service: string | null;

  service_description: string | null;
  service_is_active: boolean | null;

  pricing_kind: string | null;
  min_price: number | null;
  max_price: number | null;
  currency: string | null;
};

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function safeText(x: any) {
  return String(x ?? "").trim();
}

function fmtMoney(currency: string | null, amount: number | null) {
  if (amount == null) return null;
  const cur = safeText(currency || "INR").toUpperCase();
  const symbol = cur === "INR" ? "₹" : `${cur} `;
  // keep it simple (no decimals); you can enhance later
  return `${symbol}${amount}`;
}

export default function ServiceDetailsPage({ params }: { params: { id: string } }) {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const id = safeText(params?.id);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [row, setRow] = useState<ServiceRow | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setErr(null);
      setRow(null);

      if (!id || !isUuid(id)) {
        if (!alive) return;
        setErr(`Invalid service id in URL: "${id || "—"}".`);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await (supabase as any)
          .from("v_service_listings")
          .select(
            [
              "provider_service_id",
              "provider_id",
              "provider_name",
              "provider_slug",
              "provider_kind",
              "provider_phone",
              "provider_email",
              "city",
              "district",
              "state",
              "provider_status",
              "custom_category",
              "custom_subcategory",
              "custom_service",
              "service_description",
              "service_is_active",
              "pricing_kind",
              "min_price",
              "max_price",
              "currency",
            ].join(",")
          )
          .eq("provider_service_id", id)
          .maybeSingle();

        if (!alive) return;

        if (error) {
          setErr(error.message || "Failed to load service details.");
          setLoading(false);
          return;
        }

        if (!data) {
          setErr("Service not found.");
          setLoading(false);
          return;
        }

        setRow(data as ServiceRow);
        setLoading(false);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || "Failed to load service details.");
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [id, supabase]);

  const name = useMemo(() => {
    const s1 = safeText(row?.custom_service);
    const s2 = safeText(row?.custom_subcategory);
    return s1 || s2 || "Service";
  }, [row]);

  const location = useMemo(() => {
    if (!row) return "";
    return [row.city, row.district, row.state].filter(Boolean).join(", ");
  }, [row]);

  // ✅ TS FIX: always pass string|null and number|null
  const minText = fmtMoney(row?.currency ?? null, row?.min_price ?? null);
  const maxText = fmtMoney(row?.currency ?? null, row?.max_price ?? null);

  const priceText = useMemo(() => {
    if (!row) return "";

    const min = row.min_price ?? null;
    const max = row.max_price ?? null;

    // handle 0 properly (0 is valid price)
    const hasMin = min !== null;
    const hasMax = max !== null;

    if (!hasMin && !hasMax) return "";

    const range =
      hasMin && hasMax && max !== min
        ? `${minText ?? ""} – ${maxText ?? ""}`
        : `${(hasMin ? minText : maxText) ?? ""}`;

    return `${range}${row.pricing_kind ? ` / ${row.pricing_kind}` : ""}`;
  }, [row, minText, maxText]);

  const canonicalUrl = `${siteConfig.url}/services/${encodeURIComponent(id)}`;

  const serviceSchema = row
    ? {
        "@context": "https://schema.org",
        "@type": "Service",
        name,
        description:
          safeText(row.service_description) ||
          "Construction and real estate service listing on 3bigha.com.",
        url: canonicalUrl,
        areaServed: location || "India",
        provider: {
          "@type": "Organization",
          name: safeText(row.provider_name) || "3bigha Service Provider",
          email: safeText(row.provider_email) || undefined,
          telephone: safeText(row.provider_phone) || undefined,
        },
        offers:
          row.min_price !== null || row.max_price !== null
            ? {
                "@type": "Offer",
                priceCurrency: safeText(row.currency) || "INR",
                price:
                  row.min_price !== null
                    ? row.min_price
                    : row.max_price !== null
                    ? row.max_price
                    : undefined,
                description: priceText || "Contact for quote",
                url: canonicalUrl,
              }
            : undefined,
      }
    : null;

  return (
    <main>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: "Home", url: siteConfig.url },
            { name: "Services", url: `${siteConfig.url}/services` },
            { name, url: canonicalUrl },
          ]),
          ...(serviceSchema ? [serviceSchema] : []),
        ]}
      />

      <Container>
        <SectionHeader title={name} subtitle="Service details" />

        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <ActionButton href="/services" variant="secondary">
            ← Back to Services
          </ActionButton>

          {row?.custom_category ? <Badge>{row.custom_category}</Badge> : null}
          {priceText ? <Badge>{priceText}</Badge> : null}
        </div>

        <div style={{ marginTop: 14 }}>
          {loading ? (
            <EmptyState message="Loading service…" />
          ) : err ? (
            <Card>
              <CardBody>
                <div style={{ color: "crimson", fontWeight: 900, marginBottom: 6 }}>Could not load</div>
                <div style={{ opacity: 0.85 }}>{err}</div>
              </CardBody>
              <CardFooter>
                <ActionButton href="/services" variant="primary">
                  Go to Services →
                </ActionButton>
              </CardFooter>
            </Card>
          ) : !row ? (
            <EmptyState message="Service not found." />
          ) : (
            <div className="srvGrid">
              <Card>
                <CardBody>
                  <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                    <div>
                      <h2 style={{ margin: 0 }}>{name}</h2>

                      <div style={{ marginTop: 6, color: "#5b6472" }}>
                        Provider: <b>{row.provider_name ?? "—"}</b>{" "}
                        {row.provider_kind ? <span style={{ opacity: 0.85 }}>• {row.provider_kind}</span> : null}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <Badge>{row.provider_status ?? "active"}</Badge>
                      {row.service_is_active === false ? <Badge>Inactive</Badge> : null}
                    </div>
                  </div>

                  <div style={{ marginTop: 14, lineHeight: 1.65, opacity: 0.92, whiteSpace: "pre-wrap" }}>
                    {safeText(row.service_description) || "No description provided."}
                  </div>

                  <div
                    style={{
                      marginTop: 12,
                      fontSize: 13,
                      color: "#5b6472",
                      display: "flex",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    {location ? <span>Location: {location}</span> : null}
                    {row.provider_phone ? <span>Phone: {row.provider_phone}</span> : null}
                    {row.provider_email ? <span>Email: {row.provider_email}</span> : null}
                  </div>
                </CardBody>

                <CardFooter>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "space-between", width: "100%" }}>
                    <ActionButton href="/services" variant="secondary">
                      ← Back
                    </ActionButton>

                    {row.provider_slug ? (
                      <ActionButton href={`/services/providers/${row.provider_slug}`} variant="primary">
                        View Provider →
                      </ActionButton>
                    ) : (
                      <ActionButton href="/services" variant="primary">
                        Explore more services →
                      </ActionButton>
                    )}
                  </div>
                </CardFooter>
              </Card>

          <Card>
            <CardBody>

              <div style={{ fontWeight: 950, marginBottom: 8 }}>
                Send Enquiry
              </div>

              {!row.provider_id && (
                <div style={{ fontSize:12, opacity:.6, marginBottom:8 }}>
                  Provider account not linked to this service.
                </div>
              )}

              <SendEnquiryButton
                module="service"
                refId={String(row.provider_service_id)}
                title={name}
                priceText={priceText}
                vendorUserId={row.provider_id ?? null}
                nextUrl={`/services/${encodeURIComponent(String(id))}`}
              />

              <Link
                href={`/vendor/discovery?q=${encodeURIComponent(
                  name || "service provider"
                )}`}
                className="topBtn topBtnGhost"
                style={{ textDecoration: "none", marginTop: 10 }}
              >
                AI Recommended Vendors →
              </Link>

            </CardBody>
          </Card>
            </div>
          )}
        </div>

        <style>{`
          .srvGrid{
            display:grid;
            gap:14px;
            grid-template-columns:2fr 1fr;
            align-items:start;
          }
          @media (max-width: 980px){
            .srvGrid{ grid-template-columns:1fr; }
          }
        `}</style>
      </Container>
    </main>
  );
}