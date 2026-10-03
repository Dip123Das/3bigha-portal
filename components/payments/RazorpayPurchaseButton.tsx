"use client";
import { useState } from "react";
let sdk: Promise<void> | null = null;
function loadCheckout() {
  if ((window as any).Razorpay) return Promise.resolve();
  if (!sdk)
    sdk = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve();
      script.onerror = () => {
        sdk = null;
        script.remove();
        reject(new Error("Could not load secure checkout. Please retry."));
      };
      document.head.appendChild(script);
    });
  return sdk;
}
export default function RazorpayPurchaseButton({
  product,
  resourceId,
  label,
  disabled,
  onComplete,
}: {
  product: string;
  resourceId?: string;
  label: string;
  disabled?: boolean;
  onComplete?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function purchase() {
    setBusy(true);
    setMessage("");
    try {
      const storageKey = `3bigha-purchase:${product}:${resourceId || "account"}`;
      let key = sessionStorage.getItem(storageKey);
      if (!key) {
        key = crypto.randomUUID();
        sessionStorage.setItem(storageKey, key);
      }
      await loadCheckout();
      const response = await fetch("/api/payments/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product, resourceId, idempotencyKey: key }),
      });
      const order = await response.json();
      if (!response.ok)
        throw new Error(order.error || "Could not prepare payment.");
      const checkout = new (window as any).Razorpay({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: "3Bigha",
        description: order.label,
        prefill: { email: order.email },
        modal: {
          ondismiss: () => {
            setBusy(false);
            setMessage("Checkout closed. Your current access is unchanged.");
          },
        },
        handler: async (result: any) => {
          try {
            const verified = await fetch("/api/payments/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(result),
            });
            const data = await verified.json();
            if (!verified.ok) throw new Error(data.error);
            sessionStorage.removeItem(storageKey);
            setMessage(data.message);
            onComplete?.();
          } catch (e) {
            setMessage(
              e instanceof Error
                ? e.message
                : "Confirmation pending. Do not pay again.",
            );
            onComplete?.();
          } finally {
            setBusy(false);
          }
        },
      });
      checkout.on("payment.failed", () => {
        setMessage(
          "Payment failed. Your existing access is unchanged. You can retry this purchase.",
        );
        setBusy(false);
      });
      checkout.open();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not open checkout.");
      setBusy(false);
    }
  }
  return (
    <div>
      <button
        type="button"
        disabled={disabled || busy}
        onClick={purchase}
        style={{
          padding: "10px 16px",
          borderRadius: 10,
          border: "1px solid #1d4ed8",
          background: disabled ? "#e2e8f0" : "#1d4ed8",
          color: disabled ? "#475569" : "white",
          cursor: disabled ? "default" : "pointer",
        }}
      >
        {busy ? "Preparing payment…" : label}
      </button>
      {message ? (
        <p role="status" style={{ fontSize: 13, lineHeight: 1.6 }}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
