"use client";

import Link from "next/link";
import styles from "./BuyerExecutiveDashboard.module.css";

type RecentRequirement = {
  id: string;
  title: string;
  status: string;
  module: string;
  createdAt?: string | null;
  neededBy?: string | null;
};

type Reminder = {
  id: string;
  title: string;
  message: string;
  href: string;
  cta: string;
  icon?: string;
};

type Props = {
  totalRfqs: number;
  activeRfqs: number;
  closedRfqs: number;
  urgentRfqs: number;
  memoryCount: number;
  healthScore: number;
  successPrediction: string;
  recentRequirements: RecentRequirement[];
  reminders: Reminder[];
  aiSummary?: string | null;
  aiNextAction?: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return "Date not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date not set";
  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function BuyerExecutiveDashboard({
  totalRfqs,
  activeRfqs,
  closedRfqs,
  urgentRfqs,
  memoryCount,
  healthScore,
  successPrediction,
  recentRequirements,
  reminders,
  aiSummary,
  aiNextAction,
}: Props) {
  return (
    <div className={styles.dashboard}>
      <section className={styles.commandCentre}>
        <div>
          <span className={styles.eyebrow}>Today&apos;s procurement command centre</span>
          <h2>
            {activeRfqs > 0
              ? `Continue ${activeRfqs} active buying ${activeRfqs === 1 ? "decision" : "decisions"}`
              : "Start with one clear requirement"}
          </h2>
          <p>
            {activeRfqs > 0
              ? "Review supplier responses, compare quotations and continue the conversation before making your final decision."
              : "Describe what you need in plain language. 3Bigha keeps the process structured while you remain in control."}
          </p>
          <div className={styles.actions}>
            <Link href="/rfq" className={styles.primary}>Create Requirement</Link>
            <Link href="/dashboard/buyer/rfqs" className={styles.secondary}>Review Requirements</Link>
          </div>
        </div>

        <aside className={styles.healthCard}>
          <span>Procurement readiness</span>
          <strong>{healthScore}%</strong>
          <div className={styles.healthTrack}>
            <i style={{ width: `${Math.max(4, Math.min(100, healthScore))}%` }} />
          </div>
          <p>{successPrediction}</p>
        </aside>
      </section>

      <section className={styles.kpis}>
        {[
          ["Requirements", totalRfqs, "All buying requests"],
          ["Active", activeRfqs, "Open for response or decision"],
          ["Completed", closedRfqs, "Procurement decisions closed"],
          ["Attention", urgentRfqs, urgentRfqs > 0 ? "Needs your review" : "No urgent work"],
          ["Reusable memory", memoryCount, "Previous requirement context"],
        ].map(([label, value, detail]) => (
          <article key={String(label)}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{detail}</small>
          </article>
        ))}
      </section>

      <div className={styles.executiveGrid}>
        <section className={styles.panel}>
          <header>
            <div>
              <span className={styles.eyebrow}>Continue your work</span>
              <h3>Recent requirements</h3>
            </div>
            <Link href="/dashboard/buyer/rfqs">View all</Link>
          </header>

          {recentRequirements.length > 0 ? (
            <div className={styles.requirements}>
              {recentRequirements.slice(0, 5).map((item) => (
                <Link key={item.id} href={`/dashboard/buyer/rfqs/${item.id}`}>
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.module} · Created {formatDate(item.createdAt)}</span>
                  </div>
                  <div className={styles.meta}>
                    <small>{item.status || "Open"}</small>
                    <span>Needed {formatDate(item.neededBy)}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>
              <strong>No requirement created yet</strong>
              <p>Start with one simple need and invite suitable vendors to respond.</p>
              <Link href="/rfq">Create your first requirement</Link>
            </div>
          )}
        </section>

        <section className={styles.panel}>
          <header>
            <div>
              <span className={styles.eyebrow}>Human-first priorities</span>
              <h3>Needs your attention</h3>
            </div>
          </header>
          <div className={styles.reminders}>
            {reminders.slice(0, 4).map((item) => (
              <Link key={item.id} href={item.href}>
                <span aria-hidden="true">{item.icon || "•"}</span>
                <div>
                  <strong>{item.title}</strong>
                  <small>{item.message}</small>
                  <em>{item.cta} →</em>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <section className={styles.journey}>
        <header>
          <span className={styles.eyebrow}>Human Journey</span>
          <h3>One clear path from need to decision</h3>
        </header>
        <div>
          {[
            ["01", "Describe", "State the requirement in familiar language.", "/rfq"],
            ["02", "Receive", "Suitable vendors respond through the existing RFQ engine.", "/dashboard/buyer/rfqs"],
            ["03", "Compare", "Review price, suitability and vendor context.", "/dashboard/buyer/rfqs"],
            ["04", "Converse", "Ask questions and negotiate before deciding.", "/dashboard/buyer/inbox"],
            ["05", "Decide", "Choose the supplier yourself and complete procurement.", "/dashboard/buyer/rfqs"],
          ].map(([number, title, detail, href]) => (
            <Link key={number} href={href}>
              <span>{number}</span>
              <strong>{title}</strong>
              <small>{detail}</small>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.ai}>
        <div>
          <span className={styles.eyebrow}>Optional assistance</span>
          <h3>AI supports your work; it does not make the decision</h3>
          <p>{aiSummary || "3Bigha can organise signals and explain possible next steps after your human work is clear."}</p>
        </div>
        <aside>
          <span>{aiNextAction || "Open assistance only when it is useful."}</span>
          <Link href="/dashboard/inbox-v2">Open AI Assistance</Link>
        </aside>
      </section>
    </div>
  );
}
