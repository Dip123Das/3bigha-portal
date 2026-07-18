"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import JsonLd from "@/components/seo/JsonLd";
import ConstitutionalHero from "@/components/home/ConstitutionalHero";
import SahajJourney from "@/components/home/SahajJourney";
import FeaturedListings from "@/components/home/FeaturedListings";
import { useOptional3BOSRuntime } from "@/lib/3bos/context";
import { resolveHomepageProjection } from "@/lib/3bos/homepage";
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
  { title: "Vendor Opportunities", icon: "🚀", text: "Discover where buyers need suppliers, contractors and equipment owners", count: "Join • Grow • Expand", href: "/vendor-opportunities" },
  { title: "Submit Requirement", icon: "⚡", text: "Post material, service, rental or project requirements", count: "Post • Compare • Select", href: "/rfq" },
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
  const threeBOSContext = useOptional3BOSRuntime();
  const [scope, setScope] = useState<SearchScope>("property");
  const [query, setQuery] = useState("");
  const [mobileExpandedSections, setMobileExpandedSections] = useState<Record<string, boolean>>({});

  function toggleMobileSection(section: string) {
    setMobileExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  }

  const mobileSectionOpen = (section: string) => Boolean(mobileExpandedSections[section]);
  const [featuredItems, setFeaturedItems] = useState<MarketplaceItem[]>(fallbackFeatured);
  const [recentDiscovery, setRecentDiscovery] = useState<DiscoveryMemoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<"search" | "ai" | "post">("search");

  const placeholder = useMemo(() => {
    if (activeTab === "post") return "Describe your requirement clearly. Example: Need 500 bags cement in Cooch Behar within 7 days.";
    if (activeTab === "ai") return "Tell 3Bigha what you need. Review the prepared options before you choose.";
    return "Search property, materials, services, rentals or construction needs...";
  }, [activeTab]);

  const homepageProjection = useMemo(
    () => resolveHomepageProjection(
      threeBOSContext
        ? { status: threeBOSContext.status, runtime: threeBOSContext.runtime }
        : null,
    ),
    [threeBOSContext],
  );

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
    router.push(clean ? `/rfq?query=${encodeURIComponent(clean)}` : "/rfq");
  }

  return (
    <main className="homePage">
      <JsonLd data={[organizationSchema(), websiteSchema(), aiMarketplaceSchema(), marketplaceFaqSchema()]} />

      <ConstitutionalHero
        activeTab={activeTab}
        placeholder={placeholder}
        query={query}
        scope={scope}
        sahajNeedsExpanded={mobileSectionOpen("sahajNeeds")}
        onActiveTabChange={setActiveTab}
        onQueryChange={setQuery}
        onScopeChange={setScope}
        onRunSearch={runSearch}
        onSubmitRequirement={submitRequirement}
        onToggleSahajNeeds={() => toggleMobileSection("sahajNeeds")}
      />

      <SahajJourney
        expanded={mobileSectionOpen("sahajNeeds")}
      />

      <FeaturedListings
        featuredItems={featuredItems}
        recentDiscovery={recentDiscovery}
        mobileExpanded={Boolean(mobileExpandedSections.featured)}
      />

      <section className="contentSection">
        <div className="sectionHead"><div><h2>Today's Market Prices</h2><p>Live price updates from local markets</p></div><a href="/price-today">View all prices →</a></div>
        <div className={`priceGrid premiumPriceGrid ${mobileExpandedSections.prices ? "isMobileExpanded" : ""}`}>
          {marketPrices.map(([name, price, change]) => (
            <a href="/price-today" className="priceCard" key={name}><span>{name}</span><strong>{price}</strong><small>{change}</small></a>
          ))}
        </div>
      </section>


      <section className={`mobileCollapsibleSection ${mobileSectionOpen("stats") ? "isMobileExpanded" : ""}`}>
        <div className="mobileToggleHead">
          <div>
            <h2>Marketplace Activity</h2>
            <p>RFQ, vendor response and supplier activity</p>
          </div>
          <button type="button" className="mobileToggleBtn" onClick={() => toggleMobileSection("stats")}>
            {mobileSectionOpen("stats") ? "▲ Less" : "▼ Show"}
          </button>
        </div>

        <div className="statsRail">
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
        </div>
      </section>

      <section className={`mobileCollapsibleSection ${mobileSectionOpen("liveai") ? "isMobileExpanded" : ""}`}>
        <div className="mobileToggleHead">
          <div>
            <h2>Business Activity</h2>
            <p>Stock, deliveries, billing and demand signals that may need attention</p>
          </div>
          <button type="button" className="mobileToggleBtn" onClick={() => toggleMobileSection("liveai")}>
            {mobileSectionOpen("liveai") ? "▲ Less" : "▼ Show"}
          </button>
        </div>

        <div className="aiLiveOpsStrip">
          <div className="aiLiveOpsHead">
            <div>
              <span>Business Activity</span>
              <h2>3Bigha keeps connected work visible for buyers, vendors and suppliers.</h2>
            </div>
            <a href={homepageProjection.primaryWorkspaceHref}>{homepageProjection.primaryWorkspaceActionLabel}</a>
          </div>

          <div className="aiLiveOpsGrid">
            {[
              ["📦", "8", "Low stock alerts", "Cement, TMT and electrical items need attention"],
              ["🚚", "32", "Deliveries tracked", "Fleet and dispatch workflows are ready"],
              ["🧾", "54", "Bills processed", "Online + offline billing with stock deduction"],
              ["📈", "12%", "Demand movement", "Sand and brick demand rising in local markets"],
              ["🧭", "Review", "Prepared guidance", "Compare the available signals before you decide"],
            ].map(([icon, value, label, text]) => (
              <div className="aiLiveOpsCard" key={label}>
                <span>{icon}</span>
                <strong>{value}</strong>
                <b>{label}</b>
                <small>{text}</small>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={`mobileCollapsibleSection ${mobileSectionOpen("opportunities") ? "isMobileExpanded" : ""}`}>
        <div className="mobileToggleHead">
          <div>
            <h2>Vendor Growth Opportunities</h2>
            <p>Places where buyers need more vendors</p>
          </div>
          <button type="button" className="mobileToggleBtn" onClick={() => toggleMobileSection("opportunities")}>
            {mobileSectionOpen("opportunities") ? "▲ Less" : "▼ Show"}
          </button>
        </div>

        <div className="vendorOpportunityHomeStrip">
          <div className="vendorOpportunityHomeHead">
            <div>
              <span>🚀 Vendor Growth Opportunities</span>
              <h2>Buyers are looking for more vendors in active demand areas.</h2>
              <p>Join 3Bigha where suppliers, contractors, service providers and equipment owners are needed.</p>
            </div>
            <a href="/vendor-opportunities">View All Opportunities →</a>
          </div>

          <div className="vendorOpportunityHomeGrid">
            <a href="/vendor-opportunities">
              <b>🔥 Need Cement Suppliers</b>
              <small>Khagrabari</small>
            </a>
            <a href="/vendor-opportunities">
              <b>⚡ Need Electricians</b>
              <small>Cooch Behar Town</small>
            </a>
            <a href="/vendor-opportunities">
              <b>🚜 Need JCB Rental Providers</b>
              <small>Baneswar</small>
            </a>
          </div>
        </div>
      </section>

      <section className={`mobileCollapsibleSection ${mobileSectionOpen("workdesk") ? "isMobileExpanded" : ""}`}>
        <div className="mobileToggleHead">
          <div>
            <h2>Business Workdesk</h2>
            <p>Inventory, billing, fleet and dispatch actions</p>
          </div>
          <button type="button" className="mobileToggleBtn" onClick={() => toggleMobileSection("workdesk")}>
            {mobileSectionOpen("workdesk") ? "▲ Less" : "▼ Show"}
          </button>
        </div>

        <div className="aiBusinessCommand">
          <div className="aiBusinessCopy">
            <span>{homepageProjection.workdeskLabel}</span>
            <h2>{homepageProjection.workdeskTitle}</h2>
            <p>{homepageProjection.workdeskDescription}</p>
          </div>

          <div className="aiBusinessActions">
            {homepageProjection.workspaceActions.length ? (
              homepageProjection.workspaceActions.map((action) => (
                <a href={action.href} key={action.key}>{action.label}</a>
              ))
            ) : (
              <>
                <a href="/dashboard/vendor/inventory">📦 Inventory</a>
                <a href="/dashboard/vendor/billing">🧾 Billing</a>
                <a href="/dashboard/vendor/fleet">🚚 Fleet</a>
                <a href="/dashboard/vendor/dispatch">📍 Dispatch</a>
                <a href="/materials/add?inventory=1">➕ Add Stock</a>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="contentSection">
        <div className="sectionHead mobileToggleHead">
          <div>
            <h2>Browse by Category</h2>
            <p>Explore all popular categories</p>
          </div>
          <button
            type="button"
            className="mobileToggleBtn"
            onClick={() => toggleMobileSection("categories")}
          >
            {mobileSectionOpen("categories") ? "▲ Less" : "▼ See More"}
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
      <section className="contentSection">
        <div className="sectionHead">
          <div>
            <h2>Helpful Discovery</h2>
            <p>Relevant next steps across property, materials, services and rentals</p>
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

      <section className="contentSection utilitySection">
        <div className="sectionHead">
          <div>
            <h2>Marketplace Utility Engine</h2>
            <p>Tools, RFQ and pricing actions in one compact workspace</p>
          </div>
          <a href="/rfq">Post RFQ →</a>
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
          <a href="/login?next=/auth/register-role">Create Account</a>
          <a href="/rfq">Post Requirement</a>
        </div>
      </section>
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
          <a href="/vendor-opportunities">Vendor Opportunities</a>
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

    </main>
  );
}
