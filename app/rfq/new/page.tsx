// app/rfq/new/page.tsx
"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import AddressEngine, { type AddressEngineValue } from "@/components/geography/AddressEngine";
import { addressEngineToBusinessPayload } from "@/lib/geography/addressAdapters";

type ItemRow = {
  material_name: string;
  qty: string;
  unit: string;
  notes: string;
};

function showPopup(message: string, type: "success" | "error" = "success") {
  if (typeof window === "undefined") return;

  const bg = type === "success" ? "#16a34a" : "#dc2626";
  const div = document.createElement("div");
  div.innerText = message;

  div.style.position = "fixed";
  div.style.top = "20px";
  div.style.right = "20px";
  div.style.zIndex = "9999";
  div.style.padding = "14px 18px";
  div.style.background = bg;
  div.style.color = "#fff";
  div.style.borderRadius = "10px";
  div.style.boxShadow = "0 10px 30px rgba(0,0,0,0.15)";
  div.style.fontWeight = "600";
  div.style.maxWidth = "420px";
  div.style.whiteSpace = "pre-wrap";

  document.body.appendChild(div);
  setTimeout(() => div.remove(), 5000);
}

function safeNum(v: string) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default function RfqNewPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");

  // ✅ This legacy page is “materials RFQ”
  // (Your unified page already supports module selection)
  const module = "materials" as const;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [city, setCity] = useState("");
  const [locality, setLocality] = useState("");
  const [address, setAddress] = useState("");
  const [pincode, setPincode] = useState("");
  const [neededBy, setNeededBy] = useState("");
  const [addressEngineValue, setAddressEngineValue] = useState<AddressEngineValue>({});
  const [aiItems, setAiItems] = useState<any[]>([]);

  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactWhatsapp, setContactWhatsapp] = useState("");

  const [items, setItems] = useState<ItemRow[]>([{ material_name: "", qty: "", unit: "", notes: "" }]);
  const [files, setFiles] = useState<File[]>([]);

  function addItem() {
    setItems((prev) => [...prev, { material_name: "", qty: "", unit: "", notes: "" }]);
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, patch: Partial<ItemRow>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function fail(message: string) {
    setErr(message);
    showPopup(message, "error");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");

    const cleanTitle = title.trim();
    if (!cleanTitle) return fail("Title is required.");

    if (!city.trim() || !locality.trim() || !pincode.trim()) {
      return fail("Location is required: City, Locality and Pincode.");
    }

    const addressPayload = addressEngineToBusinessPayload(addressEngineValue);

    const hasTyped = items.some((x) => x.material_name.trim() !== "");
    const hasFiles = files.length > 0;
    if (!hasTyped && !hasFiles) {
      return fail("Please add at least one item OR upload a handwritten/PDF list.");
    }

    const phone = contactPhone.trim();
    const email = contactEmail.trim();
    const whatsapp = contactWhatsapp.trim();
    if (!phone && !email) {
      return fail("For public submission, please provide phone or email.");
    }

    setLoading(true);
    try {
      // 1) Upload attachments (if any)
      const uploadedAttachments: Array<{
        bucket: string;
        object_path: string;
        file_name: string;
        mime_type: string | null;
        file_size: number | null;
      }> = [];

      if (files.length > 0) {
        const tempFolder = `public-${Date.now()}`;

        for (const f of files) {
          const safeName = f.name.replace(/[^\w.\-() ]+/g, "_");
          const objectPath = `${tempFolder}/${Date.now()}_${safeName}`;

          const up = await supabase.storage.from("rfq_attachments").upload(objectPath, f, {
            cacheControl: "3600",
            upsert: false,
            contentType: f.type || undefined,
          });

          if (up.error) throw up.error;

          uploadedAttachments.push({
            bucket: "rfq_attachments",
            object_path: objectPath,
            file_name: f.name,
            mime_type: f.type || null,
            file_size: f.size || null,
          });
        }
      }

      // 2) Typed items payload (server expects items[].material_name)
      const typed = items
        .map((x, idx) => ({
          material_name: x.material_name.trim(),
          qty: safeNum(x.qty),
          unit: x.unit.trim() || null,
          notes: x.notes.trim() || null,
          sort_order: idx,
        }))
        .filter((x) => x.material_name);

      // 3) Create RFQ via API (bypasses RLS safely)
      const res = await fetch("/api/rfq/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module, // ✅ REQUIRED for rfqs_v2_module_check
          title: cleanTitle,
          description: description.trim() || null,
          city: city.trim(),
          locality: locality.trim(),
          address: address.trim() || null,
          pincode: pincode.trim(),
          geo_state_id: addressPayload.geo_state_id,
          geo_district_id: addressPayload.geo_district_id,
          geo_subdivision_id: addressPayload.geo_subdivision_id,
          geo_block_id: addressPayload.geo_block_id,
          geo_place_id: addressPayload.geo_place_id,
          needed_by: neededBy ? neededBy : null,

          contact_name: contactName.trim() || null,
          contact_phone: phone || null,
          contact_email: email || null,
          contact_whatsapp: whatsapp || null,

          items: typed,
          attachments: uploadedAttachments,
        }),
      });

      const out = await res.json().catch(() => ({} as any));
      if (!res.ok || !out?.ok) throw new Error(out?.error || "RFQ create failed.");

      showPopup(`✅ RFQ submitted successfully!\nRFQ ID: ${out.rfqId}`, "success");

      // redirect after a short moment so user sees popup
      setTimeout(() => router.push("/rfq/success"), 600);
    } catch (e: any) {
      const msg = e?.message || "Something went wrong.";
      setErr(msg);
      showPopup(msg, "error");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container pageBody" style={{ paddingTop: 16 }}>
      <h1 style={{ fontSize: 18, marginBottom: 8 }}>Submit Requirement (RFQ)</h1>
      <div style={{ opacity: 0.8, marginBottom: 16 }}>
        Type your items or upload a handwritten/PDF list. Vendors will send competitive quotations.
      </div>

      {err ? (
        <div
          style={{
            background: "#ffecec",
            border: "1px solid #ffb3b3",
            padding: 12,
            borderRadius: 8,
            marginBottom: 12,
            whiteSpace: "pre-wrap",
          }}
        >
          {err}
        </div>
      ) : null}

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <label>
          <div style={{ fontWeight: 700 }}>Title *</div>
          <input className="searchInput" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>

        <label>
          <div style={{ fontWeight: 700 }}>Description (write clearly)</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brand preference, grade/spec, delivery constraints, payment terms, unloading requirement etc."
            style={{
              width: "100%",
              minHeight: 170,
              fontSize: 16,
              lineHeight: 1.55,
              padding: 12,
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.18)",
              background: "#fff",
              outline: "none",
              resize: "vertical",
            }}
          />
          {aiItems.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>
                🤖 AI Suggested Items
              </div>

              {aiItems.map((it, idx) => (
                <div key={idx} style={{ fontSize: 14 }}>
                  {it.item} — {it.qty} {it.unit}
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop: 10 }}>
            <button
              type="button"
              onClick={async () => {
                const text =
                  (document.querySelector("textarea") as HTMLTextAreaElement)?.value || "";

                if (!text) {
                  alert("Please write your requirement first");
                  return;
                }

                const res = await fetch("/api/ai/rfq-generator", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ text }),
                });

                const data = await res.json();

                if (data?.items?.length) {
                  setAiItems(data.items);
                } else {
                  alert("AI could not generate items");
                }
              }}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                background: "#2563eb",
                color: "#fff",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              ✨ Generate RFQ with AI
            </button>
          </div>

          <button
            type="button"
            onClick={async () => {
              const text = (document.querySelector("textarea") as HTMLTextAreaElement)?.value;

              const res = await fetch("/api/ai/rfq-generator", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text }),
              });

              const data = await res.json();

              if (data?.items?.length) {
                alert("AI generated " + data.items.length + " items");
                console.log(data.items);
              } else {
                alert("AI could not generate items");
              }
            }}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              background: "#2563eb",
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            ✨ AI Generate
          </button>
          </div>
        </label>

        {/* AddressEngine location */}
        <div style={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 12, padding: 12, background: "rgba(11,87,208,0.03)" }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>
            Project / Delivery Location
          </div>

          <AddressEngine
            value={addressEngineValue}
            onChange={(next) => {
              setAddressEngineValue(next);

              const mapped = addressEngineToBusinessPayload(next);

              setCity(mapped.city || "");
              setLocality(mapped.landmark || "");
              setAddress(mapped.formatted_address || "");
              setPincode(mapped.pincode || "");
            }}
          />

          <div style={{ marginTop: 12 }}>
            <label>
              <div style={{ fontWeight: 700 }}>Needed by</div>
              <input
                className="searchInput"
                type="date"
                value={neededBy}
                onChange={(e) => setNeededBy(e.target.value)}
              />
            </label>
          </div>
        </div>

        {/* Typed items */}
        <div style={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 12, padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 10, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 900 }}>Typed items (optional)</div>
              <div style={{ opacity: 0.8, marginTop: 4 }}>You can type freely OR select names from our materials listing.</div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Link className="topBtn topBtnGhost" href="/materials" target="_blank" rel="noreferrer">
                Browse Materials →
              </Link>

              <button type="button" className="topBtn topBtnGhost" onClick={addItem}>
                + Add item
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {items.map((it, idx) => (
              <div key={idx} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 2fr auto", gap: 8 }}>
                <input className="searchInput" value={it.material_name} onChange={(e) => updateItem(idx, { material_name: e.target.value })} placeholder="Material name" />
                <input className="searchInput" value={it.qty} onChange={(e) => updateItem(idx, { qty: e.target.value })} placeholder="Qty" />
                <input className="searchInput" value={it.unit} onChange={(e) => updateItem(idx, { unit: e.target.value })} placeholder="Unit" />
                <input className="searchInput" value={it.notes} onChange={(e) => updateItem(idx, { notes: e.target.value })} placeholder="Notes" />
                <button type="button" className="topBtn topBtnGhost" onClick={() => removeItem(idx)} disabled={items.length === 1}>
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Upload */}
        <div style={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 12, padding: 12 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Upload handwritten list / PDF / images (optional)</div>
          <input type="file" multiple accept=".pdf,image/*" onChange={(e) => setFiles(e.target.files ? Array.from(e.target.files) : [])} />
          <div style={{ opacity: 0.75, marginTop: 6 }}>Tip: take a clear photo of the handwritten list.</div>
        </div>

        {/* Contact */}
        <div style={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 12, padding: 12 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Your Contact (required if not logged in)</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <input className="searchInput" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Name" />
            <input className="searchInput" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="Phone" />
            <input className="searchInput" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="Email" />
          </div>

          <div style={{ marginTop: 12 }}>
            <input className="searchInput" value={contactWhatsapp} onChange={(e) => setContactWhatsapp(e.target.value)} placeholder="WhatsApp number (optional)" />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button className="topBtn topBtnPrimary" type="submit" disabled={loading}>
            {loading ? "Submitting..." : "Submit Requirement →"}
          </button>
          <button className="topBtn topBtnGhost" type="button" onClick={() => router.push("/")}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}