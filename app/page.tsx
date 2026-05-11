// app/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import JsonLd from "@/components/seo/JsonLd";
import { organizationSchema, websiteSchema } from "@/lib/seo/schema";

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
  const [aiCopilotOpen, setAiCopilotOpen] = useState(false);

  const activeModule = useMemo(
    () => modules.find((m) => m.key === scope) || modules[0],
    [scope]
  );

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

    function runAISmartGuide() {
    const originalQuery = query.trim();
    const clean = originalQuery.toLowerCase();

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

    fetch("/api/ai/search-intent", {
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
    }).catch(() => null);

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
      <JsonLd data={[organizationSchema(), websiteSchema()]} />

      <section className="marketHero">
        <div className="marketHeroInner">
          <div className="marketHeroContent">
            <div className="heroTextBlock">
              <div className="marketBadge">Verified local marketplace</div>

              <h1>Find Property, Materials, Services & Rentals</h1>

              <p>
                Search listings, submit requirements, compare prices and connect with local providers.
              </p>

              <div className="heroTrustRow">
                <a href="/property">🏠 Property</a>
                <a href="/materials">🧱 Materials</a>
                <a href="/services">🛠️ Services</a>
                <a href="/rentals">🚜 Rentals</a>
                <a href="/investment/opportunities">💼 Investment</a>
                <a href="/price-today#prediction" className="priceTodayHeroChip">
                  📊 Price Today
                </a>
              </div>

              <div className="aiPowerRow">
                <a href="/search">🤖 AI Smart Search</a>
                <a href="/search">📍 Local Market Discovery</a>
                <a href="/rfq/general/new">⚡ Instant RFQ Assist</a>
                <a href="/price-today#prediction">📊 Local Price Prediction</a>
                <a href="/vendor/discovery">🎯 Nearby Vendor Match</a>
              </div>
            </div>
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

            <div className="searchRow">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") runSearch();
                }}
                placeholder={activeModule.placeholder}
              />

              <button type="button" onClick={runSearch}>
                Search
              </button>
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

      <section className="aiMarketPulseSection">
        <div className="sectionTitleRow">
          <div>
            <h2>AI Local Market Intelligence</h2>
            <p>Smart tools for price, vendor, RFQ and local market discovery.</p>
          </div>
          <a href="/search">Explore AI Search →</a>
        </div>

        <div className="aiMarketPulseGrid">
          <a href="/search" className="aiMarketPulseCard">
            <strong>🤖 AI Smart Search</strong>
            <span>Search property, materials, services, rentals and investment opportunities from one place.</span>
          </a>

          <a href="/price-today#prediction" className="aiMarketPulseCard">
            <strong>📊 Local Price Prediction</strong>
            <span>Check local rate movement for land, construction materials and marketplace pricing.</span>
          </a>

          <a href="/rfq/general/new" className="aiMarketPulseCard">
            <strong>⚡ Instant RFQ Assist</strong>
            <span>Describe your requirement and let 3bigha route it toward suitable vendors.</span>
          </a>

          <a href="/vendor/discovery" className="aiMarketPulseCard">
            <strong>🎯 Nearby Vendor Match</strong>
            <span>Find relevant local suppliers, service providers and rental vendors faster.</span>
          </a>
        </div>
      </section>

      <section className="aiPortalStrip">
        <div>
          <strong>AI-powered local marketplace engine</strong>
          <p>
            Search local markets, compare nearby prices, submit RFQs, predict demand and connect with property owners, suppliers, service providers, rental vendors and investors.
          </p>
        </div>

        <a href="/rfq/general/new">Start with AI →</a>
      </section>

      <section className="aiRecommendationSection">
        <div className="sectionTitleRow">
          <div>
            <h2>AI Recommended Near You</h2>
            <p>Smart recommendations based on local market activity, pricing trends and buyer demand.</p>
          </div>

          <a href="/search">Explore Smart Discovery →</a>
        </div>

        <div className="aiRecommendationGrid">
          <a href="/property" className="aiRecommendationCard">
            <div className="aiRecommendationTag">🔥 Trending Property</div>
            <strong>High-demand residential plots in nearby local markets</strong>
            <span>AI detected rising buyer activity around developing residential zones.</span>
          </a>

          <a href="/materials" className="aiRecommendationCard">
            <div className="aiRecommendationTag">📈 Price Intelligence</div>
            <strong>Cement and aggregate demand increasing this week</strong>
            <span>Marketplace activity shows growing procurement movement from local suppliers.</span>
          </a>

          <a href="/services" className="aiRecommendationCard">
            <div className="aiRecommendationTag">⚡ Vendor Match</div>
            <strong>Construction and legal services actively responding</strong>
            <span>AI-assisted RFQ routing is helping buyers receive faster quotations.</span>
          </a>
        </div>
      </section>

      <section className="quickActionSection">
        {quickActions.map((item) => (
          <a key={item.title} href={item.href} className="quickActionCard">
            <div className="quickIcon">{item.icon}</div>
            <div>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </div>
          </a>
        ))}
      </section>

      <section className="priceStrip">
        <div>
          <strong>Price Today</strong>
          <span>Cement, steel, sand, brick, land and per sq.ft. market indication.</span>
        </div>
        <a href="/price-today#prediction">Check Prediction →</a>
      </section>

      <section className="marketPulseSection">
        <div className="marketPulseCard">
          <strong>Live Local Market Pulse</strong>
          <div className="marketPulseItems">
            <a href="/price-today">📈 Cement demand rising</a>
            <a href="/property">🏠 Land search active</a>
            <a href="/rentals">🚜 Rentals moving fast</a>
            <a href="/rfq/general/new">⚡ Vendors responding</a>
          </div>
        </div>
      </section>

      <section className="liveMarketplaceSection">
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
              <a key={`${item.module}-${item.id}`} href={item.href} className="marketplaceCard">
                <div className="marketplaceImage">
                  {item.image ? (
                    <img src={item.image} alt={item.title} />
                  ) : (
                    <span>{item.module === "Property" ? "🏠" : item.module === "Material" ? "🧱" : item.module === "Service" ? "🛠️" : "🚜"}</span>
                  )}
                </div>

                <div className="marketplaceBody">
                  <div className="marketplaceTop">
                    <span>{item.badge}</span>
                    <strong>{item.module}</strong>
                  </div>

                  <h3>{item.title}</h3>
                  <p>{item.subtitle}</p>

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
        </div>

        <div className="floatingAiFooter">
          Ask AI about property, materials, services, rentals and investments.
        </div>
      </div>

      <style jsx>{`
        .homePage {
          background: #f8fafc;
          min-height: 100vh;
          padding-bottom: 40px;
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

        .aiMarketPulseSection {
          width: min(100%, 1180px);
          margin: 16px auto 0;
          padding: 0 16px;
        }

        .aiMarketPulseGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        .aiMarketPulseCard {
          background: #ffffff;
          border: 1px solid rgba(11, 87, 208, 0.14);
          border-radius: 18px;
          padding: 16px;
          text-decoration: none;
          box-shadow: 0 10px 26px rgba(15, 23, 42, 0.06);
        }

        .aiMarketPulseCard strong {
          display: block;
          color: #0f172a;
          font-size: 15px;
          font-weight: 950;
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

          .aiMarketPulseGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
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
          .homePage {
            width: 100%;
            overflow-x: hidden;
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

          .aiMarketPulseSection {
            margin-top: 10px;
            padding-left: 10px;
            padding-right: 10px;
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
          .aiRecommendationSection {
            margin-top: 12px;
            padding-left: 10px;
            padding-right: 10px;
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
            height: 170px;
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

          .searchRow {
            grid-template-columns: 1fr;
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