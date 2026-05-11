"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import JsonLd from "@/components/seo/JsonLd";
import { breadcrumbSchema } from "@/lib/seo/schema";

type CategoryKey = "Materials" | "Services" | "Rentals" | "Properties";
type TrendValue = "Up" | "Down" | "Stable";

type ItemOption = {
  label: string;
  source: string;
};

type PriceTodayPrefill = {
  source?: string;
  q?: string;
  category?: string;
  subcategory?: string;
  productGroup?: string;
  type?: string;
  title?: string;
  localName?: string;
  createdAt?: string;
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
  subscriptionPlan?: string | null;
  subscriptionStatus?: string | null;
  subscriptionExpiresAt?: string | null;
  aiSuggestedPrice?: number | null;
  aiPriceDeviationPercent?: number | null;
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
      subscriptionPlan:
        groupRows.find((row) => row.subscriptionPlan === "hub_vendor")
          ?.subscriptionPlan ||
        groupRows.find((row) => row.subscriptionPlan === "premium_vendor")
          ?.subscriptionPlan ||
        groupRows.find((row) => row.subscriptionPlan === "basic_vendor")
          ?.subscriptionPlan ||
        latest.subscriptionPlan ||
        null,
      subscriptionStatus:
        groupRows.find((row) => row.subscriptionStatus === "active")
          ?.subscriptionStatus ||
        latest.subscriptionStatus ||
        null,
      subscriptionExpiresAt:
        groupRows.find((row) => row.subscriptionStatus === "active")
          ?.subscriptionExpiresAt ||
        latest.subscriptionExpiresAt ||
        null,
      aiSuggestedPrice:
        groupRows.find((row) => row.aiSuggestedPrice !== null && row.aiSuggestedPrice !== undefined)
          ?.aiSuggestedPrice ||
        latest.aiSuggestedPrice ||
        null,
      aiPriceDeviationPercent:
        groupRows.find((row) => row.aiPriceDeviationPercent !== null && row.aiPriceDeviationPercent !== undefined)
          ?.aiPriceDeviationPercent ||
        latest.aiPriceDeviationPercent ||
        null,
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

function AiPriceBadge({ row }: { row: PriceRow }) {
  const deviation = Math.abs(Number(row.aiPriceDeviationPercent));

  if (!Number.isFinite(deviation)) return null;

  if (deviation <= 3) {
    return (
      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">
        🟢 AI Optimized
      </span>
    );
  }

  if (deviation <= 12) {
    return (
      <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-800">
        🔵 Competitive
      </span>
    );
  }

  return (
    <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-black text-orange-800">
      🟠 Needs Correction
    </span>
  );
}

function VisibilityStatusBadge({ row }: { row: PriceRow }) {
  const plan = String(row.subscriptionPlan || "free");
  const status = String(row.subscriptionStatus || "free");

  const expiresAt = row.subscriptionExpiresAt
    ? new Date(row.subscriptionExpiresAt).getTime()
    : 0;

  const active =
    status === "active" &&
    (!row.subscriptionExpiresAt ||
      (Number.isFinite(expiresAt) && expiresAt > Date.now()));

  if (active && (plan === "hub_vendor" || plan === "premium_vendor")) {
    return (
      <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-800">
        🔥 Top Visibility
      </span>
    );
  }

  if (active && plan === "basic_vendor") {
    return (
      <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-800">
        👁️ Better Visibility
      </span>
    );
  }

  return (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
      👁️ Free Visibility
    </span>
  );
}

function SubscriptionBadge({ row }: { row: PriceRow }) {
  const plan = String(row.subscriptionPlan || "free");
  const status = String(row.subscriptionStatus || "free");

  const expiresAt = row.subscriptionExpiresAt
    ? new Date(row.subscriptionExpiresAt).getTime()
    : 0;

  const active =
    status === "active" &&
    (!row.subscriptionExpiresAt ||
      (Number.isFinite(expiresAt) && expiresAt > Date.now()));

  if (!active) return null;

  if (plan === "hub_vendor") {
    return (
      <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-black text-purple-800">
        🔥 Hub Vendor
      </span>
    );
  }

  if (plan === "premium_vendor") {
    return (
      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">
        ⭐ Premium Vendor
      </span>
    );
  }

  if (plan === "basic_vendor") {
    return (
      <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-800">
        Basic Vendor
      </span>
    );
  }

  return null;
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

function isHotBuyerRow(row: AggregatedPriceRow) {
  return (
    row.trend === "Up" ||
    Number(row.changePercent || 0) >= 3 ||
    Number(row.confidence || 0) >= 75
  );
}

function getBestOptionKey(rows: AggregatedPriceRow[]) {
  if (!rows.length) return null;

  const scored = rows.map((row) => {
    let score = 0;

    // confidence weight
    score += Number(row.confidence || 0) * 0.6;

    // vendor strength
    score += Number(row.vendorCount || 0) * 8;

    // price advantage (lower is better)
    const avg = Number(row.avgPrice || 0);
    const min = Number(row.priceMin || 0);

    if (avg > 0 && min > 0) {
      const priceScore = (avg - min) / avg;
      score += priceScore * 40;
    }

    // trend stability bonus
    if (row.trend === "Stable") score += 10;
    if (row.trend === "Down") score += 15;

    return { key: makeGroupKey(row), score };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored[0]?.key || null;
}

function getComparisonLabel(row: AggregatedPriceRow) {
  const confidence = Number(row.confidence || 0);
  const vendors = Number(row.vendorCount || 0);
  const change = Number(row.changePercent || 0);

  if (confidence >= 80 && vendors >= 3 && row.trend === "Stable") {
    return {
      label: "Best balanced choice",
      detail: "Good confidence, stable trend and multiple sources make this a safer buying option.",
      badge: "🏆 Recommended",
    };
  }

  if (row.trend === "Down" && vendors >= 2) {
    return {
      label: "Good negotiation opportunity",
      detail: "Prices are softening, so buyers may negotiate better rates before final order.",
      badge: "💰 Value Pick",
    };
  }

  if (row.trend === "Up" && change >= 3) {
    return {
      label: "Buy with caution",
      detail: "Prices are rising quickly. Confirm stock, final rate and delivery before booking.",
      badge: "⚠️ Rising Fast",
    };
  }

  if (confidence < 55 || vendors <= 1) {
    return {
      label: "Low data confidence",
      detail: "More verified vendor prices are needed before making a strong buying decision.",
      badge: "📊 Need More Data",
    };
  }

  return {
    label: "Compare before buying",
    detail: "Check brand/source, grade and vendor confirmation before final decision.",
    badge: "🔎 Compare",
  };
}

async function triggerPriceLead(row: AggregatedPriceRow & { isHotBuyer?: boolean }) {
  try {
    const res = await fetch("/api/enquiries/create-and-chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        module: row.category.toLowerCase(),
        priority: row.isHotBuyer || isHotBuyerRow(row) ? "high" : "normal",
        aiSignal: row.isHotBuyer || isHotBuyerRow(row) ? "hot_buyer" : "normal_buyer",
        title: `${row.item} ${row.category === "Properties" ? "property enquiry" : "requirement"}`,
        message: `Hi, I am interested in ${row.category === "Properties" ? "this property segment" : "buying"} ${row.item} in ${row.location || "this area"}.

Market range: ₹${row.priceMin} – ₹${row.priceMax} per ${row.unit}.

Please share:
✔ Best final price
✔ Delivery timeline
✔ Available quantity
✔ Payment terms

I am ready to finalize soon.`,
      }),
    });

    const data = await res.json();

    if (data?.conversationId) {
      window.location.href = `/dashboard/thread/${data.conversationId}`;
    } else {
      alert("Lead created. Please check your inbox.");
    }
  } catch (e) {
    alert("Failed to send enquiry. Try again.");
  }
}

function getPricePredictionAI(row: AggregatedPriceRow) {
  const category = row.category;
  const confidence = Number(row.confidence || 0);
  const vendors = Number(row.vendorCount || 0);
  const change = Number(row.changePercent || 0);

  const actionWord =
    category === "Properties"
      ? "Buy"
      : category === "Rentals"
      ? "Rent"
      : category === "Services"
      ? "Hire"
      : "Buy";

  if (confidence < 55 || vendors <= 1) {
    return {
      label: `⏳ Monitor before ${actionWord.toLowerCase()}`,
      color: "amber",
      window: "Wait 3–7 days",
      reason: "Low market confidence. More verified price sources are needed before a strong decision.",
    };
  }

  if (row.trend === "Up" || change >= 3) {
    return {
      label: `🔥 ${actionWord} now`,
      color: "red",
      window: "Act within 1–3 days",
      reason:
        category === "Rentals"
          ? "Rental demand or rate pressure is rising. Confirm availability before rates increase."
          : category === "Services"
          ? "Service demand or pricing pressure is rising. Confirm provider availability early."
          : "Price pressure is rising. Early action may avoid higher cost.",
    };
  }

  if (row.trend === "Down" || change <= -3) {
    return {
      label: "💰 Negotiate / wait",
      color: "green",
      window: "Wait 3–7 days if not urgent",
      reason:
        category === "Properties"
          ? "Market is softening. This may be a negotiation opportunity with owner or builder."
          : "Rates are softening. Compare vendors and negotiate before final decision.",
    };
  }

  return {
    label: `✅ Safe to ${actionWord.toLowerCase()}`,
    color: "blue",
    window: "Proceed after confirmation",
    reason: "Market is stable with acceptable confidence. Confirm final rate, terms and availability.",
  };
}

function getBuySignal(row: AggregatedPriceRow) {
  if (row.vendorCount <= 1 || row.confidence < 55) {
    return {
      label: "⚠️ Low data → Monitor market",
      color: "amber",
    };
  }

  if (row.trend === "Up" && typeof row.changePercent === "number") {
    if (row.changePercent >= 3) {
      return {
        label: "🔺 Price rising fast → Wait",
        color: "red",
      };
    }

    return {
      label: "Monitor → Mild upward trend",
      color: "amber",
    };
  }

  if (row.trend === "Down" && typeof row.changePercent === "number") {
    if (row.changePercent <= -3) {
      return {
        label: "🔻 Price falling → Buy soon",
        color: "green",
      };
    }

    return {
      label: "Monitor → Slight decline",
      color: "amber",
    };
  }

  if (row.trend === "Stable") {
    return {
      label: "Safe to transact",
      color: "green",
    };
  }

  return {
    label: "Monitor price",
    color: "amber",
  };
}

function getPredictiveProcurementSummary(rows: AggregatedPriceRow[], category: CategoryKey) {
  if (!rows.length) {
    return {
      score: 20,
      signal: "Low data",
      action: "Collect more local price signals before decision.",
      budgetRisk: "Unknown",
      demand: "Not enough data",
      recommendation: "Search listings or create an AI RFQ to get live vendor quotes.",
    };
  }

  const avgConfidence = Math.round(rows.reduce((sum, row) => sum + row.confidence, 0) / rows.length);
  const avgChange = rows.reduce((sum, row) => sum + (row.changePercent || 0), 0) / rows.length;
  const rising = rows.filter((row) => row.trend === "Up").length;
  const falling = rows.filter((row) => row.trend === "Down").length;
  const vendors = rows.reduce((sum, row) => sum + row.vendorCount, 0);

  let score = 45 + avgConfidence * 0.35 + vendors * 2 + avgChange * 4;
  score = Math.max(1, Math.min(100, Math.round(score)));

  const isRising = rising > falling || avgChange >= 2;
  const isFalling = falling > rising || avgChange <= -2;

  return {
    score,
    signal: isRising ? "Rising market" : isFalling ? "Negotiation market" : "Stable market",
    action: isRising
      ? category === "Properties"
        ? "Talk to owner/builder early before price rises further."
        : "Buy/rent/hire soon or lock vendor quote early."
      : isFalling
        ? "Negotiate with multiple vendors before final decision."
        : "Proceed after comparing vendor availability, trust and final terms.",
    budgetRisk: isRising ? "High" : isFalling ? "Low to Medium" : "Medium",
    demand: isRising ? "Demand pressure increasing" : isFalling ? "Demand or rate pressure softening" : "Balanced demand",
    recommendation:
      category === "Materials"
        ? "Create a procurement RFQ and compare at least 2–3 supplier quotes."
        : category === "Rentals"
          ? "Confirm equipment availability, operator, diesel and hourly/daily rate."
          : category === "Services"
            ? "Confirm labour/material scope, timeline and payment milestone."
            : "Compare location, legal clarity, price trend and seller urgency.",
  };
}

function getDistrictMarketSummary(rows: AggregatedPriceRow[], location: string) {
  if (!rows.length) {
    return {
      title: `${location || "Selected market"} Market Signal`,
      headline: "No strong price signal yet",
      detail:
        "More verified local price submissions are needed to generate a reliable district-level market signal.",
      bestAction: "Collect more local price data",
      strongestItem: "No item selected",
      confidenceLabel: "Low confidence",
    };
  }

  const risingRows = rows.filter((row) => row.trend === "Up");
  const fallingRows = rows.filter((row) => row.trend === "Down");
  const stableRows = rows.filter((row) => row.trend === "Stable");

  const strongestRow =
    [...rows].sort((a, b) => {
      const aMove = Math.abs(a.changePercent ?? 0);
      const bMove = Math.abs(b.changePercent ?? 0);
      return bMove - aMove;
    })[0] || rows[0];

  const avgConfidence = Math.round(
    rows.reduce((sum, row) => sum + row.confidence, 0) / rows.length
  );

    const avgChange =
    rows.reduce((sum, row) => sum + (row.changePercent || 0), 0) /
    rows.length;

  let prediction = "Stable movement expected";
  let timeWindow = "Wait and monitor next 3–5 days";
  let advice = "Compare multiple vendors before decision";

  if (avgChange > 2) {
    prediction = "Prices likely to rise in next 7 days";
    timeWindow = "Buy within 1–3 days if needed";
    advice = "Act early or negotiate quickly";
  } else if (avgChange < -2) {
    prediction = "Prices may soften further";
    timeWindow = "Wait 3–7 days for better rates";
    advice = "Monitor and negotiate lower prices";
  }

  let heatScore = 50;

  heatScore += avgChange * 5;
  heatScore += (avgConfidence - 50) * 0.6;
  heatScore += rows.length * 2;

  heatScore = Math.max(10, Math.min(95, Math.round(heatScore)));

  let heatLabel = "Balanced Market";

  if (heatScore >= 75) heatLabel = "Hot Market 🔥";
  else if (heatScore <= 35) heatLabel = "Slow Market 🧊";

  const confidenceLabel =
    avgConfidence >= 75
      ? "Strong confidence"
      : avgConfidence >= 60
      ? "Moderate confidence"
      : "Low confidence";

  let headline = "Market is mostly stable";
  let bestAction = "Compare vendors before final decision";

  if (risingRows.length > fallingRows.length && risingRows.length >= stableRows.length) {
    headline = "Prices are showing upward pressure";
    bestAction = "Act early or negotiate before further rise";
  } else if (
    fallingRows.length > risingRows.length &&
    fallingRows.length >= stableRows.length
  ) {
    headline = "Some prices are softening";
    bestAction = "Watch closely and negotiate better rates";
  }

  return {
  title: `${location || strongestRow.location || "Selected market"} Market Signal`,
  headline,
  detail: `${strongestRow.item} is the strongest signal today. Average confidence is ${avgConfidence}% across ${rows.length} price group${rows.length > 1 ? "s" : ""}.`,
  bestAction,
  strongestItem: strongestRow.item,
  confidenceLabel,
  heatScore,
  heatLabel,
    prediction,
  timeWindow,
  advice,
};
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
  const [prefillApplied, setPrefillApplied] = useState(false);
  const [prefillNotice, setPrefillNotice] = useState("");
  const [selectedCompareKeys, setSelectedCompareKeys] = useState<string[]>([]);

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
            "id,category,item,brand,grade,price_min,price_max,unit,location,trend,offer,offer_start,offer_end,source_type,created_at,verified,user_id,ai_suggested_price,ai_price_deviation_percent,business_profiles!material_price_updates_created_by_fkey(subscription_plan,subscription_status,subscription_expires_at)"
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

          // 🔥 TRUST INPUTS
          verified: row.verified ?? false,
          createdAt: row.created_at ?? null,
          userId: row.user_id ?? null,

          // 🔥 SUBSCRIPTION VISIBILITY
          subscriptionPlan:
            row.business_profiles?.subscription_plan ||
            row.business_profiles?.[0]?.subscription_plan ||
            null,
          subscriptionStatus:
            row.business_profiles?.subscription_status ||
            row.business_profiles?.[0]?.subscription_status ||
            null,
          subscriptionExpiresAt:
            row.business_profiles?.subscription_expires_at ||
            row.business_profiles?.[0]?.subscription_expires_at ||
            null,

          // 🧠 AI PRICE VISIBILITY
          aiSuggestedPrice:
            row.ai_suggested_price !== null && row.ai_suggested_price !== undefined
              ? Number(row.ai_suggested_price)
              : null,
          aiPriceDeviationPercent:
            row.ai_price_deviation_percent !== null &&
            row.ai_price_deviation_percent !== undefined
              ? Number(row.ai_price_deviation_percent)
              : null,
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

  useEffect(() => {
    if (loading || prefillApplied || typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);

    let stored: PriceTodayPrefill | null = null;

    try {
      const raw = window.localStorage.getItem("3bigha_price_today_prefill");
      stored = raw ? JSON.parse(raw) : null;
    } catch {
      stored = null;
    }

    const isFresh = stored?.createdAt
      ? Date.now() - new Date(stored.createdAt).getTime() < 10 * 60 * 1000
      : false;

    if (!params.get("q") && !params.get("productGroup") && !isFresh) {
      setPrefillApplied(true);
      return;
    }

    const requestedItem =
      params.get("productGroup") ||
      params.get("q") ||
      stored?.productGroup ||
      stored?.q ||
      stored?.subcategory ||
      stored?.category ||
      stored?.title ||
      "";

    const cleanRequestedItem = requestedItem.trim();

    if (!cleanRequestedItem) {
      setPrefillApplied(true);
      return;
    }

    const requestedTypeRaw =
      params.get("type") ||
      params.get("categoryType") ||
      stored?.type ||
      stored?.source ||
      "";

    const requestedCategory: CategoryKey =
      String(requestedTypeRaw).toLowerCase().includes("rental")
        ? "Rentals"
        : String(requestedTypeRaw).toLowerCase().includes("service")
        ? "Services"
        : String(requestedTypeRaw).toLowerCase().includes("propert")
        ? "Properties"
        : "Materials";

    const categoryOptionsList = itemsByCategory[requestedCategory] || [];
    const requestedLower = cleanRequestedItem.toLowerCase();

    const aliasMap: Record<string, string> =
      requestedCategory === "Materials"
        ? {
            tmt: "Steel Rod",
            rod: "Steel Rod",
            sariya: "Steel Rod",
            rebar: "Steel Rod",
            opc: "Cement",
            ppc: "Cement",
            psc: "Cement",
            balu: "Sand",
            baalu: "Sand",
            "river sand": "Sand",
            "m sand": "Sand",
            bricks: "Brick",
            blocks: "Brick",
          }
        : requestedCategory === "Rentals"
        ? {
            jcb: "JCB Rental",
            excavator: "JCB Rental",
            tractor: "Tractor Rental",
            mixer: "Mixer Machine Rental",
            "concrete mixer": "Mixer Machine Rental",
          }
        : {};

    const normalizedRequest = (aliasMap[requestedLower] || requestedLower).toLowerCase();

    const exactMatch = categoryOptionsList.find(
      (option) => option.label.trim().toLowerCase() === normalizedRequest
    );

    const smartMatch = categoryOptionsList.find((option) => {
      const optionLower = option.label.trim().toLowerCase();
      return (
        normalizedRequest.includes(optionLower) ||
        optionLower.includes(normalizedRequest)
      );
    });

    const selectedItem =
      exactMatch?.label || smartMatch?.label || cleanRequestedItem;

    setCategory(requestedCategory);
    setItem(selectedItem);
    setBrand("All Brands");
    setGrade("All Grades");

    setItemsByCategory((prev) => {
      const alreadyExists = prev[requestedCategory].some(
        (option) =>
          option.label.trim().toLowerCase() === selectedItem.toLowerCase()
      );

      if (alreadyExists) return prev;

      return {
        ...prev,
        [requestedCategory]: uniqueOptions([
          {
            label: selectedItem,
            source:
              requestedCategory === "Rentals"
                ? "Rental AI Selection"
                : requestedCategory === "Services"
                ? "Service AI Selection"
                : requestedCategory === "Properties"
                ? "Property AI Selection"
                : "Material AI Selection",
          },
          ...prev[requestedCategory],
        ]),
      };
    });

    setPrefillNotice(
      `Auto-loaded from ${requestedCategory} AI: ${selectedItem}. You can now compare local price trends before decision.`
    );

    window.localStorage.removeItem("3bigha_price_today_prefill");
    setPrefillApplied(true);
  }, [loading, prefillApplied, itemsByCategory]);

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
      return aggregatePriceRows(matchingRows).sort((a: any, b: any) => {
        const priority = (row: any) => {
          if (row.subscriptionPlan === "hub_vendor") return 20;
          if (row.subscriptionPlan === "premium_vendor") return 10;
          if (row.subscriptionPlan === "basic_vendor") return 5;
          return 0;
        };

        const boostA = priority(a);
        const boostB = priority(b);

        if (boostA !== boostB) return boostB - boostA;

        return Number(b.confidence || 0) - Number(a.confidence || 0);
      });
    }, [matchingRows]);

    const bestOptionKey = useMemo(() => {
      return getBestOptionKey(groupedPriceRows);
    }, [groupedPriceRows]);

    const districtMarketSummary = useMemo(() => {
    return getDistrictMarketSummary(groupedPriceRows, location);
  }, [groupedPriceRows, location]);

  const predictiveProcurement = useMemo(() => {
    return getPredictiveProcurementSummary(groupedPriceRows, category);
  }, [groupedPriceRows, category]);

  const comparisonRows = useMemo(() => {
    return groupedPriceRows.slice(0, 4).map((row) => {
      const isHotBuyer =
        row.trend === "Up" ||
        Number(row.changePercent || 0) >= 3 ||
        Number(row.confidence || 0) >= 75;

      return {
        ...row,
        comparison: getComparisonLabel(row),
        isHotBuyer,
      };
    });
  }, [groupedPriceRows]);

    const multiCompareRows = useMemo(() => {
    return groupedPriceRows.map((row) => ({
      ...row,
      compareKey: `${row.category}|${row.item}|${row.location || ""}|${row.unit}`,
      comparison: getComparisonLabel(row),
      isHotBuyer: isHotBuyerRow(row),
    }));
  }, [groupedPriceRows]);

  const selectedCompareRows = useMemo(() => {
    const selected = multiCompareRows.filter((row) =>
      selectedCompareKeys.includes(row.compareKey)
    );

    return selected.length ? selected : multiCompareRows.slice(0, 3);
  }, [multiCompareRows, selectedCompareKeys]);

  function toggleCompareKey(key: string) {
    setSelectedCompareKeys((prev) => {
      if (prev.includes(key)) return prev.filter((x) => x !== key);
      if (prev.length >= 4) return [prev[1], prev[2], prev[3], key].filter(Boolean);
      return [...prev, key];
    });
  }

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

          setAiExplanationLoading((prev) => ({
            ...prev,
            [key]: false,
          }));

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

            window.clearTimeout(timeout);

            setAiExplanations((prev) => ({
              ...prev,
              [key]: explanation,
            }));

            setAiExplanationLoading((prev) => ({
              ...prev,
              [key]: false,
            }));

            // 🔥 cache in browser
            if (typeof window !== "undefined") {
              window.sessionStorage.setItem(`price-ai:${key}`, explanation);
            }

            // 🔥 DEBUG (optional)
            console.log("AI SOURCE:", json.source);
          }
        } catch {
            window.clearTimeout(timeout);

            const fallback = getMarketExplanation(row);

            setAiExplanations((prev) => ({
              ...prev,
              [key]: fallback,
            }));

            setAiExplanationLoading((prev) => ({
              ...prev,
              [key]: false,
            }));

            if (typeof window !== "undefined") {
              window.sessionStorage.setItem(`price-ai:${key}`, fallback);
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

    useEffect(() => {
    setSelectedCompareKeys([]);
  }, [category, item, brand, grade, location]);

  const listingHref = selectedCategory?.href || "/search";
  const searchText = item === "All Items" ? category : item;

  const mainMaterialCards = useMemo(() => {
    const rows = aggregatePriceRows(
      priceRows.filter((row) => row.category === "Materials")
    );

    if (!rows.length) return mainMaterials;

    const sorted = [...rows].sort((a: any, b: any) => {
      const boostA = Number(a.boost_priority || 0);
      const boostB = Number(b.boost_priority || 0);

      if (boostA !== boostB) return boostB - boostA; // 🔥 HIGH BOOST FIRST

      // fallback: higher confidence first
      const confA = Number(a.confidence || 0);
      const confB = Number(b.confidence || 0);

      return confB - confA;
    });

    return sorted.slice(0, 4).map((row) => ({
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
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", url: "https://www.3bigha.com" },
          { name: "Price Today", url: "https://www.3bigha.com/price-today" },
        ])}
      />

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
                onChange={(e) => {
                  setLocation(e.target.value);
                  setPrefillNotice("");
                }}
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
                  setPrefillNotice("");
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
                  setPrefillNotice("");
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
                  setPrefillNotice("");
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
                onChange={(e) => {
                  setGrade(e.target.value);
                  setPrefillNotice("");
                }}
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

          {prefillNotice ? (
            <div className="mt-3 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-black text-orange-800">
              ✨ {prefillNotice}
            </div>
          ) : null}
        </div>

        <div className="mt-6 rounded-3xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-blue-700">
                Level 2 Market Intelligence
              </p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">
                {districtMarketSummary.title}
              </h2>
              <p className="mt-2 text-sm font-bold text-blue-900">
                {districtMarketSummary.headline}
              </p>
              <p className="mt-1 text-sm font-semibold leading-6 text-slate-700">
                {districtMarketSummary.detail}
              </p>
            </div>

            <div className="min-w-[240px] rounded-2xl bg-white p-4 shadow-sm">
            <div className="mt-4 text-xs font-black text-slate-500">
              Next 7 Days
            </div>
            <div className="mt-1 text-sm font-black text-purple-700">
              {districtMarketSummary.prediction}
            </div>

            <div className="mt-3 text-xs font-black text-slate-500">
              Best Time Window
            </div>
            <div className="mt-1 text-sm font-black text-orange-600">
              {districtMarketSummary.timeWindow}
            </div>

            <div className="mt-3 text-xs font-black text-slate-500">
              AI Advice
            </div>
            <div className="mt-1 text-sm font-black text-emerald-700">
              {districtMarketSummary.advice}
            </div>
            <div className="text-xs font-black text-slate-500">
              Market Heat
            </div>

            <div className="mt-1 text-lg font-black text-red-600">
              {districtMarketSummary.heatLabel}
            </div>

            <div className="mt-1 text-xs font-bold text-slate-500">
              Score: {districtMarketSummary.heatScore}/100
            </div>

            <div className="mt-4 text-xs font-black text-slate-500">
              Best Action Today
            </div>

            <div className="mt-1 text-sm font-black text-emerald-700">
              {districtMarketSummary.bestAction}
            </div>

            <div className="mt-3 text-xs font-bold text-slate-500">
              Confidence
            </div>

            <div className="mt-1 text-sm font-black text-blue-700">
              {districtMarketSummary.confidenceLabel}
            </div>
          </div>
          </div>
        </div>

        <div
          id="prediction"
          className="mt-6 scroll-mt-24 rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-emerald-50 p-5 shadow-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-indigo-700">
                AI Predictive Procurement Intelligence
              </p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">
                Buy, wait or negotiate decision engine
              </h2>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-700">
                AI reads price movement, confidence, vendor count and category signals to guide procurement timing and budget risk.
              </p>
            </div>

            <div className="rounded-2xl border border-indigo-200 bg-white px-4 py-3 text-sm font-black text-indigo-700 shadow-sm">
              Procurement Score {predictiveProcurement.score}/100
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            {[
              ["Market Signal", predictiveProcurement.signal, "📊"],
              ["Budget Risk", predictiveProcurement.budgetRisk, "💰"],
              ["Demand", predictiveProcurement.demand, "📈"],
              ["Category", category, "🧭"],
            ].map(([label, value, icon]) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-xs font-black uppercase tracking-wide text-slate-500">
                  {icon} {label}
                </div>
                <div className="mt-2 text-sm font-black text-slate-950">
                  {value}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="font-black text-emerald-800">🎯 AI Action</div>
              <div className="mt-2 text-sm font-bold leading-6 text-emerald-900">
                {predictiveProcurement.action}
              </div>
            </div>

            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
              <div className="font-black text-blue-800">🧠 Procurement Recommendation</div>
              <div className="mt-2 text-sm font-bold leading-6 text-blue-900">
                {predictiveProcurement.recommendation}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={`/rfq/general/new?module=${encodeURIComponent(category.toLowerCase())}&q=${encodeURIComponent(searchText)}`}
              className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-900"
            >
              Create AI Procurement RFQ →
            </Link>

            <Link
              href={`/search?q=${encodeURIComponent(searchText)}`}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800 hover:bg-slate-50"
            >
              Search Vendors/Listings →
            </Link>

            <Link
              href="/dashboard/buyer/rfqs"
              className="rounded-2xl border border-indigo-200 bg-indigo-50 px-5 py-3 text-sm font-black text-indigo-700 hover:bg-indigo-100"
            >
              Open RFQ Command Center →
            </Link>
          </div>
        </div>

        {category === "Materials" || category === "Properties" || category === "Services" || category === "Rentals" ? (
          <div className="mt-6 rounded-3xl border border-purple-200 bg-purple-50 p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-purple-700">
                  Smart {category === "Properties" ? "Property" : category === "Services" ? "Service" : category === "Rentals" ? "Rental" : "Material"} Comparison Engine
                </p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">
                  Compare {category === "Properties" ? "property" : category === "Services" ? "service" : category === "Rentals" ? "rental" : "material"} options before decision
                </h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
                  This compares available {category === "Properties" ? "property" : category === "Services" ? "service" : category === "Rentals" ? "rental" : "material"} price signals using rate range, vendor count,
                  confidence, trend and AI price quality.
                </p>
              </div>

              <Link
                href={`/search?q=${encodeURIComponent(searchText)}`}
                className="rounded-2xl bg-purple-700 px-5 py-3 text-sm font-black text-white hover:bg-purple-800"
              >
                Search {category} →
              </Link>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {comparisonRows.length ? (
                comparisonRows.map((row) => (
                  <div
                    key={`compare-${row.item}-${row.location}-${row.unit}`}
                    className="rounded-3xl border border-purple-100 bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="text-lg font-black text-slate-950">
                          {getItemIcon(row.item, category)} {row.item}
                        </h3>
                        <p className="mt-1 text-xs font-bold text-slate-500">
                          {row.location || location || "Selected market"} • {row.unit}
                        </p>
                      </div>

                      <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-black text-purple-800">
                        {row.comparison.badge}
                      </span>
                    </div>

                    <div className="mt-3 grid gap-2 text-sm font-bold text-slate-700 sm:grid-cols-2">
                      <div className="rounded-2xl bg-slate-50 p-3">
                        Market Avg
                        <div className="text-lg font-black text-emerald-700">
                          ₹{row.avgPrice} / {row.unit}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-3">
                        Range
                        <div className="text-lg font-black text-slate-950">
                          ₹{row.priceMin} – ₹{row.priceMax}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-3">
                        Sources
                        <div className="text-lg font-black text-blue-700">
                          {row.vendorCount} vendor{row.vendorCount > 1 ? "s" : ""}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-3">
                        Confidence
                        <div className="text-lg font-black text-orange-600">
                          {row.confidence}%
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <TrendBadge trend={row.trend} changePercent={row.changePercent} />
                      <TrustBadge row={row} vendorCount={row.vendorCount} />
                      <AiPriceBadge row={row} />

                      <button
                        type="button"
                        onClick={() =>
                          toggleCompareKey(`${row.category}|${row.item}|${row.location || ""}|${row.unit}`)
                        }
                        className="rounded-full bg-purple-700 px-3 py-1 text-xs font-black text-white hover:bg-purple-800"
                      >
                        {selectedCompareKeys.includes(`${row.category}|${row.item}|${row.location || ""}|${row.unit}`)
                          ? "✓ Selected"
                          : "+ Compare"}
                      </button>
                    </div>

                    <div className="mt-3 rounded-2xl bg-purple-50 p-3 text-sm font-bold leading-6 text-purple-900">
                      <div className="font-black">{row.comparison.label}</div>
                      <div className="mt-1 text-xs font-semibold text-purple-800">
                        {row.comparison.detail}
                      </div>
                    </div>

                    {row.isHotBuyer ? (
                      <div className="mt-3 rounded-2xl bg-red-50 p-3 text-xs font-bold text-red-700">
                        ⚡ Prices are rising. Lock your deal before further increase.
                      </div>
                    ) : null}

                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => triggerPriceLead(row)}
                        className="flex-1 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white hover:bg-emerald-700"
                      >
                        {category === "Properties"
                          ? row.isHotBuyer
                            ? "🚀 Talk to Owner Now"
                            : "🔥 Check Property Deal"
                          : category === "Services"
                          ? row.isHotBuyer
                            ? "🚀 Hire Service Now"
                            : "🔥 Check Service Rate"
                          : category === "Rentals"
                          ? row.isHotBuyer
                            ? "🚀 Rent Equipment Now"
                            : "🔥 Check Rental Rate"
                          : row.isHotBuyer
                          ? "🚀 Lock Price Now"
                          : "🔥 Get Best Price Now"}
                      </button>

                      <Link
                        href={`${listingHref}?q=${encodeURIComponent(row.item)}`}
                        className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-100"
                      >
                        View {category} Listings
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-3xl bg-white p-5 text-sm font-bold text-slate-600 shadow-sm">
                  Select a {category === "Properties" ? "property" : category === "Services" ? "service" : category === "Rentals" ? "rental" : "material"} item or location to compare available market signals.
                </div>
              )}
            </div>
          </div>
        ) : null}

                {category === "Materials" || category === "Properties" || category === "Services" || category === "Rentals" ? (
          <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                  Multi-item comparison
                </p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">
                  Compare selected {category.toLowerCase()} side by side
                </h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                  Select up to 4 items from the comparison cards above. If none are selected,
                  the top 3 market signals are shown automatically.
                </p>
              </div>

              {selectedCompareKeys.length ? (
                <button
                  type="button"
                  onClick={() => setSelectedCompareKeys([])}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-100"
                >
                  Clear Selection
                </button>
              ) : null}
            </div>

            <div className="mt-4 overflow-x-auto">
              <div className="grid min-w-[760px] gap-3" style={{ gridTemplateColumns: `repeat(${Math.max(selectedCompareRows.length, 1)}, minmax(220px, 1fr))` }}>
                {selectedCompareRows.length ? (
                  selectedCompareRows.map((row) => (
                    <div
                      key={`multi-${row.compareKey}`}
                      className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="text-2xl">{getItemIcon(row.item, category)}</div>

                      <div className="mt-2 text-lg font-black text-slate-950">
                        {row.item}
                      </div>

                      <div className="mt-1 text-xs font-bold text-slate-500">
                        {row.location || location || "Selected market"} • {row.unit}
                      </div>

                      <div className="mt-3 rounded-2xl bg-white p-3">
                        <div className="text-xs font-black text-slate-500">
                          Market Average
                        </div>
                        <div className="mt-1 text-xl font-black text-emerald-700">
                          ₹{row.avgPrice}
                        </div>
                      </div>

                      <div className="mt-2 rounded-2xl bg-white p-3">
                        <div className="text-xs font-black text-slate-500">
                          Range
                        </div>
                        <div className="mt-1 text-sm font-black text-slate-900">
                          ₹{row.priceMin} – ₹{row.priceMax}
                        </div>
                      </div>

                      <div className="mt-2 rounded-2xl bg-white p-3">
                        <div className="text-xs font-black text-slate-500">
                          Confidence / Sources
                        </div>
                        <div className="mt-1 text-sm font-black text-blue-700">
                          {row.confidence}% • {row.vendorCount} source{row.vendorCount > 1 ? "s" : ""}
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <TrendBadge trend={row.trend} changePercent={row.changePercent} />
                        <AiPriceBadge row={row} />
                      </div>

                      <div className="mt-3 rounded-2xl bg-purple-50 p-3 text-xs font-bold leading-5 text-purple-900">
                        <div className="font-black">{row.comparison.label}</div>
                        <div className="mt-1">{row.comparison.detail}</div>
                      </div>

                      <button
                        type="button"
                        onClick={() => triggerPriceLead(row)}
                        className="mt-3 w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white hover:bg-emerald-700"
                      >
                        {category === "Properties"
                          ? "Talk to Owner"
                          : category === "Services"
                          ? "Hire / Enquire"
                          : category === "Rentals"
                          ? "Rent / Enquire"
                          : "Get Best Price"}
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm font-bold text-slate-600">
                    No comparison data available yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}

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

                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {bestOptionKey === makeGroupKey(row) && (
                      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-800">
                        🏆 Best Option (AI Selected)
                      </span>
                    )}
                    <h3 className="text-xl font-black text-slate-950">
                      {row.item}
                    </h3>
                    <SubscriptionBadge row={row} />
                    <AiPriceBadge row={row} />
                    <VisibilityStatusBadge row={row} />
                  </div>

                  <div className="mt-2 text-sm font-bold text-slate-700">
                    {bestOptionKey === makeGroupKey(row) && (
                      <div className="mb-2 rounded-xl bg-green-50 px-3 py-2 text-xs font-black text-green-700">
                        🤖 AI Decision: This option has the best balance of price, confidence and vendor availability.
                      </div>
                    )}

                    <div className="text-sm text-slate-600">
                      Market Avg: <b>₹{row.avgPrice}</b> / {row.unit}
                    </div>

                    <div className="text-sm text-slate-600">
                      Range: ₹{row.priceMin} – ₹{row.priceMax}
                    </div>

                    <div className="text-sm text-slate-600">
                      Sources: {row.vendorCount} vendors
                    </div>

                    <div className="text-xs font-bold text-slate-500">
                      {row.subscriptionPlan === "premium_vendor"
                        ? "⭐ Premium vendors dominate here"
                        : row.subscriptionPlan === "hub_vendor"
                        ? "🔥 Hub vendors lead this category"
                        : "Free vendors have lower visibility"}
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

                                        {(() => {
                      const prediction = getPricePredictionAI(row);

                      return (
                        <div
                          className={`mt-2 rounded-2xl px-3 py-2 text-xs font-black leading-5 ${
                            prediction.color === "red"
                              ? "bg-red-50 text-red-700"
                              : prediction.color === "green"
                              ? "bg-emerald-50 text-emerald-700"
                              : prediction.color === "blue"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          <div>🔮 Price Prediction AI: {prediction.label}</div>
                          <div className="mt-1">⏱️ {prediction.window}</div>
                          <div className="mt-1 font-bold">{prediction.reason}</div>
                        </div>
                      );
                    })()}

                    <div className="mt-2 rounded-2xl bg-blue-50 px-3 py-2 text-xs font-bold leading-5 text-blue-800">
                      <span className="flex items-center gap-1">
                        🤖 AI insight
                        {aiExplanationLoading[getAiExplanationKey(row)] && (
                          <span className="text-blue-500 text-[10px]">(updating)</span>
                        )}
                      </span>{" "}
                      {aiExplanations[getAiExplanationKey(row)]
                        ? aiExplanations[getAiExplanationKey(row)]
                        : getMarketExplanation(row)}
                    </div>
                    <div className="mt-2 text-xs font-bold text-green-700">
                      📈 High buyer activity detected in this category
                    </div>

                    {(() => {
                      const signal = getBuySignal(row);

                      const urgency =
                        row.trend === "Up" && (row.changePercent || 0) > 3
                          ? "🔥 High urgency"
                          : row.trend === "Down"
                          ? "🟢 Opportunity"
                          : "⚖️ Neutral";
                      
                      const isBestPrice =
                        row.avgPrice > 0 && row.priceMin <= row.avgPrice * 0.95;

                      const isHighTrust = row.confidence >= 70 && row.vendorCount >= 3;

                      const isOpportunity =
                        row.trend === "Down" && row.vendorCount >= 2;

                      const prediction = getPricePredictionAI(row);

                      const ctaText =
                        prediction.color === "red"
                          ? category === "Properties"
                            ? "🔥 Buy / Talk Now"
                            : category === "Rentals"
                            ? "🔥 Rent Now"
                            : category === "Services"
                            ? "🔥 Hire Now"
                            : "🔥 Buy Now"
                          : prediction.color === "green"
                          ? "💰 Negotiate Best Deal"
                          : prediction.color === "blue"
                          ? "✅ Proceed with Best Option"
                          : "🔎 Compare Before Decision";

                      return (
                        <>
                          <div
                            className={`mt-2 rounded-xl px-3 py-2 text-xs font-bold ${
                              signal.color === "green"
                                ? "bg-emerald-50 text-emerald-700"
                                : signal.color === "red"
                                ? "bg-red-50 text-red-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            📊 Smart Decision: {signal.label}
                          </div>

                          <div className="mt-2 flex flex-wrap gap-2 text-xs font-black">


                            {isHighTrust && (
                              <span className="rounded-full bg-blue-100 px-2 py-1 text-blue-700">
                                🛡️ Trusted Market
                              </span>
                            )}

                            {isOpportunity && (
                              <span className="rounded-full bg-purple-100 px-2 py-1 text-purple-700">
                                ⭐ Opportunity Zone
                              </span>
                            )}

                            {row.vendorCount >= 5 && (
                              <span className="rounded-full bg-yellow-100 px-2 py-1 text-yellow-700">
                                🏆 Top Vendor Zone
                              </span>
                            )}

                            {row.confidence >= 80 && (
                              <span className="rounded-full bg-indigo-100 px-2 py-1 text-indigo-700">
                                🛡️ High Confidence Market
                              </span>
                            )}

                            <span className="text-purple-700">
                              {urgency}
                            </span>
                          </div>

                          <div className="mt-3">
                            <button
                              className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white transition hover:bg-blue-700"
                              onClick={async () => {
                                try {
                                  const message = `Hi, I am interested in ${row.item} price ₹${row.priceMin}-${row.priceMax} in ${row.location}. Please share best offer.`;

                                  const res = await fetch("/api/conversations/ensure", {
                                    method: "POST",
                                    headers: {
                                      "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify({
                                      context_type: "price_lead",
                                      item: row.item,
                                      location: row.location,
                                      price_min: row.priceMin,
                                      price_max: row.priceMax,
                                      unit: row.unit,
                                      message,
                                      routing: "best_verified_vendor",
                                    }),
                                  });

                                  const json = await res.json();

                                  if (json?.conversationId) {
                                    window.location.href = `/dashboard/thread/${json.conversationId}`;
                                  } else {
                                    alert(json?.error || "No verified vendor found for this price lead yet.");
                                  }
                                } catch (e) {
                                  alert("Something went wrong.");
                                }
                              }}
                            >
                              {ctaText}
                            </button>
                            {String(row.subscriptionStatus || "free") !== "active" && (
                              <div className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-black leading-5 text-red-700">
                                ❌ You are NOT in top vendor matches. Buyers are choosing AI-optimized and premium vendors first.
                                <br />
                                ⚠️ Only top 2 free vendors are shown to buyers.
                                <br />
                                📉 You may be losing 3–5 potential enquiries daily.
                              </div>
                            )}
                            <button
                              onClick={() => (window.location.href = "/dashboard/subscription?focus=boost")}
                              className="mt-2 w-full rounded-xl bg-red-600 px-4 py-2 text-sm font-black text-white shadow-sm hover:bg-red-700"
                            >
                              🔥 Unlock Top Visibility
                            </button>
                          </div>
                        </>
                      );
                    })()}
                    
                  </div>

                  <div className="mt-3 text-2xl font-black text-emerald-700">
                    ₹{row.priceMin} - ₹{row.priceMax} / {row.unit}
                    <div className="mt-1 text-xs font-bold text-slate-600">
                      {row.vendorCount} vendor{row.vendorCount > 1 ? "s" : ""} contributing
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <div className="mt-4">
                      <button
                        onClick={() => triggerPriceLead(row)}
                        className="w-full rounded-2xl bg-red-600 px-4 py-3 text-sm font-black text-white hover:bg-red-700"
                      >
                        🚀 Get Best Deal Now
                      </button>
                    </div>
                    <TrendBadge trend={row.trend} changePercent={row.changePercent} />
                    <TrustBadge row={row} vendorCount={row.vendorCount} />
                    <SubscriptionBadge row={row} />
                    <AiPriceBadge row={row} />
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

                  <div className="mt-2 text-xs font-black text-purple-700">
                    {mainItem.trend === "Up"
                      ? "📈 Rising trend"
                      : mainItem.trend === "Down"
                      ? "📉 Softening market"
                      : "⚖️ Stable market"}
                  </div>
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