// app/rentals/page.tsx  (PUBLIC - NO AUTH REQUIRED)
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Card, CardBody, CardFooter } from "@/components/ui/Card";
import { ActionButton } from "@/components/ui/ActionButton";
import { FilterBar, type FilterBarItem } from "@/components/ui/FilterBar";
import { Grid } from "@/components/ui/Grid";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

import SendEnquiryButton from "@/app/components/enquiry/SendEnquiryButton";
import JsonLd from "@/components/seo/JsonLd";
import { breadcrumbSchema } from "@/lib/seo/schema";

type Row = {
  id: string;

  status: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;

  title: string | null;
  description: string | null;

  pricing_unit: string | null;
  rate: number | null;
  rate_unit_label: string | null;
  security_deposit: number | null;

  country: string | null;
  state: string | null;
  district: string | null;
  city: string | null;
  locality: string | null;
  pincode: string | null;

  latitude?: number | null;
  longitude?: number | null;

  photos: any | null;

  category_id?: string | null;
  subcategory_id?: string | null;
  equipment_id?: string | null;

  other_category_text?: string | null;
  other_subcategory_text?: string | null;
  other_equipment_text?: string | null;

  vendor_user_id?: string | null;
};

type TaxonRow = {
  id: string;
  parent_id: string | null;
  kind: string;
  name: string;
  slug: string | null;
  sort_order: number | null;
  is_active: boolean | null;
};

function norm(v: unknown) {
  return String(v ?? "").trim().toLowerCase();
}

function money(v: number | null | undefined) {
  if (typeof v !== "number") return "₹ —";
  return `₹ ${v}`;
}

function fmtRate(rate: number | null, pricingUnit: string | null, rateUnitLabel?: string | null) {
  if (rate == null) return "Rate: —";
  const unit = rateUnitLabel || pricingUnit || "";
  return `Rate: ${money(rate)}${unit ? `/${unit}` : ""}`;
}

function firstPhotoUrl(photos: any): string | null {
  if (!photos) return null;

  if (Array.isArray(photos)) {
    const first = photos[0];
    if (!first) return null;
    if (typeof first === "string") return first;
    if (typeof first === "object") {
      const u = (first as any).url ?? (first as any).src ?? null;
      return u ? String(u) : null;
    }
    return null;
  }

  if (typeof photos === "object") {
    const u = (photos as any).url ?? (photos as any).src ?? null;
    return u ? String(u) : null;
  }

  return null;
}

function compactText(parts: Array<string | null | undefined>) {
  return parts.map((p) => String(p ?? "").trim()).filter(Boolean).join(", ");
}

function openRentalPriceToday(input: {
  equipmentName: string;
  categoryName: string;
  subcategoryName: string;
  title: string;
  city: string | null;
  locality: string | null;
}) {
  const q =
    input.equipmentName ||
    input.subcategoryName ||
    input.categoryName ||
    input.title ||
    "Rental";

  try {
    window.localStorage.setItem(
      "3bigha_price_today_prefill",
      JSON.stringify({
        source: "rentals",
        q,
        category: input.categoryName,
        subcategory: input.subcategoryName,
        productGroup: input.equipmentName || q,
        type: "Rentals",
        title: input.title,
        localName: compactText([input.locality, input.city]),
        createdAt: new Date().toISOString(),
      })
    );
  } catch {}

  window.location.href = `/price-today?type=Rentals&q=${encodeURIComponent(q)}`;
}

function buildRentalAiDescription(input: {
  title: string;
  description: string | null;
  equipmentName: string;
  subcategoryName: string;
  categoryName: string;
  rate: number | null;
  pricingUnit: string | null;
  rateUnitLabel: string | null;
  city: string | null;
  locality: string | null;
}) {
  const equipment = input.equipmentName || input.title || "this rental equipment";
  const group = compactText([input.subcategoryName, input.categoryName]);
  const place = compactText([input.locality, input.city]);
  const rateLine = input.rate != null ? fmtRate(input.rate, input.pricingUnit, input.rateUnitLabel).replace("Rate: ", "") : "";

  return [
    `AI Description: ${equipment} available on rent${group ? ` under ${group}` : ""}.`,
    rateLine ? `Estimated rental rate is ${rateLine}.` : "",
    place ? `Suitable for local requirements around ${place}.` : "",
    `Send enquiry to confirm availability, final rent, deposit and delivery terms.`,
  ]
    .filter(Boolean)
    .join(" ");
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
        } catch {}
      }
    }
  } catch {}
}

export const dynamic = "force-dynamic";

export default function RentalsPublicPage() {
  const supabaseAnon = useMemo(() => {
    if (typeof window === "undefined") return null;
    return createAnonSupabase();
  }, []);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);

  const [taxLoading, setTaxLoading] = useState(true);
  const [taxErr, setTaxErr] = useState<string | null>(null);
  const [types, setTypes] = useState<TaxonRow[]>([]);
  const [taxonById, setTaxonById] = useState<Map<string, TaxonRow>>(new Map());

  const [typeId, setTypeId] = useState<string>("all");
  const [q, setQ] = useState("");
  const [city, setCity] = useState<string>("all");

  useEffect(() => {
    safeClearExpiredSupabaseSessions();
  }, []);

  async function loadTypesOnce() {
    setTaxLoading(true);
    setTaxErr(null);

    if (!supabaseAnon) {
      throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
    }

    const { data, error } = await (supabaseAnon as any)
      .from("rental_taxons")
      .select("id,parent_id,kind,name,slug,sort_order,is_active")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true })
      .range(0, 9999);

    if (error) throw new Error(error.message);

    const all = ((data as any) ?? []) as TaxonRow[];
    const m = new Map<string, TaxonRow>();
    for (const t of all) m.set(t.id, t);

    const topTypes = all.filter((t) => norm(t.kind) === "type");
    topTypes.sort((a, b) => {
      const ao = a.sort_order ?? 999999;
      const bo = b.sort_order ?? 999999;
      if (ao !== bo) return ao - bo;
      return a.name.localeCompare(b.name);
    });

    setTaxonById(m);
    setTypes(topTypes);
    setTaxLoading(false);
  }

  function findTypeIdFromAnyTaxonId(startId: string | null | undefined): string | null {
    if (!startId) return null;
    let cur: string | null | undefined = startId;
    let guard = 0;

    while (cur && guard++ < 12) {
      const t = taxonById.get(cur);
      if (!t) return null;
      if (norm(t.kind) === "type") return t.id;
      cur = t.parent_id ?? null;
    }
    return null;
  }

  async function loadPublicListingsOnce() {
    setLoading(true);
    setErr(null);

    if (!supabaseAnon) {
      throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
    }

    const { data, error } = await supabaseAnon
      .from("rental_listings_public")
      .select(
        [
          "id",
          "status",
          "is_active",
          "created_at",
          "updated_at",
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
          "pincode",
          "latitude",
          "longitude",
          "photos",
          "category_id",
          "subcategory_id",
          "equipment_id",
          "other_category_text",
          "other_subcategory_text",
          "other_equipment_text",
        ].join(",")
      )
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(400);

    if (error) throw new Error(error.message);

    const publicRows = ((data ?? []) as unknown) as Row[];

    const ids = publicRows.map((r) => String(r.id)).filter(Boolean);

    let vendorMap = new Map<string, string | null>();

    if (ids.length > 0) {
      try {
        const vendorRes = await supabaseAnon
          .from("rental_listings")
          .select("id,vendor_user_id")
          .in("id", ids);

        if (!vendorRes.error && Array.isArray(vendorRes.data)) {
          vendorMap = new Map(
            vendorRes.data.map((x: any) => [
              String(x.id),
              x.vendor_user_id == null ? null : String(x.vendor_user_id),
            ])
          );
        }
      } catch {
        vendorMap = new Map();
      }
    }

    const mergedRows: Row[] = publicRows.map((r) => ({
      ...r,
      vendor_user_id: vendorMap.get(String(r.id)) ?? null,
    }));

    setRows(mergedRows);
    setLoading(false);
  }

  useEffect(() => {
    if (!supabaseAnon) {
      setLoading(false);
      setTaxLoading(false);
      setErr("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
      setTaxErr("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
      return;
    }

    let alive = true;

    (async () => {
      try {
        await loadTypesOnce();
      } catch (e: any) {
        const msg = String(e?.message || "");
        if (msg.toLowerCase().includes("jwt expired")) {
          safeClearExpiredSupabaseSessions();
          try {
            await loadTypesOnce();
          } catch (e2: any) {
            if (!alive) return;
            setTaxErr(String(e2?.message || "Failed to load rental types."));
            setTypes([]);
            setTaxonById(new Map());
            setTaxLoading(false);
          }
        } else {
          if (!alive) return;
          setTaxErr(msg || "Failed to load rental types.");
          setTypes([]);
          setTaxonById(new Map());
          setTaxLoading(false);
        }
      }

      try {
        await loadPublicListingsOnce();
      } catch (e: any) {
        const msg = String(e?.message || "");
        if (msg.toLowerCase().includes("jwt expired")) {
          safeClearExpiredSupabaseSessions();
          try {
            await loadPublicListingsOnce();
          } catch (e2: any) {
            if (!alive) return;
            setErr(String(e2?.message || "Failed to load rentals."));
            setRows([]);
            setLoading(false);
          }
        } else {
          if (!alive) return;
          setErr(msg || "Failed to load rentals.");
          setRows([]);
          setLoading(false);
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [supabaseAnon]);

  const typeItems: FilterBarItem[] = useMemo(() => {
    const items: FilterBarItem[] = [{ key: "all", label: "All" }];
    for (const t of types) items.push({ key: t.id, label: t.name });
    return items;
  }, [types]);

  const cities = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) if (r.city) set.add(String(r.city));
    return ["all", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [rows]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();

    return rows
      .filter((r) => {
        if (typeId === "all") return true;
        const t =
          findTypeIdFromAnyTaxonId(r.category_id) ||
          findTypeIdFromAnyTaxonId(r.subcategory_id) ||
          findTypeIdFromAnyTaxonId(r.equipment_id);
        return !!t && t === typeId;
      })
      .filter((r) => {
        if (city === "all") return true;
        return String(r.city ?? "") === city;
      })
      .filter((r) => {
        if (!query) return true;

        const loc = [r.locality, r.city, r.district, r.state, r.country, r.pincode].filter(Boolean).join(", ");

        const hay = [
          r.title ?? "",
          r.description ?? "",
          loc,
          r.pricing_unit ?? "",
          r.rate_unit_label ?? "",
          r.other_category_text ?? "",
          r.other_subcategory_text ?? "",
          r.other_equipment_text ?? "",
        ]
          .join(" ")
          .toLowerCase();

        return hay.includes(query);
      });
  }, [rows, q, city, typeId, taxonById]);

  return (
    <main>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", url: "https://www.3bigha.com" },
          { name: "Rentals", url: "https://www.3bigha.com/rentals" },
        ])}
      />

      <Container>
        <SectionHeader title="Rentals" subtitle="Browse equipment & services available on rent (public listings)." />

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
          <ActionButton variant="secondary" href="/rentals/my">
            My Rentals →
          </ActionButton>

          <ActionButton variant="primary" href="/rentals/add">
            + List your equipment
          </ActionButton>
        </div>

        <div style={{ marginTop: 18 }}>
          <SectionHeader title="Public Listings" subtitle="Filter by rental type, city and search across title, location and description." />

          <div style={{ marginTop: 12 }}>
            {taxLoading ? (
              <EmptyState message="Loading rental types…" />
            ) : taxErr ? (
              <EmptyState message={`Rental type load failed: ${taxErr}`} />
            ) : (
              <FilterBar
                items={typeItems}
                activeKey={typeId}
                onChange={(k) => {
                  setTypeId(String(k));
                  setQ("");
                }}
                ariaLabel="Rental types"
              />
            )}
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
            <div style={{ flex: "1 1 560px", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                style={{
                  height: 40,
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,0.12)",
                  padding: "0 10px",
                  background: "white",
                  fontWeight: 700,
                }}
              >
                {cities.map((c) => (
                  <option key={c} value={c}>
                    {c === "all" ? "All cities" : c}
                  </option>
                ))}
              </select>

              <Badge>Total: {filtered.length}</Badge>
            </div>

            <div style={{ flex: "0 1 320px", display: "flex", justifyContent: "flex-end" }}>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search rentals…"
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
            {err ? (
              <EmptyState message={`Rental load failed: ${err}`} />
            ) : loading ? (
              <EmptyState message="Loading rentals…" />
            ) : filtered.length === 0 ? (
              <div style={{ opacity: 0.8 }}>
                No rentals found. If you are a vendor, create one from{" "}
                <Link href="/rentals/add" style={{ fontWeight: 800 }}>
                  /rentals/add
                </Link>
                .
              </div>
            ) : (
              <Grid>
                {filtered.map((r: Row) => {
                  const loc = [r.locality, r.city, r.district, r.state, r.country, r.pincode].filter(Boolean).join(", ");
                  const cover = firstPhotoUrl(r.photos);
                  const title = (r.title ?? "").trim() || "Rental listing";

                  const categoryName =
                    r.other_category_text?.trim() ||
                    (r.category_id ? taxonById.get(r.category_id)?.name ?? "" : "");

                  const subcategoryName =
                    r.other_subcategory_text?.trim() ||
                    (r.subcategory_id ? taxonById.get(r.subcategory_id)?.name ?? "" : "");

                  const equipmentName =
                    r.other_equipment_text?.trim() ||
                    (r.equipment_id ? taxonById.get(r.equipment_id)?.name ?? "" : "");

                  const aiDescription = buildRentalAiDescription({
                    title,
                    description: r.description,
                    equipmentName,
                    subcategoryName,
                    categoryName,
                    rate: r.rate,
                    pricingUnit: r.pricing_unit,
                    rateUnitLabel: r.rate_unit_label,
                    city: r.city,
                    locality: r.locality,
                  });

                  const priceText = r.rate != null ? fmtRate(r.rate, r.pricing_unit, r.rate_unit_label) : "";

                  const hasRate = r.rate != null && Number(r.rate) > 0;
                  const hasDeposit = r.security_deposit != null && Number(r.security_deposit) > 0;
                  const isHotRentalLead = hasRate && Boolean(r.city || r.locality);

                  return (
                    <Card key={r.id}>
                      <CardBody>
                        {cover ? (
                          <div style={{ marginBottom: 12 }}>
                            <img
                              src={cover}
                              alt={title}
                              style={{
                                width: "100%",
                                height: 180,
                                objectFit: "cover",
                                borderRadius: 12,
                                border: "1px solid rgba(0,0,0,0.08)",
                              }}
                            />
                          </div>
                        ) : null}

                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                          <h3 style={{ margin: 0, lineHeight: 1.2 }}>{title}</h3>
                          <Badge>{String(r.status ?? "published").toLowerCase()}</Badge>
                        </div>

                        <p style={{ margin: "10px 0 0", color: "#5b6472" }}>
                          {aiDescription}
                        </p>

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
                          {r.pricing_unit ? <span>Unit: {r.pricing_unit}</span> : null}
                          {r.rate != null ? <span>{fmtRate(r.rate, r.pricing_unit, r.rate_unit_label)}</span> : null}
                          {loc ? <span>Location: {loc}</span> : null}
                          {r.security_deposit != null ? <span>Deposit: {money(r.security_deposit)}</span> : null}
                        </div>

                        <div
                          style={{
                            marginTop: 12,
                            border: "1px solid rgba(16,185,129,0.22)",
                            background: "rgba(236,253,245,0.75)",
                            borderRadius: 14,
                            padding: 12,
                          }}
                        >
                          <div style={{ fontSize: 12, fontWeight: 900, color: "#047857" }}>
                            🧠 Rental AI Signal
                          </div>
                          <div style={{ marginTop: 4, fontSize: 12, fontWeight: 700, color: "#065f46", lineHeight: 1.5 }}>
                            {isHotRentalLead
                              ? "Hot rental lead: rate and location are available. Buyer can quickly confirm availability, operator, deposit and delivery."
                              : "Compare rental rate, location and terms before sending enquiry."}
                          </div>
                        </div>

                        <div style={{ marginTop: 12 }}>
                          <SendEnquiryButton
                            module="rental"
                            refId={String(r.id)}
                            title={title}
                            priceText={priceText}
                            vendorUserId={r.vendor_user_id ?? null}
                            nextUrl={`/rentals/${encodeURIComponent(String(r.id))}`}
                            buttonLabel="Send Enquiry"
                          />
                        </div>
                      </CardBody>

                      <CardFooter>
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                          <ActionButton href={`/rentals/${r.id}`} variant="secondary">
                            View details →
                          </ActionButton>

                          <button
                            type="button"
                            onClick={() =>
                              openRentalPriceToday({
                                equipmentName,
                                categoryName,
                                subcategoryName,
                                title,
                                city: r.city,
                                locality: r.locality,
                              })
                            }
                            style={{
                              border: "1px solid rgba(16,185,129,0.35)",
                              background: "#ecfdf5",
                              color: "#047857",
                              borderRadius: 12,
                              padding: "10px 12px",
                              fontWeight: 900,
                              cursor: "pointer",
                            }}
                          >
                            📊 Compare Rent Today
                          </button>
                        </div>
                      </CardFooter>
                    </Card>
                  );
                })}
              </Grid>
            )}
          </div>
        </div>
      </Container>
    </main>
  );
}