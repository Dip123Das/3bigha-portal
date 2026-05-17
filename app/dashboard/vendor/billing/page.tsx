"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { ActionButton } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

type MaterialRow = {
  id: string;
  title: string | null;
  local_name: string | null;
  attributes: any;
};

type BillRow = {
  id: string;
  bill_no: string;
  bill_type: string;
  customer_name: string | null;
  customer_phone: string | null;
  total_amount: number;
  payment_status: string;
  payment_mode: string | null;
  created_at: string;
};

function asNumber(v: unknown) {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function money(v: number) {
  return `₹ ${Math.round(v).toLocaleString("en-IN")}`;
}

function getInventory(row: MaterialRow) {
  return row.attributes?.inventory && typeof row.attributes.inventory === "object"
    ? row.attributes.inventory
    : null;
}

function getMaterialName(row: MaterialRow) {
  return row.title || row.local_name || "Material";
}

export default function VendorBillingPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [bills, setBills] = useState<BillRow[]>([]);

  const [selectedMaterial, setSelectedMaterial] = useState("");
  const [billType, setBillType] = useState("offline");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [rate, setRate] = useState("");
  const [discount, setDiscount] = useState("");
  const [tax, setTax] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("unpaid");
  const [paymentMode, setPaymentMode] = useState("");
  const [note, setNote] = useState("");

  async function getUserId() {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) throw error;

    if (!session?.user?.id) {
      router.push(`/login?next=${encodeURIComponent("/dashboard/vendor/billing")}`);
      return null;
    }

    return session.user.id;
  }

  async function load() {
    setLoading(true);
    setErr(null);

    try {
      const userId = await getUserId();
      if (!userId) return;

      const [materialRes, billRes] = await Promise.all([
        supabase
          .from("material_listings")
          .select("id,title,local_name,attributes")
          .eq("vendor_user_id", userId)
          .order("created_at", { ascending: false }),

        supabase
          .from("inventory_bills")
          .select("id,bill_no,bill_type,customer_name,customer_phone,total_amount,payment_status,payment_mode,created_at")
          .eq("vendor_user_id", userId)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      if (materialRes.error) throw materialRes.error;
      if (billRes.error) throw billRes.error;

      setMaterials((materialRes.data || []) as MaterialRow[]);
      setBills((billRes.data || []) as BillRow[]);
    } catch (e: any) {
      setErr(e?.message || "Failed to load billing center.");
    } finally {
      setLoading(false);
    }
  }

  async function createBill() {
    if (!selectedMaterial) {
      setErr("Please select a material.");
      return;
    }

    const qty = asNumber(quantity);
    const price = asNumber(rate);
    const discountAmount = asNumber(discount);
    const taxAmount = asNumber(tax);

    if (qty <= 0 || price <= 0) {
      setErr("Quantity and rate must be greater than zero.");
      return;
    }

    setSaving(true);
    setErr(null);

    try {
      const userId = await getUserId();
      if (!userId) return;

      const material = materials.find((m) => m.id === selectedMaterial);
      if (!material) throw new Error("Selected material not found.");

      const inventory = getInventory(material);
      const currentStock = asNumber(inventory?.current_stock);
      const finalUnit = unit.trim() || inventory?.stock_unit || "";

      if (inventory && currentStock < qty) {
        throw new Error(`Insufficient stock. Available: ${currentStock} ${finalUnit}`);
      }

      const subtotal = qty * price;
      const total = Math.max(0, subtotal - discountAmount + taxAmount);
      const billNo = `BILL-${Date.now()}`;

      const billItems = [
        {
          material_listing_id: selectedMaterial,
          material_name: getMaterialName(material),
          quantity: qty,
          unit: finalUnit,
          rate: price,
          amount: subtotal,
        },
      ];

      const { error: billError } = await supabase.from("inventory_bills").insert({
        vendor_user_id: userId,
        bill_no: billNo,
        bill_type: billType,
        customer_name: customerName.trim() || null,
        customer_phone: customerPhone.trim() || null,
        customer_address: customerAddress.trim() || null,
        subtotal,
        discount_amount: discountAmount,
        tax_amount: taxAmount,
        total_amount: total,
        payment_status: paymentStatus,
        payment_mode: paymentMode.trim() || null,
        bill_items: billItems,
        note: note.trim() || null,
        created_by: userId,
      });

      if (billError) throw billError;

      const { error: movementError } = await supabase.from("inventory_stock_movements").insert({
        vendor_user_id: userId,
        material_listing_id: selectedMaterial,
        movement_type: billType === "online" ? "online_order" : "offline_bill",
        quantity: -qty,
        unit: finalUnit,
        unit_price: price,
        total_value: total,
        reference_type: "inventory_bill",
        note: `Stock deducted from ${billNo}`,
        created_by: userId,
      });

      if (movementError) throw movementError;

      if (inventory) {
        const nextStock = Math.max(0, currentStock - qty);

        const { error: updateError } = await supabase
          .from("material_listings")
          .update({
            attributes: {
              ...material.attributes,
              inventory: {
                ...inventory,
                current_stock: String(nextStock),
                last_bill_no: billNo,
                last_stock_out_at: new Date().toISOString(),
              },
            },
          })
          .eq("id", selectedMaterial);

        if (updateError) throw updateError;
      }

      setSelectedMaterial("");
      setBillType("offline");
      setCustomerName("");
      setCustomerPhone("");
      setCustomerAddress("");
      setQuantity("");
      setUnit("");
      setRate("");
      setDiscount("");
      setTax("");
      setPaymentStatus("unpaid");
      setPaymentMode("");
      setNote("");

      await load();
    } catch (e: any) {
      setErr(e?.message || "Failed to create bill.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedInventory = useMemo(() => {
    const material = materials.find((m) => m.id === selectedMaterial);
    return material ? getInventory(material) : null;
  }, [materials, selectedMaterial]);

  useEffect(() => {
    if (!selectedInventory) return;
    if (!unit) setUnit(selectedInventory.stock_unit || "");
    if (!rate) setRate(selectedInventory.selling_price || "");
  }, [selectedInventory, unit, rate]);

  return (
    <main>
      <Container>
        <SectionHeader
          title="Billing Center"
          subtitle="Create offline/online bills and automatically deduct stock from inventory."
        />

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
          <ActionButton href="/dashboard/vendor" variant="secondary">
            ← Vendor Dashboard
          </ActionButton>
          <ActionButton href="/dashboard/vendor/inventory" variant="secondary">
            Inventory
          </ActionButton>
          <ActionButton href="/dashboard/vendor/dispatch" variant="secondary">
            Dispatch
          </ActionButton>
        </div>

        <div
          style={{
            marginBottom: 16,
            borderRadius: 22,
            padding: 16,
            border: "1px solid #fed7aa",
            background: "linear-gradient(135deg, #fff7ed, #ffffff)",
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 950, color: "#9a3412" }}>
            Billing + Stock Deduction Engine
          </div>
          <div style={{ marginTop: 6, fontSize: 13, color: "#475569", fontWeight: 800 }}>
            When a vendor creates a bill, stock is reduced automatically and a stock movement log is created.
          </div>
        </div>

        <Card>
          <CardBody>
            <div style={{ fontSize: 18, fontWeight: 950 }}>Create Bill / Challan</div>

            <div
              style={{
                marginTop: 14,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                gap: 10,
              }}
            >
              <select value={selectedMaterial} onChange={(e) => setSelectedMaterial(e.target.value)} style={inputStyle}>
                <option value="">Select Material</option>
                {materials.map((m) => {
                  const inv = getInventory(m);
                  return (
                    <option key={m.id} value={m.id}>
                      {getMaterialName(m)}
                      {inv?.current_stock ? ` (${inv.current_stock} ${inv.stock_unit || ""})` : ""}
                    </option>
                  );
                })}
              </select>

              <select value={billType} onChange={(e) => setBillType(e.target.value)} style={inputStyle}>
                <option value="offline">Offline Bill</option>
                <option value="online">Online Bill</option>
                <option value="quotation">Quotation</option>
                <option value="delivery_challan">Delivery Challan</option>
                <option value="gst_invoice">GST Invoice</option>
              </select>

              <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Customer name" style={inputStyle} />
              <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="Customer phone" style={inputStyle} />
              <input value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="Quantity" style={inputStyle} />
              <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Unit" style={inputStyle} />
              <input value={rate} onChange={(e) => setRate(e.target.value)} placeholder="Rate" style={inputStyle} />
              <input value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="Discount amount" style={inputStyle} />
              <input value={tax} onChange={(e) => setTax(e.target.value)} placeholder="Tax amount" style={inputStyle} />

              <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} style={inputStyle}>
                <option value="unpaid">Unpaid</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <input value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} placeholder="Payment mode" style={inputStyle} />
            </div>

            <textarea
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
              placeholder="Customer address"
              rows={2}
              style={{ ...inputStyle, width: "100%", resize: "vertical", marginTop: 10 }}
            />

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Bill note"
              rows={2}
              style={{ ...inputStyle, width: "100%", resize: "vertical", marginTop: 10 }}
            />

            {selectedInventory ? (
              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Badge>
                  Available Stock: {selectedInventory.current_stock || 0} {selectedInventory.stock_unit || ""}
                </Badge>
                {selectedInventory.rack_no ? <Badge>Rack: {selectedInventory.rack_no}</Badge> : null}
                {selectedInventory.godown_no ? <Badge>Godown: {selectedInventory.godown_no}</Badge> : null}
              </div>
            ) : null}

            {err ? (
              <div style={{ marginTop: 10, color: "#b91c1c", fontWeight: 900, fontSize: 13 }}>
                {err}
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => void createBill()}
              disabled={saving}
              style={{
                marginTop: 12,
                border: "none",
                borderRadius: 12,
                padding: "10px 14px",
                background: saving ? "#94a3b8" : "#ea580c",
                color: "#fff",
                fontWeight: 950,
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "Creating..." : "Create Bill + Deduct Stock"}
            </button>
          </CardBody>
        </Card>

        <div style={{ marginTop: 14 }}>
          <Card>
            <CardBody>
              <div style={{ fontSize: 18, fontWeight: 950 }}>Recent Bills</div>

              <div style={{ marginTop: 12 }}>
                {loading ? (
                  <EmptyState message="Loading bills…" />
                ) : bills.length === 0 ? (
                  <EmptyState message="No bill created yet." />
                ) : (
                  <div style={{ display: "grid", gap: 10 }}>
                    {bills.map((bill) => (
                      <div
                        key={bill.id}
                        style={{
                          border: "1px solid #e5e7eb",
                          borderRadius: 16,
                          padding: 12,
                          background: "#fff",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                          <div>
                            <div style={{ fontSize: 16, fontWeight: 950 }}>{bill.bill_no}</div>
                            <div style={{ marginTop: 5, display: "flex", gap: 8, flexWrap: "wrap" }}>
                              <Badge>{bill.bill_type.replace(/_/g, " ")}</Badge>
                              <Badge>{bill.payment_status}</Badge>
                              {bill.customer_name ? <Badge>Customer: {bill.customer_name}</Badge> : null}
                              {bill.customer_phone ? <Badge>{bill.customer_phone}</Badge> : null}
                            </div>
                          </div>

                          <div style={{ display: "grid", gap: 8, justifyItems: "flex-end" }}>
                            <div style={{ fontSize: 18, fontWeight: 950, color: "#ea580c" }}>
                              {money(asNumber(bill.total_amount))}
                            </div>

                            <a
                              href={`/api/vendor/billing/${encodeURIComponent(bill.bill_no)}/pdf`}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                borderRadius: 12,
                                background: "#0f172a",
                                color: "#ffffff",
                                padding: "8px 11px",
                                fontSize: 12,
                                fontWeight: 950,
                                textDecoration: "none",
                              }}
                            >
                              View / Download PDF
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      </Container>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(0,0,0,0.14)",
  background: "#fff",
  fontSize: 13,
  fontWeight: 800,
};