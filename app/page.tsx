// app/page.tsx
"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import JsonLd from "@/components/seo/JsonLd";
import {
  aiMarketplaceSchema,
  marketplaceFaqSchema,
  organizationSchema,
  websiteSchema,
} from "@/lib/seo/schema";

type SearchScope = "property" | "materials" | "services" | "rentals" | "investment";

type MarketplaceItem = {
  id: string;
  module: "Property" | "Material" | "Service" | "Rental";
  title: string;
  subtitle: string;
  meta: string;
  price: string;
  href: string;
  badge: string;
  image?: string | null;
};

type AISuggestion = {
  title: string;
  message: string;
  actionLabel: string;
  href: string;
  confidence: string;
};

type LiveDiscoverySignal = {
  title: string;
  value: string;
  note: string;
  href: string;
};

function moneyINR(value: any) {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num) || num <= 0) return "";
  return `₹ ${num.toLocaleString("en-IN")}`;
}

function firstPhotoUrl(photos: any): string | null {
  if (!photos) return null;
  if (Array.isArray(photos)) {
    const first = photos[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object") return first.url || first.src || null;
  }
  if (typeof photos === "object") return photos.url || photos.src || null;
  return null;
}

function clipText(value: any, max = 90) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max).trim()}…` : text;
}

const modules: { key: SearchScope; label: string; placeholder: string }[] = [
  {
    key: "property",
    label: "Buy / Sell Property",
    placeholder: "Search land, flat, house, plot...",
  },
  {
    key: "materials",
    label: "Materials",
    placeholder: "Search cement, steel, sand, bricks...",
  },
  {
    key: "services",
    label: "Services",
    placeholder: "Search mason, engineer, plumber, contractor...",
  },
  {
    key: "rentals",
    label: "Rentals",
    placeholder: "Search machinery, tools, shuttering...",
  },
  {
    key: "investment",
    label: "Investment",
    placeholder: "Search land investment, builder project...",
  },
];

const quickActions = [
  { title: "Post Property", text: "Sell or rent land, house, flat or commercial property.", href: "/property/add", icon: "🏠" },
  { title: "Submit Requirement", text: "Send requirement and receive quotations from vendors.", href: "/rfq/general/new", icon: "🧾" },
  { title: "Check Price Today", text: "Track property and construction material price trends.", href: "/price-today", icon: "📈" },
  { title: "Find Vendors", text: "Discover verified local vendors and service providers.", href: "/vendor/discovery", icon: "✅" },
];

const aiCommandPrompts = [
  "Need 500 bags cement in Cooch Behar",
  "Find land near me under 10 lakh",
  "Draft RFQ for house construction materials",
  "Show electrician and plumber near me",
  "Check steel price today",
  "Find excavator rental nearby",
];

const marketplaceActivity = [
  { icon: "⚡", text: "New RFQ demand detected for cement and steel", href: "/rfq/general/new" },
  { icon: "🏠", text: "Buyers searching land and residential plots", href: "/property" },
  { icon: "🛠️", text: "Fast service responses active in local market", href: "/services" },
  { icon: "📊", text: "Price Today signals showing active material movement", href: "/price-today#prediction" },
];

const trustSignals = [
  "AI Verified",
  "Fast Responder",
  "Hot RFQ",
  "High Demand",
  "AI Trusted",
];

const localFeedSignals = [
  { title: "Trending Near You", value: "Land, cement, steel", note: "High buyer activity", href: "/search" },
  { title: "Hot RFQs Nearby", value: "Materials + Services", note: "Vendors should respond fast", href: "/rfq/general/new" },
  { title: "High Demand Materials", value: "Cement, rod, bricks", note: "Procurement movement active", href: "/materials" },
  { title: "Nearby Vendor Opportunity", value: "Fast responders preferred", note: "AI trust ranking visible", href: "/vendor/discovery" },
];

const investmentSignals = [
  { title: "AI Growth Zone", text: "Track locations where land, rentals and construction demand are moving together.", href: "/investment/opportunities" },
  { title: "Rental Yield Signal", text: "Machinery and equipment demand can indicate active construction pockets.", href: "/rentals" },
  { title: "Price Momentum", text: "Use Price Today before buying, selling or submitting large RFQs.", href: "/price-today#prediction" },
];

const realtimeTickerSignals = [
  "⚡ New RFQ activity detected in Cooch Behar",
  "📈 Steel and cement price movement under watch",
  "🎯 Fast responder vendors getting higher AI visibility",
  "🚜 Rental equipment demand rising near local construction zones",
  "🏠 Residential plot searches active in nearby markets",
  "🧠 AI procurement signals updated for buyers and vendors",
];

const heatmapSignals = [
  { zone: "Cooch Behar Town", level: "High", score: "92", text: "Property + materials demand" },
  { zone: "Khagrabari", level: "Rising", score: "84", text: "Vendor and RFQ movement" },
  { zone: "Tufanganj", level: "Active", score: "78", text: "Rental and service activity" },
  { zone: "Dinhata Road", level: "Watch", score: "71", text: "Price-sensitive buyer search" },
];

const smartAlerts = [
  { icon: "🚨", title: "Hot RFQ window", text: "Material buyers may need faster vendor responses.", href: "/rfq/general/new" },
  { icon: "📊", title: "Price movement", text: "Check Price Today before bulk procurement.", href: "/price-today#prediction" },
  { icon: "🎯", title: "Vendor opportunity", text: "Fast responders can win more local leads.", href: "/vendor/discovery" },
];

const userModes = [
  { key: "buyer", label: "Buyer", icon: "🛒", title: "Find, compare and submit requirements faster.", href: "/rfq/general/new" },
  { key: "vendor", label: "Vendor", icon: "🏪", title: "Discover hot RFQs and respond before competitors.", href: "/dashboard/vendor/rfqs" },
  { key: "investor", label: "Investor", icon: "💼", title: "Track growth zones and investment signals.", href: "/investment/opportunities" },
  { key: "rental", label: "Rental", icon: "🚜", title: "Follow machinery demand and equipment movement.", href: "/rentals" },
];

const behavioralSignals = [
  { title: "AI Buyer Path", text: "Search → Compare → RFQ → Chat → Deal", href: "/search" },
  { title: "AI Vendor Path", text: "Lead alert → Quote → Follow-up → Conversion", href: "/dashboard/vendor" },
  { title: "AI Investor Path", text: "Location signal → Demand score → Opportunity", href: "/investment/opportunities" },
];

const districtIntelligence = [
  { label: "Top local demand", value: "Materials + land", note: "Cooch Behar activity cluster" },
  { label: "Vendor response", value: "Fast responders rising", note: "Trust ranking advantage" },
  { label: "Procurement urgency", value: "Medium-high", note: "Bulk RFQ-ready market" },
];

const copilotMemorySignals = [
  "Last workflow: Marketplace search",
  "Next best action: Draft RFQ",
  "AI confidence: High",
];

const multilingualPrompts = [
  "বাংলায় বলুন: সিমেন্ট দরকার",
  "हिंदी में खोजें: प्लंबर चाहिए",
  "Need land near Cooch Behar",
  "Compare material price today",
];

const copilotMissions = [
  { title: "Draft requirement", href: "/rfq/general/new", icon: "⚡" },
  { title: "Find vendors", href: "/vendor/discovery", icon: "🎯" },
  { title: "Check prices", href: "/price-today#prediction", icon: "📊" },
  { title: "Track market", href: "/dashboard/procurement-live", icon: "🧠" },
];

function marketplaceEmoji(module: MarketplaceItem["module"]) {
  if (module === "Property") return "🏠";
  if (module === "Material") return "🧱";
  if (module === "Service") return "🛠️";
  return "🚜";
}

function aiTrustBadge(module: MarketplaceItem["module"]) {
  if (module === "Property") return "AI Location Checked";
  if (module === "Material") return "Price Demand Signal";
  if (module === "Service") return "Fast Responder Match";
  return "High Rental Demand";
}

function aiConfidence(module: MarketplaceItem["module"]) {
  if (module === "Property") return "92% AI match";
  if (module === "Material") return "88% demand fit";
  if (module === "Service") return "90% trust signal";
  return "86% availability fit";
}

const categories = [
  { title: "Property", text: "Land, flats, houses and commercial listings.", href: "/property", icon: "🏠", cta: "View Listings" },
  { title: "Materials", text: "Cement, steel, sand, bricks and building supplies.", href: "/materials", icon: "🧱", cta: "Browse Materials" },
  { title: "Services", text: "Construction, legal, technical and skilled services.", href: "/services", icon: "🛠️", cta: "Explore Services" },
  { title: "Rentals", text: "Machinery, tools, equipment and shuttering rentals.", href: "/rentals", icon: "🚜", cta: "See Rentals" },
  { title: "Blog / News", text: "Real estate and construction updates.", href: "/blog", icon: "📰", cta: "Read Posts" },
  { title: "Investment", text: "Connect builders, investors and opportunities.", href: "/investment", icon: "💼", cta: "Explore" },
];

export default function HomePage() {
  const router = useRouter();
  const [scope, setScope] = useState<SearchScope>("property");
  const [query, setQuery] = useState("");
  const [locationText, setLocationText] = useState("");
  const [featuredItems, setFeaturedItems] = useState<MarketplaceItem[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null);
  const liveSearchSuggestions = useMemo(() => {
  const q = query.trim().toLowerCase();

  if (q.length < 2) return [];

  if (q.includes("cement") || q.includes("সিমেন্ট")) {
    return [
      "500 bags cement RFQ",
      "cement suppliers near Cooch Behar",
      "today cement price",
      "bulk cement delivery nearby",
    ];
  }

  if (q.includes("electric") || q.includes("wiring") || q.includes("বিদ্যুৎ")) {
    return [
      "house wiring electrician",
      "electrical contractor near me",
      "commercial electrical work RFQ",
      "urgent electrician nearby",
    ];
  }

  if (q.includes("jcb") || q.includes("excavator")) {
    return [
      "JCB rent for 2 days",
      "excavator rental near me",
      "earth filling machine rental",
      "JCB with operator nearby",
    ];
  }

  if (q.includes("land") || q.includes("plot") || q.includes("জমি")) {
    return [
      "2 katha land in Cooch Behar",
      "residential plot near Khagrabari",
      "commercial land enquiry",
      "land under budget near me",
    ];
  }

  return [
    `${query} near me`,
    `${query} price today`,
    `${query} vendor RFQ`,
    `${query} suppliers in Cooch Behar`,
  ];
}, [query]);
  const [aiCopilotOpen, setAiCopilotOpen] = useState(false);
  const [aiActionsOpen, setAiActionsOpen] = useState(false);
  const [regionalExamplesOpen, setRegionalExamplesOpen] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const [userMode, setUserMode] = useState(userModes[0]);
  const [liveFeedSignals, setLiveFeedSignals] = useState<LiveDiscoverySignal[]>(localFeedSignals);
  const [liveMarketSummary, setLiveMarketSummary] = useState("AI-powered local marketplace signals are ready.");
  const voiceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const activeModule = useMemo(
    () => modules.find((m) => m.key === scope) || modules[0],
    [scope]
  );

  const adaptiveHero = useMemo(() => {
    if (scope === "materials") {
      return {
        title: "Need materials? Let AI prepare your buying workflow.",
        text: "Search prices, draft RFQs and connect with nearby suppliers from one intelligent homepage.",
      };
    }

    if (scope === "services") {
      return {
        title: "Find trusted local service providers with AI guidance.",
        text: "Search contractors, engineers, plumbers, electricians and construction support providers faster.",
      };
    }

    if (scope === "rentals") {
      return {
        title: "Find rental equipment and machinery near active work zones.",
        text: "Track rental demand, compare availability and connect with local rental vendors.",
      };
    }

    if (scope === "investment") {
      return {
        title: "Discover AI-backed land and growth opportunities.",
        text: "Use local demand, price movement and development signals before making decisions.",
      };
    }

    return {
      title: "Find Property, Materials, Services & Rentals",
      text: "Search listings, submit requirements, compare prices and connect with local providers.",
    };
  }, [scope]);

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const { latitude, longitude } = pos.coords;
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
        );
        const data = await res.json();

        const city =
          data?.address?.city ||
          data?.address?.town ||
          data?.address?.village ||
          data?.address?.county ||
          "";

        if (city) setLocationText(city);
      } catch {
        // Location is optional.
      }
    });
  }, []);

  useEffect(() => {
    return () => {
      if (voiceTimeoutRef.current) clearTimeout(voiceTimeoutRef.current);
      };
    }, []);

  useEffect(() => {
    let alive = true;

    async function loadLiveDiscovery() {
      try {
        const params = new URLSearchParams();
        params.set("q", query.trim() || activeModule.placeholder);
        if (locationText) params.set("city", locationText);

        const res = await fetch(`/api/ai/marketplace-discovery?${params.toString()}`, {
          method: "GET",
          cache: "no-store",
        });

        const data = await res.json().catch(() => null);
        const discovery = data?.discovery || null;

        if (!alive || !discovery) return;

        const vendors = Array.isArray(discovery?.vendors) ? discovery.vendors : [];
        const categories = Array.isArray(discovery?.categories) ? discovery.categories : [];

        const nextSignals: LiveDiscoverySignal[] = [
          {
            title: "Live vendor discovery",
            value: vendors.length > 0 ? `${vendors.length} vendor signals` : "Vendor network ready",
            note: discovery?.headline || "AI marketplace discovery is active",
            href: "/vendor/discovery",
          },
          {
            title: "Top local category",
            value: categories?.[0]?.name || activeModule.label,
            note: "Based on current marketplace discovery intelligence",
            href: "/search",
          },
          {
            title: "Nearby opportunity",
            value: locationText || "Local market",
            note: "District-aware marketplace routing enabled",
            href: "/search",
          },
          {
            title: "AI next action",
            value: "Search → RFQ → Vendor",
            note: "Workflow-ready homepage intelligence",
            href: "/rfq/general/new",
          },
        ];

        setLiveFeedSignals(nextSignals);
        setLiveMarketSummary(
          discovery?.summary ||
            discovery?.headline ||
            "Live marketplace discovery intelligence is active."
        );
      } catch {
        if (alive) {
          setLiveFeedSignals(localFeedSignals);
          setLiveMarketSummary("AI-powered local marketplace signals are ready.");
        }
      }
    }

    loadLiveDiscovery();

    return () => {
      alive = false;
    };
  }, [activeModule.label, activeModule.placeholder, locationText, query]);

  useEffect(() => {
    let alive = true;

    async function loadFeaturedMarketplace() {
      setFeaturedLoading(true);

      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
          if (alive) setFeaturedLoading(false);
          return;
        }

        const supabase = createClient(supabaseUrl, supabaseKey, {
          auth: { persistSession: false },
        });

        const propertyReq = fetch("/api/property/public-listings?page=0&pageSize=4", {
          method: "GET",
          cache: "no-store",
        })
          .then((r) => r.json())
          .catch(() => ({ data: [] }));

        const materialsReq = supabase
          .from("material_listings")
          .select("id,title,local_name,description,packaging_unit,attributes,created_at,published_at,is_active,is_public,status")
          .eq("is_active", true)
          .or("is_public.eq.true,published_at.not.is.null,status.ilike.published,status.ilike.active")
          .order("created_at", { ascending: false })
          .limit(4);

        const servicesReq = supabase
          .from("v_service_listings")
          .select("provider_service_id,provider_name,custom_category,custom_service,service_description,city,district,state,min_price,max_price,currency,service_is_active,provider_service_created_at")
          .eq("service_is_active", true)
          .order("provider_service_created_at", { ascending: false })
          .limit(4);

        const rentalsReq = supabase
          .from("rental_listings_public")
          .select("id,title,description,rate,pricing_unit,rate_unit_label,city,district,state,locality,photos,is_active,updated_at")
          .eq("is_active", true)
          .order("updated_at", { ascending: false })
          .limit(4);

        const [propertyRes, materialsRes, servicesRes, rentalsRes] = await Promise.all([
          propertyReq,
          materialsReq,
          servicesReq,
          rentalsReq,
        ]);

        if (!alive) return;

        const propertyItems: MarketplaceItem[] = ((propertyRes?.data || []) as any[]).map((p) => ({
          id: String(p.id),
          module: "Property",
          title: p.title || "Property listing",
          subtitle: [p.city, p.state].filter(Boolean).join(", ") || "Location available on details",
          meta: p.listing_intent || "Property",
          price: moneyINR(p.expected_price || p.price) || "Price on request",
          href: `/property/${encodeURIComponent(String(p.slug || p.id))}`,
          badge: "Featured Property",
          image: firstPhotoUrl(p.photos),
        }));

        const materialItems: MarketplaceItem[] = ((materialsRes.data || []) as any[]).map((m) => {
          const price = m.attributes?.price || m.attributes?.unit_price || m.attributes?.rate || m.attributes?.mrp;

          return {
            id: String(m.id),
            module: "Material",
            title: m.title || m.local_name || "Material listing",
            subtitle: clipText(m.description, 75) || "Building material available for enquiry",
            meta: m.packaging_unit ? `Unit: ${m.packaging_unit}` : "Material",
            price: moneyINR(price) || "Ask price",
            href: `/materials/${encodeURIComponent(String(m.id))}`,
            badge: "Latest Material",
            image: null,
          };
        });

        const serviceItems: MarketplaceItem[] = ((servicesRes.data || []) as any[]).map((s) => ({
          id: String(s.provider_service_id),
          module: "Service",
          title: s.custom_service || "Professional service",
          subtitle: s.provider_name || clipText(s.service_description, 75) || "Service provider",
          meta: [s.city, s.district, s.state].filter(Boolean).join(", ") || s.custom_category || "Service",
          price:
            s.min_price || s.max_price
              ? `${moneyINR(s.min_price) || "₹ —"}${s.max_price ? ` - ${moneyINR(s.max_price)}` : ""}`
              : "Quote on request",
          href: `/services`,
          badge: s.custom_category || "Top Service",
          image: null,
        }));

        const rentalItems: MarketplaceItem[] = ((rentalsRes.data || []) as any[]).map((r) => ({
          id: String(r.id),
          module: "Rental",
          title: r.title || "Rental equipment",
          subtitle: [r.locality, r.city, r.district].filter(Boolean).join(", ") || clipText(r.description, 75),
          meta: r.rate_unit_label || r.pricing_unit || "Rental",
          price: r.rate ? `${moneyINR(r.rate)}${r.rate_unit_label ? `/${r.rate_unit_label}` : ""}` : "Rate on request",
          href: `/rentals/${encodeURIComponent(String(r.id))}`,
          badge: "Trending Rental",
          image: firstPhotoUrl(r.photos),
        }));

        setFeaturedItems([
          ...propertyItems,
          ...materialItems,
          ...serviceItems,
          ...rentalItems,
        ].slice(0, 12));
      } catch {
        if (alive) setFeaturedItems([]);
      } finally {
        if (alive) setFeaturedLoading(false);
      }
    }

    loadFeaturedMarketplace();

    return () => {
      alive = false;
    };
  }, []);

  function startVoiceSearch() {
    const browserWindow = window as any;
    const SpeechRecognition =
      browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setAiSuggestion({
        title: "Voice search not supported",
        message:
          "Your browser does not support voice recognition yet. You can still type in Bengali, Hindi or English.",
        actionLabel: "Type Requirement",
        href: "/rfq/general/new",
        confidence: "Text AI ready",
      });
      return;
    }

    setVoiceListening(true);

    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      const transcript = event?.results?.[0]?.[0]?.transcript || "";
      const cleanTranscript = String(transcript).trim();

      if (cleanTranscript) {
        setQuery(cleanTranscript);
        setAiSuggestion({
          title: "Voice command captured",
          message:
            "3bigha AI heard your requirement. Now run AI Guide to route it to search, RFQ, price or vendor workflow.",
          actionLabel: "Run AI Guide",
          href: `/search?q=${encodeURIComponent(cleanTranscript)}`,
          confidence: "Voice captured",
        });
      }

      setVoiceListening(false);
    };

    recognition.onerror = () => {
      setVoiceListening(false);
      setAiSuggestion({
        title: "Voice capture failed",
        message:
          "Please try again or type your requirement directly in the AI command bar.",
        actionLabel: "Type Requirement",
        href: "/rfq/general/new",
        confidence: "Fallback ready",
      });
    };

    recognition.onend = () => {
      setVoiceListening(false);
    };

    recognition.start();
  }

  function buildIntentHref(intent: any, fallbackQuery: string) {
    const cleanQuery = encodeURIComponent(intent?.query || fallbackQuery);
    const module = intent?.module || scope;
    const max = intent?.max ? `&max=${encodeURIComponent(intent.max)}` : "";
    const near = intent?.near ? "&near=1" : "";

    if (module === "property") {
      return `/search?module=property&q=${cleanQuery}${max}${near}`;
    }

    if (module === "materials") {
      if (/\d+/.test(fallbackQuery)) {
        return `/rfq/general/new?query=${cleanQuery}`;
      }

      return `/search?module=materials&q=${cleanQuery}${near}`;
    }

    if (module === "services") {
      return `/search?module=services&q=${cleanQuery}${near}`;
    }

    if (module === "rentals") {
      return `/search?module=rentals&q=${cleanQuery}${near}`;
    }

    if (module === "blog") {
      return `/blog?q=${cleanQuery}`;
    }

    return `/search?q=${cleanQuery}${near}`;
  }

  async function runAISmartGuide() {
    const originalQuery = query.trim();
    const clean = originalQuery.toLowerCase();

    if (originalQuery) {
      setLiveMarketSummary(`AI is checking live marketplace signals for: ${originalQuery}`);
    }

    if (!clean) {
      setAiSuggestion({
        title: "AI needs your requirement",
        message:
          "Type what you need first. Example: land in Cooch Behar, 500 cement bags, electrician near me, excavator rental.",
        actionLabel: "Start Requirement",
        href: "/rfq/general/new",
        confidence: "Waiting for input",
      });
      return;
    }

    let aiIntent: any = null;

    try {
      const intentRes = await fetch("/api/ai/search-intent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: originalQuery,
          module: scope,
          location: locationText,
          source: "homepage",
        }),
      });

      if (intentRes.ok) {
        aiIntent = await intentRes.json();
      }
    } catch {
      aiIntent = null;
    }

    if (aiIntent?.ok && aiIntent?.module) {
      setAiSuggestion({
        title: "AI understood your marketplace intent",
        message:
          aiIntent.explanation ||
          "3bigha AI detected the best workflow for your requirement.",
        actionLabel:
          aiIntent.module === "materials" && /\d+/.test(originalQuery)
            ? "Create RFQ"
            : aiIntent.module === "property"
              ? "Search Property"
              : aiIntent.module === "services"
                ? "Find Services"
                : aiIntent.module === "rentals"
                  ? "Find Rentals"
                  : "Search Now",
        href: buildIntentHref(aiIntent, originalQuery),
        confidence: `${Math.round(Number(aiIntent.confidence || 0.75) * 100)}% AI confidence`,
      });
      return;
    }

    const hasNumber = /\d+/.test(clean);
    const isMaterial =
      clean.includes("cement") ||
      clean.includes("steel") ||
      clean.includes("sand") ||
      clean.includes("brick") ||
      clean.includes("aggregate") ||
      clean.includes("rod") ||
      clean.includes("paint") ||
      clean.includes("tiles");

    const isPrice =
      clean.includes("price") ||
      clean.includes("rate") ||
      clean.includes("cost");

    const isProperty =
      clean.includes("land") ||
      clean.includes("plot") ||
      clean.includes("flat") ||
      clean.includes("house") ||
      clean.includes("property") ||
      clean.includes("katha") ||
      clean.includes("bigha");

    const isRental =
      clean.includes("rent") ||
      clean.includes("rental") ||
      clean.includes("machine") ||
      clean.includes("excavator") ||
      clean.includes("equipment") ||
      clean.includes("shuttering");

    const isService =
      clean.includes("service") ||
      clean.includes("mason") ||
      clean.includes("plumber") ||
      clean.includes("electrician") ||
      clean.includes("engineer") ||
      clean.includes("contractor") ||
      clean.includes("labour");

    if (isPrice) {
      setAiSuggestion({
        title: "AI suggests Price Today",
        message:
          "Your search looks price-focused. Check current market indication before contacting vendors.",
        actionLabel: "Check Price Today",
        href: `/price-today?q=${encodeURIComponent(query.trim())}`,
        confidence: "High confidence",
      });
      return;
    }

    if (isMaterial && hasNumber) {
      setAiSuggestion({
        title: "AI suggests RFQ submission",
        message:
          "This looks like a purchase requirement with quantity. Submit an RFQ so nearby vendors can quote.",
        actionLabel: "Create RFQ",
        href: `/rfq/general/new?query=${encodeURIComponent(query.trim())}`,
        confidence: "High confidence",
      });
      return;
    }

    if (isProperty) {
      setAiSuggestion({
        title: "AI suggests Property Search",
        message:
          "This looks like a property need. Search live property listings and compare location, price and type.",
        actionLabel: "Search Property",
        href: `/search?module=property&q=${encodeURIComponent(query.trim())}`,
        confidence: "High confidence",
      });
      return;
    }

    if (isRental) {
      setAiSuggestion({
        title: "AI suggests Rental Search",
        message:
          "This looks like an equipment or rental need. Search available rentals near your location.",
        actionLabel: "Find Rentals",
        href: `/search?module=rentals&q=${encodeURIComponent(query.trim())}`,
        confidence: "Good confidence",
      });
      return;
    }

    if (isService) {
      setAiSuggestion({
        title: "AI suggests Service Provider Search",
        message:
          "This looks like a service requirement. Find verified local professionals and providers.",
        actionLabel: "Find Services",
        href: `/search?module=services&q=${encodeURIComponent(query.trim())}`,
        confidence: "Good confidence",
      });
      return;
    }

    setAiSuggestion({
      title: "AI suggests Smart Search",
      message:
        "AI will search across the selected marketplace category and show the most relevant results.",
      actionLabel: "Search Now",
      href: `/search?module=${scope}&q=${encodeURIComponent(query.trim())}`,
      confidence: "Standard confidence",
    });
  }

  function runSearch() {
    const clean = query.trim();

    if (!clean) {
      router.push(`/${scope === "investment" ? "investment/opportunities" : scope}`);
      return;
    }

    if (scope === "investment") {
      router.push(`/investment/opportunities?q=${encodeURIComponent(clean)}`);
      return;
    }

    router.push(`/search?module=${scope}&q=${encodeURIComponent(clean)}`);
  }

return (
    <main className="homePage">
      <JsonLd
        data={[
          organizationSchema(),
          websiteSchema(),
          aiMarketplaceSchema(),
          marketplaceFaqSchema(),
        ]}
      />

      <section className="homepageSeoIntro" aria-label="3bigha marketplace overview">
        <div className="homepageSeoIntroInner">
          <span>3bigha.com Marketplace OS</span>

          <h2>
            AI-powered property, construction, RFQ, materials, rentals and vendor marketplace in India
          </h2>

          <p>
            3bigha.com helps buyers, property owners, builders, vendors, suppliers,
            service providers and rental equipment providers connect through one
            intelligent marketplace. Users can search property listings, submit RFQs,
            compare vendors, discover building materials, find construction services,
            check rental machinery, track price intelligence and continue marketplace
            conversations from one platform.
          </p>

          <div className="homepageSeoLinks">
            <a href="/property">Property marketplace</a>
            <a href="/materials">Building materials marketplace</a>
            <a href="/services">Construction services marketplace</a>
            <a href="/rentals">Rental equipment marketplace</a>
            <a href="/rfq/general/new">Submit RFQ requirement</a>
            <a href="/vendor/discovery">Find verified vendors</a>
            <a href="/price-today">AI price intelligence</a>
            <a href="/search/cement-price-cooch-behar">Cement price Cooch Behar</a>
            <a href="/seo/property/west-bengal/cooch-behar">Cooch Behar property marketplace</a>
          </div>
        </div>
      </section>

      <section className="marketHero">
        <div className="marketHeroInner">
          <div className="marketHeroContent">
            <div className="heroTextBlock">
              <div className="marketBadge">Verified local marketplace</div>

              <h1>{adaptiveHero.title}</h1>

              <p>{adaptiveHero.text}</p>

              <div className="heroTrustRow">
                <a href="/llms.txt">LLM Discovery</a>
                <a href="/ai-search-guide">AI Search Guide</a>
                <a href="/property">🏠 Property</a>
                <a href="/materials">🧱 Materials</a>
                <a href="/services">🛠️ Services</a>
                <a href="/rentals">🚜 Rentals</a>
                <a href="/investment/opportunities">💼 Investment</a>
                <a href="/price-today#prediction" className="priceTodayHeroChip">
                  📊 Price Today
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="universalBuyerActionStrip">
        <div className="universalBuyerActionInner">
          <div className="universalBuyerContent">
            <span>⚡ Fast Marketplace Actions</span>

            <h2>Tell 3bigha what you need.</h2>

            <p>
              Property, materials, services, rentals, contractors and RFQs —
              start your requirement in one click.
            </p>
          </div>

          <div className="universalBuyerActions">
            <a href="/search?module=property">
              🏠
              <span>Need Property</span>
            </a>

            <a href="/search?module=materials">
              🧱
              <span>Need Materials</span>
            </a>

            <a href="/search?module=services">
              🛠️
              <span>Need Service</span>
            </a>

            <a href="/search?module=rentals">
              🚜
              <span>Need Rental</span>
            </a>

            <a
              href="/rfq/general/new"
              className="primaryBuyerAction"
            >
              ⚡
              <span>Tell AI Requirement</span>
            </a>
          </div>
        </div>
      </section>

      <section className="homeSearchSection">
        <div className="homeSearchInner">
          <div className="searchPanel">
            <div className="moduleTabs">
              {modules.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setScope(m.key)}
                  className={scope === m.key ? "moduleTab active" : "moduleTab"}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div className="searchRow aiCommandSearchRow">
              <input
                ref={searchInputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") runAISmartGuide();
                }}
                placeholder={`Ask 3bigha AI: ${activeModule.placeholder}`}
              />

              <button type="button" className="voiceSearchButton" onClick={startVoiceSearch}>
                {voiceListening ? "Listening…" : "🎙️ Voice"}
              </button>

              <button type="button" onClick={runAISmartGuide}>
                Ask AI
              </button>
            </div>

            {liveSearchSuggestions.length > 0 ? (
              <div className="liveSearchSuggestions">
                {liveSearchSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => {
                      setQuery(suggestion);
                      setAiSuggestion({
                        title: "AI search suggestion selected",
                        message:
                          "3bigha AI can turn this into search, RFQ, vendor discovery or price intelligence.",
                        actionLabel: "Continue",
                        href: `/rfq/general/new?query=${encodeURIComponent(suggestion)}`,
                        confidence: "Suggested from your search intent",
                      });
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="aiPromptChips">
              {aiCommandPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => {
                    setQuery(prompt);
                    setAiSuggestion({
                      title: "AI command selected",
                      message: `3bigha AI will understand this marketplace need and guide you to search, RFQ, price or vendor action.`,
                      actionLabel: "Run AI Guide",
                      href: `/rfq/general/new?query=${encodeURIComponent(prompt)}`,
                      confidence: "Smart workflow ready",
                    });
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>

            <div className="searchMeta">
              <span>
                {locationText
                  ? `📍 Near ${locationText}`
                  : "📍 Search by location or requirement"}
              </span>

              <a href="/rfq/general/new">Submit Requirement</a>

              <a href="/property/add">Post Property</a>

              <button type="button" className="aiGuideButton" onClick={runAISmartGuide}>
                ✨ AI Guide
              </button>
            </div>

            <div className="aiCommandStream">
              {[
                "🟢 3 buyers searching for cement near Cooch Behar",
                "⚡ Vendor responded to an RFQ in 12 minutes",
                "🏗 Property enquiry increased in Khagrabari",
                "🚜 Rental demand rising today",
                "💬 New supplier activity detected nearby",
              ].map((pulse, idx) => (
                <div key={idx} className="aiCommandPulse">
                  {pulse}
                </div>
              ))}
            </div>

            {aiSuggestion ? (
              <div className="aiGuideCard">
                <div>
                  <strong>{aiSuggestion.title}</strong>
                  <p>{aiSuggestion.message}</p>
                  <span>{aiSuggestion.confidence}</span>
                </div>

                <button type="button" onClick={() => router.push(aiSuggestion.href)}>
                  {aiSuggestion.actionLabel} →
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="marketplaceMomentumSection">
        <div className="marketplaceMomentumInner">
          {[
            "🔥 18 RFQs submitted today",
            "⚡ Avg vendor response: 14 mins",
            "🏗 42 suppliers active nearby",
            "💬 129 buyer-vendor chats this week",
            "📍 Strong marketplace activity in Cooch Behar",
            "🚚 Fast delivery support available nearby",
            "🛠 Local service providers responding actively",
            "📈 AI procurement activity increasing this week",
          ].map((item, idx) => (
            <div key={idx} className="momentumCard">
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="regionalAiSection">
        <div className="regionalAiCard">
          <div className="regionalAiContent">
            <span>🌐 Multilingual Local Marketplace AI</span>

            <h2>Search naturally in your own language.</h2>

            <p>
              3bigha AI understands Bengali, Hindi and mixed local language marketplace searches.
            </p>

            <div className="regionalPromptHeader">
              <button
                type="button"
                className="regionalToggleBtn"
                onClick={() =>
                  setRegionalExamplesOpen((value) => !value)
                }
              >
                {regionalExamplesOpen
                  ? "See less ▲"
                  : "See more examples ▼"}
              </button>
            </div>

            <div className="regionalPromptExamples">
              {[
                "আমার ৫০০ ব্যাগ সিমেন্ট লাগবে",
                "কোচবিহারে ২ কাঠা জমি চাই",
                "আমার বাড়ি করার জন্য রাজমিস্ত্রি দরকার",
                "আজকের রডের দাম কত?",
                "একটা জেসিবি ভাড়া চাই",
                "আমার বিদ্যুতের কাজের লোক দরকার",
                "আমার বালি আর ইটের দরকার",
                "মुझे घर बनाने के लिए मिस्त्री चाहिए",
                "मुझे कूचबिहार में जमीन खरीदनी है",
                "आज सीमेंट का रेट क्या है?",
                "मुझे ट्रैक्टर किराये पर चाहिए",
                "मुझे बिजली का काम करने वाला चाहिए",
                "मुझे ईंट और बालू चाहिए",
                "मुझे मकान बनाने का खर्च जानना है",
              ]
                .slice(0, regionalExamplesOpen ? 14 : 6)
                .map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => {
                      setQuery(example);

                      setAiSuggestion({
                        title: "Regional AI Search Ready",
                        message:
                          "Your selected local-language search is ready in the search box.",
                        actionLabel: "Run AI Guide",
                        href: `/search?q=${encodeURIComponent(example)}`,
                        confidence: "Multilingual AI active",
                      });

                      window.scrollTo({
                        top: 220,
                        behavior: "smooth",
                      });

                      setTimeout(() => {
                        searchInputRef.current?.focus();
                      }, 250);
                    }}
                  >
                    {example}
                  </button>
                ))}
            </div>
          </div>

          <div className="regionalAiVisual">
            <div>বাংলা</div>
            <div>हिन्दी</div>
            <div>English</div>
            <small>AI understands local buying language.</small>
          </div>
        </div>
      </section>

      <section className="aiMarketPulseSection">
        <button
          type="button"
          className="aiMarketplaceToggle"
          onClick={() => setAiActionsOpen((value) => !value)}
        >
          <div>
            <h2>AI Marketplace Actions</h2>
            <p>Click to open all AI tools. Running buttons stop after opening.</p>
          </div>
          <span>{aiActionsOpen ? "Close AI Actions ↑" : "Open AI Actions ↓"}</span>
        </button>

        {!aiActionsOpen ? (
          <div className="aiRunningActions">
            <div className="aiRunningTrack">
              {[...copilotMissions, ...copilotMissions].map((item, index) => (
                <a key={`${item.title}-${index}`} href={item.href}>
                  {item.icon} {item.title}
                </a>
              ))}
            </div>
          </div>
        ) : (
          <div className="aiMarketPulseGrid">
            <a href="/search" className="aiMarketPulseCard">
              <strong>🤖 AI Smart Search</strong>
              <span>Search property, materials, services, rentals and investment opportunities from one place.</span>
            </a>

            <a href="/rfq/general/new" className="aiMarketPulseCard">
              <strong>⚡ Submit Requirement / RFQ</strong>
              <span>Describe your requirement and let AI route it to suitable local vendors.</span>
            </a>

            <a href="/price-today#prediction" className="aiMarketPulseCard">
              <strong>📊 Price Prediction</strong>
              <span>Check local market indication before buying land, materials or services.</span>
            </a>

            <a href="/vendor/discovery" className="aiMarketPulseCard">
              <strong>🎯 Find Vendors</strong>
              <span>Discover verified suppliers, service providers and rental vendors near you.</span>
            </a>

            <a href="/dashboard/procurement-live" className="aiMarketPulseCard">
              <strong>🧠 AI Procurement OS</strong>
              <span>Track live marketplace activity, RFQ signals and procurement intelligence.</span>
            </a>

            <a href="/investment/opportunities" className="aiMarketPulseCard">
              <strong>💼 AI Investment Signals</strong>
              <span>Explore growth zones, demand signals and investment opportunities.</span>
            </a>
          </div>
        )}
      </section>

      <section className="personalizationSection">
        <div className="sectionTitleRow">
          <div>
            <h2>Choose Your Marketplace Role</h2>
            <p>AI will guide the right workflow without repeating the same options.</p>
          </div>
          <a href={userMode.href}>Continue as {userMode.label} →</a>
        </div>

        <div className="userModeGrid">
          {userModes.map((mode) => (
            <button
              key={mode.key}
              type="button"
              onClick={() => setUserMode(mode)}
              className={userMode.key === mode.key ? "userModeCard active" : "userModeCard"}
            >
              <span>{mode.icon}</span>
              <strong>{mode.label}</strong>
              <small>{mode.title}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="liveMarketplaceSection imageFirstMarketplaceSection">
        <div className="sectionTitleRow">
          <div>
            <h2>AI Live Marketplace Feed</h2>
            <p>Fresh local listings, prices and opportunities surfaced from the 3bigha marketplace.</p>
          </div>
          <a href="/search">View all →</a>
        </div>

        {featuredLoading ? (
          <div className="marketplaceLoading">Loading live marketplace…</div>
        ) : featuredItems.length === 0 ? (
          <div className="marketplaceLoading">No live listings found yet.</div>
        ) : (
          <div className="marketplaceGrid">
            {featuredItems.map((item) => (
              <a key={`${item.module}-${item.id}`} href={item.href} className="marketplaceCard premiumMarketplaceCard">
                <div className="marketplaceImage premiumMarketplaceImage">
                  {item.image ? (
                    <img src={item.image} alt={item.title} />
                  ) : (
                    <span>{marketplaceEmoji(item.module)}</span>
                  )}

                  <div className="marketplaceImageOverlay">
                    <b>{aiTrustBadge(item.module)}</b>
                    <small>{aiConfidence(item.module)}</small>
                  </div>
                </div>

                <div className="marketplaceBody">
                  <div className="marketplaceTop">
                    <span>{item.badge}</span>
                    <strong>{item.module}</strong>
                  </div>

                  <h3>{item.title}</h3>
                  <p>{item.subtitle}</p>

                  <div className="aiCardBadges">
                    <span>✅ AI Trusted</span>
                    <span>⚡ Fast Action</span>
                    <span>📍 Local Signal</span>
                  </div>

                  <div className="marketplaceMeta">
                    <span>{item.meta}</span>
                    <b>{item.price}</b>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>

      <section className="categorySection">
        {categories.map((item) => (
          <a key={item.title} href={item.href} className="categoryCard">
            <div className="categoryIcon">{item.icon}</div>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
            <span>{item.cta} →</span>
          </a>
        ))}
      </section>

      <nav className="mobileAiBottomNav" aria-label="Mobile AI navigation">
        <a href="/">🏠<span>Home</span></a>
        <a href="/search">🔍<span>Search</span></a>
        <a href="/rfq/general/new">⚡<span>RFQ</span></a>
        <a href="/price-today#prediction">📊<span>Price</span></a>
        <a href="/dashboard/inbox">💬<span>Inbox</span></a>
      </nav>

      <div
        className={aiCopilotOpen ? "floatingAiCopilot isOpen" : "floatingAiCopilot"}
        role="button"
        tabIndex={0}
        aria-label="Open 3bigha AI assistant"
        onClick={() => setAiCopilotOpen((value) => !value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setAiCopilotOpen((value) => !value);
          }
        }}
      >
        <div className="floatingAiHeader">
          <div className="floatingAiOrb"></div>

          <div>
            <strong>3bigha AI</strong>
            <span>Local market intelligence assistant</span>
          </div>
        </div>

        <div className="floatingAiActions">
          <a href="/search">🔍 AI Smart Search</a>
          <a href="/rfq/general/new">⚡ Draft RFQ</a>
          <a href="/price-today#prediction">📊 Price Prediction</a>
          <a href="/vendor/discovery">🎯 Find Vendors</a>
          <a href="/dashboard/procurement-live">🧠 Mission Control</a>
          <a href="/dashboard/inbox">💬 Continue Workflow</a>
        </div>

        <div className="floatingAiFooter">
          Copilot memory: search → RFQ → vendor → deal workflow ready.
        </div>
      </div>

      <style jsx>{`
        .homePage {
          background: #f8fafc;
          min-height: 100vh;
          padding-bottom: 40px;
        }

        .homepageSeoIntro {
          background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
          border-bottom: 1px solid rgba(15, 23, 42, 0.08);
        }

        .homepageSeoIntroInner {
          width: min(100%, 1180px);
          margin: 0 auto;
          padding: 18px 16px 12px;
        }

        .homepageSeoIntro span {
          display: inline-flex;
          border-radius: 999px;
          background: #eef6ff;
          color: #0b57d0;
          border: 1px solid rgba(11, 87, 208, 0.12);
          padding: 6px 10px;
          font-size: 12px;
          font-weight: 950;
        }

        .homepageSeoIntro h2 {
          margin: 10px 0 0;
          color: #0f172a;
          font-size: clamp(22px, 3vw, 34px);
          line-height: 1.15;
          letter-spacing: -0.035em;
          font-weight: 950;
        }

        .homepageSeoIntro p {
          max-width: 980px;
          margin: 10px 0 0;
          color: #475569;
          font-size: 15px;
          line-height: 1.7;
          font-weight: 650;
        }

        .homepageSeoLinks {
          margin-top: 12px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .homepageSeoLinks a {
          border-radius: 999px;
          background: #ffffff;
          border: 1px solid rgba(15, 23, 42, 0.10);
          color: #0f172a;
          padding: 8px 11px;
          font-size: 12px;
          font-weight: 900;
          text-decoration: none;
        }

        .marketHero {
          background: linear-gradient(180deg, #ffffff 0%, #eef5ff 100%);
          border-bottom: 1px solid rgba(15, 23, 42, 0.08);
        }

        .marketHeroInner {
          width: min(100%, 1180px);
          margin: 0 auto;
          padding: 24px 16px 24px;
        }

        .marketHeroContent {
          width: 100%;
          max-width: 1180px;
          margin: 0 auto;
          display: block;
          position: relative;
          z-index: 1;
        }

        .heroTextBlock {
          width: 100%;
          max-width: 1180px;
          padding-top: 0;
        }

        .heroTrustRow {
          margin-top: 16px;
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .aiPowerRow {
          margin-top: 12px;
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .aiPowerRow a,
        .aiPowerRow button {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          background: linear-gradient(135deg, #eef6ff, #ffffff);
          border: 1px solid rgba(11, 87, 208, 0.14);
          padding: 8px 12px;
          color: #0b57d0;
          font-size: 13px;
          font-weight: 950;
          box-shadow: 0 8px 20px rgba(11, 87, 208, 0.06);
          text-decoration: none;
          cursor: pointer;
          font-family: inherit;
        }

        .heroTrustRow a {
          display: inline-flex;
          border-radius: 999px;
          background: #ffffff;
          border: 1px solid rgba(15, 23, 42, 0.10);
          padding: 8px 12px;
          color: #0f172a;
          font-size: 13px;
          font-weight: 900;
          box-shadow: 0 8px 20px rgba(15, 23, 42, 0.05);
          text-decoration: none;
        }

        .heroTrustRow a.priceTodayHeroChip {
          background: linear-gradient(135deg, #fff7ed, #ffedd5);
          border-color: rgba(234, 88, 12, 0.22);
          color: #c2410c;
          box-shadow: 0 10px 24px rgba(234, 88, 12, 0.12);
        }

        .marketBadge {
          display: inline-flex;
          padding: 7px 12px;
          border-radius: 999px;
          background: #e8f1ff;
          color: #0b57d0;
          font-size: 13px;
          font-weight: 900;
          border: 1px solid rgba(11, 87, 208, 0.14);
        }

        h1 {
          margin: 14px 0 0;
          color: #0f172a;
          font-size: clamp(28px, 5vw, 52px);
          line-height: 1.05;
          letter-spacing: -0.05em;
          font-weight: 950;
        }

        p {
          margin: 10px 0 0;
          color: #475569;
          font-size: 17px;
          line-height: 1.6;
        }

        .searchPanel {
          margin-top: 0;
          background: #ffffff;
          border: 1px solid rgba(15, 23, 42, 0.10);
          border-radius: 18px;
          padding: 14px;
          box-shadow: 0 10px 28px rgba(15, 23, 42, 0.08);
          width: 100%;
          max-width: 1180px;
          min-width: 0;
          position: relative;
          z-index: 1;
        }

        .moduleTabs {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 8px;
          max-width: 100%;
          scrollbar-width: thin;
        }

        .moduleTab {
          border: 1px solid rgba(15, 23, 42, 0.12);
          background: #f8fafc;
          color: #0f172a;
          border-radius: 999px;
          padding: 9px 13px;
          font-size: 13px;
          font-weight: 900;
          white-space: nowrap;
          cursor: pointer;
        }

        .moduleTab.active {
          background: #0b57d0;
          color: #ffffff;
          border-color: #0b57d0;
        }

        .searchRow {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 10px;
          margin-top: 10px;
        }

        .aiCommandSearchRow {
          grid-template-columns: 1fr auto auto;
        }

        .searchRow input {
          width: 100%;
          border: 1px solid rgba(15, 23, 42, 0.14);
          border-radius: 14px;
          padding: 15px 16px;
          font-size: 16px;
          outline: none;
          background: #ffffff;
          color: #0f172a;
        }

        .searchRow button {
          border: none;
          border-radius: 14px;
          padding: 0 26px;
          background: #0b57d0;
          color: #ffffff;
          font-weight: 950;
          cursor: pointer;
          box-shadow: 0 10px 24px rgba(11, 87, 208, 0.25);
        }

        .searchMeta {
          display: flex;
          gap: 14px;
          flex-wrap: wrap;
          margin-top: 12px;
          font-size: 13px;
          font-weight: 800;
          color: #64748b;
        }

        .aiCommandStream {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding: 4px 0 2px;
          margin-top: 10px;
          scrollbar-width: none;
        }

        .aiCommandStream::-webkit-scrollbar {
          display: none;
        }

        .aiCommandPulse {
          flex: 0 0 auto;
          border: 1px solid rgba(37,99,235,0.14);
          background: linear-gradient(135deg, #ffffff, #eff6ff);
          color: #1e3a8a;
          border-radius: 999px;
          padding: 7px 11px;
          font-size: 12px;
          font-weight: 900;
          box-shadow: 0 8px 18px rgba(37,99,235,0.06);
          animation: aiPulseMove 6s ease-in-out infinite;
        }

        @keyframes aiPulseMove {
          0% {
            transform: translateY(0);
          }

          50% {
            transform: translateY(-1px);
          }

          100% {
            transform: translateY(0);
          }
        }

        .searchMeta a {
          color: #0b57d0;
          text-decoration: none;
        }

                .aiGuideButton {
          border: none;
          background: #eef6ff;
          color: #0b57d0;
          font-weight: 950;
          cursor: pointer;
          padding: 0;
        }

        .aiGuideCard {
          margin-top: 12px;
          border-radius: 14px;
          border: 1px solid rgba(11, 87, 208, 0.16);
          background: linear-gradient(135deg, #f8fbff, #eef6ff);
          padding: 12px;
          display: flex;
          justify-content: space-between;
          gap: 14px;
          align-items: center;
        }

        .aiGuideCard strong {
          color: #0f172a;
          font-size: 15px;
          font-weight: 950;
        }

        .aiGuideCard p {
          margin: 4px 0 0;
          color: #475569;
          font-size: 13px;
          line-height: 1.45;
        }

        .aiGuideCard span {
          display: inline-flex;
          margin-top: 6px;
          color: #0b57d0;
          font-size: 12px;
          font-weight: 900;
        }

        .aiGuideCard button {
          border: none;
          border-radius: 12px;
          background: #0b57d0;
          color: #ffffff;
          padding: 10px 14px;
          font-weight: 950;
          cursor: pointer;
          white-space: nowrap;
        }

        .voiceSearchButton {
          background: #0f172a !important;
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.20) !important;
        }

        .liveSearchSuggestions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 10px;
        }

        .liveSearchSuggestions button {
          border: 1px solid rgba(37,99,235,0.14);
          background: #ffffff;
          color: #1e3a8a;
          border-radius: 999px;
          padding: 7px 11px;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
          box-shadow: 0 8px 18px rgba(37,99,235,0.05);
        }

        .liveSearchSuggestions button:hover {
          background: #eff6ff;
        }

        .aiPromptChips {
          margin-top: 12px;
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 2px;
          scrollbar-width: thin;
        }

        .aiPromptChips button {
          border: 1px solid rgba(11, 87, 208, 0.14);
          border-radius: 999px;
          background: #f8fbff;
          color: #0b57d0;
          padding: 8px 11px;
          font-size: 12px;
          font-weight: 950;
          white-space: nowrap;
          cursor: pointer;
        }

        .conversationalAiSection,
        .liveActivitySection {
          width: min(100%, 1180px);
          margin: 16px auto 0;
          padding: 0 16px;
        }

        .conversationalAiPanel {
          border-radius: 22px;
          background: linear-gradient(135deg, #0f172a, #1d4ed8);
          color: #ffffff;
          padding: 20px;
          display: grid;
          grid-template-columns: 1.35fr 1fr;
          gap: 18px;
          align-items: center;
          box-shadow: 0 18px 44px rgba(15, 23, 42, 0.16);
        }

        .conversationalAiBadge {
          display: inline-flex;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.12);
          color: #bfdbfe;
          padding: 6px 10px;
          font-size: 12px;
          font-weight: 950;
        }

        .conversationalAiPanel h2 {
          margin: 10px 0 0;
          font-size: 26px;
          line-height: 1.15;
          letter-spacing: -0.035em;
          font-weight: 950;
        }

        .conversationalAiPanel p {
          color: rgba(255, 255, 255, 0.78);
          font-size: 14px;
        }

        .conversationalAiActions {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .conversationalAiActions a {
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.10);
          color: #ffffff;
          padding: 12px;
          text-decoration: none;
          font-size: 13px;
          font-weight: 950;
        }

        .liveActivityGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
        }

        .liveActivityCard {
          border-radius: 18px;
          background: #ffffff;
          border: 1px solid rgba(15, 23, 42, 0.08);
          padding: 15px;
          text-decoration: none;
          box-shadow: 0 10px 26px rgba(15, 23, 42, 0.06);
        }

        .liveActivityCard span {
          font-size: 22px;
        }

        .liveActivityCard strong {
          display: block;
          margin-top: 8px;
          color: #0f172a;
          font-size: 14px;
          line-height: 1.4;
          font-weight: 950;
        }

        .liveActivityCard small {
          display: block;
          margin-top: 7px;
          color: #0b57d0;
          font-size: 11px;
          font-weight: 950;
        }

        .aiTrustLayer {
          margin-top: 12px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .aiTrustLayer span {
          border-radius: 999px;
          background: #ecfdf5;
          color: #047857;
          border: 1px solid rgba(4, 120, 87, 0.14);
          padding: 7px 10px;
          font-size: 12px;
          font-weight: 950;
        }

        .personalizationSection {
          width: min(100%, 1180px);
          margin: 18px auto 0;
          padding: 0 16px;
        }

        .userModeGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
        }

        .userModeCard {
          text-align: left;
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 18px;
          background: #ffffff;
          padding: 15px;
          cursor: pointer;
          box-shadow: 0 10px 26px rgba(15, 23, 42, 0.06);
          font-family: inherit;
        }

        .userModeCard.active {
          border-color: rgba(11, 87, 208, 0.34);
          background: linear-gradient(180deg, #eef6ff, #ffffff);
          box-shadow: 0 14px 34px rgba(11, 87, 208, 0.12);
        }

        .userModeCard span {
          font-size: 24px;
        }

        .userModeCard strong {
          display: block;
          margin-top: 8px;
          color: #0f172a;
          font-size: 15px;
          font-weight: 950;
        }

        .userModeCard small {
          display: block;
          margin-top: 6px;
          color: #64748b;
          font-size: 12px;
          line-height: 1.45;
          font-weight: 750;
        }

        .behaviorGrid {
          margin-top: 12px;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .behaviorCard {
          border-radius: 16px;
          background: #0f172a;
          color: #ffffff;
          padding: 14px;
          text-decoration: none;
          box-shadow: 0 12px 30px rgba(15, 23, 42, 0.12);
        }

        .behaviorCard strong {
          display: block;
          font-size: 14px;
          font-weight: 950;
        }

        .behaviorCard span {
          display: block;
          margin-top: 7px;
          color: rgba(255, 255, 255, 0.74);
          font-size: 12px;
          line-height: 1.45;
          font-weight: 750;
        }

        .districtIntelGrid {
          margin-top: 12px;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .districtIntelCard {
          border-radius: 16px;
          background: linear-gradient(180deg, #ffffff, #f8fbff);
          border: 1px solid rgba(11, 87, 208, 0.12);
          padding: 14px;
        }

        .districtIntelCard span {
          color: #0b57d0;
          font-size: 11px;
          font-weight: 950;
        }

        .districtIntelCard strong {
          display: block;
          margin-top: 7px;
          color: #0f172a;
          font-size: 16px;
          font-weight: 950;
        }

        .districtIntelCard small {
          display: block;
          margin-top: 5px;
          color: #64748b;
          font-size: 12px;
          font-weight: 750;
        }

        .realtimeTickerSection {
          width: min(100%, 1180px);
          margin: 16px auto 0;
          padding: 0 16px;
          overflow: hidden;
        }

        .realtimeTickerTrack {
          display: flex;
          gap: 10px;
          width: max-content;
          animation: realtimeTickerMove 34s linear infinite;
        }

        .realtimeTickerTrack span {
          border-radius: 999px;
          background: #0f172a;
          color: #ffffff;
          padding: 9px 13px;
          font-size: 12px;
          font-weight: 950;
          white-space: nowrap;
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12);
        }

        @keyframes realtimeTickerMove {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }

        .operatingFeelSection {
          width: min(100%, 1180px);
          margin: 18px auto 0;
          padding: 0 16px;
        }

        .operatingFeelGrid {
          display: grid;
          grid-template-columns: 1.1fr 1fr 0.9fr;
          gap: 14px;
          align-items: stretch;
        }

        .aiHeatmapCard,
        .smartAlertCard,
        .procurementDockCard {
          border-radius: 20px;
          background: #ffffff;
          border: 1px solid rgba(15, 23, 42, 0.08);
          padding: 16px;
          box-shadow: 0 12px 30px rgba(15, 23, 42, 0.07);
        }

        .aiHeatmapHeader {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: center;
          margin-bottom: 12px;
        }

        .aiHeatmapHeader strong,
        .procurementDockCard strong {
          color: #0f172a;
          font-size: 16px;
          font-weight: 950;
        }

        .aiHeatmapHeader span {
          border-radius: 999px;
          background: #ecfdf5;
          color: #047857;
          padding: 5px 8px;
          font-size: 11px;
          font-weight: 950;
        }

        .heatmapList,
        .smartAlertList {
          display: grid;
          gap: 9px;
        }

        .heatmapRow,
        .smartAlertList a {
          border-radius: 14px;
          background: #f8fafc;
          border: 1px solid rgba(15, 23, 42, 0.06);
          padding: 11px;
          text-decoration: none;
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: center;
        }

        .heatmapRow strong,
        .smartAlertList strong {
          display: block;
          color: #0f172a;
          font-size: 13px;
          font-weight: 950;
        }

        .heatmapRow small,
        .smartAlertList small,
        .procurementDockCard p {
          display: block;
          margin-top: 4px;
          color: #64748b;
          font-size: 12px;
          line-height: 1.4;
          font-weight: 750;
        }

        .heatmapScore {
          width: 42px;
          height: 42px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          background: #0b57d0;
          font-size: 13px;
          font-weight: 950;
          flex-shrink: 0;
        }

        .levelHigh {
          background: #dc2626;
        }

        .levelRising {
          background: #ea580c;
        }

        .levelActive {
          background: #0b57d0;
        }

        .levelWatch {
          background: #64748b;
        }

        .smartAlertList a {
          justify-content: flex-start;
        }

        .smartAlertList b {
          width: 34px;
          height: 34px;
          border-radius: 12px;
          background: #eef6ff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .procurementDockCard {
          background: linear-gradient(180deg, #0f172a, #172554);
          color: #ffffff;
        }

        .procurementDockCard strong {
          color: #ffffff;
        }

        .procurementDockCard p {
          color: rgba(255, 255, 255, 0.76);
        }

        .procurementDockCard div {
          display: grid;
          gap: 9px;
          margin-top: 14px;
        }

        .procurementDockCard a {
          border-radius: 13px;
          background: rgba(255, 255, 255, 0.10);
          color: #ffffff;
          text-decoration: none;
          padding: 11px 12px;
          font-size: 13px;
          font-weight: 950;
        }

        .universalBuyerActionStrip {
          width: min(100%, 1180px);
          margin: 14px auto 0;
          padding: 0 16px;
        }

        .universalBuyerActionInner {
          border-radius: 24px;
          background: linear-gradient(135deg, #0f172a, #1e3a8a);
          padding: 22px;
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 20px;
          align-items: center;
          box-shadow: 0 22px 54px rgba(15, 23, 42, 0.16);
        }

        .universalBuyerContent span {
          display: inline-flex;
          border-radius: 999px;
          background: rgba(255,255,255,0.12);
          color: #bfdbfe;
          padding: 6px 10px;
          font-size: 12px;
          font-weight: 950;
        }

        .universalBuyerContent h2 {
          margin: 10px 0 0;
          color: #ffffff;
          font-size: clamp(24px, 3vw, 36px);
          line-height: 1.1;
          letter-spacing: -0.04em;
          font-weight: 950;
        }

        .universalBuyerContent p {
          margin-top: 8px;
          color: rgba(255,255,255,0.76);
          font-size: 14px;
          line-height: 1.6;
          max-width: 620px;
        }

        .universalBuyerActions {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 10px;
        }

        .universalBuyerActions a {
          min-width: 150px;
          border-radius: 18px;
          background: rgba(255,255,255,0.10);
          border: 1px solid rgba(255,255,255,0.10);
          color: #ffffff;
          text-decoration: none;
          padding: 14px 16px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 14px;
          font-weight: 950;
          transition: all 0.16s ease;
          backdrop-filter: blur(10px);
        }

        .universalBuyerActions a:hover {
          transform: translateY(-2px);
          background: rgba(255,255,255,0.16);
        }

        .universalBuyerActions a span {
          line-height: 1.2;
        }

        .primaryBuyerAction {
          background: linear-gradient(135deg, #f97316, #ea580c) !important;
          border-color: rgba(255,255,255,0.16) !important;
          box-shadow: 0 14px 32px rgba(249, 115, 22, 0.26);
        }

        .homeSearchSection {
          width: min(100%, 1180px);
          margin: 16px auto 0;
          padding: 0 16px;
          position: relative;
          z-index: 1;
        }

        .homeSearchInner {
          max-width: 1180px;
          margin: 0 auto;
        }

        .copilotExperienceSection {
          width: min(100%, 1180px);
          margin: 18px auto 0;
          padding: 0 16px;
        }

        .copilotCommandPanel {
          border-radius: 24px;
          background: linear-gradient(135deg, #020617, #1d4ed8);
          color: #ffffff;
          padding: 20px;
          display: grid;
          grid-template-columns: 1.25fr 1fr;
          gap: 18px;
          align-items: center;
          box-shadow: 0 22px 54px rgba(15, 23, 42, 0.20);
        }

        .copilotCommandPanel span {
          color: #bfdbfe;
          font-size: 12px;
          font-weight: 950;
        }

        .copilotCommandPanel h2 {
          margin: 8px 0 0;
          font-size: 26px;
          line-height: 1.15;
          letter-spacing: -0.035em;
          font-weight: 950;
        }

        .copilotCommandPanel p {
          color: rgba(255, 255, 255, 0.78);
          font-size: 14px;
        }

        .copilotMemoryStrip {
          margin-top: 14px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .copilotMemoryStrip small {
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.12);
          color: #ffffff;
          padding: 7px 10px;
          font-size: 11px;
          font-weight: 950;
        }

        .copilotMissionGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .copilotMissionGrid a {
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.10);
          color: #ffffff;
          padding: 14px;
          text-decoration: none;
        }

        .copilotMissionGrid b {
          display: block;
          font-size: 22px;
        }

        .copilotMissionGrid strong {
          display: block;
          margin-top: 8px;
          font-size: 13px;
          font-weight: 950;
        }

        .regionalPromptRail {
          margin-top: 12px;
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 2px;
          scrollbar-width: thin;
        }

        .regionalPromptRail button {
          border: 1px solid rgba(11, 87, 208, 0.14);
          border-radius: 999px;
          background: #ffffff;
          color: #0b57d0;
          padding: 9px 12px;
          font-size: 12px;
          font-weight: 950;
          white-space: nowrap;
          cursor: pointer;
        }

        .aiMarketPulseSection {
          width: min(100%, 1180px);
          margin: 16px auto 0;
          padding: 0 16px;
        }

        .marketplaceMomentumSection {
          padding: 8px 20px 4px;
        }

        .marketplaceMomentumInner {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          max-width: 1400px;
          margin: 0 auto;
        }

        .momentumCard {
          border-radius: 16px;
          padding: 14px 16px;
          background: linear-gradient(135deg, #ffffff, #eff6ff);
          border: 1px solid rgba(37,99,235,0.14);
          box-shadow: 0 10px 26px rgba(37,99,235,0.06);
          color: #1e3a8a;
          font-weight: 900;
          font-size: 14px;
          line-height: 1.5;
          animation: momentumPulse 5s ease-in-out infinite;
        }

        @keyframes momentumPulse {
          0% {
            transform: translateY(0px);
          }

          50% {
            transform: translateY(-2px);
          }

          100% {
            transform: translateY(0px);
          }
        }

        @media (max-width: 980px) {
          .marketplaceMomentumInner {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 640px) {
          .marketplaceMomentumSection {
            padding: 8px 14px 4px;
          }

          .marketplaceMomentumInner {
            grid-template-columns: 1fr;
            gap: 10px;
          }

          .momentumCard {
            font-size: 13px;
            padding: 12px 14px;
          }
        }

        .regionalAiSection {
          width: min(100%, 1180px);
          margin: 12px auto 0;
          padding: 0 16px;
          overflow: hidden;
        }

        .regionalAiCard {
          border-radius: 18px;
          background: #ffffff;
          border: 1px solid rgba(15, 23, 42, 0.08);
          color: #0f172a;
          padding: 15px;
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
          box-shadow: 0 8px 22px rgba(15, 23, 42, 0.05);
        }

        .regionalAiContent span {
          display: inline-flex;
          border-radius: 999px;
          background: #eef6ff;
          border: 1px solid rgba(11, 87, 208, 0.10);
          padding: 5px 9px;
          font-size: 11px;
          font-weight: 950;
          color: #0b57d0;
        }

        .regionalAiContent h2 {
          margin: 8px 0 0;
          font-size: 21px;
          line-height: 1.2;
          font-weight: 950;
          letter-spacing: -0.03em;
          color: #0f172a;
        }

        .regionalAiContent p {
          margin-top: 5px;
          color: #64748b;
          font-size: 13px;
          line-height: 1.45;
        }

        .regionalPromptHeader {
          display: flex;
          justify-content: flex-end;
          margin-top: 10px;
        }

        .regionalToggleBtn {
          border: none;
          background: transparent;
          color: #0b57d0;
          font-size: 12px;
          font-weight: 950;
          cursor: pointer;
          padding: 0;
        }

        .regionalPromptExamples {
          width: 100%;
          max-width: 100%;
          min-width: 0;
          margin-top: 10px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          overflow: visible;
          padding-bottom: 2px;
        }

        .regionalPromptExamples button {
          border: 1px solid rgba(11, 87, 208, 0.10);
          border-radius: 999px;
          background: #f8fbff;
          color: #0f172a;
          padding: 7px 10px;
          font-size: 12px;
          font-weight: 850;
          cursor: pointer;
          white-space: normal;
          line-height: 1.35;
          max-width: 260px;
        }

        .regionalAiVisual {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
        }

        .regionalAiVisual div {
          border-radius: 999px;
          background: #f8fafc;
          border: 1px solid rgba(15, 23, 42, 0.08);
          padding: 6px 10px;
          font-size: 12px;
          font-weight: 950;
          color: #0b57d0;
        }

        .regionalAiVisual small {
          color: #64748b;
          font-size: 12px;
          font-weight: 750;
        }

        .aiMarketplaceToggle {
          width: 100%;
          border: 1px solid rgba(11, 87, 208, 0.10);
          border-radius: 18px;
          background: linear-gradient(180deg, #f8fbff 0%, #eef5ff 100%);
          color: #0f172a;
          padding: 15px;
          display: flex;
          justify-content: space-between;
          gap: 14px;
          align-items: center;
          cursor: pointer;
          text-align: left;
          box-shadow: 0 8px 20px rgba(15, 23, 42, 0.05);
        }

        .aiMarketplaceToggle h2 {
          margin: 0;
          font-size: 22px;
          font-weight: 950;
          color: #0f172a;
        }

        .aiMarketplaceToggle p {
          margin: 4px 0 0;
          color: #64748b;
          font-size: 13px;
          line-height: 1.45;
        }

        .aiMarketplaceToggle span {
          font-weight: 950;
          white-space: nowrap;
          color: #0b57d0;
          font-size: 13px;
        }

        .aiRunningActions {
          margin-top: 12px;
          overflow: hidden;
        }

        .aiRunningTrack {
          display: flex;
          gap: 10px;
          width: max-content;
          animation: realtimeTickerMove 28s linear infinite;
        }

        .aiRunningTrack a {
          border-radius: 999px;
          background: #f8fbff;
          border: 1px solid rgba(11, 87, 208, 0.10);
          color: #0b57d0;
          text-decoration: none;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 900;
          white-space: nowrap;
          box-shadow: none;
        }

        .aiMarketPulseGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        .aiMarketPulseCard {
          background: #ffffff;
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 16px;
          padding: 14px;
          text-decoration: none;
          box-shadow: 0 6px 16px rgba(15, 23, 42, 0.04);
          transition: all 0.16s ease;
        }

        .aiMarketPulseCard strong {
          display: block;
          color: #0f172a;
          font-size: 15px;
          font-weight: 950;
        }

        .aiMarketPulseCard:hover {
          transform: translateY(-2px);
          border-color: rgba(11, 87, 208, 0.18);
          box-shadow: 0 10px 22px rgba(11, 87, 208, 0.08);
        }

        .aiMarketPulseCard span {
          display: block;
          margin-top: 7px;
          color: #64748b;
          font-size: 13px;
          line-height: 1.45;
          font-weight: 700;
        }

        .aiPortalStrip {
          width: min(100%, 1180px);
          margin: 14px auto 0;
          padding: 14px 16px;
          border-radius: 16px;
          background: linear-gradient(135deg, #1847a3, #0f172a);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.10);
        }

        .aiPortalStrip strong {
          font-size: 18px;
          font-weight: 950;
        }

        .aiPortalStrip p {
          margin: 4px 0 0;
          color: rgba(255, 255, 255, 0.82);
          font-size: 13px;
        }

        .aiPortalStrip a {
          border-radius: 999px;
          background: #ffffff;
          color: #0b57d0;
          text-decoration: none;
          padding: 10px 14px;
          font-weight: 950;
          white-space: nowrap;
        }

        .quickActionSection,
        .categorySection {
          width: min(100%, 1180px);
          margin: 18px auto 0;
          padding: 0 16px;
          display: grid;
          gap: 14px;
        }

        .quickActionSection {
          margin-top: 14px;
        }

        .quickActionSection {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }

        .quickActionCard,
        .categoryCard {
          background: #ffffff;
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 18px;
          padding: 16px;
          text-decoration: none;
          color: inherit;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
        }

        .quickActionCard {
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }

        .quickIcon,
        .categoryIcon {
          font-size: 24px;
        }

        .quickActionCard h3,
        .categoryCard h3 {
          margin: 0;
          color: #0f172a;
          font-size: 16px;
          font-weight: 950;
        }

        .quickActionCard p,
        .categoryCard p {
          margin-top: 6px;
          font-size: 14px;
          line-height: 1.5;
        }

        .priceStrip {
          width: min(100%, 1180px);
          margin: 16px auto 0;
          padding: 16px;
          border-radius: 18px;
          background: linear-gradient(135deg, #fff7ed, #fee2e2);
          border: 1px solid rgba(234, 88, 12, 0.18);
          display: flex;
          justify-content: space-between;
          gap: 14px;
          align-items: center;
        }

        .priceStrip div {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .priceStrip strong {
          color: #9a3412;
          font-size: 18px;
          font-weight: 950;
        }

        .priceStrip span {
          color: #7c2d12;
          font-size: 14px;
          font-weight: 700;
        }

        .priceStrip a {
          color: #ffffff;
          background: #ea580c;
          border-radius: 12px;
          padding: 10px 14px;
          text-decoration: none;
          font-weight: 950;
          white-space: nowrap;
        }

        .categorySection {
          grid-template-columns: repeat(6, minmax(0, 1fr));
        }

        .categoryCard span {
          display: inline-flex;
          margin-top: 12px;
          color: #0b57d0;
          font-weight: 950;
          font-size: 13px;
        }

        .aiRecommendationSection {
          width: min(100%, 1180px);
          margin: 18px auto 0;
          padding: 0 16px;
        }

        .aiRecommendationGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }

        .aiRecommendationCard {
          background: linear-gradient(180deg, #ffffff, #f8fbff);
          border: 1px solid rgba(11, 87, 208, 0.12);
          border-radius: 18px;
          padding: 18px;
          text-decoration: none;
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
        }

        .aiRecommendationTag {
          display: inline-flex;
          border-radius: 999px;
          background: rgba(11, 87, 208, 0.08);
          color: #0b57d0;
          padding: 6px 10px;
          font-size: 11px;
          font-weight: 950;
          margin-bottom: 12px;
        }

        .aiRecommendationCard strong {
          display: block;
          color: #0f172a;
          font-size: 18px;
          line-height: 1.35;
          font-weight: 950;
        }

        .aiRecommendationCard span {
          display: block;
          margin-top: 10px;
          color: #64748b;
          font-size: 13px;
          line-height: 1.6;
          font-weight: 700;
        }

        .aiRecommendationSection {
          width: min(100%, 1180px);
          margin: 18px auto 0;
          padding: 0 16px;
        }

        .aiRecommendationGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }

        .aiRecommendationCard {
          background: linear-gradient(180deg, #ffffff, #f8fbff);
          border: 1px solid rgba(11, 87, 208, 0.12);
          border-radius: 18px;
          padding: 18px;
          text-decoration: none;
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
        }

        .aiRecommendationTag {
          display: inline-flex;
          border-radius: 999px;
          background: rgba(11, 87, 208, 0.08);
          color: #0b57d0;
          padding: 6px 10px;
          font-size: 11px;
          font-weight: 950;
          margin-bottom: 12px;
        }

        .aiRecommendationCard strong {
          display: block;
          color: #0f172a;
          font-size: 18px;
          line-height: 1.35;
          font-weight: 950;
        }

        .aiRecommendationCard span {
          display: block;
          margin-top: 10px;
          color: #64748b;
          font-size: 13px;
          line-height: 1.6;
          font-weight: 700;
        }

        .marketPulseSection {
          width: min(100%, 1180px);
          margin: 18px auto 0;
          padding: 0 16px;
        }

        .marketPulseCard {
          border-radius: 18px;
          background: linear-gradient(135deg, #fff7ed, #eef6ff);
          border: 1px solid rgba(15, 23, 42, 0.08);
          padding: 15px 16px;
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .marketPulseCard strong {
          color: #0f172a;
          font-size: 16px;
          font-weight: 950;
          white-space: nowrap;
        }

        .marketPulseItems {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          justify-content: flex-end;
        }

        .marketPulseItems a {
          border-radius: 999px;
          background: #ffffff;
          color: #0b57d0;
          text-decoration: none;
          padding: 7px 10px;
          font-size: 12px;
          font-weight: 950;
        }

        .personalizedFeedSection,
        .investmentIntelSection {
          width: min(100%, 1180px);
          margin: 18px auto 0;
          padding: 0 16px;
        }

        .personalizedFeedGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
        }

        .personalizedFeedCard {
          border-radius: 18px;
          background: linear-gradient(180deg, #ffffff, #f8fbff);
          border: 1px solid rgba(11, 87, 208, 0.12);
          padding: 16px;
          text-decoration: none;
          box-shadow: 0 10px 26px rgba(15, 23, 42, 0.06);
        }

        .personalizedFeedCard span {
          color: #0b57d0;
          font-size: 12px;
          font-weight: 950;
        }

        .personalizedFeedCard strong {
          display: block;
          margin-top: 8px;
          color: #0f172a;
          font-size: 17px;
          font-weight: 950;
        }

        .personalizedFeedCard small {
          display: block;
          margin-top: 7px;
          color: #64748b;
          font-size: 12px;
          line-height: 1.45;
          font-weight: 800;
        }

        .investmentIntelSection {
          border-radius: 22px;
          background: linear-gradient(135deg, #111827, #312e81);
          color: #ffffff;
          padding: 18px;
          display: grid;
          grid-template-columns: 0.9fr 1.5fr;
          gap: 16px;
          align-items: center;
          box-shadow: 0 18px 44px rgba(15, 23, 42, 0.16);
        }

        .investmentIntelSection span {
          color: #bfdbfe;
          font-size: 12px;
          font-weight: 950;
        }

        .investmentIntelSection h2 {
          margin: 8px 0 0;
          font-size: 24px;
          line-height: 1.2;
          letter-spacing: -0.035em;
          font-weight: 950;
        }

        .investmentIntelGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        .investmentIntelGrid a {
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.10);
          padding: 13px;
          color: #ffffff;
          text-decoration: none;
        }

        .investmentIntelGrid strong {
          display: block;
          font-size: 14px;
          font-weight: 950;
        }

        .investmentIntelGrid small {
          display: block;
          margin-top: 7px;
          color: rgba(255, 255, 255, 0.74);
          font-size: 12px;
          line-height: 1.45;
          font-weight: 700;
        }

        .floatingAiCopilot {
          position: fixed;
          right: 18px;
          bottom: 18px;
          z-index: 60;
          width: 260px;
          border-radius: 24px;
          background: linear-gradient(180deg, #0f172a, #172554);
          color: #ffffff;
          padding: 16px;
          box-shadow: 0 24px 60px rgba(15, 23, 42, 0.28);
          backdrop-filter: blur(18px);
          text-decoration: none;
        }

        .floatingAiHeader {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .floatingAiOrb {
          width: 14px;
          height: 14px;
          border-radius: 999px;
          background: #22c55e;
          box-shadow: 0 0 18px #22c55e;
          flex-shrink: 0;
        }

        .floatingAiHeader strong {
          display: block;
          font-size: 15px;
          font-weight: 950;
          line-height: 1;
        }

        .floatingAiHeader span {
          display: block;
          margin-top: 4px;
          color: rgba(255, 255, 255, 0.7);
          font-size: 11px;
          font-weight: 700;
        }

        .floatingAiActions {
          margin-top: 14px;
          display: grid;
          gap: 8px;
        }

        .floatingAiActions a {
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.08);
          color: #ffffff;
          text-decoration: none;
          padding: 10px 12px;
          font-size: 13px;
          font-weight: 900;
          transition: background 140ms ease;
        }

        .floatingAiActions a:hover {
          background: rgba(255, 255, 255, 0.16);
        }

        .floatingAiFooter {
          margin-top: 14px;
          color: rgba(255, 255, 255, 0.72);
          font-size: 11px;
          line-height: 1.5;
          font-weight: 700;
        }

        .liveMarketplaceSection {
          width: min(100%, 1180px);
          margin: 18px auto 0;
          padding: 0 16px;
        }

        .sectionTitleRow {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 12px;
        }

        .sectionTitleRow h2 {
          margin: 0;
          color: #0f172a;
          font-size: 24px;
          font-weight: 950;
          letter-spacing: -0.03em;
        }

        .sectionTitleRow p {
          margin: 4px 0 0;
          color: #64748b;
          font-size: 14px;
        }

        .sectionTitleRow a {
          color: #0b57d0;
          text-decoration: none;
          font-weight: 950;
          white-space: nowrap;
        }

        .marketplaceGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
          align-items: stretch;
        }

        .marketplaceCard {
          min-width: 0;
          height: 100%;
          background: #ffffff;
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 22px;
          overflow: hidden;
          color: inherit;
          text-decoration: none;
          box-shadow: 0 14px 34px rgba(15, 23, 42, 0.08);
          transition: transform 160ms ease, box-shadow 160ms ease;
        }

        .marketplaceCard:hover {
          transform: translateY(-3px);
          box-shadow: 0 20px 44px rgba(15, 23, 42, 0.12);
        }

        .marketplaceImage {
          height: 180px;
          background: linear-gradient(135deg, #eff6ff, #f8fafc);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #0b57d0;
          font-size: 44px;
          font-weight: 950;
          position: relative;
          overflow: hidden;
        }

        .premiumMarketplaceImage {
          height: 215px;
        }

        .marketplaceImageOverlay {
          position: absolute;
          left: 12px;
          right: 12px;
          bottom: 12px;
          border-radius: 14px;
          background: rgba(15, 23, 42, 0.82);
          color: #ffffff;
          padding: 10px 11px;
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: center;
          backdrop-filter: blur(14px);
        }

        .marketplaceImageOverlay b {
          font-size: 12px;
          font-weight: 950;
        }

        .marketplaceImageOverlay small {
          color: #bfdbfe;
          font-size: 11px;
          font-weight: 900;
          white-space: nowrap;
        }

        .marketplaceImage img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .marketplaceBody {
          padding: 16px;
        }

        .marketplaceTop {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          align-items: center;
          font-size: 11px;
          font-weight: 950;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .marketplaceTop span {
          color: #0b57d0;
          background: #eef6ff;
          border-radius: 999px;
          padding: 5px 8px;
        }

        .marketplaceTop strong {
          color: #0f172a;
        }

        .marketplaceBody h3 {
          margin: 12px 0 0;
          color: #0f172a;
          font-size: 18px;
          line-height: 1.3;
          font-weight: 950;
        }

        .marketplaceBody p {
          margin: 7px 0 0;
          color: #64748b;
          font-size: 13px;
          line-height: 1.5;
          min-height: 40px;
        }

        .aiCardBadges {
          margin-top: 12px;
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .aiCardBadges span {
          border-radius: 999px;
          background: #f0fdf4;
          color: #047857;
          border: 1px solid rgba(4, 120, 87, 0.12);
          padding: 5px 7px;
          font-size: 11px;
          font-weight: 950;
        }

        .marketplaceMeta {
          margin-top: 14px;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 10px;
          font-size: 12px;
          color: #64748b;
        }

        .marketplaceMeta b {
          color: #dc2626;
          font-size: 16px;
          white-space: nowrap;
        }

        .marketplaceLoading {
          background: #ffffff;
          border: 1px dashed rgba(15, 23, 42, 0.18);
          border-radius: 16px;
          padding: 18px;
          color: #64748b;
          font-weight: 800;
        }

        @media (max-width: 980px) {
          .quickActionSection {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .searchPanel {
            margin-top: 0;
            max-width: 100%;
          }

          .aiMarketPulseGrid,
          .liveActivityGrid,
          .personalizedFeedGrid,
          .userModeGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .behaviorGrid,
          .districtIntelGrid {
            grid-template-columns: 1fr;
          }

          .operatingFeelGrid,
          .copilotCommandPanel {
            grid-template-columns: 1fr;
          }

          .investmentIntelSection {
            grid-template-columns: 1fr;
          }

          .investmentIntelGrid {
            grid-template-columns: 1fr;
          }

          .conversationalAiPanel {
            grid-template-columns: 1fr;
          }

          .aiRecommendationGrid {
            grid-template-columns: 1fr;
          }

          .marketHeroContent {
            grid-template-columns: 1fr;
            gap: 18px;
          }

          .heroTextBlock {
            width: 100%;
            max-width: 100%;
          }

          .marketplaceGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .aiRecommendationGrid {
            grid-template-columns: 1fr;
          }

          .categorySection {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 640px) {
        .homepageSeoIntroInner {
            padding: 14px 10px 10px;
          }

          .homepageSeoIntro h2 {
            font-size: 22px;
          }

          .homepageSeoIntro p {
            font-size: 13px;
            line-height: 1.6;
          }

          .homepageSeoLinks {
            max-height: 86px;
            overflow: hidden;
          }
          .homePage {
            width: 100%;
            overflow-x: hidden;
          }

          .universalBuyerActionStrip {
            margin-top: 10px;
            padding-left: 10px;
            padding-right: 10px;
          }

          .universalBuyerActionInner {
            grid-template-columns: 1fr;
            border-radius: 18px;
            padding: 16px;
            gap: 16px;
          }

          .universalBuyerContent h2 {
            font-size: 24px;
          }

          .universalBuyerContent p {
            font-size: 13px;
          }

          .universalBuyerActions {
            justify-content: stretch;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }

          .universalBuyerActions a {
            min-width: 0;
            border-radius: 14px;
            padding: 13px;
            font-size: 13px;
          }

          .primaryBuyerAction {
            grid-column: span 2;
          }

          .regionalAiCard {
            grid-template-columns: 1fr;
            border-radius: 16px;
            padding: 15px;
          }

          .regionalAiContent h2 {
            font-size: 22px;
          }

          .regionalAiVisual {
            margin-top: 6px;
          }

          .marketHeroContent {
            grid-template-columns: 1fr;
          }

          .heroTrustRow {
            gap: 8px;
          }

          .heroTrustRow a {
            font-size: 12px;
            padding: 7px 10px;
          }

          .marketHeroInner {
            padding: 18px 10px 26px;
          }

          .aiMarketPulseSection,
          .realtimeTickerSection,
          .operatingFeelSection,
          .personalizationSection,
          .copilotExperienceSection {
            margin-top: 10px;
            padding-left: 10px;
            padding-right: 10px;
          }

          .copilotCommandPanel {
            border-radius: 16px;
            padding: 15px;
            grid-template-columns: 1fr;
          }

          .copilotCommandPanel h2 {
            font-size: 21px;
          }

          .copilotMissionGrid {
            grid-template-columns: 1fr;
          }

          .userModeGrid,
          .behaviorGrid,
          .districtIntelGrid {
            grid-template-columns: 1fr;
            gap: 10px;
          }

          .userModeCard,
          .behaviorCard,
          .districtIntelCard {
            border-radius: 14px;
            padding: 13px;
          }

          .realtimeTickerTrack span {
            padding: 8px 11px;
            font-size: 11px;
          }

          .operatingFeelGrid {
            grid-template-columns: 1fr;
            gap: 10px;
          }

          .aiHeatmapCard,
          .smartAlertCard,
          .procurementDockCard {
            border-radius: 15px;
            padding: 13px;
          }

          .aiMarketPulseGrid {
            grid-template-columns: 1fr;
            gap: 10px;
          }

          .aiMarketPulseCard {
            border-radius: 14px;
            padding: 13px;
          }

          .aiRecommendationSection {
            margin-top: 10px;
            padding-left: 10px;
            padding-right: 10px;
          }

          .aiRecommendationCard {
            border-radius: 14px;
            padding: 14px;
          }

          .aiRecommendationCard strong {
            font-size: 16px;
          }

          .liveMarketplaceSection,
          .aiRecommendationSection,
          .personalizedFeedSection,
          .investmentIntelSection {
            margin-top: 12px;
            padding-left: 10px;
            padding-right: 10px;
          }

          .personalizedFeedGrid {
            grid-template-columns: 1fr;
            gap: 10px;
          }

          .investmentIntelSection {
            border-radius: 16px;
            padding: 15px;
            grid-template-columns: 1fr;
          }

          .investmentIntelSection h2 {
            font-size: 21px;
          }

          .investmentIntelGrid {
            grid-template-columns: 1fr;
          }

          .aiRecommendationGrid {
            grid-template-columns: 1fr;
            gap: 10px;
          }

          .aiRecommendationCard {
            border-radius: 14px;
            padding: 14px;
          }

          .aiRecommendationCard strong {
            font-size: 16px;
          }

          .sectionTitleRow {
            align-items: flex-start;
            flex-direction: column;
            gap: 6px;
          }

          .sectionTitleRow h2 {
            font-size: 21px;
          }

          .marketplaceGrid {
            grid-template-columns: 1fr;
            gap: 10px;
          }

          .marketplaceImage {
            height: 190px;
          }

          .premiumMarketplaceImage {
            height: 210px;
          }

          .marketplaceImageOverlay {
            left: 10px;
            right: 10px;
            bottom: 10px;
          }

          .marketplaceCard {
            border-radius: 14px;
          }

          .marketHeroContent {
            padding: 0;
          }

          .marketHero {
            background: #ffffff;
          }

          .marketBadge {
            font-size: 12px;
          }

          .aiPowerRow {
            gap: 8px;
          }

          .aiPowerRow a,
          .aiPowerRow button {
            font-size: 12px;
            padding: 7px 10px;
          }

          .aiPortalStrip {
            margin-top: 10px;
            padding: 14px 10px;
            border-radius: 14px;
            flex-direction: column;
            align-items: flex-start;
          }

          .aiPortalStrip a {
            width: 100%;
            text-align: center;
          }

          h1 {
            font-size: 28px;
            letter-spacing: -0.035em;
          }

          p {
            font-size: 15px;
          }

          .searchPanel {
            margin-top: 8px;
            border-radius: 14px;
            padding: 10px;
            box-shadow: none;
          }

          .searchRow,
          .aiCommandSearchRow {
            grid-template-columns: 1fr;
          }

          .aiPromptChips {
            margin-top: 10px;
          }

          .conversationalAiSection,
          .liveActivitySection {
            margin-top: 10px;
            padding-left: 10px;
            padding-right: 10px;
          }

          .conversationalAiPanel {
            border-radius: 16px;
            padding: 15px;
          }

          .conversationalAiPanel h2 {
            font-size: 21px;
          }

          .conversationalAiActions {
            grid-template-columns: 1fr;
          }

          .liveActivityGrid {
            grid-template-columns: 1fr;
            gap: 10px;
          }

          .searchRow button {
            height: 46px;
          }

          .aiGuideCard {
            flex-direction: column;
            align-items: flex-start;
          }

          .aiGuideCard button {
            width: 100%;
          }

          .quickActionSection,
          .categorySection,
          .priceStrip {
            width: 100%;
            margin-top: 10px;
            padding-left: 10px;
            padding-right: 10px;
          }

          .quickActionSection,
          .categorySection {
            grid-template-columns: 1fr;
            gap: 10px;
          }

          .quickActionCard,
          .categoryCard {
            border-radius: 14px;
            padding: 13px;
          }

          .priceStrip {
            border-radius: 14px;
            flex-direction: column;
            align-items: flex-start;
          }

          .priceStrip a {
            width: 100%;
            text-align: center;
          }

          .marketPulseSection {
            margin-top: 12px;
            padding-left: 10px;
            padding-right: 10px;
          }

          .marketPulseCard {
            border-radius: 14px;
            flex-direction: column;
            align-items: flex-start;
          }

          .marketPulseItems {
            justify-content: flex-start;
          }

          .mobileAiBottomNav {
            position: fixed;
            left: 10px;
            right: 10px;
            bottom: 10px;
            z-index: 70;
            display: grid;
            grid-template-columns: repeat(5, minmax(0, 1fr));
            gap: 6px;
            border: 1px solid rgba(15, 23, 42, 0.10);
            border-radius: 18px;
            background: rgba(255, 255, 255, 0.94);
            padding: 8px;
            box-shadow: 0 18px 44px rgba(15, 23, 42, 0.18);
            backdrop-filter: blur(16px);
          }

          .mobileAiBottomNav a {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 3px;
            border-radius: 12px;
            color: #0f172a;
            text-decoration: none;
            font-size: 15px;
            font-weight: 950;
            padding: 6px 4px;
          }

          .mobileAiBottomNav span {
            font-size: 10px;
            font-weight: 950;
          }

          .floatingAiCopilot {
            right: 12px;
            bottom: 92px;
            width: 64px;
            height: 64px;
            border-radius: 999px;
            padding: 0;
            overflow: hidden;
            background: linear-gradient(135deg, #0f172a, #1d4ed8);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 18px 44px rgba(15, 23, 42, 0.28);
            cursor: pointer;
          }

          .floatingAiCopilot.isOpen {
            width: calc(100vw - 24px);
            max-width: 340px;
            height: auto;
            border-radius: 22px;
            padding: 14px;
            display: block;
          }

          .floatingAiCopilot .floatingAiHeader {
            justify-content: center;
          }

          .floatingAiCopilot.isOpen .floatingAiHeader {
            justify-content: flex-start;
          }

          .floatingAiCopilot .floatingAiHeader div:not(.floatingAiOrb),
          .floatingAiCopilot .floatingAiActions,
          .floatingAiCopilot .floatingAiFooter {
            display: none;
          }

          .floatingAiCopilot.isOpen .floatingAiHeader div:not(.floatingAiOrb) {
            display: block;
          }

          .floatingAiCopilot.isOpen .floatingAiActions {
            display: grid;
          }

          .floatingAiCopilot.isOpen .floatingAiFooter {
            display: block;
          }

          .floatingAiOrb {
            width: 18px;
            height: 18px;
          }

          .homePage {
            padding-bottom: 96px;
          }
        }
      `}</style>
    </main>
  );
}