type AiSeoInput = {
  module?: string;

  title?: string;
  category?: string;
  type?: string;

  city?: string;
  district?: string;
  locality?: string;

  price?: number | string | null;

  listingType?: string;
};

function safe(v: unknown) {
  return String(v || "").trim();
}

function fmtMoney(v: any) {
  const n = Number(v);

  if (!Number.isFinite(n)) return null;

  try {
    return new Intl.NumberFormat("en-IN", {
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return String(n);
  }
}

export function buildAiSeoContent(input: AiSeoInput) {
  const moduleName = safe(input.module || "property");

  const title = safe(input.title || "Listing");

  const category =
    safe(input.category) ||
    safe(input.type) ||
    "property";

  const city = safe(input.city);
  const district = safe(input.district);
  const locality = safe(input.locality);

  const geoText =
    [locality, city, district]
      .filter(Boolean)
      .join(", ") || "India";

  const listingType =
    safe(input.listingType) || "listing";

  const priceText =
    input.price !== undefined &&
    input.price !== null &&
    input.price !== ""
      ? `₹ ${fmtMoney(input.price)}`
      : null;

  const summary = `
${title} is available on 3bigha.com${
    geoText ? ` in ${geoText}` : ""
  }.

This ${category.toLowerCase()} ${listingType.toLowerCase()} helps buyers, investors, vendors and businesses discover verified opportunities, compare pricing and connect directly with property owners, builders, suppliers and service providers.
`.trim();

  const investmentInsight = `
${
  city || locality
    ? `${geoText} is emerging as an important market for ${category.toLowerCase()} demand, infrastructure growth and long-term investment activity.`
    : `This region is witnessing increasing interest in ${category.toLowerCase()} transactions and investment activity.`
}

${
  priceText
    ? `Current pricing around ${priceText} may attract both end-users and long-term investors depending on infrastructure growth, accessibility and future development plans.`
    : `Pricing trends, infrastructure growth and locality demand may influence future appreciation potential.`
}
`.trim();

  const demandInsight = `
Buyers searching for ${category.toLowerCase()} in ${
    city || locality || "India"
  } often compare:
- pricing trends
- connectivity
- nearby infrastructure
- vendor credibility
- long-term investment value
- future appreciation potential

3bigha.com helps users discover verified opportunities with AI-powered search, smart recommendations and locality-aware discovery.
`.trim();

  const faq = [
    {
      question: `Is ${title} available on 3bigha.com?`,
      answer: `Yes, ${title} is available for enquiry and discovery on 3bigha.com.`,
    },

    {
      question: `Where is this ${category.toLowerCase()} located?`,
      answer: geoText
        ? `This listing is located in ${geoText}.`
        : `The location details are available on the listing page.`,
    },

    {
      question: `Can buyers contact the seller or vendor directly?`,
      answer:
        "Yes. Buyers and investors can directly connect through the enquiry and unified inbox system.",
    },

    {
      question: `Does 3bigha support AI-powered property discovery?`,
      answer:
        "Yes. 3bigha uses AI-powered discovery, recommendations, procurement intelligence and semantic search infrastructure.",
    },
  ];

  return {
    summary,
    investmentInsight,
    demandInsight,
    faq,
  };
}

export function buildFaqSchema(
  items: Array<{
    question: string;
    answer: string;
  }>
) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",

    mainEntity: items.map((item) => ({
      "@type": "Question",

      name: item.question,

      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}