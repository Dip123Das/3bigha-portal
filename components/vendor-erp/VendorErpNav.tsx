"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const primaryItems = [
  { label: "Dashboard", href: "/dashboard/vendor", icon: "🏠" },
  { label: "Inventory", href: "/dashboard/vendor/inventory", icon: "📦" },
  {
    label: "Intelligence",
    href: "/dashboard/vendor/inventory-intelligence",
    icon: "📊",
  },
  { label: "Billing", href: "/dashboard/vendor/billing", icon: "🧾" },
  { label: "Dispatch", href: "/dashboard/vendor/dispatch", icon: "📍" },
  { label: "Fleet", href: "/dashboard/vendor/fleet", icon: "🚚" },
  { label: "Buyer RFQs", href: "/dashboard/vendor/rfqs", icon: "📨" },
  { label: "Inbox", href: "/dashboard/inbox-v2", icon: "📥" },
];

const secondaryItems = [
  { label: "Materials", href: "/materials/my", icon: "🏗️" },
  { label: "Services", href: "/services/my", icon: "🛠️" },
  { label: "Rentals", href: "/rentals/my", icon: "🚜" },
  { label: "Property", href: "/property/my", icon: "🏡" },
  {
    label: "Business Profile",
    href: "/onboarding/business",
    icon: "🏢",
  },
  {
    label: "Subscription",
    href: "/dashboard/subscription",
    icon: "💳",
  },
  {
    label: "Notifications",
    href: "/dashboard/vendor/notifications",
    icon: "🔔",
  },
];

function isActive(pathname: string, href: string) {
  return (
    pathname === href ||
    (href !== "/dashboard/vendor" && pathname.startsWith(href))
  );
}

export function VendorErpNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="3Bigha Vendor ERP"
      style={{
        marginBottom: 16,
        borderRadius: 20,
        border: "1px solid rgba(15,23,42,0.08)",
        background:
          "linear-gradient(135deg, #0f172a 0%, #172554 55%, #1d4ed8 100%)",
        padding: 12,
        boxShadow: "0 16px 38px rgba(15,23,42,0.16)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              color: "#ffffff",
              fontSize: 16,
              fontWeight: 950,
            }}
          >
            3Bigha Vendor ERP
          </div>

          <div
            style={{
              marginTop: 3,
              color: "#bfdbfe",
              fontSize: 11,
              fontWeight: 800,
            }}
          >
            Operations, marketplace and business controls
          </div>
        </div>

        <Link
          href="/dashboard/vendor/inventory-intelligence"
          style={{
            borderRadius: 12,
            background: "#ffffff",
            color: "#1d4ed8",
            padding: "8px 12px",
            fontSize: 12,
            fontWeight: 900,
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
          📊 Inventory Control
        </Link>
      </div>

      <div
        style={{
          marginTop: 12,
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        {primaryItems.map((item) => {
          const active = isActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                minHeight: 38,
                borderRadius: 12,
                padding: "8px 11px",
                background: active
                  ? "#ffffff"
                  : "rgba(255,255,255,0.10)",
                border: active
                  ? "1px solid #ffffff"
                  : "1px solid rgba(255,255,255,0.14)",
                color: active ? "#0f172a" : "#ffffff",
                textDecoration: "none",
                fontSize: 12,
                fontWeight: 900,
              }}
            >
              <span aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      <details
        style={{
          marginTop: 10,
          borderTop: "1px solid rgba(255,255,255,0.14)",
          paddingTop: 9,
        }}
      >
        <summary
          style={{
            cursor: "pointer",
            color: "#dbeafe",
            fontSize: 12,
            fontWeight: 900,
            listStylePosition: "inside",
          }}
        >
          More business tools
        </summary>

        <div
          style={{
            marginTop: 9,
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          {secondaryItems.map((item) => {
            const active = isActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  minHeight: 36,
                  borderRadius: 11,
                  padding: "7px 10px",
                  background: active
                    ? "#ffffff"
                    : "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.14)",
                  color: active ? "#0f172a" : "#ffffff",
                  textDecoration: "none",
                  fontSize: 12,
                  fontWeight: 850,
                }}
              >
                <span aria-hidden="true">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </details>
    </nav>
  );
}
