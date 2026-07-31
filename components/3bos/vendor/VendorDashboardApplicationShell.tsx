"use client";

import React from "react";
import type { VendorWorkspaceProjection } from "@/lib/3bos/vendor/resolve-vendor-workspace-projection";

type Props = {
  projection: VendorWorkspaceProjection;
  email?: string | null;
  children: React.ReactNode;
};

const menu = [
  ["Dashboard", "#vendor-dashboard-home", "▦"],
  ["My Profile", "/onboarding/business", "◉"],
  ["Unified Workspace", "/dashboard/vendor/workspace", "▤"],
  ["Vendor Work Desk", "/dashboard/vendor/rfqs", "▣"],
  ["My RFQs", "/dashboard/vendor/rfqs", "▥"],
  ["Messages", "/dashboard/vendor/inbox", "◫"],
  ["Analytics", "/dashboard/vendor/workspace", "▧"],
  ["My Listings", "/dashboard/vendor/master-data", "▨"],
  ["Business Health", "#vendor-health-centre", "♡"],
  ["Growth Centre", "#vendor-growth-centre", "↗"],
  ["Business Pulse", "#vendor-business-pulse", "◌"],
  ["Subscription", "/dashboard/subscription", "◈"],
  ["Help & Support", "/support/my", "?"],
  ["Settings", "/settings", "⚙"],
] as const;

function initials(value: string) {
  const text = value.trim();

  if (!text) return "VH";

  return text
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function VendorDashboardApplicationShell({
  projection,
  email,
  children,
}: Props) {
  const identity = projection.identity.title || "Vendor Hub";
  const pulse = projection.pulse;

  const statistics = [
    {
      label: "RFQs Available",
      value: pulse.newLeads,
      href: "/dashboard/vendor/rfqs",
    },
    {
      label: "Conversations",
      value: pulse.unreadConversations,
      href: "/dashboard/vendor/inbox",
    },
    {
      label: "Unread Alerts",
      value: pulse.alerts,
      href: "/dashboard/vendor/notifications",
    },
    {
      label: "Price Signals",
      value: pulse.priceSignals,
      href: "/vendor/price-updates/new",
    },
    {
      label: "Overall Readiness",
      value: `${projection.readiness.score}%`,
      href: "#vendor-health-centre",
    },
  ];

  return (
    <div
      id="vendor-dashboard-home"
      data-v11-vendor-application-shell="active"
      className="vendor-app-shell"
    >
      <aside className="vendor-app-sidebar">
        <div className="vendor-profile-card">
          <div className="vendor-profile-avatar">{initials(identity)}</div>

          <div className="vendor-profile-name">{identity}</div>

          <div className="vendor-profile-email">
            {email || "Vendor workspace"}
          </div>

          <div className="vendor-profile-status">✓ Active workspace</div>

          <a href="/onboarding/business" className="vendor-profile-button">
            View My Profile
          </a>
        </div>

        <nav aria-label="Vendor dashboard navigation">
          {menu.map(([label, href, icon], index) => (
            <a
              key={`${label}-${href}`}
              href={href}
              className={`vendor-menu-item ${
                index === 0 ? "vendor-menu-active" : ""
              }`}
            >
              <span className="vendor-menu-icon">{icon}</span>
              <span>{label}</span>
            </a>
          ))}
        </nav>

        <div className="vendor-sidebar-support">
          <strong>Need Help?</strong>
          <span>Our support team is ready to assist you.</span>
          <a href="/support/my">Contact Support</a>
        </div>
      </aside>

      <section className="vendor-app-content">
        <header className="vendor-dashboard-welcome">
          <div>
            <h1>Welcome back, {identity}</h1>
            <p>Here is what is happening with your business today.</p>
          </div>

          <a href="#vendor-work-centre">Open Work Centre</a>
        </header>

        <section className="vendor-kpi-grid">
          {statistics.map((item) => (
            <a key={item.label} href={item.href} className="vendor-kpi-card">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <small>Open →</small>
            </a>
          ))}
        </section>

        {projection.workNow.length > 0 ? (
          <section className="vendor-action-strip">
            {projection.workNow.slice(0, 3).map((action, index) => (
              <a key={action.key} href={action.href}>
                <small>
                  {index === 0 ? "Recommended next action" : "Work now"}
                </small>
                <strong>{action.label}</strong>
                <span>{action.detail}</span>
              </a>
            ))}
          </section>
        ) : null}

        {children}
      </section>

      <style jsx>{`
        .vendor-app-shell {
          display: grid;
          grid-template-columns: 260px minmax(0, 1fr);
          gap: 20px;
          width: 100%;
          min-height: 100vh;
          padding: 24px clamp(16px, 2vw, 32px) 40px;
          background: #f8fafc;
        }

        .vendor-app-sidebar {
          position: sticky;
          top: 88px;
          align-self: start;
          max-height: calc(100vh - 104px);
          overflow-y: auto;
          border: 1px solid #e2e8f0;
          border-radius: 24px;
          background: #ffffff;
          box-shadow: 0 14px 34px rgba(15, 23, 42, 0.07);
        }

        .vendor-profile-card {
          padding: 22px 18px;
          text-align: center;
          border-bottom: 1px solid #eef2f7;
        }

        .vendor-profile-avatar {
          display: grid;
          place-items: center;
          width: 74px;
          height: 74px;
          margin: 0 auto;
          border-radius: 50%;
          color: #ffffff;
          background: linear-gradient(135deg, #0f766e, #2563eb);
          box-shadow: 0 9px 22px rgba(37, 99, 235, 0.23);
          font-size: 24px;
          font-weight: 950;
        }

        .vendor-profile-name {
          margin-top: 13px;
          color: #0f172a;
          font-size: 18px;
          font-weight: 950;
        }

        .vendor-profile-email {
          margin-top: 4px;
          overflow: hidden;
          color: #64748b;
          font-size: 11px;
          font-weight: 700;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .vendor-profile-status {
          display: inline-flex;
          margin-top: 10px;
          padding: 5px 9px;
          border-radius: 999px;
          color: #047857;
          background: #ecfdf5;
          font-size: 11px;
          font-weight: 900;
        }

        .vendor-profile-button {
          display: block;
          margin-top: 13px;
          padding: 10px 12px;
          border-radius: 11px;
          color: #ffffff;
          background: #2563eb;
          text-decoration: none;
          font-size: 12px;
          font-weight: 900;
        }

        nav {
          padding: 12px;
        }

        .vendor-menu-item {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 3px;
          padding: 10px 11px;
          border-radius: 11px;
          color: #334155;
          text-decoration: none;
          font-size: 12px;
          font-weight: 850;
        }

        .vendor-menu-item:hover {
          color: #1d4ed8;
          background: #f8fafc;
        }

        .vendor-menu-active {
          color: #1d4ed8;
          background: #eff6ff;
        }

        .vendor-menu-icon {
          display: grid;
          place-items: center;
          width: 25px;
          height: 25px;
          border-radius: 8px;
          background: #f1f5f9;
          font-size: 11px;
        }

        .vendor-menu-active .vendor-menu-icon {
          background: #dbeafe;
        }

        .vendor-sidebar-support {
          display: grid;
          gap: 8px;
          margin: 12px;
          padding: 14px;
          border: 1px solid #dbeafe;
          border-radius: 15px;
          background: #f8fbff;
          color: #475569;
          font-size: 11px;
          line-height: 1.45;
        }

        .vendor-sidebar-support strong {
          color: #0f172a;
          font-size: 13px;
        }

        .vendor-sidebar-support a {
          padding: 8px 10px;
          border: 1px solid #bfdbfe;
          border-radius: 9px;
          color: #1d4ed8;
          background: #ffffff;
          text-align: center;
          text-decoration: none;
          font-weight: 900;
        }

        .vendor-app-content {
          min-width: 0;
        }

        .vendor-dashboard-welcome {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 18px;
        }

        .vendor-dashboard-welcome h1 {
          margin: 0;
          color: #0f172a;
          font-size: clamp(24px, 3vw, 34px);
          font-weight: 950;
        }

        .vendor-dashboard-welcome p {
          margin: 6px 0 0;
          color: #64748b;
          font-size: 13px;
          font-weight: 700;
        }

        .vendor-dashboard-welcome > a {
          padding: 11px 15px;
          border-radius: 12px;
          color: #ffffff;
          background: #2563eb;
          text-decoration: none;
          font-size: 12px;
          font-weight: 900;
          white-space: nowrap;
        }

        .vendor-kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 12px;
          margin-bottom: 18px;
        }

        .vendor-kpi-card {
          min-height: 112px;
          padding: 16px;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          color: inherit;
          background: #ffffff;
          box-shadow: 0 8px 22px rgba(15, 23, 42, 0.05);
          text-decoration: none;
        }

        .vendor-kpi-card span {
          display: block;
          color: #475569;
          font-size: 11px;
          font-weight: 850;
        }

        .vendor-kpi-card strong {
          display: block;
          margin-top: 8px;
          color: #0f172a;
          font-size: 27px;
          font-weight: 950;
        }

        .vendor-kpi-card small {
          display: block;
          margin-top: 8px;
          color: #2563eb;
          font-size: 10px;
          font-weight: 900;
        }

        .vendor-action-strip {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
          gap: 12px;
          margin-bottom: 18px;
        }

        .vendor-action-strip a {
          display: grid;
          gap: 5px;
          padding: 15px;
          border: 1px solid #dbeafe;
          border-radius: 16px;
          color: inherit;
          background: #ffffff;
          text-decoration: none;
        }

        .vendor-action-strip a:first-child {
          background: #eff6ff;
        }

        .vendor-action-strip small {
          color: #2563eb;
          font-size: 9px;
          font-weight: 950;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .vendor-action-strip strong {
          color: #0f172a;
          font-size: 13px;
          font-weight: 950;
        }

        .vendor-action-strip span {
          color: #64748b;
          font-size: 11px;
          line-height: 1.5;
          font-weight: 700;
        }

        @media (max-width: 980px) {
          .vendor-app-shell {
            grid-template-columns: 1fr;
          }

          .vendor-app-sidebar {
            position: static;
            max-height: none;
          }

          nav {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 600px) {
          .vendor-app-shell {
            padding: 14px 10px 28px;
          }

          nav {
            grid-template-columns: 1fr;
          }

          .vendor-dashboard-welcome {
            flex-direction: column;
          }

          .vendor-dashboard-welcome > a {
            width: 100%;
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
}
