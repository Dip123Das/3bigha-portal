import Link from "next/link";
import { fetchBuyerQuoteCompare } from "@/lib/rfq/buyer-quote-compare/server";
import SmartDecisionBox from "./SmartDecisionBox";
import MarketplaceAiDashboard from "./MarketplaceAiDashboard";
import PricePredictionToggle from "./PricePredictionToggle";
import AIExecutionTimeline from "@/components/ai-execution/AIExecutionTimeline";
import OperationalWorkspacePanel from "@/components/operational/OperationalWorkspacePanel";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function fmtDateTime(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function fmtMoney(n?: number | null) {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  try {
    return "₹" + Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
  } catch {
    return "₹" + String(n);
  }
}

function pillStyle(tone: "neutral" | "ok" | "warn" | "bad" = "neutral") {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 10px",
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 900,
    border: "1px solid rgba(0,0,0,0.10)",
    background: "#fff",
    color: "#111827",
    whiteSpace: "nowrap",
  };

  if (tone === "ok") {
    return { ...base, borderColor: "#bbf7d0", background: "#ecfdf5", color: "#065f46" };
  }
  if (tone === "warn") {
    return { ...base, borderColor: "#fde68a", background: "#fffbeb", color: "#92400e" };
  }
  if (tone === "bad") {
    return { ...base, borderColor: "#fecaca", background: "#fef2f2", color: "#991b1b" };
  }
  return { ...base, borderColor: "#e5e7eb", background: "#ffffff", color: "#111827" };
}

function titleCase(s: string | null | undefined) {
  const t = (s ?? "").replace(/_/g, " ").trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : "—";
}

function getVendorAiSignals(v: any, bestPriceVendorId: string | null, fastestVendorId: string | null, aiRecommendedVendorId: string | null) {
  const signals: Array<{ label: string; tone: "neutral" | "ok" | "warn" | "bad" }> = [];

  const isTopCloser = Number(v.ready_deal_signals || 0) >= 3;
  const isHighWin = Number(v.win_probability || 0) > 0.7;
  const isPremium = Number(v.weighted_boost || 0) > 0;
  const isAiRecommended = aiRecommendedVendorId && String(v.vendor_id) === aiRecommendedVendorId;
  const isBestPrice = bestPriceVendorId && String(v.vendor_id) === String(bestPriceVendorId);
  const isFastest = fastestVendorId && String(v.vendor_id) === String(fastestVendorId);

  if (isAiRecommended) signals.push({ label: "Recommended", tone: "ok" });
  if (isBestPrice) signals.push({ label: "📉 Best value", tone: "ok" });
  if (isTopCloser) signals.push({ label: "🔥 Strong Response", tone: "ok" });
  if (!isTopCloser && isHighWin) signals.push({ label: "⚡ Strong Match", tone: "ok" });
  if (isPremium) signals.push({ label: "⭐ Premium", tone: "neutral" });
  if (isFastest) signals.push({ label: "🚚 Fastest", tone: "neutral" });

  return signals.slice(0, 5);
}

type AiVendorComparisonCard = {
  vendorId: string;
  quoteId: string | null;
  name: string;
  total: number | null;
  deliveryDays: number | null;
  aiScore: number;
  priceScore: number;
  deliveryScore: number;
  trustScore: number;
  riskScore: number;
  valueLabel: "Best Option" | "Lowest Price" | "Fastest Delivery" | "Trusted" | "Alternative Option";
  decision: string;
  negotiationTip: string;
  riskNote: string;
};

type AiProcurementDecisionSummary = {
  bestOverall?: AiVendorComparisonCard;
  lowestPrice?: AiVendorComparisonCard;
  fastestDelivery?: AiVendorComparisonCard;
  mostTrusted?: AiVendorComparisonCard;
  averagePrice: number | null;
  priceSpread: number | null;
  overpricedCount: number;
  negotiationLeverage: string;
  buyerAction: string;
};

type AutonomousProcurementOsDecision = {
  osScore: number;
  workflowRisk: "High" | "Medium" | "Low";
  supplierSignal: "Strong" | "Moderate" | "Weak";
  autonomousAction: string;
  autonomousReason: string;
  milestone: string;
  shortlistVendor: string;
};

type BuyerDecisionCard = {
  title: string;
  value: string;
  detail: string;
  tone: "ok" | "warn" | "bad" | "neutral";
  icon: string;
};

function buildAutonomousProcurementOsDecision(args: {
  rfq: any;
  vendors: any[];
  best?: AiVendorComparisonCard;
  priceSpread: number | null;
  overpricedCount: number;
}) {
  const status = String(args.rfq?.status || "").toLowerCase();
  const vendorCount = args.vendors.length;
  const bestScore = Number(args.best?.aiScore || 0);
  const isClosed = status === "closed";

  const osScore = Math.max(
    1,
    Math.min(
      100,
      Math.round(
        bestScore * 0.55 +
          Math.min(100, vendorCount * 18) * 0.25 +
          (args.priceSpread != null && args.priceSpread >= 15 ? 12 : 6) -
          args.overpricedCount * 4
      )
    )
  );

  const workflowRisk: AutonomousProcurementOsDecision["workflowRisk"] =
    isClosed
      ? "Low"
      : vendorCount === 0 || !args.best
        ? "High"
        : args.priceSpread != null && args.priceSpread >= 25
          ? "Medium"
          : "Low";

  const supplierSignal: AutonomousProcurementOsDecision["supplierSignal"] =
    bestScore >= 78 ? "Strong" : bestScore >= 58 ? "Moderate" : "Weak";

  const milestone =
    isClosed
      ? "Closed"
      : vendorCount === 0
        ? "Waiting for vendor responses"
        : bestScore >= 78
          ? "Shortlist and negotiate"
          : "Compare additional vendors";

  const autonomousAction =
    isClosed
      ? "Archive this RFQ as completed and use it as procurement learning data."
      : vendorCount === 0
        ? "Send follow-up or expand supplier search."
        : bestScore >= 78 && args.best
          ? `Shortlist ${args.best.name}, negotiate final delivery/payment terms, then accept.`
          : "Compare at least 2–3 vendors before making a final decision.";

  const autonomousReason =
    workflowRisk === "High"
      ? "This RFQ has low vendor response or missing quote data, which can block procurement execution."
      : workflowRisk === "Medium"
        ? "There is meaningful price/risk variation, so negotiation should happen before acceptance."
        : "RFQ has enough signals for controlled execution.";

  return {
    osScore,
    workflowRisk,
    supplierSignal,
    autonomousAction,
    autonomousReason,
    milestone,
    shortlistVendor: args.best?.name || "—",
  } as AutonomousProcurementOsDecision;
}

function osToneStyle(level: "High" | "Medium" | "Low" | "Strong" | "Moderate" | "Weak"): React.CSSProperties {
  if (level === "High") return pillStyle("bad");
  if (level === "Medium" || level === "Moderate") return pillStyle("warn");
  if (level === "Strong" || level === "Low") return pillStyle("ok");
  return pillStyle("neutral");
}

function decisionCardStyle(tone: BuyerDecisionCard["tone"]): React.CSSProperties {
  if (tone === "ok") {
    return {
      border: "1px solid #bbf7d0",
      background: "#ffffff",
      color: "#14532d",
    };
  }

  if (tone === "warn") {
    return {
      border: "1px solid #fde68a",
      background: "#ffffff",
      color: "#78350f",
    };
  }

  if (tone === "bad") {
    return {
      border: "1px solid #fecaca",
      background: "#ffffff",
      color: "#7f1d1d",
    };
  }

  return {
    border: "1px solid #e2e8f0",
    background: "#ffffff",
    color: "#0f172a",
  };
}

function actionBtnStyle(kind: "talk" | "normal" | "accept" = "normal"): React.CSSProperties {
  if (kind === "talk") {
    return {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      minHeight: 38,
      padding: "0 14px",
      borderRadius: 12,
      border: "1px solid #86efac",
      background: "#ffffff",
      color: "#166534",
      fontWeight: 900,
      textDecoration: "none",
      boxShadow: "0 4px 14px rgba(22,101,52,0.10)",
    };
  }

  if (kind === "accept") {
    return {
      height: 38,
      padding: "0 14px",
      borderRadius: 12,
      border: "1px solid rgba(0,0,0,0.12)",
      background: "#fff",
      fontWeight: 900,
      cursor: "pointer",
    };
  }

  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 38,
    padding: "0 14px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "#fff",
    fontWeight: 900,
    textDecoration: "none",
    color: "#111827",
  };
}

export default async function BuyerQuoteComparePage({
  params,
  searchParams,
}: {
  params: { rfqId: string };
  searchParams?: { accepted?: string };
}) {
  const rfqId = decodeURIComponent(params.rfqId);

  if (!UUID_RE.test(rfqId)) {
    return (
      <main style={{ padding: 12 }}>
        <h1 style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>Invalid RFQ ID</h1>
        <div style={{ marginTop: 10 }}>
          <Link href="/dashboard/buyer/rfqs" style={{ fontWeight: 900 }}>
            ← Back to My RFQs
          </Link>
        </div>
      </main>
    );
  }

  const res = await fetchBuyerQuoteCompare(rfqId);

  if (res.error) {
    return (
      <main style={{ padding: 14, maxWidth: 1100, margin: "0 auto" }}>
        <div
          style={{
            border: "1px solid #fecaca",
            background: "#fef2f2",
            padding: 14,
            borderRadius: 12,
            color: "#991b1b",
            fontWeight: 900,
          }}
        >
          {res.error}
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/dashboard/buyer/rfqs" style={{ fontWeight: 900 }}>
            ← Back to My RFQs
          </Link>
          <Link href="/dashboard" style={{ fontWeight: 900 }}>
            Dashboard →
          </Link>
        </div>
      </main>
    );
  }

  const rfq: any = res.rfq as any;
  const items = res.items ?? [];
  const vendors = res.vendors ?? [];
  const quoteItems = res.quoteItems ?? [];
  const selectedVendor = "selectedVendor" in res ? (res as any).selectedVendor ?? null : null;

  const byQuote: Record<string, Record<string, any>> = {};
  for (const qi of quoteItems as any[]) {
    const qid = String((qi as any).quote_id);
    const iid = String((qi as any).rfq_item_id);
    if (!byQuote[qid]) byQuote[qid] = {};
    byQuote[qid][iid] = qi;
  }

  const vendorsSorted = [...vendors].sort((a: any, b: any) => {
    const ga = a.grand_total == null ? Number.POSITIVE_INFINITY : Number(a.grand_total);
    const gb = b.grand_total == null ? Number.POSITIVE_INFINITY : Number(b.grand_total);
    if (ga !== gb) return ga - gb;
    const ta = a.updated_at ? new Date(a.updated_at).getTime() : 0;
    const tb = b.updated_at ? new Date(b.updated_at).getTime() : 0;
    return tb - ta;
  });

  const module = rfq?.module ?? null;
  const subjectType =
    module === "materials"
      ? "Material"
      : module === "services"
      ? "Service"
      : module === "rentals"
      ? "Rental"
      : module === "property"
      ? "Property"
      : titleCase(module);

  const rfqNo = rfq?.public_id ?? rfqId.slice(0, 8);

  const acceptedQuoteId = (rfq?.meta as any)?.accepted_quote_id ?? null;
  const acceptedVendorId = (rfq?.meta as any)?.accepted_vendor_id ?? null;
  const acceptedAt = (rfq?.meta as any)?.accepted_at ?? null;

  const priced = vendorsSorted.filter((v: any) => v?.grand_total != null && Number.isFinite(Number(v.grand_total)));
  const bestPriceVendorId = priced.length ? String(priced[0].vendor_id) : null;

  const byDelivery = vendorsSorted
    .filter((v: any) => v?.delivery_days != null && Number.isFinite(Number(v.delivery_days)))
    .sort((a: any, b: any) => Number(a.delivery_days) - Number(b.delivery_days));
  const fastestVendorId = byDelivery.length ? String(byDelivery[0].vendor_id) : null;

  const showAcceptedBanner = String(searchParams?.accepted ?? "") === "1";

  const aiRecommendedVendor: any =
    vendorsSorted.length > 0
      ? [...vendorsSorted].sort((a: any, b: any) => {
          const aScore =
            Number(a.ready_deal_signals || 0) * 30 +
            Number(a.win_probability || 0) * 40 +
            Number(a.weighted_boost || 0);

          const bScore =
            Number(b.ready_deal_signals || 0) * 30 +
            Number(b.win_probability || 0) * 40 +
            Number(b.weighted_boost || 0);

          if (bScore !== aScore) return bScore - aScore;

          const ga = a.grand_total == null ? Number.POSITIVE_INFINITY : Number(a.grand_total);
          const gb = b.grand_total == null ? Number.POSITIVE_INFINITY : Number(b.grand_total);

          return ga - gb;
        })[0]
      : null;

  const aiRecommendedVendorId = aiRecommendedVendor?.vendor_id
    ? String(aiRecommendedVendor.vendor_id)
    : null;

    const aiVendorComparisonCards: AiVendorComparisonCard[] = vendorsSorted.map((v: any) => {
    const total = v.grand_total == null || !Number.isFinite(Number(v.grand_total)) ? null : Number(v.grand_total);
    const deliveryDays =
      v.delivery_days == null || !Number.isFinite(Number(v.delivery_days)) ? null : Number(v.delivery_days);

    const lowestPrice = priced[0]?.grand_total != null ? Number(priced[0].grand_total) : null;
    const fastestDays = byDelivery[0]?.delivery_days != null ? Number(byDelivery[0].delivery_days) : null;

    const priceScore =
      total != null && lowestPrice != null && lowestPrice > 0
        ? Math.max(20, Math.min(100, Math.round((lowestPrice / total) * 100)))
        : 55;

    const deliveryScore =
      deliveryDays != null && fastestDays != null && fastestDays > 0
        ? Math.max(20, Math.min(100, Math.round((fastestDays / deliveryDays) * 100)))
        : 55;

    const trustScore = Math.max(
      35,
      Math.min(
        100,
        Math.round(
          Number(v.trust_score || 0) ||
            Number(v.ai_score || 0) ||
            Number(v.win_probability || 0) * 100 ||
            55
        )
      )
    );

    const riskScore = Math.max(
      0,
      Math.min(100, Math.round(Number(v.risk_score || 0)))
    );

    const signalScore =
      Number(v.ready_deal_signals || 0) * 8 +
      Number(v.win_probability || 0) * 28 +
      Number(v.weighted_boost || 0) * 0.4;

    const aiScore = Math.max(
      1,
      Math.min(
        100,
        Math.round(priceScore * 0.32 + deliveryScore * 0.22 + trustScore * 0.30 + signalScore - riskScore * 0.12)
      )
    );

    const isLowest = bestPriceVendorId && String(v.vendor_id) === String(bestPriceVendorId);
    const isFastest = fastestVendorId && String(v.vendor_id) === String(fastestVendorId);
    const isRecommended = aiRecommendedVendorId && String(v.vendor_id) === String(aiRecommendedVendorId);

    const valueLabel: AiVendorComparisonCard["valueLabel"] =
      isRecommended
        ? "Best Option"
        : isLowest
          ? "Lowest Price"
          : isFastest
            ? "Fastest Delivery"
            : trustScore >= 75
              ? "Trusted"
              : "Alternative Option";

    const decision =
      aiScore >= 78
        ? "Strong shortlist option with balanced pricing, delivery and reliability."
        : aiScore >= 58
          ? "Good comparison option. Negotiate before deciding."
          : "Keep as an alternative option if needed.";

    const negotiationTip =
      total != null && priced.length > 1 && total > Number(priced[0]?.grand_total || total)
        ? `Use the lower quote ${fmtMoney(priced[0]?.grand_total)} as negotiation leverage.`
        : deliveryDays != null && fastestDays != null && deliveryDays > fastestDays
          ? `Ask vendor to reduce delivery time closer to ${fastestDays} days.`
          : "Ask vendor to confirm final price, delivery charges, GST invoice and payment terms.";

    const riskNote =
      riskScore >= 60
        ? "Carefully verify vendor details, pricing and delivery commitment before accepting."
        : riskScore >= 30
          ? "Confirm hidden charges and final delivery terms."
          : "Lower visible workflow risk based on current vendor signals.";

    return {
      vendorId: String(v.vendor_id ?? ""),
      quoteId: v.quote_id ? String(v.quote_id) : null,
      name:
        v.vendor_business_name ??
        (v.vendor_id ? `Vendor ${String(v.vendor_id).slice(0, 8)}…` : "Vendor"),
      total,
      deliveryDays,
      aiScore,
      priceScore,
      deliveryScore,
      trustScore,
      riskScore,
      valueLabel,
      decision,
      negotiationTip,
      riskNote,
    };
  });

  const aiComparisonSorted = [...aiVendorComparisonCards].sort((a, b) => b.aiScore - a.aiScore);

  const lowestPriceCard =
    aiVendorComparisonCards.find((x) => bestPriceVendorId && x.vendorId === String(bestPriceVendorId)) ??
    aiComparisonSorted[0];

  const fastestDeliveryCard =
    aiVendorComparisonCards.find((x) => fastestVendorId && x.vendorId === String(fastestVendorId)) ??
    aiComparisonSorted[0];

  const mostTrustedCard =
    [...aiVendorComparisonCards].sort((a, b) => b.trustScore - a.trustScore)[0];

  const averagePrice =
    priced.length > 0
      ? Math.round(priced.reduce((sum: number, v: any) => sum + Number(v.grand_total || 0), 0) / priced.length)
      : null;

  const lowestPrice = priced[0]?.grand_total != null ? Number(priced[0].grand_total) : null;
  const highestPrice = priced[priced.length - 1]?.grand_total != null ? Number(priced[priced.length - 1].grand_total) : null;

  const priceSpread =
    lowestPrice != null && highestPrice != null && lowestPrice > 0
      ? Math.round(((highestPrice - lowestPrice) / lowestPrice) * 100)
      : null;

  const overpricedCount =
    averagePrice != null
      ? priced.filter((v: any) => Number(v.grand_total || 0) > averagePrice * 1.15).length
      : 0;

  const aiProcurementDecision: AiProcurementDecisionSummary = {
    bestOverall: aiComparisonSorted[0],
    lowestPrice: lowestPriceCard,
    fastestDelivery: fastestDeliveryCard,
    mostTrusted: mostTrustedCard,
    averagePrice,
    priceSpread,
    overpricedCount,
    negotiationLeverage:
      priceSpread != null && priceSpread >= 20
        ? `There is a ${priceSpread}% gap between lowest and highest quote. Use this gap for negotiation.`
        : priceSpread != null
          ? `Price gap is ${priceSpread}%, so compare delivery, trust and hidden charges before deciding.`
          : "Need more priced quotes to calculate strong negotiation leverage.",
    buyerAction:
      aiComparisonSorted.length === 0
        ? "Wait for vendor responses or follow up with matched vendors."
        : aiComparisonSorted[0].aiScore >= 78
          ? `Shortlist ${aiComparisonSorted[0].name} and negotiate final delivery/payment terms.`
          : "Compare at least 2–3 vendors before accepting.",
  };

  const autonomousOsDecision = buildAutonomousProcurementOsDecision({
    rfq,
    vendors: vendorsSorted,
    best: aiProcurementDecision.bestOverall,
    priceSpread: aiProcurementDecision.priceSpread,
    overpricedCount: aiProcurementDecision.overpricedCount,
  });

  const buyerDecisionConfidence =
    aiProcurementDecision.bestOverall?.aiScore != null
      ? Math.max(
          1,
          Math.min(
            100,
            Math.round(
              aiProcurementDecision.bestOverall.aiScore * 0.72 +
                autonomousOsDecision.osScore * 0.28 -
                (autonomousOsDecision.workflowRisk === "High" ? 10 : autonomousOsDecision.workflowRisk === "Medium" ? 4 : 0)
            )
          )
        )
      : 0;

  const buyerDecisionCards: BuyerDecisionCard[] = [
    {
      title: "Decision Readiness",
      value: buyerDecisionConfidence ? `${buyerDecisionConfidence}/100` : "Waiting",
      detail:
        buyerDecisionConfidence >= 80
          ? "This RFQ has enough vendor activity for a confident decision."
          : buyerDecisionConfidence >= 55
            ? "Negotiation and comparison are recommended before acceptance."
            : "Wait for more quotes or stronger vendor responses.",
      tone: buyerDecisionConfidence >= 80 ? "ok" : buyerDecisionConfidence >= 55 ? "warn" : "bad",
      icon: "🧠",
    },
    {
      title: "Suggested Next Step",
      value: aiProcurementDecision.bestOverall?.name || "No shortlist yet",
      detail: aiProcurementDecision.buyerAction,
      tone: Number(aiProcurementDecision.bestOverall?.aiScore || 0) >= 78 ? "ok" : "warn",
      icon: "✅",
    },
    {
      title: "Negotiation Leverage",
      value: aiProcurementDecision.priceSpread != null ? `${aiProcurementDecision.priceSpread}% spread` : "Limited",
      detail: aiProcurementDecision.negotiationLeverage,
      tone:
        aiProcurementDecision.priceSpread != null && aiProcurementDecision.priceSpread >= 20
          ? "ok"
          : aiProcurementDecision.priceSpread != null
            ? "warn"
            : "neutral",
      icon: "🤝",
    },
    {
      title: "Work Status",
      value: autonomousOsDecision.workflowRisk,
      detail: autonomousOsDecision.autonomousReason,
      tone:
        autonomousOsDecision.workflowRisk === "Low"
          ? "ok"
          : autonomousOsDecision.workflowRisk === "Medium"
            ? "warn"
            : "bad",
      icon: "🚦",
    },
  ];

  const buyerPrintHref = `/dashboard/buyer/quote-compare/${encodeURIComponent(rfqId)}/print`;

  const smartDecisionPayload = {
    rfqId,
    rfq,
    quote: aiRecommendedVendor || priced[0] || null,
    module,
    category: subjectType,
    city: rfq?.city ?? null,
    locality: rfq?.locality ?? null,
    district: rfq?.district ?? null,
    pincode: rfq?.pincode ?? null,
    buyerIntent: rfq?.description ?? rfq?.title ?? null,
    urgency: (rfq?.meta as any)?.urgency ?? null,
    budget: (rfq?.meta as any)?.budget ?? null,
    items,
    vendors: vendorsSorted.map((v: any) => ({
      id: v.vendor_id,
      vendorId: v.vendor_id,
      vendor_id: v.vendor_id,
      quote_id: v.quote_id,
      name: v.vendor_business_name,
      business_name: v.vendor_business_name,
      vendor_business_name: v.vendor_business_name,
      price: v.grand_total,
      quoted_price: v.grand_total,
      grand_total: v.grand_total,
      subtotal: v.subtotal,
      gst_amount: v.gst_amount,
      city: v.vendor_city,
      locality: v.vendor_locality,
      delivery_days: v.delivery_days,
      valid_till: v.valid_till,
      ready_deal_signals: v.ready_deal_signals,
      win_probability: v.win_probability,
      weighted_boost: v.weighted_boost,
      risk_score: v.risk_score,
      ai_score: v.ai_score,
      trust_score: v.trust_score,
    })),
    priceData: {
      lowestQuote: priced[0]?.grand_total ?? null,
      highestQuote: priced[priced.length - 1]?.grand_total ?? null,
      averagePrice:
        priced.length > 0
          ? Math.round(
              priced.reduce((sum: number, v: any) => sum + Number(v.grand_total || 0), 0) /
                priced.length
            )
          : null,
    },
  };

  return (
    <main style={{ padding: 14, maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>Vendor Comparison Workspace</h1>
          <div style={{ marginTop: 6, opacity: 0.8 }}>
            Compare vendor quotations, delivery timelines, trust level and next steps before making a final decision.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <Link href="/dashboard/buyer/rfqs" style={{ fontWeight: 900 }}>
            ← My RFQs
          </Link>
          <Link href="/dashboard" style={{ fontWeight: 900 }}>
            Dashboard →
          </Link>
        </div>
      </div>

      {showAcceptedBanner ? (
        <div
          style={{
            marginTop: 14,
            border: "1px solid #bbf7d0",
            background: "#ecfdf5",
            padding: 12,
            borderRadius: 12,
            color: "#065f46",
            fontWeight: 900,
          }}
        >
          ✅ Quote accepted successfully. RFQ has been closed.
        </div>
      ) : null}

      <div
        style={{
          marginTop: 14,
          padding: 14,
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          background: "#fff",
        }}
      >
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <span style={pillStyle("neutral")}>RFQ #{rfqNo}</span>
          <span style={pillStyle(rfq?.status === "open" ? "ok" : "neutral")}>{titleCase(rfq?.status ?? "—")}</span>
          <span style={pillStyle("neutral")}>{subjectType}</span>
          <span style={pillStyle("neutral")}>Revision: {rfq?.revision_no ?? 1}</span>
          <span style={pillStyle("neutral")}>Vendors: {vendorsSorted.length}</span>
          {acceptedQuoteId ? <span style={pillStyle("ok")}>Accepted</span> : null}
        </div>

        <div style={{ marginTop: 10, display: "grid", gap: 6, fontSize: 13 }}>
          <div>
            <strong>Buyer:</strong> {rfq?.contact_name ?? "—"}
          </div>
          <div>
            <strong>Location:</strong>{" "}
            {[(rfq?.locality ?? "").trim(), (rfq?.city ?? "").trim(), (rfq?.district ?? "").trim()]
              .filter(Boolean)
              .join(", ") || "—"}
            {rfq?.pincode ? `, ${rfq.pincode}` : ""}
          </div>
          <div>
            <strong>Created:</strong> {fmtDateTime(rfq?.created_at)} <span style={{ opacity: 0.7 }}>•</span>{" "}
            <strong>Updated:</strong> {fmtDateTime(rfq?.updated_at)}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <OperationalWorkspacePanel
          title="Vendor Comparison Workspace"
          nextAction={aiProcurementDecision.buyerAction}
          status={`Vendors: ${vendorsSorted.length} • Confidence: ${buyerDecisionConfidence || "—"}/100`}
          actions={[
            aiProcurementDecision.bestOverall?.vendorId
              ? {
                  label: "Negotiate Best Vendor",
                  href: `/dashboard/buyer/quote-compare/${encodeURIComponent(rfqId)}/chat?vendorId=${encodeURIComponent(
                    aiProcurementDecision.bestOverall.vendorId
                  )}`,
                  tone: "primary",
                }
              : { label: "Wait for Quotes", href: "/dashboard/inbox-v2?module=rfq", tone: "warning" },
            { label: "Print Compare", href: buyerPrintHref, tone: "neutral" },
            { label: "Open Inbox", href: "/dashboard/inbox-v2?module=rfq", tone: "neutral" },
            { label: "My RFQs", href: "/dashboard/buyer/rfqs", tone: "neutral" },
          ]}
        />
      </div>

      <div
        style={{
          marginTop: 16,
          padding: 14,
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          background: "#ffffff",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, color: "#111827" }}>
              What to do now
            </div>
            <div style={{ marginTop: 4, color: "#475569", fontSize: 13, fontWeight: 750 }}>
              {aiProcurementDecision.buyerAction}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span style={pillStyle("neutral")}>
              Vendors: {vendorsSorted.length}
            </span>
            <span style={pillStyle(buyerDecisionConfidence >= 80 ? "ok" : buyerDecisionConfidence >= 55 ? "warn" : "neutral")}>
              Readiness: {buyerDecisionConfidence || "—"}/100
            </span>
            {aiProcurementDecision.priceSpread != null ? (
              <span style={pillStyle("neutral")}>
                Price gap: {aiProcurementDecision.priceSpread}%
              </span>
            ) : null}
          </div>
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {aiProcurementDecision.bestOverall?.vendorId ? (
            <Link
              href={`/dashboard/buyer/quote-compare/${encodeURIComponent(rfqId)}/chat?vendorId=${encodeURIComponent(
                aiProcurementDecision.bestOverall.vendorId
              )}`}
              style={actionBtnStyle("talk")}
            >
              💬 Start Discussion
            </Link>
          ) : null}

          <Link href={buyerPrintHref} style={actionBtnStyle("normal")}>
            🖨️ Print Compare
          </Link>

          <Link href="/dashboard/inbox-v2?module=rfq" style={actionBtnStyle("normal")}>
            Open Inbox
          </Link>
        </div>
      </div>

      {selectedVendor ? (
        <div
          style={{
            marginTop: 18,
            padding: 14,
            border: "1px solid #bbf7d0",
            background: "#ecfdf5",
            borderRadius: 12,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 900, color: "#065f46", marginBottom: 6 }}>
                SELECTED VENDOR SUMMARY
              </div>
              <div style={{ fontSize: 18, fontWeight: 900 }}>
                {selectedVendor.vendor_business_name ??
                  (selectedVendor.vendor_id ? `Vendor ${String(selectedVendor.vendor_id).slice(0, 8)}…` : "Vendor")}
              </div>
              <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span style={pillStyle("ok")}>Winner</span>
                <span style={pillStyle("ok")}>Accepted</span>
                <span style={pillStyle("neutral")}>v{selectedVendor.version ?? "—"}</span>
                {acceptedAt ? <span style={pillStyle("neutral")}>Accepted at: {fmtDateTime(acceptedAt)}</span> : null}
              </div>
              <div style={{ marginTop: 8, fontSize: 13, opacity: 0.85 }}>
                📍 {[selectedVendor.vendor_locality, selectedVendor.vendor_city].filter(Boolean).join(", ") || "—"}
              </div>
            </div>

            <div style={{ textAlign: "right", minWidth: 220 }}>
              <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>Final Total</div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{fmtMoney(selectedVendor.grand_total)}</div>
              <div style={{ marginTop: 6, fontSize: 13 }}>
                Delivery: <strong>{selectedVendor.delivery_days ?? "—"}</strong> days
              </div>
              <div style={{ marginTop: 4, fontSize: 13 }}>
                Valid till: <strong>{selectedVendor.valid_till ?? "—"}</strong>
              </div>

              <div style={{ marginTop: 12, display: "grid", gap: 8, justifyItems: "end" }}>
                <Link
                  href={`/dashboard/buyer/quote-compare/${encodeURIComponent(rfqId)}/chat?vendorId=${encodeURIComponent(
                    String(selectedVendor.vendor_id ?? "")
                  )}`}
                  style={actionBtnStyle("talk")}
                >
                  💬 Talk to Vendor
                </Link>

                <Link
                  href={buyerPrintHref}
                  target="_blank"
                  style={actionBtnStyle("normal")}
                >
                  🧾 Download Quote
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div style={{ marginTop: 14 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>
          Vendor Comparison
        </h2>

        <div style={{ marginTop: 4, fontSize: 13, color: "#64748b" }}>
          Compare vendors quickly before starting discussion or accepting quotation.
        </div>

        {vendorsSorted.length === 0 ? (
          <div style={{ marginTop: 10, opacity: 0.75 }}>No vendor responses yet.</div>
        ) : (
          <div style={{ marginTop: 10, overflowX: "auto", background: "#ffffff" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e5e7eb", background: "#fafafa" }}>
                  <th style={{ textAlign: "left", padding: 10 }}>Vendor</th>
                  <th style={{ textAlign: "left", padding: 10 }}>Match</th>
                  <th style={{ textAlign: "left", padding: 10 }}>Price</th>
                  <th style={{ textAlign: "left", padding: 10 }}>Delivery</th>
                  <th style={{ textAlign: "left", padding: 10 }}>Action</th>
                </tr>
              </thead>

              <tbody>
                {vendorsSorted.map((v: any) => {
                  const name =
                    v.vendor_business_name ??
                    (v.vendor_id ? `Vendor ${String(v.vendor_id).slice(0, 8)}…` : "Vendor");

                  const isAccepted =
                    (acceptedVendorId && String(acceptedVendorId) === String(v.vendor_id)) ||
                    (acceptedQuoteId && String(acceptedQuoteId) === String(v.quote_id));

                  const isTopCloser = Number(v.ready_deal_signals || 0) >= 3;
                  const isHighWin = Number(v.win_probability || 0) > 0.7;
                  const isPremium = Number(v.weighted_boost || 0) > 0;

                  const isBestPrice = bestPriceVendorId && String(v.vendor_id) === String(bestPriceVendorId);
                  const isFastest = fastestVendorId && String(v.vendor_id) === String(fastestVendorId);

                  const rfqClosed = String(rfq?.status ?? "") === "closed";
                  const talkHref = `/dashboard/buyer/quote-compare/${encodeURIComponent(
                    rfqId
                  )}/chat?vendorId=${encodeURIComponent(String(v.vendor_id ?? ""))}`;

                  return (
                    <tr
                      key={v.vendor_id}
                      style={{
                        borderBottom: "1px solid #f3f4f6",
                        background:
                          aiRecommendedVendorId && String(v.vendor_id) === aiRecommendedVendorId
                            ? "#eff6ff"
                            : "transparent",
                      }}
                    >
                      <td style={{ padding: 10, fontWeight: 900 }}>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                          <span>{name}</span>

                          {getVendorAiSignals(v, bestPriceVendorId, fastestVendorId, aiRecommendedVendorId).map(
                            (signal, idx) => (
                              <span key={idx} style={pillStyle(signal.tone)}>
                                {signal.label}
                              </span>
                            )
                          )}
                          {isAccepted ? <span style={pillStyle("ok")}>Accepted</span> : null}
                        </div>
                      </td>
                      <td style={{ padding: 10 }}>
                        {(() => {
                          const card = aiVendorComparisonCards.find((x) => x.vendorId === String(v.vendor_id));
                          if (!card) return <span style={{ opacity: 0.6 }}>—</span>;

                          const tone = card.aiScore >= 78 ? "ok" : card.aiScore >= 58 ? "warn" : "bad";

                          return (
                            <div style={{ display: "grid", gap: 5 }}>
                              <span style={pillStyle(tone)}>Match {card.aiScore}/100</span>
                              <span style={{ fontSize: 12, color: "#475569", fontWeight: 800 }}>
                                {card.valueLabel}
                              </span>
                            </div>
                          );
                        })()}
                      </td>
                      <td style={{ padding: 10 }}>{fmtMoney(v.grand_total)}</td>
                      <td style={{ padding: 10 }}>{v.delivery_days != null ? `${v.delivery_days} days` : "—"}</td>
                      <td style={{ padding: 10 }}>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <Link href={talkHref} style={actionBtnStyle("talk")}>
                            💬 Talk to Vendor
                          </Link>

                          {isAccepted ? (
                            <span style={pillStyle("ok")}>Accepted</span>
                          ) : rfqClosed ? (
                            <span style={pillStyle("neutral")}>Closed</span>
                          ) : (
                            <form
                              action={`/api/buyer/rfq/${encodeURIComponent(rfqId)}/accept`}
                              method="post"
                              style={{ display: "inline-flex" }}
                            >
                              <input type="hidden" name="quote_id" value={String(v.quote_id)} />
                              <button type="submit" style={actionBtnStyle("accept")}>
                                Accept
                              </button>
                            </form>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ marginTop: 18 }}>
        <h2 style={{ fontSize: 16, fontWeight: 900, margin: 0 }}>RFQ Items</h2>

        {items.length === 0 ? (
          <div style={{ marginTop: 10, opacity: 0.75 }}>No items found for this RFQ.</div>
        ) : (
          <div style={{ marginTop: 10, overflowX: "auto", background: "#ffffff" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e5e7eb", background: "#fafafa" }}>
                  <th style={{ textAlign: "left", padding: 10 }}>#</th>
                  <th style={{ textAlign: "left", padding: 10 }}>Item</th>
                  <th style={{ textAlign: "left", padding: 10 }}>Description</th>
                  <th style={{ textAlign: "center", padding: 10 }}>Qty</th>
                  <th style={{ textAlign: "center", padding: 10 }}>UOM</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it: any, idx: number) => (
                  <tr key={it.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: 10, fontWeight: 900 }}>{it.line_no ?? idx + 1}</td>
                    <td style={{ padding: 10, fontWeight: 800 }}>{it.title ?? "—"}</td>
                    <td style={{ padding: 10, color: "#374151" }}>{it.description ?? "—"}</td>
                    <td style={{ padding: 10, textAlign: "center" }}>{it.qty ?? "—"}</td>
                    <td style={{ padding: 10, textAlign: "center" }}>{it.uom ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ marginTop: 18 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>
          Vendor Responses
        </h2>

        {vendorsSorted.length === 0 ? (
          <div style={{ marginTop: 10, opacity: 0.75 }}>No quotes received yet.</div>
        ) : (
          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            {vendorsSorted.map((v: any) => {
              const outdated = !!v.is_outdated;
              const tone = outdated ? "warn" : "ok";
              const name =
                v.vendor_business_name ?? (v.vendor_id ? `Vendor ${String(v.vendor_id).slice(0, 8)}…` : "Vendor");
              const place = [v.vendor_locality, v.vendor_city].filter(Boolean).join(", ");

              const isAccepted =
                (acceptedVendorId && String(acceptedVendorId) === String(v.vendor_id)) ||
                (acceptedQuoteId && String(acceptedQuoteId) === String(v.quote_id));

              const isTopCloser = Number(v.ready_deal_signals || 0) >= 3;
              const isHighWin = Number(v.win_probability || 0) > 0.7;
              const isPremium = Number(v.weighted_boost || 0) > 0;

              const talkHref = v.conversation_id
                ? `/dashboard/thread/${encodeURIComponent(v.conversation_id)}`
                : `/dashboard/thread/${encodeURIComponent(rfqId)}`;

              return (
                <div
                  key={v.vendor_id}
                  style={{
                    border: "1px solid rgba(0,0,0,0.12)",
                    borderRadius: 12,
                    padding: 12,
                    background: "#fff",
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  <div style={{ minWidth: 260 }}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <span style={pillStyle(isAccepted ? "ok" : tone)}>
                        {isAccepted ? "accepted" : outdated ? "outdated (needs revision)" : "latest"}
                      </span>
                      <span style={pillStyle("neutral")}>v{v.version ?? "—"}</span>
                      <span style={pillStyle("neutral")}>{titleCase(v.status ?? "—")}</span>
                      <span style={pillStyle("neutral")}>{fmtDateTime(v.updated_at ?? v.created_at)}</span>
                    </div>

                    <div style={{ marginTop: 8, fontWeight: 900 }}>
                      {name}
                    </div>

                    <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {getVendorAiSignals(v, bestPriceVendorId, fastestVendorId, aiRecommendedVendorId).map(
                        (signal, idx) => (
                          <span key={idx} style={pillStyle(signal.tone)}>
                            {signal.label}
                          </span>
                        )
                      )}
                    </div>
                    <div style={{ marginTop: 4, fontSize: 13, opacity: 0.8 }}>{place ? `📍 ${place}` : null}</div>
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 900 }}>Grand Total</div>
                      <div style={{ fontSize: 18, fontWeight: 800 }}>{fmtMoney(v.grand_total)}</div>
                      <div style={{ fontSize: 12, opacity: 0.8 }}>
                        GST: {fmtMoney(v.gst_amount)} • Subtotal: {fmtMoney(v.subtotal)}
                      </div>
                    </div>

                    <div style={{ display: "grid", gap: 6 }}>
                      <div style={{ fontSize: 12, opacity: 0.8 }}>
                        Delivery: <strong>{v.delivery_days ?? "—"}</strong> days
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.8 }}>
                        Valid till: <strong>{v.valid_till ?? "—"}</strong>
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.8 }}>
                        GST mode: <strong>{titleCase(v.gst_mode ?? "—")}</strong> • Rate:{" "}
                        <strong>{v.gst_rate ?? "—"}%</strong>
                      </div>
                    </div>

                    <div style={{ display: "grid", gap: 8 }}>
                      <Link href={talkHref} style={actionBtnStyle("talk")}>
                        💬 Talk to Vendor
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ marginTop: 18 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>
          Item-wise Comparison
        </h2>

        {items.length === 0 || vendorsSorted.length === 0 ? (
          <div style={{ marginTop: 10, opacity: 0.75 }}>Nothing to compare yet.</div>
        ) : (
          <div style={{ marginTop: 10, overflowX: "auto", background: "#ffffff" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e5e7eb", background: "#fafafa" }}>
                  <th style={{ textAlign: "left", padding: 10, minWidth: 260 }}>Item</th>
                  {vendorsSorted.map((v: any) => {
                    const name =
                      v.vendor_business_name ?? (v.vendor_id ? `Vendor ${String(v.vendor_id).slice(0, 8)}…` : "Vendor");
                    return (
                      <th key={v.vendor_id} style={{ textAlign: "left", padding: 10, minWidth: 220 }}>
                        <div style={{ fontWeight: 800 }}>{name}</div>
                        <div style={{ marginTop: 4, display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <span style={pillStyle(v.is_outdated ? "warn" : "ok")}>
                            {v.is_outdated ? "outdated" : "latest"} v{v.version ?? "—"}
                          </span>
                          <span style={pillStyle("neutral")}>{fmtMoney(v.grand_total)}</span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody>
                {items.map((it: any, idx: number) => (
                  <tr key={it.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: 10, verticalAlign: "top" }}>
                      <div style={{ fontWeight: 900 }}>
                        {(it.line_no ?? idx + 1) + ". "} {it.title ?? "—"}
                      </div>
                      <div style={{ marginTop: 4, fontSize: 12, opacity: 0.8 }}>
                        Qty: <strong>{it.qty ?? "—"}</strong> {it.uom ?? ""}
                      </div>
                      {it.description ? (
                        <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>{it.description}</div>
                      ) : null}
                    </td>

                    {vendorsSorted.map((v: any) => {
                      const qid = String(v.quote_id);
                      const cell = byQuote[qid]?.[String(it.id)] ?? null;

                      const unitPrice = cell?.unit_price ?? null;
                      const qty = cell?.qty ?? null;
                      const lineTotal = cell?.line_total ?? null;

                      const hasPrice =
                        unitPrice != null && Number.isFinite(Number(unitPrice)) && Number(unitPrice) > 0;

                      return (
                        <td key={v.vendor_id} style={{ padding: 10, verticalAlign: "top" }}>
                          {!cell ? (
                            <span style={{ opacity: 0.6 }}>—</span>
                          ) : !hasPrice ? (
                            <span style={{ opacity: 0.7 }}>No quote</span>
                          ) : (
                            <div style={{ display: "grid", gap: 6 }}>
                              <div style={{ fontSize: 12, opacity: 0.8 }}>
                                Unit: <strong>{fmtMoney(unitPrice)}</strong>
                              </div>
                              <div style={{ fontSize: 12, opacity: 0.8 }}>
                                Qty: <strong>{qty ?? "—"}</strong>
                              </div>
                              <div style={{ fontSize: 12, opacity: 0.8 }}>
                                Line: <strong>{fmtMoney(lineTotal)}</strong>
                              </div>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>

              <tfoot>
                <tr style={{ borderTop: "1px solid #e5e7eb", background: "#fafafa" }}>
                  <td style={{ padding: 10, fontWeight: 800 }}>Totals</td>
                  {vendorsSorted.map((v: any) => (
                    <td key={v.vendor_id} style={{ padding: 10 }}>
                      <div style={{ fontWeight: 800 }}>{fmtMoney(v.grand_total)}</div>
                      <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
                        Subtotal: {fmtMoney(v.subtotal)} <br />
                        GST: {fmtMoney(v.gst_amount)}
                      </div>
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <details
        style={{
          marginTop: 20,
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          background: "#fff",
          padding: 12,
        }}
      >
        <summary
          style={{
            cursor: "pointer",
            fontWeight: 900,
            color: "#111827",
          }}
        >
          Advanced Help & Price Intelligence
        </summary>

        <div style={{ marginTop: 14 }}>
          <AIExecutionTimeline
            input={{
              module,
              stage: autonomousOsDecision.milestone,
              workflowRisk: autonomousOsDecision.workflowRisk,
              closurePrediction:
                buyerDecisionConfidence >= 80
                  ? "High"
                  : buyerDecisionConfidence >= 55
                    ? "Medium"
                    : "Low",
              vendorCount: vendorsSorted.length,
              hasAcceptedQuote: Boolean(acceptedQuoteId),
              hasPriceSignal: priced.length > 0,
              hasDeliverySignal: Boolean(fastestVendorId),
            }}
          />

          <div style={{ height: 14 }} />

          <MarketplaceAiDashboard payload={smartDecisionPayload} />

          <PricePredictionToggle payload={smartDecisionPayload} />

          <SmartDecisionBox payload={smartDecisionPayload} />
        </div>
      </details>

      <div style={{ marginTop: 16, opacity: 0.75, fontSize: 13 }}>
        Tip: If a vendor shows <strong>outdated</strong>, ask them to submit a revised quote for the latest RFQ revision.
      </div>
    </main>
  );
}