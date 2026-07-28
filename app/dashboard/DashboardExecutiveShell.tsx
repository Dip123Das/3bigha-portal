"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type DashboardExecutiveShellProps = {
  role: string;
  rfqs: number;
  conversations: number;
  unreadAlerts: number;
  priceSignals: number;
  children: ReactNode;
};

function roleLabel(role: string) {
  const value = String(role || "member").trim().toLowerCase();

  if (value === "hub_vendor") return "Vendor Hub";
  if (value === "master_admin") return "Master Admin";
  if (value === "finance_banker") return "Finance Banker";

  return value
    .replace(/_/g, " ")
    .replace(/\\b\\w/g, (letter) => letter.toUpperCase());
}

const PRIMARY_NAV = [
  ["Dashboard", "/dashboard", "⌂"],
  ["Workspace", "/dashboard/workspace", "▦"],
  ["Vendor Work Desk", "/dashboard/vendor/workspace", "▤"],
  ["RFQ Work Desk", "/dashboard/buyer/rfqs", "▧"],
  ["Inbox", "/dashboard/inbox-v2", "✉"],
] as const;

const BUSINESS_NAV = [
  ["Business Profile", "/onboarding/business", "◆"],
  ["Subscription", "/dashboard/subscription", "★"],
  ["Settings", "/settings", "⚙"],
  ["Help & Support", "/support/my", "?"],
] as const;

export default function DashboardExecutiveShell({
  role,
  rfqs,
  conversations,
  unreadAlerts,
  priceSignals,
  children,
}: DashboardExecutiveShellProps) {
  const displayRole = roleLabel(role);

  return (
    <div className="d5Shell">
      <aside className="d5Sidebar" aria-label="Dashboard navigation">
        <div className="d5Brand">
          <div className="d5BrandMark">3B</div>
          <div>
            <strong>3Bigha</strong>
            <span>Business Operating System</span>
          </div>
        </div>

        <div className="d5Identity">
          <div className="d5Avatar">{displayRole.slice(0, 1)}</div>
          <div>
            <strong>{displayRole}</strong>
            <span>Active dashboard</span>
          </div>
        </div>

        <nav className="d5Nav">
          <div className="d5NavLabel">Work</div>
          {PRIMARY_NAV.map(([label, href, icon]) => (
            <Link key={href} href={href} className="d5NavLink">
              <span aria-hidden="true">{icon}</span>
              <b>{label}</b>
            </Link>
          ))}

          <div className="d5NavLabel d5NavLabelSpaced">Business & Account</div>
          {BUSINESS_NAV.map(([label, href, icon]) => (
            <Link key={href} href={href} className="d5NavLink">
              <span aria-hidden="true">{icon}</span>
              <b>{label}</b>
            </Link>
          ))}
        </nav>
      </aside>

      <main className="d5Main">
        <section className="d5Hero">
          <div>
            <div className="d5Eyebrow">CONSTITUTIONAL EXECUTIVE DASHBOARD</div>
            <h1>{displayRole} Dashboard</h1>
            <p>
              Your dashboard is the first place for work, priorities, business
              health and decisions. Workspace and settings open from here.
            </p>
          </div>

          <div className="d5HeroActions">
            <Link href="/dashboard/workspace">Open Workspace</Link>
            <Link href="/settings">Settings</Link>
          </div>
        </section>

        <section className="d5PriorityStrip" aria-label="Today's priorities">
          <div><span>Open RFQs</span><strong>{rfqs}</strong></div>
          <div><span>Conversations</span><strong>{conversations}</strong></div>
          <div><span>Unread Alerts</span><strong>{unreadAlerts}</strong></div>
          <div><span>Price Signals</span><strong>{priceSignals}</strong></div>
        </section>

        <div className="d5Content">{children}</div>
      </main>

      <aside className="d5RightRail" aria-label="Dashboard assistance">
        <section className="d5RailCard d5Copilot">
          <div className="d5RailTitle">3BOS AI Co-Pilot</div>
          <p>
            AI assists with priorities and signals. You remain in control of
            every business decision.
          </p>
          <Link href="/dashboard/procurement-copilot">Open AI Co-Pilot →</Link>
        </section>

        <section className="d5RailCard">
          <div className="d5RailTitle">Quick Actions</div>
          <div className="d5QuickGrid">
            <Link href="/rfq">New RFQ</Link>
            <Link href="/materials/add">List Material</Link>
            <Link href="/services/add">Add Service</Link>
            <Link href="/property/add">Add Property</Link>
          </div>
        </section>

        <section className="d5RailCard">
          <div className="d5RailTitle">Business Readiness</div>
          <div className="d5Readiness">
            <span style={{ width: unreadAlerts > 0 ? "72%" : "84%" }} />
          </div>
          <p>
            Keep profile, verification, listings and responses current to
            improve trust and marketplace readiness.
          </p>
          <Link href="/onboarding/business">Review Business Profile →</Link>
        </section>
      </aside>

      <style jsx>{`
        .d5Shell{width:100%;display:grid;grid-template-columns:250px minmax(0,1fr) 300px;gap:18px;padding:18px;background:radial-gradient(circle at top right,rgba(37,99,235,.08),transparent 28%),#f5f7fb;min-height:calc(100vh - 120px)}
        .d5Sidebar,.d5RightRail{min-width:0}.d5Sidebar{position:sticky;top:14px;align-self:start;border:1px solid #dbe3ef;border-radius:22px;background:#fff;padding:16px;box-shadow:0 18px 45px rgba(15,23,42,.07)}
        .d5Brand,.d5Identity{display:flex;align-items:center;gap:11px}.d5BrandMark,.d5Avatar{display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;border-radius:14px;font-weight:950}
        .d5BrandMark{width:42px;height:42px;background:#2563eb;color:#fff}.d5Brand strong,.d5Identity strong{display:block;color:#0f172a;font-size:14px}.d5Brand span,.d5Identity span{display:block;margin-top:2px;color:#64748b;font-size:10px;font-weight:800}
        .d5Identity{margin-top:16px;padding:12px;border:1px solid #dbeafe;border-radius:16px;background:#eff6ff}.d5Avatar{width:38px;height:38px;border-radius:50%;color:#1d4ed8;background:#fff;border:2px solid #bfdbfe}
        .d5Nav{margin-top:16px;display:grid;gap:5px}.d5NavLabel{padding:7px 10px 3px;color:#94a3b8;font-size:10px;font-weight:950;letter-spacing:.08em;text-transform:uppercase}.d5NavLabelSpaced{margin-top:10px}
        .d5NavLink{display:flex;align-items:center;gap:10px;min-height:42px;padding:9px 11px;border-radius:12px;color:#334155;text-decoration:none;font-size:13px}.d5NavLink:hover{background:#eff6ff;color:#1d4ed8}
        .d5Main{min-width:0}.d5Hero{display:flex;justify-content:space-between;align-items:flex-start;gap:18px;padding:22px;border:1px solid #dbe3ef;border-radius:22px;background:linear-gradient(135deg,#fff 0%,#eff6ff 100%);box-shadow:0 14px 38px rgba(15,23,42,.06)}
        .d5Eyebrow{color:#2563eb;font-size:10px;font-weight:950;letter-spacing:.09em}.d5Hero h1{margin:6px 0 0;color:#0f172a;font-size:clamp(24px,3vw,36px);line-height:1.08}.d5Hero p{max-width:760px;margin:9px 0 0;color:#475569;line-height:1.6;font-weight:700}
        .d5HeroActions{display:flex;gap:8px;flex-wrap:wrap}.d5HeroActions a,.d5RailCard a{text-decoration:none;font-weight:900}.d5HeroActions a{padding:10px 13px;border-radius:11px;background:#2563eb;color:#fff;white-space:nowrap}.d5HeroActions a+a{background:#fff;color:#1d4ed8;border:1px solid #bfdbfe}
        .d5PriorityStrip{margin-top:14px;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.d5PriorityStrip>div{min-width:0;padding:14px;border:1px solid #dbe3ef;border-radius:16px;background:#fff}.d5PriorityStrip span{display:block;color:#64748b;font-size:11px;font-weight:900}.d5PriorityStrip strong{display:block;margin-top:5px;color:#0f172a;font-size:24px}
        .d5Content{margin-top:14px;min-width:0}.d5RightRail{display:grid;gap:14px;align-content:start}.d5RailCard{border:1px solid #dbe3ef;border-radius:20px;background:#fff;padding:16px;box-shadow:0 12px 32px rgba(15,23,42,.05)}
        .d5Copilot{background:linear-gradient(150deg,#172554 0%,#1e3a8a 100%);border-color:#1e3a8a}.d5RailTitle{color:#0f172a;font-size:15px;font-weight:950}.d5Copilot .d5RailTitle,.d5Copilot p,.d5Copilot a{color:#fff}
        .d5RailCard p{margin:8px 0 0;color:#64748b;font-size:12px;line-height:1.55;font-weight:750}.d5RailCard a{display:inline-flex;margin-top:11px;color:#2563eb;font-size:12px}
        .d5QuickGrid{margin-top:10px;display:grid;grid-template-columns:1fr 1fr;gap:8px}.d5QuickGrid a{margin:0;display:flex;min-height:62px;align-items:center;justify-content:center;padding:8px;border:1px solid #dbeafe;border-radius:12px;background:#f8fafc;text-align:center;color:#1e3a8a}
        .d5Readiness{height:9px;margin-top:12px;overflow:hidden;border-radius:999px;background:#e2e8f0}.d5Readiness span{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#2563eb,#16a34a)}
        @media(max-width:1180px){.d5Shell{grid-template-columns:220px minmax(0,1fr)}.d5RightRail{grid-column:1/-1;grid-template-columns:repeat(3,minmax(0,1fr))}}
        @media(max-width:820px){.d5Shell{display:block;padding:10px}.d5Sidebar{position:static;margin-bottom:12px}.d5Nav{grid-template-columns:repeat(2,minmax(0,1fr))}.d5NavLabel{grid-column:1/-1}.d5Hero{display:block}.d5HeroActions{margin-top:14px}.d5PriorityStrip{grid-template-columns:repeat(2,minmax(0,1fr))}.d5RightRail{margin-top:14px;grid-template-columns:1fr}}
        @media(max-width:520px){.d5Nav{grid-template-columns:1fr}.d5PriorityStrip{grid-template-columns:1fr 1fr}.d5HeroActions a{width:100%;justify-content:center;text-align:center}}
      `}</style>
    </div>
  );
}
