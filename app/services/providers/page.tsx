// app/services/providers/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Card, CardBody, CardFooter } from "@/components/ui/Card";
import { ActionButton } from "@/components/ui/ActionButton";
import { FilterBar, FilterBarItem } from "@/components/ui/FilterBar";
import { Grid } from "@/components/ui/Grid";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

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

type ProviderCard = {
  provider_id: string | null;
  provider_name: string;
  provider_slug: string;
  provider_kind: string | null;
  provider_phone: string | null;
  provider_email: string | null;

  city: string | null;
  district: string | null;
  state: string | null;
  country: string | null;
  primary_pincode: string | null;

  provider_status: string | null;

  segments: string[];
  categories: string[];
  services_count: number;
  latest_service_at: string | null;
};

const GROUP_FILTER: FilterBarItem[] = [
  { key: "Professional / Skilled", label: "Professional / Skilled" },
  { key: "Legal", label: "Legal" },
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

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

export default function ProvidersDirectoryPage() {
  const [group, setGroup] = useState<ServiceGroup>("Professional / Skilled");
  const [q, setQ] = useState<string>("");

  const [rows, setRows] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setLoadErr(null);

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
        .order("provider_service_created_at", { ascending: false });

      if (!alive) return;

      if (error) {
        setRows([]);
        setLoadErr(error.message || "Failed to load providers.");
        setLoading(false);
        return;
      }

      setRows(((data ?? []) as unknown) as ServiceRow[]);
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, []);

  const providers = useMemo<ProviderCard[]>(() => {
    const bySlug = new Map<string, ProviderCard>();

    for (const r of rows) {
      const slug = (r.provider_slug ?? "").trim();
      if (!slug) continue;

      const existing = bySlug.get(slug);

      const providerName =
        (r.provider_name ?? "").trim() ||
        slug.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

      const nextLatest =
        !existing?.latest_service_at
          ? r.provider_service_created_at
          : !r.provider_service_created_at
            ? existing.latest_service_at
            : new Date(r.provider_service_created_at).getTime() > new Date(existing.latest_service_at).getTime()
              ? r.provider_service_created_at
              : existing.latest_service_at;

      const seg = (r.segment ?? "").trim();
      const cat = (r.custom_category ?? "").trim();

      if (!existing) {
        bySlug.set(slug, {
          provider_id: r.provider_id,
          provider_name: providerName,
          provider_slug: slug,
          provider_kind: r.provider_kind,
          provider_phone: r.provider_phone,
          provider_email: r.provider_email,
          city: r.city,
          district: r.district,
          state: r.state,
          country: r.country,
          primary_pincode: r.primary_pincode,
          provider_status: r.provider_status,
          segments: seg ? [seg] : [],
          categories: cat ? [cat] : [],
          services_count: 1,
          latest_service_at: nextLatest ?? null,
        });
      } else {
        bySlug.set(slug, {
          ...existing,
          provider_id: existing.provider_id ?? r.provider_id,
          provider_name: existing.provider_name || providerName,
          provider_kind: existing.provider_kind ?? r.provider_kind,
          provider_phone: existing.provider_phone ?? r.provider_phone,
          provider_email: existing.provider_email ?? r.provider_email,
          city: existing.city ?? r.city,
          district: existing.district ?? r.district,
          state: existing.state ?? r.state,
          country: existing.country ?? r.country,
          primary_pincode: existing.primary_pincode ?? r.primary_pincode,
          provider_status: existing.provider_status ?? r.provider_status,
          segments: seg ? uniq([...existing.segments, seg]) : existing.segments,
          categories: cat ? uniq([...existing.categories, cat]) : existing.categories,
          services_count: existing.services_count + 1,
          latest_service_at: nextLatest ?? existing.latest_service_at,
        });
      }
    }

    return Array.from(bySlug.values()).sort((a, b) => {
      const ta = a.latest_service_at ? new Date(a.latest_service_at).getTime() : 0;
      const tb = b.latest_service_at ? new Date(b.latest_service_at).getTime() : 0;
      return tb - ta;
    });
  }, [rows]);

  const filteredProviders = useMemo(() => {
    const groupSlug = slugify(group);

    const base = providers.filter((p) => {
      // Provider belongs to a group if ANY of its services rows had that segment name.
      // We collected segments from services rows.
      if (!p.segments.length) return group === "Professional / Skilled";
      return p.segments.some((s) => norm(s) === norm(group) || slugify(s) === groupSlug);
    });

    const query = norm(q);
    if (!query) return base;

    return base.filter((p) => {
      const hay = [
        p.provider_name,
        p.provider_slug,
        p.provider_kind ?? "",
        p.provider_phone ?? "",
        p.provider_email ?? "",
        p.city ?? "",
        p.district ?? "",
        p.state ?? "",
        p.primary_pincode ?? "",
        p.provider_status ?? "",
        ...p.segments,
        ...p.categories,
        String(p.services_count),
      ]
        .map((x) => norm(x))
        .join(" ");

      return hay.includes(query);
    });
  }, [providers, group, q]);

  return (
    <main>
      <Container>
        <SectionHeader
          title="Service Providers"
          subtitle="Browse providers, open their profile, and explore all services posted by them."
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
          <ActionButton href="/services" variant="secondary">
            ← Back to Services
          </ActionButton>

          <ActionButton href="/services/turnkey" variant="primary">
            Turnkey House Construction
          </ActionButton>
        </div>

        <div style={{ marginTop: 18 }}>
          <div style={{ marginTop: 12 }}>
            <FilterBar
              items={GROUP_FILTER}
              activeKey={group}
              onChange={(k) => {
                setGroup(k as ServiceGroup);
                setQ("");
              }}
              ariaLabel="Provider groups"
            />
          </div>

          <div
            style={{
              marginTop: 12,
              display: "flex",
              gap: 12,
              alignItems: "center",
              justifyContent: "flex-end",
              flexWrap: "wrap",
            }}
          >
            <div style={{ flex: "0 1 360px", display: "flex", justifyContent: "flex-end" }}>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={`Search providers in ${group}…`}
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
              <EmptyState message="Loading providers…" />
            ) : loadErr ? (
              <EmptyState message={`Provider load failed: ${loadErr}`} />
            ) : (
              <>
                <Grid min={260} gap={14}>
                  {filteredProviders.map((p) => {
                    const location = [p.city, p.district, p.state].filter(Boolean).join(", ") || null;
                    const topCats = p.categories.slice(0, 3);

                    return (
                      <Card key={p.provider_slug}>
                        <CardBody>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                            <h3 style={{ margin: 0, lineHeight: 1.2 }}>{p.provider_name}</h3>
                            <Badge>{p.services_count} services</Badge>
                          </div>

                          <div style={{ marginTop: 10, color: "#5b6472", fontSize: 13, display: "grid", gap: 6 }}>
                            {p.provider_kind ? <div>Kind: {p.provider_kind}</div> : null}
                            {location ? <div>Location: {location}</div> : null}
                            {p.primary_pincode ? <div>Pincode: {p.primary_pincode}</div> : null}
                            {p.provider_phone ? <div>Phone: {p.provider_phone}</div> : null}
                            {p.provider_email ? <div>Email: {p.provider_email}</div> : null}
                            {topCats.length ? <div>Top categories: {topCats.join(", ")}{p.categories.length > 3 ? "…" : ""}</div> : null}
                          </div>
                        </CardBody>

                        <CardFooter>
                          <ActionButton href={`/services/providers/${p.provider_slug}`} variant="secondary">
                            View profile →
                          </ActionButton>
                        </CardFooter>
                      </Card>
                    );
                  })}
                </Grid>

                {filteredProviders.length === 0 ? (
                  <EmptyState message={q.trim() ? "No providers found for this search." : "No providers found in this group."} />
                ) : null}
              </>
            )}
          </div>
        </div>
      </Container>
    </main>
  );
}
