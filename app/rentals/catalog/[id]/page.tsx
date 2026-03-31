// app/rentals/catalog/[id]/page.tsx  (PUBLIC)
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { getSupabasePublicBrowser } from "@/lib/supabasePublicBrowser";

type Cat = {
  id: string;
  name: string;
  slug: string;
  sort_order: number | null;
  is_system_others: boolean | null;
};

type Sub = {
  id: string;
  name: string;
  slug: string;
  is_system_others: boolean | null;
  rental_categories?: Cat | Cat[] | null; // join
};

type Eq = {
  id: string;
  name: string;
  slug: string;
  sort_order: number | null;
  is_system_others: boolean | null;
  rental_subcategories?: Sub | Sub[] | null; // join
};

function firstOf<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  if (Array.isArray(v)) return (v[0] as T) ?? null;
  return v as T;
}

function MessageBox(props: { title: string; description?: string }) {
  return (
    <div
      style={{
        border: "1px solid rgba(0,0,0,0.08)",
        borderRadius: 12,
        padding: 16,
        background: "rgba(0,0,0,0.02)",
      }}
    >
      <div style={{ fontWeight: 800, marginBottom: 6 }}>{props.title}</div>
      {props.description ? <div style={{ opacity: 0.8, lineHeight: 1.5 }}>{props.description}</div> : null}
    </div>
  );
}

export default function RentalCatalogItemPage() {
  const params = useParams<{ id: string }>();
  const sp = useSearchParams();

  const id = params?.id;
  const catSlug = sp.get("cat") ?? "all";

  const supabase = useMemo(() => getSupabasePublicBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [row, setRow] = useState<Eq | null>(null);

  useEffect(() => {
    if (!id) return;

    async function load() {
      setLoading(true);
      setErr(null);

      // ✅ IMPORTANT:
      // rental_equipment DOES NOT have category_id
      // It links via rental_subcategories -> rental_categories
      const res = await supabase
        .from("rental_equipment")
        .select(
          `
          id,name,slug,sort_order,is_system_others,
          rental_subcategories (
            id,name,slug,is_system_others,
            rental_categories ( id,name,slug,sort_order,is_system_others )
          )
        `
        )
        .eq("id", id)
        .maybeSingle();

      if (res.error) {
        setErr(res.error.message);
        setRow(null);
        setLoading(false);
        return;
      }

      const x = res.data as any;
      if (!x || !x.id) {
        setErr("This catalog item was not found.");
        setRow(null);
        setLoading(false);
        return;
      }

      setRow(x as Eq);
      setLoading(false);
    }

    load();
  }, [id, supabase]);

  const sub = useMemo(() => (row ? firstOf<Sub>(row.rental_subcategories) : null), [row]);
  const cat = useMemo(() => (sub ? firstOf<Cat>(sub.rental_categories as any) : null), [sub]);

  return (
    <main style={{ padding: "26px 0 64px", background: "#fff" }}>
      <div style={{ width: "min(1120px, 92vw)", margin: "0 auto" }}>
        <div style={{ marginBottom: 12, fontSize: 14, opacity: 0.85 }}>
          <Link href="/" style={{ textDecoration: "underline", marginRight: 6 }}>
            Home
          </Link>
          <span style={{ marginRight: 6 }}>/</span>
          <Link href="/rentals" style={{ textDecoration: "underline", marginRight: 6 }}>
            Rentals
          </Link>
          <span style={{ marginRight: 6 }}>/</span>
          <Link href={`/rentals/catalog?cat=${encodeURIComponent(catSlug)}`} style={{ textDecoration: "underline" }}>
            Catalog
          </Link>
          <span style={{ margin: "0 6px" }}>/</span>
          <span style={{ opacity: 0.8 }}>Details</span>
        </div>

        <h1 style={{ margin: 0, fontSize: 34, letterSpacing: -0.2 }}>Rental Catalog Item</h1>

        <div style={{ marginTop: 10 }}>
          <Link href={`/rentals/catalog?cat=${encodeURIComponent(catSlug)}`} style={{ fontWeight: 900 }}>
            ← Back to Catalog
          </Link>
        </div>

        {err ? (
          <div style={{ marginTop: 14 }}>
            <MessageBox title="Could not load" description={err} />
          </div>
        ) : loading ? (
          <div style={{ marginTop: 14 }}>
            <MessageBox title="Loading..." description="Fetching rental catalog item..." />
          </div>
        ) : !row ? (
          <div style={{ marginTop: 14 }}>
            <MessageBox title="Not found" description="No data returned." />
          </div>
        ) : (
          <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14 }}>
            <div
              style={{
                border: "1px solid #eee",
                borderRadius: 16,
                padding: 16,
                boxShadow: "0 1px 0 rgba(0,0,0,0.02)",
              }}
            >
              <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 8 }}>{row.name}</div>

              <div style={{ fontSize: 14, color: "#555", lineHeight: 1.8 }}>
                <div>
                  <b>Category:</b> {cat?.name ?? "—"}
                </div>
                <div>
                  <b>Subcategory:</b> {sub?.name ?? "—"}
                </div>
                <div>
                  <b>Slug:</b> {row.slug ?? "—"}
                </div>
              </div>

              <div style={{ marginTop: 14, fontSize: 13, color: "#666" }}>
                This is the taxonomy item (equipment). Actual rental listings will be shown on the Rentals page.
              </div>
            </div>

            <div
              style={{
                border: "1px solid #eee",
                borderRadius: 16,
                padding: 16,
                boxShadow: "0 1px 0 rgba(0,0,0,0.02)",
              }}
            >
              <div style={{ fontWeight: 900, marginBottom: 10 }}>Actions</div>

              <div style={{ display: "grid", gap: 10 }}>
                <Link
                  href="/rentals"
                  style={{
                    display: "inline-flex",
                    justifyContent: "center",
                    borderRadius: 12,
                    padding: "10px 12px",
                    border: "1px solid #e1e1e1",
                    textDecoration: "none",
                    fontWeight: 800,
                  }}
                >
                  View Rentals →
                </Link>

                <Link
                  href={`/rentals/add?equipment=${encodeURIComponent(row.id)}`}
                  style={{
                    display: "inline-flex",
                    justifyContent: "center",
                    borderRadius: 12,
                    padding: "10px 12px",
                    border: "1px solid #111",
                    background: "#111",
                    color: "#fff",
                    textDecoration: "none",
                    fontWeight: 900,
                  }}
                >
                  Vendor: Add Listing
                </Link>
              </div>

              <div style={{ marginTop: 12, fontSize: 12, color: "#777" }}>
                Public view. No login required.
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
