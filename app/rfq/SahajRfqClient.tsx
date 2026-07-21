"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import GeoSelector, { type GeoSelection } from "@/components/geography/GeoSelector";
import { SahajLayout } from "@/components/sahaj";
import { formatAddress } from "@/lib/geography/formatter";

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
  const [exact, setExact] = useState({
    premises: "",
    addressLine: "",
    landmark: "",
    mapLink: "",
    latitude: "",
    longitude: "",
  });
  const [locationMessage, setLocationMessage] = useState("");
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

  const needsMeasurement = module === "materials" || module === "rentals";
  const canSubmit = useMemo(() => {
    if (!form.item.trim()) return false;
    if (needsMeasurement && (!form.qty.trim() || !form.unit.trim())) return false;
    return true;
  }, [form.item, form.qty, form.unit, needsMeasurement]);

  const exactAddress = formatAddress({
    premisesType: exact.premises,
    streetRoadLocality: exact.addressLine,
    landmark: exact.landmark,
    place: geo.place?.name,
    admin2: geo.block?.name,
    admin1: geo.subdivision?.name,
    district: geo.district?.name,
    state: geo.state?.name,
    pincode: geo.place?.pincode || geo.district?.pincode,
  });

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateExact(key: keyof typeof exact, value: string) {
    setExact((current) => ({ ...current, [key]: value }));
    setLocationMessage("");
  }

  function applyCoordinates(latitude: number, longitude: number, message: string) {
    const lat = latitude.toFixed(6);
    const lng = longitude.toFixed(6);
    setExact((current) => ({
      ...current,
      latitude: lat,
      longitude: lng,
      mapLink: `https://www.google.com/maps?q=${lat},${lng}`,
    }));
    setLocationMessage(message);
  }

  function useCurrentLocation() {
    if (!("geolocation" in navigator)) {
      setLocationMessage("Location is not available on this device. You can paste a Google Maps link instead.");
      return;
    }

    setLocationMessage("Checking your current location...");
    navigator.geolocation.getCurrentPosition(
      (position) => applyCoordinates(
        position.coords.latitude,
        position.coords.longitude,
        "Exact point captured. Please open the map and confirm it."
      ),
      () => setLocationMessage("Location permission was not available. You can paste a Google Maps link instead."),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  function applyMapLink() {
    const value = exact.mapLink.trim();
    const match = value.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/) ||
      value.match(/[?&](?:q|query)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);

    if (!match) {
      setLocationMessage("This link does not contain a readable map point. Use a Google Maps link containing coordinates.");
      return;
    }

    const latitude = Number(match[1]);
    const longitude = Number(match[2]);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setLocationMessage("The map coordinates could not be read. Please check the link.");
      return;
    }

    applyCoordinates(latitude, longitude, "Map point added. Please open the map and confirm it.");
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
        exact: {
          premises: exact.premises,
          addressLine: exact.addressLine,
          landmark: exact.landmark,
          formattedAddress: exactAddress,
          mapLink: exact.mapLink,
          latitude: exact.latitude,
          longitude: exact.longitude,
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

        <div className="mt-5 rounded-3xl border border-blue-200 bg-blue-50 p-5">
          <p className="text-sm font-black text-blue-900">
            Need BOQ, item rows, document uploads or technical details?
          </p>
          <p className="mt-1 text-sm font-bold text-slate-600">
            The simple choices above are best for most people. Use professional tools when your requirement needs more detail.
          </p>
          <Link
            href="/rfq/new"
            className="mt-3 inline-flex rounded-2xl border border-blue-300 bg-white px-4 py-3 text-sm font-black text-blue-700"
          >
            Open Professional Requirement Tools →
          </Link>
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
              placeholder={needsMeasurement ? "Quantity" : "Quantity (optional)"}
              value={form.qty}
              onChange={(event) => update("qty", event.target.value)}
            />
            <input
              aria-label="Unit"
              className="rounded-2xl border p-4 font-bold"
              placeholder={needsMeasurement ? "Unit: bags, ton, days, sqft" : "Unit (optional)"}
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

          <details className="mt-4 rounded-2xl border bg-white p-4">
            <summary className="cursor-pointer font-black">
              Add exact address or map point (optional)
            </summary>
            <p className="mt-2 text-sm font-bold text-slate-600">
              LGD remains the official location. These details only help businesses find the exact delivery or work point.
            </p>
            <div className="mt-3 grid gap-3">
              <input
                aria-label="Premises or site type"
                className="rounded-2xl border p-4 font-bold"
                placeholder="House, shop, construction site, land or other place"
                value={exact.premises}
                onChange={(event) => updateExact("premises", event.target.value)}
              />
              <input
                aria-label="Exact address"
                className="rounded-2xl border p-4 font-bold"
                placeholder="House, plot, road, para or locality details"
                value={exact.addressLine}
                onChange={(event) => updateExact("addressLine", event.target.value)}
              />
              <input
                aria-label="Landmark"
                className="rounded-2xl border p-4 font-bold"
                placeholder="Nearby landmark"
                value={exact.landmark}
                onChange={(event) => updateExact("landmark", event.target.value)}
              />
              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <input
                  aria-label="Google Maps link"
                  className="rounded-2xl border p-4 font-bold"
                  placeholder="Paste Google Maps link containing a map point"
                  value={exact.mapLink}
                  onChange={(event) => updateExact("mapLink", event.target.value)}
                />
                <button type="button" onClick={applyMapLink} className="rounded-2xl border px-5 py-3 font-black">
                  Use map link
                </button>
              </div>
              <button type="button" onClick={useCurrentLocation} className="rounded-2xl border px-5 py-3 font-black sm:w-fit">
                Use my current location
              </button>
              {locationMessage ? <p role="status" className="text-sm font-bold text-slate-700">{locationMessage}</p> : null}
              {exactAddress ? (
                <div className="rounded-2xl bg-slate-50 p-3 text-sm font-bold text-slate-700">
                  <strong className="block text-slate-950">Address preview</strong>
                  {exactAddress}
                </div>
              ) : null}
              {exact.latitude && exact.longitude ? (
                <a className="font-black text-blue-700 underline" href={`https://www.google.com/maps?q=${exact.latitude},${exact.longitude}`} target="_blank" rel="noreferrer">
                  Open exact point in Google Maps
                </a>
              ) : null}
            </div>
          </details>
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
