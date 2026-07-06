"use client";

import { useMemo, useState } from "react";
import GeoSelector, { type GeoSelection } from "@/components/geography/GeoSelector";

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export default function SahajRfqClient() {
  const [step, setStep] = useState<Step>(1);
  const [geo, setGeo] = useState<GeoSelection>({});
  const [form, setForm] = useState({
    need: "",
    quantity: "",
    unit: "",
    lat: "",
    lng: "",
    house: "",
    road: "",
    landmark: "",
    gate: "",
    floor: "",
    instructions: "",
    notes: "",
  });

  const mapUrl = useMemo(() => {
    if (!form.lat || !form.lng) return "";
    return `https://maps.google.com/maps?q=${form.lat},${form.lng}&z=17&output=embed`;
  }, [form.lat, form.lng]);

  function update(name: string, value: string) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      alert("Location is not supported on this device. Please enter latitude and longitude manually.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        update("lat", String(pos.coords.latitude));
        update("lng", String(pos.coords.longitude));
      },
      () => {
        alert("Could not get your location. Please allow location access or enter latitude and longitude manually.");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }

  const canStep1 = form.need.trim() && form.quantity.trim() && form.unit.trim();

  return (
    <main className="w-full px-4 py-6">
      <section className="mx-auto max-w-5xl rounded-3xl border bg-white p-5 shadow-sm">
        <p className="text-sm font-black text-emerald-700">Project SAHAJ</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">
          Create a Request
        </h1>
        <p className="mt-2 text-slate-600">
          Tell us in simple words. 3Bigha will prepare the professional RFQ quietly in the background.
        </p>
      </section>

      <section className="mx-auto mt-5 max-w-5xl rounded-3xl border bg-white p-5">
        <div className="mb-5 flex flex-wrap gap-2 text-xs font-black">
          {["Need", "Location", "Map", "Address", "Uploads", "AI Review", "Submit"].map((x, i) => (
            <span
              key={x}
              className={`rounded-full px-3 py-2 ${
                step === i + 1 ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              {i + 1}. {x}
            </span>
          ))}
        </div>

        {step === 1 && (
          <div className="grid gap-4">
            <h2 className="text-2xl font-black">What do you need?</h2>
            <input className="rounded-2xl border p-4 text-lg font-bold" placeholder="Example: 100 bags cement" value={form.need} onChange={(e) => update("need", e.target.value)} />
            <div className="grid gap-4 md:grid-cols-2">
              <input className="rounded-2xl border p-4 font-bold" placeholder="Quantity" value={form.quantity} onChange={(e) => update("quantity", e.target.value)} />
              <input className="rounded-2xl border p-4 font-bold" placeholder="Unit: bags, ton, cft, sqft..." value={form.unit} onChange={(e) => update("unit", e.target.value)} />
            </div>
            <button disabled={!canStep1} onClick={() => setStep(2)} className="rounded-2xl bg-emerald-600 px-5 py-4 font-black text-white disabled:opacity-40">Next: Delivery Location</button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-2xl font-black">Select official delivery location</h2>
            <GeoSelector value={geo} onChange={setGeo} />
            <div className="mt-5 flex gap-3">
              <button onClick={() => setStep(1)} className="rounded-2xl border px-5 py-3 font-black">Back</button>
              <button onClick={() => setStep(3)} className="rounded-2xl bg-emerald-600 px-5 py-3 font-black text-white">Next: Exact Map Point</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="grid gap-4">
            <h2 className="text-2xl font-black">Exact delivery point</h2>
            <button onClick={useCurrentLocation} className="rounded-2xl bg-slate-950 px-5 py-4 font-black text-white">Use my current location</button>
            <a
              href="https://www.google.com/maps"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-2xl border px-5 py-4 text-center font-black"
            >
              Open Google Maps and copy location
            </a>
            <div className="grid gap-4 md:grid-cols-2">
              <input className="rounded-2xl border p-4 font-bold" placeholder="Latitude" value={form.lat} onChange={(e) => update("lat", e.target.value)} />
              <input className="rounded-2xl border p-4 font-bold" placeholder="Longitude" value={form.lng} onChange={(e) => update("lng", e.target.value)} />
            </div>
            {mapUrl ? <iframe className="h-80 w-full rounded-3xl border" src={mapUrl} loading="lazy" /> : <div className="rounded-3xl border bg-slate-50 p-8 text-center font-bold text-slate-500">Map will appear after location is selected.</div>}
            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="rounded-2xl border px-5 py-3 font-black">Back</button>
              <button onClick={() => setStep(4)} className="rounded-2xl bg-emerald-600 px-5 py-3 font-black text-white">Next: Address Details</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="grid gap-4">
            <h2 className="text-2xl font-black">Delivery address</h2>
            {["house", "road", "landmark", "gate", "floor", "instructions"].map((field) => (
              <input key={field} className="rounded-2xl border p-4 font-bold" placeholder={field.replace(/^\w/, c => c.toUpperCase())} value={(form as any)[field]} onChange={(e) => update(field, e.target.value)} />
            ))}
            <div className="flex gap-3">
              <button onClick={() => setStep(3)} className="rounded-2xl border px-5 py-3 font-black">Back</button>
              <button onClick={() => setStep(5)} className="rounded-2xl bg-emerald-600 px-5 py-3 font-black text-white">Next: Uploads</button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="grid gap-4">
            <h2 className="text-2xl font-black">Optional uploads</h2>
            <input type="file" multiple className="rounded-2xl border p-4" accept="image/*,video/*,audio/*,.pdf,.dwg" />
            <textarea className="rounded-2xl border p-4 font-bold" placeholder="Any extra notes?" value={form.notes} onChange={(e) => update("notes", e.target.value)} />
            <div className="flex gap-3">
              <button onClick={() => setStep(4)} className="rounded-2xl border px-5 py-3 font-black">Back</button>
              <button onClick={() => setStep(6)} className="rounded-2xl bg-emerald-600 px-5 py-3 font-black text-white">Next: AI Review</button>
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="grid gap-4">
            <h2 className="text-2xl font-black">Review professional RFQ</h2>
            <p className="rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-800">
              We’ve prepared a professional version for you. Please review before submitting.
            </p>
            <details className="rounded-2xl border p-4">
              <summary className="cursor-pointer font-black">Advanced AI assistance</summary>
              <div className="mt-4 grid gap-3 text-sm font-bold text-slate-600">
                <p>Improve RFQ wording</p>
                <p>Add commercial terms</p>
                <p>Suggest brands and specifications</p>
                <p>Estimate market pricing</p>
                <p>Recommend nearby vendors</p>
              </div>
            </details>
            <div className="rounded-2xl border bg-slate-50 p-4">
              <b>{form.need}</b> — {form.quantity} {form.unit}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(5)} className="rounded-2xl border px-5 py-3 font-black">Back</button>
              <button onClick={() => setStep(7)} className="rounded-2xl bg-emerald-600 px-5 py-3 font-black text-white">Ready to Submit</button>
            </div>
          </div>
        )}

        {step === 7 && (
          <div className="grid gap-4 text-center">
            <h2 className="text-2xl font-black">Submit RFQ</h2>
            <p className="text-slate-600">Frontend SAHAJ flow is ready. Backend submit wiring can now be connected to the existing RFQ APIs without changing database architecture.</p>
            <button className="rounded-2xl bg-slate-950 px-5 py-4 font-black text-white">Submit RFQ</button>
          </div>
        )}
      </section>
    </main>
  );
}
