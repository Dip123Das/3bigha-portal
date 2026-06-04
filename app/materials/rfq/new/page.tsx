// app/materials/rfq/new/page.tsx
"use client";

import ProjectWorkflowHub from "@/components/project/ProjectWorkflowHub";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import {
  loadVendorListingMemory,
  saveVendorListingMemory,
  type VendorListingMemoryRow,
} from "@/lib/vendors/vendorListingMemory";

import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Card, CardBody, CardFooter } from "@/components/ui/Card";

type Item = {
  item_name: string;
  qty: string;
  unit: string;
  brand_pref: string;
  remarks: string;
};

function safeText(x: any) {
  return String(x ?? "").trim();
}

export default function NewMaterialRFQPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [deliveryDistrict, setDeliveryDistrict] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("");
  const [deliveryPincode, setDeliveryPincode] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");

  const [notes, setNotes] = useState("");

  // Optional: paste URLs (you can later replace with Supabase Storage upload)
  const [fileUrls, setFileUrls] = useState<string>("");

  const [items, setItems] = useState<Item[]>([
    { item_name: "", qty: "", unit: "", brand_pref: "", remarks: "" },
  ]);

  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [recentRFQMemory, setRecentRFQMemory] = useState<
    VendorListingMemoryRow[]
  >([]);


  useState(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) return;

      const rows = await loadVendorListingMemory({
        userId: user.id,
        module: "materials",
        memoryType: "workflow",
        limit: 8,
      });

      setRecentRFQMemory(rows);
    })();
  });

  function updateItem(i: number, patch: Partial<Item>) {
    setItems((prev) => prev.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  }

  function addRow() {
    setItems((prev) => [...prev, { item_name: "", qty: "", unit: "", brand_pref: "", remarks: "" }]);
  }

  function removeRow(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }


  function applyRFQMemory(memory: VendorListingMemoryRow) {
    const payload = memory.payload ?? {};

    setDeliveryDistrict(payload.delivery_district ?? "");
    setDeliveryCity(payload.delivery_city ?? "");
    setDeliveryPincode(payload.delivery_pincode ?? "");
    setDeliveryAddress(payload.delivery_address ?? "");

    setNotes(payload.notes ?? "");

    if (Array.isArray(payload.items) && payload.items.length > 0) {
      setItems(
        payload.items.map((x: any) => ({
          item_name: x.item_name ?? "",
          qty: x.qty != null ? String(x.qty) : "",
          unit: x.unit ?? "",
          brand_pref: x.brand_pref ?? "",
          remarks: x.remarks ?? "",
        }))
      );
    }
  }

  async function submit() {
    setOk(null);
    setErr(null);

    const nm = safeText(name);
    const ph = safeText(phone);
    const em = safeText(email);

    if (!nm) return setErr("Please enter your name.");
    if (!ph && !em) return setErr("Please enter phone or email.");

    const cleaned = items
      .map((x, idx) => ({
        item_name: safeText(x.item_name),
        qty: safeText(x.qty),
        unit: safeText(x.unit),
        brand_pref: safeText(x.brand_pref),
        remarks: safeText(x.remarks),
        sort_order: idx + 1,
      }))
      .filter((x) => x.item_name);

    if (cleaned.length === 0) return setErr("Please add at least 1 item.");

    const urls = safeText(fileUrls)
      .split("\n")
      .map((x) => safeText(x))
      .filter(Boolean);

    setBusy(true);
    try {
      // 1) Create RFQ
      const rfqIns = await supabase
        .from("material_rfqs")
        .insert({
          name: nm,
          phone: ph || null,
          email: em || null,
          delivery_district: safeText(deliveryDistrict) || null,
          delivery_city: safeText(deliveryCity) || null,
          delivery_pincode: safeText(deliveryPincode) || null,
          delivery_address: safeText(deliveryAddress) || null,
          notes: safeText(notes) || null,
          status: "open",
        } as any)
        .select("id")
        .maybeSingle();

      if (rfqIns.error) throw rfqIns.error;
      const rfqId = String(rfqIns.data?.id || "");
      if (!rfqId) throw new Error("RFQ not created.");

      // 2) Insert items
      const itemsPayload = cleaned.map((x) => ({
        rfq_id: rfqId,
        item_name: x.item_name,
        qty: x.qty ? Number(x.qty) : null,
        unit: x.unit || null,
        brand_pref: x.brand_pref || null,
        remarks: x.remarks || null,
        sort_order: x.sort_order,
      }));

      const itemIns = await supabase.from("material_rfq_items").insert(itemsPayload as any);
      if (itemIns.error) throw itemIns.error;

      // 3) Insert files (optional)
      if (urls.length) {
        const filesPayload = urls.map((u) => ({
          rfq_id: rfqId,
          url: u,
          file_type: u.toLowerCase().includes(".pdf") ? "pdf" : "image",
        }));
        const fileIns = await supabase.from("material_rfq_files").insert(filesPayload as any);
        if (fileIns.error) throw fileIns.error;
      }

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user?.id) {
          await saveVendorListingMemory({
            userId: user.id,
            module: "materials",
            memoryType: "workflow",

            title:
              cleaned[0]?.item_name ||
              "Material RFQ",

            payload: {
              delivery_district: safeText(deliveryDistrict),
              delivery_city: safeText(deliveryCity),
              delivery_pincode: safeText(deliveryPincode),
              delivery_address: safeText(deliveryAddress),

              notes: safeText(notes),

              items: cleaned,

              memory_scope: "rfq",
              saved_from: "materials_rfq_page",
              saved_at: new Date().toISOString(),
            },
          });
        }
      } catch (memoryErr) {
        console.error("RFQ memory save failed", memoryErr);
      }

      setOk("✅ Submitted! Vendors will contact you with quotations.");
      setItems([{ item_name: "", qty: "", unit: "", brand_pref: "", remarks: "" }]);
      setFileUrls("");
      setNotes("");

      // Optional: route somewhere
      // router.push("/materials");
    } catch (e: any) {
      setErr(e?.message || "Failed to submit RFQ.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Container>
      <SectionHeader
        title="Request Quotation (Materials)"
        subtitle="Upload your contractor list or type items — vendors will send competitive quotations."
      />

      <div style={{ display: "grid", gap: 14, gridTemplateColumns: "2fr 1fr", alignItems: "start" }}>
        {/* LEFT: Items */}
        <Card>
          <CardBody>
            {recentRFQMemory.length > 0 ? (
              <div
                style={{
                  marginBottom: 14,
                  border: "1px solid #dbeafe",
                  background: "#f8fbff",
                  borderRadius: 12,
                  padding: 10,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    marginBottom: 8,
                    color: "#1d4ed8",
                  }}
                >
                  Recently Used RFQ Setups
                </div>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  {recentRFQMemory.map((memory) => (
                    <button
                      key={memory.id}
                      type="button"
                      onClick={() => applyRFQMemory(memory)}
                      style={{
                        border: "1px solid #bfdbfe",
                        background: "#fff",
                        borderRadius: 999,
                        padding: "8px 12px",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {memory.title}
                    </button>
                  ))}
                </div>

                <div
                  style={{
                    marginTop: 8,
                    fontSize: 11,
                    opacity: 0.72,
                  }}
                >
                  Quickly reuse your previous procurement requirements and delivery setup.
                </div>
              </div>
            ) : null}

            {ok ? (
              <div style={{ padding: 10, borderRadius: 12, background: "#ecfdf5", border: "1px solid #a7f3d0", fontWeight: 900 }}>
                {ok}
              </div>
            ) : null}

            {err ? (
              <div style={{ padding: 10, borderRadius: 12, background: "#fef2f2", border: "1px solid #fecaca", fontWeight: 900, color: "#991b1b" }}>
                {err}
              </div>
            ) : null}

            <div style={{ marginTop: 10, fontWeight: 950 }}>Materials List</div>
            <div style={{ marginTop: 8, display: "grid", gap: 10 }}>
              {items.map((it, i) => (
                <div
                  key={i}
                  style={{
                    border: "1px solid rgba(0,0,0,0.10)",
                    borderRadius: 12,
                    padding: 12,
                    background: "rgba(0,0,0,0.02)",
                  }}
                >
                  <div style={{ display: "grid", gap: 8, gridTemplateColumns: "2fr 1fr 1fr" }}>
                    <input
                      value={it.item_name}
                      onChange={(e) => updateItem(i, { item_name: e.target.value })}
                      placeholder="Item name (e.g., UltraTech Cement 50kg)"
                      style={{ height: 44, borderRadius: 12, border: "1px solid #e5e7eb", padding: "0 12px" }}
                    />
                    <input
                      value={it.qty}
                      onChange={(e) => updateItem(i, { qty: e.target.value })}
                      placeholder="Qty"
                      style={{ height: 44, borderRadius: 12, border: "1px solid #e5e7eb", padding: "0 12px" }}
                    />
                    <input
                      value={it.unit}
                      onChange={(e) => updateItem(i, { unit: e.target.value })}
                      placeholder="Unit (bag/kg/pcs)"
                      style={{ height: 44, borderRadius: 12, border: "1px solid #e5e7eb", padding: "0 12px" }}
                    />
                  </div>

                  <div style={{ marginTop: 8, display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr" }}>
                    <input
                      value={it.brand_pref}
                      onChange={(e) => updateItem(i, { brand_pref: e.target.value })}
                      placeholder="Brand preference (optional)"
                      style={{ height: 44, borderRadius: 12, border: "1px solid #e5e7eb", padding: "0 12px" }}
                    />
                    <input
                      value={it.remarks}
                      onChange={(e) => updateItem(i, { remarks: e.target.value })}
                      placeholder="Remarks (grade/size/specs)"
                      style={{ height: 44, borderRadius: 12, border: "1px solid #e5e7eb", padding: "0 12px" }}
                    />
                  </div>

                  <div style={{ marginTop: 10, display: "flex", gap: 10, justifyContent: "space-between" }}>
                    <div style={{ fontWeight: 800, opacity: 0.75 }}>Item #{i + 1}</div>
                    {items.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => removeRow(i)}
                        style={{
                          height: 36,
                          padding: "0 12px",
                          borderRadius: 10,
                          border: "1px solid #e5e7eb",
                          background: "white",
                          fontWeight: 900,
                          cursor: "pointer",
                        }}
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addRow}
                style={{
                  height: 44,
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  background: "white",
                  fontWeight: 950,
                  cursor: "pointer",
                }}
              >
                + Add another item
              </button>
            </div>
          </CardBody>
        </Card>

        {/* RIGHT: Contact + Delivery */}
        <Card>
          <CardBody>
            <div style={{ fontWeight: 950, marginBottom: 8 }}>Contact</div>

            <label style={{ fontWeight: 800 }}>Your Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} style={{ height: 44, borderRadius: 12, border: "1px solid #e5e7eb", padding: "0 12px", width: "100%" }} />

            <div style={{ height: 8 }} />

            <label style={{ fontWeight: 800 }}>Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} style={{ height: 44, borderRadius: 12, border: "1px solid #e5e7eb", padding: "0 12px", width: "100%" }} />

            <div style={{ height: 8 }} />

            <label style={{ fontWeight: 800 }}>Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} style={{ height: 44, borderRadius: 12, border: "1px solid #e5e7eb", padding: "0 12px", width: "100%" }} />

            <div style={{ height: 14 }} />

            <div style={{ fontWeight: 950, marginBottom: 8 }}>Delivery location</div>

            <input value={deliveryDistrict} onChange={(e) => setDeliveryDistrict(e.target.value)} placeholder="District" style={{ height: 44, borderRadius: 12, border: "1px solid #e5e7eb", padding: "0 12px", width: "100%" }} />
            <div style={{ height: 8 }} />
            <input value={deliveryCity} onChange={(e) => setDeliveryCity(e.target.value)} placeholder="City" style={{ height: 44, borderRadius: 12, border: "1px solid #e5e7eb", padding: "0 12px", width: "100%" }} />
            <div style={{ height: 8 }} />
            <input value={deliveryPincode} onChange={(e) => setDeliveryPincode(e.target.value)} placeholder="Pincode" style={{ height: 44, borderRadius: 12, border: "1px solid #e5e7eb", padding: "0 12px", width: "100%" }} />
            <div style={{ height: 8 }} />
            <textarea value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} placeholder="Delivery address (optional)" style={{ minHeight: 90, borderRadius: 12, border: "1px solid #e5e7eb", padding: 12, width: "100%" }} />

            <div style={{ height: 14 }} />

            <div style={{ fontWeight: 950, marginBottom: 8 }}>Upload list (optional)</div>
            <textarea
              value={fileUrls}
              onChange={(e) => setFileUrls(e.target.value)}
              placeholder="Paste file URLs (one per line). Later we’ll add direct upload."
              style={{ minHeight: 90, borderRadius: 12, border: "1px solid #e5e7eb", padding: 12, width: "100%" }}
            />

            <div style={{ height: 14 }} />

            <div style={{ fontWeight: 950, marginBottom: 8 }}>Notes</div>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any special instruction (grade, delivery date, brand strict/any...)" style={{ minHeight: 90, borderRadius: 12, border: "1px solid #e5e7eb", padding: 12, width: "100%" }} />
          </CardBody>

          <CardFooter>
            <button
              type="button"
              onClick={submit}
              disabled={busy}
              style={{
                width: "100%",
                height: 46,
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                background: busy ? "#6b7280" : "#111827",
                color: "white",
                fontWeight: 950,
                cursor: busy ? "not-allowed" : "pointer",
              }}
            >
              {busy ? "Submitting…" : "Submit to vendors for quotation"}
            </button>

            <button
              type="button"
              onClick={() => router.push("/materials")}
              style={{
                width: "100%",
                height: 44,
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                background: "white",
                fontWeight: 900,
                marginTop: 10,
                cursor: "pointer",
              }}
            >
              Back to Materials
            </button>
          </CardFooter>
        </Card>
      </div>
    </Container>
  );
}