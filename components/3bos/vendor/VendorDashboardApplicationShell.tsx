"use client";

import React, { Children, isValidElement, useMemo, useState } from "react";
import type { VendorWorkspaceProjection } from "@/lib/3bos/vendor/resolve-vendor-workspace-projection";

type Props = {
  projection: VendorWorkspaceProjection;
  email?: string | null;
  children: React.ReactNode;
};

type InternalPanel =
  | "overview"
  | "mission"
  | "work"
  | "health"
  | "growth"
  | "pulse"
  | "navigation";

type MenuItem =
  | {
      type: "panel";
      label: string;
      panel: InternalPanel;
      icon: string;
    }
  | {
      type: "route";
      label: string;
      href: string;
      icon: string;
    };

const menu: MenuItem[] = [
  { type: "panel", label: "Dashboard Home", panel: "overview", icon: "⌂" },
  { type: "panel", label: "Today's Mission", panel: "mission", icon: "◎" },
  { type: "panel", label: "Work Now", panel: "work", icon: "✓" },
  { type: "panel", label: "Business Health", panel: "health", icon: "♡" },
  { type: "panel", label: "Growth Centre", panel: "growth", icon: "↗" },
  { type: "panel", label: "Business Pulse", panel: "pulse", icon: "◌" },

  {
    type: "route",
    label: "Unified Workspace",
    href: "/dashboard/vendor/workspace",
    icon: "▤",
  },
  {
    type: "route",
    label: "Vendor Work Desk",
    href: "/dashboard/vendor/rfqs",
    icon: "▣",
  },
  {
    type: "route",
    label: "My RFQs",
    href: "/dashboard/vendor/rfqs",
    icon: "▥",
  },
  {
    type: "route",
    label: "Messages",
    href: "/dashboard/vendor/inbox",
    icon: "◫",
  },
  {
    type: "route",
    label: "My Listings",
    href: "/dashboard/vendor/master-data",
    icon: "▨",
  },
  {
    type: "route",
    label: "Price Updates",
    href: "/vendor/price-updates/new",
    icon: "₹",
  },
  {
    type: "route",
    label: "Growth Plan",
    href: "/dashboard/subscription",
    icon: "◇",
  },
  {
    type: "route",
    label: "My Profile",
    href: "/onboarding/business",
    icon: "◉",
  },
  {
    type: "route",
    label: "Help & Support",
    href: "/support/my",
    icon: "?",
  },
  {
    type: "route",
    label: "Settings",
    href: "/settings",
    icon: "⚙",
  },
];

const panelBySectionId: Record<string, InternalPanel> = {
  "vendor-executive-mission": "mission",
  "vendor-work-centre": "work",
  "vendor-health-centre": "health",
  "vendor-growth-centre": "growth",
  "vendor-business-pulse": "pulse",
  "vendor-workspace-navigation": "navigation",
};

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

function panelLabel(panel: InternalPanel) {
  if (panel === "overview") return "Dashboard Home";
  if (panel === "mission") return "Today's Mission";
  if (panel === "work") return "Work Now";
  if (panel === "health") return "Business Health";
  if (panel === "growth") return "Growth Centre";
  if (panel === "pulse") return "Business Pulse";
  return "All Workspaces";
}

export default function VendorDashboardApplicationShell({
  projection,
  email,
  children,
}: Props) {
  const [activePanel, setActivePanel] =
    useState<InternalPanel>("overview");

  const identity = projection.identity.title || "Vendor Hub";
  const pulse = projection.pulse;

  const sectionMap = useMemo(() => {
    const map = new Map<InternalPanel, React.ReactNode>();
    const trailing: React.ReactNode[] = [];

    Children.forEach(children, (child) => {
      if (!isValidElement<{ id?: string }>(child)) {
        trailing.push(child);
        return;
      }

      const id =
        typeof child.props.id === "string"
          ? child.props.id
          : "";

      const panel = panelBySectionId[id];

      if (panel) {
        map.set(panel, child);
      } else {
        trailing.push(child);
      }
    });

    return { map, trailing };
  }, [children]);

  const statistics = [
    {
      label: "New RFQs",
      value: pulse.newLeads,
      panel: "work" as InternalPanel,
      tone: "blue",
    },
    {
      label: "Conversations",
      value: pulse.unreadConversations,
      href: "/dashboard/vendor/inbox",
      tone: "green",
    },
    {
      label: "Unread Alerts",
      value: pulse.alerts,
      href: "/dashboard/vendor/notifications",
      tone: "orange",
    },
    {
      label: "Price Signals",
      value: pulse.priceSignals,
      href: "/vendor/price-updates/new",
      tone: "purple",
    },
    {
      label: "Overall Readiness",
      value: `${projection.readiness.score}%`,
      panel: "health" as InternalPanel,
      tone: "teal",
    },
  ];

  const overviewCards = [
    {
      panel: "mission" as InternalPanel,
      eyebrow: "Executive Mission",
      title: "Run today's business from one clear place",
      detail:
        "Review the work that needs human attention first.",
    },
    {
      panel: "work" as InternalPanel,
      eyebrow: "Human-First Work",
      title:
        projection.workNow[0]?.label ||
        "Your essential work is under control",
      detail:
        projection.workNow[0]?.detail ||
        "Open the work centre when a new responsibility appears.",
    },
    {
      panel: "health" as InternalPanel,
      eyebrow: "Business Health",
      title: `${projection.readiness.score}% — ${projection.readiness.label}`,
      detail:
        "Review the essential conditions that support trust, response and discovery.",
    },
    {
      panel: "growth" as InternalPanel,
      eyebrow: "Business Growth",
      title: `Present plan: ${projection.growth.plan}`,
      detail: projection.growth.guidance,
    },
    {
      panel: "pulse" as InternalPanel,
      eyebrow: "Business Pulse",
      title: `${pulse.alerts + pulse.newLeads + pulse.unreadConversations} active signals`,
      detail:
        "Review live business activity and act only where attention is required.",
    },
    {
      panel: "navigation" as InternalPanel,
      eyebrow: "Workspace Navigation",
      title: "Open every authorised business workspace",
      detail:
        "Sell, operate, grow and manage your business through one organised system.",
    },
  ];

  const activeSection =
    activePanel === "overview"
      ? null
      : sectionMap.map.get(activePanel);

  return (
    <div
      data-v12-zero-scroll-dashboard="active"
      className="vendor-app-shell"
    >
      <aside className="vendor-app-sidebar">
        <div className="vendor-profile-card">
          <div className="vendor-profile-avatar">
            {initials(identity)}
          </div>

          <div className="vendor-profile-name">{identity}</div>

          <div className="vendor-profile-email">
            {email || "Vendor workspace"}
          </div>

          <div className="vendor-profile-status">
            ✓ Active workspace
          </div>

          <a
            href="/onboarding/business"
            className="vendor-profile-button"
          >
            View My Profile
          </a>
        </div>

        <nav aria-label="Vendor dashboard navigation">
          {menu.map((item) =>
            item.type === "panel" ? (
              <button
                key={`${item.label}-${item.panel}`}
                type="button"
                onClick={() => {
                  setActivePanel(item.panel);
                  window.scrollTo({
                    top: 0,
                    behavior: "smooth",
                  });
                }}
                className={`vendor-menu-item ${
                  activePanel === item.panel
                    ? "vendor-menu-active"
                    : ""
                }`}
              >
                <span className="vendor-menu-icon">
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </button>
            ) : (
              <a
                key={`${item.label}-${item.href}`}
                href={item.href}
                className="vendor-menu-item"
              >
                <span className="vendor-menu-icon">
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </a>
            )
          )}
        </nav>

        <div className="vendor-sidebar-support">
          <strong>Need Help?</strong>
          <span>
            Our support team is ready to assist you.
          </span>
          <a href="/support/my">Contact Support</a>
        </div>
      </aside>

      <section className="vendor-app-content">
        <header className="vendor-dashboard-welcome">
          <div>
            <div className="vendor-page-kicker">
              {panelLabel(activePanel)}
            </div>

            <h1>
              {activePanel === "overview"
                ? `Welcome back, ${identity}`
                : panelLabel(activePanel)}
            </h1>

            <p>
              {activePanel === "overview"
                ? "Here is what is happening with your business today."
                : "Review this workspace without losing your dashboard context."}
            </p>
          </div>

          {activePanel !== "overview" ? (
            <button
              type="button"
              onClick={() => setActivePanel("overview")}
              className="vendor-overview-button"
            >
              ← Back to Dashboard
            </button>
          ) : (
            <a
              href="/dashboard/vendor/workspace"
              className="vendor-overview-button"
            >
              Open Unified Workspace
            </a>
          )}
        </header>

        <div className="vendor-mobile-panels">
          {(
            [
              "overview",
              "work",
              "health",
              "growth",
              "pulse",
              "navigation",
            ] as InternalPanel[]
          ).map((panel) => (
            <button
              type="button"
              key={panel}
              onClick={() => setActivePanel(panel)}
              className={
                activePanel === panel ? "active" : ""
              }
            >
              {panelLabel(panel)}
            </button>
          ))}
        </div>

        {activePanel === "overview" ? (
          <>
            <section className="vendor-kpi-grid">
              {statistics.map((item) => {
                const className = `vendor-kpi-card vendor-kpi-${item.tone}`;

                if (item.href) {
                  return (
                    <a
                      key={item.label}
                      href={item.href}
                      className={className}
                    >
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                      <small>Open now →</small>
                    </a>
                  );
                }

                return (
                  <button
                    type="button"
                    key={item.label}
                    onClick={() =>
                      item.panel &&
                      setActivePanel(item.panel)
                    }
                    className={className}
                  >
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                    <small>Review →</small>
                  </button>
                );
              })}
            </section>

            {projection.workNow.length > 0 ? (
              <section className="vendor-action-strip">
                {projection.workNow
                  .slice(0, 3)
                  .map((action, index) => (
                    <a
                      key={action.key}
                      href={action.href}
                    >
                      <small>
                        {index === 0
                          ? "Recommended next action"
                          : "Work now"}
                      </small>
                      <strong>{action.label}</strong>
                      <span>{action.detail}</span>
                    </a>
                  ))}
              </section>
            ) : null}

            <section className="vendor-overview-grid">
              {overviewCards.map((card) => (
                <button
                  type="button"
                  key={card.panel}
                  onClick={() =>
                    setActivePanel(card.panel)
                  }
                  className={`vendor-overview-card vendor-overview-${card.panel}`}
                >
                  <small>{card.eyebrow}</small>
                  <strong>{card.title}</strong>
                  <span>{card.detail}</span>
                  <b>Open workspace →</b>
                </button>
              ))}
            </section>
          </>
        ) : (
          <div
            className="vendor-focused-workspace"
            data-active-vendor-panel={activePanel}
          >
            {activeSection || (
              <div className="vendor-panel-missing">
                This workspace is temporarily unavailable.
              </div>
            )}
          </div>
        )}

        <div className="vendor-shell-continuity">
          {sectionMap.trailing}
        </div>
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
          width: 100%;
          align-items: center;
          gap: 10px;
          margin: 0 0 3px;
          padding: 10px 11px;
          border: 0;
          border-radius: 11px;
          color: #334155;
          background: transparent;
          text-align: left;
          text-decoration: none;
          font-family: inherit;
          font-size: 12px;
          font-weight: 850;
          cursor: pointer;
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
          flex: 0 0 auto;
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

        .vendor-page-kicker {
          margin-bottom: 5px;
          color: #2563eb;
          font-size: 10px;
          font-weight: 950;
          letter-spacing: 0.12em;
          text-transform: uppercase;
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

        .vendor-overview-button {
          padding: 11px 15px;
          border: 0;
          border-radius: 12px;
          color: #ffffff;
          background: #2563eb;
          text-decoration: none;
          font-family: inherit;
          font-size: 12px;
          font-weight: 900;
          white-space: nowrap;
          cursor: pointer;
        }

        .vendor-mobile-panels {
          display: none;
        }

        .vendor-kpi-grid {
          display: grid;
          grid-template-columns:
            repeat(auto-fit, minmax(150px, 1fr));
          gap: 12px;
          margin-bottom: 18px;
        }

        .vendor-kpi-card {
          min-height: 125px;
          padding: 17px;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          color: inherit;
          background: #ffffff;
          box-shadow: 0 8px 22px rgba(15, 23, 42, 0.05);
          text-align: left;
          text-decoration: none;
          font-family: inherit;
          cursor: pointer;
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
          font-size: 31px;
          font-weight: 950;
        }

        .vendor-kpi-card small {
          display: block;
          margin-top: 10px;
          font-size: 10px;
          font-weight: 900;
        }

        .vendor-kpi-blue small {
          color: #2563eb;
        }

        .vendor-kpi-green small {
          color: #059669;
        }

        .vendor-kpi-orange {
          background: #fffaf0;
        }

        .vendor-kpi-orange small {
          color: #ea580c;
        }

        .vendor-kpi-purple small {
          color: #7c3aed;
        }

        .vendor-kpi-teal small {
          color: #0f766e;
        }

        .vendor-action-strip {
          display: grid;
          grid-template-columns:
            repeat(auto-fit, minmax(230px, 1fr));
          gap: 12px;
          margin-bottom: 18px;
        }

        .vendor-action-strip a {
          display: grid;
          gap: 5px;
          padding: 16px;
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
          font-size: 14px;
          font-weight: 950;
        }

        .vendor-action-strip span {
          color: #64748b;
          font-size: 11px;
          line-height: 1.5;
          font-weight: 700;
        }

        .vendor-overview-grid {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .vendor-overview-card {
          display: grid;
          min-height: 175px;
          gap: 8px;
          padding: 20px;
          border: 1px solid #e2e8f0;
          border-radius: 21px;
          color: inherit;
          background: #ffffff;
          text-align: left;
          font-family: inherit;
          cursor: pointer;
        }

        .vendor-overview-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
        }

        .vendor-overview-card small {
          font-size: 9px;
          font-weight: 950;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .vendor-overview-card strong {
          color: #0f172a;
          font-size: 18px;
          line-height: 1.25;
          font-weight: 950;
        }

        .vendor-overview-card span {
          color: #64748b;
          font-size: 12px;
          line-height: 1.55;
          font-weight: 700;
        }

        .vendor-overview-card b {
          align-self: end;
          font-size: 11px;
        }

        .vendor-overview-mission {
          background: #f8faff;
        }

        .vendor-overview-mission small,
        .vendor-overview-mission b {
          color: #2563eb;
        }

        .vendor-overview-work {
          background: #f3fdf8;
        }

        .vendor-overview-work small,
        .vendor-overview-work b {
          color: #047857;
        }

        .vendor-overview-health {
          background: #f3fbff;
        }

        .vendor-overview-health small,
        .vendor-overview-health b {
          color: #0369a1;
        }

        .vendor-overview-growth {
          background: #fbf7ff;
        }

        .vendor-overview-growth small,
        .vendor-overview-growth b {
          color: #7c3aed;
        }

        .vendor-overview-pulse {
          background: #fffaf0;
        }

        .vendor-overview-pulse small,
        .vendor-overview-pulse b {
          color: #c2410c;
        }

        .vendor-overview-navigation small,
        .vendor-overview-navigation b {
          color: #475569;
        }

        .vendor-focused-workspace {
          animation: vendor-panel-enter 180ms ease-out;
        }

        .vendor-shell-continuity {
          margin-top: 12px;
        }

        .vendor-panel-missing {
          padding: 28px;
          border: 1px dashed #cbd5e1;
          border-radius: 18px;
          color: #64748b;
          background: #ffffff;
          text-align: center;
          font-weight: 800;
        }

        @keyframes vendor-panel-enter {
          from {
            opacity: 0;
            transform: translateY(5px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
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
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .vendor-mobile-panels {
            display: flex;
            gap: 7px;
            margin-bottom: 16px;
            padding-bottom: 5px;
            overflow-x: auto;
          }

          .vendor-mobile-panels button {
            flex: 0 0 auto;
            padding: 8px 11px;
            border: 1px solid #e2e8f0;
            border-radius: 999px;
            color: #475569;
            background: #ffffff;
            font-family: inherit;
            font-size: 10px;
            font-weight: 900;
          }

          .vendor-mobile-panels button.active {
            color: #ffffff;
            border-color: #2563eb;
            background: #2563eb;
          }
        }

        @media (max-width: 680px) {
          .vendor-app-shell {
            padding: 14px 10px 28px;
          }

          nav {
            grid-template-columns: 1fr;
          }

          .vendor-dashboard-welcome {
            flex-direction: column;
          }

          .vendor-overview-button {
            width: 100%;
            text-align: center;
          }

          .vendor-overview-grid {
            grid-template-columns: 1fr;
          }

          .vendor-kpi-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .vendor-kpi-card {
            min-height: 105px;
          }

          .vendor-kpi-card strong {
            font-size: 25px;
          }
        }
      `}</style>
    </div>
  );
}
