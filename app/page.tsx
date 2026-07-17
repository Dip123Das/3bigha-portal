"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import JsonLd from "@/components/seo/JsonLd";
import { organizationSchema, websiteSchema } from "@/lib/seo/schema";
import "./homepage-shell-recovery.css";
import styles from "./homepage.module.css";

type SearchScope = "property" | "materials" | "services" | "rentals";

type MarketplaceItem = {
  id: string;
  module: "Property" | "Material" | "Service" | "Rental";
  title: string;
  subtitle: string;
  meta: string;
  price: string;
  href: string;
  image?: string | null;
};

type DiscoveryMemoryItem = {
  id: string;
  module: "property" | "materials" | "services" | "rentals";
  title: string;
  href: string;
  city?: string | null;
  district?: string | null;
  locality?: string | null;
};

const journeys = [
  { title: "Build", text: "Plan construction, understand costs and find the people and materials you need.", href: "/construction-cost", icon: "🏗️" },
  { title: "Buy", text: "Find property, materials, services and equipment near you.", href: "/search", icon: "🏠" },
  { title: "Sell", text: "Offer a property, product or service to the people who need it.", href: "/property/add", icon: "🤝" },
  { title: "Hire", text: "Find contractors, professionals, skilled workers and local services.", href: "/services", icon: "👷" },
  { title: "Manage", text: "Continue your requirements, conversations and daily business work.", href: "/dashboard", icon: "📋" },
  { title: "Learn", text: "Use practical guides and local information before you decide.", href: "/blog", icon: "📖" },
  { title: "Grow", text: "Build your presence and discover genuine business opportunities.", href: "/vendor-opportunities", icon: "🌱" },
];

const domains = [
  { title: "Property", text: "Land, homes, commercial spaces and builder projects.", href: "/property", icon: "🏡" },
  { title: "Construction materials", text: "Cement, steel, sand, bricks and other project needs.", href: "/materials", icon: "🧱" },
  { title: "Professionals & services", text: "Contractors, skilled workers, consultants and local support.", href: "/services", icon: "🛠️" },
  { title: "Equipment & rentals", text: "Machines, tools, vehicles and construction equipment for rent.", href: "/rentals", icon: "🚜" },
];

const usefulLinks = [
  { title: "Understand construction cost", text: "Prepare an early estimate for a house or project.", href: "/construction-cost" },
  { title: "Check available prices", text: "See published material prices and local market information.", href: "/price-today" },
  { title: "Calculate an EMI", text: "Understand a possible monthly payment before committing.", href: "/emi-calculator" },
  { title: "Learn how to search", text: "A simple guide to finding the right property, material or service.", href: "/ai-search-guide" },
];

function moneyINR(value: unknown) {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num) || num <= 0) return "";
  return `₹${num.toLocaleString("en-IN")}`;
}

function firstPhotoUrl(photos: unknown): string | null {
  if (!photos) return null;
  if (Array.isArray(photos)) {
    const first = photos[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object") {
      const record = first as { url?: string; src?: string };
      return record.url || record.src || null;
    }
  }
  if (typeof photos === "object") {
    const record = photos as { url?: string; src?: string };
    return record.url || record.src || null;
  }
  return null;
}

function clipText(value: unknown, max = 86) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max).trim()}…` : text;
}

function readDiscoveryMemory(): DiscoveryMemoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem("3bigha.discovery.memory.v1");
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice(0, 4) : [];
  } catch {
    return [];
  }
}

export default function HomePage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<SearchScope>("property");
  const [featuredItems, setFeaturedItems] = useState<MarketplaceItem[]>([]);
  const [recentDiscovery, setRecentDiscovery] = useState<DiscoveryMemoryItem[]>([]);

  useEffect(() => setRecentDiscovery(readDiscoveryMemory()), []);

  useEffect(() => {
    let alive = true;

    async function loadPublishedListings() {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (!supabaseUrl || !supabaseKey) return;

        const supabase = createClient(supabaseUrl, supabaseKey, {
          auth: { persistSession: false },
        });

        const propertyReq = fetch("/api/property/public-listings?page=0&pageSize=3", {
          cache: "no-store",
        }).then((response) => response.json()).catch(() => ({ data: [] }));

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

        const properties: MarketplaceItem[] = (propertyRes?.data || []).map((item: any) => ({
          id: String(item.id),
          module: "Property",
          title: item.title || "Property listing",
          subtitle: [item.city, item.state].filter(Boolean).join(", ") || "Location available",
          meta: item.listing_intent || "Property",
          price: moneyINR(item.expected_price || item.price) || "Price on request",
          href: `/property/${encodeURIComponent(String(item.slug || item.id))}`,
          image: firstPhotoUrl(item.photos),
        }));

        const materials: MarketplaceItem[] = (materialsRes.data || []).map((item: any) => ({
          id: String(item.id),
          module: "Material",
          title: item.title || item.local_name || "Material listing",
          subtitle: clipText(item.description) || "Building material available",
          meta: item.packaging_unit ? `Unit: ${item.packaging_unit}` : "Material",
          price: moneyINR(item.attributes?.price || item.attributes?.unit_price || item.attributes?.rate || item.attributes?.mrp) || "Ask price",
          href: `/materials/${encodeURIComponent(String(item.id))}`,
        }));

        const services: MarketplaceItem[] = (servicesRes.data || []).map((item: any) => ({
          id: String(item.provider_service_id),
          module: "Service",
          title: item.custom_service || "Professional service",
          subtitle: item.provider_name || clipText(item.service_description) || "Service provider",
          meta: [item.city, item.district].filter(Boolean).join(", ") || item.custom_category || "Service",
          price: item.min_price || item.max_price
            ? `${moneyINR(item.min_price) || "Price"}${item.max_price ? ` – ${moneyINR(item.max_price)}` : ""}`
            : "Quote on request",
          href: "/services",
        }));

        const rentals: MarketplaceItem[] = (rentalsRes.data || []).map((item: any) => ({
          id: String(item.id),
          module: "Rental",
          title: item.title || "Rental equipment",
          subtitle: [item.locality, item.city, item.district].filter(Boolean).join(", ") || clipText(item.description),
          meta: item.rate_unit_label || "Rental",
          price: item.rate ? `${moneyINR(item.rate)}${item.rate_unit_label ? ` / ${item.rate_unit_label}` : ""}` : "Rate on request",
          href: `/rentals/${encodeURIComponent(String(item.id))}`,
          image: firstPhotoUrl(item.photos),
        }));

        setFeaturedItems([...properties, ...materials, ...services, ...rentals].slice(0, 7));
      } catch {
        // The homepage remains useful even when a public listing source is unavailable.
      }
    }

    loadPublishedListings();
    return () => { alive = false; };
  }, []);

  const localArea = useMemo(() => {
    const recent = recentDiscovery[0];
    return recent?.locality || recent?.city || recent?.district || "your area";
  }, [recentDiscovery]);

  function findWhatINeed() {
    const clean = query.trim();
    router.push(clean ? `/search?module=${scope}&q=${encodeURIComponent(clean)}` : `/${scope}`);
  }

  function submitRequirement() {
    const clean = query.trim();
    router.push(clean ? `/rfq?query=${encodeURIComponent(clean)}` : "/rfq");
  }

  return (
    <div className={styles.home}>
      <JsonLd data={[organizationSchema(), websiteSchema()]} />

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>3Bigha Business Operating System</span>
          <h1>What would you like to do today?</h1>
          <p>Tell 3Bigha what you need. We will guide you to the right place, people and next step.</p>
        </div>

        <div className={styles.needCard}>
          <label htmlFor="home-need">Describe your need in your own words</label>
          <textarea
            id="home-need"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="For example: I need cement for my house in Cooch Behar, or I want to find land near my town."
          />
          <div className={styles.scopeRow} aria-label="Choose what you are looking for">
            {([
              ["property", "Property"],
              ["materials", "Materials"],
              ["services", "Services"],
              ["rentals", "Rentals"],
            ] as const).map(([value, label]) => (
              <button key={value} type="button" className={scope === value ? styles.scopeActive : ""} onClick={() => setScope(value)}>
                {label}
              </button>
            ))}
          </div>
          <div className={styles.heroActions}>
            <button type="button" onClick={findWhatINeed}>Find what I need</button>
            <button type="button" className={styles.secondaryButton} onClick={submitRequirement}>Submit my requirement</button>
          </div>
          <small>You stay in control. 3Bigha prepares the path; you choose what happens next.</small>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <span>Start with your purpose</span>
          <h2>Choose what you want to accomplish</h2>
          <p>No technical terms. Start with the work that matters to you.</p>
        </div>
        <div className={styles.journeyGrid}>
          {journeys.map((journey) => (
            <Link href={journey.href} className={styles.journeyCard} key={journey.title}>
              <span className={styles.icon}>{journey.icon}</span>
              <strong>{journey.title}</strong>
              <p>{journey.text}</p>
              <span className={styles.cardLink}>Continue →</span>
            </Link>
          ))}
        </div>
      </section>

      <section className={`${styles.section} ${styles.domainSection}`}>
        <div className={styles.sectionHeading}>
          <span>Explore 3Bigha</span>
          <h2>Everything for property and construction, connected</h2>
          <p>Browse directly when you already know what you need.</p>
        </div>
        <div className={styles.domainGrid}>
          {domains.map((domain) => (
            <Link href={domain.href} className={styles.domainCard} key={domain.title}>
              <span className={styles.domainIcon}>{domain.icon}</span>
              <div><strong>{domain.title}</strong><p>{domain.text}</p></div>
              <span>→</span>
            </Link>
          ))}
        </div>
      </section>

      {recentDiscovery.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <span>Continue naturally</span>
            <h2>Pick up where you left off</h2>
            <p>Your recent browsing near {localArea}, kept on this device.</p>
          </div>
          <div className={styles.recentGrid}>
            {recentDiscovery.map((item) => (
              <Link href={item.href} key={`${item.module}-${item.id}`}>
                <small>{item.module}</small><strong>{item.title}</strong><span>Continue →</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className={styles.section}>
        <div className={styles.sectionHeadingRow}>
          <div className={styles.sectionHeading}>
            <span>Published on 3Bigha</span>
            <h2>Recently available</h2>
            <p>Real public listings from the 3Bigha marketplace.</p>
          </div>
          <Link href="/search">View all →</Link>
        </div>
        {featuredItems.length > 0 ? (
          <div className={styles.listingGrid}>
            {featuredItems.map((item) => (
              <Link href={item.href} className={styles.listingCard} key={`${item.module}-${item.id}`}>
                <div className={styles.listingImage}>
                  {item.image ? <img src={item.image} alt="" /> : <span>{item.module.slice(0, 1)}</span>}
                  <small>{item.module}</small>
                </div>
                <div className={styles.listingBody}>
                  <strong>{item.title}</strong><p>{item.subtitle}</p><b>{item.price}</b><small>{item.meta}</small>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className={styles.honestEmpty}>
            <strong>Explore what is available now</strong>
            <p>Open a category to see its currently published listings.</p>
            <Link href="/search">Explore 3Bigha →</Link>
          </div>
        )}
      </section>

      <section className={`${styles.section} ${styles.usefulSection}`}>
        <div className={styles.sectionHeading}>
          <span>Useful before you decide</span>
          <h2>Simple tools and practical information</h2>
          <p>Understand your options without needing specialist software knowledge.</p>
        </div>
        <div className={styles.usefulGrid}>
          {usefulLinks.map((item) => (
            <Link href={item.href} key={item.title}><strong>{item.title}</strong><p>{item.text}</p><span>Open →</span></Link>
          ))}
        </div>
      </section>

      <section className={styles.trustSection}>
        <div>
          <span>Human first, always</span>
          <h2>Technology should make work feel simpler.</h2>
          <p>3Bigha helps prepare information and connect your work. You review, compare and decide.</p>
        </div>
        <div className={styles.trustPoints}>
          <p><strong>You choose.</strong> Nothing is decided on your behalf.</p>
          <p><strong>People stay visible.</strong> Listings, providers and conversations remain understandable.</p>
          <p><strong>Your work stays connected.</strong> Continue across property, materials, services and rentals.</p>
        </div>
      </section>

      <section className={styles.businessEntry}>
        <div><span>For businesses and professionals</span><h2>Continue your daily work on 3Bigha</h2><p>Manage your presence, requirements, listings and conversations from one connected place.</p></div>
        <div><Link href="/dashboard">Manage my business</Link><Link href="/vendor-opportunities" className={styles.businessSecondary}>Grow my business</Link></div>
      </section>
    </div>
  );
}
