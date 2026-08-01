"use client";

import React, { Children, isValidElement, useMemo, useState } from "react";
import type { VendorWorkspaceProjection } from "@/lib/3bos/vendor/resolve-vendor-workspace-projection";

type Props = {
  projection: VendorWorkspaceProjection;
  email?: string | null;
  registeredName?: string | null;
  verifiedSelfieUrl?: string | null;
  verifiedSelfie?: boolean;
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
  | { type: "panel"; label: string; detail: string; panel: InternalPanel; icon: string; tone: string }
  | { type: "route"; label: string; detail: string; href: string; icon: string; tone: string };

const menu: MenuItem[] = [
  { type: "panel", label: "Dashboard", detail: "Business overview", panel: "overview", icon: "▦", tone: "blue" },
  { type: "route", label: "My Profile", detail: "Business & KYC", href: "/onboarding/business", icon: "●", tone: "blue" },
  { type: "route", label: "Unified Workspace", detail: "All business segments", href: "/dashboard/vendor/workspace", icon: "▤", tone: "indigo" },
  { type: "route", label: "Vendor Work Desk", detail: "Manage operations", href: "/dashboard/vendor/rfqs", icon: "▣", tone: "orange" },
  { type: "route", label: "My RFQs", detail: "Bids & opportunities", href: "/dashboard/vendor/rfqs", icon: "▥", tone: "red" },
  { type: "route", label: "Messages", detail: "Conversations", href: "/dashboard/vendor/inbox", icon: "◫", tone: "green" },
  { type: "panel", label: "Analytics", detail: "Performance insights", panel: "pulse", icon: "▧", tone: "purple" },
  { type: "route", label: "My Listings", detail: "Products & services", href: "/dashboard/vendor/master-data", icon: "▨", tone: "emerald" },
  { type: "route", label: "Subscription", detail: "Plan & billing", href: "/dashboard/subscription", icon: "◇", tone: "pink" },
  { type: "route", label: "Team & Users", detail: "Manage access", href: "/settings", icon: "⌘", tone: "cyan" },
  { type: "route", label: "Help & Support", detail: "Get assistance", href: "/support/my", icon: "?", tone: "amber" },
  { type: "route", label: "Settings", detail: "Account & preferences", href: "/settings", icon: "⚙", tone: "sky" },
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
  registeredName,
  verifiedSelfieUrl,
  verifiedSelfie = false,
  children,
}: Props) {
  const [activePanel, setActivePanel] =
    useState<InternalPanel>("overview");
  const [photoOpen, setPhotoOpen] = useState(false);

  const identity = projection.identity.title || "Vendor Hub";
  const humanName = String(registeredName || "").trim() ||
    String(email || "").split("@")[0] ||
    "3Bigha Member";
  const selfieUrl = verifiedSelfie ? String(verifiedSelfieUrl || "").trim() : "";
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
      data-v13-reference-dashboard="active"
      data-v12-zero-scroll-dashboard="active"
      className="vendor-app-shell"
    >
      <aside className="vendor-app-sidebar">
        <div className="vendor-profile-card">
          <button
            type="button"
            className="vendor-profile-avatar"
            onClick={() => selfieUrl && setPhotoOpen(true)}
            aria-label={selfieUrl ? "Open verified selfie" : "Profile initials"}
          >
            {selfieUrl ? (
              <img src={selfieUrl} alt={`${humanName} verified registration selfie`} />
            ) : (
              initials(humanName)
            )}
          </button>

          <div className="vendor-profile-name">{humanName}</div>
          <div className="vendor-profile-plan">{identity}</div>

          <div className="vendor-profile-email">
            {email || "Vendor workspace"}
          </div>

          <div className="vendor-profile-status">
            {selfieUrl ? "✓ Verified live identity" : "Live selfie required"}
          </div>

          <a
            href="/onboarding/business"
            className="vendor-profile-button"
          >
            View My Profile
          </a>
          <a
            href="/onboarding/business#sec-selfie"
            className="vendor-selfie-retake"
          >
            Retake Verified Live Selfie
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
                <span className={`vendor-menu-icon tone-${item.tone}`}>
                  {item.icon}
                </span>
                <span className="vendor-menu-copy">
                  <strong>{item.label}</strong>
                  <small>{item.detail}</small>
                </span>
              </button>
            ) : (
              <a
                key={`${item.label}-${item.href}`}
                href={item.href}
                className="vendor-menu-item"
              >
                <span className={`vendor-menu-icon tone-${item.tone}`}>
                  {item.icon}
                </span>
                <span className="vendor-menu-copy">
                  <strong>{item.label}</strong>
                  <small>{item.detail}</small>
                </span>
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
                ? `Welcome, ${humanName}! 👋`
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
                    <a key={item.label} href={item.href} className={className}>
                      <span>{item.label}</span><strong>{item.value}</strong><small>Open now →</small>
                    </a>
                  );
                }
                return (
                  <button type="button" key={item.label} onClick={() => item.panel && setActivePanel(item.panel)} className={className}>
                    <span>{item.label}</span><strong>{item.value}</strong><small>Review →</small>
                  </button>
                );
              })}
            </section>

            {projection.workNow.length > 0 ? (
              <section className="vendor-action-strip">
                {projection.workNow.slice(0, 3).map((action, index) => (
                  <a key={action.key} href={action.href}>
                    <small>{index === 0 ? "Recommended Next Action" : "Work Now"}</small>
                    <strong>{action.label}</strong><span>{action.detail}</span><b>Open →</b>
                  </a>
                ))}
              </section>
            ) : null}

            <section className="vendor-reference-hero">
              <button type="button" onClick={() => setActivePanel("mission")} className="vendor-reference-mission">
                <div><small>Executive Mission</small><h2>Run today&apos;s business from one clear place</h2><p>Review the work that needs human attention first. Business signals and AI guidance remain available to support your final decision.</p></div>
                <div className="vendor-reference-art"><span>↗</span><i>▥</i><b>◈</b></div>
              </button>
              <button type="button" onClick={() => setActivePanel("health")} className="vendor-reference-readiness">
                <small>Business Readiness</small><strong>{projection.readiness.score}/100</strong><b>{projection.readiness.label}</b><span>{projection.identity.capabilityCount} active business segments</span><em>View Readiness Details</em>
              </button>
            </section>

            <section className="vendor-reference-three">
              <button type="button" onClick={() => setActivePanel("growth")}><small>Business Guidance</small><strong>{projection.growth.guidance}</strong><span>Focus on the strongest practical improvement first.</span><b>Go to Growth Centre</b></button>
              <button type="button" onClick={() => setActivePanel("work")}><small>Human-First Work</small><strong>What should I do now?</strong><span>{projection.workNow[0]?.label || "Start with the first responsible business action."}</span><b>Open Work Centre</b></button>
              <a href="/onboarding/business"><small>Start Here</small><strong>{projection.identity.profileComplete ? "Business profile complete" : "Complete your business profile"}</strong><span>Improve trust and matching accuracy with complete information.</span><div className="vendor-reference-progress"><i style={{ width: `${projection.identity.profilePercent}%` }} /><em>{projection.identity.profilePercent}%</em></div><b>Continue Profile</b></a>
            </section>

            <section className="vendor-reference-block">
              <div className="vendor-reference-title"><div><small>Business Health Centre</small><h2>Is my business foundation healthy?</h2><p>See the essential conditions that help buyers discover, trust and respond to your business.</p></div><button type="button" onClick={() => setActivePanel("health")}><span>Overall Readiness</span><strong>{projection.readiness.score}%</strong><small>{projection.readiness.label}</small></button></div>
              <div className="vendor-reference-metrics">
                <article><span>Business Profile</span><strong>{projection.identity.profileComplete ? "Complete" : `${projection.identity.profilePercent}%`}</strong><small>Your essential business information.</small></article>
                <article><span>Capabilities</span><strong>{projection.identity.capabilityCount}</strong><small>Active capabilities represented.</small></article>
                <article><span>Marketplace Visibility</span><strong>{projection.performance.visibilityScore}%</strong><small>Current discovery support.</small></article>
                <article><span>Buyer Response</span><strong>{projection.performance.replyRate}%</strong><small>Response performance.</small></article>
                <article><span>Deal Progress</span><strong>{projection.performance.closeRate}%</strong><small>Conversion progress.</small></article>
              </div>
            </section>

            <section className="vendor-reference-block vendor-reference-growth">
              <div className="vendor-reference-title"><div><small>Business Growth Operating Centre</small><h2>What should help my business grow next?</h2><p>Complete the strongest practical improvement first.</p></div><div className="vendor-reference-plan"><span>Present Growth Plan</span><strong>{projection.growth.plan}</strong><small>Status: {projection.growth.status}</small></div></div>
              <div className="vendor-reference-growth-cards">
                <button type="button" onClick={() => setActivePanel("work")}><small>Priority Growth Step</small><strong>Improve buyer response</strong><span>Faster and clearer replies can strengthen trust.</span><b>Take Action →</b></button>
                <button type="button" onClick={() => setActivePanel("health")}><small>Priority Growth Step</small><strong>Improve marketplace visibility</strong><span>Keep profile, capabilities and prices current.</span><b>Take Action →</b></button>
                <a href="/vendor-opportunities"><small>Supporting Route</small><strong>Review marketplace opportunities</strong><span>Explore suitable demand around your business.</span><b>Review →</b></a>
                <a href="/vendor/price-updates/new"><small>Supporting Route</small><strong>Keep market prices current</strong><span>Publish genuine price information buyers understand.</span><b>Review →</b></a>
                <a href="/dashboard/subscription"><small>Supporting Route</small><strong>Review your growth plan</strong><span>Consider paid support only when a real need appears.</span><b>Review →</b></a>
              </div>
            </section>

            <section className="vendor-reference-block">
              <div className="vendor-reference-title"><div><small>Unified Business Pulse</small><h2>What is happening in my business?</h2><p>Review live business activity in one place.</p></div><button type="button" onClick={() => setActivePanel("pulse")}><strong>{pulse.alerts + pulse.newLeads + pulse.unreadConversations}</strong><span>Active Business Signals</span></button></div>
              <div className="vendor-reference-pulse">
                <article><span>New requirements</span><strong>{pulse.newLeads}</strong><small>Buyer requirements waiting.</small></article><article><span>Buyer conversations</span><strong>{pulse.unreadConversations}</strong><small>Unread discussions needing reply.</small></article><article><span>Ready deals</span><strong>{pulse.readyDeals}</strong><small>Deals showing closing readiness.</small></article><article><span>Follow-ups</span><strong>{pulse.missedLeads}</strong><small>Leads needing attention.</small></article><article className="vendor-reference-alert"><span>Vendor alerts</span><strong>{pulse.alerts}</strong><small>Important operational notifications.</small></article><article><span>Price signals</span><strong>{pulse.priceSignals}</strong><small>Recent market activity.</small></article>
              </div>
            </section>

            <section className="vendor-reference-block">
              <div className="vendor-reference-title"><div><small>Workspace Navigation</small><h2>Where do I go to run my business?</h2><p>Choose the kind of work you want to perform.</p></div></div>
              <div className="vendor-reference-groups">{projection.navigation.map((group) => (<article key={group.key} className={`group-${group.key}`}><h3>{group.label}</h3><p>{group.purpose}</p>{group.items.slice(0,4).map((item) => <a key={item.key} href={item.href}><span>{item.label}</span><b>→</b></a>)}</article>))}</div>
            </section>
          </>
        ) : (
          <div className="vendor-focused-workspace" data-active-vendor-panel={activePanel}>
            {activeSection || <div className="vendor-panel-missing">This workspace is temporarily unavailable.</div>}
          </div>
        )}

        <div className="vendor-shell-continuity">
          {sectionMap.trailing}
        </div>
      </section>

      {photoOpen && selfieUrl ? (
        <div
          className="vendor-photo-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Verified registration selfie"
          onClick={() => setPhotoOpen(false)}
        >
          <div className="vendor-photo-dialog" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="vendor-photo-close"
              onClick={() => setPhotoOpen(false)}
              aria-label="Close photo viewer"
            >
              ×
            </button>
            <img src={selfieUrl} alt={`${humanName} verified registration selfie`} />
            <div className="vendor-photo-caption">
              <strong>{humanName}</strong>
              <span>Verified live-camera registration selfie</span>
            </div>
            <div className="vendor-photo-actions">
              <a href="/onboarding/business">View Profile</a>
              <a href="/onboarding/business#sec-selfie">Retake Verified Live Selfie</a>
            </div>
          </div>
        </div>
      ) : null}

      <style jsx>{`

        /* V14_VERIFIED_HUMAN_IDENTITY_DASHBOARD */
        .vendor-app-shell {
          grid-template-columns: 236px minmax(0, 1fr);
          gap: 14px;
          padding: 14px clamp(10px, 1.4vw, 22px) 28px;
        }

        .vendor-profile-card {
          padding: 15px 14px 13px;
        }

        .vendor-profile-avatar {
          overflow: hidden;
          padding: 0;
          border: 0;
          cursor: pointer;
        }

        .vendor-profile-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .vendor-profile-name { margin-top: 9px; }
        .vendor-profile-plan { margin-top: 2px; }
        .vendor-profile-status { margin-top: 7px; }
        .vendor-profile-button { margin-top: 9px; padding: 8px 10px; }

        .vendor-selfie-retake {
          display: block;
          margin-top: 7px;
          padding: 8px 10px;
          border: 1px solid #bfdbfe;
          border-radius: 10px;
          color: #1d4ed8;
          background: #eff6ff;
          text-decoration: none;
          font-size: 10px;
          font-weight: 900;
        }

        nav { padding: 8px; }
        .vendor-menu-item { margin-bottom: 1px; padding: 7px 8px; }
        .vendor-dashboard-welcome { margin-bottom: 11px; }
        .vendor-kpi-grid, .vendor-action-strip { margin-bottom: 11px; }
        .vendor-reference-hero, .vendor-reference-three, .vendor-reference-block { margin-top: 11px; }
        .vendor-reference-block { padding: 14px; }
        .vendor-sidebar-support { margin: 8px; padding: 11px; }

        .vendor-photo-modal {
          position: fixed;
          inset: 0;
          z-index: 10000;
          display: grid;
          place-items: center;
          padding: 20px;
          background: rgba(2, 6, 23, 0.78);
          backdrop-filter: blur(8px);
        }

        .vendor-photo-dialog {
          position: relative;
          width: min(92vw, 520px);
          padding: 14px;
          border-radius: 22px;
          background: #ffffff;
          box-shadow: 0 30px 80px rgba(2, 6, 23, 0.4);
        }

        .vendor-photo-dialog > img {
          display: block;
          width: 100%;
          max-height: 68vh;
          object-fit: contain;
          border-radius: 16px;
          background: #0f172a;
        }

        .vendor-photo-close {
          position: absolute;
          top: 22px;
          right: 22px;
          z-index: 2;
          display: grid;
          place-items: center;
          width: 34px;
          height: 34px;
          border: 0;
          border-radius: 50%;
          color: #ffffff;
          background: rgba(15, 23, 42, 0.78);
          font-size: 24px;
          cursor: pointer;
        }

        .vendor-photo-caption {
          display: grid;
          gap: 3px;
          padding: 12px 3px 6px;
        }

        .vendor-photo-caption strong { font-size: 16px; }
        .vendor-photo-caption span { color: #64748b; font-size: 11px; }

        .vendor-photo-actions {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
          margin-top: 7px;
        }

        .vendor-photo-actions a {
          padding: 10px;
          border-radius: 10px;
          color: #ffffff;
          background: #2563eb;
          text-align: center;
          text-decoration: none;
          font-size: 11px;
          font-weight: 900;
        }

        .vendor-photo-actions a:last-child {
          color: #1d4ed8;
          border: 1px solid #bfdbfe;
          background: #eff6ff;
        }
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

        .vendor-app-shell{grid-template-columns:230px minmax(0,1fr);gap:22px;background:#f8fafc}.vendor-app-sidebar{border:0;box-shadow:none;background:transparent}.vendor-profile-card{border:1px solid #e5e7eb;border-radius:18px;background:#fff;box-shadow:0 8px 24px rgba(15,23,42,.04)}.vendor-profile-plan{margin-top:3px;color:#64748b;font-size:11px;font-weight:750}.vendor-menu-item{padding:9px 10px}.vendor-menu-copy{display:grid;gap:1px;min-width:0}.vendor-menu-copy strong{font-size:11px}.vendor-menu-copy small{color:#94a3b8;font-size:9px;font-weight:700}.vendor-menu-icon{color:#fff}.tone-blue{background:#2563eb}.tone-indigo{background:#4f46e5}.tone-orange{background:#f59e0b}.tone-red{background:#f43f5e}.tone-green{background:#10b981}.tone-purple{background:#7c3aed}.tone-emerald{background:#059669}.tone-pink{background:#ec4899}.tone-cyan{background:#0891b2}.tone-amber{background:#f59e0b}.tone-sky{background:#0ea5e9}.vendor-reference-hero{display:grid;grid-template-columns:1.8fr 1fr;gap:14px;margin-top:18px}.vendor-reference-mission,.vendor-reference-readiness{min-height:175px;padding:19px;border:1px solid #e5e7eb;border-radius:16px;background:#fff;text-align:left;font-family:inherit;cursor:pointer}.vendor-reference-mission{display:flex;align-items:center;justify-content:space-between;background:linear-gradient(135deg,#f8faff,#eef6ff)}.vendor-reference-mission>div:first-child{display:grid;gap:8px;max-width:62%}.vendor-reference-mission small,.vendor-reference-readiness small,.vendor-reference-three small,.vendor-reference-title small,.vendor-reference-growth-cards small{color:#5b21b6;font-size:8px;font-weight:950;text-transform:uppercase;letter-spacing:.08em}.vendor-reference-mission h2,.vendor-reference-title h2{margin:0;font-size:17px}.vendor-reference-mission p,.vendor-reference-title p{margin:0;color:#64748b;font-size:10px;line-height:1.55}.vendor-reference-art{position:relative;width:160px;height:120px}.vendor-reference-art span,.vendor-reference-art i,.vendor-reference-art b{position:absolute;display:grid;place-items:center;border-radius:18px;color:#fff;background:linear-gradient(145deg,#60a5fa,#2563eb);box-shadow:0 16px 30px rgba(37,99,235,.2)}.vendor-reference-art span{left:55px;top:15px;width:70px;height:70px;font-size:30px}.vendor-reference-art i{left:15px;bottom:10px;width:55px;height:55px;font-style:normal}.vendor-reference-art b{right:0;bottom:6px;width:58px;height:58px}.vendor-reference-readiness{display:grid;gap:9px}.vendor-reference-readiness>strong{font-size:27px}.vendor-reference-readiness>b{color:#059669;font-size:12px}.vendor-reference-readiness>span{color:#64748b;font-size:9px}.vendor-reference-readiness>em{justify-self:start;padding:7px 10px;border:1px solid #bfdbfe;border-radius:8px;color:#2563eb;font-size:9px;font-style:normal;font-weight:900}.vendor-reference-three{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-top:16px}.vendor-reference-three>button,.vendor-reference-three>a{display:grid;min-height:138px;gap:7px;padding:16px;border:1px solid #e5e7eb;border-radius:15px;background:#fff;color:inherit;text-align:left;text-decoration:none;font-family:inherit;cursor:pointer}.vendor-reference-three strong{font-size:13px}.vendor-reference-three span{color:#64748b;font-size:9px;line-height:1.5}.vendor-reference-three b{align-self:end;justify-self:start;color:#2563eb;font-size:9px}.vendor-reference-progress{position:relative;height:8px;margin-top:3px;border-radius:999px;background:#e5e7eb}.vendor-reference-progress i{display:block;height:100%;border-radius:999px;background:#10b981}.vendor-reference-progress em{position:absolute;right:0;top:-24px;color:#059669;font-size:10px;font-style:normal;font-weight:950}.vendor-reference-block{margin-top:16px;padding:18px;border:1px solid #e5e7eb;border-radius:17px;background:#fff}.vendor-reference-title{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.vendor-reference-title>button{display:grid;min-width:165px;padding:11px;border:1px solid #bae6fd;border-radius:12px;background:#fff;text-align:left}.vendor-reference-title>button strong{font-size:21px}.vendor-reference-metrics{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin-top:14px}.vendor-reference-metrics article,.vendor-reference-pulse article{display:grid;gap:5px;padding:13px;border:1px solid #e5e7eb;border-radius:12px;background:#fff}.vendor-reference-metrics span,.vendor-reference-pulse span{font-size:9px;font-weight:850}.vendor-reference-metrics strong,.vendor-reference-pulse strong{font-size:18px}.vendor-reference-metrics small,.vendor-reference-pulse small{color:#64748b;font-size:8px;line-height:1.4}.vendor-reference-growth{background:linear-gradient(135deg,#fdfbff,#fff)}.vendor-reference-plan{display:grid;min-width:180px;padding:12px;border:1px solid #e9d5ff;border-radius:12px;background:#fff}.vendor-reference-plan span{font-size:8px}.vendor-reference-plan strong{font-size:21px}.vendor-reference-plan small{color:#059669;font-size:9px}.vendor-reference-growth-cards{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin-top:14px}.vendor-reference-growth-cards>button,.vendor-reference-growth-cards>a{display:grid;min-height:125px;gap:6px;padding:13px;border:1px solid #e5e7eb;border-radius:12px;color:inherit;background:#fff;text-align:left;text-decoration:none;font-family:inherit;cursor:pointer}.vendor-reference-growth-cards strong{font-size:10px}.vendor-reference-growth-cards span{color:#64748b;font-size:8px;line-height:1.45}.vendor-reference-growth-cards b{align-self:end;color:#2563eb;font-size:8px}.vendor-reference-pulse{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:9px;margin-top:14px}.vendor-reference-alert{background:#fffaf0!important;border-color:#fde68a!important}.vendor-reference-alert strong{color:#b45309}.vendor-reference-groups{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:14px}.vendor-reference-groups article{padding:14px;border:1px solid #e5e7eb;border-radius:13px}.vendor-reference-groups h3{margin:0;font-size:12px}.vendor-reference-groups p{min-height:34px;color:#64748b;font-size:8px;line-height:1.45}.vendor-reference-groups a{display:flex;justify-content:space-between;gap:8px;margin-top:5px;padding:8px;border:1px solid rgba(148,163,184,.22);border-radius:8px;color:inherit;background:#fff;text-decoration:none;font-size:8px;font-weight:800}.group-sell{background:#f0fdf4}.group-operate{background:#eff6ff}.group-grow{background:#faf5ff}.group-manage{background:#fff7ed}

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

        /* V14A_FINAL_DENSITY_OVERRIDE */
        .vendor-app-shell {
          grid-template-columns: 220px minmax(0, 1fr);
          gap: 14px;
          padding: 8px clamp(8px, 1vw, 14px) 18px;
        }

        .vendor-app-sidebar {
          top: 76px;
          max-height: calc(100vh - 86px);
          border-radius: 16px;
        }

        .vendor-profile-card {
          padding: 10px 10px 9px;
          border-radius: 14px;
        }

        .vendor-profile-avatar,
        .vendor-profile-avatar-button,
        .vendor-profile-avatar-image {
          width: 58px;
          height: 58px;
        }

        .vendor-profile-name {
          margin-top: 6px;
          font-size: 14px;
          line-height: 1.15;
        }

        .vendor-profile-plan,
        .vendor-profile-email {
          margin-top: 2px;
          font-size: 9px;
        }

        .vendor-profile-status {
          margin-top: 5px;
          padding: 3px 7px;
          font-size: 9px;
        }

        .vendor-profile-button,
        .vendor-selfie-retake {
          margin-top: 6px;
          padding: 6px 8px;
          font-size: 9px;
        }

        nav {
          padding: 5px;
        }

        .vendor-menu-item {
          gap: 7px;
          margin-bottom: 0;
          padding: 5px 7px;
          border-radius: 8px;
        }

        .vendor-menu-icon {
          width: 21px;
          height: 21px;
          border-radius: 6px;
          font-size: 9px;
        }

        .vendor-menu-copy strong {
          font-size: 9.5px;
          line-height: 1.15;
        }

        .vendor-menu-copy small {
          font-size: 7.5px;
          line-height: 1.15;
        }

        .vendor-sidebar-support {
          gap: 5px;
          margin: 5px;
          padding: 8px;
        }

        .vendor-dashboard-welcome {
          margin-bottom: 7px;
        }

        .vendor-page-kicker {
          margin-bottom: 2px;
          font-size: 8px;
        }

        .vendor-dashboard-welcome h1 {
          font-size: clamp(20px, 2.2vw, 28px);
          line-height: 1.1;
        }

        .vendor-dashboard-welcome p {
          margin-top: 3px;
          font-size: 10px;
        }

        .vendor-overview-button {
          padding: 8px 11px;
          font-size: 9px;
        }

        .vendor-kpi-grid {
          gap: 8px;
          margin-bottom: 7px;
        }

        .vendor-kpi-card {
          min-height: 88px;
          padding: 10px;
          border-radius: 12px;
        }

        .vendor-kpi-card strong {
          margin-top: 4px;
          font-size: 22px;
        }

        .vendor-kpi-card small {
          margin-top: 4px;
        }

        .vendor-action-strip {
          gap: 8px;
          margin-bottom: 7px;
        }

        .vendor-action-strip a {
          gap: 3px;
          padding: 10px;
          border-radius: 11px;
        }

        .vendor-reference-hero {
          gap: 8px;
          margin-top: 7px;
        }

        .vendor-reference-mission,
        .vendor-reference-readiness {
          min-height: 118px;
          padding: 12px;
          border-radius: 12px;
        }

        .vendor-reference-mission > div:first-child {
          gap: 4px;
        }

        .vendor-reference-art {
          width: 115px;
          height: 82px;
          transform: scale(.82);
          transform-origin: center right;
        }

        .vendor-reference-three {
          gap: 8px;
          margin-top: 7px;
        }

        .vendor-reference-three > button,
        .vendor-reference-three > a {
          min-height: 94px;
          gap: 4px;
          padding: 10px;
          border-radius: 11px;
        }

        .vendor-reference-block {
          margin-top: 7px;
          padding: 10px;
          border-radius: 12px;
        }

        .vendor-reference-title {
          gap: 9px;
        }

        .vendor-reference-title h2,
        .vendor-reference-mission h2 {
          font-size: 14px;
        }

        .vendor-reference-title p,
        .vendor-reference-mission p {
          font-size: 8px;
          line-height: 1.35;
        }

        .vendor-reference-title > button,
        .vendor-reference-plan {
          min-width: 140px;
          padding: 8px;
        }

        .vendor-reference-metrics,
        .vendor-reference-growth-cards,
        .vendor-reference-pulse,
        .vendor-reference-groups {
          gap: 7px;
          margin-top: 8px;
        }

        .vendor-reference-metrics article,
        .vendor-reference-pulse article,
        .vendor-reference-growth-cards > button,
        .vendor-reference-growth-cards > a {
          min-height: auto;
          gap: 3px;
          padding: 8px;
          border-radius: 9px;
        }

        .vendor-reference-groups article {
          padding: 9px;
          border-radius: 10px;
        }

        .vendor-reference-groups p {
          min-height: 24px;
        }

        .vendor-reference-groups a {
          margin-top: 3px;
          padding: 5px 6px;
        }

        .vendor-shell-continuity {
          margin-top: 5px;
        }


        /* V14B_READABLE_FINAL_OVERRIDE
           Final source-order correction: readable type, compact but not microscopic,
           and removal of the dashboard-only empty band below the global header. */
        .vendor-app-shell {
          grid-template-columns: 238px minmax(0, 1fr);
          gap: 18px;
          margin-top: -44px;
          padding: 16px clamp(14px, 1.5vw, 24px) 28px;
          font-size: 13px;
        }

        .vendor-profile-card {
          padding: 16px 14px 14px;
        }

        .vendor-profile-avatar,
        .vendor-profile-avatar-button,
        .vendor-profile-avatar-image,
        .vendor-profile-avatar img {
          width: 76px;
          height: 76px;
          border-radius: 50%;
          object-fit: cover;
        }

        .vendor-profile-name {
          margin-top: 9px;
          font-size: 16px;
          line-height: 1.25;
        }

        .vendor-profile-plan,
        .vendor-profile-email {
          font-size: 10px;
          line-height: 1.35;
        }

        .vendor-profile-status {
          padding: 5px 9px;
          font-size: 10px;
        }

        .vendor-profile-button,
        .vendor-selfie-retake {
          padding: 8px 10px;
          font-size: 10px;
        }

        nav {
          padding: 9px;
        }

        .vendor-menu-item {
          gap: 9px;
          padding: 8px 9px;
        }

        .vendor-menu-icon {
          width: 27px;
          height: 27px;
          font-size: 11px;
        }

        .vendor-menu-copy strong {
          font-size: 11px;
          line-height: 1.25;
        }

        .vendor-menu-copy small {
          font-size: 9px;
          line-height: 1.25;
        }

        .vendor-dashboard-welcome {
          margin-bottom: 12px;
        }

        .vendor-page-kicker {
          font-size: 9px;
        }

        .vendor-dashboard-welcome h1 {
          font-size: clamp(24px, 2.6vw, 34px);
        }

        .vendor-dashboard-welcome p {
          font-size: 12px;
        }

        .vendor-kpi-grid {
          gap: 12px;
          margin-bottom: 12px;
        }

        .vendor-kpi-card {
          min-height: 112px;
          padding: 15px;
        }

        .vendor-kpi-card span {
          font-size: 11px;
        }

        .vendor-kpi-card strong {
          margin-top: 7px;
          font-size: 28px;
        }

        .vendor-kpi-card small {
          margin-top: 7px;
          font-size: 10px;
        }

        .vendor-action-strip {
          gap: 10px;
          margin-bottom: 12px;
        }

        .vendor-action-strip a {
          padding: 14px;
        }

        .vendor-action-strip small {
          font-size: 9px;
        }

        .vendor-action-strip strong {
          font-size: 13px;
        }

        .vendor-action-strip span {
          font-size: 10px;
        }

        .vendor-reference-hero,
        .vendor-reference-three,
        .vendor-reference-block {
          margin-top: 12px;
        }

        .vendor-reference-mission,
        .vendor-reference-readiness {
          min-height: 150px;
          padding: 17px;
        }

        .vendor-reference-mission h2,
        .vendor-reference-title h2 {
          font-size: 18px;
        }

        .vendor-reference-mission p,
        .vendor-reference-title p {
          font-size: 11px;
          line-height: 1.5;
        }

        .vendor-reference-three > button,
        .vendor-reference-three > a {
          min-height: 122px;
          padding: 14px;
        }

        .vendor-reference-three small,
        .vendor-reference-title small,
        .vendor-reference-growth-cards small {
          font-size: 9px;
        }

        .vendor-reference-three strong {
          font-size: 14px;
        }

        .vendor-reference-three span {
          font-size: 10px;
        }

        .vendor-reference-block {
          padding: 16px;
        }

        .vendor-reference-metrics article,
        .vendor-reference-pulse article,
        .vendor-reference-growth-cards > button,
        .vendor-reference-growth-cards > a {
          padding: 12px;
        }

        .vendor-reference-metrics span,
        .vendor-reference-pulse span {
          font-size: 10px;
        }

        .vendor-reference-metrics strong,
        .vendor-reference-pulse strong {
          font-size: 19px;
        }

        .vendor-reference-metrics small,
        .vendor-reference-pulse small,
        .vendor-reference-growth-cards span {
          font-size: 9px;
          line-height: 1.45;
        }

        .vendor-reference-growth-cards strong {
          font-size: 11px;
        }

        .vendor-reference-groups h3 {
          font-size: 14px;
        }

        .vendor-reference-groups p,
        .vendor-reference-groups a {
          font-size: 9px;
        }

        @media (max-width: 980px) {
          .vendor-app-shell {
            margin-top: 0;
            padding: 12px;
          }
        }

      `}</style>
    </div>
  );
}
