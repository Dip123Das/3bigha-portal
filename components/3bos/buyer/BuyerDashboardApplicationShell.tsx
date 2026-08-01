"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import styles from "./BuyerDashboardApplicationShell.module.css";

type Props = {
  children: ReactNode;
  email?: string | null;
  buyerName?: string | null;
  avatarUrl?: string | null;
  totalRequirements?: number;
  activeRequirements?: number;
  urgentRequirements?: number;
};

type BuyerNavItem = {
  label: string;
  href: string;
  icon: string;
  exact?: boolean;
  secondary?: boolean;
};

type BuyerNavSection = {
  group: string;
  items: BuyerNavItem[];
};

const NAV: BuyerNavSection[] = [
  {
    group: "Operate",
    items: [
      { label: "Overview", href: "/dashboard/buyer", icon: "⌂", exact: true },
      { label: "Requirements", href: "/dashboard/buyer/rfqs", icon: "▤" },
      { label: "Create Requirement", href: "/rfq", icon: "+" },
      { label: "Compare Quotes", href: "/dashboard/buyer/enquiries", icon: "⇄" },
      { label: "Conversations", href: "/dashboard/buyer/inbox", icon: "◌" },
    ],
  },
  {
    group: "Discover",
    items: [
      { label: "Marketplace", href: "/search", icon: "⌕" },
      { label: "All Conversations", href: "/dashboard/inbox", icon: "✉" },
    ],
  },
  {
    group: "Identity",
    items: [
      { label: "Business Identity", href: "/dashboard/workspace", icon: "◉" },
      { label: "AI Assistance", href: "/dashboard/inbox-v2", icon: "✦", secondary: true },
    ],
  },
];

function active(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export default function BuyerDashboardApplicationShell({
  children,
  email,
  buyerName,
  avatarUrl,
  totalRequirements = 0,
  activeRequirements = 0,
  urgentRequirements = 0,
}: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.workspace}>
      <button
        type="button"
        className={styles.mobileBar}
        aria-expanded={open}
        aria-controls="buyer-workspace-nav"
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden="true">{open ? "×" : "☰"}</span>
        Buyer Workspace
        <small>{activeRequirements} active</small>
      </button>

      {open ? (
        <button
          className={styles.backdrop}
          type="button"
          aria-label="Close buyer navigation"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <aside
        id="buyer-workspace-nav"
        className={[styles.sidebar, open ? styles.sidebarOpen : ""].filter(Boolean).join(" ")}
      >
        <div className={styles.brand}>
          <div>
            <span>Human-First Procurement</span>
            <strong>Buyer Workspace</strong>
          </div>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close navigation">
            ×
          </button>
        </div>

        <div className={styles.identity}>
          <div className={styles.avatar}>
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={`${buyerName || "Buyer"} profile`}
                referrerPolicy="no-referrer"
              />
            ) : (
              <span aria-hidden="true">
                {(buyerName || "Buyer").trim().charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <span>Welcome</span>
            <strong>{buyerName || "Buyer"}</strong>
            <small>{email || "3Bigha member"}</small>
          </div>
        </div>

        <div className={styles.sidebarStats}>
          <div><span>Total</span><strong>{totalRequirements}</strong></div>
          <div><span>Active</span><strong>{activeRequirements}</strong></div>
          <div><span>Attention</span><strong>{urgentRequirements}</strong></div>
        </div>

        <nav className={styles.nav} aria-label="Buyer workspace navigation">
          {NAV.map((section) => (
            <section key={section.group}>
              <p>{section.group}</p>
              {section.items.map((item) => {
                const selected = active(pathname, item.href, item.exact);
                return (
                  <Link
                    key={`${section.group}:${item.label}`}
                    href={item.href}
                    className={[
                      styles.navLink,
                      selected ? styles.navLinkActive : "",
                      item.secondary ? styles.secondaryNav : "",
                    ].filter(Boolean).join(" ")}
                    aria-current={selected ? "page" : undefined}
                    data-buyer-nav-destination={item.href}
                    onClick={() => setOpen(false)}
                  >
                    <span aria-hidden="true">{item.icon}</span>
                    <strong>{item.label}</strong>
                  </Link>
                );
              })}
            </section>
          ))}
        </nav>

        <div className={styles.governance}>
          <strong>You remain in control.</strong>
          <span>AI may assist, but it never chooses the supplier or final decision.</span>
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.topbar}>
          <div>
            <span>India&apos;s Human-First Business Operating System</span>
            <h1>Welcome, {buyerName || "Buyer"}</h1>
            <p>Your Buyer Work Desk is ready to create requirements, compare suppliers, converse and decide.</p>
          </div>
          <div className={styles.topActions}>
            <Link href="/dashboard/buyer/rfqs">My Requirements</Link>
            <Link href="/rfq">Create Requirement</Link>
          </div>
        </header>

        <div className={styles.content}>{children}</div>
      </main>
    </div>
  );
}
