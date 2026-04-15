import Link from "next/link";
import InboxAutoFocus from "@/app/components/inbox/InboxAutoFocus";
import FloatingUnreadButton from "@/app/components/inbox/FloatingUnreadButton";
import ActiveSectionTracker from "@/app/components/inbox/ActiveSectionTracker";
import InboxRealtimeWrapper from "@/app/components/inbox/InboxRealtimeWrapper";
import InboxAiSummary from "@/app/components/inbox/InboxAiSummary";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { fetchVendorInbox } from "@/lib/rfq/vendor-inbox/server";
import { fetchVendorListingConversations } from "@/lib/conversations/vendor-listing-inbox";
import ReminderActions from "@/app/components/inbox/ReminderActions";
import RefreshAiButton from "@/app/components/inbox/RefreshAiButton";
import InboxAiAction from "@/app/components/inbox/InboxAiAction";
import InboxBackgroundScheduler from "@/app/components/inbox/InboxBackgroundScheduler";
import InboxReminderBanner from "@/app/components/inbox/InboxReminderBanner";
import InboxPrioritySummaryStrip from "@/app/components/inbox/InboxPrioritySummaryStrip";
import SectionSummaryChips from "@/app/components/inbox/SectionSummaryChips";
import ThreadSectionLiveList from "@/app/components/inbox/ThreadSectionLiveList";
import ThreadDueReminderState from "@/app/components/inbox/ThreadDueReminderState";
export const dynamic = "force-dynamic";

type SearchParams = {
  q?: string;
  module?: string;
  side?: string;
  sort?: string;
  unread?: string;
};

type ProfileRow = {
  id?: string | null;
  user_id?: string | null;
  full_name?: string | null;
  name?: string | null;
};

type ConversationRow = {
  id: string;
  title: string | null;
  buyer_user_id: string | null;
  vendor_user_id: string | null;
  context_type: string | null;
  context_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  is_closed?: boolean | null;
};

type ParticipantRow = {
  conversation_id: string;
  user_id: string;
  role: string | null;
  last_read_at: string | null;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_user_id: string | null;
  sender_role: string | null;
  message_type: string | null;
  body: string | null;
  created_at: string | null;
};

type InvestmentRow = Record<string, any>;

type InvestmentConversationRow = {
  id: string;
  title: string | null;
  buyer_user_id: string | null;
  vendor_user_id: string | null;
  context_type: string | null;
  context_id: string | null;
  investment_deal_room_id?: string | null;
  created_at: string | null;
  updated_at: string | null;
  is_closed?: boolean | null;
};

type UnifiedInboxItem = {
  id: string;
  module: "investment" | "rfq" | "direct";
  side: "investor" | "builder" | "vendor" | "buyer";
  title: string;
  subtitle: string;
  counterpart: string;
  statusLabel: string;
  stageLabel?: string;
  unreadCount: number;
  lastActivityAt: string | null;
  href: string;
  badgeTone: "blue" | "emerald" | "amber" | "violet" | "slate";
  metaLine?: string;
  priorityScore?: number;
  aiTag?: string;
  suggestedAction?: string;
  automationLabel?: string;
  automationTone?: "rose" | "amber" | "blue" | "emerald" | "slate" | "violet";
  automationPriority?: number;
};

function parseMs(v?: string | null) {
  if (!v) return 0;
  const n = new Date(v).getTime();
  return Number.isFinite(n) ? n : 0;
}

function fmtDateTime(v?: string | null) {
  if (!v) return "—";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(v));
  } catch {
    return v;
  }
}

function titleCase(v?: string | null) {
  const s = String(v ?? "")
    .replace(/[_-]+/g, " ")
    .trim();

  if (!s) return "—";

  return s.replace(/\b\w/g, (m) => m.toUpperCase());
}

function buildPreview(
  body: string | null | undefined,
  messageType: string | null | undefined,
  senderIsSelf: boolean,
  senderRole?: string | null
) {
  const raw = String(body ?? "").replace(/\s+/g, " ").trim();
  const normalizedSenderRole = String(senderRole ?? "").trim().toLowerCase();
  const normalizedType = String(messageType ?? "").trim().toLowerCase();

  const who =
    normalizedSenderRole === "system" || normalizedType === "system"
      ? "System"
      : senderIsSelf
      ? "You"
      : "Counterpart";

  if (raw) {
    const short = raw.length > 90 ? `${raw.slice(0, 90)}…` : raw;
    return `${who}: ${short}`;
  }

  if (normalizedType && normalizedType !== "text") {
    return `${who}: [${normalizedType}]`;
  }

  return `${who}: Message`;
}

async function buildProfileNameMap(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  userIds: string[],
  fallbackLabel: string
) {
  const uniqueUserIds = Array.from(
    new Set(userIds.map((v) => String(v || "").trim()).filter(Boolean))
  );

  const profileMap = new Map<string, string>();

  if (!uniqueUserIds.length) return profileMap;

  for (const table of ["profiles", "user_profiles", "users"]) {
    try {
      let rows: ProfileRow[] = [];

      try {
        const { data } = await supabase
          .from(table)
          .select("id,full_name,name")
          .in("id", uniqueUserIds);

        if (Array.isArray(data) && data.length) {
          rows = (data as ProfileRow[]).map((row) => ({
            ...row,
            user_id: row.id,
          }));
        }
      } catch {
        // ignore
      }

      if (!rows.length) {
        try {
          const { data } = await supabase
            .from(table)
            .select("user_id,full_name,name")
            .in("user_id", uniqueUserIds);

          if (Array.isArray(data) && data.length) {
            rows = data as ProfileRow[];
          }
        } catch {
          // ignore
        }
      }

      if (rows.length) {
        for (const row of rows) {
          const resolvedId = String(row.user_id || row.id || "").trim();
          if (!resolvedId) continue;

          const resolvedName = String(
            row.full_name || row.name || fallbackLabel
          ).trim();

          profileMap.set(resolvedId, resolvedName || fallbackLabel);
        }

        break;
      }
    } catch {
      // ignore
    }
  }

  return profileMap;
}

function investmentTitle(row: InvestmentRow) {
  return (
    row.title ||
    row.opportunity_title ||
    row.opportunity_snapshot?.opportunity_title ||
    row.opportunity_snapshot?.title ||
    "Investment Deal Room"
  );
}

function investmentSubtitle(row: InvestmentRow) {
  return (
    row.opportunity_snapshot?.sector ||
    row.opportunity_snapshot?.location ||
    row.location ||
    row.city ||
    row.state ||
    row.opportunity_slug ||
    row.opportunity_title ||
    "—"
  );
}

function investmentStatusLabel(status?: string | null) {
  const s = String(status ?? "").toLowerCase();

  if (["open", "active", "in_progress"].includes(s)) return "Active";
  if (s === "pending") return "Pending";
  if (["closed", "completed"].includes(s)) return "Closed";
  if (["cancelled", "rejected"].includes(s)) return "Cancelled";

  return status || "—";
}

function investmentStageLabel(stage?: string | null, status?: string | null) {
  return titleCase(stage || status || "active");
}

function toneClass(tone: UnifiedInboxItem["badgeTone"]) {
  if (tone === "emerald") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (tone === "amber") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (tone === "violet") {
    return "border-violet-200 bg-violet-50 text-violet-700";
  }
  if (tone === "slate") {
    return "border-slate-200 bg-slate-100 text-slate-700";
  }
  return "border-blue-200 bg-blue-50 text-blue-700";
}
function computePriority(item: UnifiedInboxItem) {
  let score = 0;

  // 🔥 unread weight
  if (item.unreadCount > 0) score += 50;

  // 🕒 recency weight
  const ageMs = Date.now() - parseMs(item.lastActivityAt);
  if (ageMs < 1 * 60 * 60 * 1000) score += 30; // 1 hr
  else if (ageMs < 24 * 60 * 60 * 1000) score += 20;

  // 💤 stale thread boost
  if (ageMs > 48 * 60 * 60 * 1000 && item.unreadCount === 0) {
    score += 25;
  }

  // 💰 module priority
  if (item.module === "investment") score += 40;
  if (item.module === "rfq") score += 20;

  // 🚦 stage importance
  if (item.stageLabel?.toLowerCase().includes("due")) score += 20;
  if (item.stageLabel?.toLowerCase().includes("negotiation")) score += 30;

  return score;
}

function computeSuggestedAction(item: UnifiedInboxItem) {
  if (item.module === "rfq") {
    if (item.unreadCount > 0) return "Review quote";
    return "Follow up";
  }

  if (item.module === "investment") {
    if (item.unreadCount > 0) return "Check investment stage";
    return "Review deal room";
  }

  if (item.module === "direct") {
    if (item.unreadCount > 0) return "Reply now";
    return "Follow up";
  }

  return "Open thread";
}

function suggestedActionClass(action?: string) {
  if (action === "Reply now") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }
  if (action === "Review quote") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (action === "Check investment stage" || action === "Review deal room") {
    return "border-violet-200 bg-violet-50 text-violet-700";
  }
  if (action === "Follow up") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  return "border-slate-200 bg-slate-100 text-slate-700";
}

function computeAutomation(item: UnifiedInboxItem) {
  const ageMs = Date.now() - parseMs(item.lastActivityAt);

  if (item.module === "investment" && item.unreadCount > 0) {
    return {
      automationLabel: "Review deal now",
      automationTone: "violet" as const,
      automationPriority: 100,
    };
  }

  if (item.module === "rfq" && item.unreadCount > 0) {
    return {
      automationLabel: "Review quote today",
      automationTone: "amber" as const,
      automationPriority: 90,
    };
  }

  if (item.unreadCount > 0 && ageMs < 24 * 60 * 60 * 1000) {
    return {
      automationLabel: "Reply within 24h",
      automationTone: "rose" as const,
      automationPriority: 80,
    };
  }

  if (ageMs > 48 * 60 * 60 * 1000) {
    return {
      automationLabel: "Follow up today",
      automationTone: "blue" as const,
      automationPriority: 70,
    };
  }

  return {
    automationLabel: "Monitor",
    automationTone: "emerald" as const,
    automationPriority: 10,
  };
}

function automationToneClass(
  tone?: UnifiedInboxItem["automationTone"]
) {
  if (tone === "rose") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (tone === "amber") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (tone === "blue") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }
  if (tone === "emerald") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  return "border-slate-200 bg-slate-100 text-slate-700";
}

function buildInboxHref(
  current: SearchParams,
  overrides: Partial<{
    q: string;
    module: string;
    side: string;
    sort: string;
    unread: string;
  }>
) {
  const params = new URLSearchParams();

  const finalQ = overrides.q ?? String(current.q ?? "").trim();
  const finalModule = overrides.module ?? String(current.module ?? "all").trim();
  const finalSide = overrides.side ?? String(current.side ?? "all").trim();
  const finalSort = overrides.sort ?? String(current.sort ?? "latest").trim();
  const finalUnread = overrides.unread ?? String(current.unread ?? "0").trim();

  if (finalQ) params.set("q", finalQ);
  if (finalModule && finalModule !== "all") params.set("module", finalModule);
  if (finalSide && finalSide !== "all") params.set("side", finalSide);
  if (finalSort && finalSort !== "latest") params.set("sort", finalSort);
  if (finalUnread === "1") params.set("unread", "1");

  const qs = params.toString();
  return qs ? `/dashboard/inbox-v2?${qs}` : "/dashboard/inbox-v2";
}

function StatCard({
  label,
  value,
  subtext,
}: {
  label: string;
  value: number;
  subtext: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
        {value}
      </div>
      <div className="mt-1 text-xs text-slate-600">{subtext}</div>
    </div>
  );
}

function ThreadSection({
  title,
  description,
  items,
  emptyMessage,
  anchorId,
  sortLabel,
  unreadOnly,
  latestUnreadHref,
  variant = "default",
}: {
  title: string;
  description: string;
  items: UnifiedInboxItem[];
  emptyMessage: string;
  anchorId: string;
  sortLabel: string;
  unreadOnly: boolean;
  latestUnreadHref: string | null;
  variant?: "investment" | "rfq" | "direct" | "default";
}) {
  const unread = items.reduce(
    (sum, item) => sum + (item.unreadCount > 0 ? 1 : 0),
    0
  );

  const variantAccentClass =
    variant === "investment"
      ? "border-violet-200 bg-violet-50 text-violet-700"
      : variant === "rfq"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : variant === "direct"
      ? "border-blue-200 bg-blue-50 text-blue-700"
      : "border-slate-200 bg-slate-100 text-slate-500";

  const unreadBadgeClass =
    unread > 0
      ? variantAccentClass
      : "border-slate-200 bg-slate-100 text-slate-500";

  const helperClass = variantAccentClass;

  const latestUnreadButtonClass =
    variant === "investment"
      ? "border-violet-700 bg-violet-700 text-white hover:opacity-90"
      : variant === "rfq"
      ? "border-amber-600 bg-amber-500 text-white hover:opacity-90"
      : variant === "direct"
      ? "border-blue-700 bg-blue-700 text-white hover:opacity-90"
      : "border-slate-900 bg-slate-900 text-white hover:opacity-90";

  return (
    <div
      id={anchorId}
      className="rounded-[1.75rem] border border-slate-200 bg-white shadow-sm"
    >
      <div className="rounded-t-[1.75rem] border-b border-slate-200 bg-slate-50 px-5 py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
              {items.length} threads
            </span>

            <span
              className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${unreadBadgeClass}`}
            >
              {unread} unread
            </span>

            <SectionSummaryChips
              anchorId={anchorId}
              items={items}
              variant={variant}
            />

            {latestUnreadHref ? (
              <Link
                href={latestUnreadHref}
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold transition ${latestUnreadButtonClass}`}
              >
                Open latest unread
              </Link>
            ) : (
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${helperClass}`}
              >
                No unread threads in this section
              </span>
            )}
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="px-5 py-10">
          <div className="text-sm text-slate-500">
            {unreadOnly
              ? "No unread threads in this section for the current filters."
              : emptyMessage}
          </div>
        </div>
      ) : (
        <div className="p-4 md:p-5">
          <div className="mb-4 flex flex-wrap gap-2">
            <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              Sorted by: {sortLabel}
            </span>

            {unreadOnly ? (
              <span className="inline-flex rounded-full border border-blue-700 bg-blue-700 px-3 py-1 text-xs font-semibold text-white">
                Unread-only view active
              </span>
            ) : null}
          </div>

          <ThreadSectionLiveList items={items} />

          <div className="mt-4 flex justify-end">
            <a
              href="#top-of-inbox"
              className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Jump to Top
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function RecentActivityStrip({
  items,
  latestUnreadItem,
}: {
  items: UnifiedInboxItem[];
  latestUnreadItem: UnifiedInboxItem | null;
}) {
  return (
    <div
      id="recent-activity"
      className="rounded-[1.75rem] border border-slate-200 bg-white shadow-sm"
    >
      <div className="rounded-t-[1.75rem] border-b border-slate-200 bg-slate-50 px-5 py-4">
        <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              Recent Activity
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Latest 5 threads across RFQ, direct conversations, and investment
              deal rooms.
            </p>
          </div>

          <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
            {items.length} items
          </span>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="px-5 py-10 text-sm text-slate-500">
          No recent activity found.
        </div>
      ) : (
        <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-5">
          {items.map((item) => (
            <Link
              key={`recent-${item.id}`}
              href={item.href}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300 hover:bg-white"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${toneClass(
                    item.badgeTone
                  )}`}
                >
                  {titleCase(item.module)}
                </span>

                <span className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                  {titleCase(item.side)}
                </span>

                {item.unreadCount > 0 ? (
                  <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                    {item.unreadCount === 1
                      ? "1 unread"
                      : `${item.unreadCount} unread`}
                  </span>
                ) : null}

                {latestUnreadItem && item.id === latestUnreadItem.id ? (
                  <span className="inline-flex rounded-full border border-slate-900 bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white">
                    Latest Unread
                  </span>
                ) : null}
              </div>

              <div className="mt-3 line-clamp-2 text-sm font-semibold text-slate-900">
                {item.title}
              </div>

              <div className="mt-1 line-clamp-2 text-xs text-slate-500">
                {item.counterpart}
              </div>

              {item.stageLabel ? (
                <div className="mt-2">
                  <span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700">
                    {item.stageLabel}
                  </span>
                </div>
              ) : null}

              <div className="mt-3 text-xs text-slate-500">
                {fmtDateTime(item.lastActivityAt)}
              </div>

              <div className="mt-2 text-xs font-semibold text-slate-400">
                Open →
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

async function fetchBuyerListingConversations(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  userId: string
) {
  const { data, error } = await supabase
    .from("conversations")
    .select(
      [
        "id",
        "title",
        "buyer_user_id",
        "vendor_user_id",
        "context_type",
        "context_id",
        "created_at",
        "updated_at",
        "is_closed",
      ].join(",")
    )
    .eq("buyer_user_id", userId)
    .in("context_type", [
      "listing",
      "property_inquiry",
      "service_inquiry",
      "rental_inquiry",
    ])
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error || !data?.length) return [];

  const rows = ((data ?? []) as unknown) as ConversationRow[];

  const vendorIds = Array.from(
    new Set(
      rows
        .map((r) => String(r.vendor_user_id ?? "").trim())
        .filter(Boolean)
    )
  );

  let profileMap = new Map<string, string>();

  if (vendorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id,full_name,name")
      .in("id", vendorIds);

    profileMap = new Map(
      ((profiles ?? []) as ProfileRow[]).map((p) => [
        String(p.id),
        String(p.full_name ?? p.name ?? "Vendor"),
      ])
    );
  }

  const conversationIds = rows.map((r) => r.id);

  let participants: ParticipantRow[] = [];
  let messages: MessageRow[] = [];

  if (conversationIds.length > 0) {
    const [{ data: partData }, { data: msgData }] = await Promise.all([
      supabase
        .from("conversation_participants")
        .select("conversation_id,user_id,role,last_read_at")
        .eq("user_id", userId)
        .in("conversation_id", conversationIds),
      supabase
        .from("conversation_messages")
        .select(
          "id,conversation_id,sender_user_id,sender_role,message_type,body,created_at"
        )
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: true }),
    ]);

    participants = (partData ?? []) as ParticipantRow[];
    messages = (msgData ?? []) as MessageRow[];
  }

  const buyerLastReadByConversation = new Map<string, number>();
  for (const p of participants) {
    buyerLastReadByConversation.set(
      String(p.conversation_id),
      p.last_read_at ? new Date(p.last_read_at).getTime() : 0
    );
  }

  const unreadCountByConversation = new Map<string, number>();
  const latestMessageByConversation = new Map<string, MessageRow>();

  for (const m of messages) {
    const convId = String(m.conversation_id ?? "").trim();
    if (!convId) continue;

    latestMessageByConversation.set(convId, m);

    const senderUserId = String(m.sender_user_id ?? "").trim();
    const createdAtMs = m.created_at ? new Date(m.created_at).getTime() : 0;
    const lastReadMs = buyerLastReadByConversation.get(convId) ?? 0;

    if (senderUserId && senderUserId !== userId && createdAtMs > lastReadMs) {
      unreadCountByConversation.set(
        convId,
        (unreadCountByConversation.get(convId) ?? 0) + 1
      );
    }
  }

  return rows.map((r) => {
    const convId = String(r.id);
    const latest = latestMessageByConversation.get(convId);
    const vendorId = String(r.vendor_user_id ?? "");
    const vendorName = profileMap.get(vendorId) ?? "Vendor";

    return {
      id: convId,
      title: r.title,
      vendor_name: vendorName,
      context_type: r.context_type,
      context_id: r.context_id,
      created_at: r.created_at,
      updated_at: r.updated_at,
      unread_count: unreadCountByConversation.get(convId) ?? 0,
      last_message_preview: latest
        ? buildPreview(
            latest.body,
            latest.message_type,
            String(latest.sender_user_id ?? "") === userId,
            latest.sender_role
          )
        : null,
      last_message_at:
        latest?.created_at ?? r.updated_at ?? r.created_at ?? null,
    };
  });
}

async function fetchInvestmentRows(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  userId: string
) {
  const { data: convoData, error: convoError } = await supabase
    .from("conversations")
    .select(
      [
        "id",
        "title",
        "buyer_user_id",
        "vendor_user_id",
        "context_type",
        "context_id",
        "investment_deal_room_id",
        "created_at",
        "updated_at",
        "is_closed",
      ].join(",")
    )
    .eq("context_type", "investment_deal_room")
    .or(`buyer_user_id.eq.${userId},vendor_user_id.eq.${userId}`)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (convoError || !convoData?.length) return [];

  const rows: InvestmentConversationRow[] = Array.isArray(convoData)
    ? (convoData as unknown as InvestmentConversationRow[])
    : [];

  const conversationIds = rows.map((r) => String(r.id));
  const dealRoomIds = Array.from(
    new Set(
      rows
        .map((r) => String(r.investment_deal_room_id || r.context_id || "").trim())
        .filter(Boolean)
    )
  );

  let participants: ParticipantRow[] = [];
  let messages: MessageRow[] = [];
  let dealRooms: InvestmentRow[] = [];

  const [{ data: partData }, { data: msgData }, { data: roomData }] =
    await Promise.all([
      supabase
        .from("conversation_participants")
        .select("conversation_id,user_id,role,last_read_at")
        .eq("user_id", userId)
        .in("conversation_id", conversationIds),

      supabase
        .from("conversation_messages")
        .select(
          "id,conversation_id,sender_user_id,sender_role,message_type,body,created_at"
        )
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: true }),

      dealRoomIds.length
        ? supabase
            .from("investment_deal_rooms")
            .select("*")
            .in("id", dealRoomIds)
        : Promise.resolve({ data: [] as InvestmentRow[] }),
    ]);

  participants = (partData ?? []) as ParticipantRow[];
  messages = (msgData ?? []) as MessageRow[];
  dealRooms = (roomData ?? []) as InvestmentRow[];

  const participantMap = new Map<string, ParticipantRow>();
  for (const p of participants) {
    participantMap.set(String(p.conversation_id), p);
  }

  const latestMessageByConversation = new Map<string, MessageRow>();
  const unreadCountByConversation = new Map<string, number>();

  for (const m of messages) {
    const convId = String(m.conversation_id || "").trim();
    if (!convId) continue;

    latestMessageByConversation.set(convId, m);

    const participant = participantMap.get(convId);
    const lastReadMs = participant?.last_read_at
      ? new Date(participant.last_read_at).getTime()
      : 0;

    const senderUserId = String(m.sender_user_id || "").trim();
    const createdAtMs = m.created_at ? new Date(m.created_at).getTime() : 0;

    if (senderUserId && senderUserId !== userId && createdAtMs > lastReadMs) {
      unreadCountByConversation.set(
        convId,
        (unreadCountByConversation.get(convId) ?? 0) + 1
      );
    }
  }

  const dealRoomMap = new Map<string, InvestmentRow>();
  for (const row of dealRooms) {
    dealRoomMap.set(String(row.id), row);
  }

  const counterpartIds = Array.from(
    new Set(
      rows
        .map((row) =>
          String(
            row.buyer_user_id === userId ? row.vendor_user_id : row.buyer_user_id
          ).trim()
        )
        .filter(Boolean)
    )
  );

  const profileMap = await buildProfileNameMap(supabase, counterpartIds, "User");

  const items: UnifiedInboxItem[] = rows.map((row) => {
    const conversationId = String(row.id);
    const dealRoomId = String(
      row.investment_deal_room_id || row.context_id || ""
    ).trim();
    const dealRoom = dealRoomMap.get(dealRoomId) || null;

    const isInvestor = String(row.buyer_user_id || "") === userId;
    const side: UnifiedInboxItem["side"] = isInvestor ? "investor" : "builder";

    const counterpartId = String(
      isInvestor ? row.vendor_user_id : row.buyer_user_id
    ).trim();

    const latest = latestMessageByConversation.get(conversationId);
    const unreadCount = unreadCountByConversation.get(conversationId) ?? 0;

    const fallbackTitle =
      dealRoom && investmentTitle(dealRoom)
        ? investmentTitle(dealRoom)
        : row.title || "Investment Deal Room";

    const fallbackSubtitle =
      dealRoom && investmentSubtitle(dealRoom)
        ? investmentSubtitle(dealRoom)
        : latest
        ? buildPreview(
            latest.body,
            latest.message_type,
            String(latest.sender_user_id || "") === userId,
            latest.sender_role
          )
        : "Investment conversation";

    return {
      id: `investment-${conversationId}`,
      module: "investment",
      side,
      title: fallbackTitle,
      subtitle: fallbackSubtitle,
      counterpart:
        profileMap.get(counterpartId) ||
        (isInvestor ? "Builder" : "Investor"),
      statusLabel: investmentStatusLabel(dealRoom?.status),
      stageLabel: investmentStageLabel(dealRoom?.stage, dealRoom?.status),
      unreadCount,
      lastActivityAt: latest?.created_at || row.updated_at || row.created_at || null,
      href: `/dashboard/thread/${encodeURIComponent(conversationId)}`,
      badgeTone: "violet",
      metaLine: dealRoom?.opportunity_id
        ? `Opportunity ID: ${String(dealRoom.opportunity_id)}`
        : `Conversation ID: ${conversationId}`,
    };
  });

  return items;
}

export default async function DashboardInboxV2Page({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = (await searchParams) ?? {};
  const q = String(params.q ?? "").trim().toLowerCase();
  const moduleFilter = String(params.module ?? "all").trim().toLowerCase();
  const sideFilter = String(params.side ?? "all").trim().toLowerCase();
  const sortFilter = String(params.sort ?? "latest").trim().toLowerCase();
  const unreadOnly = String(params.unread ?? "0").trim() === "1";

  const cookieStore = await cookies();
  const supabase = getSupabaseServerClient(cookieStore);

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return <div className="p-6 text-sm text-slate-600">Please login.</div>;
  }

  const userId = String(user.id);

  const [rfqRes, vendorDirectRows, buyerDirectRows, investmentRows] =
    await Promise.all([
      fetchVendorInbox({ limit: 50, offset: 0 }),
      fetchVendorListingConversations(),
      fetchBuyerListingConversations(supabase, userId),
      fetchInvestmentRows(supabase, userId),
    ]);

  const rfqItems: UnifiedInboxItem[] = (rfqRes.rows ?? []).map((row: any) => ({
    id: `rfq-${String(row.rfq_id)}`,
    module: "rfq",
    side: "vendor",
    title: String(row.rfq_no || row.rfq_id || "RFQ Conversation"),
    subtitle:
      [row.module, row.locality_name, row.city, row.district]
        .filter(Boolean)
        .join(" • ") || "RFQ conversation",
    counterpart: String(row.buyer_name || "Buyer"),
    statusLabel: titleCase(row.rfq_status),
    unreadCount: Number(row.is_unread ? 1 : 0),
    lastActivityAt:
      row.latest_quote_updated_at || row.updated_at || row.created_at || null,
    href: `/dashboard/inbox-v2/thread/${encodeURIComponent(String(row.rfq_id))}?kind=rfq`,
    badgeTone: "amber",
    metaLine:
      row.latest_quote_version != null
        ? `Latest quote v${String(row.latest_quote_version)}`
        : "Quote not submitted yet",
  }));

  const vendorDirectItems: UnifiedInboxItem[] = (vendorDirectRows as any[]).map(
    (row) => ({
      id: `direct-vendor-${String(row.id)}`,
      module: "direct",
      side: "vendor",
      title: String(row.title || row.context_type || "Conversation"),
      subtitle: String(row.last_message_preview || "Direct buyer enquiry"),
      counterpart: String(row.buyer_name || "Buyer"),
      statusLabel: row.unread_count > 0 ? "Unread" : "Active",
      unreadCount: Number(row.unread_count ?? 0),
      lastActivityAt:
        row.last_message_at || row.updated_at || row.created_at || null,
      href: `/dashboard/thread/${encodeURIComponent(String(row.id))}`,
      badgeTone: "blue",
      metaLine: row.context_type ? titleCase(row.context_type) : undefined,
    })
  );

  const buyerDirectItems: UnifiedInboxItem[] = (buyerDirectRows as any[]).map(
    (row) => ({
      id: `direct-buyer-${String(row.id)}`,
      module: "direct",
      side: "buyer",
      title: String(row.title || row.context_type || "Conversation"),
      subtitle: String(row.last_message_preview || "Direct vendor response"),
      counterpart: String(row.vendor_name || "Vendor"),
      statusLabel: row.unread_count > 0 ? "Unread" : "Active",
      unreadCount: Number(row.unread_count ?? 0),
      lastActivityAt:
        row.last_message_at || row.updated_at || row.created_at || null,
      href: `/dashboard/inbox-v2/thread/${encodeURIComponent(String(row.id))}`,
      badgeTone: "blue",
      metaLine: row.context_type ? titleCase(row.context_type) : undefined,
    })
  );

  const allItems = [
    ...investmentRows,
    ...rfqItems,
    ...vendorDirectItems,
    ...buyerDirectItems,
  ]
    .map((item) => {
      const score = computePriority(item);

      let aiTag: string | undefined;

      if (item.unreadCount > 0 && score > 80) {
        aiTag = "🔥 Urgent";
      } else if (item.unreadCount > 0) {
        aiTag = "⚡ Needs attention";
      } else if (item.module === "investment") {
        aiTag = "💰 Opportunity";
      }

      const automation = computeAutomation(item);

      return {
        ...item,
        priorityScore: score,
        aiTag,
        suggestedAction: computeSuggestedAction(item),
        automationLabel: automation.automationLabel,
        automationTone: automation.automationTone,
        automationPriority: automation.automationPriority,
      };
    })
    .sort((a, b) => b.priorityScore - a.priorityScore);

  const filteredItems = allItems
    .filter((item) => {
      if (moduleFilter !== "all" && item.module !== moduleFilter) return false;
      if (sideFilter !== "all" && item.side !== sideFilter) return false;
      if (unreadOnly && item.unreadCount <= 0) return false;

      if (!q) return true;

      return (
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.counterpart.toLowerCase().includes(q) ||
        item.statusLabel.toLowerCase().includes(q) ||
        String(item.stageLabel ?? "").toLowerCase().includes(q) ||
        String(item.metaLine ?? "").toLowerCase().includes(q) ||
        String(item.aiTag ?? "").toLowerCase().includes(q) ||
        String(item.suggestedAction ?? "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortFilter === "unread") {
        const unreadDiff =
          Number(b.unreadCount > 0) - Number(a.unreadCount > 0);
        if (unreadDiff !== 0) return unreadDiff;
      }

      const priorityDiff =
        Number(b.priorityScore ?? 0) - Number(a.priorityScore ?? 0);
      if (priorityDiff !== 0) return priorityDiff;

      return parseMs(b.lastActivityAt) - parseMs(a.lastActivityAt);
    });

  const recentItems = [...filteredItems]
    .sort((a, b) => parseMs(b.lastActivityAt) - parseMs(a.lastActivityAt))
    .slice(0, 5);

    const automationQueue = [...filteredItems]
    .filter(
      (item) =>
        item.automationLabel &&
        item.automationLabel !== "Monitor"
    )
    .sort((a, b) => {
      const automationDiff =
        Number(b.automationPriority ?? 0) - Number(a.automationPriority ?? 0);
      if (automationDiff !== 0) return automationDiff;

      const priorityDiff =
        Number(b.priorityScore ?? 0) - Number(a.priorityScore ?? 0);
      if (priorityDiff !== 0) return priorityDiff;

      return parseMs(b.lastActivityAt) - parseMs(a.lastActivityAt);
    })
    .slice(0, 5);

  const latestUnreadItem =
    [...filteredItems]
      .filter((item) => item.unreadCount > 0)
      .sort((a, b) => parseMs(b.lastActivityAt) - parseMs(a.lastActivityAt))[0] ||
    null;

  const grouped = {
    investment: filteredItems.filter((item) => item.module === "investment"),
    rfq: filteredItems.filter((item) => item.module === "rfq"),
    direct: filteredItems.filter((item) => item.module === "direct"),
  };

  const groupedUnread = {
    investment: grouped.investment.reduce(
      (sum, item) => sum + (item.unreadCount > 0 ? 1 : 0),
      0
    ),
    rfq: grouped.rfq.reduce(
      (sum, item) => sum + (item.unreadCount > 0 ? 1 : 0),
      0
    ),
    direct: grouped.direct.reduce(
      (sum, item) => sum + (item.unreadCount > 0 ? 1 : 0),
      0
    ),
  };

  const groupedCounts = {
    investment: grouped.investment.length,
    rfq: grouped.rfq.length,
    direct: grouped.direct.length,
  };

  const groupedLatestUnread = {
    investment:
      grouped.investment
        .filter((item) => item.unreadCount > 0)
        .sort((a, b) => parseMs(b.lastActivityAt) - parseMs(a.lastActivityAt))[0]
        ?.href ?? null,
    rfq:
      grouped.rfq
        .filter((item) => item.unreadCount > 0)
        .sort((a, b) => parseMs(b.lastActivityAt) - parseMs(a.lastActivityAt))[0]
        ?.href ?? null,
    direct:
      grouped.direct
        .filter((item) => item.unreadCount > 0)
        .sort((a, b) => parseMs(b.lastActivityAt) - parseMs(a.lastActivityAt))[0]
        ?.href ?? null,
  };

  const firstUnreadSection =
  groupedUnread.investment > 0
    ? "investment-section"
    : groupedUnread.rfq > 0
    ? "rfq-section"
    : groupedUnread.direct > 0
    ? "direct-section"
    : null;

  const sideCounts = {
    all: filteredItems.length,
    vendor: filteredItems.filter((item) => item.side === "vendor").length,
    buyer: filteredItems.filter((item) => item.side === "buyer").length,
    investor: filteredItems.filter((item) => item.side === "investor").length,
    builder: filteredItems.filter((item) => item.side === "builder").length,
  };

  const stats = {
    total: allItems.length,
    unread: allItems.reduce(
      (sum, item) => sum + (item.unreadCount > 0 ? 1 : 0),
      0
    ),
    investment: investmentRows.length,
    rfq: rfqItems.length,
    direct: vendorDirectItems.length + buyerDirectItems.length,
  };

    const automationCounts = {
    reviewDealNow: filteredItems.filter(
      (item) => item.automationLabel === "Review deal now"
    ).length,
    reviewQuoteToday: filteredItems.filter(
      (item) => item.automationLabel === "Review quote today"
    ).length,
    replyWithin24h: filteredItems.filter(
      (item) => item.automationLabel === "Reply within 24h"
    ).length,
    followUpToday: filteredItems.filter(
      (item) => item.automationLabel === "Follow up today"
    ).length,
  };

  const isFiltered =
    Boolean(String(params.q ?? "").trim()) ||
    moduleFilter !== "all" ||
    sideFilter !== "all" ||
    sortFilter !== "latest" ||
    unreadOnly;

  return (
    <div id="top-of-inbox" className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      <InboxAutoFocus targetId={firstUnreadSection} />
      <FloatingUnreadButton href={latestUnreadItem?.href ?? null} />
      <ActiveSectionTracker />
      <InboxRealtimeWrapper />
      <InboxBackgroundScheduler />
      <InboxReminderBanner />
      <div className="mt-4">
        <InboxPrioritySummaryStrip items={filteredItems} />
      </div>
      <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-blue-50 shadow-sm">
        <div className="flex flex-col gap-5 px-5 py-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <div className="inline-flex rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
              Inbox V2
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              Unified Dashboard Inbox
            </h1>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                <span className="h-2 w-2 rounded-full bg-violet-500" />
                Investment
              </span>

              <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                RFQ
              </span>

              <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                Direct
              </span>
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                Unread badge = thread has unread activity
              </span>

              <span className="inline-flex items-center rounded-full border border-slate-900 bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                Latest Unread = newest unread thread in current view
              </span>
            </div>
          </div>

          <div className="flex flex-col items-start gap-2">
            <div className="flex flex-wrap gap-3">
              {latestUnreadItem ? (
                <Link
                  href={latestUnreadItem.href}
                  className="inline-flex items-center rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
                >
                  Open Latest Unread Thread
                </Link>
              ) : null}

              <Link
                href="/dashboard/inbox"
                className="inline-flex items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-white hover:text-slate-800"
              >
                Previous Inbox
              </Link>
            </div>

            {latestUnreadItem ? (
              <div className="text-xs text-slate-500">
                Opens: {titleCase(latestUnreadItem.module)} •{" "}
                {titleCase(latestUnreadItem.side)} •{" "}
                {fmtDateTime(latestUnreadItem.lastActivityAt)}
              </div>
            ) : (
              <div className="text-xs text-slate-500">
                No unread threads in the current filtered view.
                {isFiltered ? (
                  <>
                    {" "}
                    <Link
                      href="/dashboard/inbox-v2"
                      className="font-semibold text-slate-700 underline underline-offset-2 transition hover:text-slate-950"
                    >
                      Clear Filters
                    </Link>
                  </>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Threads"
          value={stats.total}
          subtext="Across all loaded chat systems"
        />
        <StatCard
          label="Unread Threads"
          value={stats.unread}
          subtext="Threads needing your attention"
        />
        <StatCard
          label="Investment"
          value={stats.investment}
          subtext="Investor + builder deal rooms"
        />
        <StatCard
          label="RFQ / Direct"
          value={stats.rfq + stats.direct}
          subtext={`${stats.rfq} RFQ • ${stats.direct} direct`}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <a
          href="#recent-activity"
          className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
        >
          Recent Activity
        </a>

        <a
          href="#filters-section"
          className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
        >
          Jump to Filters
        </a>

        <a
          href="#investment-section"
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
            groupedUnread.investment > 0
              ? "border-violet-200 bg-violet-50 text-violet-700 hover:opacity-90"
              : "border-slate-200 bg-slate-100 text-slate-500 hover:bg-slate-200"
          }`}
        >
          <span>Investment</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
              groupedUnread.investment > 0
                ? "bg-white/80 text-violet-700"
                : "bg-white text-slate-500"
            }`}
          >
            {groupedUnread.investment}
          </span>
        </a>

        <a
          href="#rfq-section"
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
            groupedUnread.rfq > 0
              ? "border-amber-200 bg-amber-50 text-amber-700 hover:opacity-90"
              : "border-slate-200 bg-slate-100 text-slate-500 hover:bg-slate-200"
          }`}
        >
          <span>RFQ</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
              groupedUnread.rfq > 0
                ? "bg-white/80 text-amber-700"
                : "bg-white text-slate-500"
            }`}
          >
            {groupedUnread.rfq}
          </span>
        </a>

        <a
          href="#direct-section"
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
            groupedUnread.direct > 0
              ? "border-blue-200 bg-blue-50 text-blue-700 hover:opacity-90"
              : "border-slate-200 bg-slate-100 text-slate-500 hover:bg-slate-200"
          }`}
        >
          <span>Direct</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
              groupedUnread.direct > 0
                ? "bg-white/80 text-blue-700"
                : "bg-white text-slate-500"
            }`}
          >
            {groupedUnread.direct}
          </span>
        </a>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href={buildInboxHref(params, { module: "all" })}
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
            moduleFilter === "all"
              ? "border-slate-900 bg-slate-900 text-white shadow-sm"
              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
          }`}
        >
          <span>All Modules</span>
          <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-bold text-inherit">
            {filteredItems.length}
          </span>
        </Link>

        <Link
          href={buildInboxHref(params, { module: "investment" })}
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
            moduleFilter === "investment"
              ? "border-violet-700 bg-violet-700 text-white shadow-sm"
              : "border-violet-200 bg-violet-50 text-violet-700 hover:opacity-90"
          }`}
        >
          <span>Investment</span>
          <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-bold text-inherit">
            {groupedCounts.investment}
          </span>
        </Link>

        <Link
          href={buildInboxHref(params, { module: "rfq" })}
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
            moduleFilter === "rfq"
              ? "border-amber-600 bg-amber-500 text-white shadow-sm"
              : "border-amber-200 bg-amber-50 text-amber-700 hover:opacity-90"
          }`}
        >
          <span>RFQ</span>
          <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-bold text-inherit">
            {groupedCounts.rfq}
          </span>
        </Link>

        <Link
          href={buildInboxHref(params, { module: "direct" })}
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
            moduleFilter === "direct"
              ? "border-blue-700 bg-blue-700 text-white shadow-sm"
              : "border-blue-200 bg-blue-50 text-blue-700 hover:opacity-90"
          }`}
        >
          <span>Direct</span>
          <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-bold text-inherit">
            {groupedCounts.direct}
          </span>
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href={buildInboxHref(params, { side: "all" })}
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
            sideFilter === "all"
              ? "border-slate-900 bg-slate-900 text-white shadow-sm"
              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
          }`}
        >
          <span>All Sides</span>
          <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-bold text-inherit">
            {sideCounts.all}
          </span>
        </Link>

        <Link
          href={buildInboxHref(params, { side: "vendor" })}
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
            sideFilter === "vendor"
              ? "border-emerald-700 bg-emerald-700 text-white shadow-sm"
              : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:opacity-90"
          }`}
        >
          <span>Vendor</span>
          <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-bold text-inherit">
            {sideCounts.vendor}
          </span>
        </Link>

        <Link
          href={buildInboxHref(params, { side: "buyer" })}
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
            sideFilter === "buyer"
              ? "border-blue-700 bg-blue-700 text-white shadow-sm"
              : "border-blue-200 bg-blue-50 text-blue-700 hover:opacity-90"
          }`}
        >
          <span>Buyer</span>
          <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-bold text-inherit">
            {sideCounts.buyer}
          </span>
        </Link>

        <Link
          href={buildInboxHref(params, { side: "investor" })}
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
            sideFilter === "investor"
              ? "border-violet-700 bg-violet-700 text-white shadow-sm"
              : "border-violet-200 bg-violet-50 text-violet-700 hover:opacity-90"
          }`}
        >
          <span>Investor</span>
          <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-bold text-inherit">
            {sideCounts.investor}
          </span>
        </Link>

        <Link
          href={buildInboxHref(params, { side: "builder" })}
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
            sideFilter === "builder"
              ? "border-amber-700 bg-amber-600 text-white shadow-sm"
              : "border-amber-200 bg-amber-50 text-amber-700 hover:opacity-90"
          }`}
        >
          <span>Builder</span>
          <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-bold text-inherit">
            {sideCounts.builder}
          </span>
        </Link>

        <Link
          href={buildInboxHref(params, { unread: unreadOnly ? "0" : "1" })}
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
            unreadOnly
              ? "border-blue-700 bg-blue-700 text-white shadow-sm"
              : "border-blue-200 bg-blue-50 text-blue-700 hover:opacity-90"
          }`}
        >
          <span>Unread Only</span>
          <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-bold text-inherit">
            {stats.unread}
          </span>
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          Sort: {sortFilter === "unread" ? "Unread First" : "Latest First"}
        </span>

        <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
          Module: {moduleFilter === "all" ? "All" : titleCase(moduleFilter)}
        </span>

        <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
          Side: {sideFilter === "all" ? "All" : titleCase(sideFilter)}
        </span>

        <span
          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
            unreadOnly
              ? "border-blue-700 bg-blue-700 text-white"
              : "border-slate-200 bg-white text-slate-700"
          }`}
        >
          Unread Only: {unreadOnly ? "On" : "Off"}
        </span>

        <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
          {filteredItems.length} filtered
        </span>

        {isFiltered ? (
          <Link
            href="/dashboard/inbox-v2"
            className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 transition hover:opacity-90"
          >
            Clear Quick Filters
          </Link>
        ) : null}
      </div>

      <RecentActivityStrip
        items={recentItems}
        latestUnreadItem={latestUnreadItem}
      />

            <div className="flex flex-wrap gap-2">
        <span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
          Review deal now: {automationCounts.reviewDealNow}
        </span>

        <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
          Review quote today: {automationCounts.reviewQuoteToday}
        </span>

        <span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
          Reply within 24h: {automationCounts.replyWithin24h}
        </span>

        <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
          Follow up today: {automationCounts.followUpToday}
        </span>
      </div>

            <div className="rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
        <div className="rounded-t-[1.75rem] border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                AI Automation Queue
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Threads that likely need action today based on unread state, age, and module priority.
              </p>
            </div>

            <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
              {automationQueue.length} items
            </span>
          </div>
        </div>

        {automationQueue.length === 0 ? (
          <div className="px-5 py-10 text-sm text-slate-500">
            No automation candidates in the current filtered view.
          </div>
        ) : (
          <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-5">
            {automationQueue.map((item) => (
              <Link
                key={`automation-${item.id}`}
                href={item.href}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300 hover:bg-white"
              >
                <div className="flex flex-wrap items-center gap-2">
                  {item.automationLabel ? (
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${automationToneClass(
                        item.automationTone
                      )}`}
                    >
                      {item.automationLabel}
                    </span>
                  ) : null}

                  {item.aiTag ? (
                    <span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
                      {item.aiTag}
                    </span>
                  ) : null}
                </div>

                <div className="mt-3 line-clamp-2 text-sm font-semibold text-slate-900">
                  {item.title}
                </div>

                <div className="mt-1 line-clamp-2 text-xs text-slate-500">
                  {item.counterpart}
                </div>

                <div className="mt-3 text-xs text-slate-500">
                  {fmtDateTime(item.lastActivityAt)}
                </div>

                {typeof item.automationPriority === "number" ? (
                  <div className="mt-2 text-xs font-semibold text-slate-400">
                    Automation score: {item.automationPriority}
                  </div>
                ) : null}

                <div className="mt-2 text-xs font-semibold text-slate-400">
                  Open →
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div
        id="filters-section"
        className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm"
      >
        <form className="space-y-4" method="GET">
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Search & Filters
              </h2>
              <p className="text-sm text-slate-500">
                Filter by module, role-side, title, counterpart, preview,
                stage, or status.
              </p>
            </div>

            <div className="text-xs text-slate-500">
              Showing {filteredItems.length} of {stats.total} threads
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Search
              </label>
              <input
                type="text"
                name="q"
                defaultValue={params.q ?? ""}
                placeholder="Search conversations..."
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Module
              </label>
              <select
                name="module"
                defaultValue={moduleFilter}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="all">All Modules</option>
                <option value="investment">Investment</option>
                <option value="rfq">RFQ</option>
                <option value="direct">Direct</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Side
              </label>
              <select
                name="side"
                defaultValue={sideFilter}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="all">All Sides</option>
                <option value="vendor">Vendor</option>
                <option value="buyer">Buyer</option>
                <option value="investor">Investor</option>
                <option value="builder">Builder</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Sort
              </label>
              <select
                name="sort"
                defaultValue={sortFilter}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="latest">Latest First</option>
                <option value="unread">Unread First</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Unread
              </label>
              <select
                name="unread"
                defaultValue={unreadOnly ? "1" : "0"}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="0">All Threads</option>
                <option value="1">Unread Only</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              className="inline-flex items-center rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
            >
              Apply Filters
            </button>

            <Link
              href="/dashboard/inbox-v2"
              className="inline-flex items-center rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
            >
              Reset
            </Link>
          </div>
        </form>
      </div>
      
      {grouped.investment.length === 0 &&
        grouped.rfq.length === 0 &&
        grouped.direct.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
            <div className="text-sm font-semibold text-slate-700">
              No conversations found
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Try changing filters or wait for new activity.
            </div>
          </div>
        )}

      {grouped.investment.length > 0 && (
        <ThreadSection
          anchorId="investment-section"
          title="Investment"
          description="Investor-builder deal room threads for opportunity discussions, NDA flow, documents, and stage progression."
          items={grouped.investment}
          emptyMessage="No investment deal-room threads match the current filters."
          sortLabel={sortFilter === "unread" ? "Unread First" : "Latest First"}
          unreadOnly={unreadOnly}
          latestUnreadHref={groupedLatestUnread.investment}
          variant="investment"
        />
      )}

      {grouped.rfq.length > 0 && (
        <ThreadSection
          anchorId="rfq-section"
          title="RFQ"
          description="Vendor-side RFQ conversations routed into your existing RFQ inbox and quote workflow."
          items={grouped.rfq}
          emptyMessage="No RFQ threads match the current filters."
          sortLabel={sortFilter === "unread" ? "Unread First" : "Latest First"}
          unreadOnly={unreadOnly}
          latestUnreadHref={groupedLatestUnread.rfq}
          variant="rfq"
        />
      )}

      {grouped.direct.length > 0 && (
        <ThreadSection
          anchorId="direct-section"
          title="Direct"
          description="Buyer-vendor listing conversations for materials, property, rentals, and services."
          items={grouped.direct}
          emptyMessage="No direct buyer-vendor conversations match the current filters."
          sortLabel={sortFilter === "unread" ? "Unread First" : "Latest First"}
          unreadOnly={unreadOnly}
          latestUnreadHref={groupedLatestUnread.direct}
          variant="direct"
        />
      )}
    </div>
  );
}