"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { label: "Work Desk", href: "/dashboard/vendor", help: "Main vendor control room" },
  { label: "RFQs / Leads", href: "/dashboard/vendor/rfqs", help: "Buyer requirements" },
  { label: "Messages", href: "/dashboard/vendor/inbox", help: "Buyer conversations" },
  { label: "Inventory", href: "/dashboard/vendor/inventory", help: "Stock items" },
  { label: "Billing", href: "/dashboard/vendor/billing", help: "Invoice / challan" },
  { label: "Fleet", href: "/dashboard/vendor/fleet", help: "Vehicles" },
  { label: "Dispatch", href: "/dashboard/vendor/dispatch", help: "Delivery work" },
  { label: "Alerts", href: "/dashboard/vendor/notifications", help: "Important updates" },
];

export default function VendorWorkMenu() {
  const pathname = usePathname();

  return (
    <section
      style={{
        marginBottom: 16,
        border: "1px solid #dbeafe",
        borderRadius: 22,
        padding: 14,
        background: "linear-gradient(to bottom right,#eff6ff,#ffffff)",
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 950, letterSpacing: "0.14em", textTransform: "uppercase", color: "#2563eb" }}>
        Vendor Master Menu
      </div>

      <div style={{ marginTop: 6, fontSize: 13, fontWeight: 750, color: "#475569" }}>
        Control daily vendor work from one menu. Use this same menu on every vendor page.
      </div>

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))", gap: 10 }}>
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                textDecoration: "none",
                border: active ? "2px solid #2563eb" : "1px solid #bfdbfe",
                background: active ? "#dbeafe" : "#ffffff",
                borderRadius: 14,
                padding: 12,
                color: "#0f172a",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 950 }}>{item.label}</div>
              <div style={{ marginTop: 4, fontSize: 11, fontWeight: 700, color: "#64748b" }}>{item.help}</div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
