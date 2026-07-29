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
  ["My Listings", "/dashboard/vendor/workspace", "▤"],
  ["RFQ Work Desk", "/dashboard/vendor/rfqs", "◫"],
  ["Buyer Enquiries", "/dashboard/vendor/enquiries", "♧"],
  ["Vendor Analytics", "/dashboard/procurement-analytics", "⌁"],
  ["Orders & Deals", "/dashboard/vendor/workspace", "▢"],
  ["Payments & Billing", "/dashboard/vendor/billing", "▭"],
  ["Ratings & Reviews", "/dashboard/vendor/workspace", "☆"],
  ["Predictive Prices", "/price-today", "⌁"],
  ["Learning & Knowledge", "/ai-search-guide", "◇"],
  ["Subscription", "/dashboard/subscription", "◉"],
  ["Inbox", "/dashboard/inbox-v2", "✉"],
  ["Settings", "/settings", "⚙"],
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
    ? businessNature
        .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
        .join(" | ")
    : businessType || displayRole;
  const locationLabel = [businessCity, businessDistrict, businessState]
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index)
    .join(", ");

  return (
    <div className="d5Shell">
      <aside className="d5Sidebar" aria-label="Dashboard navigation">
        <div className="d5SideIdentity">
          <strong>{displayRole}</strong>
          <span className="d5Verified">● Verified Vendor</span>
        </div>

        <nav className="d5Nav">
          {NAV_ITEMS.map(([label, href, icon], index) => (
            <Link
              key={href + label}
              href={href}
              className={`d5NavLink ${index === 0 ? "d5NavActive" : ""}`}
              aria-current={index === 0 ? "page" : undefined}
            >
              <span className="d5NavIcon" aria-hidden="true">{icon}</span>
              <b>{label}</b>
              {label === "RFQ Work Desk" && unreadAlerts > 0 ? (
                <em aria-label={`${unreadAlerts} unread RFQ alerts`}>{unreadAlerts}</em>
              ) : null}
              {label === "Buyer Enquiries" && conversations > 0 ? (
                <em aria-label={`${conversations} active buyer enquiries`}>{conversations}</em>
              ) : null}
              <i className="d5NavArrow" aria-hidden="true">›</i>
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
          <div className="d5LogoOrb">
            {profileImageUrl ? (
              <img src={profileImageUrl} alt={`${resolvedBusinessName} profile`} />
            ) : (
              resolvedBusinessName.slice(0, 2).toUpperCase()
            )}
          </div>
          <div className="d5IdentityCopy">
            <div className="d5BusinessName">{resolvedBusinessName} <span>✓</span></div>
            <div className="d5RoleLine">{displayRole} — {natureLabel}</div>
            <div className="d5Location">⌖ {locationLabel || "Add your operating location for nearby marketplace matching"}</div>
            <div className="d5Badges">
              <span>{isComplete ? "✓ Verified Vendor" : "◷ Profile in progress"}</span><span>✓ Active</span>
            </div>
          </div>
          <div className="d5CompletionCard">
            <small>♛ Marketplace Readiness</small>
            <strong>{completion}<span>/100</span></strong>
            <div className="d5Progress"><i style={{ width: `${completion}%` }} /></div>
            <b>{completion >= 90 ? "Ready for strong marketplace participation" : completion >= 70 ? "Good foundation – complete the remaining trust steps" : "Complete the required identity and trust information"}</b>
          </div>
          <div className="d5HeroActions">
            <Link href="/onboarding/business">✎ Edit Business</Link>
            <Link href="/vendor">↗ View Public Profile</Link>
          </div>
        </section>

        <section className="d5ProfileActions">
          {PROFILE_ACTIONS.map(([title, detail, href, icon, tone]) => (
            <Link key={title} href={href} className={`d5ProfileAction ${tone}`}>
              <span>{icon}</span><div><strong>{title}</strong><small>{detail}</small></div>
            </Link>
          ))}
        </section>

        <section className="d5ReadinessPanel" aria-label="Business readiness">
          <div className="d5ReadinessHeading">
            <div>
              <span>BUSINESS READINESS</span>
              <h2>Trust, presence and operating preparedness</h2>
            </div>
            <strong>{completion}/100</strong>
          </div>

          <div className="d5ReadinessGrid">
            {[
              ["Identity", Boolean(resolvedBusinessName && resolvedBusinessName !== "Your Business"), "Registered business name"],
              ["Verification", isComplete, isComplete ? "Registration requirements complete" : "Complete pending verification"],
              ["Marketplace Presence", businessNature.length > 0, `${businessNature.length} active segments`],
              ["Responsiveness", unreadAlerts === 0, unreadAlerts === 0 ? "No unread attention" : `${unreadAlerts} unread items`],
              ["Reputation", conversations > 0, conversations > 0 ? "Buyer interaction established" : "Build interaction history"],
              ["Subscription", true, "Subscription workspace available"],
            ].map(([label, ready, detail]) => (
              <div className={`d5ReadinessItem ${ready ? "ready" : "pending"}`} key={String(label)}>
                <span>{ready ? "✓" : "!"}</span>
                <div>
                  <strong>{label}</strong>
                  <small>{detail}</small>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="d5Priorities" aria-label="Today's priorities">
          <div className="d5PriorityHeading">
            <div>
              <span>HUMAN-FIRST WORK</span>
              <h2>What should I do now?</h2>
              <p>Complete the most important human action before reviewing analytics.</p>
            </div>
            <Link href="/dashboard/workspace">Open Unified Workspace →</Link>
          </div>

          <div className="d5PriorityCards">
            {!isComplete ? (
              <Link href="/onboarding/business" className="urgent">
                <span>1</span>
                <div>
                  <strong>Complete business verification</strong>
                  <small>Finish the remaining registration and trust information.</small>
                </div>
              </Link>
            ) : null}

            {unreadAlerts > 0 ? (
              <Link href="/dashboard/vendor/notifications" className="urgent">
                <span>{!isComplete ? 2 : 1}</span>
                <div>
                  <strong>Review {unreadAlerts} unread vendor alerts</strong>
                  <small>Clear time-sensitive opportunities and pending attention.</small>
                </div>
              </Link>
            ) : null}

            {conversations > 0 ? (
              <Link href="/dashboard/inbox-v2">
                <span>{(!isComplete ? 1 : 0) + (unreadAlerts > 0 ? 1 : 0) + 1}</span>
                <div>
                  <strong>Continue {conversations} buyer conversations</strong>
                  <small>Reply clearly and move active discussions toward closure.</small>
                </div>
              </Link>
            ) : null}

            <Link href="/dashboard/vendor/rfqs">
              <span>{(!isComplete ? 1 : 0) + (unreadAlerts > 0 ? 1 : 0) + (conversations > 0 ? 1 : 0) + 1}</span>
              <div>
                <strong>Review RFQs for your business</strong>
                <small>Find suitable requirements across your registered segments.</small>
              </div>
            </Link>
          </div>
        </section>

        <section className="d5OperatingCenter">
          <div className="d5SectionHeading">
            <div><h2>Business Operating Center</h2><p>Today’s priorities, marketplace activity and the next human action from one place.</p></div>
            <div className="d5StatusPills"><span>● Live marketplace signals</span></div>
          </div>
          <div className="d5Kpis">
            {[
              ["RFQs for You", rfqs, "Active Now", "▦"],
              ["Conversations", conversations, "Active", "▤"],
              ["Vendor Alerts", unreadAlerts, "Unread", "♧"],
              ["Price Signals", priceSignals, "New", "⌁"],
              ["Profile Completion", completion, "Business readiness", "▣"],
              ["Active Segments", businessNature.length, "Registered capabilities", "◉"],
            ].map(([label, value, note, icon]) => (
              <div className="d5Kpi" key={String(label)}><span>{icon} {label}</span><strong>{value}</strong><small>{note}</small></div>
            ))}
          </div>
          <div className="d5DecisionRow">
            <div><strong>👥 Workflow Forecast</strong><span>{momentum >= 60 ? "Strong procurement activity detected in your categories." : "Procurement activity is developing."}</span></div>
            <div><strong>🎯 Suggested Next Action</strong><span>{unreadAlerts > 0 ? "Clear unread vendor alerts and follow up active procurement threads." : "Review open opportunities and update your listings."}</span><Link href="/dashboard/vendor/notifications">Take Action →</Link></div>
          </div>
        </section>

        <section className="d5ExecutiveConsole" aria-label="Executive intelligence and activity">
          <div className="d5ConsoleHeading">
            <div>
              <span>EXECUTIVE COMMAND CENTER</span>
              <h2>Intelligence, health and activity</h2>
              <p>Only the signals needed for the next responsible business decision.</p>
            </div>
            <Link href="/dashboard/procurement-copilot">Open full AI Co-Pilot →</Link>
          </div>

          <div className="d5ConsoleGrid">
            <div className="d5ConsoleCard">
              <strong>AI Insight</strong>
              <b>{unreadAlerts > 0 ? "Attention required" : momentum >= 60 ? "Healthy activity" : "Opportunity developing"}</b>
              <p>{unreadAlerts > 0
                ? `${unreadAlerts} unread alerts need human review before further automation.`
                : momentum >= 60
                  ? "Marketplace activity is strong across your current business signals."
                  : "Review new RFQs and improve active listings to build momentum."}</p>
              <Link href="/dashboard/procurement-copilot">Review explanation →</Link>
            </div>

            <div className="d5ConsoleCard">
              <strong>Business Health</strong>
              <div className="d5CompactHealth">
                <span>Readiness <b>{completion}%</b></span>
                <span>Verification <b>{isComplete ? "Complete" : "Pending"}</b></span>
                <span>Segments <b>{businessNature.length}</b></span>
                <span>Unread <b>{unreadAlerts}</b></span>
              </div>
            </div>

            <div className="d5ConsoleCard">
              <strong>Live Activity</strong>
              <div className="d5CompactActivity">
                <span><i className={unreadAlerts > 0 ? "attention" : "healthy"} />{unreadAlerts} unread vendor alerts</span>
                <span><i className={conversations > 0 ? "healthy" : "neutral"} />{conversations} buyer conversations</span>
                <span><i className={priceSignals > 0 ? "healthy" : "neutral"} />{priceSignals} verified price signals</span>
                <span><i className="healthy" />Business profile is live</span>
              </div>
              <Link href="/dashboard/inbox-v2">Open activity →</Link>
            </div>
          </div>
        </section>

        <div className="d5LegacyIntelligence" aria-hidden="true">{children}</div>

        <section className="d5WorkspaceLinks">
          <strong>Your Workspace Quick Links</strong>
          <div><Link href="/dashboard/workspace">Unified Workspace</Link><Link href="/dashboard/vendor/workspace">Vendor Work Desk</Link><Link href="/dashboard/vendor/rfqs">RFQ Work Desk</Link><Link href="/dashboard/inbox-v2">Inbox</Link><Link href="/price-today">Predictive Prices</Link><Link href="/rfq">+ New RFQ</Link></div>
        </section>
      </main>

      <aside className="d5RightRail">
        <section className="d5RailCard d5AiCard">
          <strong>🤖 3BOS AI Co-Pilot</strong>
          <span>✓ Explain the most important marketplace signals</span><span>✓ Suggest opportunities based on your registered segments</span><span>✓ Highlight risk and pending attention</span><span>✓ Keep every final decision under human control</span>
          <Link href="/dashboard/procurement-copilot">Open 3BOS AI Co-Pilot</Link>
        </section>
        <section className="d5RailCard d5WorkNow">
          <strong>⚡ Work Now</strong>
          <div className="d5WorkActions">
            <Link className="d5WorkAction primary" href="/materials/add">
              <span aria-hidden="true">＋</span>
              <b>Submit New Listing</b>
              <i aria-hidden="true">›</i>
            </Link>
            <Link className="d5WorkAction success" href="/dashboard/vendor/enquiries">
              <span aria-hidden="true">✎</span>
              <b>Send Proposal / Quote</b>
              <i aria-hidden="true">›</i>
            </Link>
            <Link className="d5WorkAction accent" href="/dashboard/vendor/rfqs">
              <span aria-hidden="true">⌕</span>
              <b>Find New RFQs</b>
              <i aria-hidden="true">›</i>
            </Link>
            <Link className="d5WorkAction secondary" href="/dashboard/vendor/workspace">
              <span aria-hidden="true">▤</span>
              <b>Manage My Listings</b>
              <i aria-hidden="true">›</i>
            </Link>
            <Link className="d5WorkAction secondary" href="/onboarding/business">
              <span aria-hidden="true">▣</span>
              <b>Update Business Profile</b>
              <i aria-hidden="true">›</i>
            </Link>
            <Link className="d5WorkAction secondary" href="/dashboard/procurement-analytics">
              <span aria-hidden="true">⌁</span>
              <b>View My Analytics</b>
              <i aria-hidden="true">›</i>
            </Link>
          </div>
        </section>
      </aside>

      <style jsx>{`
        .d5Shell{display:grid;grid-template-columns:240px minmax(0,1fr) 320px;gap:18px;width:100%;padding:14px;background:#f4f7fd;min-height:calc(100vh - 120px);color:#10234a}
        .d5Sidebar,.d5RightRail{min-width:0}.d5Sidebar{position:sticky;top:12px;align-self:start;background:#fff;border:1px solid #d8e3f5;border-radius:18px;padding:14px;box-shadow:0 10px 30px rgba(36,76,150,.08)}
        .d5SideIdentity{padding:4px 10px 14px;border-bottom:1px solid #e7edf7}.d5SideIdentity strong{display:block;font-size:18px}.d5Verified{display:block;color:#07884a;font-size:12px;font-weight:900;margin-top:6px}
        .d5Nav{display:grid;gap:7px;margin-top:12px}
        .d5NavLink{display:flex;align-items:center;gap:9px;min-height:44px;padding:8px 9px;border:1px solid #d8e4f4;border-radius:11px;text-decoration:none;color:#17315c;background:linear-gradient(180deg,#fff,#f8fbff);box-shadow:0 2px 7px rgba(31,70,132,.05);font-size:12px;line-height:1.25;transition:transform .16s ease,border-color .16s ease,box-shadow .16s ease,background .16s ease}
        .d5NavIcon{width:25px;height:25px;flex:0 0 auto;display:flex;align-items:center;justify-content:center;border-radius:7px;background:#edf4ff;color:#1767ef;font-size:13px}
        .d5NavLink b{min-width:0}
        .d5NavLink:hover{transform:translateX(2px);border-color:#8fb7f3;background:#edf5ff;box-shadow:0 6px 14px rgba(31,91,180,.12)}
        .d5NavLink:focus-visible{outline:3px solid rgba(23,103,239,.28);outline-offset:2px}
        .d5NavActive{color:#fff;border-color:#1767ef;background:linear-gradient(90deg,#1364ef,#2248e7);box-shadow:0 8px 20px rgba(28,91,230,.3)}
        .d5NavActive .d5NavIcon{background:rgba(255,255,255,.2);color:#fff}
        .d5NavLink em{margin-left:auto;min-width:24px;height:22px;display:inline-flex;align-items:center;justify-content:center;background:#ed1c3b;color:#fff;border-radius:999px;padding:0 7px;font-style:normal;font-size:11px;font-weight:900}
        .d5NavArrow{margin-left:auto;color:#7790b7;font-style:normal;font-size:18px;line-height:1}
        .d5NavLink em+.d5NavArrow{margin-left:0}
        .d5NavActive .d5NavArrow{color:#fff}
        .d5HelpCard{margin-top:14px;padding:12px;border-radius:14px;background:linear-gradient(140deg,#edf8ff,#eef2ff);border:1px solid #cfe1ff}.d5HelpCard strong,.d5HelpCard span{display:block}.d5HelpCard span{font-size:10px;margin-top:3px;color:#5e7094}.d5HelpCard a{display:block;margin-top:10px;padding:9px;border-radius:9px;background:#1769ee;color:#fff;text-align:center;text-decoration:none;font-weight:900;font-size:11px}
        .d5Main{min-width:0}.d5IdentityHero{display:grid;grid-template-columns:auto minmax(0,1fr) 250px 150px;gap:16px;align-items:center;padding:18px;border-radius:18px;background:linear-gradient(110deg,#dff1ff 0%,#eef4ff 55%,#b9d4ff 100%);border:1px solid #b9d2ff;box-shadow:0 12px 30px rgba(27,77,167,.09)}
        .d5LogoOrb{width:88px;height:88px;border-radius:50%;display:flex;align-items:center;justify-content:center;overflow:hidden;background:linear-gradient(145deg,#fff,#d9f6e5);border:5px solid #fff;box-shadow:0 0 0 2px #ff9c2a;color:#16834b;font-size:28px;font-weight:950}.d5LogoOrb img{width:100%;height:100%;object-fit:cover;display:block}.d5BusinessName{font-size:28px;font-weight:950;color:#10234a}.d5BusinessName span{color:#1364ef}.d5RoleLine{font-size:13px;margin-top:3px}.d5Location{font-size:12px;line-height:1.45;margin-top:8px;color:#4b638d}.d5Badges{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.d5Badges span{padding:6px 10px;border-radius:999px;background:#effff5;border:1px solid #8bd7ac;color:#087640;font-size:10px;font-weight:900}
        .d5CompletionCard{background:rgba(255,255,255,.82);border:1px solid #d4e0f3;border-radius:16px;padding:16px}.d5CompletionCard small,.d5CompletionCard b{display:block}.d5CompletionCard strong{display:block;color:#098646;font-size:30px;margin-top:5px}.d5CompletionCard strong span{font-size:16px;color:#263b63}.d5Progress{height:9px;background:#d8e3ed;border-radius:999px;overflow:hidden}.d5Progress i{display:block;height:100%;background:#10a453;border-radius:inherit}.d5CompletionCard b{font-size:10px;color:#078348;margin-top:7px}.d5HeroActions{display:grid;gap:10px}.d5HeroActions a{display:flex;align-items:center;justify-content:center;min-height:46px;padding:0 14px;border-radius:12px;text-decoration:none;font-size:12px;font-weight:900;background:#1464ef;color:#fff;box-shadow:0 7px 16px rgba(20,100,239,.18)}.d5HeroActions a+a{background:#fff;color:#233b6b;border:1px solid #c9d8ef}
        .d5ProfileActions{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin-top:12px}.d5ProfileAction{display:flex;align-items:center;gap:11px;min-height:66px;padding:13px;border-radius:14px;text-decoration:none;border:1px solid}.d5ProfileAction>span{width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.7);font-size:18px}.d5ProfileAction strong,.d5ProfileAction small{display:block}.d5ProfileAction strong{font-size:12px;line-height:1.25;color:#15305d}.d5ProfileAction small{font-size:10px;line-height:1.35;color:#63769a;margin-top:4px}.blue{background:#e8f3ff;border-color:#a9cef9}.purple{background:#f3eaff;border-color:#d2b7f5}.green{background:#e9fbee;border-color:#a8e1b7}.orange{background:#fff1df;border-color:#f2c58a}.pink{background:#ffeaf1;border-color:#f5b5c8}
        .d5ReadinessPanel,.d5Priorities{margin-top:10px;padding:14px;border:1px solid #d4e0f2;border-radius:17px;background:#fff}.d5ReadinessHeading,.d5PriorityHeading{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}.d5ReadinessHeading span,.d5PriorityHeading span{color:#1767ef;font-size:9px;font-weight:950;letter-spacing:.09em}.d5ReadinessHeading h2,.d5PriorityHeading h2{margin:4px 0 0;font-size:19px}.d5ReadinessHeading>strong{font-size:28px;color:#0a8b4e}.d5PriorityHeading p{margin:4px 0 0;color:#647596;font-size:10px}.d5PriorityHeading a{color:#1767ef;text-decoration:none;font-size:10px;font-weight:900}.d5ReadinessGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin-top:13px}.d5ReadinessItem{display:flex;gap:9px;align-items:flex-start;padding:11px;border-radius:13px;border:1px solid}.d5ReadinessItem>span{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:950}.d5ReadinessItem strong,.d5ReadinessItem small{display:block}.d5ReadinessItem strong{font-size:11px}.d5ReadinessItem small{font-size:9px;margin-top:3px;color:#647596}.d5ReadinessItem.ready{background:#effcf4;border-color:#a9dfbd}.d5ReadinessItem.ready>span{background:#0a9954;color:#fff}.d5ReadinessItem.pending{background:#fff8e8;border-color:#f2ce83}.d5ReadinessItem.pending>span{background:#e69b16;color:#fff}.d5PriorityCards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin-top:13px}.d5PriorityCards a{display:flex;gap:10px;padding:12px;border:1px solid #cdddf4;border-radius:13px;background:#f8fbff;text-decoration:none;color:#16325f}.d5PriorityCards a.urgent{border-color:#f2ba75;background:#fff8ec}.d5PriorityCards a>span{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#1767ef;color:#fff;font-size:11px;font-weight:950;flex:0 0 auto}.d5PriorityCards a.urgent>span{background:#d97706}.d5PriorityCards strong,.d5PriorityCards small{display:block}.d5PriorityCards strong{font-size:11px}.d5PriorityCards small{font-size:9px;margin-top:4px;color:#647596}.d5OperatingCenter{margin-top:10px;padding:14px;border:1px solid #d4e0f2;border-radius:17px;background:#fff}.d5SectionHeading{display:flex;justify-content:space-between;gap:12px}.d5SectionHeading h2{margin:0;font-size:20px}.d5SectionHeading p{margin:4px 0 0;font-size:11px;color:#647596}.d5StatusPills{display:flex;gap:7px;align-items:flex-start}.d5StatusPills span{padding:7px 10px;border-radius:999px;background:#eafff1;color:#08733e;font-size:10px;font-weight:900}
        .d5Kpis{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:9px;margin-top:13px}.d5Kpi{padding:12px;border:1px solid #d9e4f4;border-radius:13px;background:linear-gradient(160deg,#f6faff,#fff)}.d5Kpi span,.d5Kpi small{display:block;font-size:11px;color:#516b97;font-weight:800}.d5Kpi strong{display:block;font-size:23px;margin:7px 0 4px}.d5Kpi small{color:#188449}.d5DecisionRow{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:11px}.d5DecisionRow>div{position:relative;padding:12px;border:1px solid #bdd5ff;border-radius:13px;background:#f6f9ff}.d5DecisionRow>div+div{background:#eafff2;border-color:#9dddb7}.d5DecisionRow strong,.d5DecisionRow span{display:block}.d5DecisionRow strong{font-size:12px}.d5DecisionRow span{font-size:11px;line-height:1.4;margin-top:4px}.d5DecisionRow a{position:absolute;right:10px;top:16px;background:#078a46;color:#fff;padding:8px 12px;border-radius:9px;text-decoration:none;font-size:10px;font-weight:900}
        .d5ExecutiveConsole{margin-top:12px;padding:16px;border:1px solid #d4e0f2;border-radius:17px;background:#fff}.d5ConsoleHeading{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}.d5ConsoleHeading span{color:#1767ef;font-size:9px;font-weight:950;letter-spacing:.09em}.d5ConsoleHeading h2{margin:4px 0 0;font-size:19px}.d5ConsoleHeading p{margin:4px 0 0;color:#647596;font-size:10px}.d5ConsoleHeading a{color:#1767ef;text-decoration:none;font-size:10px;font-weight:900}.d5ConsoleGrid{display:grid;grid-template-columns:1.15fr 1fr 1fr;gap:10px;margin-top:13px}.d5ConsoleCard{min-width:0;padding:13px;border:1px solid #d9e4f4;border-radius:14px;background:linear-gradient(160deg,#f8fbff,#fff)}.d5ConsoleCard>strong{display:block;font-size:11px;color:#526b96}.d5ConsoleCard>b{display:block;margin-top:7px;font-size:16px;color:#142f5d}.d5ConsoleCard>p{margin:5px 0 0;font-size:11px;line-height:1.5;color:#607394}.d5ConsoleCard>a{display:inline-flex;margin-top:9px;color:#1767ef;text-decoration:none;font-size:10px;font-weight:900}.d5CompactHealth,.d5CompactActivity{display:grid;gap:7px;margin-top:9px}.d5CompactHealth span{display:flex;justify-content:space-between;gap:8px;padding:8px 0;border-top:1px solid #edf1f7;font-size:11px}.d5CompactHealth b{color:#1767ef}.d5CompactActivity span{display:flex;align-items:center;gap:7px;font-size:11px;color:#29436e}.d5CompactActivity i{width:8px;height:8px;border-radius:50%;background:#94a3b8}.d5CompactActivity i.healthy{background:#0a9954}.d5CompactActivity i.attention{background:#d97706}.d5LegacyIntelligence{display:none}
        .d5WorkspaceLinks{margin-top:12px;padding:12px 14px;border:1px solid #d1def1;border-radius:15px;background:#eef4ff}.d5WorkspaceLinks>strong{display:block;font-size:12px}.d5WorkspaceLinks>div{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}.d5WorkspaceLinks a{padding:7px 11px;border-radius:999px;background:#fff;border:1px solid #cbd9ed;text-decoration:none;font-size:10px;color:#1c3765;font-weight:850}
        .d5RightRail{display:grid;gap:14px;align-content:start}.d5RailCard{background:#fff;border:1px solid #d4e0f1;border-radius:16px;padding:14px;box-shadow:0 9px 26px rgba(26,72,153,.07)}.d5RailCard>strong{display:block;font-size:15px;margin-bottom:11px}.d5AiCard{background:linear-gradient(155deg,#eef0ff,#e8e2ff)}.d5AiCard span{display:block;font-size:11px;line-height:1.45;margin-top:9px;color:#29436d}.d5AiCard>a{display:flex;align-items:center;justify-content:center;margin-top:12px;padding:10px;border-radius:9px;background:linear-gradient(90deg,#5234e8,#6814ce);color:#fff;text-align:center;text-decoration:none;font-size:11px;font-weight:900}
        .d5WorkNow{border-color:#c9d9ef}
        .d5WorkActions{display:grid;gap:9px}
        .d5WorkAction{display:grid;grid-template-columns:32px minmax(0,1fr) 18px;gap:9px;align-items:center;min-height:48px;padding:7px 9px;border:1px solid;border-radius:11px;text-decoration:none;box-shadow:0 3px 9px rgba(25,61,120,.08);transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease}
        .d5WorkAction>span{display:flex;width:32px;height:32px;align-items:center;justify-content:center;border-radius:9px;background:rgba(255,255,255,.2);font-size:16px;font-weight:950}
        .d5WorkAction>b{font-size:11px;line-height:1.3}
        .d5WorkAction>i{font-style:normal;font-size:20px;line-height:1;text-align:right}
        .d5WorkAction:hover{transform:translateY(-2px);box-shadow:0 8px 18px rgba(25,61,120,.16)}
        .d5WorkAction:focus-visible{outline:3px solid rgba(23,103,239,.28);outline-offset:2px}
        .d5WorkAction.primary{background:#1768ef;border-color:#1768ef;color:#fff}
        .d5WorkAction.success{background:#0b9456;border-color:#0b9456;color:#fff}
        .d5WorkAction.accent{background:#6128dc;border-color:#6128dc;color:#fff}
        .d5WorkAction.secondary{background:linear-gradient(180deg,#fff,#f7faff);border-color:#c5d5ea;color:#1d3a68}
        .d5WorkAction.secondary>span{background:#eaf2ff;color:#1767ef}
        .d5WorkAction.secondary:hover{border-color:#7fa9e8;background:#eef5ff}
        @media(max-width:1280px){.d5ConsoleGrid{grid-template-columns:1fr 1fr}.d5ConsoleCard:first-child{grid-column:1/-1}.d5Shell{grid-template-columns:210px minmax(0,1fr)}.d5RightRail{grid-column:1/-1;grid-template-columns:1fr 1fr}.d5IdentityHero{grid-template-columns:auto minmax(0,1fr) 230px}.d5HeroActions{grid-column:1/-1;grid-template-columns:1fr 1fr}.d5Kpis{grid-template-columns:repeat(3,1fr)}}
        @media(max-width:900px){.d5ConsoleGrid{grid-template-columns:1fr}.d5ConsoleCard:first-child{grid-column:auto}.d5ReadinessGrid{grid-template-columns:repeat(2,1fr)}.d5PriorityCards{grid-template-columns:1fr}.d5Shell{display:block;padding:9px}.d5Sidebar{position:static}.d5Nav{grid-template-columns:repeat(2,1fr)}.d5IdentityHero{grid-template-columns:auto 1fr}.d5CompletionCard,.d5HeroActions{grid-column:1/-1}.d5ProfileActions{grid-template-columns:repeat(2,1fr)}.d5BottomGrid{grid-template-columns:1fr}.d5RightRail{grid-template-columns:1fr;margin-top:12px}}
        @media(max-width:600px){.d5ConsoleHeading{display:block}.d5ConsoleHeading a{display:inline-flex;margin-top:9px}.d5ReadinessGrid{grid-template-columns:1fr}.d5ReadinessHeading,.d5PriorityHeading{display:block}.d5ReadinessHeading>strong,.d5PriorityHeading a{display:inline-flex;margin-top:9px}.d5Nav{grid-template-columns:1fr}.d5IdentityHero{display:block}.d5LogoOrb{margin-bottom:12px}.d5CompletionCard{margin-top:12px}.d5ProfileActions{grid-template-columns:1fr}.d5Kpis{grid-template-columns:repeat(2,1fr)}.d5DecisionRow{grid-template-columns:1fr}.d5DecisionRow a{position:static;display:inline-flex;margin-top:8px}.d5SectionHeading{display:block}.d5StatusPills{margin-top:9px}.d5RightRail{display:grid}}

        /* MOBILE_DASHBOARD_COMPACT_V3 */
        @media(max-width:900px){
          .d5Shell{
            display:flex!important;
            flex-direction:column!important;
            gap:8px!important;
            width:100%!important;
            max-width:none!important;
            margin:0!important;
            padding:0!important;
            overflow-x:hidden!important;
          }
          .d5Sidebar{
            display:none!important;
          }
          .d5RightRail{
            order:1!important;
            display:block!important;
            width:100%!important;
            max-width:none!important;
            margin:0!important;
            padding:0 8px!important;
          }
          .d5Main{
            order:2!important;
            width:100%!important;
            max-width:none!important;
            margin:0!important;
            padding:0 8px 8px!important;
          }
          .d5AiCard{
            display:none!important;
          }
          .d5WorkNow{
            display:block!important;
            width:100%!important;
            margin:0!important;
          }
          .d5IdentityHero{
            grid-template-columns:auto minmax(0,1fr)!important;
            gap:11px!important;
            padding:13px!important;
            border-radius:14px!important;
          }
          .d5LogoOrb{
            width:68px!important;
            height:68px!important;
            border-width:4px!important;
          }
          .d5BusinessName{font-size:22px!important}
          .d5RoleLine{font-size:11px!important}
          .d5Location{font-size:10px!important}
          .d5CompletionCard,.d5HeroActions{
            grid-column:1/-1!important;
          }
          .d5HeroActions{
            grid-template-columns:1fr 1fr!important;
          }
          .d5ProfileActions{
            grid-template-columns:repeat(2,minmax(0,1fr))!important;
          }
          .d5ReadinessGrid{
            grid-template-columns:repeat(2,minmax(0,1fr))!important;
          }
          .d5PriorityCards{
            grid-template-columns:1fr!important;
          }
          .d5Kpis{
            grid-template-columns:repeat(3,minmax(0,1fr))!important;
          }
          .d5ConsoleGrid{
            grid-template-columns:1fr!important;
          }
        }

        @media(max-width:600px){
          .d5RightRail,.d5Main{
            padding-left:6px!important;
            padding-right:6px!important;
          }
          .d5WorkActions{
            grid-template-columns:1fr 1fr!important;
            gap:7px!important;
          }
          .d5WorkAction{
            grid-template-columns:29px minmax(0,1fr) 14px!important;
            min-height:48px!important;
            padding:6px 7px!important;
          }
          .d5WorkAction>span{
            width:29px!important;
            height:29px!important;
          }
          .d5WorkAction>b{font-size:10px!important}
          .d5WorkAction>i{font-size:17px!important}
          .d5IdentityHero{
            display:grid!important;
            grid-template-columns:58px minmax(0,1fr)!important;
            padding:11px!important;
          }
          .d5LogoOrb{
            width:58px!important;
            height:58px!important;
            margin:0!important;
          }
          .d5BusinessName{font-size:19px!important}
          .d5RoleLine{
            font-size:10px!important;
            line-height:1.35!important;
          }
          .d5Location{margin-top:5px!important}
          .d5Badges{
            gap:5px!important;
            margin-top:7px!important;
          }
          .d5Badges span{
            padding:4px 7px!important;
            font-size:9px!important;
          }
          .d5ProfileActions{
            display:none!important;
          }
          .d5ReadinessPanel,.d5Priorities,.d5OperatingCenter{
            margin-top:8px!important;
            padding:11px!important;
          }
          .d5ReadinessGrid{
            grid-template-columns:1fr 1fr!important;
            gap:6px!important;
          }
          .d5ReadinessItem{
            padding:8px!important;
            gap:6px!important;
          }
          .d5PriorityCards{gap:7px!important}
          .d5PriorityCards a{padding:10px!important}
          .d5Kpis{
            grid-template-columns:repeat(2,minmax(0,1fr))!important;
            gap:7px!important;
          }
          .d5Kpi{padding:9px!important}
          .d5DecisionRow{
            grid-template-columns:1fr!important;
          }
          .d5DecisionRow a{
            position:static!important;
            display:inline-flex!important;
            margin-top:8px!important;
          }
          .d5ExecutiveConsole,.d5WorkspaceLinks{
            display:none!important;
          }
        }


        /* VENDOR_DASHBOARD_6_MOBILE */
        @media(max-width:600px){
          .d5Shell{background:#f4f7fd!important;min-height:auto!important}

          .d5WorkNow{padding:11px!important;border-radius:14px!important;box-shadow:none!important}
          .d5RailCard>strong{margin-bottom:9px!important;font-size:15px!important}
          .d5WorkActions{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:7px!important}
          .d5WorkAction{grid-template-columns:26px minmax(0,1fr)!important;gap:7px!important;min-height:46px!important;padding:7px!important;border-radius:10px!important;box-shadow:none!important}
          .d5WorkAction>span{width:26px!important;height:26px!important;border-radius:7px!important;font-size:13px!important}
          .d5WorkAction>b{font-size:10px!important;line-height:1.25!important}
          .d5WorkAction>i{display:none!important}

          .d5IdentityHero{gap:9px!important;padding:11px!important;border-radius:14px!important;box-shadow:none!important}
          .d5IdentityCopy{min-width:0!important}
          .d5BusinessName{font-size:18px!important;line-height:1.15!important}
          .d5RoleLine{display:-webkit-box!important;overflow:hidden!important;-webkit-line-clamp:2!important;-webkit-box-orient:vertical!important}
          .d5Location{display:none!important}
          .d5Badges{margin-top:6px!important}
          .d5CompletionCard{grid-column:1/-1!important;display:grid!important;grid-template-columns:1fr auto!important;gap:5px 10px!important;align-items:center!important;padding:10px!important;margin:0!important;border-radius:11px!important}
          .d5CompletionCard small{font-size:10px!important}
          .d5CompletionCard strong{grid-column:2!important;grid-row:1!important;margin:0!important;font-size:22px!important}
          .d5CompletionCard strong span{font-size:11px!important}
          .d5Progress{grid-column:1/-1!important;height:7px!important}
          .d5CompletionCard b{display:none!important}
          .d5HeroActions{grid-template-columns:1fr 1fr!important;gap:7px!important}
          .d5HeroActions a{min-height:40px!important;padding:0 8px!important;border-radius:9px!important;font-size:10px!important;box-shadow:none!important}

          .d5ReadinessPanel{display:none!important}

          .d5Priorities{padding:11px!important;border-radius:14px!important}
          .d5PriorityHeading h2{font-size:18px!important}
          .d5PriorityHeading p{display:none!important}
          .d5PriorityHeading a{margin-top:6px!important;padding:7px 9px!important;border:1px solid #c7d8ef!important;border-radius:8px!important;background:#f5f9ff!important}
          .d5PriorityCards{margin-top:9px!important;gap:6px!important}
          .d5PriorityCards a{align-items:center!important;padding:9px!important;border-radius:10px!important}
          .d5PriorityCards a>span{width:25px!important;height:25px!important;font-size:10px!important}
          .d5PriorityCards strong{font-size:10px!important}
          .d5PriorityCards small{display:none!important}

          .d5OperatingCenter{padding:11px!important;border-radius:14px!important}
          .d5SectionHeading h2{font-size:18px!important}
          .d5SectionHeading p{display:none!important}
          .d5StatusPills{margin-top:6px!important}
          .d5StatusPills span{padding:5px 8px!important;font-size:9px!important}
          .d5Kpis{margin-top:9px!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:7px!important}
          .d5Kpi{min-height:86px!important;padding:9px!important;border-radius:10px!important}
          .d5Kpi:nth-child(n+5){display:none!important}
          .d5Kpi span,.d5Kpi small{font-size:9px!important}
          .d5Kpi strong{margin:6px 0 3px!important;font-size:22px!important}
          .d5DecisionRow{display:block!important;margin-top:8px!important}
          .d5DecisionRow>div:first-child{display:none!important}
          .d5DecisionRow>div+div{padding:10px!important;border-radius:10px!important}
          .d5DecisionRow span{font-size:10px!important}
          .d5DecisionRow a{padding:7px 9px!important;border-radius:8px!important;font-size:9px!important}
        }

      `}</style>
    </div>
  );
}
