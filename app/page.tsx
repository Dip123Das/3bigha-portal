"use client";

import { useEffect, useMemo, useState } from "react";
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
  { title: "Property", icon: "🏠", text: "Land, plots, houses, flats, commercial", count: "12K+ Listings", href: "/property" },
  { title: "Materials", icon: "🧱", text: "Cement, steel, sand, bricks, tiles & more", count: "8K+ Listings", href: "/materials" },
  { title: "Services", icon: "🛠️", text: "Mason, plumber, electrician, legal & more", count: "6K+ Listings", href: "/services" },
  { title: "Rentals", icon: "🚜", text: "JCB, tools, machinery, equipment & more", count: "4K+ Listings", href: "/rentals" },
  { title: "Investment", icon: "📊", text: "Investment zones, projects & opportunities", count: "1K+ Listings", href: "/investment/opportunities" },
  { title: "Cost Calculator", icon: "🧮", text: "Estimate construction cost, BOQ & timeline", count: "Try Now →", href: "/construction-cost" },
];

const tools = [
  { title: "AI Cost Calculator", text: "Estimate construction cost, BOQ and materials", href: "/construction-cost", action: "Calculate" },
  { title: "Price Today", text: "Check latest prices of cement, steel, sand & more", href: "/price-today", action: "Check Prices" },
  { title: "AI Smart Search", text: "Search in natural language across categories", href: "/search", action: "Search Now" },
  { title: "Vendor Discovery", text: "Find verified vendors near you", href: "/vendor/discovery", action: "Find Vendors" },
  { title: "ROI Calculator", text: "Calculate investment returns & growth", href: "/investment/opportunities", action: "Calculate" },
  { title: "EMI Calculator", text: "Calculate EMI for your property", href: "/cost-calculator", action: "Calculate" },
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
  const [aiOpen, setAiOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"search" | "ai" | "post">("search");

  const placeholder = useMemo(() => {
    if (activeTab === "ai") return "Ask 3Bigha AI anything: best cement rate, land near Cooch Behar, house cost estimate...";
    if (activeTab === "post") return "Describe your requirement. Example: Need 500 bags cement in Cooch Behar within 7 days.";
    return "What do you need?\n\nExample: 500 bags cement in Cooch Behar, 2 katha land, mason, JCB rental...";
  }, [activeTab]);

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
            <div className="miniBadge">🔎 AI Powered Marketplace</div>
            <h1><span>One Marketplace.</span> All Your Construction & Property Needs.</h1>
            <p>
              Search properties, materials, services, rentals, vendors, prices and more.
              Compare, connect and get the best deal — all in one place.
            </p>
            <div className="heroFeatureRow">
              <a href="/search">🔍 AI Search</a>
              <a href="/vendor/discovery">🧠 Smart Matching</a>
              <a href="/price-today">💰 Best Prices</a>
              <a href="/support">🛡️ Secure Deals</a>
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

      <section className="contentSection">
        <div className="sectionHead"><div><h2>Browse by Category</h2><p>Explore all popular categories</p></div><a href="/search">View all categories →</a></div>
        <div className="categoryGrid">
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
        <div className="sectionHead"><div><h2>Featured Listings</h2><p>Fresh opportunities from our marketplace</p></div><a href="/search">View all listings →</a></div>
        <div className="listingGrid">
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

      <section className="contentSection">
        <div className="sectionHead"><div><h2>Popular Tools & Calculators</h2><p>Make smart decisions with our AI tools</p></div></div>
        <div className="toolsGrid">
          {tools.map((tool) => (
            <a href={tool.href} className="toolCard" key={tool.title}>
              <b>▣</b><div><h3>{tool.title}</h3><p>{tool.text}</p><span>{tool.action} →</span></div>
            </a>
          ))}
        </div>
      </section>

      <section className="rfqBanner">
        <div>
          <h2>Post Your Requirement (RFQ)</h2>
          <p>Get quotes from multiple verified vendors</p>
          <div className="rfqPills"><span>Reach Multiple Vendors</span><span>Compare Quotes</span><span>Best Price Guaranteed</span><span>Fast Response</span></div>
          <button type="button" onClick={submitRequirement}>Post Requirement Now</button>
        </div>
        <div className="rfqVisual">✈️<span>RFQ Submitted</span><span>Vendor Matched</span></div>
      </section>

      <section className="contentSection">
        <div className="sectionHead"><div><h2>Today's Market Prices</h2><p>Live price updates from local markets</p></div><a href="/price-today">View all prices →</a></div>
        <div className="priceGrid">
          {marketPrices.map(([name, price, change]) => (
            <a href="/price-today" className="priceCard" key={name}><span>{name}</span><strong>{price}</strong><small>{change}</small></a>
          ))}
        </div>
      </section>

      <section className="splitSection">
        <div className="panelCard">
          <div className="sectionHead compact"><div><h2>Latest from Blog / News</h2><p>Stay updated with market insights</p></div><a href="/blog">View all blogs →</a></div>
          <div className="blogList">
            {blogItems.map((post, index) => <a href="/blog" key={post.title}><span>{index + 1}</span><div><strong>{post.title}</strong><small>{post.meta}</small></div></a>)}
          </div>
        </div>

        <div className="panelCard">
          <div className="sectionHead compact"><div><h2>Investment Opportunities</h2><p>High return investment options</p></div><a href="/investment/opportunities">View all →</a></div>
          <div className="investmentGrid">
            <a href="/investment/opportunities"><div>🌿</div><strong>Green Valley Township</strong><span>₹15 Lakh Onwards</span><small>ROI: 18-22%</small></a>
            <a href="/investment/opportunities"><div>🏢</div><strong>Royal Enclave Project</strong><span>₹22 Lakh Onwards</span><small>ROI: 20-25%</small></a>
          </div>
        </div>
      </section>

      <section className="contentSection trustSection">
        <div><h2>Why 3Bigha Marketplace?</h2><p>Trusted by thousands of buyers and sellers</p></div>
        <div className="trustGrid">
          {["100% Verified", "Secure Payments", "Best Prices", "24/7 Support"].map((item) => <div key={item}><b>✓</b><strong>{item}</strong><span>We are here to help</span></div>)}
        </div>
      </section>

      <section className="startBanner">
        <div><h2>Ready to get started?</h2><p>Join thousands of users who trust 3Bigha Marketplace</p></div>
        <div><a href="/signup">Create Account</a><a href="/rfq/general/new">Post Your First Requirement</a></div>
      </section>

      <footer className="homeFooter">
        <div><strong>🏠 3bigha</strong><p>India's most trusted AI-powered marketplace for property, construction, materials, services, rentals and more.</p></div>
        <nav><strong>Marketplace</strong><a href="/property">Property</a><a href="/materials">Materials</a><a href="/services">Services</a><a href="/rentals">Rentals</a></nav>
        <nav><strong>Tools</strong><a href="/construction-cost">Cost Calculator</a><a href="/price-today">Price Today</a><a href="/search">AI Search</a></nav>
        <nav><strong>Company</strong><a href="/about">About Us</a><a href="/contact">Contact Us</a><a href="/support">Support</a></nav>
      </footer>

      <button className="floatingAi" type="button" onClick={() => setAiOpen((v) => !v)}>🤖 <span>3Bigha AI</span></button>
      {aiOpen ? <div className="aiPanel"><strong>3Bigha AI Assistant</strong><a href="/search">AI Smart Search</a><a href="/rfq/general/new">Draft RFQ</a><a href="/price-today">Price Prediction</a><a href="/vendor/discovery">Find Vendors</a></div> : null}

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

        .homePage{min-height:100vh;background:#fff;color:#0f172a;padding-bottom:24px}.heroShell{padding:38px 68px 28px;background:radial-gradient(circle at 18% 18%,#dbeafe 0,transparent 34%),radial-gradient(circle at 86% 12%,#ede9fe 0,transparent 30%),linear-gradient(180deg,#f8fbff,#fff)}.heroGrid{display:grid;grid-template-columns:1.03fr .97fr;gap:48px;align-items:center;max-width:1380px;margin:0 auto}.miniBadge{display:inline-flex;border-radius:999px;background:#eef4ff;color:#1d4ed8;padding:9px 14px;font-size:13px;font-weight:950}.heroCopy h1{margin:22px 0 0;font-size:clamp(44px,5.7vw,78px);line-height:1.02;letter-spacing:-.065em;font-weight:1000}.heroCopy h1 span{display:block;color:#2457d6}.heroCopy p{max-width:660px;margin:18px 0 0;color:#475569;font-size:18px;line-height:1.65;font-weight:650}.heroFeatureRow{display:flex;flex-wrap:wrap;gap:12px;margin-top:26px}.heroFeatureRow a{display:inline-flex;border-radius:999px;background:#fff;border:1px solid rgba(15,23,42,.08);box-shadow:0 10px 28px rgba(15,23,42,.05);padding:10px 14px;color:#0f172a;text-decoration:none;font-size:13px;font-weight:950}.searchCard{background:rgba(255,255,255,.92);border:1px solid rgba(15,23,42,.08);box-shadow:0 28px 80px rgba(15,23,42,.12);border-radius:28px;padding:24px}.searchTabs{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;border-bottom:1px solid #e5e7eb;margin:-4px 0 18px;padding-bottom:10px}.searchTabs button{border:0;background:transparent;border-radius:14px;padding:12px 8px;font-weight:950;color:#475569;cursor:pointer}.searchTabs button.active{background:#eff6ff;color:#1d4ed8;box-shadow:inset 0 2px 0 #2563eb}.searchCard textarea{width:100%;min-height:126px;border:1px solid rgba(15,23,42,.14);border-radius:18px;padding:18px;font-size:15px;line-height:1.7;resize:none;outline:none;color:#0f172a}.typeChips{display:flex;flex-wrap:wrap;gap:10px;margin-top:16px}.typeChips button{border:1px solid rgba(15,23,42,.1);background:#fff;border-radius:999px;padding:9px 13px;font-size:13px;font-weight:950;cursor:pointer}.typeChips button.active{background:#eef4ff;color:#1d4ed8;border-color:#bfdbfe}.searchActions{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:18px}.searchActions button{border:0;border-radius:18px;padding:16px;font-weight:1000;cursor:pointer}.primaryAction{background:#1d4ed8;color:#fff;box-shadow:0 14px 34px rgba(29,78,216,.24)}.secondaryAction{background:#fff;border:1px solid rgba(15,23,42,.12)!important;color:#0f172a}.statsRail{max-width:1380px;margin:-2px auto 34px;padding:0 68px;display:grid;grid-template-columns:repeat(6,1fr);gap:0}.statCard{background:#fff;border:1px solid rgba(15,23,42,.08);box-shadow:0 12px 30px rgba(15,23,42,.06);padding:22px;display:flex;gap:13px;align-items:center}.statCard:first-child{border-radius:18px 0 0 18px}.statCard:last-child{border-radius:0 18px 18px 0}.statCard span{width:42px;height:42px;border-radius:999px;display:flex;align-items:center;justify-content:center;background:#ecfdf5}.statCard strong{display:block;font-size:24px;font-weight:1000}.statCard small{display:block;color:#64748b;font-size:12px;font-weight:850}.contentSection,.splitSection,.rfqBanner,.startBanner,.homeFooter{max-width:1380px;margin:0 auto 34px;padding:0 68px}.sectionHead{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;margin-bottom:18px}.sectionHead h2,.trustSection h2{margin:0;font-size:25px;letter-spacing:-.03em;font-weight:1000}.sectionHead p,.trustSection p{margin:4px 0 0;color:#64748b;font-size:14px;font-weight:700}.sectionHead a{color:#1d4ed8;text-decoration:none;font-weight:950}.categoryGrid{display:grid;grid-template-columns:repeat(6,1fr);gap:18px}.categoryCard{border:1px solid rgba(15,23,42,.09);border-radius:18px;background:#fff;text-align:center;text-decoration:none;color:inherit;padding:28px 18px;box-shadow:0 10px 26px rgba(15,23,42,.04);transition:.16s ease}.categoryCard:hover,.listingCard:hover,.toolCard:hover{transform:translateY(-3px);box-shadow:0 18px 42px rgba(15,23,42,.08)}.categoryIcon{font-size:42px}.categoryCard h3{margin:14px 0 0;font-size:16px;font-weight:1000}.categoryCard p{min-height:42px;margin:8px 0 0;color:#64748b;font-size:12px;line-height:1.45}.categoryCard strong{display:block;margin-top:14px;color:#16a34a;font-size:12px}.listingGrid{display:grid;grid-template-columns:repeat(5,1fr);gap:18px}.listingCard{border:1px solid rgba(15,23,42,.09);border-radius:16px;background:#fff;text-decoration:none;color:inherit;overflow:hidden;box-shadow:0 10px 28px rgba(15,23,42,.05);transition:.16s ease}.listingImage{height:148px;background:linear-gradient(135deg,#dbeafe,#fef3c7);position:relative;display:flex;align-items:center;justify-content:center}.listingImage img{width:100%;height:100%;object-fit:cover}.listingImage b{font-size:48px}.listingImage span{position:absolute;left:10px;top:10px;border-radius:999px;background:#2563eb;color:#fff;padding:5px 9px;font-size:11px;font-weight:950}.listingBody{padding:13px}.listingBody h3{margin:0;font-size:15px;line-height:1.35;font-weight:1000}.listingBody p{margin:7px 0 0;color:#64748b;font-size:12px}.listingBody strong{display:block;margin-top:10px;color:#dc2626;font-size:15px}.listingBody small{display:block;margin-top:7px;color:#64748b;font-size:11px}.toolsGrid{display:grid;grid-template-columns:repeat(6,1fr);gap:18px}.toolCard{display:flex;gap:12px;border:1px solid rgba(15,23,42,.09);border-radius:16px;background:#fff;text-decoration:none;color:inherit;padding:18px;box-shadow:0 10px 28px rgba(15,23,42,.04);transition:.16s ease}.toolCard b{color:#2563eb}.toolCard h3{margin:0;font-size:14px;font-weight:1000}.toolCard p{margin:6px 0 0;color:#64748b;font-size:12px;line-height:1.4}.toolCard span{display:block;margin-top:10px;color:#1d4ed8;font-size:12px;font-weight:950}.rfqBanner{background:linear-gradient(135deg,#153bc9,#6d28d9);border-radius:18px;color:#fff;padding:32px 44px;display:flex;justify-content:space-between;align-items:center;overflow:hidden;box-shadow:0 24px 60px rgba(30,64,175,.22)}.rfqBanner h2{font-size:30px;margin:0;font-weight:1000}.rfqBanner p{margin:7px 0 0;color:#dbeafe}.rfqPills{display:flex;flex-wrap:wrap;gap:10px;margin:20px 0}.rfqPills span{border-radius:10px;background:rgba(255,255,255,.12);padding:9px 12px;font-size:12px;font-weight:900}.rfqBanner button{border:0;border-radius:12px;background:#fff;color:#1d4ed8;padding:13px 18px;font-weight:1000;cursor:pointer}.rfqVisual{font-size:54px;min-width:260px;text-align:center}.rfqVisual span{display:block;background:#fff;color:#1e3a8a;border-radius:12px;padding:10px 12px;margin-top:8px;font-size:13px;font-weight:950;transform:rotate(-4deg)}.priceGrid{display:grid;grid-template-columns:repeat(6,1fr);gap:16px}.priceCard{border:1px solid rgba(15,23,42,.09);border-radius:16px;background:#fff;text-decoration:none;color:inherit;padding:18px;box-shadow:0 10px 24px rgba(15,23,42,.04)}.priceCard span{font-size:12px;color:#475569;font-weight:850}.priceCard strong{display:block;margin-top:12px;font-size:20px}.priceCard small{display:block;margin-top:14px;color:#16a34a;font-weight:950}.splitSection{display:grid;grid-template-columns:1fr 1fr;gap:18px}.panelCard{border:1px solid rgba(15,23,42,.09);border-radius:18px;background:#fff;padding:18px;box-shadow:0 10px 28px rgba(15,23,42,.04)}.compact{margin-bottom:12px}.compact h2{font-size:21px}.blogList{display:grid;gap:10px}.blogList a{display:flex;gap:12px;align-items:center;text-decoration:none;color:inherit;border-bottom:1px solid #f1f5f9;padding:9px 0}.blogList span{width:76px;height:56px;border-radius:12px;background:linear-gradient(135deg,#bfdbfe,#fed7aa);display:flex;align-items:center;justify-content:center;font-weight:1000}.blogList strong{font-size:14px}.blogList small{display:block;margin-top:6px;color:#64748b}.investmentGrid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.investmentGrid a{text-decoration:none;color:inherit;border:1px solid #e5e7eb;border-radius:15px;overflow:hidden}.investmentGrid div{height:120px;background:linear-gradient(135deg,#bbf7d0,#bfdbfe);display:flex;align-items:center;justify-content:center;font-size:48px}.investmentGrid strong,.investmentGrid span,.investmentGrid small{display:block;padding:0 12px}.investmentGrid strong{margin-top:12px}.investmentGrid span{margin-top:7px;font-weight:1000}.investmentGrid small{margin:8px 0 12px;color:#64748b}.trustSection{margin-bottom:24px}.trustGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-top:16px}.trustGrid div{border:1px solid rgba(15,23,42,.09);border-radius:16px;background:#fff;padding:18px;display:flex;gap:12px;align-items:center}.trustGrid b{width:40px;height:40px;border-radius:12px;background:#ecfdf5;color:#16a34a;display:flex;align-items:center;justify-content:center}.trustGrid strong{font-size:15px}.trustGrid span{display:block;color:#64748b;font-size:12px}.startBanner{border:1px solid #bbf7d0;border-radius:18px;background:linear-gradient(135deg,#ecfdf5,#fff);padding:26px 68px;display:flex;justify-content:space-between;align-items:center}.startBanner h2{margin:0}.startBanner p{margin:6px 0 0;color:#64748b}.startBanner div:last-child{display:flex;gap:12px}.startBanner a{border-radius:10px;padding:13px 18px;text-decoration:none;font-weight:950}.startBanner a:first-child{background:#16a34a;color:#fff}.startBanner a:last-child{border:1px solid #16a34a;color:#15803d;background:#fff}.homeFooter{border-top:1px solid #e5e7eb;padding-top:26px;display:grid;grid-template-columns:2fr repeat(3,1fr);gap:36px;color:#475569}.homeFooter strong{color:#0f172a}.homeFooter p{max-width:360px;font-size:13px;line-height:1.6}.homeFooter nav{display:grid;gap:8px}.homeFooter a{text-decoration:none;color:#475569;font-size:13px}.floatingAi{position:fixed;right:20px;bottom:20px;z-index:80;border:0;border-radius:999px;background:linear-gradient(135deg,#0f172a,#2563eb);color:#fff;padding:14px 18px;box-shadow:0 22px 54px rgba(15,23,42,.25);font-weight:1000;cursor:pointer;display:flex;gap:8px;align-items:center}.aiPanel{position:fixed;right:20px;bottom:82px;width:260px;border-radius:18px;background:#fff;border:1px solid rgba(15,23,42,.1);box-shadow:0 22px 54px rgba(15,23,42,.18);padding:16px;z-index:80;display:grid;gap:10px}.aiPanel a{text-decoration:none;color:#1d4ed8;font-weight:900;border-radius:12px;background:#eff6ff;padding:10px 12px}@media(max-width:1100px){.heroShell,.statsRail,.contentSection,.splitSection,.rfqBanner,.startBanner,.homeFooter{padding-left:20px;padding-right:20px}.heroGrid,.splitSection{grid-template-columns:1fr}.statsRail,.categoryGrid,.toolsGrid,.priceGrid{grid-template-columns:repeat(2,1fr)}.listingGrid{grid-template-columns:repeat(2,1fr)}.trustGrid{grid-template-columns:repeat(2,1fr)}}@media(max-width:640px){.heroShell{padding:20px 12px}.heroCopy h1{font-size:39px}.heroCopy p{font-size:15px}.searchCard{border-radius:18px;padding:14px}.searchTabs{grid-template-columns:1fr}.searchActions,.statsRail,.categoryGrid,.listingGrid,.toolsGrid,.priceGrid,.trustGrid,.investmentGrid{grid-template-columns:1fr}.statsRail{padding:0 12px;margin-bottom:18px}.statCard,.statCard:first-child,.statCard:last-child{border-radius:16px}.contentSection,.splitSection,.rfqBanner,.startBanner,.homeFooter{padding-left:12px;padding-right:12px;margin-bottom:22px}.sectionHead{align-items:flex-start;flex-direction:column}.rfqBanner,.startBanner{flex-direction:column;align-items:flex-start;padding:22px}.rfqVisual{display:none}.homeFooter{grid-template-columns:1fr}.floatingAi{right:12px;bottom:12px}.aiPanel{right:12px;bottom:72px;width:calc(100vw - 24px)}}

        .mobileSeeMoreButton {
          display: none;
        }

        @media (max-width: 640px) {
          .premiumCategoryGrid:not(.isMobileExpanded) > *:nth-child(n+4),
          .premiumListingsGrid:not(.isMobileExpanded) > *:nth-child(n+4),
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

      `}</style>
    </main>
  );
}
