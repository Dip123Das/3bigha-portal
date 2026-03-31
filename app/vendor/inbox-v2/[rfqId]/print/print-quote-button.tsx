"use client";

export default function PrintQuoteButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      style={{
        padding: "10px 16px",
        borderRadius: 10,
        border: "1px solid #d1d5db",
        background: "#fff",
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      Print
    </button>
  );
}