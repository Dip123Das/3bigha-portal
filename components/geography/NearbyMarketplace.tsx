"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Props = {
  latitude: number;
  longitude: number;
  radiusKm?: number;
  limit?: number;
  title?: string;
};

type NearbyResponse = {
  summary?: Record<string, number>;
  places?: any[];
  vendors?: any[];
  property?: any[];
  materials?: any[];
  services?: any[];
  rentals?: any[];
  errors?: Record<string, string>;
};

function itemTitle(item: any) {
  return item?.title || item?.business_name || item?.name || item?.provider_name || item?.owner_name || "Nearby item";
}

function distance(item: any) {
  const d = Number(item?.distanceKm);
  if (!Number.isFinite(d)) return "";
  return `${d.toFixed(d < 10 ? 1 : 0)} km`;
}

function Section({ title, items, hrefBase }: { title: string; items?: any[]; hrefBase?: string }) {
  const rows = Array.isArray(items) ? items.slice(0, 4) : [];

  return (
    <div style={{ padding: 12, borderRadius: 14, background: "#fff", border: "1px solid #e5e7eb" }}>
      <div style={{ fontWeight: 950, marginBottom: 8 }}>{title}</div>

      {rows.length ? (
        <div style={{ display: "grid", gap: 8 }}>
          {rows.map((item, index) => {
            const slugOrId = item?.slug || item?.id || item?.user_id;
            const href = hrefBase && slugOrId ? `${hrefBase}/${encodeURIComponent(slugOrId)}` : null;

            const content = (
              <>
                <div style={{ fontWeight: 800, fontSize: 13 }}>{itemTitle(item)}</div>
                <div style={{ fontSize: 12, opacity: 0.72 }}>
                  {[item?.locality, item?.city, item?.district, distance(item)].filter(Boolean).join(" · ")}
                </div>
              </>
            );

            return href ? (
              <Link key={index} href={href} style={{ textDecoration: "none", color: "inherit" }}>
                {content}
              </Link>
            ) : (
              <div key={index}>{content}</div>
            );
          })}
        </div>
      ) : (
        <div style={{ fontSize: 12, opacity: 0.65 }}>No nearby results yet.</div>
      )}
    </div>
  );
}

export default function NearbyMarketplace({
  latitude,
  longitude,
  radiusKm = 25,
  limit = 5,
  title = "Around this location",
}: Props) {
  const [data, setData] = useState<NearbyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function run() {
      setLoading(true);
      setErr(null);

      try {
        const params = new URLSearchParams({
          lat: String(latitude),
          lng: String(longitude),
          radiusKm: String(radiusKm),
          limit: String(limit),
        });

        const res = await fetch(`/api/nearby/all?${params.toString()}`, { cache: "no-store" });
        const json = await res.json();

        if (!res.ok) throw new Error(json?.error || "Nearby marketplace failed.");

        if (alive) setData(json);
      } catch (e: any) {
        if (alive) setErr(String(e?.message || "Nearby marketplace failed."));
      } finally {
        if (alive) setLoading(false);
      }
    }

    run();

    return () => {
      alive = false;
    };
  }, [latitude, longitude, radiusKm, limit]);

  return (
    <div style={{ marginTop: 18, padding: 16, borderRadius: 20, background: "#f8fafc", border: "1px solid #dbeafe" }}>
      <div style={{ fontWeight: 950, fontSize: 18, color: "#1e3a8a" }}>🏡 {title}</div>
      <div style={{ marginTop: 4, fontSize: 12, color: "#475569", fontWeight: 700 }}>
        Nearby marketplace intelligence within {radiusKm} km.
      </div>

      {loading ? (
        <div style={{ marginTop: 12, fontSize: 13, opacity: 0.7 }}>Loading nearby marketplace…</div>
      ) : err ? (
        <div style={{ marginTop: 12, fontSize: 13, color: "#b91c1c" }}>{err}</div>
      ) : (
        <>
          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {Object.entries(data?.summary || {}).map(([k, v]) => (
              <span key={k} style={{ padding: "6px 10px", borderRadius: 999, background: "#eff6ff", fontSize: 12, fontWeight: 900 }}>
                {k}: {v}
              </span>
            ))}
          </div>

          <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
            <Section title="📍 Nearby Places" items={data?.places} />
            <Section title="🏢 Nearby Vendors" items={data?.vendors} hrefBase="/vendor" />
            <Section title="🏠 Nearby Properties" items={data?.property} hrefBase="/property" />
            <Section title="🏗 Nearby Materials" items={data?.materials} hrefBase="/materials" />
            <Section title="👷 Nearby Services" items={data?.services} hrefBase="/services" />
            <Section title="🚜 Nearby Rentals" items={data?.rentals} hrefBase="/rentals" />
          </div>
        </>
      )}
    </div>
  );
}
