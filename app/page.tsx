"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import JsonLd from "@/components/seo/JsonLd";
import MobileOperationalDock from "@/components/mobile/MobileOperationalDock";
import {
  aiMarketplaceSchema,
  marketplaceFaqSchema,
  organizationSchema,
  websiteSchema,
} from "@/lib/seo/schema";

type SearchScope = "property" | "materials" | "services" | "rentals" | "investment";

type DiscoveryMemoryItem = {
  id: string;
  module: "property" | "materials" | "services" | "rentals";
  title: string;
  href: string;
  city?: string | null;
  district?: string | null;
  locality?: string | null;
  type?: string | null;
  category?: string | null;
  price?: number | null;
  viewedAt: number;
};

function readDiscoveryMemory(): DiscoveryMemoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem("3bigha.discovery.memory.v1");
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice(0, 8) : [];
  } catch {
    return [];
  }
}

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

function moneyINR(value: any) {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num) || num <= 0) return "";
  return `₹${num.toLocaleString("en-IN")}`;
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

function clipText(value: any, max = 86) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max).trim()}…` : text;
}

const categoryCards = [
  { title: "Property", icon: "🏠", text: "Land, plots, houses and commercial property", count: "Buy • Sell • Invest", href: "/property" },
  { title: "Materials", icon: "🧱", text: "Cement, steel, sand, bricks and construction materials", count: "Compare • Buy • RFQ", href: "/materials" },
  { title: "Services", icon: "🛠️", text: "Contractors, labour, plumbing, electrical and legal support", count: "Hire • Compare • Execute", href: "/services" },
  { title: "Rentals", icon: "🚜", text: "JCB, machinery, scaffolding and construction rentals", count: "Rent • Operate • Deliver", href: "/rentals" },
];

const tools = [
  { title: "Construction Cost", text: "Estimate house construction cost and materials", href: "/construction-cost", action: "Open" },
  { title: "Price Today", text: "Check latest cement, steel and material prices", href: "/price-today", action: "Open" },
  { title: "Marketplace Search", text: "Search property, materials, services and rentals", href: "/search", action: "Search" },
  { title: "EMI Calculator", text: "Calculate property EMI and loan estimate", href: "/emi-calculator", action: "Calculate" },
];

const marketPrices = [
  ["Cement (53 Grade)", "₹425 / Bag", "↓ 2.3%"],
  ["Steel (TMT 12mm)", "₹58,500 / Ton", "↑ 1.2%"],
  ["Sand (River)", "₹1,600 / CFT", "↑ 0.5%"],
  ["Bricks (1st Class)", "₹8.50 / Pcs", "↓ 1.8%"],
  ["Coarse Aggregate", "₹1,250 / CFT", "→ 0.0%"],
  ["Fine Aggregate", "₹1,100 / CFT", "↑ 0.9%"],
];

const blogItems = [
  { title: "Cement Price Trend: May 2025 Update", meta: "Market Analysis · May 15, 2025" },
  { title: "Top 10 Construction Mistakes to Avoid", meta: "Construction Tips · May 14, 2025" },
  { title: "Best Investment Zones in Cooch Behar", meta: "Investment Guide · May 13, 2025" },
];

const fallbackFeatured: MarketplaceItem[] = [
  { id: "plot", module: "Property", title: "2 Katha Residential Plot", subtitle: "Cooch Behar, WB", meta: "2 Katha · North Facing", price: "₹12.5 Lakh", href: "/property", badge: "Plot", image: null },
  { id: "cement", module: "Material", title: "UltraTech Cement 53 Grade", subtitle: "Cooch Behar, WB", meta: "Bulk Available", price: "₹425 / Bag", href: "/materials", badge: "Material", image: null },
  { id: "mason", module: "Service", title: "Mason for House Construction", subtitle: "Cooch Behar, WB", meta: "Experienced · Verified", price: "₹700 / Day", href: "/services", badge: "Service", image: null },
  { id: "jcb", module: "Rental", title: "JCB 3DX Rental", subtitle: "Cooch Behar, WB", meta: "With Operator", price: "₹1,800 / Hour", href: "/rentals", badge: "Rental", image: null },
  { id: "house", module: "Property", title: "3 BHK Independent House", subtitle: "Cooch Behar, WB", meta: "3 BHK · 1200 sqft", price: "₹35 Lakh", href: "/property", badge: "Property", image: null },
];

function moduleIcon(module: MarketplaceItem["module"]) {
  if (module === "Property") return "🏡";
  if (module === "Material") return "🏗️";
  if (module === "Service") return "👷";
  return "🚜";
}

type DiscoveryRail = {
  title: string;
  subtitle: string;
  href: string;
  icon: string;
  tone: string;
};

function buildHomepageDiscoveryRails(
  recentDiscovery: DiscoveryMemoryItem[],
  featuredItems: MarketplaceItem[]
): DiscoveryRail[] {
  const latest = recentDiscovery[0];
  const location =
    latest?.locality ||
    latest?.city ||
    latest?.district ||
    "Cooch Behar";

  const encodedLocation = encodeURIComponent(location);

  const rails: DiscoveryRail[] = [
    {
      title: `Trending near ${location}`,
      subtitle: "Explore property, materials, services and rentals around this area.",
      href: `/search?q=${encodedLocation}`,
      icon: "📍",
      tone: "Local Pulse",
    },
    {
      title: "Popular property opportunities",
      subtitle: "Browse land, plots and property opportunities with strong local demand.",
      href: `/property?sort=growth&q=${encodedLocation}`,
      icon: "📈",
      tone: "Popular",
    },
    {
      title: "Plan your construction",
      subtitle: "Plan house construction cost, materials and contractor requirements.",
      href: `/house-construction-cost?location=${encodedLocation}`,
      icon: "🏗️",
      tone: "Construction",
    },
    {
      title: "Materials for your project",
      subtitle: "Cement, TMT, sand, bricks, tiles and finishing materials.",
      href: `/materials?q=${encodedLocation}`,
      icon: "🧱",
      tone: "Materials",
    },
    {
      title: "Services you may need",
      subtitle: "Mason, architect, plumber, electrician, painter and legal support.",
      href: `/services?q=${encodedLocation}`,
      icon: "🛠️",
      tone: "Services",
    },
    {
      title: "Rent construction equipment",
      subtitle: "JCB, mixer, scaffolding and site equipment near your area.",
      href: `/rentals?q=${encodedLocation}`,
      icon: "🚜",
      tone: "Rentals",
    },
  ];

  const hasLiveProperty = featuredItems.some((item) => item.module === "Property");
  if (!hasLiveProperty) {
    rails.push({
      title: "Browse latest property listings",
      subtitle: "See homes, plots, land and commercial spaces available now.",
      href: "/property",
      icon: "🏡",
      tone: "Property",
    });
  }

  return rails.slice(0, 6);
}

export default function HomePage() {
  const router = useRouter();
  const [scope, setScope] = useState<SearchScope>("property");
  const [query, setQuery] = useState("");
  const [mobileExpandedSections, setMobileExpandedSections] = useState<Record<string, boolean>>({});

  function toggleMobileSection(section: string) {
    setMobileExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  }
  const [featuredItems, setFeaturedItems] = useState<MarketplaceItem[]>(fallbackFeatured);
  const [recentDiscovery, setRecentDiscovery] = useState<DiscoveryMemoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<"search" | "ai" | "post">("search");

  const placeholder = useMemo(() => {
    
    if (activeTab === "post") return "Describe your requirement clearly. Example: Need 500 bags cement in Cooch Behar within 7 days.";
    return "Search property, materials, services, rentals or construction needs...";
  }, [activeTab]);

  const homepageDiscoveryRails = useMemo(
    () => buildHomepageDiscoveryRails(recentDiscovery, featuredItems),
    [recentDiscovery, featuredItems]
  );

  useEffect(() => {
    setRecentDiscovery(readDiscoveryMemory());
  }, []);

  useEffect(() => {
    let alive = true;

    async function loadFeaturedMarketplace() {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (!supabaseUrl || !supabaseKey) return;

        const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

        const propertyReq = fetch("/api/property/public-listings?page=0&pageSize=3", { cache: "no-store" })
          .then((r) => r.json())
          .catch(() => ({ data: [] }));

        const materialsReq = supabase
          .from("material_listings")
          .select("id,title,local_name,description,packaging_unit,attributes,created_at,is_active,is_public,status,published_at")
          .eq("is_active", true)
          .or("is_public.eq.true,published_at.not.is.null,status.ilike.published,status.ilike.active")
          .order("created_at", { ascending: false })
          .limit(2);

        const servicesReq = supabase
          .from("v_service_listings")
          .select("provider_service_id,provider_name,custom_category,custom_service,service_description,city,district,min_price,max_price,service_is_active,provider_service_created_at")
          .eq("service_is_active", true)
          .order("provider_service_created_at", { ascending: false })
          .limit(2);

        const rentalsReq = supabase
          .from("rental_listings_public")
          .select("id,title,description,rate,rate_unit_label,city,district,locality,photos,is_active,updated_at")
          .eq("is_active", true)
          .order("updated_at", { ascending: false })
          .limit(2);

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
          subtitle: [p.city, p.state].filter(Boolean).join(", ") || "Location available",
          meta: p.listing_intent || "Property",
          price: moneyINR(p.expected_price || p.price) || "Price on request",
          href: `/property/${encodeURIComponent(String(p.slug || p.id))}`,
          badge: "Property",
          image: firstPhotoUrl(p.photos),
        }));

        const materialItems: MarketplaceItem[] = ((materialsRes.data || []) as any[]).map((m) => {
          const price = m.attributes?.price || m.attributes?.unit_price || m.attributes?.rate || m.attributes?.mrp;
          return {
            id: String(m.id),
            module: "Material",
            title: m.title || m.local_name || "Material listing",
            subtitle: clipText(m.description) || "Building material available",
            meta: m.packaging_unit ? `Unit: ${m.packaging_unit}` : "Material",
            price: moneyINR(price) || "Ask price",
            href: `/materials/${encodeURIComponent(String(m.id))}`,
            badge: "Material",
            image: null,
          };
        });

        const serviceItems: MarketplaceItem[] = ((servicesRes.data || []) as any[]).map((s) => ({
          id: String(s.provider_service_id),
          module: "Service",
          title: s.custom_service || "Professional service",
          subtitle: s.provider_name || clipText(s.service_description) || "Service provider",
          meta: [s.city, s.district].filter(Boolean).join(", ") || s.custom_category || "Service",
          price: s.min_price || s.max_price ? `${moneyINR(s.min_price) || "₹ —"}${s.max_price ? ` - ${moneyINR(s.max_price)}` : ""}` : "Quote on request",
          href: "/services",
          badge: "Service",
          image: null,
        }));

        const rentalItems: MarketplaceItem[] = ((rentalsRes.data || []) as any[]).map((r) => ({
          id: String(r.id),
          module: "Rental",
          title: r.title || "Rental equipment",
          subtitle: [r.locality, r.city, r.district].filter(Boolean).join(", ") || clipText(r.description),
          meta: r.rate_unit_label || "Rental",
          price: r.rate ? `${moneyINR(r.rate)}${r.rate_unit_label ? ` / ${r.rate_unit_label}` : ""}` : "Rate on request",
          href: `/rentals/${encodeURIComponent(String(r.id))}`,
          badge: "Rental",
          image: firstPhotoUrl(r.photos),
        }));

        const live = [...propertyItems, ...materialItems, ...serviceItems, ...rentalItems].slice(0, 5);
        if (live.length > 0) setFeaturedItems(live);
      } catch {
        // Keep fallback homepage data.
      }
    }

    loadFeaturedMarketplace();
    return () => {
      alive = false;
    };
  }, []);

  function runSearch() {
    const clean = query.trim();
    if (!clean) {
      router.push(scope === "investment" ? "/investment/opportunities" : `/${scope}`);
      return;
    }
    router.push(`/search?module=${scope}&q=${encodeURIComponent(clean)}`);
  }

  function submitRequirement() {
    const clean = query.trim();
    router.push(clean ? `/rfq/general/new?query=${encodeURIComponent(clean)}` : "/rfq/general/new");
  }

  return (
    <main className="homePage">
      <JsonLd data={[organizationSchema(), websiteSchema(), aiMarketplaceSchema(), marketplaceFaqSchema()]} />

      <section className="heroShell">
        <div className="heroGrid">
          <div className="heroCopy">
            <div className="miniBadge">🔎 Construction & Property Marketplace</div>
            <h1><span>One Marketplace.</span> All Your Construction & Property Needs.</h1>
            <p>
              Search properties, materials, services, rentals, vendors, prices and more.
              Compare, connect and get the best deal — all in one place.
            </p>
            <div className="heroFeatureRow">
              <a href="/search">🔍 Marketplace Search</a>
              <a href="/vendor/discovery">🧠 Smart Matching</a>
              <a href="/price-today">💰 Best Prices</a>
              <a href="/support/new">🛡️ Secure Deals</a>
            </div>
          </div>

          <div className="searchCard">
            <div className="searchTabs">
              <button type="button" className={activeTab === "search" ? "active" : ""} onClick={() => setActiveTab("search")}>⌕ Search</button>
              <button type="button" className={activeTab === "ai" ? "active" : ""} onClick={() => setActiveTab("ai")}>🤖 AI Assistant</button>
              <button type="button" className={activeTab === "post" ? "active" : ""} onClick={() => setActiveTab("post")}>📮 Post Requirement</button>
            </div>

            <textarea value={query} onChange={(e) => setQuery(e.target.value)} placeholder={placeholder} />

            <div className="typeChips">
              {[
                ["property", "🏠 Property"],
                ["materials", "🧱 Materials"],
                ["services", "🛠️ Services"],
                ["rentals", "🚜 Rentals"],
                ["investment", "📊 Price Today"],
              ].map(([key, label]) => (
                <button key={key} type="button" className={scope === key ? "active" : ""} onClick={() => setScope(key as SearchScope)}>{label}</button>
              ))}
            </div>

            <div className="searchActions">
              <button type="button" className="primaryAction" onClick={runSearch}>🔍 Search Marketplace</button>
              <button type="button" className="secondaryAction" onClick={submitRequirement}>⚡ Submit Requirement</button>
            </div>
          </div>
        </div>
      </section>

      <section className="statsRail">
        {[
          ["18", "RFQs Posted Today", "🧾"],
          ["14 min", "Avg. Vendor Response", "⏱️"],
          ["42", "Active Suppliers Nearby", "🚚"],
          ["129", "Buyer-Vendor Chats", "🤝"],
          ["2.8K+", "Listings This Week", "📋"],
          ["4.9/5", "User Rating", "⭐"],
        ].map(([value, label, icon]) => (
          <div className="statCard" key={label}>
            <span>{icon}</span>
            <div><strong>{value}</strong><small>{label}</small></div>
          </div>
        ))}
      </section>

      <section className="aiLiveOpsStrip">
        <div className="aiLiveOpsHead">
          <div>
            <span>🤖 Live AI Operations</span>
            <h2>3Bigha is working in the background for buyers, vendors and suppliers.</h2>
          </div>
          <a href="/dashboard/vendor/inventory">Open Vendor OS →</a>
        </div>

        <div className="aiLiveOpsGrid">
          {[
            ["📦", "8", "Low stock alerts", "Cement, TMT and electrical items need attention"],
            ["🚚", "32", "Deliveries tracked", "Fleet and dispatch workflows are ready"],
            ["🧾", "54", "Bills processed", "Online + offline billing with stock deduction"],
            ["📈", "12%", "Demand movement", "Sand and brick demand rising in local markets"],
            ["🧠", "418", "AI decisions", "Procurement, pricing and vendor routing signals"],
          ].map(([icon, value, label, text]) => (
            <div className="aiLiveOpsCard" key={label}>
              <span>{icon}</span>
              <strong>{value}</strong>
              <b>{label}</b>
              <small>{text}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="aiBusinessCommand">
        <div className="aiBusinessCopy">
          <span>AI Business Work Desk</span>
          <h2>Inventory, billing, fleet and dispatch — now connected with marketplace intelligence.</h2>
          <p>
            Vendors can manage stock, create bills, assign vehicles, track dispatches and use AI signals
            to understand demand, pricing and operational risks.
          </p>
        </div>

        <div className="aiBusinessActions">
          <a href="/dashboard/vendor/inventory">📦 Inventory</a>
          <a href="/dashboard/vendor/billing">🧾 Billing</a>
          <a href="/dashboard/vendor/fleet">🚚 Fleet</a>
          <a href="/dashboard/vendor/dispatch">📍 Dispatch</a>
          <a href="/materials/add?inventory=1">➕ Add Stock</a>
        </div>
      </section>

      <section className="contentSection">
        <div className="sectionHead">
          <div>
            <h2>Browse by Category</h2>
            <p>Explore all popular categories</p>
          </div>

          <button
            className="sectionHeadAction"
            type="button"
            onClick={() => toggleMobileSection("categories")}
          >
            {mobileExpandedSections.categories ? "Show less categories ↑" : "View all categories →"}
          </button>
        </div>
        <div className={`categoryGrid premiumCategoryGrid ${mobileExpandedSections.categories ? "isMobileExpanded" : ""}`}>
          {categoryCards.map((item) => (
            <a href={item.href} className="categoryCard" key={item.title}>
              <div className="categoryIcon">{item.icon}</div>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
              <strong>{item.count}</strong>
            </a>
          ))}
        </div>
      </section>
        <button className="mobileSeeMoreButton" type="button" onClick={() => toggleMobileSection("categories")}>
          {mobileExpandedSections.categories ? "Show Less" : "See More Categories"}
        </button>

      <section className="contentSection">
        <div className="sectionHead"><div><h2>Featured Listings</h2><p>Fresh opportunities from our marketplace</p></div><a href="/search">View all listings →</a></div>
        {recentDiscovery.length ? (
          <div className="personalFeedStrip">
            <div>
              <strong>Recommended for you</strong>
              <span>Based on recently viewed property interest</span>
            </div>

            <div className="personalFeedItems">
              {recentDiscovery.slice(0, 4).map((item) => (
                <a key={`${item.module}:${item.id}`} href={item.href}>
                  <b>✨ {item.module}</b>
                  <strong>{item.title}</strong>
                  <small>{[item.locality, item.city, item.district].filter(Boolean).join(", ") || "Continue browsing"}</small>
                </a>
              ))}
            </div>
          </div>
        ) : null}

        <div className={`listingGrid premiumListingsGrid ${mobileExpandedSections.featured ? "isMobileExpanded" : ""}`}>
          {featuredItems.map((item) => (
            <a href={item.href} className="listingCard" key={`${item.module}-${item.id}`}>
              <div className="listingImage">
                {item.image ? <img src={item.image} alt={item.title} /> : <b>{moduleIcon(item.module)}</b>}
                <span>{item.badge}</span>
              </div>
              <div className="listingBody">
                <h3>{item.title}</h3>
                <p>📍 {item.subtitle}</p>
                <strong>{item.price}</strong>
                <small>{item.meta}</small>
              </div>
            </a>
          ))}
        </div>
      </section>
        <button className="mobileSeeMoreButton" type="button" onClick={() => toggleMobileSection("featured")}>
          {mobileExpandedSections.featured ? "Show Less" : "See More Listings"}
        </button>

      <section className="contentSection">
        <div className="sectionHead">
          <div>
            <h2>AI Discovery Rails</h2>
            <p>Personalized next steps across property, materials, services and rentals</p>
          </div>
          <a href="/search">Explore all →</a>
        </div>

        <div className={`discoveryRailGrid premiumDiscoveryGrid ${mobileExpandedSections.discovery ? "isMobileExpanded" : ""}`}>
          {homepageDiscoveryRails.map((rail) => (
            <a href={rail.href} className="discoveryRailCard" key={rail.href}>
              <div>
                <b>{rail.icon}</b>
                <span>{rail.tone}</span>
              </div>
              <strong>{rail.title}</strong>
              <small>{rail.subtitle}</small>
            </a>
          ))}
        </div>
      </section>
        <button className="mobileSeeMoreButton" type="button" onClick={() => toggleMobileSection("discovery")}>
          {mobileExpandedSections.discovery ? "Show Less" : "See More AI Suggestions"}
        </button>

      <section className="contentSection utilitySection">
        <div className="sectionHead">
          <div>
            <h2>Marketplace Utility Engine</h2>
            <p>Tools, RFQ and pricing actions in one compact workspace</p>
          </div>
          <a href="/rfq/general/new">Post RFQ →</a>
        </div>

        <div className="utilityLayout">
          <div className={`toolsGrid premiumToolsGrid ${mobileExpandedSections.tools ? "isMobileExpanded" : ""}`}>
            {tools.map((tool) => (
              <a href={tool.href} className="toolCard" key={tool.title}>
                <b>▣</b>
                <div>
                  <h3>{tool.title}</h3>
                  <p>{tool.text}</p>
                  <span>{tool.action} →</span>
                </div>
              </a>
            ))}
          </div>

          <div className="rfqMiniCard">
            <span>⚡ RFQ Engine</span>
            <h2>Post Your Requirement</h2>
            <p>Get quotes from multiple verified vendors and compare faster.</p>
            <div className="rfqPills">
              <span>Multiple Vendors</span>
              <span>Compare Quotes</span>
              <span>Fast Response</span>
            </div>
            <button type="button" onClick={submitRequirement}>
              Post Requirement Now →
            </button>
          </div>
        </div>
      </section>
        <button className="mobileSeeMoreButton" type="button" onClick={() => toggleMobileSection("tools")}>
          {mobileExpandedSections.tools ? "Show Less" : "See More Tools"}
        </button>

      <section className="contentSection">
        <div className="sectionHead"><div><h2>Today's Market Prices</h2><p>Live price updates from local markets</p></div><a href="/price-today">View all prices →</a></div>
        <div className={`priceGrid premiumPriceGrid ${mobileExpandedSections.prices ? "isMobileExpanded" : ""}`}>
          {marketPrices.map(([name, price, change]) => (
            <a href="/price-today" className="priceCard" key={name}><span>{name}</span><strong>{price}</strong><small>{change}</small></a>
          ))}
        </div>
      </section>
        <button className="mobileSeeMoreButton" type="button" onClick={() => toggleMobileSection("prices")}>
          {mobileExpandedSections.prices ? "Show Less" : "See More Prices"}
        </button>

      <section className="homeBottomGrid">
        <div className="bottomPanel compactNewsPanel">
          <div className="bottomPanelHead">
            <div>
              <h2>Latest from Blog / News</h2>
              <p>Short market updates and construction guidance.</p>
            </div>
            <a href="/blog">View all →</a>
          </div>

          <div className="cleanBlogList">
            {blogItems.slice(0, 3).map((post, index) => (
              <a href="/blog" key={post.title}>
                <span>{index + 1}</span>
                <div>
                  <strong>{post.title}</strong>
                  <small>{post.meta}</small>
                </div>
              </a>
            ))}
          </div>
        </div>

        <div className="bottomPanel compactInvestmentPanel">
          <div className="bottomPanelHead">
            <div>
              <h2>Investment Opportunities</h2>
              <p>Selected high-return project options.</p>
            </div>
            <a href="/investment/opportunities">View all →</a>
          </div>

          <div className="cleanInvestmentList">
            <a href="/investment/opportunities">
              <span>🌿</span>
              <div>
                <strong>Green Valley Township</strong>
                <small>₹15 Lakh onwards • ROI 18–22%</small>
              </div>
            </a>
            <a href="/investment/opportunities">
              <span>🏢</span>
              <div>
                <strong>Royal Enclave Project</strong>
                <small>₹22 Lakh onwards • ROI 20–25%</small>
              </div>
            </a>
          </div>
        </div>
      </section>

      <section className="cleanTrustSection">
        <div className="cleanTrustIntro">
          <span>Trusted Marketplace</span>
          <h2>Why 3Bigha Marketplace?</h2>
          <p>Verified listings, vendor discovery, RFQ support and local marketplace intelligence in one place.</p>
        </div>

        <div className="cleanTrustGrid">
          {[
            ["100% Verified", "Verified sellers and marketplace listings"],
            ["Secure Process", "Enquiry, RFQ and vendor workflow support"],
            ["Best Prices", "Compare options before you decide"],
            ["24/7 Support", "Marketplace support when you need help"],
          ].map(([title, detail]) => (
            <div key={title}>
              <strong>✓ {title}</strong>
              <span>{detail}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="cleanStartBanner">
        <div>
          <h2>Ready to get started?</h2>
          <p>Join 3Bigha Marketplace and start with your first requirement.</p>
        </div>
        <div>
          <a href="/signup">Create Account</a>
          <a href="/rfq/general/new">Post Requirement</a>
        </div>
      </section>

      <MobileOperationalDock
        title="Start your work"
        subtitle="Search, post requirement, check prices or open dashboard."
        actions={[
          { label: "Search", href: "/search" },
          { label: "Post", href: "/rfq/general/new", primary: true },
          { label: "Prices", href: "/price-today" },
          { label: "Dashboard", href: "/dashboard" },
        ]}
      />

      <footer className="cleanHomeFooter">
        <div>
          <strong>🏠 3bigha</strong>
          <p>Marketplace for property, construction, materials, services and rentals.</p>
        </div>
        <nav>
          <strong>Marketplace</strong>
          <a href="/property">Property</a>
          <a href="/materials">Materials</a>
          <a href="/services">Services</a>
          <a href="/rentals">Rentals</a>
        </nav>
        <nav>
          <strong>Tools</strong>
          <a href="/construction-cost">Cost Calculator</a>
          <a href="/price-today">Price Today</a>
          <a href="/search">Marketplace Search</a>
        </nav>
        <nav>
          <strong>Company</strong>
          <a href="/about">About</a>
          <a href="/contact">Contact</a>
          <a href="/support">Support</a>
        </nav>
      </footer>

      <style jsx>{`

        .homePage {
          position: relative;
          overflow-x: hidden;
          background:
            radial-gradient(circle at 8% 6%, rgba(37, 99, 235, 0.12), transparent 30%),
            radial-gradient(circle at 88% 10%, rgba(16, 185, 129, 0.10), transparent 28%),
            radial-gradient(circle at 50% 46%, rgba(249, 115, 22, 0.055), transparent 34%),
            linear-gradient(180deg, #f8fbff 0%, #ffffff 38%, #f6faf8 100%);
        }

        .homePage::before {
          content: "";
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          background-image:
            linear-gradient(rgba(15, 23, 42, 0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(15, 23, 42, 0.035) 1px, transparent 1px);
          background-size: 42px 42px;
          mask-image: linear-gradient(180deg, rgba(0,0,0,0.28), transparent 72%);
        }

        .homePage > section,
        .homePage > nav,
        .homePage > div {
          position: relative;
          z-index: 1;
        }

        .homePage{min-height:100vh;background:#fff;color:#0f172a;padding-bottom:24px}.heroShell{padding:38px 68px 28px;background:radial-gradient(circle at 18% 18%,#dbeafe 0,transparent 34%),radial-gradient(circle at 86% 12%,#ede9fe 0,transparent 30%),linear-gradient(180deg,#f8fbff,#fff)}.heroGrid{display:grid;grid-template-columns:1.03fr .97fr;gap:48px;align-items:center;max-width:1380px;margin:0 auto}.miniBadge{display:inline-flex;border-radius:999px;background:#eef4ff;color:#1d4ed8;padding:9px 14px;font-size:13px;font-weight:950}.heroCopy h1{margin:22px 0 0;font-size:clamp(44px,5.7vw,78px);line-height:1.02;letter-spacing:-.065em;font-weight:1000}.heroCopy h1 span{display:block;color:#2457d6}.heroCopy p{max-width:660px;margin:18px 0 0;color:#475569;font-size:18px;line-height:1.65;font-weight:650}.heroFeatureRow{display:flex;flex-wrap:wrap;gap:12px;margin-top:26px}.heroFeatureRow a{display:inline-flex;border-radius:999px;background:#fff;border:1px solid rgba(15,23,42,.08);box-shadow:0 10px 28px rgba(15,23,42,.05);padding:10px 14px;color:#0f172a;text-decoration:none;font-size:13px;font-weight:950}.searchCard{background:rgba(255,255,255,.92);border:1px solid rgba(15,23,42,.08);box-shadow:0 28px 80px rgba(15,23,42,.12);border-radius:28px;padding:24px}.searchTabs{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;border-bottom:1px solid #e5e7eb;margin:-4px 0 18px;padding-bottom:10px}.searchTabs button{border:0;background:transparent;border-radius:14px;padding:12px 8px;font-weight:950;color:#475569;cursor:pointer}.searchTabs button.active{background:#eff6ff;color:#1d4ed8;box-shadow:inset 0 2px 0 #2563eb}.searchCard textarea{width:100%;min-height:126px;border:1px solid rgba(15,23,42,.14);border-radius:18px;padding: 14px;font-size:15px;line-height:1.7;resize:none;outline:none;color:#0f172a}.typeChips{display:flex;flex-wrap:wrap;gap:10px;margin-top:16px}.typeChips button{border:1px solid rgba(15,23,42,.1);background:#fff;border-radius:999px;padding:9px 13px;font-size:13px;font-weight:950;cursor:pointer}.typeChips button.active{background:#eef4ff;color:#1d4ed8;border-color:#bfdbfe}.searchActions{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:18px}.searchActions button{border:0;border-radius:18px;padding: 12px;font-weight:1000;cursor:pointer}.primaryAction{background:#1d4ed8;color:#fff;box-shadow:0 14px 34px rgba(29,78,216,.24)}.secondaryAction{background:#fff;border:1px solid rgba(15,23,42,.12)!important;color:#0f172a}.statsRail{max-width:1380px;margin:10px auto 14px;padding:0 68px;display:grid;grid-template-columns:repeat(6,1fr);gap:10px}.statCard{background:#0f172a;color:#fff;border:1px solid rgba(255,255,255,.1);box-shadow:0 14px 34px rgba(15,23,42,.12);padding: 12px;display:flex;gap:11px;align-items:center;border-radius:16px}.statCard:first-child,.statCard:last-child{border-radius:16px}.statCard span{width:34px;height:34px;border-radius:999px;display:flex;align-items:center;justify-content:center;background:rgba(37,99,235,.25)}.statCard strong{display:block;font-size:20px;font-weight:1000;color:#fff}.statCard small{display:block;color:#cbd5e1;font-size:11px;font-weight:850}.contentSection,.splitSection,.startBanner,.homeFooter{max-width:1380px;margin:0 auto 18px;padding:0 68px}.sectionHead{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;margin-bottom:14px}.sectionHead h2,.trustSection h2{margin:0;font-size:22px;letter-spacing:-.03em;font-weight:1000}.sectionHead p,.trustSection p{margin:4px 0 0;color:#64748b;font-size:13px;font-weight:700}.sectionHead a{color:#1d4ed8;text-decoration:none;font-weight:950}.categoryGrid{display:grid;grid-template-columns:repeat(6,1fr);gap:14px}.categoryCard{border:1px solid rgba(15,23,42,.09);border-radius:18px;background:#fff;text-align:center;text-decoration:none;color:inherit;padding: 14px 14px;box-shadow:0 10px 26px rgba(15,23,42,.04);transition:.16s ease}.categoryCard:hover,.listingCard:hover,.toolCard:hover{transform:translateY(-2px);box-shadow:0 16px 36px rgba(15,23,42,.08)}.categoryIcon{font-size:34px}.categoryCard h3{margin:10px 0 0;font-size:15px;font-weight:1000}.categoryCard p{min-height:34px;margin:6px 0 0;color:#64748b;font-size:12px;line-height:1.35}.categoryCard strong{display:block;margin-top:10px;color:#16a34a;font-size:12px}.personalFeedStrip{border:1px solid #dbeafe;background:linear-gradient(135deg,#eff6ff,#fff);border-radius:18px;padding:14px;margin-bottom:16px;display:grid;gap:12px}
        .personalFeedStrip strong{display:block;font-weight:1000;color:#0f172a}
        .personalFeedStrip span{display:block;margin-top:3px;color:#64748b;font-size:12px;font-weight:800}
        .personalFeedItems{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
        .personalFeedItems a{text-decoration:none;color:inherit;background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:11px}
        .personalFeedItems b{display:block;color:#1d4ed8;font-size:11px;text-transform:capitalize}
        .personalFeedItems strong{margin-top:5px;font-size:13px;line-height:1.35}
        .personalFeedItems small{display:block;margin-top:5px;color:#64748b;font-size:11px}
        .discoveryRailGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
        .discoveryRailCard{text-decoration:none;color:inherit;border:1px solid #dbeafe;background:linear-gradient(135deg,#ffffff,#eff6ff);border-radius:18px;padding:15px;box-shadow:0 12px 30px rgba(37,99,235,.06);transition:.16s ease}
        .discoveryRailCard:hover{transform:translateY(-2px);box-shadow:0 18px 38px rgba(37,99,235,.12)}
        .discoveryRailCard div{display:flex;align-items:center;justify-content:space-between;gap:10px}
        .discoveryRailCard b{font-size:24px}
        .discoveryRailCard span{font-size:11px;font-weight:1000;color:#2563eb;background:#dbeafe;border-radius:999px;padding:5px 8px}
        .discoveryRailCard strong{display:block;margin-top:12px;font-size:15px;line-height:1.25;color:#0f172a}
        .discoveryRailCard small{display:block;margin-top:7px;font-size:12px;line-height:1.45;color:#64748b;font-weight:800}
        .listingGrid{display:grid;grid-template-columns:repeat(5,1fr);gap: 10px}

        .utilitySection{background:#fff;border:1px solid rgba(15,23,42,.08);border-radius:22px;padding: 14px 68px!important;box-shadow:0 12px 34px rgba(15,23,42,.045)}
        .utilityLayout{display:grid;grid-template-columns:1fr 360px;gap:16px;align-items:stretch}
        .toolsGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
        .toolCard{display:flex;gap:12px;align-items:flex-start;text-decoration:none;color:inherit;border:1px solid rgba(15,23,42,.08);background:#fff;border-radius:16px;padding:14px;min-height:104px;box-shadow:0 8px 22px rgba(15,23,42,.045)}
        .toolCard b{width:34px;height:34px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:#eff6ff;color:#1d4ed8;flex:0 0 auto}
        .toolCard h3{margin:0;font-size:14px;font-weight:1000;color:#0f172a}
        .toolCard p{margin:4px 0 0;color:#64748b;font-size:12px;line-height:1.4;font-weight:700}
        .toolCard span{display:block;margin-top:8px;color:#1d4ed8;font-size:12px;font-weight:950}

        .rfqMiniCard{border-radius:18px;background:linear-gradient(135deg,#1e3a8a,#7c3aed);color:#fff;padding: 14px;box-shadow:0 18px 42px rgba(37,99,235,.18);display:flex;flex-direction:column;justify-content:center}
        .rfqMiniCard>span{display:inline-flex;width:max-content;border-radius:999px;background:rgba(255,255,255,.15);color:#fff;padding:6px 10px;font-size:11px;font-weight:1000}
        .rfqMiniCard h2{margin:10px 0 0;font-size:22px;color:#fff}
        .rfqMiniCard p{margin:6px 0 0;color:#dbeafe;font-weight:800;font-size:13px;line-height:1.45}
        .rfqMiniCard .rfqPills{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0}
        .rfqMiniCard .rfqPills span{border-radius:999px;background:rgba(255,255,255,.14);padding:5px 8px;font-size:11px;color:#fff;font-weight:900}
        .rfqMiniCard button{border:0;border-radius:14px;background:#fff;color:#1d4ed8;padding:11px 14px;font-weight:1000;cursor:pointer}

        .priceGrid{display:grid;grid-template-columns:repeat(6,1fr);gap:10px}
        .priceCard{display:block;text-decoration:none;color:inherit;border:1px solid rgba(15,23,42,.08);background:#fff;border-radius:14px;padding:12px;box-shadow:0 8px 20px rgba(15,23,42,.035)}
        .priceCard span{display:block;color:#475569;font-size:12px;font-weight:900}
        .priceCard strong{display:block;margin-top:8px;color:#0f172a;font-size:15px;font-weight:1000}
        .priceCard small{display:block;margin-top:5px;color:#16a34a;font-size:11px;font-weight:900}

        .mobileSeeMoreButton {
          display: none;
        }

        @media (max-width: 640px) {
          .personalFeedItems {
            grid-template-columns: 1fr;
          }

          .personalFeedStrip {
            padding: 12px;
            border-radius: 16px;
          }
          .discoveryRailGrid,
          .toolsGrid,
          .priceGrid {
            grid-template-columns: 1fr;
          }

          .utilitySection {
            padding: 12px !important;
          }

          .utilityLayout {
            grid-template-columns: 1fr;
          }

          .rfqMiniCard {
            padding: 14px;
          }

          .premiumCategoryGrid:not(.isMobileExpanded) > *:nth-child(n+4),
          .premiumListingsGrid:not(.isMobileExpanded) > *:nth-child(n+4),
          .premiumDiscoveryGrid:not(.isMobileExpanded) > *:nth-child(n+4),
          .premiumToolsGrid:not(.isMobileExpanded) > *:nth-child(n+4),
          .premiumPriceGrid:not(.isMobileExpanded) > *:nth-child(n+4),
          .premiumTrustGrid:not(.isMobileExpanded) > *:nth-child(n+3) {
            display: none;
          }

          .mobileSeeMoreButton {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            margin-top: 12px;
            border: 1px solid rgba(37, 99, 235, 0.16);
            border-radius: 14px;
            background: linear-gradient(180deg, #ffffff, #eff6ff);
            color: #1d4ed8;
            padding: 12px 14px;
            font-size: 13px;
            font-weight: 1000;
            cursor: pointer;
            box-shadow: 0 10px 22px rgba(37, 99, 235, 0.08);
          }
        }

        /* FINAL 3BIGHA AI FLOATING PANEL OVERRIDE */
        .floatingAi{
          z-index:10060!important;
          pointer-events:auto!important;
        }

        .aiPanel{
          position:fixed!important;
          right:20px!important;
          bottom:82px!important;
          width:380px!important;
          max-width:calc(100vw - 28px)!important;
          border-radius:22px!important;
          background:#fff!important;
          border:1px solid rgba(15,23,42,.1)!important;
          box-shadow:0 22px 54px rgba(15,23,42,.18)!important;
          padding: 12px!important;
          z-index:10059!important;
          display:grid!important;
          gap:14px!important;
        }

        .aiPanelHeader{
          display:grid!important;
          gap:4px!important;
        }

        .aiPanelHeader strong{
          font-size:15px!important;
          color:#0f172a!important;
        }

        .aiPanelHeader small{
          font-size:12px!important;
          color:#64748b!important;
          font-weight:700!important;
        }

        .aiPanelGrid{
          display:grid!important;
          grid-template-columns:1fr 1fr!important;
          gap:10px!important;
        }

        .aiPanelGrid a{
          text-decoration:none!important;
          color:#1d4ed8!important;
          font-weight:900!important;
          border-radius:12px!important;
          background:#eff6ff!important;
          padding:10px 12px!important;
          font-size:13px!important;
        }

        @media(max-width:640px){
          .aiPanel{
            right:12px!important;
            bottom:72px!important;
            width:330px!important;
            max-width:calc(100vw - 24px)!important;
          }

          .aiPanelGrid{
            grid-template-columns:1fr!important;
          }
        }

      `}</style>
    </main>
  );
}
