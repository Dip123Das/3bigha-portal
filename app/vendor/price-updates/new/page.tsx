"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

type UserState = "checking" | "allowed" | "blocked";

export default function AddPricePage() {
  const supabase = getSupabaseBrowser();

  const [userState, setUserState] = useState<UserState>("checking");
  const [userId, setUserId] = useState<string | null>(null);

  const [form, setForm] = useState({
    category: "Materials",
    item: "",
    brand: "",
    grade: "",
    price_min: "",
    price_max: "",
    unit: "",
    location: "Cooch Behar",
    trend: "Stable",
    offer: "",
    offer_start: "",
    offer_end: "",
    source_type: "vendor",
  });

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    async function checkUser() {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        setUserState("blocked");
        return;
      }

      setUserId(data.user.id);
      setUserState("allowed");
    }

    checkUser();
  }, [supabase]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!userId) {
      setMsg("❌ Please login first.");
      return;
    }

    setLoading(true);
    setMsg("");

    const { error } = await supabase.from("material_price_updates").insert([
      {
        category: form.category,
        item: form.item.trim(),
        brand: form.brand.trim(),
        grade: form.grade.trim(),
        price_min: Number(form.price_min),
        price_max: Number(form.price_max),
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
        item: "",
        brand: "",
        grade: "",
        price_min: "",
        price_max: "",
        unit: "",
        location: "Cooch Behar",
        trend: "Stable",
        offer: "",
        offer_start: "",
        offer_end: "",
        source_type: "vendor",
      });
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
          <h1 className="text-2xl font-black">Login Required</h1>
          <p className="mt-2 text-sm font-semibold text-slate-600">
            Please login before adding price updates.
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
      <div className="mx-auto max-w-3xl rounded-3xl bg-white p-6 shadow">
        <div className="mb-5">
          <Link href="/price-today" className="text-sm font-bold text-emerald-700">
            ← Back to Price Today
          </Link>
        </div>

        <h1 className="text-2xl font-black">Add Price Update</h1>
        <p className="mt-2 text-sm font-semibold text-slate-600">
          Add today’s price by category, item, brand/source, grade and location.
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

          <input
            name="item"
            placeholder="Item, e.g. Cement, Sand, Land"
            value={form.item}
            onChange={handleChange}
            required
            className="rounded-2xl border px-4 py-3 font-bold"
          />

          <input
            name="brand"
            placeholder="Brand / Source, e.g. UltraTech, Local Supplier"
            value={form.brand}
            onChange={handleChange}
            className="rounded-2xl border px-4 py-3 font-bold"
          />

          <input
            name="grade"
            placeholder="Grade / Quality, e.g. OPC 53, First Class"
            value={form.grade}
            onChange={handleChange}
            className="rounded-2xl border px-4 py-3 font-bold"
          />

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

          <input
            name="unit"
            placeholder="Unit, e.g. bag / kg / sq.ft / katha"
            value={form.unit}
            onChange={handleChange}
            required
            className="rounded-2xl border px-4 py-3 font-bold"
          />

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
            <option value="manufacturer">Manufacturer</option>
            <option value="distributor">Distributor</option>
            <option value="vendor">Vendor</option>
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
    </main>
  );
}