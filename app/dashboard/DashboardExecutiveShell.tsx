"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type DashboardExecutiveShellProps = {
  role: string;
  rfqs: number;
  conversations: number;
  unreadAlerts: number;
  priceSignals: number;
  businessName: string;
  businessType: string;
  businessNature: string[];
  businessCity: string;
  businessDistrict: string;
  businessState: string;
  completionScore: number;
  isComplete: boolean;
  profileImageUrl: string | null;
  children: ReactNode;
};

type WorkItem = {
  href: string;
  title: string;
  detail: string;
  urgent?: boolean;
};

function roleLabel(role: string) {
  const value = String(role || "member").trim().toLowerCase();
  if (value === "hub_vendor") return "Vendor Hub";
  if (value === "master_admin") return "Master Admin";
  if (value === "finance_banker") return "Finance Banker";
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const NAV_GROUPS = [
  {
    label: "Identity",
    items: [
      ["Dashboard", "/dashboard", "▦"],
      ["My Profile", "/settings", "♙"],
      ["Business Profile", "/onboarding/business", "▣"],
    ],
  },
  {
    label: "Marketplace",
    items: [
      ["My Listings", "/dashboard/workspace", "▤"],
      ["RFQ Work Desk", "/dashboard/vendor/rfqs", "◫"],
      ["Buyer Enquiries", "/dashboard/vendor/enquiries", "♧"],
      ["Inbox", "/dashboard/inbox-v2", "✉"],
    ],
  },
  {
    label: "Operations",
    items: [
      ["Orders & Deals", "/dashboard/vendor/workspace", "▢"],
      ["Payments & Billing", "/dashboard/vendor/billing", "▭"],
      ["Vendor Analytics", "/dashboard/procurement-analytics", "⌁"],
      ["Predictive Prices", "/price-today", "◇"],
    ],
  },
  {
    label: "Account",
    items: [
      ["Subscription", "/dashboard/subscription", "◉"],
      ["Learning & Knowledge", "/dashboard/procurement-memory-intelligence", "◇"],
      ["Settings", "/settings", "⚙"],
    ],
  },
] as const;

const PROFILE_ACTIONS = [
  ["My Profile", "Identity and contact details", "/settings", "♙", "blue"],
  ["Business Profile", "Business, services and documents", "/onboarding/business", "▣", "purple"],
  ["Settings", "Security and preferences", "/settings", "⚙", "green"],
  ["Subscription", "Plan, billing and benefits", "/dashboard/subscription", "◇", "orange"],
  ["Help & Support", "Get human help when needed", "/support/my", "?", "pink"],
] as const;

export default function DashboardExecutiveShell({
  role,
  rfqs,
  conversations,
  unreadAlerts,
  priceSignals,
  businessName,
  businessType,
  businessNature,
  businessCity,
  businessDistrict,
  businessState,
  completionScore,
  isComplete,
  profileImageUrl,
  children,
}: DashboardExecutiveShellProps) {
  const displayRole = roleLabel(role);
  const completion = Math.max(0, Math.min(100, Math.round(completionScore || 0)));
  const momentum = Math.min(100, 35 + conversations * 8 + priceSignals * 5 + rfqs * 6);
  const resolvedBusinessName = businessName || "Your Business";
  const natureLabel = businessNature.length
    ? businessNature.map((item) => item.charAt(0).toUpperCase() + item.slice(1)).join(" · ")
    : businessType || displayRole;
  const locationLabel = [businessCity, businessDistrict, businessState]
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index)
    .join(", ");

  const workItems: WorkItem[] = [];
  if (!isComplete) {
    workItems.push({
      href: "/onboarding/business",
      title: "Complete business verification",
      detail: "Finish the remaining identity and trust information.",
      urgent: true,
    });
  }
  if (unreadAlerts > 0) {
    workItems.push({
      href: "/dashboard/vendor/notifications",
      title: `Review ${unreadAlerts} unread vendor alerts`,
      detail: "Clear time-sensitive opportunities and pending attention.",
      urgent: true,
    });
  }
  if (conversations > 0) {
    workItems.push({
      href: "/dashboard/inbox-v2",
      title: `Continue ${conversations} buyer conversations`,
      detail: "Reply clearly and move active discussions toward closure.",
    });
  }
  if (workItems.length < 3) {
    workItems.push({
      href: "/dashboard/vendor/rfqs",
      title: "Review RFQs for your business",
      detail: "Find suitable requirements across your registered segments.",
    });
  }

  const readinessItems = [
    ["Identity", Boolean(resolvedBusinessName && resolvedBusinessName !== "Your Business"), "Registered business name"],
    ["Verification", isComplete, isComplete ? "Registration requirements complete" : "Complete pending verification"],
    ["Marketplace Presence", businessNature.length > 0, `${businessNature.length} active segments`],
    ["Responsiveness", unreadAlerts === 0, unreadAlerts === 0 ? "No unread attention" : `${unreadAlerts} unread items`],
  ] as const;
  const readinessAttention = readinessItems.filter(([, ready]) => !ready);
  const displayedReadiness = readinessAttention.length ? readinessAttention : readinessItems.slice(0, 3);

  return (
    <div className="d5Shell">
      <aside className="d5Sidebar" aria-label="Dashboard navigation">
        <div className="d5SideIdentity">
          <strong>{displayRole}</strong>
          <span className={isComplete ? "d5Verified" : "d5Pending"}>
            {isComplete ? "● Verified business" : "● Verification in progress"}
          </span>
        </div>

        <nav className="d5Nav">
          {NAV_GROUPS.map((group) => (
            <section className="d5NavGroup" key={group.label}>
              <span className="d5NavGroupLabel">{group.label}</span>
              {group.items.map(([label, href, icon]) => (
                <Link key={href + label} href={href} className={`d5NavLink ${label === "Dashboard" ? "d5NavActive" : ""}`}>
                  <span aria-hidden="true">{icon}</span>
                  <b>{label}</b>
                  {label === "RFQ Work Desk" && unreadAlerts > 0 ? <em>{unreadAlerts}</em> : null}
                  {label === "Buyer Enquiries" && conversations > 0 ? <em>{conversations}</em> : null}
                </Link>
              ))}
            </section>
          ))}
        </nav>

        <section className="d5HelpCard">
          <strong>Need human help?</strong>
          <span>Support first. AI assistance when useful.</span>
          <Link href="/support/my">Open Help & Support</Link>
        </section>
      </aside>

      <main className="d5Main">
        <section className="d5CommandHeader" aria-label="Business command header">
          <div className="d5IdentityBlock">
            <div className="d5LogoOrb">
              {profileImageUrl ? <img src={profileImageUrl} alt={`${resolvedBusinessName} profile`} /> : resolvedBusinessName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <span className="d5Eyebrow">BUSINESS COMMAND</span>
              <h1>{resolvedBusinessName} <i>✓</i></h1>
              <p>{displayRole} · {natureLabel}</p>
              <small>⌖ {locationLabel || "Add your operating location for nearby marketplace matching"}</small>
            </div>
          </div>

          <div className="d5CommandMetrics">
            <div className="primary"><span>Marketplace readiness</span><strong>{completion}<small>/100</small></strong></div>
            <div><span>Buyer conversations</span><strong>{conversations}</strong></div>
            <div className={unreadAlerts > 0 ? "attention" : ""}><span>Unread attention</span><strong>{unreadAlerts}</strong></div>
            <div><span>Active segments</span><strong>{businessNature.length}</strong></div>
          </div>

          <div className="d5CommandActions">
            <Link className="primary" href="/dashboard/vendor/rfqs">Review RFQs</Link>
            <Link href="/dashboard/vendor/enquiries">Open Buyers</Link>
            <Link href="/onboarding/business">Edit Business</Link>
          </div>
        </section>

        <section className="d5ProfileActions" aria-label="Profile and account tools">
          {PROFILE_ACTIONS.map(([title, detail, href, icon, tone]) => (
            <Link key={title} href={href} className={`d5ProfileAction ${tone}`}>
              <span>{icon}</span>
              <div><strong>{title}</strong><small>{detail}</small></div>
              <b aria-hidden="true">→</b>
            </Link>
          ))}
        </section>

        <section className="d5Priorities" aria-label="Immediate work queue">
          <div className="d5SectionHeading">
            <div><span>HUMAN-FIRST WORK</span><h2>Immediate work queue</h2><p>Complete the most important human actions before reviewing intelligence.</p></div>
            <Link href="/dashboard/workspace">Open Unified Workspace →</Link>
          </div>
          <div className="d5PriorityCards">
            {workItems.slice(0, 3).map((item, index) => (
              <Link href={item.href} className={item.urgent ? "urgent" : ""} key={item.title}>
                <span>{index + 1}</span>
                <div><strong>{item.title}</strong><small>{item.detail}</small></div>
                <b aria-hidden="true">→</b>
              </Link>
            ))}
          </div>
        </section>

        <section className="d5ReadinessPanel" aria-label="Business readiness">
          <div className="d5ReadinessHeading">
            <div><span>BUSINESS READINESS</span><h2>{readinessAttention.length ? "Items needing attention" : "Your business foundation is ready"}</h2></div>
            <strong>{completion}/100</strong>
          </div>
          <div className="d5ReadinessGrid">
            {displayedReadiness.map(([label, ready, detail]) => (
              <div className={`d5ReadinessItem ${ready ? "ready" : "pending"}`} key={label}>
                <span>{ready ? "✓" : "!"}</span>
                <div><strong>{label}</strong><small>{detail}</small></div>
              </div>
            ))}
          </div>
        </section>

        <section className="d5OperatingCenter">
          <div className="d5SectionHeading">
            <div><span>BUSINESS OPERATING CENTER</span><h2>Live business position</h2><p>Marketplace activity and operating signals in one compact view.</p></div>
            <div className="d5StatusPill">● Live marketplace signals</div>
          </div>
          <div className="d5Kpis">
            {[
              ["RFQs for You", rfqs, "Active now"],
              ["Conversations", conversations, "Buyer activity"],
              ["Vendor Alerts", unreadAlerts, "Unread"],
              ["Price Signals", priceSignals, "Verified"],
              ["Active Segments", businessNature.length, "Registered"],
            ].map(([label, value, note]) => (
              <div className="d5Kpi" key={String(label)}><span>{label}</span><strong>{value}</strong><small>{note}</small></div>
            ))}
          </div>
        </section>

        <section className="d5ExecutiveConsole" aria-label="AI advisory intelligence">
          <div className="d5ConsoleHeading">
            <div><span>AI SECOND · HUMAN CONTROL</span><h2>Advisory intelligence</h2><p>AI explains signals after the human work queue and never makes the final decision.</p></div>
            <Link href="/dashboard/procurement-copilot">Open full AI Co-Pilot →</Link>
          </div>
          <div className="d5ConsoleGrid">
            <div className="d5ConsoleCard">
              <strong>AI Insight</strong>
              <b>{unreadAlerts > 0 ? "Attention required" : momentum >= 60 ? "Healthy activity" : "Opportunity developing"}</b>
              <p>{unreadAlerts > 0 ? `${unreadAlerts} unread alerts need human review before further automation.` : momentum >= 60 ? "Marketplace activity is strong across your current business signals." : "Review new RFQs and improve active listings to build momentum."}</p>
            </div>
            <div className="d5ConsoleCard">
              <strong>Business Health</strong>
              <div className="d5CompactHealth"><span>Readiness <b>{completion}%</b></span><span>Verification <b>{isComplete ? "Complete" : "Pending"}</b></span><span>Segments <b>{businessNature.length}</b></span></div>
            </div>
            <div className="d5ConsoleCard">
              <strong>Suggested next action</strong>
              <b>{unreadAlerts > 0 ? "Clear pending attention" : conversations > 0 ? "Continue buyer discussions" : "Review open RFQs"}</b>
              <p>{unreadAlerts > 0 ? "Review alerts and choose the appropriate response yourself." : conversations > 0 ? "Reply to active buyers and move suitable discussions forward." : "Check requirements that match your registered capabilities."}</p>
            </div>
          </div>
        </section>

        <div className="d5LegacyIntelligence" aria-hidden="true">{children}</div>

        <section className="d5WorkspaceLinks">
          <strong>Workspace quick links</strong>
          <div><Link href="/dashboard/workspace">Unified Workspace</Link><Link href="/dashboard/vendor/workspace">Vendor Work Desk</Link><Link href="/dashboard/vendor/rfqs">RFQ Work Desk</Link><Link href="/dashboard/inbox-v2">Inbox</Link><Link href="/price-today">Predictive Prices</Link><Link href="/rfq">+ New RFQ</Link></div>
        </section>
      </main>

      <style jsx>{`
        .d5Shell{display:grid;grid-template-columns:238px minmax(0,1fr);gap:18px;width:100%;padding:18px;background:#f4f7fd;min-height:calc(100vh - 120px);color:#10234a}
        .d5Sidebar{position:sticky;top:12px;align-self:start;min-width:0;background:#fff;border:1px solid #d8e3f5;border-radius:18px;padding:14px;box-shadow:0 10px 30px rgba(36,76,150,.08)}
        .d5SideIdentity{padding:5px 9px 14px;border-bottom:1px solid #e7edf7}.d5SideIdentity strong{display:block;font-size:18px}.d5Verified,.d5Pending{display:block;font-size:11px;font-weight:900;margin-top:6px}.d5Verified{color:#07884a}.d5Pending{color:#b66b00}
        .d5Nav{display:grid;gap:13px;margin-top:12px}.d5NavGroup{display:grid;gap:3px}.d5NavGroupLabel{padding:0 10px 3px;color:#7b8ba8;font-size:9px;font-weight:950;letter-spacing:.12em;text-transform:uppercase}.d5NavLink{display:flex;align-items:center;gap:9px;min-height:38px;padding:8px 10px;border-radius:10px;text-decoration:none;color:#1c315c;font-size:12px;line-height:1.25}.d5NavLink:hover{background:#edf4ff}.d5NavActive{color:#fff;background:linear-gradient(90deg,#1364ef,#2248e7);box-shadow:0 7px 18px rgba(28,91,230,.25)}.d5NavLink em{margin-left:auto;min-width:23px;height:21px;display:inline-flex;align-items:center;justify-content:center;background:#ed1c3b;color:#fff;border-radius:999px;padding:0 6px;font-style:normal;font-size:10px;font-weight:900}
        .d5HelpCard{margin-top:15px;padding:13px;border-radius:14px;background:linear-gradient(140deg,#edf8ff,#eef2ff);border:1px solid #cfe1ff}.d5HelpCard strong,.d5HelpCard span{display:block}.d5HelpCard span{font-size:10px;line-height:1.4;margin-top:4px;color:#5e7094}.d5HelpCard a{display:block;margin-top:10px;padding:9px;border-radius:9px;background:#1769ee;color:#fff;text-align:center;text-decoration:none;font-weight:900;font-size:11px}
        .d5Main{min-width:0}.d5CommandHeader{display:grid;grid-template-columns:minmax(280px,1.35fr) minmax(360px,1fr) 150px;gap:16px;align-items:center;padding:18px;border-radius:19px;background:linear-gradient(115deg,#e1f2ff 0%,#eef4ff 55%,#c5d9ff 100%);border:1px solid #b9d2ff;box-shadow:0 12px 30px rgba(27,77,167,.09)}
        .d5IdentityBlock{display:flex;align-items:center;gap:15px;min-width:0}.d5LogoOrb{width:76px;height:76px;flex:0 0 auto;border-radius:50%;display:flex;align-items:center;justify-content:center;overflow:hidden;background:linear-gradient(145deg,#fff,#d9f6e5);border:4px solid #fff;box-shadow:0 0 0 2px #ff9c2a;color:#16834b;font-size:24px;font-weight:950}.d5LogoOrb img{width:100%;height:100%;object-fit:cover;display:block}.d5Eyebrow{color:#1767ef;font-size:9px;font-weight:950;letter-spacing:.1em}.d5IdentityBlock h1{margin:4px 0 3px;font-size:25px;line-height:1.15}.d5IdentityBlock h1 i{font-style:normal;color:#1767ef}.d5IdentityBlock p{margin:0;font-size:12px;color:#304c7b}.d5IdentityBlock small{display:block;margin-top:7px;color:#5e7094;font-size:11px;line-height:1.4}
        .d5CommandMetrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.d5CommandMetrics>div{padding:10px 11px;border-radius:12px;background:rgba(255,255,255,.76);border:1px solid #d4e0f3}.d5CommandMetrics span{display:block;color:#607394;font-size:9px;font-weight:800}.d5CommandMetrics strong{display:block;margin-top:4px;font-size:21px}.d5CommandMetrics strong small{font-size:11px}.d5CommandMetrics .primary strong{color:#07884a}.d5CommandMetrics .attention{background:#fff7e8;border-color:#efc878}.d5CommandMetrics .attention strong{color:#b66b00}
        .d5CommandActions{display:grid;gap:8px}.d5CommandActions a{display:flex;align-items:center;justify-content:center;min-height:40px;padding:0 12px;border-radius:11px;text-decoration:none;font-size:11px;font-weight:950;background:#fff;color:#233b6b;border:1px solid #c9d8ef}.d5CommandActions a.primary{background:#1464ef;color:#fff;border-color:#1464ef;box-shadow:0 7px 16px rgba(20,100,239,.18)}
        .d5ProfileActions{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin-top:12px}.d5ProfileAction{display:grid;grid-template-columns:36px minmax(0,1fr) auto;align-items:center;gap:10px;min-height:78px;padding:13px;border-radius:14px;text-decoration:none;border:1px solid}.d5ProfileAction>span{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.76);font-size:18px}.d5ProfileAction strong,.d5ProfileAction small{display:block}.d5ProfileAction strong{font-size:12px;line-height:1.25;color:#15305d}.d5ProfileAction small{font-size:9px;line-height:1.4;color:#63769a;margin-top:4px}.d5ProfileAction>b{color:#5d7093}.blue{background:#e8f3ff;border-color:#a9cef9}.purple{background:#f3eaff;border-color:#d2b7f5}.green{background:#e9fbee;border-color:#a8e1b7}.orange{background:#fff1df;border-color:#f2c58a}.pink{background:#ffeaf1;border-color:#f5b5c8}
        .d5Priorities,.d5ReadinessPanel,.d5OperatingCenter,.d5ExecutiveConsole{margin-top:12px;padding:16px;border:1px solid #d4e0f2;border-radius:17px;background:#fff}.d5SectionHeading,.d5ReadinessHeading,.d5ConsoleHeading{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}.d5SectionHeading span,.d5ReadinessHeading span,.d5ConsoleHeading span{color:#1767ef;font-size:9px;font-weight:950;letter-spacing:.09em}.d5SectionHeading h2,.d5ReadinessHeading h2,.d5ConsoleHeading h2{margin:4px 0 0;font-size:19px}.d5SectionHeading p,.d5ConsoleHeading p{margin:4px 0 0;color:#647596;font-size:10px}.d5SectionHeading>a,.d5ConsoleHeading>a{color:#1767ef;text-decoration:none;font-size:10px;font-weight:900}.d5ReadinessHeading>strong{font-size:26px;color:#0a8b4e}
        .d5PriorityCards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:14px}.d5PriorityCards a{display:grid;grid-template-columns:30px minmax(0,1fr) auto;gap:10px;align-items:start;padding:13px;border:1px solid #cdddf4;border-radius:13px;background:#f8fbff;text-decoration:none;color:#16325f}.d5PriorityCards a.urgent{border-color:#f2ba75;background:#fff8ec}.d5PriorityCards a>span{width:29px;height:29px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#1767ef;color:#fff;font-size:11px;font-weight:950}.d5PriorityCards a.urgent>span{background:#d97706}.d5PriorityCards strong,.d5PriorityCards small{display:block}.d5PriorityCards strong{font-size:11px}.d5PriorityCards small{font-size:9px;margin-top:4px;line-height:1.45;color:#647596}.d5PriorityCards a>b{color:#6480ae}
        .d5ReadinessGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin-top:13px}.d5ReadinessItem{display:flex;gap:9px;align-items:flex-start;padding:11px;border-radius:13px;border:1px solid}.d5ReadinessItem>span{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:950}.d5ReadinessItem strong,.d5ReadinessItem small{display:block}.d5ReadinessItem strong{font-size:11px}.d5ReadinessItem small{font-size:9px;margin-top:3px;color:#647596}.d5ReadinessItem.ready{background:#effcf4;border-color:#a9dfbd}.d5ReadinessItem.ready>span{background:#0a9954;color:#fff}.d5ReadinessItem.pending{background:#fff8e8;border-color:#f2ce83}.d5ReadinessItem.pending>span{background:#e69b16;color:#fff}
        .d5StatusPill{padding:7px 10px;border-radius:999px;background:#eafff1;color:#08733e;font-size:10px;font-weight:900}.d5Kpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:9px;margin-top:13px}.d5Kpi{padding:13px;border:1px solid #d9e4f4;border-radius:13px;background:linear-gradient(160deg,#f6faff,#fff)}.d5Kpi span,.d5Kpi small{display:block;font-size:10px;color:#516b97;font-weight:800}.d5Kpi strong{display:block;font-size:23px;margin:7px 0 4px}.d5Kpi small{color:#188449}
        .d5ConsoleGrid{display:grid;grid-template-columns:1.15fr 1fr 1fr;gap:10px;margin-top:13px}.d5ConsoleCard{min-width:0;padding:13px;border:1px solid #d9e4f4;border-radius:14px;background:linear-gradient(160deg,#f8fbff,#fff)}.d5ConsoleCard>strong{display:block;font-size:11px;color:#526b96}.d5ConsoleCard>b{display:block;margin-top:7px;font-size:15px;color:#142f5d}.d5ConsoleCard>p{margin:5px 0 0;font-size:10px;line-height:1.5;color:#607394}.d5CompactHealth{display:grid;gap:7px;margin-top:9px}.d5CompactHealth span{display:flex;justify-content:space-between;gap:8px;padding:8px 0;border-top:1px solid #edf1f7;font-size:10px}.d5CompactHealth b{color:#1767ef}.d5LegacyIntelligence{display:none}
        .d5WorkspaceLinks{margin-top:12px;padding:12px 14px;border:1px solid #d1def1;border-radius:15px;background:#eef4ff}.d5WorkspaceLinks>strong{display:block;font-size:12px}.d5WorkspaceLinks>div{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}.d5WorkspaceLinks a{padding:7px 11px;border-radius:999px;background:#fff;border:1px solid #cbd9ed;color:#23406e;text-decoration:none;font-size:10px;font-weight:800}
        @media(max-width:1250px){.d5CommandHeader{grid-template-columns:1fr 1fr}.d5CommandActions{grid-column:1/-1;grid-template-columns:repeat(3,1fr)}.d5ProfileActions{grid-template-columns:repeat(3,1fr)}.d5Kpis{grid-template-columns:repeat(3,1fr)}}
        @media(max-width:980px){.d5Shell{grid-template-columns:1fr;padding:10px}.d5Sidebar{position:static}.d5Nav{grid-template-columns:repeat(2,minmax(0,1fr))}.d5CommandHeader{grid-template-columns:1fr}.d5CommandActions{grid-column:auto}.d5ProfileActions{grid-template-columns:repeat(2,1fr)}.d5PriorityCards,.d5ReadinessGrid,.d5ConsoleGrid{grid-template-columns:1fr}.d5Kpis{grid-template-columns:repeat(2,1fr)}}
        @media(max-width:640px){.d5Shell{padding:8px}.d5Nav{grid-template-columns:1fr}.d5CommandHeader{padding:14px}.d5IdentityBlock{align-items:flex-start}.d5LogoOrb{width:62px;height:62px}.d5IdentityBlock h1{font-size:21px}.d5CommandMetrics{grid-template-columns:1fr 1fr}.d5CommandActions{grid-template-columns:1fr}.d5ProfileActions{grid-template-columns:1fr}.d5Kpis{grid-template-columns:1fr 1fr}.d5SectionHeading,.d5ReadinessHeading,.d5ConsoleHeading{display:grid}.d5StatusPill{justify-self:start}}
      `}</style>
    </div>
  );
}
