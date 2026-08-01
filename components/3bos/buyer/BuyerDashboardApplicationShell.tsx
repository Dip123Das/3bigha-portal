"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import styles from "./BuyerDashboardApplicationShell.module.css";

type BuyerDashboardApplicationShellProps = {
  children: ReactNode;
  email?: string | null;
  totalRequirements?: number;
  activeRequirements?: number;
  urgentRequirements?: number;
};

const PRIMARY_NAV = [
  { label: "Overview", help: "Your procurement command centre", href: "/dashboard/buyer", icon: "⌂", exact: true },
  { label: "My Requirements", help: "Track RFQs and buying work", href: "/dashboard/buyer/rfqs", icon: "▤" },
  { label: "Create Requirement", help: "Tell vendors what you need", href: "/rfq", icon: "+" },
  { label: "Compare Quotes", help: "Review vendor responses", href: "/dashboard/buyer/rfqs", icon: "⇄" },
  { label: "Conversations", help: "Continue supplier discussions", href: "/dashboard/buyer/inbox", icon: "◌" },
];

const DISCOVERY_NAV = [
  { label: "Marketplace", help: "Find materials, services and property", href: "/search", icon: "⌕" },
  { label: "Unified Inbox", help: "Open all existing conversations", href: "/dashboard/inbox", icon: "✉" },
];

const SUPPORT_NAV = [
  { label: "Business Identity", help: "Review your profile and location", href: "/dashboard/workspace", icon: "◉" },
  { label: "AI Assistance", help: "Optional help after your work", href: "/dashboard/inbox-v2", icon: "✦", secondary: true },
];

function navIsActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function BuyerDashboardApplicationShell({
  children,
  email,
  totalRequirements = 0,
  activeRequirements = 0,
  urgentRequirements = 0,
}: BuyerDashboardApplicationShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const renderGroup = (
    label: string,
    items: Array<{
      label: string;
      help: string;
      href: string;
      icon: string;
      exact?: boolean;
      secondary?: boolean;
    }>
  ) => (
    <section className={styles.navGroup} aria-label={label}>
      <p className={styles.navGroupLabel}>{label}</p>
      <div className={styles.navList}>
        {items.map((item) => {
          const active = navIsActive(pathname, item.href, item.exact);
          return (
            <Link
              key={`${item.label}:${item.href}`}
              href={item.href}
              className={[
                styles.navItem,
                active ? styles.navItemActive : "",
                item.secondary ? styles.navItemSecondary : "",
              ].filter(Boolean).join(" ")}
              aria-current={active ? "page" : undefined}
              onClick={() => setMobileOpen(false)}
            >
              <span className={styles.navIcon} aria-hidden="true">{item.icon}</span>
              <span className={styles.navCopy}>
                <strong>{item.label}</strong>
                <small>{item.help}</small>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );

  return (
    <div className={styles.application}>
      <button
        type="button"
        className={styles.mobileTrigger}
        aria-expanded={mobileOpen}
        aria-controls="buyer-workspace-navigation"
        onClick={() => setMobileOpen((current) => !current)}
      >
        <span aria-hidden="true">{mobileOpen ? "×" : "☰"}</span>
        Buyer workspace
        <small>{activeRequirements} active</small>
      </button>

      {mobileOpen ? (
        <button
          className={styles.mobileBackdrop}
          type="button"
          aria-label="Close buyer navigation"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        id="buyer-workspace-navigation"
        className={[styles.sidebar, mobileOpen ? styles.sidebarOpen : ""].filter(Boolean).join(" ")}
      >
        <div className={styles.sidebarHeader}>
          <div>
            <span className={styles.eyebrow}>Human-First Procurement</span>
            <h2>Buyer Workspace</h2>
          </div>
          <button
            type="button"
            className={styles.mobileClose}
            aria-label="Close buyer navigation"
            onClick={() => setMobileOpen(false)}
          >
            ×
          </button>
        </div>

        <div className={styles.identity}>
          <div className={styles.identityMark} aria-hidden="true">B</div>
          <div>
            <span>Working as</span>
            <strong>Buyer</strong>
            <small>{email || "3Bigha member"}</small>
          </div>
        </div>

        <div className={styles.statusPanel}>
          <div><span>Total</span><strong>{totalRequirements}</strong></div>
          <div><span>Active</span><strong>{activeRequirements}</strong></div>
          <div><span>Attention</span><strong>{urgentRequirements}</strong></div>
        </div>

        {renderGroup("Buying journey", PRIMARY_NAV)}
        {renderGroup("Discovery and communication", DISCOVERY_NAV)}
        {renderGroup("Identity and assistance", SUPPORT_NAV)}

        <p className={styles.controlNote}>
          You choose the requirement, supplier and final decision. AI remains optional assistance.
        </p>
      </aside>

      <main className={styles.canvas}>
        <header className={styles.workspaceHeader}>
          <div>
            <span className={styles.eyebrow}>India&apos;s Human-First Business Operating System</span>
            <h1>Buyer Work Desk</h1>
            <p>
              Create requirements, receive quotations, compare suppliers,
              continue conversations and make your buying decision.
            </p>
          </div>
          <div className={styles.headerActions}>
            <Link href="/dashboard/buyer/rfqs" className={styles.secondaryAction}>My Requirements</Link>
            <Link href="/rfq" className={styles.primaryAction}>Create Requirement</Link>
          </div>
        </header>

        <section className={styles.journey} aria-label="Human buying journey">
          {[
            ["01", "Describe need"],
            ["02", "Receive quotes"],
            ["03", "Compare"],
            ["04", "Converse"],
            ["05", "Decide"],
          ].map(([number, label]) => (
            <div key={number}>
              <span>{number}</span>
              <strong>{label}</strong>
            </div>
          ))}
        </section>

        <div className={styles.content}>{children}</div>
      </main>
    </div>
  );
}
