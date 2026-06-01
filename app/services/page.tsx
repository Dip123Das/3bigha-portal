// app/services/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Card, CardBody, CardFooter } from "@/components/ui/Card";
import { ActionButton } from "@/components/ui/ActionButton";
import { FilterBar, FilterBarItem } from "@/components/ui/FilterBar";
import { Grid } from "@/components/ui/Grid";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

import SendEnquiryButton from "@/app/components/enquiry/SendEnquiryButton";
import JsonLd from "@/components/seo/JsonLd";
import { breadcrumbSchema } from "@/lib/seo/schema";

type ServiceGroup = "Professional / Skilled" | "Legal";

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

const GROUP_FILTER: FilterBarItem[] = [
  { key: "Professional / Skilled", label: "Professional / Skilled" },
  { key: "Legal", label: "Legal" },
];

const PRO_FILTER: FilterBarItem[] = [
  { key: "all", label: "All" },
  { key: "Engineering", label: "Engineering" },
  { key: "Architecture", label: "Architecture" },
  { key: "Design", label: "Design" },
  { key: "Project", label: "Project" },
  { key: "Estimation", label: "Estimation" },
  { key: "Testing", label: "Testing" },
  { key: "Surveying", label: "Surveying" },
  { key: "MEP", label: "MEP" },
  { key: "Contracting", label: "Contracting" },
  { key: "Masonry", label: "Masonry" },
  { key: "Carpentry", label: "Carpentry" },
  { key: "Electrical", label: "Electrical" },
  { key: "Plumbing", label: "Plumbing" },
  { key: "Painting", label: "Painting" },
  { key: "Flooring", label: "Flooring" },
  { key: "Fabrication", label: "Fabrication" },
  { key: "Roofing", label: "Roofing" },
  { key: "Equipment Operator", label: "Operators" },
  { key: "Labour", label: "Manpower" },
  { key: "Maintenance", label: "Maintenance" },
  { key: "Interior", label: "Interior" },
  { key: "Security Systems", label: "Security" },
  { key: "Safety", label: "Safety" },
  { key: "Renewable", label: "Renewable" },
  { key: "Water", label: "Water" },
];

const LEGAL_FILTER: FilterBarItem[] = [
  { key: "all", label: "All" },
  { key: "Documentation", label: "Documentation" },
  { key: "Advisory", label: "Advisory" },
  { key: "Valuation", label: "Valuation" },
  { key: "Banking", label: "Banking" },
  { key: "Legal Survey", label: "Legal Survey" },
];

function norm(v: unknown) {
  return String(v ?? "").trim().toLowerCase();
}

function slugify(v: unknown) {
  return norm(v)
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function fmtMoney(currency: string | null, v: number | null) {
  if (v == null) return null;
  const c = currency || "INR";
  if (c === "INR") return `₹ ${v}`;
  return `${c} ${v}`;
}

function servicePriceTodayHref(r: ServiceRow, name: string) {
  const serviceName =
    r.custom_service?.trim() ||
    r.custom_subcategory?.trim() ||
    r.custom_category?.trim() ||
    r.segment?.trim() ||
    name ||
    "Service";

  const params = new URLSearchParams();
  params.set("category", "Services");
  params.set("q", serviceName);

  if (r.custom_category) params.set("serviceCategory", r.custom_category);
  if (r.custom_subcategory) params.set("subcategory", r.custom_subcategory);
  if (r.custom_service) params.set("service", r.custom_service);
  if (r.city || r.district) params.set("location", r.city || r.district || "");

  return `/price-today?${params.toString()}`;
}

function createAnonSupabase(): SupabaseClient | null {
  if (typeof window === "undefined") return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;

  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      },
    },
  });
}

function safeClearExpiredSupabaseSessions() {
  try {
    if (typeof window === "undefined") return;

    const nowSec = Math.floor(Date.now() / 1000);
    const keys: string[] = [];

    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (!k) continue;
      if (k.includes("-auth-token")) keys.push(k);
      if (k === "supabase.auth.token") keys.push(k);
    }

    for (const key of keys) {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;

      let parsed: any = null;
      try {
        parsed = JSON.parse(raw);
      } catch {
        window.localStorage.removeItem(key);
        continue;
      }

      const expiresAt: number | null = typeof parsed?.expires_at === "number" ? parsed.expires_at : null;
      if (!expiresAt) continue;

      if (expiresAt <= nowSec - 30) {
        window.localStorage.removeItem(key);

        try {
          const prefix = key.replace(/-auth-token.*$/, "");
          const maybeRelated = [
            `${prefix}-auth-token`,
            `${prefix}-auth-token-code-verifier`,
            `${prefix}-auth-token-refresh-token`,
            `${prefix}-auth-token-expires-at`,
          ];
          for (const rk of maybeRelated) window.localStorage.removeItem(rk);
        } catch {
          // ignore
        }
      }
    }
  } catch {
    // ignore
  }
}

export const revalidate = 300;

export default function ServicesPage() {
  const supabaseAnon = useMemo(() => {
    if (typeof window === "undefined") return null;
    return createAnonSupabase();
  }, []);

  const [group, setGroup] = useState<ServiceGroup>("Professional / Skilled");
  const [active, setActive] = useState<string>("all");
  const [q, setQ] = useState<string>("");

  const [rows, setRows] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  useEffect(() => {
    safeClearExpiredSupabaseSessions();
  }, []);

  useEffect(() => {
    if (!supabaseAnon) {
      setLoading(false);
      setLoadErr("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
      return;
    }

    let alive = true;

    (async () => {
      setLoading(true);
      setLoadErr(null);

      const selectCols = [
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
      ].join(",");

      const { data, error } = await (supabaseAnon as any)
        .from("v_service_listings")
        .select(selectCols)
        .eq("service_is_active", true)
        .order("provider_service_created_at", { ascending: false });

      if (!alive) return;

      if (error) {
        const msg = String(error.message || "");
        if (msg.toLowerCase().includes("jwt expired")) {
          safeClearExpiredSupabaseSessions();

          const retry = await (supabaseAnon as any)
            .from("v_service_listings")
            .select(selectCols)
            .eq("service_is_active", true)
            .order("provider_service_created_at", { ascending: false });

          if (retry.error) {
            setRows([]);
            setLoadErr(retry.error.message || "Failed to load services.");
            setLoading(false);
            return;
          }

          setRows(((retry.data ?? []) as unknown) as ServiceRow[]);
          setLoading(false);
          return;
        }

        setRows([]);
        setLoadErr(error.message || "Failed to load services.");
        setLoading(false);
        return;
      }

      setRows(((data ?? []) as unknown) as ServiceRow[]);
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [supabaseAnon]);

  const activeFilterItems = useMemo(() => {
    return group === "Legal" ? LEGAL_FILTER : PRO_FILTER;
  }, [group]);

  const list = useMemo(() => {
    const groupSlug = slugify(group);

    const base = rows.filter((r) => {
      if (!r.segment && !r.segment_slug) return group === "Professional / Skilled";
      return norm(r.segment) === norm(group) || norm(r.segment_slug) === groupSlug;
    });

    if (active === "all") return base;

    const activeSlug = slugify(active);
    return base.filter((r) => norm(r.custom_category) === norm(active) || norm(r.category_slug) === activeSlug);
  }, [rows, group, active]);

  const filtered = useMemo(() => {
    const query = norm(q);
    if (!query) return list;

    return list.filter((r) => {
      const haystack = [
        r.custom_service ?? "",
        r.service_slug ?? "",
        r.service_description ?? "",
        r.segment ?? "",
        r.segment_slug ?? "",
        r.custom_category ?? "",
        r.category_slug ?? "",
        r.provider_name ?? "",
        r.provider_kind ?? "",
        r.city ?? "",
        r.district ?? "",
        r.state ?? "",
        r.primary_pincode ?? "",
        r.pricing_kind ?? "",
        String(r.min_price ?? ""),
        String(r.max_price ?? ""),
        r.currency ?? "",
        r.provider_service_id,
      ]
        .map((x) => norm(x))
        .join(" ");

      return haystack.includes(query);
    });
  }, [list, q]);

  const title = group === "Legal" ? "Legal Services" : "Professional / Skilled Services";

  const subtitle =
    group === "Legal"
      ? "Find advocates, deed writers, valuation experts, banking documentation support and legal survey professionals."
      : "Find verified professionals, skilled workers, contractors, operators and service providers related to real estate and construction.";

  return (
    <main>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", url: "https://www.3bigha.com" },
          { name: "Services", url: "https://www.3bigha.com/services" },
        ])}
      />

      <Container>
        <SectionHeader
          title="Services"
          subtitle="Discover and compare service providers across construction, real estate and legal support."
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
          <ActionButton href="/services/turnkey" variant="primary">
            Turnkey House Construction
          </ActionButton>

          <ActionButton href="/services/add" variant="secondary">
            Post Service
          </ActionButton>

          <ActionButton href="/services/my" variant="secondary">
            My Services
          </ActionButton>
        </div>

        <div style={{ marginTop: 18 }}>
          <SectionHeader title={title} subtitle={subtitle} />

          <div style={{ marginTop: 12 }}>
            <FilterBar
              items={GROUP_FILTER}
              activeKey={group}
              onChange={(k) => {
                setGroup(k as ServiceGroup);
                setActive("all");
                setQ("");
              }}
              ariaLabel="Service groups"
            />
          </div>

          <div
            style={{
              marginTop: 12,
              display: "flex",
              gap: 12,
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
            }}
          >
            <div style={{ flex: "1 1 560px" }}>
              <FilterBar
                items={activeFilterItems}
                activeKey={active}
                onChange={(k) => setActive(String(k))}
                ariaLabel="Service categories"
              />
            </div>

            <div style={{ flex: "0 1 320px", display: "flex", justifyContent: "flex-end" }}>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={`Search in ${group}…`}
                style={{
                  width: "min(360px, 100%)",
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,0.15)",
                  outline: "none",
                  fontSize: 13,
                  background: "#fff",
                }}
              />
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            {loading ? (
              <EmptyState message="Loading services…" />
            ) : loadErr ? (
              <EmptyState message={`Service load failed: ${loadErr}`} />
            ) : (
              <>
                <Grid min={260} gap={14}>
                  {filtered.map((r: ServiceRow) => {
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
                        : "";

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
                            <span>Segment: {r.segment ?? "—"}</span>
                            <span>Category: {r.custom_category ?? "—"}</span>
                            {r.provider_name ? <span>Provider: {r.provider_name}</span> : null}
                            {location ? <span>Location: {location}</span> : null}
                            {priceText ? <span>Price: {priceText}</span> : null}
                          </div>

                          <div style={{ marginTop: 12 }}>
                            <SendEnquiryButton
                              module="service"
                              refId={String(r.provider_service_id)}
                              title={name}
                              priceText={priceText}
                              vendorUserId={r.provider_id ?? null}
                              nextUrl={`/services/${encodeURIComponent(String(r.provider_service_id))}`}
                              buttonLabel="Send Enquiry"
                            />
                          </div>
                        </CardBody>

                        <CardFooter>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                            <ActionButton href={servicePriceTodayHref(r, name)} variant="primary">
                              Compare Rate →
                            </ActionButton>

                            <ActionButton
                              href={`/services/${encodeURIComponent(String(r.provider_service_id))}`}
                              variant="secondary"
                            >
                              View details →
                            </ActionButton>
                          </div>
                        </CardFooter>
                      </Card>
                    );
                  })}
                </Grid>

                {filtered.length === 0 ? (
                  <EmptyState
                    message={q.trim() ? "No services found for this search." : "No services found for this category."}
                  />
                ) : null}
              </>
            )}
          </div>
        </div>
      </Container>
    </main>
  );
}