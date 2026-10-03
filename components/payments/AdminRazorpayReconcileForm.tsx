"use client";
import { useState } from "react";
export default function AdminRazorpayReconcileForm() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          const f = new FormData(e.currentTarget);
          const r = await fetch("/api/admin/razorpay-reconcile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              purchaseId: f.get("purchaseId"),
              gatewayOrderId: f.get("gatewayOrderId"),
            }),
          });
          const d = await r.json();
          setMessage(
            d.error ||
              d.message ||
              `Provider verified: ${d.status}. Refresh this page for current records.`,
          );
        } catch {
          setMessage("Reconciliation unavailable. No new charge was created.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        Purchase UUID
        <input name="purchaseId" required />
      </label>
      <label>
        Razorpay order ID
        <input name="gatewayOrderId" required placeholder="order_…" />
      </label>
      <button disabled={busy}>
        {busy ? "Checking provider…" : "Reconcile existing provider order"}
      </button>
      <p role="status">{message}</p>
    </form>
  );
}
