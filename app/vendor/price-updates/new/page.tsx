"use client";

import { useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

export default function AddPricePage() {
  const supabase = getSupabaseBrowser();

  const [form, setForm] = useState({
    category: "Materials",
    item: "",
    brand: "",
    grade: "",
    price_min: "",
    price_max: "",
    unit: "",
    location: "",
    trend: "Stable",
    offer: "",
    offer_start: "",
    offer_end: "",
    source_type: "vendor",
  });

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  function handleChange(e: any) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: any) {
    e.preventDefault();
    setLoading(true);
    setMsg("");

    const { error } = await supabase.from("material_price_updates").insert([
      {
        category: form.category,
        item: form.item,
        brand: form.brand,
        grade: form.grade,
        price_min: Number(form.price_min),
        price_max: Number(form.price_max),
        unit: form.unit,
        location: form.location,
        trend: form.trend,
        offer: form.offer,
        offer_start: form.offer_start || null,
        offer_end: form.offer_end || null,
        source_type: form.source_type,
      },
    ]);

    if (error) {
      setMsg("❌ Error: " + error.message);
    } else {
      setMsg("✅ Price added successfully");
      setForm({
        category: "Materials",
        item: "",
        brand: "",
        grade: "",
        price_min: "",
        price_max: "",
        unit: "",
        location: "",
        trend: "Stable",
        offer: "",
        offer_start: "",
        offer_end: "",
        source_type: "vendor",
      });
    }

    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-[#f8faf7] p-6">
      <div className="mx-auto max-w-3xl bg-white p-6 rounded-3xl shadow">

        <h1 className="text-2xl font-bold mb-4">
          Add Price Update
        </h1>

        <form onSubmit={handleSubmit} className="grid gap-4">

          <select name="category" value={form.category} onChange={handleChange}>
            <option>Materials</option>
            <option>Services</option>
            <option>Rentals</option>
            <option>Properties</option>
          </select>

          <input name="item" placeholder="Item (Cement, Sand...)" value={form.item} onChange={handleChange} required />

          <input name="brand" placeholder="Brand / Source" value={form.brand} onChange={handleChange} />

          <input name="grade" placeholder="Grade / Quality" value={form.grade} onChange={handleChange} />

          <div className="flex gap-3">
            <input name="price_min" placeholder="Min Price" value={form.price_min} onChange={handleChange} required />
            <input name="price_max" placeholder="Max Price" value={form.price_max} onChange={handleChange} required />
          </div>

          <input name="unit" placeholder="Unit (bag / kg / sq.ft)" value={form.unit} onChange={handleChange} required />

          <input name="location" placeholder="Location (District / City)" value={form.location} onChange={handleChange} required />

          <select name="trend" value={form.trend} onChange={handleChange}>
            <option>Stable</option>
            <option>Up</option>
            <option>Down</option>
          </select>

          <input name="offer" placeholder="Offer (optional)" value={form.offer} onChange={handleChange} />

          <div className="flex gap-3">
            <input type="date" name="offer_start" value={form.offer_start} onChange={handleChange} />
            <input type="date" name="offer_end" value={form.offer_end} onChange={handleChange} />
          </div>

          <select name="source_type" value={form.source_type} onChange={handleChange}>
            <option value="manufacturer">Manufacturer</option>
            <option value="distributor">Distributor</option>
            <option value="vendor">Vendor</option>
          </select>

          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white py-3 rounded-xl font-bold"
          >
            {loading ? "Saving..." : "Add Price"}
          </button>

          {msg && <p className="text-sm">{msg}</p>}

        </form>
      </div>
    </main>
  );
}