"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

type CategoryKey = "Materials" | "Services" | "Rentals" | "Properties";
type TrendValue = "Up" | "Down" | "Stable";

type ItemOption = {
  label: string;
  source: string;
};

type PriceRow = {
  id?: string;
  category: CategoryKey;
  item: string;
  brand: string;
  grade: string;
  price: string;
  priceMin: number;
  priceMax: number;
  unit: string;
  trend: TrendValue;
  location?: string;
  offer?: string;
  offerPeriod?: string;
  sourceType?: string;
  trustLabel?: string;
  trustScore?: number;
  verified?: boolean;
  createdAt?: string | null;
  userId?: string | null;
};

type AggregatedPriceRow = PriceRow & {
  vendorCount: number;
  avgPrice: number;
  confidence: number;
  changePercent: number | null;
  trend: TrendValue;
};

const locations = [
  "Cooch Behar",
  "Siliguri",
  "Jalpaiguri",
  "Alipurduar",
  "Kolkata",
];

const categoryOptions: { label: CategoryKey; href: string }[] = [
  { label: "Materials", href: "/materials" },
  { label: "Services", href: "/services" },
  { label: "Rentals", href: "/rentals" },
  { label: "Properties", href: "/property" },
];

const fallbackItems: Record<CategoryKey, ItemOption[]> = {
  Materials: [
    { label: "Cement", source: "Fallback" },
    { label: "Steel Rod", source: "Fallback" },
    { label: "Sand", source: "Fallback" },
    { label: "Brick", source: "Fallback" },
    { label: "Aggregate", source: "Fallback" },
  ],
  Services: [
    { label: "Mason", source: "Fallback" },
    { label: "Plumber", source: "Fallback" },
    { label: "Electrician", source: "Fallback" },
    { label: "Painter", source: "Fallback" },
  ],
  Rentals: [
    { label: "JCB Rental", source: "Fallback" },
    { label: "Tractor Rental", source: "Fallback" },
    { label: "Mixer Machine Rental", source: "Fallback" },
  ],
  Properties: [
    { label: "Land", source: "Fallback" },
    { label: "Flat", source: "Fallback" },
    { label: "Shop", source: "Fallback" },
    { label: "Office", source: "Fallback" },
  ],
};

const fallbackPriceRows: PriceRow[] = [
  {
    category: "Materials",
    item: "Cement",
    brand: "UltraTech",
    grade: "OPC 53",
    price: "₹410 - ₹435",
    priceMin: 410,
    priceMax: 435,
    unit: "bag",
    trend: "Stable",
    location: "Cooch Behar",
    offer: "Bulk order discount available",
    offerPeriod: "26 April 2026 - 31 May 2026",
    sourceType: "Distributor",
  },
  {
    category: "Materials",
    item: "Cement",
    brand: "Ambuja",
    grade: "PPC",
    price: "₹390 - ₹420",
    priceMin: 390,
    priceMax: 420,
    unit: "bag",
    trend: "Down",
    location: "Cooch Behar",
    offer: "Dealer offer available",
    offerPeriod: "26 April 2026 - 15 May 2026",
    sourceType: "Vendor",
  },
  {
    category: "Materials",
    item: "Steel Rod",
    brand: "Tata Tiscon",
    grade: "Fe 500D",
    price: "₹60 - ₹66",
    priceMin: 60,
    priceMax: 66,
    unit: "kg",
    trend: "Up",
    location: "Cooch Behar",
    sourceType: "Distributor",
  },
  {
    category: "Materials",
    item: "Sand",
    brand: "Local Supplier",
    grade: "Medium River Sand",
    price: "₹3,200 - ₹4,200",
    priceMin: 3200,
    priceMax: 4200,
    unit: "tractor",
    trend: "Down",
    location: "Cooch Behar",
    sourceType: "Local Vendor",
  },
  {
    category: "Properties",
    item: "Land",
    brand: "Local Market",
    grade: "Residential",
    price: "₹8L - ₹13L",
    priceMin: 800000,
    priceMax: 1300000,
    unit: "katha",
    trend: "Up",
    location: "Cooch Behar",
    sourceType: "Market Trend",
  },
  {
    category: "Properties",
    item: "Flat",
    brand: "Local Market",
    grade: "Residential Apartment",
    price: "₹2,800 - ₹4,500",
    priceMin: 2800,
    priceMax: 4500,
    unit: "sq.ft.",
    trend: "Stable",
    location: "Cooch Behar",
    sourceType: "Market Trend",
  },
];

const mainMaterials = [
  {
    name: "Cement",
    price: "₹390 - ₹435 / bag",
    trend: "Stable",
    icon: "🏗️",
    vendorCount: 1,
  },
  {
    name: "Steel Rod",
    price: "₹58 - ₹66 / kg",
    trend: "Up",
    icon: "🔩",
    vendorCount: 1,
  },
  {
    name: "Sand",
    price: "₹3,200 - ₹4,200 / tractor",
    trend: "Down",
    icon: "🏖️",
    vendorCount: 1,
  },
  {
    name: "Brick",
    price: "₹9 - ₹12 / piece",
    trend: "Stable",
    icon: "🧱",
    vendorCount: 1,
  },
];

const propertyPrices = [
  {
    name: "Land",
    price: "₹8L - ₹13L / katha",
    trend: "Up",
    icon: "🌾",
    vendorCount: 1,
  },
  {
    name: "Flat",
    price: "₹2,800 - ₹4,500 / sq.ft.",
    trend: "Stable",
    icon: "🏢",
    vendorCount: 1,
  },
  {
    name: "Shop",
    price: "₹6,000 - ₹12,000 / sq.ft.",
    trend: "Up",
    icon: "🏬",
    vendorCount: 1,
  },
  {
    name: "Office",
    price: "₹4,000 - ₹8,000 / sq.ft.",
    trend: "Stable",
    icon: "🏦",
    vendorCount: 1,
  },
];

function uniqueOptions(values: ItemOption[]) {
  const seen = new Set<string>();

  return values.filter((item) => {
    const key = item.label.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function uniqueStrings(values: string[]) {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean))
  );
}

function normalizeTrend(value: unknown): TrendValue {
  const text = String(value || "").toLowerCase();

  if (text === "up") return "Up";
  if (text === "down") return "Down";

  return "Stable";
}

function normalizeCategory(value: unknown): CategoryKey {
  const text = String(value || "").toLowerCase();

  if (text.includes("service")) return "Services";
  if (text.includes("rental")) return "Rentals";
  if (text.includes("propert")) return "Properties";

  return "Materials";
}

function formatDbPrice(row: any) {
  const min = row?.price_min;
  const max = row?.price_max;

  if (min !== null && min !== undefined && max !== null && max !== undefined) {
    return `₹${min} - ₹${max}`;
  }

  if (min !== null && min !== undefined) {
    return `₹${min}`;
  }

  if (max !== null && max !== undefined) {
    return `₹${max}`;
  }

  return "Price not updated";
}

function formatOfferPeriod(row: any) {
  const start = row?.offer_start;
  const end = row?.offer_end;

  if (start && end) return `${start} - ${end}`;
  if (start) return `From ${start}`;
  if (end) return `Till ${end}`;

  return "";
}

function formatCardPrice(row: PriceRow) {
  return `₹${row.priceMin} - ₹${row.priceMax} / ${row.unit}`;
}

function makeGroupKey(row: PriceRow) {
  return [
    row.category,
    row.item.trim().toLowerCase(),
    String(row.location || "").trim().toLowerCase(),
    row.unit.trim().toLowerCase(),
  ].join("|");
}

function aggregatePriceRows(rows: PriceRow[]): AggregatedPriceRow[] {
  const grouped = new Map<string, PriceRow[]>();

  rows.forEach((row) => {
    const key = makeGroupKey(row);
    const existing = grouped.get(key) || [];
    grouped.set(key, [...existing, row]);
  });

  return Array.from(grouped.values()).map((groupRows) => {
    const sortedRows = [...groupRows].sort((a, b) => {
      const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bt - at;
    });

    const latest = sortedRows[0];
    const latestAvg = Math.round((latest.priceMin + latest.priceMax) / 2);

    const previous =
      sortedRows.find((row) => row.id !== latest.id) || sortedRows[1] || null;

    const previousAvg = previous
      ? Math.round((previous.priceMin + previous.priceMax) / 2)
      : null;

    const changePercent =
      previousAvg && previousAvg > 0
        ? Number((((latestAvg - previousAvg) / previousAvg) * 100).toFixed(1))
        : null;

    const autoTrend: TrendValue =
      changePercent === null
        ? latest.trend
        : changePercent > 1
        ? "Up"
        : changePercent < -1
        ? "Down"
        : "Stable";

    const priceMin = Math.min(...groupRows.map((row) => row.priceMin));
    const priceMax = Math.max(...groupRows.map((row) => row.priceMax));
    const vendorCount = groupRows.length;

    const confidence = Math.min(
      95,
      40 +
        vendorCount * 15 +
        (groupRows.some((row) => row.verified) ? 10 : 0) +
        (latest.createdAt ? 5 : 0)
    );

    return {
      ...latest,
      priceMin,
      priceMax,
      vendorCount,
      avgPrice: latestAvg,
      confidence,
      changePercent,
      trend: autoTrend,
      verified: groupRows.some((row) => row.verified),
    };
  });
}

function getItemIcon(item: string, category: CategoryKey) {
  const text = item.toLowerCase();

  if (text.includes("cement")) return "🏗️";
  if (text.includes("steel") || text.includes("rod")) return "🔩";
  if (text.includes("sand")) return "🏖️";
  if (text.includes("brick")) return "🧱";
  if (text.includes("land")) return "🌾";
  if (text.includes("flat") || text.includes("apartment")) return "🏢";
  if (text.includes("shop")) return "🏬";
  if (text.includes("office")) return "🏦";

  if (category === "Materials") return "🏗️";
  if (category === "Properties") return "🏡";
  if (category === "Services") return "🛠️";
  return "🚜";
}

function getTrustInfo(row: any, vendorCount = 1) {
  const source = String(row.sourceType || "").toLowerCase();

  let score = 40;
  let label = "Indicative";

  // Source weight
  if (source.includes("manufacturer")) {
    score += 30;
    label = "Manufacturer sourced";
  } else if (source.includes("distributor")) {
    score += 25;
    label = "Distributor sourced";
  } else if (source.includes("vendor")) {
    score += 15;
    label = "Vendor submitted";
  } else {
    score += 8;
    label = "Market indication";
  }

  // Vendor count weight
  if (vendorCount >= 5) score += 20;
  else if (vendorCount >= 3) score += 12;
  else if (vendorCount >= 2) score += 6;

  // 🔥 VERIFIED BOOST
  if (row.verified) {
    score += 15;
    label = `Verified • ${label}`;
  }

  // 🔥 FRESHNESS BOOST
  if (row.createdAt) {
    const days =
      (Date.now() - new Date(row.createdAt).getTime()) /
      (1000 * 60 * 60 * 24);

    if (days <= 7) score += 10;
    else if (days <= 30) score += 5;
  }

  score = Math.min(score, 98);

  if (score >= 85) return { score, label: `High trust • ${label}` };
  if (score >= 70) return { score, label: `Moderate trust • ${label}` };

  return { score, label: `Indicative only • ${label}` };
}

function TrustBadge({
  row,
  vendorCount,
}: {
  row: PriceRow;
  vendorCount?: number;
}) {
  const trust = getTrustInfo(row, vendorCount || 1);

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black ${
        trust.score >= 85
          ? "bg-green-50 text-green-700"
          : trust.score >= 70
          ? "bg-blue-50 text-blue-700"
          : "bg-amber-50 text-amber-700"
      }`}
    >
      🛡️ {trust.label} ({trust.score}%)
    </span>
  );
}

function TrendBadge({
  trend,
  changePercent,
}: {
  trend: string;
  changePercent?: number | null;
}) {
  const label =
    trend === "Up" ? "↑ Up" : trend === "Down" ? "↓ Down" : "→ Stable";

  const changeLabel =
    typeof changePercent === "number"
      ? ` (${changePercent > 0 ? "+" : ""}${changePercent}%)`
      : "";

  return (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
      {label}
      {changeLabel}
    </span>
  );
}

function getAiExplanationKey(row: AggregatedPriceRow) {
  return [
    row.category,
    row.item,
    row.location || "",
    row.unit,
    row.priceMin,
    row.priceMax,
    row.changePercent ?? "no-history",
    row.vendorCount,
  ]
    .join("|")
    .toLowerCase();
}

function getMarketExplanation(row: AggregatedPriceRow) {
  const item = row.item || "this item";
  const location = row.location || "selected market";

  if (typeof row.changePercent === "number") {
    if (row.changePercent > 3) {
      return `${item} is moving upward in ${location}, likely due to stronger local demand or limited supply.`;
    }

    if (row.changePercent < -3) {
      return `${item} is softening in ${location}, likely due to better supply or lower recent demand.`;
    }

    return `${item} is mostly stable in ${location}, with only minor movement in recent verified prices.`;
  }

  if (row.vendorCount >= 3) {
    return `${item} has good market confidence because multiple verified sources are available.`;
  }

  if (row.sourceType === "ai_draft") {
    return `${item} is AI-assisted draft intelligence and should be treated as indicative until more vendor sources are added.`;
  }

  return `${item} price is indicative because more verified local sources are needed for stronger market intelligence.`;
}

export default function PriceTodayClient() {
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState<CategoryKey>("Materials");
  const [item, setItem] = useState("All Items");
  const [brand, setBrand] = useState("All Brands");
  const [grade, setGrade] = useState("All Grades");
  const [itemsByCategory, setItemsByCategory] =
    useState<Record<CategoryKey, ItemOption[]>>(fallbackItems);
  const [priceRows, setPriceRows] = useState<PriceRow[]>(fallbackPriceRows);
  const [loading, setLoading] = useState(true);
  const [aiExplanations, setAiExplanations] = useState<Record<string, string>>({});
  const [aiExplanationLoading, setAiExplanationLoading] = useState<Record<string, boolean>>({});
  const [canAddPrice, setCanAddPrice] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      setLoading(true);

      const supabase = getSupabaseBrowser();

      const { data: userData } = await supabase.auth.getUser();

if (userData.user) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("role,requested_role,is_vendor,approval_status")
    .eq("id", userData.user.id)
    .maybeSingle();

      const { data: businessProfile } = await supabase
    .from("business_profiles")
    .select("verified_district, verified_locality")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  const detectedLocation =
    businessProfile?.verified_locality ||
    businessProfile?.verified_district ||
    "";

  if (detectedLocation) {
    setLocation(detectedLocation);
  }

  const role = String(profile?.role || "");
  const requestedRole = String(profile?.requested_role || "");
  const approvalStatus = String(profile?.approval_status || "");

  const allowedRole =
    profile?.is_vendor === true ||
    ["vendor", "builder", "property_owner", "hub_vendor", "master_admin"].includes(role) ||
    ["vendor", "builder", "property_owner", "hub_vendor"].includes(requestedRole);

  const approved =
    ["approved", "active"].includes(approvalStatus) ||
    role === "master_admin";

  setCanAddPrice(Boolean(allowedRole && approved));
}

      const next: Record<CategoryKey, ItemOption[]> = {
        Materials: [],
        Services: [],
        Rentals: [],
        Properties: [],
      };

      const [
        materialsRes,
        servicesRes,
        rentalsRes,
        propertyTypesRes,
        propertySubtypesRes,
        priceRes,
      ] = await Promise.allSettled([
        supabase
          .from("material_taxons")
          .select("name,kind,is_active,sort_order")
          .eq("is_active", true)
          .in("kind", ["category", "subcategory", "product_group"])
          .order("sort_order", { ascending: true }),

        supabase
          .from("v_service_listings")
          .select("segment,custom_category,custom_subcategory,custom_service")
          .limit(500),

        supabase
          .from("rental_taxons")
          .select("name,kind,is_active,sort_order")
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),

        supabase.from("property_types").select("name,slug").limit(100),

        supabase.from("property_subtypes").select("name,slug").limit(200),

        supabase
          .from("material_price_updates")
          .select(
            "id,category,item,brand,grade,price_min,price_max,unit,location,trend,offer,offer_start,offer_end,source_type,created_at,verified,user_id"
          )
          .eq("verified", true)
          .order("created_at", { ascending: false })
          .limit(300),
      ]);

      if (materialsRes.status === "fulfilled" && !materialsRes.value.error) {
        next.Materials = uniqueOptions(
          (materialsRes.value.data || [])
            .map((row: any) => ({
              label: String(row.name || "").trim(),
              source:
                row.kind === "product_group"
                  ? "Material Product Group"
                  : row.kind === "subcategory"
                  ? "Material Subcategory"
                  : "Material Category",
            }))
            .filter((x: ItemOption) => x.label)
        );
      }

      if (servicesRes.status === "fulfilled" && !servicesRes.value.error) {
        next.Services = uniqueOptions(
          (servicesRes.value.data || [])
            .flatMap((row: any) => [
              row.segment,
              row.custom_category,
              row.custom_subcategory,
              row.custom_service,
            ])
            .map((name: any) => ({
              label: String(name || "").trim(),
              source: "Service Listing",
            }))
            .filter((x: ItemOption) => x.label)
        );
      }

      if (rentalsRes.status === "fulfilled" && !rentalsRes.value.error) {
        next.Rentals = uniqueOptions(
          (rentalsRes.value.data || [])
            .map((row: any) => ({
              label: String(row.name || "").trim(),
              source:
                row.kind === "equipment"
                  ? "Rental Equipment"
                  : row.kind === "subcategory"
                  ? "Rental Subcategory"
                  : "Rental Category",
            }))
            .filter((x: ItemOption) => x.label)
        );
      }

      const propertyItems: ItemOption[] = [];

      if (
        propertyTypesRes.status === "fulfilled" &&
        !propertyTypesRes.value.error
      ) {
        propertyItems.push(
          ...(propertyTypesRes.value.data || []).map((row: any) => ({
            label: String(row.name || "").trim(),
            source: "Property Type",
          }))
        );
      }

      if (
        propertySubtypesRes.status === "fulfilled" &&
        !propertySubtypesRes.value.error
      ) {
        propertyItems.push(
          ...(propertySubtypesRes.value.data || []).map((row: any) => ({
            label: String(row.name || "").trim(),
            source: "Property Subtype",
          }))
        );
      }

      next.Properties = uniqueOptions(propertyItems.filter((x) => x.label));

      let livePriceRows: PriceRow[] = [];

      if (priceRes.status === "fulfilled" && !priceRes.value.error) {
        livePriceRows = (priceRes.value.data || []).map((row: any) => ({
          id: row.id,
          category: normalizeCategory(row.category),
          item: String(row.item || "").trim() || "Unknown Item",
          brand: String(row.brand || row.source_type || "Local Market").trim(),
          grade: String(row.grade || "Standard").trim(),
          price: formatDbPrice(row),
          priceMin: Number(row.price_min || 0),
          priceMax: Number(row.price_max || row.price_min || 0),
          unit: String(row.unit || "unit").trim(),
          trend: normalizeTrend(row.trend),
          location: String(row.location || "").trim(),
          offer: String(row.offer || "").trim(),
          offerPeriod: formatOfferPeriod(row),
          sourceType: String(row.source_type || "Vendor").trim(),

          // 🔥 TRUST INPUTS (NEW)
          verified: row.verified ?? false,
          createdAt: row.created_at ?? null,
          userId: row.user_id ?? null,
        }));
      }

      const priceItemsByCategory: Record<CategoryKey, ItemOption[]> = {
        Materials: [],
        Services: [],
        Rentals: [],
        Properties: [],
      };

      livePriceRows.forEach((row) => {
        priceItemsByCategory[row.category].push({
          label: row.item,
          source: "Live Price Data",
        });
      });

      if (!mounted) return;

      setItemsByCategory({
        Materials: uniqueOptions([
          ...priceItemsByCategory.Materials,
          ...(next.Materials.length ? next.Materials : fallbackItems.Materials),
        ]),
        Services: uniqueOptions([
          ...priceItemsByCategory.Services,
          ...(next.Services.length ? next.Services : fallbackItems.Services),
        ]),
        Rentals: uniqueOptions([
          ...priceItemsByCategory.Rentals,
          ...(next.Rentals.length ? next.Rentals : fallbackItems.Rentals),
        ]),
        Properties: uniqueOptions([
          ...priceItemsByCategory.Properties,
          ...(next.Properties.length
            ? next.Properties
            : fallbackItems.Properties),
        ]),
      });

      setPriceRows(livePriceRows.length ? livePriceRows : fallbackPriceRows);
      setLoading(false);
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, []);

  const selectedCategory = categoryOptions.find((cat) => cat.label === category);

  const currentItems = useMemo(() => {
    return itemsByCategory[category] || [];
  }, [category, itemsByCategory]);

  const matchingRows = useMemo(() => {
    return priceRows.filter((row) => {
      const locationMatched =
        !location ||
        !row.location ||
        row.location.toLowerCase().includes(location.toLowerCase()) ||
        location.toLowerCase().includes(row.location.toLowerCase());

      if (row.category !== category) return false;
      if (!locationMatched) return false;
      if (item !== "All Items" && row.item !== item) return false;
      if (brand !== "All Brands" && row.brand !== brand) return false;
      if (grade !== "All Grades" && row.grade !== grade) return false;

      return true;
    });
  }, [priceRows, category, item, brand, grade, location]);

  const groupedPriceRows = useMemo(() => {
    return aggregatePriceRows(matchingRows);
  }, [matchingRows]);

    useEffect(() => {
    if (!groupedPriceRows.length) return;

    let cancelled = false;

    async function loadAiExplanations() {
      const rowsToExplain = groupedPriceRows.slice(0, 6);

      for (const row of rowsToExplain) {
        const key = getAiExplanationKey(row);

        if (aiExplanations[key] || aiExplanationLoading[key]) {
          continue;
        }

        const cached =
          typeof window !== "undefined"
            ? window.sessionStorage.getItem(`price-ai:${key}`)
            : null;

        if (cached) {
          setAiExplanations((prev) => ({ ...prev, [key]: cached }));
          continue;
        }

                const timeout = window.setTimeout(() => {
          const fallback = getMarketExplanation(row);

          setAiExplanations((prev) => ({
            ...prev,
            [key]: fallback,
          }));

          setAiExplanationLoading((prev) => ({
            ...prev,
            [key]: false,
          }));
        }, 6000);

        setAiExplanationLoading((prev) => ({ ...prev, [key]: true }));

        try {
          const res = await fetch("/api/price-explanation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              item: row.item,
              location: row.location || location,
              trend: row.trend,
              changePercent: row.changePercent,
              sources: row.vendorCount,
              confidence: row.confidence,
              unit: row.unit,
              priceMin: row.priceMin,
              priceMax: row.priceMax,
            }),
          });

          const json = await res.json();

          if (!cancelled && res.ok && json?.explanation) {
            const explanation = String(json.explanation);
            setAiExplanations((prev) => ({ ...prev, [key]: explanation }));

            window.clearTimeout(timeout);

            if (typeof window !== "undefined") {
              window.sessionStorage.setItem(`price-ai:${key}`, explanation);
            }
          }
        } catch {
          window.clearTimeout(timeout);

          const fallback = getMarketExplanation(row);

          setAiExplanations((prev) => ({
            ...prev,
            [key]: fallback,
          }));
        } finally {
          if (!cancelled) {
            setAiExplanationLoading((prev) => ({ ...prev, [key]: false }));
          }
        }
      }
    }

    loadAiExplanations();

    return () => {
      cancelled = true;
    };
  }, [groupedPriceRows, location, aiExplanations, aiExplanationLoading]);

  const brandOptions = useMemo(() => {
    return uniqueStrings(
      priceRows
        .filter(
          (row) =>
            row.category === category &&
            (item === "All Items" || row.item === item)
        )
        .map((row) => row.brand)
    );
  }, [priceRows, category, item]);

  const gradeOptions = useMemo(() => {
    return uniqueStrings(
      priceRows
        .filter(
          (row) =>
            row.category === category &&
            (item === "All Items" || row.item === item) &&
            (brand === "All Brands" || row.brand === brand)
        )
        .map((row) => row.grade)
    );
  }, [priceRows, category, item, brand]);

  const listingHref = selectedCategory?.href || "/search";
  const searchText = item === "All Items" ? category : item;

  const mainMaterialCards = useMemo(() => {
    const rows = aggregatePriceRows(
      priceRows.filter((row) => row.category === "Materials")
    );

    if (!rows.length) return mainMaterials;

    return rows.slice(0, 4).map((row) => ({
      name: row.item,
      price: formatCardPrice(row),
      trend: row.trend,
      icon: getItemIcon(row.item, "Materials"),
      vendorCount: row.vendorCount,
      changePercent: row.changePercent,
    }));
  }, [priceRows]);

  const propertyPriceCards = useMemo(() => {
    const rows = aggregatePriceRows(
      priceRows.filter((row) => row.category === "Properties")
    );

    if (!rows.length) return propertyPrices;

    return rows.slice(0, 4).map((row) => ({
      name: row.item,
      price: formatCardPrice(row),
      trend: row.trend,
      icon: getItemIcon(row.item, "Properties"),
      vendorCount: row.vendorCount,
    }));
  }, [priceRows]);

  return (
    <main className="min-h-screen bg-[#f8faf7]">
      <section className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-5">
          <Link
            href="/"
            className="text-sm font-bold text-emerald-700 hover:text-emerald-800"
          >
            ← Back to Home
          </Link>
        </div>

        <div className="rounded-3xl bg-gradient-to-br from-orange-500 via-red-600 to-amber-800 p-5 text-white shadow-sm sm:p-8">
          <p className="mb-2 inline-flex rounded-full bg-white/20 px-3 py-1 text-xs font-black">
            PRICE TODAY
          </p>

          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            Today’s Material & Property Price Trends
          </h1>

          <p className="mt-3 max-w-3xl text-base font-medium leading-7 text-white/90">
            Check local price indication by location, category, exact item,
            brand/source and grade/quality.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-white p-4 text-slate-950">
              <div className="text-sm font-black text-red-600">
                Current Offer
              </div>
              <div className="mt-1 text-xl font-black">
                Vendor launch discount available
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-600">
                Offer period: 26 April 2026 - 31 May 2026
              </div>
            </div>

            {canAddPrice ? (
              <Link
                href="/vendor/price-updates/new"
                className="rounded-2xl bg-slate-950 p-4 text-white shadow-sm hover:bg-slate-900"
              >
                <div className="text-sm font-black text-orange-200">
                  Vendor / Builder / Owner
                </div>
                <div className="mt-1 text-xl font-black">
                  Add Today’s Price →
                </div>
                <div className="mt-1 text-sm font-semibold text-white/75">
                  Submit brand, grade, rate, location and offer period.
                </div>
              </Link>
            ) : (
              <div className="rounded-2xl bg-slate-950/80 p-4 text-white shadow-sm">
                <div className="text-sm font-black text-orange-200">
                  Vendor / Builder / Owner only
                </div>
                <div className="mt-1 text-xl font-black">
                  Price update access restricted
                </div>
                <div className="mt-1 text-sm font-semibold text-white/75">
                  Approved vendors, builders and property owners can submit live prices.
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-black text-slate-700">
                Type District / Town / City
              </label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                list="price-today-locations"
                placeholder="Type or select location"
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold text-slate-800 outline-none focus:border-emerald-500"
              />
              <datalist id="price-today-locations">
                {locations.map((place) => (
                  <option key={place} value={place} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="text-sm font-black text-slate-700">
                Select Category
              </label>
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value as CategoryKey);
                  setItem("All Items");
                  setBrand("All Brands");
                  setGrade("All Grades");
                }}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold text-slate-800 outline-none focus:border-emerald-500"
              >
                {categoryOptions.map((cat) => (
                  <option key={cat.label} value={cat.label}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-black text-slate-700">
                Select Exact Item
              </label>
              <select
                value={item}
                onChange={(e) => {
                  setItem(e.target.value);
                  setBrand("All Brands");
                  setGrade("All Grades");
                }}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold text-slate-800 outline-none focus:border-emerald-500"
              >
                <option>All Items</option>
                {currentItems.map((subItem) => (
                  <option
                    key={`${subItem.source}-${subItem.label}`}
                    value={subItem.label}
                  >
                    {subItem.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-black text-slate-700">
                Select Brand / Source
              </label>
              <select
                value={brand}
                onChange={(e) => {
                  setBrand(e.target.value);
                  setGrade("All Grades");
                }}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold text-slate-800 outline-none focus:border-emerald-500"
              >
                <option>All Brands</option>
                {brandOptions.map((brandName) => (
                  <option key={brandName} value={brandName}>
                    {brandName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-black text-slate-700">
                Select Grade / Quality
              </label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold text-slate-800 outline-none focus:border-emerald-500"
              >
                <option>All Grades</option>
                {gradeOptions.map((gradeName) => (
                  <option key={gradeName} value={gradeName}>
                    {gradeName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={listingHref}
              className="rounded-2xl bg-blue-700 px-5 py-3 text-sm font-black text-white hover:bg-blue-800"
            >
              View {category} Listings →
            </Link>

            <Link
              href={`/search?q=${encodeURIComponent(searchText)}`}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-black text-slate-800 hover:bg-slate-100"
            >
              Search Selected Item →
            </Link>
          </div>

          <p className="mt-3 text-xs font-medium text-slate-500">
            {loading
              ? "Loading live portal categories and price data..."
              : "Category and exact item are connected with portal master/listing data where available. Price rows are connected with material_price_updates when available."}
          </p>
        </div>

        <div className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
          <h2 className="text-xl font-black text-slate-950">
            Selected Price Result
          </h2>

          <p className="mt-2 text-sm font-semibold text-slate-600">
            Trust score is based on source type and number of matching price
            sources. Prices are indicative until directly confirmed with the
            vendor, distributor, builder or owner.
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {groupedPriceRows.length ? (
              groupedPriceRows.map((row, index) => (
                <div
                  key={`${row.id || index}-${row.item}-${row.location}-${row.unit}`}
                  className="rounded-3xl bg-white p-5 shadow-sm"
                >
                  <div className="text-sm font-black text-slate-500">
                    {row.location || location || "Selected Location"}
                  </div>

                  <h3 className="mt-1 text-xl font-black text-slate-950">
                    {row.item}
                  </h3>

                  <div className="mt-2 text-sm font-bold text-slate-700">
                    <div className="text-sm text-slate-600">
                      Market Avg: <b>₹{row.avgPrice}</b> / {row.unit}
                    </div>

                    <div className="text-sm text-slate-600">
                      Range: ₹{row.priceMin} – ₹{row.priceMax}
                    </div>

                    <div className="text-sm text-slate-600">
                      Sources: {row.vendorCount}
                    </div>

                    <div className="text-xs font-bold text-amber-600">
                      Confidence: {row.confidence}%
                    </div>

                    <div className="text-xs font-bold text-slate-500">
                      7-day movement:{" "}
                      {typeof row.changePercent === "number"
                        ? `${row.changePercent > 0 ? "+" : ""}${row.changePercent}%`
                        : "Not enough history"}
                    </div>

                    <div className="mt-2 rounded-2xl bg-blue-50 px-3 py-2 text-xs font-bold leading-5 text-blue-800">
                      AI insight:{" "}
                      {aiExplanationLoading[getAiExplanationKey(row)]
                        ? "Generating live market explanation..."
                        : aiExplanations[getAiExplanationKey(row)] ||
                          getMarketExplanation(row)}
                    </div>
                    
                  </div>

                  <div className="mt-3 text-2xl font-black text-emerald-700">
                    ₹{row.priceMin} - ₹{row.priceMax} / {row.unit}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <TrendBadge trend={row.trend} changePercent={row.changePercent} />
                    <TrustBadge row={row} vendorCount={row.vendorCount} />
                  </div>

                  {row.offer ? (
                    <div className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm font-bold text-slate-700">
                      {row.offer}
                      {row.offerPeriod ? (
                        <div className="mt-1 text-xs text-slate-500">
                          Offer period: {row.offerPeriod}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="rounded-3xl bg-white p-5 text-sm font-bold text-slate-600 shadow-sm">
                No price found for your selected filters. Try changing category,
                item, brand, grade or location. Vendors, builders and owners can
                add today’s price from the button above.
              </div>
            )}
          </div>
        </div>

        <div className="mt-6">
          <h2 className="text-2xl font-black text-slate-950">
            Main Material Prices
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {mainMaterialCards.map((mainItem) => (
              <div
                key={mainItem.name}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="text-3xl">{mainItem.icon}</div>
                <h3 className="mt-3 text-lg font-black text-slate-950">
                  {mainItem.name}
                </h3>
                <div className="mt-2 text-xl font-black text-emerald-700">
                  {mainItem.price}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <TrendBadge
                    trend={mainItem.trend}
                    changePercent={
                      typeof (mainItem as any).changePercent === "number"
                        ? (mainItem as any).changePercent
                        : null
                    }
                  />
                  {typeof mainItem.vendorCount === "number" ? (
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                      {mainItem.vendorCount} source{mainItem.vendorCount > 1 ? "s" : ""}
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-2xl font-black text-slate-950">
            Property Price Trends
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {propertyPriceCards.map((propertyItem) => (
              <div
                key={propertyItem.name}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="text-3xl">{propertyItem.icon}</div>
                <h3 className="mt-3 text-lg font-black text-slate-950">
                  {propertyItem.name}
                </h3>
                <div className="mt-2 text-xl font-black text-blue-700">
                  {propertyItem.price}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <TrendBadge
                    trend={propertyItem.trend}
                    changePercent={
                      typeof (propertyItem as any).changePercent === "number"
                        ? (propertyItem as any).changePercent
                        : null
                    }
                  />
                  {typeof propertyItem.vendorCount === "number" ? (
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                      {propertyItem.vendorCount} source{propertyItem.vendorCount > 1 ? "s" : ""}
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="text-xl font-black text-slate-950">
            Discounts & Offers
          </h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
            Manufacturers, distributors, local material suppliers, service
            providers, rental providers, builders and property sellers will be
            able to show limited-period offers here.
          </p>
        </div>
      </section>
    </main>
  );
}