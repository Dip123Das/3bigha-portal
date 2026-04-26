"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

type CategoryKey = "Materials" | "Services" | "Rentals" | "Properties";

type ItemOption = {
  label: string;
  source: string;
};

const locations = [
  "Cooch Behar",
  "Siliguri",
  "Jalpaiguri",
  "Alipurduar",
  "Kolkata",
];

const categoryOptions: { label: CategoryKey; href: string }[] = [
  { label: "Materials", href: "/materials" },
  { label: "Services", href: "/services" },
  { label: "Rentals", href: "/rentals" },
  { label: "Properties", href: "/property" },
];

const fallbackItems: Record<CategoryKey, ItemOption[]> = {
  Materials: [
    { label: "Cement", source: "Fallback" },
    { label: "Steel Rod", source: "Fallback" },
    { label: "Sand", source: "Fallback" },
    { label: "Brick", source: "Fallback" },
    { label: "Aggregate", source: "Fallback" },
  ],
  Services: [
    { label: "Mason", source: "Fallback" },
    { label: "Plumber", source: "Fallback" },
    { label: "Electrician", source: "Fallback" },
    { label: "Painter", source: "Fallback" },
  ],
  Rentals: [
    { label: "JCB Rental", source: "Fallback" },
    { label: "Tractor Rental", source: "Fallback" },
    { label: "Mixer Machine Rental", source: "Fallback" },
  ],
  Properties: [
    { label: "Land", source: "Fallback" },
    { label: "Flat", source: "Fallback" },
    { label: "Shop", source: "Fallback" },
    { label: "Office", source: "Fallback" },
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

function uniqueOptions(values: ItemOption[]) {
  const seen = new Set<string>();
  return values.filter((item) => {
    const key = item.label.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function TrendBadge({ trend }: { trend: string }) {
  const label =
    trend === "Up" ? "↑ Up" : trend === "Down" ? "↓ Down" : "→ Stable";

  return (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
      {label}
    </span>
  );
}

export default function PriceTodayClient() {
  const [category, setCategory] = useState<CategoryKey>("Materials");
  const [item, setItem] = useState("All Items");
  const [itemsByCategory, setItemsByCategory] =
    useState<Record<CategoryKey, ItemOption[]>>(fallbackItems);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadDropdownData() {
      setLoading(true);

      const supabase = getSupabaseBrowser();

      const next: Record<CategoryKey, ItemOption[]> = {
        Materials: [],
        Services: [],
        Rentals: [],
        Properties: [],
      };

      const [materialsRes, servicesRes, rentalsRes, propertyTypesRes, propertySubtypesRes] =
        await Promise.allSettled([
          supabase
            .from("material_taxons")
            .select("name,kind,is_active,sort_order")
            .eq("is_active", true)
            .in("kind", ["category", "subcategory", "product_group"])
            .order("sort_order", { ascending: true }),

          supabase
            .from("v_service_listings")
            .select(
              "segment,custom_category,custom_subcategory,custom_service"
            )
            .limit(500),

          supabase
            .from("rental_taxons")
            .select("name,kind,is_active,sort_order")
            .eq("is_active", true)
            .order("sort_order", { ascending: true }),

          supabase.from("property_types").select("name,slug").limit(100),

          supabase.from("property_subtypes").select("name,slug").limit(200),
        ]);

      if (materialsRes.status === "fulfilled" && !materialsRes.value.error) {
        next.Materials = uniqueOptions(
          (materialsRes.value.data || [])
            .map((row: any) => ({
              label: String(row.name || "").trim(),
              source:
                row.kind === "product_group"
                  ? "Material Product Group"
                  : row.kind === "subcategory"
                  ? "Material Subcategory"
                  : "Material Category",
            }))
            .filter((x) => x.label)
        );
      }

      if (servicesRes.status === "fulfilled" && !servicesRes.value.error) {
        const serviceRows = servicesRes.value.data || [];
        next.Services = uniqueOptions(
          serviceRows
            .flatMap((row: any) => [
              row.segment,
              row.custom_category,
              row.custom_subcategory,
              row.custom_service,
            ])
            .map((name: any) => ({
              label: String(name || "").trim(),
              source: "Service Listing",
            }))
            .filter((x) => x.label)
        );
      }

      if (rentalsRes.status === "fulfilled" && !rentalsRes.value.error) {
        next.Rentals = uniqueOptions(
          (rentalsRes.value.data || [])
            .map((row: any) => ({
              label: String(row.name || "").trim(),
              source:
                row.kind === "equipment"
                  ? "Rental Equipment"
                  : row.kind === "subcategory"
                  ? "Rental Subcategory"
                  : "Rental Category",
            }))
            .filter((x) => x.label)
        );
      }

      const propertyItems: ItemOption[] = [];

      if (
        propertyTypesRes.status === "fulfilled" &&
        !propertyTypesRes.value.error
      ) {
        propertyItems.push(
          ...(propertyTypesRes.value.data || []).map((row: any) => ({
            label: String(row.name || "").trim(),
            source: "Property Type",
          }))
        );
      }

      if (
        propertySubtypesRes.status === "fulfilled" &&
        !propertySubtypesRes.value.error
      ) {
        propertyItems.push(
          ...(propertySubtypesRes.value.data || []).map((row: any) => ({
            label: String(row.name || "").trim(),
            source: "Property Subtype",
          }))
        );
      }

      next.Properties = uniqueOptions(propertyItems.filter((x) => x.label));

      if (!mounted) return;

      setItemsByCategory({
        Materials: next.Materials.length ? next.Materials : fallbackItems.Materials,
        Services: next.Services.length ? next.Services : fallbackItems.Services,
        Rentals: next.Rentals.length ? next.Rentals : fallbackItems.Rentals,
        Properties: next.Properties.length
          ? next.Properties
          : fallbackItems.Properties,
      });

      setLoading(false);
    }

    loadDropdownData();

    return () => {
      mounted = false;
    };
  }, []);

  const selectedCategory = categoryOptions.find((cat) => cat.label === category);

  const currentItems = useMemo(() => {
    return itemsByCategory[category] || [];
  }, [category, itemsByCategory]);

  const selectedItemMeta = currentItems.find((x) => x.label === item);
  const listingHref = selectedCategory?.href || "/search";
  const searchText = item === "All Items" ? category : item;

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
                  setCategory(e.target.value as CategoryKey);
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
                {currentItems.map((subItem) => (
                  <option key={`${subItem.source}-${subItem.label}`} value={subItem.label}>
                    {subItem.label}
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
              href={`/search?q=${encodeURIComponent(searchText)}`}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-black text-slate-800 hover:bg-slate-100"
            >
              Search Selected Item →
            </Link>
          </div>

          <p className="mt-3 text-xs font-medium text-slate-500">
            {loading
              ? "Loading live categories from portal data..."
              : selectedItemMeta
              ? `Selected from: ${selectedItemMeta.source}.`
              : "Dropdowns are connected with portal inventory/listing master data where available."}
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