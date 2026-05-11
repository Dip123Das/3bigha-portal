// app/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import JsonLd from "@/components/seo/JsonLd";
import { organizationSchema, websiteSchema } from "@/lib/seo/schema";

type SearchScope = "property" | "materials" | "services" | "rentals" | "investment";

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
            <div className="marketBadge">Verified local marketplace</div>

            <h1>Find Property, Materials, Services & Rentals</h1>

            <p>
              Search listings, submit requirements, compare prices and connect with local providers.
            </p>

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
                <span>{locationText ? `📍 Near ${locationText}` : "📍 Search by location or requirement"}</span>
                <a href="/rfq/general/new">Submit Requirement</a>
                <a href="/property/add">Post Property</a>
              </div>
            </div>
          </div>
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
        <a href="/price-today">Check Rates →</a>
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
          max-width: 1180px;
          margin: 0 auto;
          padding: 34px 16px 26px;
        }

        .marketHeroContent {
          max-width: 980px;
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
          margin-top: 22px;
          background: #ffffff;
          border: 1px solid rgba(15, 23, 42, 0.10);
          border-radius: 18px;
          padding: 14px;
          box-shadow: 0 18px 45px rgba(15, 23, 42, 0.10);
        }

        .moduleTabs {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 8px;
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

        .quickActionSection,
        .categorySection {
          max-width: 1180px;
          margin: 16px auto 0;
          padding: 0 16px;
          display: grid;
          gap: 14px;
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
          max-width: 1180px;
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

        @media (max-width: 980px) {
          .quickActionSection {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .categorySection {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 640px) {
          .marketHeroInner {
            padding: 18px 0 14px;
          }

          .marketHeroContent {
            padding: 0 10px;
          }

          .marketHero {
            background: #ffffff;
          }

          .marketBadge {
            font-size: 12px;
          }

          h1 {
            font-size: 28px;
            letter-spacing: -0.035em;
          }

          p {
            font-size: 15px;
          }

          .searchPanel {
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

          .quickActionSection,
          .categorySection,
          .priceStrip {
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
        }
      `}</style>
    </main>
  );
}