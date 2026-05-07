// app/materials/[id]/page.tsx
import Link from "next/link";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import { createServerClient } from "@supabase/ssr";

import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Card, CardBody, CardFooter } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

import SendEnquiryButton from "@/app/components/enquiry/SendEnquiryButton";
import JsonLd from "@/components/seo/JsonLd";
import { breadcrumbSchema } from "@/lib/seo/schema";
import { createMetadata } from "@/lib/seo/metadata";
import { siteConfig } from "@/lib/seo/site";

type AnyRow = Record<string, any>;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isBadId(v?: string | null) {
  const s = String(v ?? "").trim();
  return !s || s === "id" || s === "[id]" || s === "<id>" || !UUID_RE.test(s);
}

function getSupabaseServer() {
  const cookieStore = cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createServerClient(url, anon, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set() {},
      remove() {},
    },
  });
}

function safeText(x: any) {
  return String(x ?? "").trim();
}

function fmtDate(iso: any) {
  const s = safeText(iso);
  if (!s) return "—";
  try {
    return new Date(s).toLocaleString();
  } catch {
    return s.replace("T", " ").replace("Z", " UTC");
  }
}

function getAttr(obj: any, keys: string[]) {
  if (!obj || typeof obj !== "object") return null;
  for (const k of keys) {
    if (obj[k] != null) return obj[k];
  }
  return null;
}

function moneyINR(v: any) {
  const num = typeof v === "number" ? v : v != null && String(v).trim() !== "" ? Number(v) : NaN;
  if (!Number.isFinite(num)) return "₹ —";
  try {
    return `₹ ${Math.round(num).toLocaleString("en-IN")}`;
  } catch {
    return `₹ ${num}`;
  }
}

function isPublicRow(r: AnyRow) {
  return r?.is_public === true && r?.is_active === true;
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const id = decodeURIComponent(params.id || "");

  if (isBadId(id)) {
    return createMetadata({
      title: "Material Listing Not Found",
      description: "This material listing is not available on 3bigha.com.",
      path: `/materials/${encodeURIComponent(id)}`,
      noIndex: true,
    });
  }

  const supabase = getSupabaseServer();

  const res = await supabase
    .from("material_listings")
    .select("id,title,local_name,description")
    .eq("id", id)
    .maybeSingle();

  const row = (res.data ?? null) as AnyRow | null;

  if (!row) {
    return createMetadata({
      title: "Material Listing Not Found",
      description: "This material listing could not be found on 3bigha.com.",
      path: `/materials/${encodeURIComponent(id)}`,
      noIndex: true,
    });
  }

  const title = safeText(row?.title) || safeText(row?.local_name) || "Building Material";
  const desc = safeText(row?.description);

  return createMetadata({
    title,
    description:
      desc.slice(0, 155) ||
      `Explore ${title} on 3bigha.com. Compare building material vendors, price, availability and quality.`,
    path: `/materials/${encodeURIComponent(id)}`,
    image: "/og-image-new.jpg",
    keywords: [
      title,
      "building material",
      "construction material",
      "material supplier",
      "cement",
      "steel",
      "sand",
      "bricks",
      "3bigha materials",
    ],
  });
}

export default async function MaterialPublicDetailPage({ params }: { params: { id: string } }) {
  const id = decodeURIComponent(params.id || "");

  if (isBadId(id)) {
    return (
      <Container>
        <SectionHeader title="Material" subtitle="Not available" />
        <EmptyState message="Invalid material id in URL." />
        <div style={{ marginTop: 12 }}>
          <Link href="/materials" className="topBtn topBtnGhost" style={{ textDecoration: "none" }}>
            ← Back to Materials
          </Link>
        </div>
      </Container>
    );
  }

  const supabase = getSupabaseServer();

  const { data: userRes } = await supabase.auth.getUser();
  const viewerId = userRes?.user?.id ?? null;

  const selectCols = [
    "id",
    "vendor_user_id",
    "product_group_id",
    "title",
    "local_name",
    "sku",
    "description",
    "packaging_unit",
    "attributes",
    "is_public",
    "is_active",
    "status",
    "created_at",
    "updated_at",
    "published_at",
  ].join(",");

  const res = await supabase.from("material_listings").select(selectCols).eq("id", id).maybeSingle();
  const row = (res.data ?? null) as AnyRow | null;

  if (res.error || !row) {
    return (
      <Container>
        <SectionHeader title="Material" subtitle="Not available" />
        <EmptyState message={res.error?.message || "Not found."} />
        <div style={{ marginTop: 12 }}>
          <Link href="/materials" className="topBtn topBtnGhost" style={{ textDecoration: "none" }}>
            ← Back to Materials
          </Link>
        </div>
      </Container>
    );
  }

  const publicOk = isPublicRow(row);
  const isOwner = !!viewerId && String(row.vendor_user_id) === String(viewerId);
  const isOwnerPreview = isOwner && !publicOk;

  if (!publicOk && !isOwner) {
    return (
      <Container>
        <SectionHeader title="Material" subtitle="Not available" />
        <EmptyState message="This listing is not public." />
        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/materials" className="topBtn topBtnGhost" style={{ textDecoration: "none" }}>
            ← Back to Materials
          </Link>
          <Link href={`/login?next=${encodeURIComponent(`/materials/${id}`)}`} className="topBtn topBtnGhost" style={{ textDecoration: "none" }}>
            Login →
          </Link>
        </div>
      </Container>
    );
  }

  let media: AnyRow[] = [];
  try {
    const mRes = await supabase
      .from("material_media")
      .select("id, material_id, media_type, url, caption, sort_order")
      .eq("material_id", id)
      .order("sort_order", { ascending: true });
    if (!mRes.error) media = (mRes.data ?? []) as AnyRow[];
  } catch {
    media = [];
  }

  const title = safeText(row.title) || safeText(row.local_name) || "Untitled material";
  const brand = getAttr(row.attributes, ["brand", "brand_name", "make"]);
  const price = getAttr(row.attributes, ["price", "unit_price", "mrp", "rate"]);
  const uom = getAttr(row.attributes, ["uom", "unit"]);

  const priceLine = `${moneyINR(price)}${row.packaging_unit ? ` / ${String(row.packaging_unit)}` : uom ? ` / ${String(uom)}` : ""}`;

  const canonicalUrl = `${siteConfig.url}/materials/${encodeURIComponent(id)}`;

  const materialSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: title,
    description:
      safeText(row.description) ||
      `Building material listing on 3bigha.com.`,
    url: canonicalUrl,
    category: "Building Materials",
    sku: safeText(row.sku) || undefined,
    brand: brand
      ? {
          "@type": "Brand",
          name: String(brand),
        }
      : undefined,
    offers:
      price && Number.isFinite(Number(price))
        ? {
            "@type": "Offer",
            priceCurrency: "INR",
            price: Number(price),
            availability: "https://schema.org/InStock",
            url: canonicalUrl,
          }
        : undefined,
  };

  return (
    <Container>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: "Home", url: siteConfig.url },
            { name: "Materials", url: `${siteConfig.url}/materials` },
            { name: title, url: canonicalUrl },
          ]),
          materialSchema,
        ]}
      />

      <SectionHeader title={title} subtitle="Material details" />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12, alignItems: "center" }}>
        <Link href="/materials" className="topBtn topBtnGhost" style={{ textDecoration: "none" }}>
          ← Back
        </Link>

        <Badge>{row.status ?? "—"}</Badge>
        {row.updated_at ? <Badge>Updated: {fmtDate(row.updated_at)}</Badge> : null}
        {row.published_at ? <Badge>Published: {fmtDate(row.published_at)}</Badge> : null}
        {isOwnerPreview ? <Badge>Owner preview (not public)</Badge> : null}
      </div>

      <div className="matGrid" style={{ display: "grid", gap: 14, gridTemplateColumns: "2fr 1fr", alignItems: "start" }}>
        <div style={{ display: "grid", gap: 14 }}>
          <Card>
            <CardBody>
              {media.length ? (
                <div className="matMediaGrid" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
                  {media.slice(0, 9).map((m) => {
                    const url = String(m?.url ?? "").trim();
                    const t = String(m?.media_type ?? "").trim().toLowerCase();
                    const caption = String(m?.caption ?? title);
                    if (!url) return null;

                    return (
                      <a key={String(m.id)} href={url} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                        <div style={{ borderRadius: 14, border: "1px solid rgba(0,0,0,0.10)", overflow: "hidden", background: "rgba(0,0,0,0.02)" }}>
                          {t === "video" ? (
                            <video src={url} controls playsInline style={{ width: "100%", height: 190, objectFit: "cover", display: "block" }} />
                          ) : (
                            <img src={url} alt={caption} style={{ width: "100%", height: 190, objectFit: "cover", display: "block" }} />
                          )}
                        </div>
                      </a>
                    );
                  })}
                </div>
              ) : (
                <div style={{ padding: 14, borderRadius: 14, border: "1px dashed rgba(0,0,0,0.20)", color: "#5b6472", fontWeight: 800 }}>
                  No photos / videos added yet.
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <div style={{ display: "grid", gap: 8, fontSize: 13, color: "#5b6472" }}>
                <div>
                  <b>Brand:</b> {brand ? String(brand) : "—"}
                </div>
                <div>
                  <b>SKU:</b> {row.sku ?? "—"}
                </div>
                <div>
                  <b>Price:</b> {priceLine}
                </div>
                <div>
                  <b>Visibility:</b> {row.is_public ? "Public" : "Private"} / {row.is_active ? "Active" : "Inactive"}
                </div>
                <div>
                  <b>Created:</b> {fmtDate(row.created_at)}
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                {row.description ? (
                  <div style={{ lineHeight: 1.6, opacity: 0.9, whiteSpace: "pre-wrap" }}>{row.description}</div>
                ) : (
                  <div style={{ opacity: 0.75 }}>No description provided.</div>
                )}
              </div>

              <div style={{ marginTop: 12, opacity: 0.7, fontSize: 12 }}>
                Listing ID:{" "}
                <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
                  {row.id}
                </span>
              </div>
            </CardBody>

            <CardFooter>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link href="/materials" className="topBtn topBtnGhost" style={{ textDecoration: "none" }}>
                  Browse more →
                </Link>
                <Link href="/materials/my" className="topBtn topBtnGhost" style={{ textDecoration: "none" }}>
                  My Materials →
                </Link>
              </div>
            </CardFooter>
          </Card>
        </div>

        <div style={{ display: "grid", gap: 14, position: "sticky", top: 92 }}>
          <Card>
            <CardBody>

              <div style={{ fontWeight: 950, marginBottom: 8 }}>
                Send Enquiry
              </div>

              {!row.vendor_user_id && (
                <div style={{ fontSize:12, opacity:.6, marginBottom:8 }}>
                  Vendor account not linked to this listing.
                </div>
              )}

              <SendEnquiryButton
                module="material"
                refId={String(row.id)}
                title={title}
                priceText={priceLine}
                vendorUserId={row.vendor_user_id ?? null}
                nextUrl={`/materials/${encodeURIComponent(id)}`}
              />

            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <div style={{ fontWeight: 900, marginBottom: 8 }}>Quick Actions</div>
              <div style={{ display: "grid", gap: 10 }}>
                <Link href="/materials/add" className="topBtn topBtnPrimary" style={{ textDecoration: "none" }}>
                  + Add Material Listing
                </Link>
                <Link href="/materials/my" className="topBtn topBtnGhost" style={{ textDecoration: "none" }}>
                  View My Listings →
                </Link>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      <style>{`
        @media (max-width: 980px){
          .matGrid{ grid-template-columns: 1fr !important; }
          .matMediaGrid{ grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 560px){
          .matMediaGrid{ grid-template-columns: 1fr !important; }
        }
      `}</style>
    </Container>
  );
}