import { redirect } from "next/navigation";

import { requireMasterAdmin } from "@/lib/admin/requireMasterAdmin";

export const dynamic = "force-dynamic";

type QueryResult = { data: any[] | null; error: { message: string } | null };

const clean = (value: unknown) =>
  String(value ?? "—").replaceAll("_", " ");

const number = (value: unknown) => Number(value || 0);

export default async function InventoryOperationsCenter() {
  const access = await requireMasterAdmin();
  if ("error" in access) {
    if (access.status === 401) {
      redirect("/login?next=/admin/inventory-operations");
    }
    return <main>Access denied</main>;
  }

  const [intelligence, counts, transactions, reservations, bills, dispatches, vehicles] =
    (await Promise.all([
      access.admin
        .from("bos_material_inventory_intelligence")
        .select("user_id,material_listing_id,material_name,sku,on_hand_stock,reserved_stock,available_to_sell,unit,stock_status,ageing_status,suggested_reorder_quantity,allocation_drift,location_balanced,risk_score,risk_level,last_movement_at")
        .order("risk_score", { ascending: false })
        .limit(1000),
      access.admin
        .from("bos_inventory_stock_counts")
        .select("id,user_id,material_listing_id,system_quantity,counted_quantity,variance,status,counted_at,reconciled_at")
        .order("counted_at", { ascending: false })
        .limit(500),
      access.admin
        .from("bos_inventory_transactions")
        .select("id,user_id,inventory_domain,inventory_entity_id,transaction_type,quantity,unit,source_module,occurred_at")
        .order("occurred_at", { ascending: false })
        .limit(500),
      access.admin
        .from("bos_material_inventory_reservations")
        .select("id,user_id,material_listing_id,reserved_quantity,released_quantity,consumed_quantity,status,expires_at,created_at")
        .order("created_at", { ascending: false })
        .limit(500),
      access.admin
        .from("inventory_bills")
        .select("id,vendor_user_id,bill_no,total_amount,payment_status,created_at")
        .order("created_at", { ascending: false })
        .limit(500),
      access.admin
        .from("inventory_dispatches")
        .select("id,vendor_user_id,material_name,quantity,unit,dispatch_status,expected_delivery_at,created_at")
        .order("created_at", { ascending: false })
        .limit(500),
      access.admin
        .from("vendor_vehicles")
        .select("id,vendor_user_id,vehicle_number,vehicle_type,current_status,is_active,created_at")
        .order("created_at", { ascending: false })
        .limit(500),
    ])) as QueryResult[];

  const results = [intelligence, counts, transactions, reservations, bills, dispatches, vehicles];
  const issues = results.flatMap((result) => (result.error ? [result.error.message] : []));
  const stock = intelligence.data || [];
  const stockCounts = counts.data || [];
  const billRows = bills.data || [];
  const dispatchRows = dispatches.data || [];
  const vehicleRows = vehicles.data || [];
  const reservationRows = reservations.data || [];
  const now = Date.now();
  const vendors = new Set(stock.map((row) => row.user_id).filter(Boolean)).size;
  const highRisk = stock.filter((row) => row.risk_level === "high");
  const lowOrOut = stock.filter((row) => ["low_stock", "out_of_stock", "fully_reserved"].includes(row.stock_status));
  const deadStock = stock.filter((row) => row.ageing_status === "dead_stock");
  const allocationDrift = stock.filter((row) => row.location_balanced === false || number(row.allocation_drift) !== 0);
  const unreconciled = stockCounts.filter((row) => !["matched", "reconciled", "cancelled"].includes(row.status));
  const overdueReservations = reservationRows.filter((row) => row.status === "active" && row.expires_at && Date.parse(row.expires_at) < now);
  const unpaidBills = billRows.filter((row) => !["paid", "cancelled", "void"].includes(row.payment_status));
  const dispatchExceptions = dispatchRows.filter((row) => ["failed", "cancelled"].includes(row.dispatch_status) || (row.expected_delivery_at && Date.parse(row.expected_delivery_at) < now && row.dispatch_status !== "delivered"));
  const unavailableVehicles = vehicleRows.filter((row) => row.is_active === false || ["maintenance", "inactive"].includes(row.current_status));
  const totalStockValueCoverage = "Purchase-price valuation is available in the vendor intelligence work desk; this center intentionally does not estimate missing prices.";

  const cards: Array<[string, string | number, string]> = [
    ["Vendors represented", vendors, "From canonical inventory intelligence"],
    ["Inventory items", stock.length, "Bounded operating projection"],
    ["High-risk items", highRisk.length, "Deterministic risk authority"],
    ["Low / unavailable", lowOrOut.length, "Low, out or fully reserved"],
    ["Open reconciliation", unreconciled.length, "Physical count requires closure"],
    ["Dispatch exceptions", dispatchExceptions.length, "Failed, cancelled or overdue"],
  ];

  const panel = { padding: 16, background: "white", border: "1px solid #dbe3ec", borderRadius: 12 };

  return (
    <main style={{ padding: 24, background: "#f8fafc", minHeight: "100vh" }}>
      <header>
        <h1>Inventory & Vendor Operations Center</h1>
        <p>Cross-vendor stock health, reconciliation, billing, dispatch and fleet integrity over existing ERP authorities.</p>
        <a href="/admin/dashboard">← Admin Command Center</a>
      </header>

      {issues.length ? (
        <details style={{ marginTop: 12 }}>
          <summary>Partial data notice ({issues.length})</summary>
          {issues.map((issue, index) => <p key={`${issue}-${index}`}>{issue}</p>)}
        </details>
      ) : null}

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10, margin: "18px 0" }}>
        {cards.map(([label, value, helper]) => (
          <article key={label} style={panel}>
            <small>{label}</small>
            <strong style={{ display: "block", fontSize: 28 }}>{value}</strong>
            <span>{helper}</span>
          </article>
        ))}
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 12 }}>
        <article style={panel}>
          <h2>Stock risk & replenishment</h2>
          {[...highRisk, ...lowOrOut].filter((row, index, rows) => rows.findIndex((candidate) => candidate.material_listing_id === row.material_listing_id) === index).slice(0, 15).map((row) => (
            <p key={row.material_listing_id}><strong>{row.material_name}</strong><br />{clean(row.stock_status)} · {clean(row.risk_level)} risk · Available {number(row.available_to_sell)} {row.unit || "units"} · Reorder {number(row.suggested_reorder_quantity)}</p>
          ))}
          {!highRisk.length && !lowOrOut.length ? <p>No stock-risk signal in the bounded projection.</p> : null}
          <a href="/dashboard/vendor/inventory-intelligence">Open canonical Inventory Intelligence</a>
        </article>

        <article style={panel}>
          <h2>Integrity & reconciliation</h2>
          <p><strong>{allocationDrift.length}</strong> items have location-allocation drift.</p>
          <p><strong>{unreconciled.length}</strong> physical counts remain unmatched or unreconciled.</p>
          <p><strong>{deadStock.length}</strong> items are classified as dead stock.</p>
          <p><strong>{overdueReservations.length}</strong> active reservations are past expiry.</p>
          <p>Stock corrections remain authorized only through the canonical reconciliation RPC and vendor inventory workflow.</p>
          <a href="/dashboard/vendor/inventory">Open Inventory Work Desk</a>
        </article>

        <article style={panel}>
          <h2>Billing & dispatch integrity</h2>
          <p><strong>{unpaidBills.length}</strong> recent bills are unpaid or unsettled.</p>
          <p><strong>{dispatchExceptions.length}</strong> recent dispatches require attention.</p>
          <p><strong>{transactions.data?.length || 0}</strong> recent canonical inventory transactions are visible.</p>
          <p>{totalStockValueCoverage}</p>
          <a href="/dashboard/vendor/billing">Billing</a>{" · "}<a href="/dashboard/vendor/dispatch">Dispatch</a>
        </article>

        <article style={panel}>
          <h2>Fleet readiness</h2>
          <p><strong>{vehicleRows.length}</strong> vehicles appear in the bounded fleet projection.</p>
          <p><strong>{unavailableVehicles.length}</strong> are inactive or under maintenance.</p>
          <p>Live GPS telemetry and route-performance history are not centrally persisted; no availability or efficiency estimate is invented.</p>
          <a href="/dashboard/vendor/fleet">Open Fleet Work Desk</a>
        </article>
      </section>
    </main>
  );
}
