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
import {
  ErpActionCard,
  ErpActionGrid,
  ErpActivityFeed,
  ErpAlertList,
  ErpKpiCard,
  ErpKpiGrid,
  ErpPanel,
} from "@/components/vendor-erp/VendorErpWidgets";
import VendorWorkMenu from "@/components/vendor-erp/VendorWorkMenu";

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

type BillingLineItem = {
  id: string;
  itemType: string;
  sourceId: string;
  itemName: string;
  quantity: string;
  unit: string;
  rate: string;
  discount: string;
  tax: string;
};

type RentalAssetRow = {
  id: string;
  asset_name: string;
  asset_code: string | null;
  daily_rate: number | null;
  hourly_rate: number | null;
  weekly_rate: number | null;
  monthly_rate: number | null;
};

type ServiceWorkOrderRow = {
  id: string;
  service_title: string;
  estimated_amount: number | null;
  customer_name: string | null;
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
  const [rentalAssets, setRentalAssets] = useState<RentalAssetRow[]>([]);
  const [serviceWorkOrders, setServiceWorkOrders] = useState<ServiceWorkOrderRow[]>([]);
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

  const [lineItems, setLineItems] = useState<BillingLineItem[]>([
    {
      id: crypto.randomUUID(),
      itemType: "inventory",
      sourceId: "",
      itemName: "",
      quantity: "",
      unit: "",
      rate: "",
      discount: "",
      tax: "",
    },
  ]);

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

      const [materialRes, rentalAssetRes, serviceWorkOrderRes, billRes] = await Promise.all([
        supabase
          .from("material_listings")
          .select("id,title,local_name,attributes")
          .eq("vendor_user_id", userId)
          .order("created_at", { ascending: false }),

        supabase
          .from("rental_assets")
          .select("id,asset_name,asset_code,daily_rate,hourly_rate,weekly_rate,monthly_rate")
          .eq("vendor_user_id", userId)
          .order("created_at", { ascending: false }),

        supabase
          .from("service_work_orders")
          .select("id,service_title,estimated_amount,customer_name")
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
      if (rentalAssetRes.error) throw rentalAssetRes.error;
      if (serviceWorkOrderRes.error) throw serviceWorkOrderRes.error;
      if (billRes.error) throw billRes.error;

      setMaterials((materialRes.data || []) as MaterialRow[]);
      setRentalAssets((rentalAssetRes.data || []) as RentalAssetRow[]);
      setServiceWorkOrders((serviceWorkOrderRes.data || []) as ServiceWorkOrderRow[]);
      setBills((billRes.data || []) as BillRow[]);
    } catch (e: any) {
      setErr(e?.message || "Failed to load billing center.");
    } finally {
      setLoading(false);
    }
  }


  function addLineItem() {
    setLineItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        itemType: "manual",
        sourceId: "",
        itemName: "",
        quantity: "",
        unit: "",
        rate: "",
        discount: "",
        tax: "",
      },
    ]);
  }

  function removeLineItem(id: string) {
    setLineItems((prev) => prev.filter((item) => item.id !== id));
  }

  function updateLineItem(
    id: string,
    field: keyof BillingLineItem,
    value: string
  ) {
    setLineItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  }



  function applyOperationalSource(
    lineId: string,
    sourceId: string
  ) {
    const currentItem = lineItems.find((item) => item.id === lineId);
    if (!currentItem) return;

    if (currentItem.itemType === "inventory") {
      const material = materials.find((m) => m.id === sourceId);
      if (!material) return;

      const inventory = getInventory(material);

      setLineItems((prev) =>
        prev.map((item) =>
          item.id === lineId
            ? {
                ...item,
                sourceId,
                itemName: getMaterialName(material),
                unit: inventory?.stock_unit || item.unit,
                rate: inventory?.selling_price || item.rate,
              }
            : item
        )
      );

      return;
    }

    if (currentItem.itemType === "rental") {
      const asset = rentalAssets.find((a) => a.id === sourceId);
      if (!asset) return;

      setLineItems((prev) =>
        prev.map((item) =>
          item.id === lineId
            ? {
                ...item,
                sourceId,
                itemName: asset.asset_name,
                unit: item.unit || "day",
                rate: String(asset.daily_rate || asset.hourly_rate || asset.weekly_rate || asset.monthly_rate || ""),
              }
            : item
        )
      );

      return;
    }

    if (currentItem.itemType === "service") {
      const workOrder = serviceWorkOrders.find((w) => w.id === sourceId);
      if (!workOrder) return;

      setLineItems((prev) =>
        prev.map((item) =>
          item.id === lineId
            ? {
                ...item,
                sourceId,
                itemName: workOrder.service_title,
                unit: item.unit || "job",
                rate: String(workOrder.estimated_amount || ""),
              }
            : item
        )
      );
    }
  }

  async function createBill() {

    const validItems = lineItems.filter(
      (item) =>
        item.itemName.trim() &&
        Number(item.quantity || 0) > 0 &&
        Number(item.rate || 0) > 0
    );

    if (!validItems.length) {
      setErr("Please add at least one valid billing item.");
      return;
    }

    setSaving(true);
    setErr(null);

    try {
      const userId = await getUserId();
      if (!userId) return;

      const billNo = `BILL-${Date.now()}`;

      const normalizedItems = validItems.map((item) => {
        const qty = asNumber(item.quantity);
        const rateValue = asNumber(item.rate);
        const discountValue = asNumber(item.discount);
        const taxValue = asNumber(item.tax);

        const subtotal = qty * rateValue;

        const lineTotal =
          subtotal - discountValue + taxValue;

        return {
          item_type: item.itemType,
          source_id: item.sourceId || null,
          item_name: item.itemName.trim(),
          quantity: qty,
          unit: item.unit.trim(),
          rate: rateValue,
          discount_amount: discountValue,
          tax_amount: taxValue,
          line_total: lineTotal,
        };
      });

      const subtotal = normalizedItems.reduce(
        (sum, item) => sum + item.line_total,
        0
      );

      const total = Math.max(0, subtotal);

      const { data: billData, error: billError } =
        await supabase
          .from("inventory_bills")
          .insert({
            vendor_user_id: userId,
            bill_no: billNo,
            bill_type: billType,
            customer_name: customerName.trim() || null,
            customer_phone: customerPhone.trim() || null,
            customer_address: customerAddress.trim() || null,
            subtotal,
            discount_amount: 0,
            tax_amount: 0,
            total_amount: total,
            payment_status: paymentStatus,
            payment_mode: paymentMode.trim() || null,
            note: note.trim() || null,
            bill_items: normalizedItems,
          })
          .select("id")
          .single();

      if (billError) throw billError;

      const billId = billData.id;

      const detailedItems = normalizedItems.map((item) => ({
        bill_id: billId,
        vendor_user_id: userId,
        item_type: item.item_type,
        inventory_entity_id: item.item_type === "inventory" ? item.source_id : null,
        item_name: item.item_name,
        quantity: item.quantity,
        unit: item.unit,
        rate: item.rate,
        discount_amount: item.discount_amount,
        tax_amount: item.tax_amount,
        line_total: item.line_total,
      }));

      const { error: itemError } =
        await supabase
          .from("inventory_bill_items")
          .insert(detailedItems);

      if (itemError) throw itemError;
      const inventoryItems = normalizedItems.filter(
        (item) => item.item_type === "inventory" && item.source_id
      );

      for (let index = 0; index < inventoryItems.length; index += 1) {
        const item = inventoryItems[index];

        const { error: stockError } = await supabase.rpc(
          "post_bos_material_inventory_transaction",
          {
            target_material_listing_id: item.source_id,
            target_transaction_type: "sale",
            target_quantity: item.quantity,
            target_unit: item.unit || null,
            target_unit_cost: null,
            target_source_module: "billing",
            target_source_reference_type: "inventory_bill",
            target_source_reference_id: String(billId),
            target_idempotency_key:
              `billing-sale:${billId}:${item.source_id}:${index}`,
            target_note: `ERP billing ${billNo}`,
            target_metadata: {
              bill_no: billNo,
              bill_type: billType,
              item_name: item.item_name,
              selling_rate: item.rate,
            },
          }
        );

        if (stockError) throw stockError;
      }

      await supabase
        .from("customer_ledgers")
        .insert({
          vendor_user_id: userId,
          customer_name: customerName.trim() || "Walk-in Customer",
          customer_phone: customerPhone.trim() || null,
          customer_address: customerAddress.trim() || null,
          reference_type: "invoice",
          reference_id: billId,
          debit_amount: total,
          credit_amount: 0,
          balance_amount: total,
          payment_status: paymentStatus,
          notes: `ERP Invoice ${billNo}`,
        });

      await supabase
        .from("operational_events")
        .insert({
          vendor_user_id: userId,
          event_type: "bill_created",
          module: "billing",
          title: "ERP Invoice Created",
          description: `${billNo} generated successfully`,
          reference_type: "invoice",
          reference_id: billId,
        });

      setSelectedMaterial("");
      setCustomerName("");
      setCustomerPhone("");
      setCustomerAddress("");
      setQuantity("");
      setUnit("");
      setRate("");
      setDiscount("");
      setTax("");
      setPaymentMode("");
      setNote("");

      setLineItems([
        {
          id: crypto.randomUUID(),
          itemType: "inventory",
          sourceId: "",
          itemName: "",
          quantity: "",
          unit: "",
          rate: "",
          discount: "",
          tax: "",
        },
      ]);

      await load();

    } catch (e: any) {
      setErr(e?.message || "Failed to create ERP invoice.");
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


  const billingCartTotals = useMemo(() => {
    const subtotal = lineItems.reduce((sum, item) => {
      return sum + asNumber(item.quantity) * asNumber(item.rate);
    }, 0);

    const discountAmount = lineItems.reduce((sum, item) => {
      return sum + asNumber(item.discount);
    }, 0);

    const taxAmount = lineItems.reduce((sum, item) => {
      return sum + asNumber(item.tax);
    }, 0);

    const grandTotal = Math.max(0, subtotal - discountAmount + taxAmount);

    return {
      subtotal,
      discountAmount,
      taxAmount,
      grandTotal,
    };
  }, [lineItems]);

  const billingStats = useMemo(() => {
    const totalBilling = bills.reduce((sum, bill) => sum + asNumber(bill.total_amount), 0);
    const paidBilling = bills
      .filter((bill) => bill.payment_status === "paid")
      .reduce((sum, bill) => sum + asNumber(bill.total_amount), 0);
    const pendingBilling = Math.max(0, totalBilling - paidBilling);

    return {
      totalBills: bills.length,
      totalBilling,
      paidBilling,
      pendingBilling,
      unpaidBills: bills.filter((bill) => bill.payment_status !== "paid").length,
    };
  }, [bills]);

  return (
    <main>
      <Container>
        <SectionHeader
          title="Billing"
          subtitle="Create bills easily and update stock automatically."
        />

        <VendorWorkMenu />

        <div style={{ maxWidth: "100%", overflowX: "hidden", display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
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

        <ErpPanel
          title="Billing Overview"
          subtitle="When a vendor creates a bill, stock is reduced automatically and a stock movement log is created."
          tone="orange"
        >
          <ErpKpiGrid>
            <ErpKpiCard label="Total Bills" value={billingStats.totalBills} helper="Recent billing records" tone="orange" />
            <ErpKpiCard label="Total Billing" value={money(billingStats.totalBilling)} helper="Total billing value" tone="violet" />
            <ErpKpiCard label="Paid Amount" value={money(billingStats.paidBilling)} helper="Collected billing value" tone="green" />
            <ErpKpiCard label="Pending Amount" value={money(billingStats.pendingBilling)} helper="Pending payment amount" tone="red" />
            <ErpKpiCard label="Unpaid Bills" value={billingStats.unpaidBills} helper="Bills awaiting payment" tone="slate" />
          </ErpKpiGrid>
        </ErpPanel>

                <ErpPanel
          title="Billing Actions"
          subtitle="Manage invoices, payments and customer billing work."
          tone="orange"
        >
          <ErpActionGrid>
            <ErpActionCard
              title="Create Invoice"
              description="Create invoice from stock items."
              href="/dashboard/vendor/billing"
              tone="orange"
            />

            <ErpActionCard
              title="Dispatch Linked Billing"
              description="Connect invoice with delivery work."
              href="/dashboard/vendor/dispatch"
              tone="blue"
            />

            <ErpActionCard
              title="Fleet Delivery Billing"
              description="Link invoice with vehicle delivery."
              href="/dashboard/vendor/fleet"
              tone="violet"
            />

            <ErpActionCard
              title="Billing Suggestions"
              description="Review unpaid bills and pending payments."
              href="/dashboard/vendor/inventory-intelligence"
              tone="green"
            />
          </ErpActionGrid>

          <ErpAlertList
            alerts={[
              {
                label: `${billingStats.unpaidBills} invoices remain unpaid and require collection follow-up.`,
                tone: "red",
              },
              {
                label: `Pending collection value is ${money(billingStats.pendingBilling)}.`,
                tone: "orange",
              },
              {
                label: `Billing updates stock automatically.`,
                tone: "green",
              },
            ]}
          />
          <ErpActivityFeed
            title="Billing Activity Timeline"
            items={[
              {
                label: "Billing analytics reviewed invoice records.",
                meta: `${billingStats.totalBills} bills scanned`,
                tone: "blue",
              },
              {
                label: "Pending collection watch is active.",
                meta: `${money(billingStats.pendingBilling)} pending`,
                tone: "orange",
              },
              {
                label: "Paid billing value calculated.",
                meta: `${money(billingStats.paidBilling)} collected`,
                tone: "green",
              },
            ]}
          />
        </ErpPanel>

        <Card>
          <CardBody>
            <div style={{ maxWidth: "100%", overflowX: "hidden", fontSize: 18, fontWeight: 950 }}>Create Bill / Challan</div>

            <div
              style={{ maxWidth: "100%", overflowX: "hidden", marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10 }}
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


            <div
              style={{ maxWidth: "100%", overflowX: "hidden", marginTop: 14, border: "1px solid #e5e7eb", borderRadius: 16, padding: 14, background: "#f8fafc" }}
            >
              <div
                style={{ maxWidth: "100%", overflowX: "hidden", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}
              >
                <div style={{ maxWidth: "100%", overflowX: "hidden", fontSize: 16, fontWeight: 950 }}>
                  ERP Billing Line Items
                </div>

                <button
                  type="button"
                  onClick={addLineItem}
                  style={{ maxWidth: "100%", overflowX: "hidden", border: "none", borderRadius: 10, padding: "8px 12px", background: "#0f172a", color: "#fff", fontWeight: 900, cursor: "pointer" }}
                >
                  + Add Item
                </button>
              </div>

              <div style={{ maxWidth: "100%", overflowX: "hidden", display: "grid", gap: 12 }}>
                {lineItems.map((item, index) => (
                  <div
                    key={item.id}
                    style={{ maxWidth: "100%", overflowX: "hidden", border: "1px solid #dbeafe", borderRadius: 14, padding: 12, background: "#fff" }}
                  >
                    <div
                      style={{ maxWidth: "100%", overflowX: "hidden", display: "flex", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 10 }}
                    >
                      <div style={{ maxWidth: "100%", overflowX: "hidden", fontWeight: 900 }}>
                        Line Item #{index + 1}
                      </div>

                      {lineItems.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => removeLineItem(item.id)}
                          style={{ maxWidth: "100%", overflowX: "hidden", border: "none", background: "transparent", color: "#dc2626", fontWeight: 900, cursor: "pointer" }}
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>

                    <div
                      style={{ maxWidth: "100%", overflowX: "hidden", display: "grid", gridTemplateColumns:
                          "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}
                    >
                      <select
                        value={item.itemType}
                        onChange={(e) =>
                          updateLineItem(
                            item.id,
                            "itemType",
                            e.target.value
                          )
                        }
                        style={inputStyle}
                      >
                        <option value="inventory">Inventory</option>
                        <option value="rental">Rental</option>
                        <option value="service">Service</option>
                        <option value="transport">Transport</option>
                        <option value="labour">Labour</option>
                        <option value="manual">Manual</option>
                      </select>

                      {item.itemType === "inventory" ? (
                        <select
                          value={item.sourceId}
                          onChange={(e) => applyOperationalSource(item.id, e.target.value)}
                          style={inputStyle}
                        >
                          <option value="">Select inventory item</option>
                          {materials.map((m) => (
                            <option key={m.id} value={m.id}>
                              {getMaterialName(m)}
                            </option>
                          ))}
                        </select>
                      ) : item.itemType === "rental" ? (
                        <select
                          value={item.sourceId}
                          onChange={(e) => applyOperationalSource(item.id, e.target.value)}
                          style={inputStyle}
                        >
                          <option value="">Select rental asset</option>
                          {rentalAssets.map((asset) => (
                            <option key={asset.id} value={asset.id}>
                              {asset.asset_name}
                              {asset.asset_code ? ` (${asset.asset_code})` : ""}
                            </option>
                          ))}
                        </select>
                      ) : item.itemType === "service" ? (
                        <select
                          value={item.sourceId}
                          onChange={(e) => applyOperationalSource(item.id, e.target.value)}
                          style={inputStyle}
                        >
                          <option value="">Select service work</option>
                          {serviceWorkOrders.map((work) => (
                            <option key={work.id} value={work.id}>
                              {work.service_title}
                            </option>
                          ))}
                        </select>
                      ) : null}

                      <input
                        value={item.itemName}
                        onChange={(e) =>
                          updateLineItem(
                            item.id,
                            "itemName",
                            e.target.value
                          )
                        }
                        placeholder="Item name"
                        style={inputStyle}
                      />

                      <input
                        value={item.quantity}
                        onChange={(e) =>
                          updateLineItem(
                            item.id,
                            "quantity",
                            e.target.value
                          )
                        }
                        placeholder="Quantity"
                        style={inputStyle}
                      />

                      <input
                        value={item.unit}
                        onChange={(e) =>
                          updateLineItem(
                            item.id,
                            "unit",
                            e.target.value
                          )
                        }
                        placeholder="Unit"
                        style={inputStyle}
                      />

                      <input
                        value={item.rate}
                        onChange={(e) =>
                          updateLineItem(
                            item.id,
                            "rate",
                            e.target.value
                          )
                        }
                        placeholder="Rate"
                        style={inputStyle}
                      />

                      <input
                        value={item.discount}
                        onChange={(e) =>
                          updateLineItem(
                            item.id,
                            "discount",
                            e.target.value
                          )
                        }
                        placeholder="Discount"
                        style={inputStyle}
                      />

                      <input
                        value={item.tax}
                        onChange={(e) =>
                          updateLineItem(
                            item.id,
                            "tax",
                            e.target.value
                          )
                        }
                        placeholder="Tax"
                        style={inputStyle}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <textarea
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
              placeholder="Customer address"
              rows={2}
              style={{ maxWidth: "100%", overflowX: "hidden", ...inputStyle, width: "100%", resize: "vertical", marginTop: 10 }}
            />

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Bill note"
              rows={2}
              style={{ maxWidth: "100%", overflowX: "hidden", ...inputStyle, width: "100%", resize: "vertical", marginTop: 10 }}
            />


            <div
              style={{ maxWidth: "100%", overflowX: "hidden", marginTop: 14, border: "1px solid #fed7aa", borderRadius: 16, padding: 14, background: "#fff7ed", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}
            >
              <div>
                <div style={{ maxWidth: "100%", overflowX: "hidden", fontSize: 11, fontWeight: 900, color: "#9a3412" }}>
                  Subtotal
                </div>
                <div style={{ maxWidth: "100%", overflowX: "hidden", marginTop: 4, fontSize: 18, fontWeight: 950 }}>
                  {money(billingCartTotals.subtotal)}
                </div>
              </div>

              <div>
                <div style={{ maxWidth: "100%", overflowX: "hidden", fontSize: 11, fontWeight: 900, color: "#9a3412" }}>
                  Discount
                </div>
                <div style={{ maxWidth: "100%", overflowX: "hidden", marginTop: 4, fontSize: 18, fontWeight: 950 }}>
                  {money(billingCartTotals.discountAmount)}
                </div>
              </div>

              <div>
                <div style={{ maxWidth: "100%", overflowX: "hidden", fontSize: 11, fontWeight: 900, color: "#9a3412" }}>
                  Tax
                </div>
                <div style={{ maxWidth: "100%", overflowX: "hidden", marginTop: 4, fontSize: 18, fontWeight: 950 }}>
                  {money(billingCartTotals.taxAmount)}
                </div>
              </div>

              <div>
                <div style={{ maxWidth: "100%", overflowX: "hidden", fontSize: 11, fontWeight: 900, color: "#9a3412" }}>
                  Grand Total
                </div>
                <div style={{ maxWidth: "100%", overflowX: "hidden", marginTop: 4, fontSize: 22, fontWeight: 950, color: "#ea580c" }}>
                  {money(billingCartTotals.grandTotal)}
                </div>
              </div>
            </div>

            {selectedInventory ? (
              <div style={{ maxWidth: "100%", overflowX: "hidden", marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
                <Badge>
                  Available Stock: {selectedInventory.current_stock || 0} {selectedInventory.stock_unit || ""}
                </Badge>
                {selectedInventory.rack_no ? <Badge>Rack: {selectedInventory.rack_no}</Badge> : null}
                {selectedInventory.godown_no ? <Badge>Godown: {selectedInventory.godown_no}</Badge> : null}
              </div>
            ) : null}

            {err ? (
              <div style={{ maxWidth: "100%", overflowX: "hidden", marginTop: 10, color: "#b91c1c", fontWeight: 900, fontSize: 13 }}>
                {err}
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => void createBill()}
              disabled={saving}
              style={{ maxWidth: "100%", overflowX: "hidden", marginTop: 12, border: "none", borderRadius: 12, padding: "10px 14px", background: saving ? "#94a3b8" : "#ea580c", color: "#fff", fontWeight: 950, cursor: saving ? "not-allowed" : "pointer" }}
            >
              {saving ? "Creating..." : "Create Bill + Deduct Stock"}
            </button>
          </CardBody>
        </Card>

        <div style={{ maxWidth: "100%", overflowX: "hidden", marginTop: 14 }}>
          <Card>
            <CardBody>
              <div style={{ maxWidth: "100%", overflowX: "hidden", fontSize: 18, fontWeight: 950 }}>Recent Bills</div>

              <div style={{ maxWidth: "100%", overflowX: "hidden", marginTop: 12 }}>
                {loading ? (
                  <EmptyState message="Loading bills…" />
                ) : bills.length === 0 ? (
                  <EmptyState message="No bill created yet." />
                ) : (
                  <div style={{ maxWidth: "100%", overflowX: "hidden", display: "grid", gap: 10 }}>
                    {bills.map((bill) => (
                      <div
                        key={bill.id}
                        style={{ maxWidth: "100%", overflowX: "hidden", border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, background: "#fff" }}
                      >
                        <div style={{ maxWidth: "100%", overflowX: "hidden", display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 10 }}>
                          <div>
                            <div style={{ maxWidth: "100%", overflowX: "hidden", fontSize: 16, fontWeight: 950 }}>{bill.bill_no}</div>
                            <div style={{ maxWidth: "100%", overflowX: "hidden", marginTop: 5, display: "flex", flexWrap: "wrap", gap: 8 }}>
                              <Badge>{bill.bill_type.replace(/_/g, " ")}</Badge>
                              <Badge>{bill.payment_status}</Badge>
                              {bill.customer_name ? <Badge>Customer: {bill.customer_name}</Badge> : null}
                              {bill.customer_phone ? <Badge>{bill.customer_phone}</Badge> : null}
                            </div>
                          </div>

                          <div style={{ maxWidth: "100%", overflowX: "hidden", display: "grid", gap: 8, justifyItems: "flex-end" }}>
                            <div style={{ maxWidth: "100%", overflowX: "hidden", fontSize: 18, fontWeight: 950, color: "#ea580c" }}>
                              {money(asNumber(bill.total_amount))}
                            </div>

                            <a
                              href={`/api/vendor/billing/${encodeURIComponent(bill.bill_no)}/pdf`}
                              target="_blank"
                              rel="noreferrer"
                              style={{ maxWidth: "100%", overflowX: "hidden", borderRadius: 12, background: "#ffffff", color: "#111827", padding: "8px 11px", fontSize: 12, fontWeight: 950, textDecoration: "none" }}
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
