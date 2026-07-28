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
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const NAV_ITEMS = [
  ["Dashboard", "/dashboard", "▦"],
  ["My Profile", "/settings", "♙"],
  ["Business Profile", "/onboarding/business", "▣"],
  ["My Listings", "/materials/my", "▤"],
  ["RFQ Work Desk", "/dashboard/buyer/rfqs", "◫"],
  ["Buyer Enquiries", "/dashboard/vendor/enquiries", "♧"],
  ["Vendor Analytics", "/dashboard/procurement-analytics", "⌁"],
  ["Orders & Deals", "/dashboard/vendor/workspace", "▢"],
  ["Payments & Billing", "/dashboard/vendor/billing", "▭"],
  ["Ratings & Reviews", "/vendor", "☆"],
  ["Predictive Prices", "/price-today", "⌁"],
  ["Learning & Knowledge", "/dashboard/procurement-memory-intelligence", "◇"],
  ["Subscription", "/dashboard/subscription", "◉"],
  ["Inbox", "/dashboard/inbox-v2", "✉"],
  ["Settings", "/settings", "⚙"],
] as const;

const PROFILE_ACTIONS = [
  ["My Profile", "Personal & Identity", "/settings", "♙", "blue"],
  ["Business Profile", "Company & Services", "/onboarding/business", "▣", "purple"],
  ["Settings", "Preferences & Security", "/settings", "⚙", "green"],
  ["Subscription", "Plans & Benefits", "/dashboard/subscription", "◇", "orange"],
  ["Help & Support", "We are with you", "/support/my", "?", "pink"],
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
  const completion = unreadAlerts > 50 ? 82 : 92;
  const momentum = Math.min(100, 35 + conversations * 8 + priceSignals * 5 + rfqs * 6);

  return (
    <div className="d5Shell">
      <aside className="d5Sidebar" aria-label="Dashboard navigation">
        <div className="d5SideIdentity">
          <strong>{displayRole}</strong>
          <span className="d5Verified">● Verified Vendor</span>
        </div>

        <nav className="d5Nav">
          {NAV_ITEMS.map(([label, href, icon], index) => (
            <Link key={href + label} href={href} className={`d5NavLink ${index === 0 ? "d5NavActive" : ""}`}>
              <span aria-hidden="true">{icon}</span>
              <b>{label}</b>
              {label === "RFQ Work Desk" && unreadAlerts > 0 ? <em>{unreadAlerts}</em> : null}
              {label === "Buyer Enquiries" && conversations > 0 ? <em>{conversations}</em> : null}
            </Link>
          ))}
        </nav>

        <section className="d5HelpCard">
          <strong>Need Help?</strong>
          <span>AI Assistant & Support</span>
          <Link href="/dashboard/procurement-copilot">Chat with 3Bigha AI</Link>
        </section>
      </aside>

      <main className="d5Main">
        <section className="d5IdentityHero">
          <div className="d5LogoOrb">SV</div>
          <div className="d5IdentityCopy">
            <div className="d5BusinessName">Swarnabhumi Ventures <span>✓</span></div>
            <div className="d5RoleLine">{displayRole} — Materials | Services | Rentals | Property</div>
            <div className="d5Location">⌖ Cooch Behar, West Bengal</div>
            <div className="d5Badges">
              <span>✓ Verified Vendor</span><span>✓ Active</span><span>◷ Since 2024</span>
            </div>
          </div>
          <div className="d5CompletionCard">
            <small>♛ Business Completion Score</small>
            <strong>{completion}<span>/100</span></strong>
            <div className="d5Progress"><i style={{ width: `${completion}%` }} /></div>
            <b>Excellent Profile – Highly Trusted</b>
          </div>
          <div className="d5HeroActions">
            <Link href="/onboarding/business">✎ Edit Profile</Link>
            <Link href="/vendor">View Public Profile</Link>
          </div>
        </section>

        <section className="d5ProfileActions">
          {PROFILE_ACTIONS.map(([title, detail, href, icon, tone]) => (
            <Link key={title} href={href} className={`d5ProfileAction ${tone}`}>
              <span>{icon}</span><div><strong>{title}</strong><small>{detail}</small></div>
            </Link>
          ))}
        </section>

        <section className="d5OperatingCenter">
          <div className="d5SectionHeading">
            <div><h2>Marketplace Operations Overview</h2><p>Live status of RFQs, conversations, vendor alerts, price signals and next actions.</p></div>
            <div className="d5StatusPills"><span>⚙ Analytics Score 100/100</span><span>● Live</span></div>
          </div>
          <div className="d5Kpis">
            {[
              ["RFQs for You", rfqs, "Active Now", "▦"],
              ["Conversations", conversations, "Active", "▤"],
              ["Vendor Alerts", unreadAlerts, "Unread", "♧"],
              ["Price Signals", priceSignals, "New", "⌁"],
              ["Purchase Orders", Math.max(0, Math.floor(conversations / 2)), "This Month", "▣"],
              ["Views on Profile", 1248, "All Time", "◉"],
            ].map(([label, value, note, icon]) => (
              <div className="d5Kpi" key={String(label)}><span>{icon} {label}</span><strong>{value}</strong><small>{note}</small></div>
            ))}
          </div>
          <div className="d5DecisionRow">
            <div><strong>👥 Workflow Forecast</strong><span>{momentum >= 60 ? "Strong procurement activity detected in your categories." : "Procurement activity is developing."}</span></div>
            <div><strong>🎯 Suggested Next Action</strong><span>{unreadAlerts > 0 ? "Clear unread vendor alerts and follow up active procurement threads." : "Review open opportunities and update your listings."}</span><Link href="/dashboard/vendor/notifications">Take Action →</Link></div>
          </div>
        </section>

        <div className="d5Content">{children}</div>

        <section className="d5BottomGrid">
          <div className="d5ActivityCard">
            <div className="d5MiniHeading"><strong>Recent Platform Activity</strong><Link href="/dashboard/inbox-v2">View All →</Link></div>
            <ul><li>New vendor alert received for Building Materials <small>2 hours ago</small></li><li>{conversations} active conversations from buyers <small>Today</small></li><li>Price signal update received <small>Yesterday</small></li><li>Business profile and listings remain visible <small>Live</small></li></ul>
          </div>
          <div className="d5MetricsCard">
            <div className="d5MiniHeading"><strong>My Business Metrics</strong><span>30D</span></div>
            <div className="d5Bars">
              {[78, 62, 46, 32].map((value, index) => (
                <div key={value}><i style={{ height: `${value}%` }} /><b>{["Profile Views", "RFQs Received", "Responses", "Deals"][index]}</b><small>{[1248, 32, 18, 6][index]}</small></div>
              ))}
            </div>
          </div>
          <div className="d5TrustCard">
            <strong>Why Buyers Choose You</strong>
            {["Verified & Reliable Vendor","Multi-Segment Services","Responsive Communication","Quality Commitment","On-Time Delivery"].map((item) => <span key={item}>✓ {item}</span>)}
          </div>
        </section>

        <section className="d5WorkspaceLinks">
          <strong>Your Workspace Quick Links</strong>
          <div><Link href="/marketplace">Marketplace</Link><Link href="/dashboard/vendor/workspace">Vendor Work Desk</Link><Link href="/dashboard/buyer/rfqs">RFQ Work Desk</Link><Link href="/dashboard/inbox-v2">Inbox</Link><Link href="/price-today">Predictive Prices</Link><Link href="/rfq">+ New RFQ</Link></div>
        </section>
      </main>

      <aside className="d5RightRail">
        <section className="d5RailCard d5AiCard">
          <strong>🤖 3Bigha AI Assistant</strong>
          <span>✓ Scan new RFQs for your categories</span><span>✓ Suggest best opportunities</span><span>✓ Predict demand in your area</span><span>✓ Alert for high value deals</span>
          <Link href="/dashboard/procurement-copilot">Ask 3Bigha AI</Link>
        </section>
        <section className="d5RailCard">
          <strong>⚡ Quick Actions</strong>
          <Link className="qa blue" href="/materials/add">+ Submit New Listing</Link>
          <Link className="qa green" href="/dashboard/vendor/enquiries">+ Send Proposal / Quote</Link>
          <Link className="qa purple" href="/dashboard/buyer/rfqs">⌕ Find New RFQs</Link>
          <Link className="qa ghost" href="/materials/my">Manage My Listings</Link>
          <Link className="qa ghost" href="/onboarding/business">Update Business Profile</Link>
          <Link className="qa ghost" href="/dashboard/procurement-analytics">View My Analytics</Link>
        </section>
      </aside>

      <style jsx>{`
        .d5Shell{display:grid;grid-template-columns:220px minmax(0,1fr) 290px;gap:16px;width:100%;padding:14px;background:#f4f7fd;min-height:calc(100vh - 120px);color:#10234a}
        .d5Sidebar,.d5RightRail{min-width:0}.d5Sidebar{position:sticky;top:12px;align-self:start;background:#fff;border:1px solid #d8e3f5;border-radius:18px;padding:14px;box-shadow:0 10px 30px rgba(36,76,150,.08)}
        .d5SideIdentity{padding:4px 10px 14px;border-bottom:1px solid #e7edf7}.d5SideIdentity strong{display:block;font-size:18px}.d5Verified{display:block;color:#07884a;font-size:12px;font-weight:900;margin-top:6px}
        .d5Nav{display:grid;gap:4px;margin-top:10px}.d5NavLink{display:flex;align-items:center;gap:9px;min-height:38px;padding:8px 10px;border-radius:10px;text-decoration:none;color:#1c315c;font-size:12px}.d5NavLink:hover{background:#edf4ff}.d5NavActive{color:#fff;background:linear-gradient(90deg,#1364ef,#2248e7);box-shadow:0 8px 20px rgba(28,91,230,.3)}.d5NavLink em{margin-left:auto;background:#ed1c3b;color:#fff;border-radius:999px;padding:2px 6px;font-style:normal;font-size:10px}
        .d5HelpCard{margin-top:14px;padding:12px;border-radius:14px;background:linear-gradient(140deg,#edf8ff,#eef2ff);border:1px solid #cfe1ff}.d5HelpCard strong,.d5HelpCard span{display:block}.d5HelpCard span{font-size:10px;margin-top:3px;color:#5e7094}.d5HelpCard a{display:block;margin-top:10px;padding:9px;border-radius:9px;background:#1769ee;color:#fff;text-align:center;text-decoration:none;font-weight:900;font-size:11px}
        .d5Main{min-width:0}.d5IdentityHero{display:grid;grid-template-columns:auto minmax(0,1fr) 250px 150px;gap:16px;align-items:center;padding:18px;border-radius:18px;background:linear-gradient(110deg,#dff1ff 0%,#eef4ff 55%,#b9d4ff 100%);border:1px solid #b9d2ff;box-shadow:0 12px 30px rgba(27,77,167,.09)}
        .d5LogoOrb{width:88px;height:88px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:linear-gradient(145deg,#fff,#d9f6e5);border:5px solid #fff;box-shadow:0 0 0 2px #ff9c2a;color:#16834b;font-size:28px;font-weight:950}.d5BusinessName{font-size:25px;font-weight:950;color:#10234a}.d5BusinessName span{color:#1364ef}.d5RoleLine{font-size:13px;margin-top:3px}.d5Location{font-size:12px;margin-top:8px}.d5Badges{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.d5Badges span{padding:6px 10px;border-radius:999px;background:#effff5;border:1px solid #8bd7ac;color:#087640;font-size:10px;font-weight:900}
        .d5CompletionCard{background:rgba(255,255,255,.78);border:1px solid #d4e0f3;border-radius:16px;padding:14px}.d5CompletionCard small,.d5CompletionCard b{display:block}.d5CompletionCard strong{display:block;color:#098646;font-size:30px;margin-top:5px}.d5CompletionCard strong span{font-size:16px;color:#263b63}.d5Progress{height:9px;background:#d8e3ed;border-radius:999px;overflow:hidden}.d5Progress i{display:block;height:100%;background:#10a453;border-radius:inherit}.d5CompletionCard b{font-size:10px;color:#078348;margin-top:7px}.d5HeroActions{display:grid;gap:8px}.d5HeroActions a{display:flex;align-items:center;justify-content:center;min-height:40px;border-radius:10px;text-decoration:none;font-size:11px;font-weight:900;background:#1464ef;color:#fff}.d5HeroActions a+a{background:#fff;color:#233b6b;border:1px solid #c9d8ef}
        .d5ProfileActions{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin-top:12px}.d5ProfileAction{display:flex;align-items:center;gap:10px;padding:12px;border-radius:14px;text-decoration:none;border:1px solid}.d5ProfileAction>span{width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.7);font-size:18px}.d5ProfileAction strong,.d5ProfileAction small{display:block}.d5ProfileAction strong{font-size:12px;color:#15305d}.d5ProfileAction small{font-size:10px;color:#63769a;margin-top:3px}.blue{background:#e8f3ff;border-color:#a9cef9}.purple{background:#f3eaff;border-color:#d2b7f5}.green{background:#e9fbee;border-color:#a8e1b7}.orange{background:#fff1df;border-color:#f2c58a}.pink{background:#ffeaf1;border-color:#f5b5c8}
        .d5OperatingCenter{margin-top:12px;padding:16px;border:1px solid #d4e0f2;border-radius:17px;background:#fff}.d5SectionHeading{display:flex;justify-content:space-between;gap:12px}.d5SectionHeading h2{margin:0;font-size:20px}.d5SectionHeading p{margin:4px 0 0;font-size:11px;color:#647596}.d5StatusPills{display:flex;gap:7px;align-items:flex-start}.d5StatusPills span{padding:7px 10px;border-radius:999px;background:#eafff1;color:#08733e;font-size:10px;font-weight:900}
        .d5Kpis{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:9px;margin-top:13px}.d5Kpi{padding:12px;border:1px solid #d9e4f4;border-radius:13px;background:linear-gradient(160deg,#f6faff,#fff)}.d5Kpi span,.d5Kpi small{display:block;font-size:10px;color:#516b97;font-weight:800}.d5Kpi strong{display:block;font-size:23px;margin:7px 0 4px}.d5Kpi small{color:#188449}.d5DecisionRow{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:11px}.d5DecisionRow>div{position:relative;padding:12px;border:1px solid #bdd5ff;border-radius:13px;background:#f6f9ff}.d5DecisionRow>div+div{background:#eafff2;border-color:#9dddb7}.d5DecisionRow strong,.d5DecisionRow span{display:block}.d5DecisionRow strong{font-size:12px}.d5DecisionRow span{font-size:10px;margin-top:4px}.d5DecisionRow a{position:absolute;right:10px;top:16px;background:#078a46;color:#fff;padding:8px 12px;border-radius:9px;text-decoration:none;font-size:10px;font-weight:900}
        .d5Content{margin-top:12px}.d5BottomGrid{display:grid;grid-template-columns:1.1fr 1.2fr .75fr;gap:12px;margin-top:12px}.d5BottomGrid>div{background:#fff;border:1px solid #d5e0f1;border-radius:15px;padding:14px}.d5MiniHeading{display:flex;justify-content:space-between;gap:8px}.d5MiniHeading a{font-size:10px;text-decoration:none}.d5ActivityCard ul{list-style:none;margin:10px 0 0;padding:0}.d5ActivityCard li{padding:8px 0;border-top:1px solid #edf1f7;font-size:10px}.d5ActivityCard small{display:block;color:#8190aa;margin-top:2px}.d5Bars{height:150px;display:grid;grid-template-columns:repeat(4,1fr);gap:14px;align-items:end;margin-top:12px}.d5Bars>div{height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center}.d5Bars i{width:28px;background:linear-gradient(#1766ee,#13a459);border-radius:5px 5px 0 0}.d5Bars b,.d5Bars small{font-size:9px;text-align:center;margin-top:4px}.d5TrustCard{display:grid;gap:9px;align-content:start}.d5TrustCard span{font-size:10px;color:#29436e}
        .d5WorkspaceLinks{margin-top:12px;padding:12px 14px;border:1px solid #d1def1;border-radius:15px;background:#eef4ff}.d5WorkspaceLinks>strong{display:block;font-size:12px}.d5WorkspaceLinks>div{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}.d5WorkspaceLinks a{padding:7px 11px;border-radius:999px;background:#fff;border:1px solid #cbd9ed;text-decoration:none;font-size:10px;color:#1c3765;font-weight:850}
        .d5RightRail{display:grid;gap:14px;align-content:start}.d5RailCard{background:#fff;border:1px solid #d4e0f1;border-radius:16px;padding:14px;box-shadow:0 9px 26px rgba(26,72,153,.07)}.d5RailCard>strong{display:block;font-size:14px;margin-bottom:10px}.d5AiCard{background:linear-gradient(155deg,#eef0ff,#e8e2ff)}.d5AiCard span{display:block;font-size:10px;margin-top:8px;color:#29436d}.d5RailCard>a{display:flex;align-items:center;justify-content:center;text-align:center;text-decoration:none;font-size:10px;font-weight:900}.d5AiCard>a{margin-top:12px;padding:10px;border-radius:9px;background:linear-gradient(90deg,#5234e8,#6814ce);color:#fff}.qa{min-height:38px;margin-top:8px;border-radius:9px;color:#fff}.qa.blue{background:#1768ef}.qa.green{background:#0b9b58}.qa.purple{background:#6128dc}.qa.ghost{background:#fff;color:#214070;border:1px solid #b9cae4}
        @media(max-width:1280px){.d5Shell{grid-template-columns:210px minmax(0,1fr)}.d5RightRail{grid-column:1/-1;grid-template-columns:1fr 1fr}.d5IdentityHero{grid-template-columns:auto minmax(0,1fr) 230px}.d5HeroActions{grid-column:1/-1;grid-template-columns:1fr 1fr}.d5Kpis{grid-template-columns:repeat(3,1fr)}}
        @media(max-width:900px){.d5Shell{display:block;padding:9px}.d5Sidebar{position:static}.d5Nav{grid-template-columns:repeat(2,1fr)}.d5IdentityHero{grid-template-columns:auto 1fr}.d5CompletionCard,.d5HeroActions{grid-column:1/-1}.d5ProfileActions{grid-template-columns:repeat(2,1fr)}.d5BottomGrid{grid-template-columns:1fr}.d5RightRail{grid-template-columns:1fr;margin-top:12px}}
        @media(max-width:600px){.d5Nav{grid-template-columns:1fr}.d5IdentityHero{display:block}.d5LogoOrb{margin-bottom:12px}.d5CompletionCard{margin-top:12px}.d5ProfileActions{grid-template-columns:1fr}.d5Kpis{grid-template-columns:repeat(2,1fr)}.d5DecisionRow{grid-template-columns:1fr}.d5DecisionRow a{position:static;display:inline-flex;margin-top:8px}.d5SectionHeading{display:block}.d5StatusPills{margin-top:9px}.d5RightRail{display:grid}}
      `}</style>
    </div>
  );
}
