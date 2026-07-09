"use client";

import { useMemo, useState } from "react";
import GeoSelector, { type GeoSelection } from "@/components/geography/GeoSelector";
import { SahajLayout } from "@/components/sahaj";

type ModuleChoice = "materials" | "services" | "rentals" | "properties";
type InputMode = "type" | "photo" | "document" | "voice" | "guided";

const moduleLabels: Record<ModuleChoice, string> = {
  materials: "Materials",
  services: "Services",
  rentals: "Machinery / Rentals",
  properties: "Property",
};

export default function SahajRfqClient() {
  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const initialModule = (params.get("module") as ModuleChoice) || null;
  const initialMode = (params.get("mode") as InputMode) || null;

  const [module, setModule] = useState<ModuleChoice | null>(initialModule);
  const [mode, setMode] = useState<InputMode | null>(initialMode);
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

  const canSubmit = useMemo(
    () => form.item.trim() && form.qty.trim() && form.unit.trim(),
    [form.item, form.qty, form.unit]
  );

  const [prepared, setPrepared] = useState(false);
  const [preparing, setPreparing] = useState(false);

  function submitSimpleRequirement() {
    setPreparing(true);
    window.setTimeout(() => {
      setPreparing(false);
      setPrepared(true);
    }, 900);
  }

  function update(k: keyof typeof form, v: string) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }


  function openAdvanced() {
    const sp = new URLSearchParams();
    if (module) sp.set("module", module);
    if (mode) sp.set("mode", mode);
    if (form.item) sp.set("query", form.item);
    if (form.qty || form.unit) sp.set("qty", `${form.qty} ${form.unit}`.trim());
    window.location.href = `/rfq/general/new?${sp.toString()}`;
  }

  if (!module) {
    return (
      <SahajLayout
        title="Tell us your requirement"
        subtitle="Choose what you need. 3Bigha will keep the professional RFQ engine behind the scenes."
      >
        <div className="grid gap-3 md:grid-cols-2">
          {([
            ["materials", "🧱", "I need materials", "Cement, sand, bricks, steel, tiles, paint"],
            ["services", "🛠️", "I need a service", "Electrician, plumber, architect, mason, engineer"],
            ["rentals", "🚜", "I need machinery / rentals", "JCB, mixer, scaffolding, tools, equipment"],
            ["properties", "🏡", "I need property help", "Land, house, flat, project, seller or buyer"],
          ] as const).map(([value, icon, title, text]) => (
            <button
              key={value}
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

  if (!mode) {
    return (
      <SahajLayout
        title={`How will you tell us about ${moduleLabels[module]}?`}
        subtitle="Choose the easiest method. You can type, upload, speak, or let 3Bigha guide you."
      >
        <div className="grid gap-3 md:grid-cols-2">
          {([
            ["type", "✍️", "Type it", "Write one line or a full requirement."],
            ["photo", "📷", "Upload handwritten note / photo", "Notebook page, contractor list or product photo."],
            ["document", "📄", "Upload PDF / BOQ / drawing", "PDF, BOQ, Excel, estimate or drawing."],
            ["voice", "🎤", "Speak it", "Describe your need in your own words."],
            ["guided", "🤝", "Help me step by step", "3Bigha will ask simple questions."],
          ] as const).map(([value, icon, title, text]) => (
            <button
              key={value}
              onClick={() => setMode(value)}
              className="rounded-3xl border bg-white p-6 text-left hover:border-emerald-500 hover:bg-emerald-50"
            >
              <div className="text-3xl">{icon}</div>
              <h2 className="mt-3 text-xl font-black">{title}</h2>
              <p className="mt-1 text-sm font-bold text-slate-600">{text}</p>
            </button>
          ))}
        </div>

        <button onClick={() => setModule(null)} className="mt-5 rounded-2xl border px-5 py-3 font-black">
          Back
        </button>
      </SahajLayout>
    );
  }

  return (
    <SahajLayout
      eyebrow=""
      title=""
      subtitle=""
    >
      <div className="grid gap-5">
        <div className="rounded-3xl bg-emerald-50 p-4 font-black text-emerald-800">
          {moduleLabels[module]} · {mode}
        </div>

        <section className="grid gap-3">
          <label className="font-black">What do you need?</label>
          <input
            className="rounded-2xl border p-4 font-bold"
            placeholder="Example: Cement, electrician, JCB, land survey"
            value={form.item}
            onChange={(e) => update("item", e.target.value)}
          />

          <div className="grid gap-3 md:grid-cols-2">
            <input
              className="rounded-2xl border p-4 font-bold"
              placeholder="Quantity"
              value={form.qty}
              onChange={(e) => update("qty", e.target.value)}
            />
            <input
              className="rounded-2xl border p-4 font-bold"
              placeholder="Unit: bags, ton, days, sqft"
              value={form.unit}
              onChange={(e) => update("unit", e.target.value)}
            />
          </div>
        </section>

        {(mode === "photo" || mode === "document" || mode === "voice") && (
          <section className="rounded-3xl border p-4">
            <h2 className="font-black">Upload or record</h2>
            <input
              type="file"
              multiple
              accept={mode === "voice" ? "audio/*" : "image/*,application/pdf,.xls,.xlsx,.csv,.dwg,.dxf"}
              className="mt-3 w-full rounded-2xl border p-3"
            />
            <p className="mt-2 text-xs font-bold text-slate-500">
              You can submit even with a handwritten note or file. AI will prepare the professional version.
            </p>
          </section>
        )}

        <section className="rounded-3xl border bg-slate-50 p-4">
          <h2 className="mb-3 text-xl font-black">Delivery / Work Location</h2>
          <GeoSelector value={geo} onChange={setGeo} />
        </section>

        <section className="grid gap-3">
          <label className="font-black">When do you need it?</label>
          <select
            className="rounded-2xl border p-4 font-bold"
            value={form.neededBy}
            onChange={(e) => update("neededBy", e.target.value)}
          >
            <option value="">Select timeline</option>
            <option>Today</option>
            <option>Tomorrow</option>
            <option>Within 3 days</option>
            <option>Within 1 week</option>
            <option>Flexible</option>
          </select>

          <textarea
            className="min-h-28 rounded-2xl border p-4 font-bold"
            placeholder="Anything else? Brand preference, delivery instruction, GST, unloading, payment terms..."
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
          />
        </section>

        <section className="rounded-3xl border p-4">
          <h2 className="font-black">Contact</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <input className="rounded-2xl border p-4 font-bold" placeholder="Name" value={form.name} onChange={(e) => update("name", e.target.value)} />
            <input className="rounded-2xl border p-4 font-bold" placeholder="Phone" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
            <input className="rounded-2xl border p-4 font-bold" placeholder="Email" value={form.email} onChange={(e) => update("email", e.target.value)} />
          </div>
        </section>

        {prepared ? (
          <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
            <h2 className="text-xl font-black text-emerald-900">✅ Your requirement is ready</h2>
            <p className="mt-2 text-sm font-bold text-emerald-800">
              3Bigha has prepared the professional RFQ in the background.
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <button
                onClick={openAdvanced}
                className="rounded-2xl bg-emerald-600 px-5 py-4 font-black text-white"
              >
                Submit RFQ
              </button>

              <button
                onClick={openAdvanced}
                className="rounded-2xl border bg-white px-5 py-4 font-black"
              >
                Review Professional RFQ
              </button>

              <button
                onClick={() => setPrepared(false)}
                className="rounded-2xl border bg-white px-5 py-4 font-black"
              >
                Edit Requirement
              </button>
            </div>
          </section>
        ) : (
          <button
            disabled={!canSubmit || preparing}
            onClick={submitSimpleRequirement}
            className="rounded-2xl bg-emerald-600 px-5 py-4 font-black text-white disabled:opacity-40"
          >
            {preparing ? "Preparing professional RFQ..." : "Submit Requirement"}
          </button>
        )}

        <details className="rounded-3xl border p-4">
          <summary className="cursor-pointer font-black">Expert mode: Advanced RFQ editor</summary>
          <p className="mt-3 text-sm font-bold text-slate-600">
            Open only if you want procurement AI, budget estimate, technical checks,
            progress score and advanced RFQ tools.
          </p>
          <button onClick={openAdvanced} className="mt-4 rounded-2xl border px-5 py-3 font-black">
            Open advanced RFQ editor
          </button>
        </details>

        <button onClick={() => setMode(null)} className="rounded-2xl border px-5 py-3 font-black">
          Back
        </button>
      </div>
    </SahajLayout>
  );
}
