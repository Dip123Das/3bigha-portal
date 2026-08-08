// app/rfq/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import AddressEngine, { type AddressEngineValue } from "@/components/geography/AddressEngine";
import { addressEngineToBusinessPayload } from "@/lib/geography/addressAdapters";
import {
  clearProcurementPrefillFromBrowser,
  readProcurementPrefillFromBrowser,
} from "@/lib/cost-execution/procurement-linkage";

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
  if (!v.trim()) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default function RfqNewPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [loading, setLoading] = useState(false);
  const [costProcurementHandoffId, setCostProcurementHandoffId] = useState<string | null>(null);
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
  const [aiLoading, setAiLoading] = useState(false);

  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactWhatsapp, setContactWhatsapp] = useState("");

  const [items, setItems] = useState<ItemRow[]>([{ material_name: "", qty: "", unit: "", notes: "" }]);
  const [files, setFiles] = useState<File[]>([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("source") !== "cost_plan") return;

    const handoffId = params.get("handoff");
    const prefill = readProcurementPrefillFromBrowser();
    if (!prefill) return;

    setCostProcurementHandoffId(handoffId);

    if (prefill.title) {
      setTitle(String(prefill.title));
    }
    if (prefill.description) {
      setDescription(String(prefill.description));
    }
    if (Array.isArray(prefill.items) && prefill.items.length > 0) {
      setItems(
        prefill.items.map((item: any) => ({
          material_name: String(item.material_name || ""),
          qty:
            item.qty === null || item.qty === undefined
              ? ""
              : String(item.qty),
          unit: String(item.unit || ""),
          notes: String(item.notes || ""),
        }))
      );
    }
  }, []);

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

  async function prepareSuggestedItems() {
    const text = description.trim();
    if (!text) return fail("Write your requirement details first.");

    setAiLoading(true);
    setErr("");
    try {
      const res = await fetch("/api/ai/rfq-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok || !data?.items?.length) {
        return fail("We could not prepare item suggestions. You can continue without them.");
      }
      setAiItems(data.items);
    } catch {
      fail("We could not prepare item suggestions. You can continue without them.");
    } finally {
      setAiLoading(false);
    }
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
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user && !phone && !email) {
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

      if (costProcurementHandoffId && authData.user?.id) {
        await supabase
          .from("bos_cost_procurement_handoffs")
          .update({
            status: "submitted",
            rfq_id: out.rfqId,
            submitted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", costProcurementHandoffId)
          .eq("user_id", authData.user.id);

        clearProcurementPrefillFromBrowser();
      }

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
      <div className="professionalLayout">
        <main>
          <div
            style={{
              border: "1px solid #bfdbfe",
              background: "linear-gradient(135deg,#eff6ff,#ffffff)",
              borderRadius: 18,
              padding: 16,
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 900, color: "#1d4ed8" }}>
              PROFESSIONAL REQUIREMENT TOOLS
            </div>
            <h1 style={{ fontSize: 26, margin: "6px 0 8px", color: "#0f172a" }}>
              Prepare a detailed requirement
            </h1>
            <div style={{ opacity: 0.85, fontWeight: 700 }}>
              Add item rows, documents and delivery details when your requirement needs
              more precision. You review everything before it is sent.
            </div>
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
          <input className="searchInput professionalFullInput" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Example: Cement and steel for house construction" />
        </label>

        <label>
          <div style={{ fontWeight: 700 }}>Requirement details</div>
          <div>
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
            <div className="suggestedItems">
              <div style={{ fontWeight: 700, marginBottom: 6 }}>
                Suggested items — review before using
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
              onClick={prepareSuggestedItems}
              disabled={aiLoading}
              className="topBtn topBtnGhost"
            >
              {aiLoading ? "Preparing suggestions..." : "Get help preparing item suggestions"}
            </button>
            <div className="assistanceNote">Optional assistance only. Your text is not replaced and you remain in control.</div>
          </div>
          </div>
        </label>

        {/* AddressEngine location */}
        <div style={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 12, padding: 12, background: "rgba(11,87,208,0.03)" }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>
            Delivery or work location
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
              <div style={{ fontWeight: 900 }}>Item details</div>
              <div style={{ opacity: 0.8, marginTop: 4 }}>Add each material, quantity, unit and any important note.</div>
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
              <div key={idx} className="professionalItemRow">
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
          <div style={{ fontWeight: 900, marginBottom: 8 }}>How can businesses contact you?</div>
          <div style={{ opacity: 0.75, marginBottom: 8 }}>Phone or email is needed when you are not signed in.</div>

          <div className="professionalContactRow">
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
            {loading ? "Submitting..." : "Submit requirement →"}
          </button>
          <button className="topBtn topBtnGhost" type="button" onClick={() => router.push("/")}>
            Back
          </button>
        </div>
          </form>
        </main>

        <aside
          style={{
            position: "sticky",
            top: 110,
            border: "1px solid #e2e8f0",
            background: "#ffffff",
            borderRadius: 18,
            padding: 14,
            boxShadow: "0 10px 30px rgba(15,23,42,0.08)",
          }}
        >
          <div style={{ fontWeight: 1000, fontSize: 18, color: "#0f172a" }}>
            Check before sending
          </div>
          <div style={{ marginTop: 4, color: "#64748b", fontWeight: 700, fontSize: 13 }}>
            These optional checks help you prepare clearer information. They never submit or decide for you.
          </div>

          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            <div style={{ border: "1px solid #dbeafe", background: "#eff6ff", borderRadius: 14, padding: 12 }}>
              <b>Requirement readiness</b>
              <div style={{ marginTop: 6, height: 8, background: "#dbeafe", borderRadius: 999, overflow: "hidden" }}>
                <div style={{ width: title && description ? "55%" : "20%", height: "100%", background: "#2563eb" }} />
              </div>
              <div style={{ marginTop: 6, fontSize: 12, fontWeight: 800, color: "#1d4ed8" }}>
                {title && description ? "Core details are present" : "Add a title and details first"}
              </div>
            </div>

            <details style={{ border: "1px solid #e2e8f0", borderRadius: 14, padding: 12 }}>
              <summary style={{ cursor: "pointer", fontWeight: 900 }}>Make the wording clearer</summary>
              <p style={{ color: "#64748b", fontSize: 13, fontWeight: 700 }}>
                Use the optional suggestion button below the description, then review every suggestion yourself.
              </p>
            </details>

            <details style={{ border: "1px solid #e2e8f0", borderRadius: 14, padding: 12 }}>
              <summary style={{ cursor: "pointer", fontWeight: 900 }}>Prepare for a budget estimate</summary>
              <p style={{ color: "#64748b", fontSize: 13, fontWeight: 700 }}>
                Add quantity and item rows to prepare rough budget guidance.
              </p>
            </details>

            <details style={{ border: "1px solid #e2e8f0", borderRadius: 14, padding: 12 }}>
              <summary style={{ cursor: "pointer", fontWeight: 900 }}>Help nearby businesses respond</summary>
              <p style={{ color: "#64748b", fontSize: 13, fontWeight: 700 }}>
                Add LGD location and PIN to identify nearby vendors.
              </p>
            </details>

            <details style={{ border: "1px solid #e2e8f0", borderRadius: 14, padding: 12 }}>
              <summary style={{ cursor: "pointer", fontWeight: 900 }}>Check specifications</summary>
              <p style={{ color: "#64748b", fontSize: 13, fontWeight: 700 }}>
                Mention grade, size, brand, delivery and payment terms for a stronger RFQ.
              </p>
            </details>

            <Link
              href="/rfq"
              style={{
                display: "block",
                textAlign: "center",
                border: "1px solid #bfdbfe",
                borderRadius: 14,
                padding: 12,
                fontWeight: 900,
                color: "#1d4ed8",
                textDecoration: "none",
              }}
            >
              Use the simpler requirement form
            </Link>
          </div>
        </aside>
      </div>

      <style jsx>{`
        .professionalLayout {
          display: grid;
          grid-template-columns: minmax(0, 70%) minmax(280px, 30%);
          gap: 18px;
          align-items: start;
        }
        .professionalFullInput {
          width: 100%;
        }
        .suggestedItems {
          margin-top: 12px;
          padding: 12px;
          border: 1px solid #dbeafe;
          border-radius: 12px;
          background: #f8fbff;
        }
        .assistanceNote {
          margin-top: 6px;
          color: #64748b;
          font-size: 12px;
          font-weight: 700;
        }
        .professionalItemRow {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 2fr auto;
          gap: 8px;
        }
        .professionalContactRow {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 12px;
        }
        @media (max-width: 900px) {
          .professionalLayout {
            grid-template-columns: 1fr !important;
          }
          aside {
            position: static !important;
          }
          .professionalItemRow {
            grid-template-columns: minmax(0, 2fr) minmax(70px, 1fr);
          }
          .professionalItemRow input:nth-of-type(4) {
            grid-column: 1 / -1;
          }
          .professionalContactRow {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 520px) {
          .pageBody {
            padding-left: 10px;
            padding-right: 10px;
          }
          .professionalItemRow {
            grid-template-columns: 1fr 1fr;
          }
          .professionalItemRow input:first-of-type,
          .professionalItemRow input:nth-of-type(4) {
            grid-column: 1 / -1;
          }
        }
      `}</style>
    </div>
  );
}
