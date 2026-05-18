"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const groups = [
  {
    title: "Operations",
    items: [
      { label: "Mission Control", href: "/dashboard/vendor", icon: "🏠" },
      { label: "Inventory OS", href: "/dashboard/vendor/inventory", icon: "📦" },
      { label: "Billing", href: "/dashboard/vendor/billing", icon: "🧾" },
      { label: "Fleet", href: "/dashboard/vendor/fleet", icon: "🚚" },
      { label: "Dispatch", href: "/dashboard/vendor/dispatch", icon: "📍" },
    ],
  },
  {
    title: "AI Intelligence",
    items: [
      { label: "AI ERP Supervisor", href: "/dashboard/vendor/inventory-intelligence", icon: "🤖" },
      { label: "Notifications", href: "/dashboard/vendor/notifications", icon: "🔔" },
      { label: "Vendor RFQs", href: "/dashboard/vendor/rfqs", icon: "📨" },
    ],
  },
  {
    title: "Marketplace",
    items: [
      { label: "Buyer Enquiries", href: "/dashboard/vendor/enquiries", icon: "💬" },
      { label: "Inbox", href: "/dashboard/inbox-v2", icon: "📥" },
      { label: "Property", href: "/property/my", icon: "🏡" },
      { label: "Materials", href: "/materials/my", icon: "🏗️" },
      { label: "Services", href: "/services/my", icon: "🛠️" },
      { label: "Rentals", href: "/rentals/my", icon: "🚜" },
    ],
  },
  {
    title: "Business",
    items: [
      { label: "Subscription", href: "/dashboard/subscription", icon: "💳" },
      { label: "AI Boost", href: "/dashboard/subscription/boost", icon: "🚀" },
      { label: "Business Profile", href: "/onboarding/business", icon: "🏢" },
    ],
  },
];

export function VendorErpNav() {
  const pathname = usePathname();

  return (
    <div
      style={{
        marginBottom: 16,
        borderRadius: 22,
        border: "1px solid rgba(15,23,42,0.08)",
        background: "linear-gradient(135deg, #0f172a, #1e3a8a)",
        padding: 14,
        boxShadow: "0 18px 46px rgba(15,23,42,0.18)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <div>
          <div style={{ color: "#ffffff", fontSize: 18, fontWeight: 1000 }}>
            3Bigha Vendor ERP
          </div>
          <div style={{ marginTop: 3, color: "#bfdbfe", fontSize: 12, fontWeight: 800 }}>
            Operations • AI • Marketplace • Business
          </div>
        </div>

        <Link
          href="/dashboard/vendor/inventory-intelligence"
          style={{
            borderRadius: 999,
            background: "#ffffff",
            color: "#1d4ed8",
            padding: "9px 13px",
            fontSize: 12,
            fontWeight: 1000,
            textDecoration: "none",
          }}
        >
          🤖 Open AI Supervisor
        </Link>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: 10,
        }}
      >
        {groups.map((group) => (
          <div
            key={group.title}
            style={{
              borderRadius: 18,
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              padding: 10,
            }}
          >
            <div
              style={{
                color: "#bfdbfe",
                fontSize: 11,
                fontWeight: 1000,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              {group.title}
            </div>

            <div style={{ display: "grid", gap: 7 }}>
              {group.items.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/dashboard/vendor" && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      borderRadius: 13,
                      padding: "9px 10px",
                      background: active ? "#ffffff" : "rgba(255,255,255,0.08)",
                      color: active ? "#0f172a" : "#ffffff",
                      textDecoration: "none",
                      fontSize: 13,
                      fontWeight: 950,
                    }}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}