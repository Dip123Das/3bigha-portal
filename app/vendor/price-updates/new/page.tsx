"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

type UserState = "checking" | "allowed" | "blocked";
type CategoryKey = "Materials" | "Services" | "Rentals" | "Properties";

type MyPriceRow = {
  id: string;
  category: string;
  item: string;
  brand: string | null;
  grade: string | null;
  price_min: number | null;
  price_max: number | null;
  unit: string | null;
  location: string | null;
  trend: string | null;
  offer: string | null;
  offer_start: string | null;
  offer_end: string | null;
  source_type: string | null;
  created_at: string | null;
};

const itemOptions: Record<CategoryKey, string[]> = {
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
  Properties: ["Land", "Flat", "Shop", "Office", "Commercial Space"],
};

const unitSuggestions: Record<CategoryKey, string[]> = {
  Materials: ["bag", "kg", "piece", "tractor", "cft", "sq.ft.", "bundle"],
  Services: ["day", "job", "sq.ft.", "point", "visit", "hour"],
  Rentals: ["hour", "day", "month", "trip", "shift"],
  Properties: ["katha", "sq.ft.", "decimal", "acre", "bigha"],
};

const gradeSuggestions: Record<CategoryKey, string[]> = {
  Materials: [
    "OPC 53",
    "PPC",
    "Fe 500D",
    "Fe 550D",
    "First Class",
    "Standard",
    "Premium",
  ],
  Services: ["Standard", "Skilled", "Expert", "Contract Basis"],
  Rentals: ["Standard", "With Operator", "Without Operator"],
  Properties: ["Residential", "Commercial", "Road Side", "Premium Location"],
};

function formatDate(value: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function AddPricePage() {
  const supabase = getSupabaseBrowser();

  const [userState, setUserState] = useState<UserState>("checking");
  const [userId, setUserId] = useState<string | null>(null);
  const [myPrices, setMyPrices] = useState<MyPriceRow[]>([]);

  const [form, setForm] = useState({
    category: "Materials" as CategoryKey,
    item: "Cement",
    brand: "",
    grade: "",
    price_min: "",
    price_max: "",
    unit: "bag",
    location: "Cooch Behar",
    trend: "Stable",
    offer: "",
    offer_start: "",
    offer_end: "",
    source_type: "vendor",
  });

  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const currentItems = useMemo(() => {
    return itemOptions[form.category] || [];
  }, [form.category]);

  const currentUnits = useMemo(() => {
    return unitSuggestions[form.category] || [];
  }, [form.category]);

  const currentGrades = useMemo(() => {
    return gradeSuggestions[form.category] || [];
  }, [form.category]);

  async function loadMyPrices(nextUserId: string) {
    setListLoading(true);

    const { data, error } = await supabase
      .from("material_price_updates")
      .select(
        "id,category,item,brand,grade,price_min,price_max,unit,location,trend,offer,offer_start,offer_end,source_type,created_at"
      )
      .eq("created_by", nextUserId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!error && data) {
      setMyPrices(data as MyPriceRow[]);
    }

    setListLoading(false);
  }

  useEffect(() => {
    async function checkUser() {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        setUserState("blocked");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role,requested_role,is_vendor,approval_status")
        .eq("id", data.user.id)
        .maybeSingle();

        const role = String(profile?.role || "");
        const requestedRole = String(profile?.requested_role || "");
        const approvalStatus = String(profile?.approval_status || "");

        const allowedRole =
        profile?.is_vendor === true ||
        ["vendor", "builder", "property_owner", "hub_vendor", "master_admin"].includes(role) ||
        ["vendor", "builder", "property_owner", "hub_vendor"].includes(requestedRole);

        const approved =
            ["approved", "active"].includes(approvalStatus) ||
            role === "master_admin";

        if (!allowedRole || !approved) {
        setUserState("blocked");
        return;
        }

        setUserId(data.user.id);
        setUserState("allowed");
        loadMyPrices(data.user.id);
    }

    checkUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;

    if (name === "category") {
      const nextCategory = value as CategoryKey;

      setForm({
        ...form,
        category: nextCategory,
        item: itemOptions[nextCategory][0] || "",
        grade: "",
        unit: unitSuggestions[nextCategory][0] || "",
      });

      return;
    }

    setForm({ ...form, [name]: value });
  }

  async function handleDeletePrice(priceId: string) {
  if (!userId) return;

  const ok = window.confirm("Delete this price update?");
  if (!ok) return;

  const { error } = await supabase
    .from("material_price_updates")
    .delete()
    .eq("id", priceId)
    .eq("created_by", userId);

  if (error) {
    setMsg("❌ Delete failed: " + error.message);
    return;
  }

  setMsg("✅ Price update deleted.");
  loadMyPrices(userId);
}

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!userId) {
      setMsg("❌ Please login first.");
      return;
    }

    const minPrice = Number(form.price_min);
    const maxPrice = Number(form.price_max);

    if (!Number.isFinite(minPrice) || !Number.isFinite(maxPrice)) {
      setMsg("❌ Please enter valid min and max price.");
      return;
    }

    if (maxPrice < minPrice) {
      setMsg("❌ Max price cannot be lower than min price.");
      return;
    }

    setLoading(true);
    setMsg("");

    const { error } = await supabase.from("material_price_updates").insert([
      {
        category: form.category,
        item: form.item.trim(),
        brand: form.brand.trim(),
        grade: form.grade.trim() || "Standard",
        price_min: minPrice,
        price_max: maxPrice,
        unit: form.unit.trim(),
        location: form.location.trim(),
        trend: form.trend,
        offer: form.offer.trim(),
        offer_start: form.offer_start || null,
        offer_end: form.offer_end || null,
        source_type: form.source_type,
        created_by: userId,
      },
    ]);

    if (error) {
      setMsg("❌ Error: " + error.message);
    } else {
      setMsg("✅ Price added successfully. It will now appear in Price Today.");

      setForm({
        category: "Materials",
        item: "Cement",
        brand: "",
        grade: "",
        price_min: "",
        price_max: "",
        unit: "bag",
        location: "Cooch Behar",
        trend: "Stable",
        offer: "",
        offer_start: "",
        offer_end: "",
        source_type: "vendor",
      });

      loadMyPrices(userId);
    }

    setLoading(false);
  }

  if (userState === "checking") {
    return (
      <main className="min-h-screen bg-[#f8faf7] p-6">
        <div className="mx-auto max-w-3xl rounded-3xl bg-white p-6 shadow">
          Checking access...
        </div>
      </main>
    );
  }

  if (userState === "blocked") {
    return (
      <main className="min-h-screen bg-[#f8faf7] p-6">
        <div className="mx-auto max-w-3xl rounded-3xl bg-white p-6 shadow">
          <h1 className="text-2xl font-black">Access Restricted</h1>
            <p className="mt-2 text-sm font-semibold text-slate-600">
            Only approved vendors, builders and property owners can add Price Today updates.
            </p>
          <Link
            href="/login"
            className="mt-4 inline-flex rounded-2xl bg-blue-700 px-5 py-3 text-sm font-black text-white"
          >
            Login →
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8faf7] p-6">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl bg-white p-6 shadow">
          <div className="mb-5">
            <Link
              href="/price-today"
              className="text-sm font-bold text-emerald-700"
            >
              ← Back to Price Today
            </Link>
          </div>

          <h1 className="text-2xl font-black">Add Price Update</h1>
          <p className="mt-2 text-sm font-semibold text-slate-600">
            Select category and item carefully so the price appears correctly in
            Price Today.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              className="rounded-2xl border px-4 py-3 font-bold"
            >
              <option>Materials</option>
              <option>Services</option>
              <option>Rentals</option>
              <option>Properties</option>
            </select>

            <select
              name="item"
              value={form.item}
              onChange={handleChange}
              className="rounded-2xl border px-4 py-3 font-bold"
              required
            >
              {currentItems.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <input
              name="brand"
              placeholder="Brand / Source, e.g. UltraTech, Local Supplier"
              value={form.brand}
              onChange={handleChange}
              className="rounded-2xl border px-4 py-3 font-bold"
            />

            <input
              name="grade"
              list="grade-suggestions"
              placeholder="Grade / Quality, e.g. OPC 53, First Class"
              value={form.grade}
              onChange={handleChange}
              className="rounded-2xl border px-4 py-3 font-bold"
            />
            <datalist id="grade-suggestions">
              {currentGrades.map((grade) => (
                <option key={grade} value={grade} />
              ))}
            </datalist>

            <div className="grid gap-3 sm:grid-cols-2">
              <input
                name="price_min"
                type="number"
                placeholder="Min Price"
                value={form.price_min}
                onChange={handleChange}
                required
                className="rounded-2xl border px-4 py-3 font-bold"
              />

              <input
                name="price_max"
                type="number"
                placeholder="Max Price"
                value={form.price_max}
                onChange={handleChange}
                required
                className="rounded-2xl border px-4 py-3 font-bold"
              />
            </div>

            <select
              name="unit"
              value={form.unit}
              onChange={handleChange}
              className="rounded-2xl border px-4 py-3 font-bold"
              required
            >
              {currentUnits.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>

            <input
              name="location"
              placeholder="Location"
              value={form.location}
              onChange={handleChange}
              required
              className="rounded-2xl border px-4 py-3 font-bold"
            />

            <select
              name="trend"
              value={form.trend}
              onChange={handleChange}
              className="rounded-2xl border px-4 py-3 font-bold"
            >
              <option>Stable</option>
              <option>Up</option>
              <option>Down</option>
            </select>

            <input
              name="offer"
              placeholder="Offer, optional"
              value={form.offer}
              onChange={handleChange}
              className="rounded-2xl border px-4 py-3 font-bold"
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="date"
                name="offer_start"
                value={form.offer_start}
                onChange={handleChange}
                className="rounded-2xl border px-4 py-3 font-bold"
              />

              <input
                type="date"
                name="offer_end"
                value={form.offer_end}
                onChange={handleChange}
                className="rounded-2xl border px-4 py-3 font-bold"
              />
            </div>

            <select
              name="source_type"
              value={form.source_type}
              onChange={handleChange}
              className="rounded-2xl border px-4 py-3 font-bold"
            >
            <option value="vendor">Vendor</option>
            <option value="vendor">Vendor</option>
            <option value="builder">Builder</option>
            <option value="property_owner">Property Owner</option>
            <option value="property_builder">Property Builder</option>
            <option value="hub_vendor">Hub Vendor</option>
            <option value="manufacturer">Manufacturer</option>
            <option value="distributor">Distributor</option>
            </select>

            <button
              type="submit"
              disabled={loading}
              className="rounded-2xl bg-blue-700 py-3 font-black text-white disabled:opacity-60"
            >
              {loading ? "Saving..." : "Add Price"}
            </button>

            {msg ? <p className="text-sm font-bold">{msg}</p> : null}
          </form>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow">
          <h2 className="text-xl font-black">My Latest Price Updates</h2>
          <p className="mt-2 text-sm font-semibold text-slate-600">
            Your latest 20 submitted prices.
          </p>

          <div className="mt-5 grid gap-3">
            {listLoading ? (
              <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-600">
                Loading your prices...
              </div>
            ) : myPrices.length ? (
              myPrices.map((price) => (
                <div
                  key={price.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-black uppercase text-slate-500">
                        {price.category} • {price.location || "No location"}
                      </div>
                      <h3 className="mt-1 text-lg font-black text-slate-950">
                        {price.item}
                      </h3>
                    </div>

                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-700">
                      {price.trend || "Stable"}
                    </span>
                  </div>

                  <div className="mt-2 text-sm font-bold text-slate-700">
                    Brand: {price.brand || "Not given"}
                  </div>
                  <div className="text-sm font-bold text-slate-700">
                    Grade: {price.grade || "Standard"}
                  </div>

                  <div className="mt-3 text-xl font-black text-emerald-700">
                    ₹{price.price_min} - ₹{price.price_max} /{" "}
                    {price.unit || "unit"}
                  </div>

                  <div className="mt-2 text-xs font-bold text-slate-500">
                    Source: {price.source_type || "vendor"} • Added:{" "}
                    {formatDate(price.created_at)}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeletePrice(price.id)}
                    className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-black text-red-700"
                    >
                    Delete Price
                    </button>

                  {price.offer ? (
                    <div className="mt-3 rounded-xl bg-amber-50 p-3 text-xs font-bold text-slate-700">
                      {price.offer}
                      {(price.offer_start || price.offer_end) && (
                        <div className="mt-1 text-slate-500">
                          Offer: {formatDate(price.offer_start)} -{" "}
                          {formatDate(price.offer_end)}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-600">
                No price update submitted yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}