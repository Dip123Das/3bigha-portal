"use client";

import Link from "next/link";

type StreamItemTone = "red" | "orange" | "green" | "blue" | "violet" | "slate";

type StreamItem = {
  title: string;
  detail: string;
  href: string;
  icon: string;
  tone: StreamItemTone;
  badge?: string | number;
};

function toneStyles(tone: StreamItemTone) {
  const tones = {
    red: ["#fef2f2", "#fecaca", "#b91c1c"],
    orange: ["#fff7ed", "#fed7aa", "#c2410c"],
    green: ["#ecfdf5", "#bbf7d0", "#047857"],
    blue: ["#eff6ff", "#bfdbfe", "#1d4ed8"],
    violet: ["#f5f3ff", "#ddd6fe", "#6d28d9"],
    slate: ["#f8fafc", "#e2e8f0", "#334155"],
  } as const;

  return tones[tone];
}

export function VendorOperationStream({
  newLeads,
  unreadAlerts,
  missedFollowups,
  readyDeals,
  visibilityScore,
  estimatedRank,
  hiddenVendorWarning,
}: {
  newLeads: number;
  unreadAlerts: number;
  missedFollowups: number;
  readyDeals: number;
  visibilityScore: number;
  estimatedRank: number;
  hiddenVendorWarning: boolean;
}) {
  const items: StreamItem[] = [
    {
      title:
        missedFollowups > 0
          ? `${missedFollowups} buyer follow-up pending`
          : "Buyer follow-ups are clear",
      detail:
        missedFollowups > 0
          ? "Reply quickly before buyers move to another vendor."
          : "No urgent buyer reply pressure detected.",
      href: "/dashboard/vendor/enquiries",
      icon: "💬",
      tone: missedFollowups > 0 ? "orange" : "green",
      badge: missedFollowups > 0 ? missedFollowups : "OK",
    },
    {
      title:
        newLeads > 0 ? `${newLeads} new RFQ / lead opportunity` : "No new RFQ waiting",
      detail:
        newLeads > 0
          ? "Open buyer leads and respond from one place."
          : "New buyer RFQs will appear here.",
      href: "/dashboard/vendor/rfqs",
      icon: "📨",
      tone: newLeads > 0 ? "blue" : "slate",
      badge: newLeads,
    },
    {
      title:
        readyDeals > 0
          ? `${readyDeals} deal ready to close`
          : "No ready-to-close deal signal",
      detail:
        readyDeals > 0
          ? "Push these conversations toward billing and dispatch."
          : "AI will highlight strong buyer intent here.",
      href: "/dashboard/inbox-v2",
      icon: "✅",
      tone: readyDeals > 0 ? "green" : "slate",
      badge: readyDeals,
    },
    {
      title:
        unreadAlerts > 0
          ? `${unreadAlerts} unread vendor alert`
          : "Notifications are clear",
      detail:
        unreadAlerts > 0
          ? "Review operational alerts and AI warnings."
          : "No unread vendor alert at this moment.",
      href: "/dashboard/vendor/notifications",
      icon: "🔔",
      tone: unreadAlerts > 0 ? "red" : "green",
      badge: unreadAlerts > 0 ? unreadAlerts : "OK",
    },
    {
      title:
        hiddenVendorWarning || estimatedRank > 5
          ? `Visibility needs attention: Rank #${estimatedRank}`
          : `Visibility stable: Rank #${estimatedRank}`,
      detail:
        hiddenVendorWarning || estimatedRank > 5
          ? "Improve replies, pricing and boost strength to appear higher."
          : `Current AI visibility score is ${visibilityScore}/100.`,
      href: "/dashboard/subscription/boost",
      icon: "📈",
      tone: hiddenVendorWarning || estimatedRank > 5 ? "orange" : "violet",
      badge: `${visibilityScore}/100`,
    },
  ];

  return (
    <section
      style={{
        marginBottom: 16,
        borderRadius: 22,
        border: "1px solid #dbeafe",
        background: "linear-gradient(135deg, #eff6ff, #ffffff)",
        padding: 16,
        boxShadow: "0 16px 38px rgba(15,23,42,0.06)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ fontSize: 20, fontWeight: 1000, color: "#0f172a" }}>
            Today’s Vendor Operation Stream
          </div>
          <div
            style={{
              marginTop: 6,
              fontSize: 13,
              fontWeight: 800,
              color: "#475569",
              lineHeight: 1.6,
            }}
          >
            One live work feed for leads, replies, alerts, ready deals and visibility risks.
          </div>
        </div>

        <Link
          href="/dashboard/inbox-v2"
          style={{
            borderRadius: 999,
            background: "#0f172a",
            color: "#ffffff",
            padding: "10px 14px",
            fontSize: 12,
            fontWeight: 1000,
            textDecoration: "none",
          }}
        >
          Open Work Inbox →
        </Link>
      </div>

      <div
        style={{
          marginTop: 14,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 10,
        }}
      >
        {items.map((item) => {
          const [bg, border, color] = toneStyles(item.tone);

          return (
            <Link
              key={item.title}
              href={item.href}
              style={{
                display: "block",
                borderRadius: 18,
                padding: 14,
                border: `1px solid ${border}`,
                background: bg,
                textDecoration: "none",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div style={{ fontSize: 22 }}>{item.icon}</div>

                {item.badge !== undefined ? (
                  <span
                    style={{
                      borderRadius: 999,
                      background: "#ffffff",
                      border: `1px solid ${border}`,
                      color,
                      padding: "4px 8px",
                      fontSize: 11,
                      fontWeight: 1000,
                      height: 24,
                    }}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </div>

              <div
                style={{
                  marginTop: 10,
                  fontSize: 14,
                  fontWeight: 1000,
                  color,
                  lineHeight: 1.35,
                }}
              >
                {item.title}
              </div>

              <div
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  fontWeight: 750,
                  color: "#475569",
                  lineHeight: 1.5,
                }}
              >
                {item.detail}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}