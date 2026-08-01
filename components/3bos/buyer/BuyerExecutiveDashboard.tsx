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

type JourneyState = "complete" | "current" | "upcoming";

type JourneyStep = {
  number: string;
  title: string;
  detail: string;
  href: string;
  state: JourneyState;
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

function normalizedStatus(value: string) {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function deriveJourney(
  totalRfqs: number,
  activeRfqs: number,
  closedRfqs: number,
  requirements: RecentRequirement[]
): JourneyStep[] {
  const statuses = requirements.map((item) => normalizedStatus(item.status));

  const hasQuotes = statuses.some((status) =>
    ["quoted", "quote", "quotesreceived", "responded", "comparison", "negotiation"].some((token) =>
      status.includes(token)
    )
  );

  const inConversation = statuses.some((status) =>
    ["conversation", "negotiation", "discussion", "clarification"].some((token) =>
      status.includes(token)
    )
  );

  const decided = closedRfqs > 0 && activeRfqs === 0;
  const currentIndex =
    totalRfqs === 0 ? 0 :
    decided ? 4 :
    inConversation ? 3 :
    hasQuotes ? 2 :
    activeRfqs > 0 ? 1 :
    1;

  const definitions = [
    ["01", "Describe", "State your requirement", "/rfq"],
    ["02", "Receive", "Collect supplier responses", "/dashboard/buyer/rfqs?status=active"],
    ["03", "Compare", "Review price and suitability", "/dashboard/buyer/rfqs?view=compare"],
    ["04", "Converse", "Clarify and negotiate", "/dashboard/buyer/inbox"],
    ["05", "Decide", "Choose the supplier yourself", "/dashboard/buyer/rfqs?status=completed"],
  ] as const;

  return definitions.map(([number, title, detail, href], index) => ({
    number,
    title,
    detail,
    href,
    state: index < currentIndex ? "complete" : index === currentIndex ? "current" : "upcoming",
  }));
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
  const journey = deriveJourney(totalRfqs, activeRfqs, closedRfqs, recentRequirements);
  const isFirstTimeBuyer = totalRfqs === 0;

  const metrics = [
    {
      label: "Requirements",
      value: totalRfqs,
      detail: "All buying requests",
      href: "/dashboard/buyer/rfqs",
    },
    {
      label: "Active",
      value: activeRfqs,
      detail: "Open work and supplier responses",
      href: "/dashboard/buyer/rfqs?status=active",
    },
    {
      label: "Completed",
      value: closedRfqs,
      detail: "Finished procurement decisions",
      href: "/dashboard/buyer/rfqs?status=completed",
    },
    {
      label: "Attention",
      value: urgentRfqs,
      detail: urgentRfqs > 0 ? "Needs review now" : "No urgent work",
      href: "/dashboard/buyer/rfqs?status=attention",
      urgent: urgentRfqs > 0,
    },
    {
      label: "Reusable memory",
      value: memoryCount,
      detail: "Previous requirement context",
      href: "/dashboard/procurement-memory-intelligence",
    },
  ];

  return (
    <div className={styles.dashboard}>
      {isFirstTimeBuyer ? (
        <>
          <section className={styles.needCentre} aria-labelledby="buyer-need-centre">
            <div className={styles.needIntro}>
              <span className={styles.eyebrow}>Human-First Buying</span>
              <h2 id="buyer-need-centre">What do you need today?</h2>
              <p>
                Choose a familiar category or describe the requirement in your own words.
                The same RFQ and marketplace systems continue behind this simpler starting point.
              </p>
              <div className={styles.primaryActions}>
                <Link href="/rfq">Create Requirement</Link>
                <Link href="/search">Explore Marketplace</Link>
              </div>
            </div>

            <div className={styles.needCategories}>
              {[
                ["Materials", "Cement, steel, sand, bricks and more", "/materials", "▦"],
                ["Services", "Contractors, engineers and skilled professionals", "/services", "⌁"],
                ["Equipment", "Machines, tools and rental equipment", "/rentals", "⚙"],
                ["Property", "Land, houses and commercial property", "/property", "⌂"],
                ["Construction Cost", "Estimate before you procure", "/construction-cost", "₹"],
                ["Nearby Options", "Discover relevant marketplace choices", "/search", "⌕"],
              ].map(([title, detail, href, icon]) => (
                <Link key={title} href={href} className={styles.needCategory}>
                  <span aria-hidden="true">{icon}</span>
                  <strong>{title}</strong>
                  <small>{detail}</small>
                  <em>Open →</em>
                </Link>
              ))}
            </div>
          </section>

          <section className={styles.firstTimeGuide}>
            <div>
              <span className={styles.eyebrow}>How 3Bigha helps</span>
              <h3>One simple path from need to supplier decision</h3>
            </div>
            <div>
              <span><strong>1</strong> Tell us what you need</span>
              <span><strong>2</strong> Receive suitable responses</span>
              <span><strong>3</strong> Compare and decide yourself</span>
            </div>
          </section>
        </>
      ) : (
        <>
          <section className={styles.cockpit}>
            <div className={styles.primaryWork}>
              <span className={styles.eyebrow}>Today&apos;s priority</span>
              <h2>{activeRfqs > 0 ? "Continue active procurement" : "Create another requirement"}</h2>
              <p>
                {activeRfqs > 0
                  ? "Review quotations, continue supplier conversations and move the right requirement toward a decision."
                  : "Your previous procurement remains available. Start a new requirement whenever work demands it."}
              </p>
              <div className={styles.primaryActions}>
                <Link href="/rfq">Create Requirement</Link>
                <Link href="/dashboard/buyer/rfqs">Open Requirements</Link>
                <Link href="/dashboard/buyer/inbox">Open Conversations</Link>
              </div>
            </div>

            <Link href="/dashboard/buyer/rfqs" className={styles.readiness}>
              <span>Procurement readiness</span>
              <strong>{healthScore}%</strong>
              <div><i style={{ width: `${Math.max(4, Math.min(100, healthScore))}%` }} /></div>
              <small>{successPrediction}</small>
              <em>Review procurement health →</em>
            </Link>
          </section>

          <section className={styles.kpiStrip} aria-label="Buyer operational metrics">
            {metrics.map((metric) => (
              <Link
                key={metric.label}
                href={metric.href}
                className={metric.urgent ? styles.urgentMetric : undefined}
              >
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
                <small>{metric.detail}</small>
                <em>Open →</em>
              </Link>
            ))}
          </section>
        </>
      )}

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
              <div className={styles.emptyIcon} aria-hidden="true">+</div>
              <strong>Your requirements will appear here</strong>
              <span>After you create one, supplier responses and next actions will remain visible in this work area.</span>
              <div>
                <Link href="/rfq">Create Requirement</Link>
                <Link href="/search">Explore Marketplace</Link>
              </div>
            </div>
          )}
        </section>

        <aside className={styles.attentionPanel}>
          <header>
            <span className={styles.eyebrow}>Needs your attention</span>
            <h3>Next best actions</h3>
          </header>

          {reminders.length ? (
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
          ) : (
            <div className={styles.noAttention}>
              <strong>No urgent work</strong>
              <span>Your active requirements and supplier replies will appear here.</span>
            </div>
          )}
        </aside>
      </div>

      <section className={styles.journey}>
        <header>
          <div>
            <span className={styles.eyebrow}>Live Human Journey</span>
            <h3>From need to decision</h3>
          </div>
          <small>Current stage is highlighted automatically.</small>
        </header>
        <div>
          {journey.map((step) => (
            <Link
              key={step.number}
              href={step.href}
              className={[
                styles.journeyStep,
                step.state === "complete" ? styles.journeyComplete : "",
                step.state === "current" ? styles.journeyCurrent : "",
              ].filter(Boolean).join(" ")}
              aria-current={step.state === "current" ? "step" : undefined}
            >
              <span>{step.state === "complete" ? "✓" : step.number}</span>
              <strong>{step.title}</strong>
              <small>{step.detail}</small>
              <em>
                {step.state === "complete" ? "Completed" :
                 step.state === "current" ? "Current stage" : "Upcoming"}
              </em>
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
