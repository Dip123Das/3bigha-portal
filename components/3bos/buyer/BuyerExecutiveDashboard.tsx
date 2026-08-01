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
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function BuyerExecutiveDashboard(props: Props) {
  const {
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
  } = props;

  return (
    <div className={styles.dashboard}>
      <section className={styles.cockpit}>
        <div className={styles.primaryWork}>
          <span className={styles.eyebrow}>Today&apos;s priority</span>
          <h2>{activeRfqs > 0 ? "Continue active procurement" : "Create your first requirement"}</h2>
          <p>
            {activeRfqs > 0
              ? "Review quotations, continue supplier conversations and move the right requirement toward a decision."
              : "Describe what you need in familiar language. 3Bigha will structure the process without taking control away from you."}
          </p>
          <div className={styles.primaryActions}>
            <Link href="/rfq">Create Requirement</Link>
            <Link href="/dashboard/buyer/rfqs">Open Requirements</Link>
            <Link href="/dashboard/buyer/inbox">Open Conversations</Link>
          </div>
        </div>

        <div className={styles.readiness}>
          <span>Procurement readiness</span>
          <strong>{healthScore}%</strong>
          <div><i style={{ width: `${Math.max(4, Math.min(100, healthScore))}%` }} /></div>
          <small>{successPrediction}</small>
        </div>
      </section>

      <section className={styles.kpiStrip}>
        {[
          ["Requirements", totalRfqs],
          ["Active", activeRfqs],
          ["Completed", closedRfqs],
          ["Attention", urgentRfqs],
          ["Reusable memory", memoryCount],
        ].map(([label, value]) => (
          <article key={String(label)}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </section>

      <div className={styles.grid}>
        <section className={styles.workPanel}>
          <header>
            <div>
              <span className={styles.eyebrow}>Continue your work</span>
              <h3>Requirements and supplier responses</h3>
            </div>
            <Link href="/dashboard/buyer/rfqs">View all</Link>
          </header>

          {recentRequirements.length ? (
            <div className={styles.requirementList}>
              {recentRequirements.slice(0, 5).map((item) => (
                <Link key={item.id} href={`/dashboard/buyer/rfqs/${item.id}`}>
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.module} · Created {formatDate(item.createdAt)}</span>
                  </div>
                  <div>
                    <small>{item.status || "Open"}</small>
                    <span>Needed {formatDate(item.neededBy)}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>
              <strong>No requirement created yet</strong>
              <span>Post one requirement and invite suitable vendors to respond.</span>
              <Link href="/rfq">Create your first requirement</Link>
            </div>
          )}
        </section>

        <aside className={styles.attentionPanel}>
          <header>
            <span className={styles.eyebrow}>Needs your attention</span>
            <h3>Next best actions</h3>
          </header>
          <div className={styles.reminders}>
            {reminders.slice(0, 4).map((item) => (
              <Link key={item.id} href={item.href}>
                <span>{item.icon || "•"}</span>
                <div>
                  <strong>{item.title}</strong>
                  <small>{item.message}</small>
                  <em>{item.cta} →</em>
                </div>
              </Link>
            ))}
          </div>
        </aside>
      </div>

      <section className={styles.journey}>
        <header>
          <span className={styles.eyebrow}>Human Journey</span>
          <h3>From need to decision</h3>
        </header>
        <div>
          {[
            ["01", "Describe", "State your requirement", "/rfq"],
            ["02", "Receive", "Collect supplier responses", "/dashboard/buyer/rfqs"],
            ["03", "Compare", "Review price and suitability", "/dashboard/buyer/rfqs"],
            ["04", "Converse", "Clarify and negotiate", "/dashboard/buyer/inbox"],
            ["05", "Decide", "Choose the supplier yourself", "/dashboard/buyer/rfqs"],
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
          <p>{aiSummary || "Use assistance only when it helps organise information or explain a next step."}</p>
        </div>
        <aside>
          <span>{aiNextAction || "Your supplier choice and final decision remain yours."}</span>
          <Link href="/dashboard/inbox-v2">Open AI Assistance</Link>
        </aside>
      </section>
    </div>
  );
}
