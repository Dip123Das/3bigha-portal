"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  {
    label: "Buyer Work Desk",
    href: "/dashboard/buyer",
    help: "Main buyer control room",
  },
  {
    label: "RFQs / Compare Quotes",
    href: "/dashboard/buyer/rfqs",
    help: "Compare vendor quotations",
  },
  {
    label: "Buyer Inbox",
    href: "/dashboard/buyer/inbox",
    help: "Direct vendor conversations",
  },
  {
    label: "Unified Inbox",
    href: "/dashboard/inbox",
    help: "All buyer/vendor messages",
  },
  {
    label: "Marketplace",
    href: "/property",
    help: "Browse listings and vendors",
  },
  {
    label: "Investment",
    href: "/investment",
    help: "Investment opportunities",
  },
];

export default function BuyerWorkMenu() {
  const pathname = usePathname();

  return (
    <section
      style={{
        marginBottom: 18,
        border: "1px solid #dbeafe",
        borderRadius: 22,
        padding: 14,
        background: "linear-gradient(to bottom right,#eff6ff,#ffffff)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 950,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "#2563eb",
        }}
      >
        Buyer Master Menu
      </div>

      <div
        style={{
          marginTop: 6,
          fontSize: 13,
          fontWeight: 750,
          color: "#475569",
        }}
      >
        Continue your daily buying work from one operational menu.
      </div>

      <div
        style={{
          marginTop: 12,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: 10,
        }}
      >
        {items.map((item) => {
          const active =
            pathname === item.href ||
            pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                textDecoration: "none",
                border: active
                  ? "2px solid #2563eb"
                  : "1px solid #bfdbfe",
                background: active ? "#dbeafe" : "#ffffff",
                borderRadius: 14,
                padding: 12,
                color: "#0f172a",
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 950,
                }}
              >
                {item.label}
              </div>

              <div
                style={{
                  marginTop: 4,
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#64748b",
                }}
              >
                {item.help}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
