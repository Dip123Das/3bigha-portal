"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import GeoSelector, { type GeoSelection } from "@/components/geography/GeoSelector";
import { SahajLayout } from "@/components/sahaj";

type ModuleChoice = "materials" | "services" | "rentals" | "properties";
type InputMode = "type" | "photo" | "document" | "voice";

const moduleLabels: Record<ModuleChoice, string> = {
  materials: "Materials",
  services: "Services",
  rentals: "Machinery / Rentals",
  properties: "Property",
};

export default function SahajRfqClient() {
  const params = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : ""
  );
  const initialModule = (params.get("module") as ModuleChoice) || null;
  const initialMode = (params.get("mode") as InputMode) || "type";

  const [module, setModule] = useState<ModuleChoice | null>(initialModule);
  const [mode, setMode] = useState<InputMode>(initialMode);
  const [geo, setGeo] = useState<GeoSelection>({});
  const [form, setForm] = useState({
    item: params.get("q") || params.get("query") || "",
    qty: "",
    unit: "",
    neededBy: "",
    notes: "",
    name: "",
    phone: "",
    email: "",
  });
  const [preparing, setPreparing] = useState(false);

  const canSubmit = useMemo(
    () => form.item.trim() && form.qty.trim() && form.unit.trim(),
    [form.item, form.qty, form.unit]
  );

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function submitSimpleRequirement() {
    if (!module) return;

    setPreparing(true);

    window.sessionStorage.setItem(
      "3bos.rfq.handoff.v1",
      JSON.stringify({
        version: 1 as const,
        module,
        mode,
        item: form.item,
        qty: form.qty,
        unit: form.unit,
        neededBy: form.neededBy,
        notes: form.notes,
        name: form.name,
        phone: form.phone,
        email: form.email,
        geo: {
          stateId: geo.state?.id,
          stateName: geo.state?.name,
          districtId: geo.district?.id,
          districtName: geo.district?.name,
          subdivisionId: geo.subdivision?.id,
          subdivisionName: geo.subdivision?.name,
          blockId: geo.block?.id,
          blockName: geo.block?.name,
          placeId: geo.place?.id,
          placeName: geo.place?.name,
          pincode:
            geo.place?.pincode ||
            geo.block?.pincode ||
            geo.subdivision?.pincode ||
            geo.district?.pincode ||
            "",
        },
      })
    );

    window.location.href = "/rfq/review";
  }

  if (!module) {
    return (
      <SahajLayout
        eyebrow=""
        title="Tell us what you need"
        subtitle="Choose the kind of help you need. You can review every detail before sending it."
      >
        <p className="mb-4 text-sm font-black text-emerald-700">Step 1 of 3</p>
        <div className="grid gap-3 md:grid-cols-2">
          {(
            [
              ["materials", "🧱", "I need materials", "Cement, sand, bricks, steel, tiles or paint"],
              ["services", "🛠️", "I need a service", "Electrician, plumber, architect, mason or engineer"],
              ["rentals", "🚜", "I need machinery or equipment", "JCB, mixer, scaffolding, tools or equipment"],
              ["properties", "🏡", "I need property help", "Land, house, flat, project, buying or selling"],
            ] as const
          ).map(([value, icon, title, text]) => (
            <button
              key={value}
              type="button"
              onClick={() => setModule(value)}
              className="rounded-3xl border bg-white p-6 text-left hover:border-emerald-500 hover:bg-emerald-50"
            >
              <div className="text-3xl">{icon}</div>
              <h2 className="mt-3 text-xl font-black">{title}</h2>
              <p className="mt-1 text-sm font-bold text-slate-600">{text}</p>
            </button>
          ))}
        </div>
      </SahajLayout>
    );
  }

  return (
    <SahajLayout eyebrow="" title="" subtitle="">
      <div className="grid gap-5">
        <div className="rounded-3xl bg-emerald-50 p-4">
          <p className="text-sm font-black text-emerald-700">
            Step 2 of 3 · {moduleLabels[module]}
          </p>
          <h1 className="mt-1 text-2xl font-black text-slate-950">
            Tell us what you need
          </h1>
          <p className="mt-1 text-sm font-bold text-slate-600">
            Answer a few simple questions. Nothing is sent until you review and confirm it.
          </p>
        </div>

        <section className="grid gap-3">
          <label className="font-black" htmlFor="rfq-item">What do you need?</label>
          <input
            id="rfq-item"
            className="rounded-2xl border p-4 font-bold"
            placeholder="Example: Cement, electrician, JCB, land survey"
            value={form.item}
            onChange={(event) => update("item", event.target.value)}
          />

          <div className="grid gap-3 md:grid-cols-2">
            <input
              aria-label="Quantity"
              className="rounded-2xl border p-4 font-bold"
              placeholder="Quantity"
              value={form.qty}
              onChange={(event) => update("qty", event.target.value)}
            />
            <input
              aria-label="Unit"
              className="rounded-2xl border p-4 font-bold"
              placeholder="Unit: bags, ton, days, sqft"
              value={form.unit}
              onChange={(event) => update("unit", event.target.value)}
            />
          </div>
        </section>

        <details className="rounded-3xl border p-4">
          <summary className="cursor-pointer font-black">
            Add a photo, document or audio file (optional)
          </summary>
          <p className="mt-2 text-sm font-bold text-slate-600">
            Choose what you plan to add. You will select the actual file on the review page so you can check it before sending.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {(
              [
                ["photo", "📷 Photo or handwritten note"],
                ["document", "📄 PDF, BOQ or drawing"],
                ["voice", "🎤 Existing audio recording"],
              ] as const
            ).map(([value, label]) => (
              <button
                type="button"
                key={value}
                onClick={() => setMode(value)}
                className={`rounded-2xl border p-3 text-left font-black ${
                  mode === value ? "border-emerald-500 bg-emerald-50" : "bg-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </details>

        <section className="rounded-3xl border bg-slate-50 p-4">
          <h2 className="mb-3 text-xl font-black">Delivery or work location</h2>
          <GeoSelector value={geo} onChange={setGeo} />
        </section>

        <section className="grid gap-3">
          <label className="font-black" htmlFor="rfq-needed-by">When do you need it?</label>
          <select
            id="rfq-needed-by"
            className="rounded-2xl border p-4 font-bold"
            value={form.neededBy}
            onChange={(event) => update("neededBy", event.target.value)}
          >
            <option value="">Select timeline</option>
            <option>Today</option>
            <option>Tomorrow</option>
            <option>Within 3 days</option>
            <option>Within 1 week</option>
            <option>Flexible</option>
          </select>

          <textarea
            aria-label="Additional details"
            className="min-h-28 rounded-2xl border p-4 font-bold"
            placeholder="Anything else? Brand preference, delivery instruction, GST, unloading or payment terms"
            value={form.notes}
            onChange={(event) => update("notes", event.target.value)}
          />
        </section>

        <section className="rounded-3xl border p-4">
          <h2 className="font-black">How can businesses contact you?</h2>
          <p className="mt-1 text-sm font-bold text-slate-600">
            If you are not signed in, provide a phone number or email address.
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <input aria-label="Name" className="rounded-2xl border p-4 font-bold" placeholder="Name" value={form.name} onChange={(event) => update("name", event.target.value)} />
            <input aria-label="Phone" className="rounded-2xl border p-4 font-bold" placeholder="Phone" value={form.phone} onChange={(event) => update("phone", event.target.value)} />
            <input aria-label="Email" className="rounded-2xl border p-4 font-bold" placeholder="Email" value={form.email} onChange={(event) => update("email", event.target.value)} />
          </div>
        </section>

        <button
          type="button"
          disabled={!canSubmit || preparing}
          onClick={submitSimpleRequirement}
          className="rounded-2xl bg-emerald-600 px-5 py-4 font-black text-white disabled:opacity-40"
        >
          {preparing ? "Opening review..." : "Review my requirement"}
        </button>

        <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => setModule(null)}
            className="rounded-2xl border px-5 py-3 font-black"
          >
            Change what I need
          </button>
          <Link
            href={`/rfq/new?module=${module}`}
            className="rounded-2xl px-4 py-3 text-center text-sm font-black text-blue-700 underline"
          >
            Need BOQ, budget or technical tools? Open professional tools
          </Link>
        </div>
      </div>
    </SahajLayout>
  );
}
