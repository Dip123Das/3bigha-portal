"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import { requireBrowserSession } from "@/lib/requireBrowserSession";

import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Card, CardBody, CardFooter } from "@/components/ui/Card";
import { ActionButton } from "@/components/ui/ActionButton";
import { EmptyState } from "@/components/ui/EmptyState";
import BuyerWorkMenu from "@/components/buyer/BuyerWorkMenu";
import { Badge } from "@/components/ui/Badge";
import { normalizeBehaviorMemory } from "@/lib/ai/normalize-memory";

import {
  buildBehaviorMemory,
  mergeBehaviorSignals,
} from "@/lib/ai/behavior-memory";

type RfqMeta = {
  accepted_quote_id?: string | null;
  accepted_vendor_id?: string | null;
  accepted_quote_version?: number | null;
  accepted_at?: string | null;
};

type RfqRow = {
  id: string;
  conversation_id?: string | null;
  public_id: string | null;
  module: string | null;
  title: string | null;
  status: string | null;
  needed_by: string | null;

  city: string | null;
  district: string | null;
  locality: string | null;
  pincode: string | null;

  created_at: string;
  updated_at: string | null;
  revision_no: number | null;

  requester_user_id?: string | null;
  created_by?: string | null;

  meta?: RfqMeta | null;
};

type QuoteRow = {
  id: string;
  rfq_id: string;
  vendor_id: string | null;
  version: number | null;
  updated_at: string | null;
  grand_total: number | null;
  status: string | null;
};

type BusinessProfileRow = {
  user_id: string;
  business_name: string | null;
  city: string | null;
  locality: string | null;
};

type SelectedVendorSummary = {
  vendor_id: string;
  vendor_name: string | null;
  vendor_city: string | null;
  vendor_locality: string | null;
  accepted_quote_id: string | null;
  accepted_quote_version: number | null;
  accepted_at: string | null;
  final_total: number | null;
};

type ConversationRow = {
  id: string;
  rfq_id?: string | null;
  context_id?: string | null;
  buyer_user_id?: string | null;
  context_type?: string | null;
  is_closed?: boolean | null;
};

type ConversationReadRow = {
  conversation_id: string;
  user_id: string;
  last_read_at: string | null;
};

type MessageLiteRow = {
  conversation_id: string;
  sender_user_id: string;
  sender_role?: string | null;
  created_at: string | null;
  body: string | null;
  message_type: string | null;
};

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}
function fmtRelativeTime(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60000);

    if (mins < 1) return "just now";
    if (mins < 60) return `${mins} min ago`;

    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hr ago`;

    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;

    return new Date(iso).toLocaleDateString();
  } catch {
    return "—";
  }
}

function titleCase(s: string | null | undefined) {
  const t = (s ?? "").replace(/_/g, " ").trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : "—";
}

function fmtMoney(n: number | null | undefined) {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  try {
    return "₹" + Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
  } catch {
    return "₹" + String(n);
  }
}

const BUYER_CHAT_CLEAR_KEY = "buyer_chat_recently_opened_rfq";

function buildMessagePreview(
  body: string | null | undefined,
  messageType: string | null | undefined,
  senderIsSelf: boolean
) {
  const raw = String(body ?? "").replace(/\s+/g, " ").trim();
  const who = senderIsSelf ? "You" : "Vendor";

  if (raw) {
    const short = raw.length > 90 ? `${raw.slice(0, 90)}…` : raw;
    return `${who}: ${short}`;
  }

  const type = String(messageType ?? "").toLowerCase();
  if (type && type !== "text") return `${who}: [${type}]`;

  return `${who}: Message`;
}

function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "warn" | "ok";
}) {
  const base =
    "inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold border";
  const cls =
    tone === "warn"
      ? `${base} border-amber-200 bg-amber-50 text-amber-900`
      : tone === "ok"
      ? `${base} border-emerald-200 bg-emerald-50 text-emerald-900`
      : `${base} border-neutral-200 bg-neutral-50 text-neutral-800`;

  return <span className={cls}>{children}</span>;
}

type AiRfqLifecycleStage =
  | "Drafting"
  | "Waiting for vendors"
  | "Compare quotes"
  | "Negotiate"
  | "Ready to close"
  | "Closed";

type AiRfqCommandInsight = {
  priorityScore: number;
  priorityLabel: "Critical" | "High" | "Medium" | "Low";
  stage: AiRfqLifecycleStage;
  stageTone: "neutral" | "warn" | "ok";
  nextAction: string;
  nextActionHref: string;
  alertText: string;
  followUpText: string;
  successPrediction: "High" | "Medium" | "Low";
};

function daysUntil(iso: string | null | undefined) {
  if (!iso) return null;
  const target = new Date(iso).getTime();
  if (!Number.isFinite(target)) return null;
  return Math.ceil((target - Date.now()) / (1000 * 60 * 60 * 24));
}

function getAiRfqCommandInsight(args: {
  rfq: RfqRow;
  vendorCount: number;
  bestTotal: number | null;
  selected: SelectedVendorSummary | null;
  unreadChatCount: number;
  lastMessageAt: string | null;
}) {
  const { rfq, vendorCount, bestTotal, selected, unreadChatCount, lastMessageAt } = args;

  const status = String(rfq.status || "").toLowerCase();
  const dueDays = daysUntil(rfq.needed_by);
  const hasFreshChat =
    !!lastMessageAt && Date.now() - new Date(lastMessageAt).getTime() <= 1000 * 60 * 60 * 12;

  let priorityScore = 20;

  if (status === "open") priorityScore += 15;
  if (vendorCount > 0) priorityScore += 20;
  if (bestTotal != null) priorityScore += 12;
  if (unreadChatCount > 0) priorityScore += 25;
  if (hasFreshChat) priorityScore += 8;
  if (dueDays != null && dueDays <= 2) priorityScore += 25;
  else if (dueDays != null && dueDays <= 7) priorityScore += 15;
  if (selected) priorityScore -= 35;
  if (status === "closed") priorityScore -= 45;

  priorityScore = Math.max(1, Math.min(100, Math.round(priorityScore)));

  const priorityLabel: AiRfqCommandInsight["priorityLabel"] =
    priorityScore >= 80 ? "Critical" : priorityScore >= 60 ? "High" : priorityScore >= 35 ? "Medium" : "Low";

  const stage: AiRfqLifecycleStage =
    status === "closed" || selected
      ? "Closed"
      : unreadChatCount > 0
        ? "Negotiate"
        : vendorCount >= 2
          ? "Compare quotes"
          : vendorCount === 1
            ? "Ready to close"
            : "Waiting for vendors";

  const stageTone: AiRfqCommandInsight["stageTone"] =
    stage === "Closed" ? "ok" : priorityLabel === "Critical" || priorityLabel === "High" ? "warn" : "neutral";

  const nextAction =
    stage === "Closed"
      ? "Review selected vendor and download quote."
      : unreadChatCount > 0
        ? "Open vendor chat and reply."
        : vendorCount >= 2
          ? "Compare quotes and choose best value."
          : vendorCount === 1
            ? "Negotiate final price, delivery and payment terms."
            : "Follow up or wait for vendor quotes.";

  const nextActionHref =
    stage === "Closed" || vendorCount > 0
      ? `/dashboard/buyer/quote-compare/${encodeURIComponent(rfq.id)}`
      : "/rfq/general/new";

  const alertText =
    dueDays != null && dueDays <= 0
      ? "Deadline reached or overdue. Immediate follow-up recommended."
      : dueDays != null && dueDays <= 2
        ? "Very urgent requirement. Prioritize vendor response."
        : unreadChatCount > 0
          ? `${unreadChatCount} unread vendor message(s).`
          : vendorCount === 0
            ? "No vendor quote yet."
            : "RFQ is progressing.";

  const followUpText =
    unreadChatCount > 0
      ? "Reply to vendor and confirm price, timeline, GST/invoice and payment terms."
      : vendorCount === 0
        ? "Use vendor discovery or improve RFQ details to attract faster quotes."
        : vendorCount === 1
          ? "Ask at least one more vendor or negotiate with current vendor."
          : "Use AI comparison to shortlist best value vendor.";

  const successPrediction: AiRfqCommandInsight["successPrediction"] =
    selected || status === "closed" || (vendorCount >= 2 && bestTotal != null)
      ? "High"
      : vendorCount >= 1 || unreadChatCount > 0
        ? "Medium"
        : "Low";

  return {
    priorityScore,
    priorityLabel,
    stage,
    stageTone,
    nextAction,
    nextActionHref,
    alertText,
    followUpText,
    successPrediction,
  };
}

export default function BuyerRfqsPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [rows, setRows] = useState<RfqRow[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listErr, setListErr] = useState<string | null>(null);

  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterModule, setFilterModule] = useState<string>("all");
  const [q, setQ] = useState<string>("");
  const [aiFocusFilter, setAiFocusFilter] = useState<"all" | "urgent" | "needs_reply" | "compare" | "closed">("all");

  const [vendorCountByRfq, setVendorCountByRfq] = useState<Record<string, number>>({});
  const [latestQuoteAtByRfq, setLatestQuoteAtByRfq] = useState<Record<string, string | null>>({});
  const [bestTotalByRfq, setBestTotalByRfq] = useState<Record<string, number | null>>({});
  const [selectedVendorByRfq, setSelectedVendorByRfq] = useState<Record<string, SelectedVendorSummary | null>>({});
  const [unreadCountByRfq, setUnreadCountByRfq] = useState<Record<string, number>>({});
  const [lastMessagePreviewByRfq, setLastMessagePreviewByRfq] = useState<Record<string, string>>({});
  const [lastMessageAtByRfq, setLastMessageAtByRfq] = useState<Record<string, string | null>>({});

  const userIdRef = useRef<string | null>(null);
  const rfqIdsRef = useRef<string[]>([]);
  const displayRows = useMemo(() => {
    const needle = q.trim().toLowerCase();

    return [...rows]
      .filter((r) => {
        if (!needle) return true;

        const hay = [
          r.public_id ?? "",
          r.title ?? "",
          r.module ?? "",
          r.status ?? "",
          r.locality ?? "",
          r.city ?? "",
          r.district ?? "",
          r.pincode ?? "",
        ]
          .join(" ")
          .toLowerCase();

        return hay.includes(needle);
      })
      .filter((r) => {
        if (aiFocusFilter === "all") return true;

        const insight = getAiRfqCommandInsight({
          rfq: r,
          vendorCount: vendorCountByRfq[r.id] ?? 0,
          bestTotal: bestTotalByRfq[r.id] ?? null,
          selected: selectedVendorByRfq[r.id] ?? null,
          unreadChatCount: unreadCountByRfq[r.id] ?? 0,
          lastMessageAt: lastMessageAtByRfq[r.id] ?? null,
        });

        if (aiFocusFilter === "urgent") return insight.priorityLabel === "Critical" || insight.priorityLabel === "High";
        if (aiFocusFilter === "needs_reply") return (unreadCountByRfq[r.id] ?? 0) > 0;
        if (aiFocusFilter === "compare") return (vendorCountByRfq[r.id] ?? 0) >= 2 && !selectedVendorByRfq[r.id];
        if (aiFocusFilter === "closed") return insight.stage === "Closed";
        return true;
      })
      .sort((a, b) => {
        const aInsight = getAiRfqCommandInsight({
          rfq: a,
          vendorCount: vendorCountByRfq[a.id] ?? 0,
          bestTotal: bestTotalByRfq[a.id] ?? null,
          selected: selectedVendorByRfq[a.id] ?? null,
          unreadChatCount: unreadCountByRfq[a.id] ?? 0,
          lastMessageAt: lastMessageAtByRfq[a.id] ?? null,
        });

        const bInsight = getAiRfqCommandInsight({
          rfq: b,
          vendorCount: vendorCountByRfq[b.id] ?? 0,
          bestTotal: bestTotalByRfq[b.id] ?? null,
          selected: selectedVendorByRfq[b.id] ?? null,
          unreadChatCount: unreadCountByRfq[b.id] ?? 0,
          lastMessageAt: lastMessageAtByRfq[b.id] ?? null,
        });

        if (bInsight.priorityScore !== aInsight.priorityScore) {
          return bInsight.priorityScore - aInsight.priorityScore;
        }

        const aUnread = unreadCountByRfq[a.id] ?? 0;
        const bUnread = unreadCountByRfq[b.id] ?? 0;

        if (bUnread !== aUnread) return bUnread - aUnread;

        const aLast = lastMessageAtByRfq[a.id]
          ? new Date(lastMessageAtByRfq[a.id] as string).getTime()
          : 0;
        const bLast = lastMessageAtByRfq[b.id]
          ? new Date(lastMessageAtByRfq[b.id] as string).getTime()
          : 0;

        return bLast - aLast;
      });
  }, [
    rows,
    q,
    aiFocusFilter,
    unreadCountByRfq,
    lastMessageAtByRfq,
    vendorCountByRfq,
    bestTotalByRfq,
    selectedVendorByRfq,
  ]);

  async function getSessionOrRedirect() {
    return requireBrowserSession({
      supabase,
      router,
      nextUrl: "/dashboard/buyer/rfqs",
    });
  }

  function handleOpenChat(rfqId: string) {
  setUnreadCountByRfq((prev) => {
    if (!(rfqId in prev)) return prev;
    return { ...prev, [rfqId]: 0 };
  });

  try {
    sessionStorage.setItem(BUYER_CHAT_CLEAR_KEY, rfqId);
  } catch {}
}

  function isJwtError(msg: string) {
    return /jwt expired|invalid jwt|expired/i.test(msg ?? "");
  }

  async function runWithJwtRetry<T>(fn: () => Promise<{ data: T | null; error: any }>) {
    let res = await fn();
    if (res.error && isJwtError(res.error.message)) {
      const rRes: any = await supabase.auth.refreshSession();
      if (!rRes?.error) res = await fn();
    }
    return res;
  }

  async function loadChatSignalsForUser(uid: string, rfqIds: string[]) {
    if (!uid || rfqIds.length === 0) {
      setUnreadCountByRfq({});
      setLastMessagePreviewByRfq({});
      setLastMessageAtByRfq({});
      return;
    }

    try {
      const convQuery = supabase
        .from("conversations")
        .select("id,rfq_id,context_id,buyer_user_id,context_type,is_closed")
        .eq("context_type", "rfq")
        .eq("buyer_user_id", uid)
        .in("rfq_id", rfqIds);

      const { data: convData } = await runWithJwtRetry<ConversationRow[]>(() => convQuery as any);
      const conversations = (convData ?? []) as ConversationRow[];

      if (conversations.length === 0) {
        setUnreadCountByRfq({});
        setLastMessagePreviewByRfq({});
        setLastMessageAtByRfq({});
        return;
      }

      const convIds = conversations.map((c) => c.id);

      const readsQuery = supabase
        .from("conversation_participants")
        .select("conversation_id,user_id,last_read_at")
        .eq("user_id", uid)
        .in("conversation_id", convIds);

      const msgsQuery = supabase
        .from("conversation_messages")
        .select("conversation_id,sender_user_id,sender_role,created_at,body,message_type")
        .in("conversation_id", convIds);

      const [{ data: readData }, { data: msgData }] = await Promise.all([
        runWithJwtRetry<ConversationReadRow[]>(() => readsQuery as any),
        runWithJwtRetry<MessageLiteRow[]>(() => msgsQuery as any),
      ]);

      const reads = (readData ?? []) as ConversationReadRow[];

      const lastSeenByConv: Record<string, number> = {};
      for (const rd of reads) {
        lastSeenByConv[String(rd.conversation_id)] = rd.last_read_at
          ? new Date(rd.last_read_at).getTime()
          : 0;
      }

      const rfqIdByConv: Record<string, string> = {};
      for (const c of conversations) {
        const resolvedRfqId = String((c as any).rfq_id ?? (c as any).context_id ?? "");
        if (!resolvedRfqId) continue;
        rfqIdByConv[String(c.id)] = resolvedRfqId;
      }

      const unreadByRfq: Record<string, number> = {};
      const latestMessageAtMsByRfq: Record<string, number> = {};
      const latestMessagePreviewByRfqLocal: Record<string, string> = {};
      const latestMessageAtByRfqLocal: Record<string, string | null> = {};

      for (const m of msgData ?? []) {
        const convId = String(m.conversation_id ?? "");
        const rfqId = rfqIdByConv[convId];
        if (!rfqId) continue;

        const senderIsSelf = String(m.sender_user_id ?? "") === String(uid);
        const isSystemMessage =
          String((m as any).sender_role ?? "").trim().toLowerCase() === "system" ||
          String(m.message_type ?? "").trim().toLowerCase() === "system";
        const createdAtMs = m.created_at ? new Date(m.created_at).getTime() : 0;
        const lastSeen = lastSeenByConv[convId] ?? 0;

        if (!senderIsSelf && !isSystemMessage && createdAtMs > lastSeen) {
          unreadByRfq[rfqId] = (unreadByRfq[rfqId] ?? 0) + 1;
        }

        const prevMs = latestMessageAtMsByRfq[rfqId] ?? 0;
        if (createdAtMs >= prevMs) {
          latestMessageAtMsByRfq[rfqId] = createdAtMs;
          latestMessageAtByRfqLocal[rfqId] = m.created_at ?? null;
          latestMessagePreviewByRfqLocal[rfqId] = buildMessagePreview(
            m.body,
            m.message_type,
            senderIsSelf
          );
        }
      }

      setUnreadCountByRfq(unreadByRfq);
      setLastMessagePreviewByRfq(latestMessagePreviewByRfqLocal);
      setLastMessageAtByRfq(latestMessageAtByRfqLocal);
    } catch {
      setUnreadCountByRfq({});
      setLastMessagePreviewByRfq({});
      setLastMessageAtByRfq({});
    }
  }

  async function loadList() {
    setListLoading(true);
    setListErr(null);

    const session = await getSessionOrRedirect();
    if (!session) {
      setListLoading(false);
      return;
    }

    setEmail(session.user.email ?? null);
    setUserId(session.user.id);
    userIdRef.current = session.user.id;

    let query = supabase
      .from("rfqs")
      .select(
        [
          "id",
          "public_id",
          "module",
          "title",
          "status",
          "needed_by",
          "city",
          "district",
          "locality",
          "pincode",
          "created_at",
          "updated_at",
          "revision_no",
          "requester_user_id",
          "created_by",
          "meta",
        ].join(",")
      )
      .order("created_at", { ascending: false })
      .limit(50);

    query = query.or(`requester_user_id.eq.${session.user.id},created_by.eq.${session.user.id}`);

    if (filterStatus !== "all") query = query.eq("status", filterStatus);
    if (filterModule !== "all") query = query.eq("module", filterModule);

    const { data, error } = await runWithJwtRetry<RfqRow[]>(() => query as any);

    if (error) {
      setListErr(error.message ?? String(error));
      setRows([]);
      setVendorCountByRfq({});
      setLatestQuoteAtByRfq({});
      setBestTotalByRfq({});
      setSelectedVendorByRfq({});
      setUnreadCountByRfq({});
      setLastMessagePreviewByRfq({});
      setLastMessageAtByRfq({});
      rfqIdsRef.current = [];
      setListLoading(false);
      return;
    }

    let rfqs = (data ?? []) as RfqRow[];

    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      rfqs = rfqs.filter((r) => {
        const hay = [
          r.public_id ?? "",
          r.title ?? "",
          r.module ?? "",
          r.status ?? "",
          r.locality ?? "",
          r.city ?? "",
          r.district ?? "",
          r.pincode ?? "",
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(needle);
      });
    }

    setRows(rfqs);

    const rfqIds = rfqs.map((r) => r.id);
    rfqIdsRef.current = rfqIds;

    if (rfqIds.length === 0) {
      setVendorCountByRfq({});
      setLatestQuoteAtByRfq({});
      setBestTotalByRfq({});
      setSelectedVendorByRfq({});
      setUnreadCountByRfq({});
      setLastMessagePreviewByRfq({});
      setLastMessageAtByRfq({});
      setListLoading(false);
      return;
    }

    const qQuery = supabase
      .from("rfq_quotes")
      .select("id,rfq_id,vendor_id,version,updated_at,grand_total,status")
      .in("rfq_id", rfqIds);

    const { data: qData, error: qErr } = await runWithJwtRetry<QuoteRow[]>(() => qQuery as any);

    if (qErr) {
      setVendorCountByRfq({});
      setLatestQuoteAtByRfq({});
      setBestTotalByRfq({});
      setSelectedVendorByRfq({});
      setUnreadCountByRfq({});
      setLastMessagePreviewByRfq({});
      setLastMessageAtByRfq({});
      setListLoading(false);
      return;
    }

    const quotes = (qData ?? []) as QuoteRow[];

    const latestPerVendorPerRfq = new Map<string, QuoteRow>();
    for (const qt of quotes) {
      const vid = qt.vendor_id ? String(qt.vendor_id) : "";
      if (!vid) continue;
      const key = `${qt.rfq_id}:${vid}`;
      const cur = latestPerVendorPerRfq.get(key);
      const v = Number(qt.version ?? 0);
      const curV = Number(cur?.version ?? 0);
      if (!cur || v > curV) latestPerVendorPerRfq.set(key, qt);
    }

    const vendorCount: Record<string, number> = {};
    const latestAt: Record<string, string | null> = {};
    const bestTotal: Record<string, number | null> = {};

    for (const qt of latestPerVendorPerRfq.values()) {
      vendorCount[qt.rfq_id] = (vendorCount[qt.rfq_id] ?? 0) + 1;

      const u = qt.updated_at ?? null;
      if (u) {
        const prev = latestAt[qt.rfq_id];
        if (!prev || new Date(u).getTime() > new Date(prev).getTime()) latestAt[qt.rfq_id] = u;
      } else if (!(qt.rfq_id in latestAt)) {
        latestAt[qt.rfq_id] = null;
      }

      const gt = typeof qt.grand_total === "number" ? qt.grand_total : null;
      if (gt != null) {
        const prevBest = bestTotal[qt.rfq_id];
        if (prevBest == null || gt < prevBest) bestTotal[qt.rfq_id] = gt;
      } else if (!(qt.rfq_id in bestTotal)) {
        bestTotal[qt.rfq_id] = null;
      }
    }

    setVendorCountByRfq(vendorCount);
    setLatestQuoteAtByRfq(latestAt);
    setBestTotalByRfq(bestTotal);

    const acceptedVendorIds = Array.from(
      new Set(
        rfqs
          .map((r) => String(r.meta?.accepted_vendor_id ?? ""))
          .filter(Boolean)
      )
    );

    const businessByVendorId: Record<string, BusinessProfileRow> = {};
    if (acceptedVendorIds.length > 0) {
      const bpQuery = supabase
        .from("business_profiles")
        .select("user_id,business_name,city,locality")
        .in("user_id", acceptedVendorIds);

      const { data: bpData } = await runWithJwtRetry<BusinessProfileRow[]>(() => bpQuery as any);
      for (const bp of bpData ?? []) {
        businessByVendorId[String(bp.user_id)] = bp;
      }
    }

    const quoteById: Record<string, QuoteRow> = {};
    for (const qt of quotes) {
      quoteById[String(qt.id)] = qt;
    }

    const selectedByRfq: Record<string, SelectedVendorSummary | null> = {};
    for (const r of rfqs) {
      const acceptedVendorId = String(r.meta?.accepted_vendor_id ?? "");
      const acceptedQuoteId = String(r.meta?.accepted_quote_id ?? "");
      if (!acceptedVendorId && !acceptedQuoteId) {
        selectedByRfq[r.id] = null;
        continue;
      }

      const bp = acceptedVendorId ? businessByVendorId[acceptedVendorId] : undefined;
      const qt = acceptedQuoteId ? quoteById[acceptedQuoteId] : undefined;

      selectedByRfq[r.id] = {
        vendor_id: acceptedVendorId || String(qt?.vendor_id ?? ""),
        vendor_name: bp?.business_name ?? null,
        vendor_city: bp?.city ?? null,
        vendor_locality: bp?.locality ?? null,
        accepted_quote_id: acceptedQuoteId || null,
        accepted_quote_version: r.meta?.accepted_quote_version ?? qt?.version ?? null,
        accepted_at: r.meta?.accepted_at ?? null,
        final_total: qt?.grand_total ?? null,
      };
    }

    setSelectedVendorByRfq(selectedByRfq);
    await loadChatSignalsForUser(session.user.id, rfqIds);

    setListLoading(false);
  }

  async function init() {
    setLoading(true);
    setErr(null);

    try {
      const session = await getSessionOrRedirect();
      if (!session) return;

      setEmail(session.user.email ?? null);
      setUserId(session.user.id);
      userIdRef.current = session.user.id;

      setLoading(false);
      await loadList();
    } catch (e: any) {
      setErr(e?.message ?? "Unknown error");
      setLoading(false);
    }
  }

  useEffect(() => {
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
  const uid = userId;
  if (!uid) return;

  try {
    const pendingRfqId = sessionStorage.getItem(BUYER_CHAT_CLEAR_KEY);
    if (!pendingRfqId) return;

    sessionStorage.removeItem(BUYER_CHAT_CLEAR_KEY);

    setUnreadCountByRfq((prev) => {
      if (!(pendingRfqId in prev)) return prev;
      return { ...prev, [pendingRfqId]: 0 };
    });

    const rfqIds = rfqIdsRef.current;

    if (rfqIds.length > 0) {
      window.setTimeout(() => {
        void loadChatSignalsForUser(uid, rfqIds);
      }, 250);
    }
  } catch {}
}, [userId]);

  useEffect(() => {
    if (!loading) loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, filterModule]);

  useEffect(() => {
    if (!userId) return;

    const refreshSignals = async () => {
      const uid = userIdRef.current;
      const rfqIds = rfqIdsRef.current;
      if (!uid || rfqIds.length === 0) return;
      await loadChatSignalsForUser(uid, rfqIds);
    };

    const channel = supabase
      .channel(`buyer-rfqs-chat-sync-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversation_messages",
        },
        async () => {
          void refreshSignals();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversation_participants",
          filter: `user_id=eq.${userId}`,
        },
        async () => {
          void refreshSignals();
        }
      )
      .subscribe();

    const onFocus = () => {
      void refreshSignals();
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void refreshSignals();
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      supabase.removeChannel(channel);
    };
  }, [supabase, userId]);

    const commandCenterStats = useMemo(() => {
    const insights = rows.map((r) =>
      getAiRfqCommandInsight({
        rfq: r,
        vendorCount: vendorCountByRfq[r.id] ?? 0,
        bestTotal: bestTotalByRfq[r.id] ?? null,
        selected: selectedVendorByRfq[r.id] ?? null,
        unreadChatCount: unreadCountByRfq[r.id] ?? 0,
        lastMessageAt: lastMessageAtByRfq[r.id] ?? null,
      })
    );

    const urgent = insights.filter((x) => x.priorityLabel === "Critical" || x.priorityLabel === "High").length;
    const needsReply = rows.filter((r) => (unreadCountByRfq[r.id] ?? 0) > 0).length;
    const compareReady = rows.filter((r) => (vendorCountByRfq[r.id] ?? 0) >= 2 && !selectedVendorByRfq[r.id]).length;
    const closed = insights.filter((x) => x.stage === "Closed").length;

    const avgScore =
      insights.length > 0
        ? Math.round(insights.reduce((sum, x) => sum + x.priorityScore, 0) / insights.length)
        : 0;

    return {
      urgent,
      needsReply,
      compareReady,
      closed,
      avgScore,
      total: rows.length,
      visible: displayRows.length,
    };
  }, [
    rows,
    displayRows.length,
    vendorCountByRfq,
    bestTotalByRfq,
    selectedVendorByRfq,
    unreadCountByRfq,
    lastMessageAtByRfq,
  ]);

  const commandCenterFocus =
    commandCenterStats.needsReply > 0
      ? "Reply to vendor chats first."
      : commandCenterStats.compareReady > 0
        ? "Compare multi-vendor RFQs and shortlist best value."
        : commandCenterStats.urgent > 0
          ? "Prioritize urgent RFQs and follow up with vendors."
          : "Create new AI RFQs or monitor existing procurement activity.";

    const rfqBehaviorMemory = buildBehaviorMemory(
    rows.map((r) => ({
      module: r.module || "rfq",

      action:
        String(r.status || "").toLowerCase() === "closed"
          ? "shortlist"
          : (unreadCountByRfq[r.id] ?? 0) > 0
            ? "chat"
            : (vendorCountByRfq[r.id] ?? 0) >= 2
              ? "compare"
              : "rfq",

      entityId: r.id,
      entityTitle: r.title || "",
      category: r.title || "",
      type: r.status || "",
      city: r.city || "",
      district: r.district || "",
      locality: r.locality || "",
      createdAt: r.created_at,
    }))
  );

    const normalizedRfqBehaviorMemory =
    normalizeBehaviorMemory(rfqBehaviorMemory);

  const rfqBehaviorSignals = mergeBehaviorSignals(rfqBehaviorMemory, {
    module: filterModule !== "all" ? filterModule : "rfq",
    category: q || "",
    city: "",
  });

  if (loading) {
    return (
      <main>
        <Container>
          <SectionHeader title="My RFQs" subtitle="Loading..." />

        <BuyerWorkMenu />
          <div style={{ opacity: 0.8 }}>Preparing your RFQ list…</div>
        </Container>
      </main>
    );
  }

  if (err) {
    return (
      <main>
        <Container>
          <SectionHeader title="My RFQs" subtitle="" />
          <EmptyState message="Could not load your RFQs." />
          <div style={{ marginTop: 12, color: "crimson", fontWeight: 800 }}>{err}</div>
          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <ActionButton href="/dashboard" variant="secondary">
              ← Back to Dashboard
            </ActionButton>
          </div>
        </Container>
      </main>
    );
  }

  return (
    <main>
      <Container>
        <SectionHeader
          title="My RFQs"
          subtitle="See requirements you submitted and compare vendor quotes."
        />

                <div
          style={{
            border: "1px solid rgba(37,99,235,0.25)",
            background: "#ffffff",
            borderRadius: 18,
            padding: 12,
            marginBottom: 16,
            boxShadow: "0 2px 6px rgba(15,23,42,0.04)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#1e3a8a" }}>
                🧠 AI Procurement Work Desk
              </div>
              <div style={{ marginTop: 4, color: "#475569", fontSize: 14, fontWeight: 800 }}>
                AI prioritizes RFQs by urgency, vendor response, quote readiness, chat activity and closure stage.
              </div>
            </div>

            <div
              style={{
                background:
                  commandCenterStats.avgScore >= 70
                    ? "#fee2e2"
                    : commandCenterStats.avgScore >= 40
                      ? "#fef3c7"
                      : "#dcfce7",
                color:
                  commandCenterStats.avgScore >= 70
                    ? "#991b1b"
                    : commandCenterStats.avgScore >= 40
                      ? "#92400e"
                      : "#166534",
                borderRadius: 12,
                padding: "9px 14px",
                fontWeight: 800,
                alignSelf: "center",
                border: "1px solid rgba(15,23,42,0.08)",
              }}
            >
              AI Priority Load {commandCenterStats.avgScore}/100
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 10, marginTop: 14 }}>
            {[
              ["Total RFQs", commandCenterStats.total, "📄"],
              ["Urgent", commandCenterStats.urgent, "🚨"],
              ["Needs Reply", commandCenterStats.needsReply, "💬"],
              ["Compare Ready", commandCenterStats.compareReady, "⚖️"],
              ["Closed", commandCenterStats.closed, "✅"],
            ].map(([label, value, icon]) => (
              <div
                key={label}
                style={{
                  border: "1px solid #e2e8f0",
                  background: "#ffffff",
                  borderRadius: 12,
                  padding: 12,
                }}
              >
                <div style={{ fontSize: 12, color: "#64748b", fontWeight: 900 }}>
                  {icon} {label}
                </div>
                <div style={{ marginTop: 5, color: "#0f172a", fontWeight: 800, fontSize: 18 }}>
                  {value}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: 12,
              border: "1px solid #bfdbfe",
              background: "#ffffff",
              color: "#1e3a8a",
              borderRadius: 12,
              padding: 10,
              fontSize: 13,
              fontWeight: 900,
            }}
          >
            🎯 AI next best action: {commandCenterFocus}
          </div>

                    <div
            style={{
              marginTop: 12,
              border: "1px solid #ddd6fe",
              background: "#faf5ff",
              borderRadius: 12,
              padding: 12,
            }}
          >
            <div
              style={{
                color: "#6b21a8",
                fontWeight: 800,
                marginBottom: 6,
              }}
            >
              🧠 RFQ Behavior Memory
            </div>

            <div
              style={{
                color: "#581c87",
                fontSize: 13,
                fontWeight: 800,
                lineHeight: 1.6,
              }}
            >
              {rfqBehaviorMemory.summary}
            </div>

            <div
              style={{
                marginTop: 8,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <Pill>
                Memory Score: {rfqBehaviorMemory.estimatedIntentScore}/100
              </Pill>

              <Pill>
                Dominant Module: {normalizedRfqBehaviorMemory.hotModules[0] || "Learning"}
              </Pill>

              <Pill>
                Hot Category: {normalizedRfqBehaviorMemory.hotCategories[0] || "Learning"}
              </Pill>

              <Pill>
                Hot Location: {normalizedRfqBehaviorMemory.hotLocations[0] || "Learning"}
              </Pill>
            </div>
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              ["all", "All RFQs"],
              ["urgent", "Urgent"],
              ["needs_reply", "Needs Reply"],
              ["compare", "Compare Ready"],
              ["closed", "Closed"],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setAiFocusFilter(key as any)}
                style={{
                  height: 36,
                  padding: "0 12px",
                  borderRadius: 12,
                  border: aiFocusFilter === key ? "1px solid #2563eb" : "1px solid #e2e8f0",
                  background: aiFocusFilter === key ? "#dbeafe" : "#ffffff",
                  color: aiFocusFilter === key ? "#1e40af" : "#334155",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                {label}
              </button>
            ))}

            <ActionButton href="/rfq/general/new" variant="primary">
              + New AI RFQ
            </ActionButton>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
          <ActionButton href="/dashboard" variant="secondary">
            ← Dashboard
          </ActionButton>

          <button
            type="button"
            onClick={() => loadList()}
            style={{
              height: 40,
              padding: "0 14px",
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.12)",
              background: "white",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Refresh
          </button>

          <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <Badge>{email ?? "—"}</Badge>
            <Pill>{rows.length}</Pill>
            <Pill tone={Object.values(unreadCountByRfq).reduce((a, b) => a + b, 0) > 0 ? "warn" : "neutral"}>
              Unread chats: {Object.values(unreadCountByRfq).reduce((a, b) => a + b, 0)}
            </Pill>
          </div>
        </div>

        <Card>
          <CardBody>
            <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>Filters</div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.7, marginBottom: 6 }}>Status</div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  style={{
                    height: 40,
                    borderRadius: 12,
                    padding: "0 12px",
                    border: "1px solid rgba(0,0,0,0.12)",
                  }}
                >
                  <option value="all">All</option>
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                  <option value="draft">Draft</option>
                </select>
              </div>

              <div>
                <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.7, marginBottom: 6 }}>Module</div>
                <select
                  value={filterModule}
                  onChange={(e) => setFilterModule(e.target.value)}
                  style={{
                    height: 40,
                    borderRadius: 12,
                    padding: "0 12px",
                    border: "1px solid rgba(0,0,0,0.12)",
                  }}
                >
                  <option value="all">All</option>
                  <option value="materials">Materials</option>
                  <option value="services">Services</option>
                  <option value="rentals">Rentals</option>
                  <option value="property">Property</option>
                </select>
              </div>

              <div style={{ flex: "1 1 260px", minWidth: 220 }}>
                <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.7, marginBottom: 6 }}>Search</div>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by title / city / pincode / module…"
                  style={{
                    height: 40,
                    width: "100%",
                    borderRadius: 12,
                    padding: "0 12px",
                    border: "1px solid rgba(0,0,0,0.12)",
                  }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => loadList()}
                  style={{
                    height: 40,
                    padding: "0 14px",
                    borderRadius: 12,
                    border: "1px solid rgba(0,0,0,0.12)",
                    background: "white",
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  Apply
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFilterStatus("all");
                    setFilterModule("all");
                    setQ("");
                    setAiFocusFilter("all");
                  }}
                  style={{
                    height: 40,
                    padding: "0 14px",
                    borderRadius: 12,
                    border: "1px solid rgba(0,0,0,0.12)",
                    background: "white",
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  Reset
                </button>
              </div>
            </div>
          </CardBody>
        </Card>

        <div style={{ marginTop: 12 }}>
          {listErr ? <div style={{ marginBottom: 10, color: "crimson", fontWeight: 800 }}>{listErr}</div> : null}

          {listLoading ? (
            <div style={{ opacity: 0.8 }}>Loading your RFQs…</div>
          ) : rows.length === 0 ? (
            <EmptyState message="You have not submitted any RFQs yet." />
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {displayRows.map((r) => {
                const vendorCount = vendorCountByRfq[r.id] ?? 0;
                const latestAt = latestQuoteAtByRfq[r.id] ?? null;
                const best = bestTotalByRfq[r.id] ?? null;
                const selected = selectedVendorByRfq[r.id] ?? null;
                const unreadChatCount = unreadCountByRfq[r.id] ?? 0;
                const lastMessagePreview = lastMessagePreviewByRfq[r.id] ?? "";
                const lastMessageAt = lastMessageAtByRfq[r.id] ?? null;
                const isFreshChat = !!lastMessageAt && Date.now() - new Date(lastMessageAt).getTime() <= 1000 * 60 * 60 * 12;

                const openHref = `/dashboard/buyer/quote-compare/${encodeURIComponent(r.id)}`;
                const chatHref = r.conversation_id
                  ? `/dashboard/thread/${encodeURIComponent(r.conversation_id)}`
                  : `/dashboard/buyer/quote-compare/${encodeURIComponent(r.id)}`;
                const printHref = `/dashboard/buyer/quote-compare/${encodeURIComponent(r.id)}/print`;
                const aiInsight = getAiRfqCommandInsight({
                  rfq: r,
                  vendorCount,
                  bestTotal: best,
                  selected,
                  unreadChatCount,
                  lastMessageAt,
                });

                return (
                  <Card
                    key={r.id}
                    style={
                      unreadChatCount > 0
                      ? {
                      border: "1px solid #fecaca",
                      boxShadow: "0 0 0 2px rgba(220,38,38,0.08)",
                    }
                      : isFreshChat
                    ? {
                      border: "1px solid #bbf7d0",
                      boxShadow: "0 0 0 2px rgba(34,197,94,0.08)",
                    }
                      : undefined
                }
              >
                    <CardBody>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexWrap: "wrap",
                          marginBottom: 6,
                }}
              >
  <div style={{ fontWeight: 900, fontSize: 16 }}>
    {r.title?.trim() ? r.title : `RFQ #${r.public_id ?? r.id.slice(0, 8)}`}
  </div>

  <Pill tone={aiInsight.stageTone}>
    AI Priority: {aiInsight.priorityLabel} ({aiInsight.priorityScore}/100)
  </Pill>

  <Pill tone={aiInsight.stageTone}>
    {aiInsight.stage}
  </Pill>

  {unreadChatCount > 0 ? (
    <span
      style={{
        display: "inline-flex",
        minWidth: 22,
        height: 22,
        padding: "0 7px",
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        background: "#dc2626",
        color: "#fff",
        fontSize: 11,
        fontWeight: 900,
        lineHeight: 1,
      }}
      title={`${unreadChatCount} unread chat message${unreadChatCount > 1 ? "s" : ""}`}
    >
      {unreadChatCount}
    </span>
  ) : null}
</div>

                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                            <Pill>{titleCase(r.module)}</Pill>
                            <Pill tone={String(r.status ?? "").toLowerCase() === "open" ? "warn" : "neutral"}>
                              {titleCase(r.status)}
                            </Pill>
                            <Pill>Created: {fmtDate(r.created_at)}</Pill>
                            {r.needed_by ? <Pill>Needed by: {r.needed_by}</Pill> : null}
                            <Pill>
                              📍 {[(r.locality || "").trim(), (r.city || "").trim()].filter(Boolean).join(", ") || "—"}
                              {r.pincode ? `, ${r.pincode}` : ""}
                            </Pill>
                            {unreadChatCount > 0 ? (
                              <Pill tone="warn">New chat: {unreadChatCount}</Pill>
                            ) : null}
                            {isFreshChat && unreadChatCount === 0 ? (
                              <Pill tone="ok">Fresh chat</Pill>
                            ) : null}
                          </div>

                          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                            <Pill tone={vendorCount > 0 ? "ok" : "neutral"}>
                              {vendorCount} vendor{vendorCount === 1 ? "" : "s"} responded
                            </Pill>
                            {latestAt ? <Pill>Latest quote: {fmtDate(latestAt)}</Pill> : <Pill>Latest quote: —</Pill>}
                            {best != null ? <Pill tone="ok">Best total: {fmtMoney(best)}</Pill> : <Pill>Best total: —</Pill>}
                          </div>

                                                    <div
                            style={{
                              marginTop: 12,
                              padding: 12,
                              borderRadius: 12,
                              border:
                                aiInsight.priorityLabel === "Critical" || aiInsight.priorityLabel === "High"
                                  ? "1px solid #fde68a"
                                  : "1px solid #e2e8f0",
                              background:
                                aiInsight.priorityLabel === "Critical" || aiInsight.priorityLabel === "High"
                                  ? "#fffbeb"
                                  : "#f8fafc",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                              <div style={{ minWidth: 260, flex: 1 }}>
                                <div style={{ fontSize: 12, fontWeight: 800, color: "#334155", marginBottom: 5 }}>
                                  AI RFQ STATUS INTELLIGENCE
                                </div>

                                <div style={{ color: "#0f172a", fontWeight: 900 }}>
                                  {aiInsight.nextAction}
                                </div>

                                <div style={{ marginTop: 6, color: "#64748b", fontSize: 13, fontWeight: 800 }}>
                                  {aiInsight.alertText}
                                </div>

                                <div style={{ marginTop: 6, color: "#475569", fontSize: 13, fontWeight: 800 }}>
                                  Follow-up: {aiInsight.followUpText}
                                </div>
                              </div>

                              <div style={{ minWidth: 180, display: "grid", gap: 6, alignContent: "start" }}>
                                <Pill tone={aiInsight.successPrediction === "High" ? "ok" : aiInsight.successPrediction === "Medium" ? "warn" : "neutral"}>
                                  Success: {aiInsight.successPrediction}
                                </Pill>

                                <ActionButton href={aiInsight.nextActionHref} variant="secondary">
                                  Do Next →
                                </ActionButton>
                              </div>
                            </div>
                          </div>

                          {lastMessagePreview ? (
                            <Link
                                href={chatHref}
                                onClick={() => handleOpenChat(r.id)}
                                style={{
                                display: "block",
                                marginTop: 12,
                                padding: "10px 12px",
                                borderRadius: 12,
                                border: unreadChatCount > 0 ? "1px solid #fde68a" : isFreshChat ? "1px solid #bbf7d0" : "1px solid #e5e7eb",
                                background: unreadChatCount > 0 ? "#fffbeb" : isFreshChat ? "#f0fdf4" : "#f8fafc",
                                textDecoration: "none",
                                color: "inherit",
                                cursor: "pointer",
                              }}
                              title="Open chat"
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  gap: 12,
                                  flexWrap: "wrap",
                                  alignItems: "center",
                                  marginBottom: 4,
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: 12,
                                    fontWeight: 900,
                                    color: unreadChatCount > 0 ? "#92400e" : "#334155",
                                  }}
                                >
                                  CHAT UPDATE
                                </div>
                                <div
                                  style={{
                                    fontSize: 12,
                                    fontWeight: 700,
                                    color: unreadChatCount > 0 ? "#92400e" : "#64748b",
                                  }}
                                >
                                  {lastMessageAt ? `${fmtDate(lastMessageAt)} • ${fmtRelativeTime(lastMessageAt)}` : "—"}
                                </div>
                              </div>

                              <div
                                style={{
                                  fontSize: 14,
                                  fontWeight: unreadChatCount > 0 ? 800 : 600,
                                  color: "#111827",
                                  wordBreak: "break-word",
                                }}
                              >
                                {lastMessagePreview}
                              </div>

                              <div
                                style={{
                                  marginTop: 6,
                                  fontSize: 12,
                                  fontWeight: 900,
                                  color: unreadChatCount > 0 ? "#b45309" : "#475569",
                                }}
                              >
                               Continue chat →
                              </div>
                            </Link>
                          ) : null}

                          {selected ? (
                            <div
                              style={{
                                marginTop: 12,
                                padding: 12,
                                borderRadius: 12,
                                border: "1px solid #bbf7d0",
                                background: "#ecfdf5",
                              }}
                            >
                              {(() => {
                                const selectedTotal =
                                  typeof selected.final_total === "number" ? selected.final_total : null;

                                const savings =
                                  best != null && selectedTotal != null && best >= selectedTotal
                                    ? best - selectedTotal
                                    : null;

                                return (
                                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                                    <div style={{ minWidth: 280, flex: 1 }}>
                                      <div style={{ fontSize: 12, fontWeight: 900, color: "#065f46", marginBottom: 6 }}>
                                        SELECTED VENDOR SUMMARY
                                      </div>

                                      <div style={{ fontWeight: 900, fontSize: 16 }}>
                                        {selected.vendor_name ??
                                          (selected.vendor_id ? `Vendor ${selected.vendor_id.slice(0, 8)}…` : "Vendor")}
                                      </div>

                                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                                        <Pill tone="ok">Winner</Pill>
                                        <Pill tone="ok">Accepted</Pill>
                                        {selected.accepted_quote_version != null ? (
                                          <Pill>v{selected.accepted_quote_version}</Pill>
                                        ) : null}
                                        {selected.accepted_at ? <Pill>Accepted at: {fmtDate(selected.accepted_at)}</Pill> : null}
                                      </div>

                                      <div style={{ marginTop: 8, fontSize: 13, color: "#065f46" }}>
                                        📍 {[selected.vendor_locality, selected.vendor_city].filter(Boolean).join(", ") || "—"}
                                      </div>

                                      <div
                                        style={{
                                          marginTop: 10,
                                          display: "grid",
                                          gap: 4,
                                          fontSize: 13,
                                          color: "#065f46",
                                        }}
                                      >
                                        <div>
                                          <strong>Best Quote Received:</strong> {fmtMoney(best)}
                                        </div>
                                        <div>
                                          <strong>Selected Quote:</strong> {fmtMoney(selectedTotal)}
                                        </div>
                                        {savings != null ? (
                                          <div>
                                            <strong>You Saved:</strong> {fmtMoney(savings)}
                                          </div>
                                        ) : null}
                                      </div>
                                    </div>

                                    <div style={{ textAlign: "right", minWidth: 220 }}>
                                      <div style={{ fontSize: 12, fontWeight: 900, color: "#065f46", opacity: 0.85 }}>
                                        Final Total
                                      </div>
                                      <div style={{ fontSize: 18, fontWeight: 800, color: "#065f46" }}>
                                        {fmtMoney(selectedTotal)}
                                      </div>

                                      <div style={{ marginTop: 12, display: "grid", gap: 8, justifyItems: "end" }}>
                                        <Link
                                          href={chatHref}
                                          onClick={() => handleOpenChat(r.id)}
                                          style={{
                                          display: "inline-flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          minHeight: 36,
                                          padding: "0 12px",
                                          borderRadius: 10,
                                          border: unreadChatCount > 0 ? "1px solid #fecaca" : "1px solid rgba(0,0,0,0.12)",
                                          background: unreadChatCount > 0 ? "#fff1f2" : "white",
                                          fontWeight: 900,
                                          textDecoration: "none",
                                          color: unreadChatCount > 0 ? "#b91c1c" : "inherit",
                                          gap: 8,
                                        }}
                                        >
                                          Contact Vendor
                                          {unreadChatCount > 0 ? (
                                            <span
                                              style={{
                                                display: "inline-flex",
                                                minWidth: 20,
                                                height: 20,
                                                padding: "0 6px",
                                                borderRadius: 12,
                                                alignItems: "center",
                                                justifyContent: "center",
                                                background: "#dc2626",
                                                color: "white",
                                                fontSize: 11,
                                                fontWeight: 900,
                                              }}
                                            >
                                              {unreadChatCount}
                                            </span>
                                          ) : null}
                                        </Link>

                                        <Link
                                          href={printHref}
                                          target="_blank"
                                          style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            minHeight: 36,
                                            padding: "0 12px",
                                            borderRadius: 10,
                                            border: "1px solid rgba(0,0,0,0.12)",
                                            background: "white",
                                            fontWeight: 900,
                                            textDecoration: "none",
                                            color: "inherit",
                                          }}
                                        >
                                          Download Quote
                                        </Link>

                                        <Link
                                          href={openHref}
                                          style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            minHeight: 36,
                                            padding: "0 12px",
                                            borderRadius: 10,
                                            border: "1px solid rgba(0,0,0,0.12)",
                                            background: "white",
                                            fontWeight: 900,
                                            textDecoration: "none",
                                            color: "inherit",
                                          }}
                                        >
                                          Open
                                        </Link>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          ) : null}
                        </div>

                        <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", gap: 8, minWidth: 190 }}>
                          {selected || unreadChatCount > 0 || !!lastMessagePreview ? (
                            <Link
                                href={chatHref}
                                onClick={() => handleOpenChat(r.id)}
                                style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                minHeight: 40,
                                padding: "0 14px",
                                borderRadius: 12,
                                border: unreadChatCount > 0 ? "1px solid #fecaca" : "1px solid rgba(0,0,0,0.12)",
                                background: unreadChatCount > 0 ? "#fff1f2" : "#fff",
                                fontWeight: 900,
                                textDecoration: "none",
                                color: unreadChatCount > 0 ? "#b91c1c" : "#111827",
                                gap: 8,
                              }}
                            >
                              💬 {unreadChatCount > 0 ? "Open chat" : "Chat"}
                              {unreadChatCount > 0 ? (
                                <span
                                  style={{
                                    display: "inline-flex",
                                    minWidth: 20,
                                    height: 20,
                                    padding: "0 6px",
                                    borderRadius: 12,
                                    alignItems: "center",
                                    justifyContent: "center",
                                    background: "#dc2626",
                                    color: "white",
                                    fontSize: 11,
                                    fontWeight: 900,
                                  }}
                                >
                                  {unreadChatCount}
                                </span>
                              ) : null}
                            </Link>
                          ) : null}

                          <ActionButton
                            href={openHref}
                            variant="secondary"
                          >
                            {selected ? "Open →" : "Compare Quotes →"}
                          </ActionButton>

                          <Link
                            href={openHref}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              minHeight: 36,
                              padding: "0 12px",
                              borderRadius: 10,
                              border: "1px solid rgba(0,0,0,0.12)",
                              background: "white",
                              fontWeight: 800,
                              textDecoration: "none",
                              color: "inherit",
                            }}
                          >
                            {selected ? "Open RFQ" : "Open compare"}
                          </Link>
                        </div>
                      </div>
                    </CardBody>

                    <CardFooter>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", width: "100%" }}>
                        <span style={{ color: "#5b6472", fontSize: 13 }}>
                          RFQ ID: {r.id.slice(0, 8)}… • RFQ No: {r.public_id ?? "—"}
                        </span>
                        <span style={{ marginLeft: "auto", color: "#5b6472", fontSize: 13 }}>
                          AI sorts this list by priority, unread vendor activity, quote readiness and procurement urgency.
                        </span>
                      </div>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </Container>
    </main>
  );
}