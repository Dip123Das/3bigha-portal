// app/services/providers/[slug]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Card, CardBody, CardFooter } from "@/components/ui/Card";
import { ActionButton } from "@/components/ui/ActionButton";
import { Grid } from "@/components/ui/Grid";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

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
  country: string | null;
  primary_pincode: string | null;

  provider_status: string | null;

  custom_category: string | null;
  custom_subcategory: string | null;
  custom_service: string | null;

  service_description: string | null;
  service_is_active: boolean | null;
  provider_service_created_at: string | null;

  segment: string | null;
  segment_slug: string | null;
  category_slug: string | null;
  service_slug: string | null;

  pricing_kind: string | null;
  min_price: number | null;
  max_price: number | null;
  currency: string | null;
};

function norm(v: unknown) {
  return String(v ?? "").trim().toLowerCase();
}

function fmtMoney(currency: string | null | undefined, amount: number | null | undefined) {
  if (amount == null) return null;
  const cur = (currency ?? "INR").toUpperCase();
  const symbol = cur === "INR" ? "₹" : cur + " ";
  return `${symbol}${amount}`;
}

export default function ProviderProfilePage() {
  const params = useParams<{ slug: string }>();
  const slug = String(params?.slug ?? "").trim();

  const [rows, setRows] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setLoadErr(null);
      setRows([]);

      if (!slug) {
        setLoadErr("Missing provider slug in URL.");
        setLoading(false);
        return;
      }

      const supabase = getSupabaseBrowser();

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
            "country",
            "primary_pincode",
            "provider_status",
            "custom_category",
            "custom_subcategory",
            "custom_service",
            "service_description",
            "service_is_active",
            "provider_service_created_at",
            "segment",
            "segment_slug",
            "category_slug",
            "service_slug",
            "pricing_kind",
            "min_price",
            "max_price",
            "currency",
          ].join(",")
        )
        .eq("service_is_active", true)
        .eq("provider_slug", slug)
        .order("provider_service_created_at", { ascending: false });

      if (!alive) return;

      if (error) {
        setLoadErr(error.message || "Failed to load provider profile.");
        setLoading(false);
        return;
      }

      setRows(((data ?? []) as unknown) as ServiceRow[]);
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [slug]);

  const provider = useMemo(() => {
    const r = rows[0];
    if (!r) return null;

    const name =
      (r.provider_name ?? "").trim() ||
      slug.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

    const location = [r.city, r.district, r.state].filter(Boolean).join(", ") || null;

    const segments = Array.from(new Set(rows.map((x) => (x.segment ?? "").trim()).filter(Boolean)));
    const categories = Array.from(new Set(rows.map((x) => (x.custom_category ?? "").trim()).filter(Boolean)));

    return {
      name,
      kind: r.provider_kind,
      phone: r.provider_phone,
      email: r.provider_email,
      status: r.provider_status,
      pincode: r.primary_pincode,
      location,
      segments,
      categories,
      services_count: rows.length,
    };
  }, [rows, slug]);

  return (
    <main>
      <Container>
        <SectionHeader
          title={provider ? provider.name : "Provider"}
          subtitle={provider ? "Provider profile and all active services posted by this provider." : "Loading provider…"}
        />

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "flex-end",
            marginTop: 10,
          }}
        >
          <ActionButton href="/services/providers" variant="secondary">
            ← Back to Providers
          </ActionButton>

          <ActionButton href="/services" variant="secondary">
            Services
          </ActionButton>

          <ActionButton href="/services/turnkey" variant="primary">
            Turnkey House Construction
          </ActionButton>
        </div>

        <div style={{ marginTop: 16 }}>
          {loading ? (
            <EmptyState message="Loading provider profile…" />
          ) : loadErr ? (
            <EmptyState message={`Provider load failed: ${loadErr}`} />
          ) : !provider ? (
            <EmptyState message="Provider not found (or no active services posted yet)." />
          ) : (
            <>
              <Card>
                <CardBody>
                  <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap" }}>
                    <div>
                      <h2 style={{ margin: 0, lineHeight: 1.2 }}>{provider.name}</h2>
                      <div style={{ marginTop: 8, color: "#5b6472", fontSize: 13, display: "grid", gap: 6 }}>
                        {provider.kind ? <div>Kind: {provider.kind}</div> : null}
                        {provider.location ? <div>Location: {provider.location}</div> : null}
                        {provider.pincode ? <div>Pincode: {provider.pincode}</div> : null}
                        {provider.phone ? <div>Phone: {provider.phone}</div> : null}
                        {provider.email ? <div>Email: {provider.email}</div> : null}
                        {provider.status ? <div>Status: {provider.status}</div> : null}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <Badge>{provider.services_count} services</Badge>
                    </div>
                  </div>

                  <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {provider.segments.slice(0, 6).map((s) => (
                      <Badge key={`seg-${s}`}>{s}</Badge>
                    ))}
                    {provider.categories.slice(0, 6).map((c) => (
                      <Badge key={`cat-${c}`}>{c}</Badge>
                    ))}
                  </div>
                </CardBody>
              </Card>

              <div style={{ marginTop: 16 }}>
                <SectionHeader title="Services from this provider" subtitle="Open any service to see details, pricing, and description." />

                <div style={{ marginTop: 12 }}>
                  <Grid min={260} gap={14}>
                    {rows.map((r) => {
                      const name =
                        r.custom_service?.trim() ||
                        (r.service_slug ? r.service_slug.replace(/-/g, " ") : "") ||
                        "Untitled service";

                      const desc = r.service_description?.trim() || "Details will be available on the service page.";
                      const badge = r.custom_category ?? "Service";
                      const location = [r.city, r.district, r.state].filter(Boolean).join(", ") || null;

                      const minText = fmtMoney(r.currency, r.min_price);
                      const maxText = fmtMoney(r.currency, r.max_price);

                      const priceText =
                        r.min_price != null || r.max_price != null
                          ? `${minText ?? ""}${r.max_price != null && r.max_price !== r.min_price ? ` – ${maxText}` : ""}${
                              r.pricing_kind ? ` / ${r.pricing_kind}` : ""
                            }`
                          : null;

                      return (
                        <Card key={r.provider_service_id}>
                          <CardBody>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                              <h3 style={{ margin: 0, lineHeight: 1.2 }}>{name}</h3>
                              <Badge>{badge}</Badge>
                            </div>

                            <p style={{ margin: "10px 0 0", color: "#5b6472" }}>{desc}</p>

                            <div
                              style={{
                                marginTop: 10,
                                color: "#5b6472",
                                fontSize: 13,
                                display: "flex",
                                gap: 10,
                                flexWrap: "wrap",
                              }}
                            >
                              {r.segment ? <span>Segment: {r.segment}</span> : null}
                              {r.custom_category ? <span>Category: {r.custom_category}</span> : null}
                              {location ? <span>Location: {location}</span> : null}
                              {priceText ? <span>Price: {priceText}</span> : null}
                            </div>
                          </CardBody>

                          <CardFooter>
                            <ActionButton href={`/services/${r.provider_service_id}`} variant="secondary">
                              View details →
                            </ActionButton>
                          </CardFooter>
                        </Card>
                      );
                    })}
                  </Grid>

                  {rows.length === 0 ? <EmptyState message="No active services found for this provider." /> : null}
                </div>
              </div>
            </>
          )}
        </div>
      </Container>
    </main>
  );
}
