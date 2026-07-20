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
  readDiscoveryMemory,
  type DiscoveryMemoryItem,
} from "@/lib/personalized-discovery/discovery-memory";
import {
  aiMarketplaceSchema,
  marketplaceFaqSchema,
  organizationSchema,
  websiteSchema,
} from "@/lib/seo/schema";

type SearchScope = "property" | "materials" | "services" | "rentals" | "price_today";

type LgdHomepageLocation = {
  id: string;
  name: string;
};

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

async function resolveLgdLocation(
  recentDiscovery: DiscoveryMemoryItem[],
): Promise<LgdHomepageLocation | null> {
  const latest = recentDiscovery.find(
    (item) => item.locality || item.city || item.district,
  );
  const candidate = latest?.locality || latest?.city || latest?.district;
  if (!candidate) return null;

  try {
    const params = new URLSearchParams({
      type: "search",
      q: candidate,
      limit: "10",
      offset: "0",
    });
    const response = await fetch(`/api/geography/options?${params.toString()}`, {
      cache: "no-store",
    });
    if (!response.ok) return null;

    const payload = await response.json();
    const options = Array.isArray(payload?.options) ? payload.options : [];
    const normalizedCandidate = candidate.trim().toLowerCase();
    const verified = options.find((option: any) => {
      const names = [option?.name, option?.label, option?.district_name, option?.state_name]
        .filter(Boolean)
        .map((value) => String(value).trim().toLowerCase());
      return names.some(
        (value) =>
          value === normalizedCandidate || value.includes(normalizedCandidate),
      );
    });

    if (!verified?.id) return null;
    return {
      id: String(verified.id),
      name: String(verified.name || candidate),
    };
  } catch {
    return null;
  }
}

function buildHomepageDiscoveryRails(
  lgdLocation: LgdHomepageLocation | null,
  featuredItems: MarketplaceItem[]
): DiscoveryRail[] {
  const location = lgdLocation?.name || "your area";
  const locationQuery = lgdLocation
    ? `?q=${encodeURIComponent(lgdLocation.name)}`
    : "";

  const rails: DiscoveryRail[] = [
    {
      title: `Trending near ${location}`,
      subtitle: "Explore property, materials, services and rentals around this area.",
      href: `/search${locationQuery}`,
      icon: "📍",
      tone: "Local Pulse",
    },
    {
      title: "Popular property opportunities",
      subtitle: "Browse land, plots and property opportunities with strong local demand.",
      href: lgdLocation
        ? `/property?sort=growth&q=${encodeURIComponent(lgdLocation.name)}`
        : "/property?sort=growth",
      icon: "📈",
      tone: "Popular",
    },
    {
      title: "Plan your construction",
      subtitle: "Plan house construction cost, materials and contractor requirements.",
      href: lgdLocation
        ? `/house-construction-cost?location=${encodeURIComponent(lgdLocation.name)}`
        : "/house-construction-cost",
      icon: "🏗️",
      tone: "Construction",
    },
    {
      title: "Materials for your project",
      subtitle: "Cement, TMT, sand, bricks, tiles and finishing materials.",
      href: `/materials${locationQuery}`,
      icon: "🧱",
      tone: "Materials",
    },
    {
      title: "Services you may need",
      subtitle: "Mason, architect, plumber, electrician, painter and legal support.",
      href: `/services${locationQuery}`,
      icon: "🛠️",
      tone: "Services",
    },
    {
      title: "Rent construction equipment",
      subtitle: "JCB, mixer, scaffolding and site equipment near your area.",
      href: `/rentals${locationQuery}`,
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
  const [lgdLocation, setLgdLocation] = useState<LgdHomepageLocation | null>(null);
  const [activeTab, setActiveTab] = useState<"search" | "post">("search");

  const placeholder = useMemo(() => {
    if (activeTab === "post") return "Describe your requirement clearly. Example: Need 500 bags cement in Cooch Behar within 7 days.";
    return "Search property, materials, services, rentals or construction needs. Review the prepared options before you choose.";
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
    () => buildHomepageDiscoveryRails(lgdLocation, featuredItems),
    [lgdLocation, featuredItems]
  );

  useEffect(() => {
    const memory = readDiscoveryMemory().slice(0, 8);
    setRecentDiscovery(memory);
    let active = true;
    resolveLgdLocation(memory).then((location) => {
      if (active) setLgdLocation(location);
    });
    return () => {
      active = false;
    };
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
    if (scope === "price_today") {
      router.push(clean ? `/price-today?q=${encodeURIComponent(clean)}` : "/price-today");
      return;
    }
    if (!clean) {
      router.push(`/${scope}`);
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

      <section className="contentSection manageBusinessSection">
        <div className="aiBusinessCommand">
          <div className="aiBusinessCopy">
            <span>Manage My Business</span>
            <h2>{homepageProjection.workdeskTitle}</h2>
            <p>{homepageProjection.workdeskDescription}</p>
          </div>

          <div className="aiBusinessActions">
            {homepageProjection.workspaceActions.length ? (
              homepageProjection.workspaceActions.map((action) => (
                <a href={action.href} key={action.key}>{action.label}</a>
              ))
            ) : (
              <a href={homepageProjection.primaryWorkspaceHref}>
                {homepageProjection.primaryWorkspaceActionLabel}
              </a>
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
            <h2>Explore near you</h2>
            <p>
              {lgdLocation
                ? `Showing paths connected with the official location directory for ${lgdLocation.name}.`
                : "Choose a location in search to see nearby property, materials, services and rentals."}
            </p>
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
            <h2>Useful tools</h2>
            <p>Estimate cost, check published prices, search or submit a requirement</p>
          </div>
          <a href="/rfq">Submit requirement →</a>
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
            <span>Submit a requirement</span>
            <h2>Post Your Requirement</h2>
            <p>Describe what you need, receive available quotations and compare them before deciding.</p>
            <div className="rfqPills">
              <span>Your Requirement</span>
              <span>Compare Quotes</span>
              <span>You Decide</span>
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
              <h2>Guides and updates</h2>
              <p>Read the articles currently published on 3Bigha.</p>
            </div>
            <a href="/blog">View all →</a>
          </div>

          <a className="homePanelAction" href="/blog">
            Browse published guides and news →
          </a>
        </div>

        <div className="bottomPanel compactInvestmentPanel">
          <div className="bottomPanelHead">
            <div>
              <h2>Investment Opportunities</h2>
              <p>Review currently published projects, terms and available details.</p>
            </div>
            <a href="/investment/opportunities">View all →</a>
          </div>

          <a className="homePanelAction" href="/investment/opportunities">
            Explore published investment opportunities →
          </a>
        </div>
      </section>

      <section className="cleanTrustSection">
        <div className="cleanTrustIntro">
          <span>Human-First Business Operating System</span>
          <h2>One place to find, compare and continue your work</h2>
          <p>Marketplace discovery and daily business work stay connected while every important decision remains yours.</p>
        </div>

        <div className="cleanTrustGrid">
          {[
            ["Clear journeys", "Start with Build, Buy, Sell, Hire, Rent, Manage or Grow"],
            ["Local context", "Official geography remains the source for location-based work"],
            ["Direct comparison", "Review listings and quotations before you decide"],
            ["Human control", "Assistance may prepare information but never makes the decision for you"],
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
          <p>Start with a real need or open the workspace for your business.</p>
        </div>
        <div>
          <a href="/login?next=/auth/register-role">Create Account</a>
          <a href="/rfq">Post Requirement</a>
          <a href="/dashboard">Manage My Business</a>
        </div>
      </section>
      <footer className="cleanHomeFooter">
        <div>
          <strong>🏠 3bigha</strong>
          <p>India&apos;s Human-First Business Operating System with an integrated marketplace.</p>
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
