"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

const locations = [
  "Cooch Behar",
  "Siliguri",
  "Jalpaiguri",
  "Alipurduar",
  "Kolkata",
];

const categoryOptions = [
  { label: "Materials", href: "/materials" },
  { label: "Services", href: "/services" },
  { label: "Rentals", href: "/rentals" },
  { label: "Properties", href: "/property" },
];

const subCategoryMap: Record<string, string[]> = {
  Materials: [
    "Cement",
    "Steel Rod",
    "Sand",
    "Brick",
    "Aggregate",
    "Stone Chips",
    "Paint",
    "Tiles",
    "Plumbing Materials",
    "Electrical Fittings",
  ],
  Services: [
    "Mason",
    "Plumber",
    "Electrician",
    "Painter",
    "Interior Work",
    "Legal Service",
  ],
  Rentals: [
    "JCB Rental",
    "Tractor Rental",
    "Mixer Machine Rental",
    "Scaffolding Rental",
    "Shuttering Material Rental",
  ],
  Properties: [
    "Land",
    "Flat",
    "Shop",
    "Office",
    "Commercial Space",
  ],
};

const materials = [
  { name: "Cement", price: "₹390 - ₹430 / bag", trend: "Stable", icon: "🏗️" },
  { name: "Steel Rod", price: "₹58 - ₹64 / kg", trend: "Up", icon: "🔩" },
  {
    name: "Sand",
    price: "₹3,200 - ₹4,200 / tractor",
    trend: "Down",
    icon: "🏖️",
  },
  { name: "Brick", price: "₹9 - ₹12 / piece", trend: "Stable", icon: "🧱" },
];

const propertyPrices = [
  { name: "Land", price: "₹8L - ₹13L / katha", trend: "Up", icon: "🌾" },
  {
    name: "Flat",
    price: "₹2,800 - ₹4,500 / sq.ft.",
    trend: "Stable",
    icon: "🏢",
  },
  {
    name: "Shop",
    price: "₹6,000 - ₹12,000 / sq.ft.",
    trend: "Up",
    icon: "🏬",
  },
  {
    name: "Office",
    price: "₹4,000 - ₹8,000 / sq.ft.",
    trend: "Stable",
    icon: "🏦",
  },
];

function TrendBadge({ trend }: { trend: string }) {
  const label =
    trend === "Up" ? "↑ Up" : trend === "Down" ? "↓ Down" : "→ Stable";

  return (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
      {label}
    </span>
  );
}

export default function PriceTodayPage() {
  const [category, setCategory] = useState("Materials");
  const [item, setItem] = useState("All Items");

  const selectedCategory = categoryOptions.find((cat) => cat.label === category);

  const subCategories = useMemo(() => {
    return subCategoryMap[category] || [];
  }, [category]);

  const listingHref = selectedCategory?.href || "/search";

  return (
    <main className="min-h-screen bg-[#f8faf7]">
      <section className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-5">
          <Link
            href="/"
            className="text-sm font-bold text-emerald-700 hover:text-emerald-800"
          >
            ← Back to Home
          </Link>
        </div>

        <div className="rounded-3xl bg-gradient-to-br from-orange-500 via-red-600 to-amber-800 p-5 text-white shadow-sm sm:p-8">
          <p className="mb-2 inline-flex rounded-full bg-white/20 px-3 py-1 text-xs font-black">
            PRICE TODAY
          </p>

          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            Today’s Material & Property Price Trends
          </h1>

          <p className="mt-3 max-w-3xl text-base font-medium leading-7 text-white/90">
            Approximate local market indication for construction materials,
            land, flats, shops, offices, services and rentals.
          </p>

          <div className="mt-5 max-w-sm rounded-2xl bg-white p-4 text-slate-950">
            <div className="text-sm font-black text-red-600">
              Current Offer
            </div>
            <div className="mt-1 text-xl font-black">
              Vendor launch discount available
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-600">
              Offer period: 26 April 2026 - 31 May 2026
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-black text-slate-700">
                Type District / Town / City
              </label>
              <input
                list="price-today-locations"
                placeholder="Type or select location"
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold text-slate-800 outline-none focus:border-emerald-500"
              />
              <datalist id="price-today-locations">
                {locations.map((location) => (
                  <option key={location} value={location} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="text-sm font-black text-slate-700">
                Select Category
              </label>
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setItem("All Items");
                }}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold text-slate-800 outline-none focus:border-emerald-500"
              >
                {categoryOptions.map((cat) => (
                  <option key={cat.label} value={cat.label}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-black text-slate-700">
                Select Exact Item
              </label>
              <select
                value={item}
                onChange={(e) => setItem(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold text-slate-800 outline-none focus:border-emerald-500"
              >
                <option>All Items</option>
                {subCategories.map((subItem) => (
                  <option key={subItem} value={subItem}>
                    {subItem}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={listingHref}
              className="rounded-2xl bg-blue-700 px-5 py-3 text-sm font-black text-white hover:bg-blue-800"
            >
              View {category} Listings →
            </Link>

            <Link
              href={`/search?q=${encodeURIComponent(item === "All Items" ? category : item)}`}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-black text-slate-800 hover:bg-slate-100"
            >
              Search Selected Item →
            </Link>
          </div>

          <p className="mt-3 text-xs font-medium text-slate-500">
            Now category and item selection are linked. Later this will be
            connected directly with live master data and listing data from the
            portal.
          </p>
        </div>

        <div className="mt-6">
          <h2 className="text-2xl font-black text-slate-950">
            Main Material Prices
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {materials.map((item) => (
              <div
                key={item.name}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="text-3xl">{item.icon}</div>
                <h3 className="mt-3 text-lg font-black text-slate-950">
                  {item.name}
                </h3>
                <div className="mt-2 text-xl font-black text-emerald-700">
                  {item.price}
                </div>
                <div className="mt-3">
                  <TrendBadge trend={item.trend} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-2xl font-black text-slate-950">
            Property Price Trends
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {propertyPrices.map((item) => (
              <div
                key={item.name}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="text-3xl">{item.icon}</div>
                <h3 className="mt-3 text-lg font-black text-slate-950">
                  {item.name}
                </h3>
                <div className="mt-2 text-xl font-black text-blue-700">
                  {item.price}
                </div>
                <div className="mt-3">
                  <TrendBadge trend={item.trend} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="text-xl font-black text-slate-950">
            Discounts & Offers
          </h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
            Manufacturers, distributors, local material suppliers, service
            providers, rental providers, builders and property sellers will be
            able to show limited-period offers here.
          </p>
        </div>
      </section>
    </main>
  );
}