"use client";

import React, { useEffect, useMemo, useState } from "react";
import LeadScore from "./LeadScore";

type AttachmentRow = {
  kind?: "image" | "file" | "audio";
  name?: string;
  path?: string;
  mime?: string;
  size?: number;
};

type MsgRow = {
  id: string;
  sender_user_id: string;
  sender_role: string;
  message_type: string;
  body: string;
  meta?: {
    attachments?: AttachmentRow[];
    reply_to?: {
      id?: string;
      body?: string;
      sender_role?: string;
      sender_user_id?: string;
    };
    reactions?: {
      [emoji: string]: string[];
    };
    edited?: boolean;
    deleted?: boolean;
    [key: string]: any;
  } | null;
  created_at: string | null;
};

type AiDealStage = {
  stage: string;
  confidence: number;
  reason: string;
  ctaLabel: string;
  ctaMessage: string;
  dealMomentum?: "low" | "medium" | "high";
  followUpTiming?: "now" | "soon" | "later";
  staleLeadRisk?: "low" | "medium" | "high";
  buyerCoolingOff?: boolean;
  vendorResponseNeeded?: boolean;
  timelineScore?: number;
  nextTimelineAction?: string;
};

type AiDealScore = {
  score: number;
  label: string;
  insight: string;
  actionLabel: string;
  actionMessage: string;
  dealTemperature?: "cold" | "warm" | "hot" | "closing";
  closingProbability?: number;
  hesitationDetected?: boolean;
  urgencyDetected?: boolean;
  leadLossRisk?: "low" | "medium" | "high";
  nextBestAction?: string;
};

type AiVendorAlert = {
  alert: boolean;
  severity: "low" | "medium" | "high";
  audience: "buyer" | "vendor" | "both";
  priority: "free" | "premium";
  premiumEligible: boolean;
  title: string;
  insight: string;
  buyerHint: string;
  vendorHint: string;
  upgradeHint: string;
  actionLabel: string;
  actionMessage: string;
  hesitationDetected?: boolean;
  urgencyDetected?: boolean;
  leadLossRisk?: "low" | "medium" | "high";
  dealTemperature?: "cold" | "warm" | "hot" | "closing";
  followUpNeeded?: boolean;
  vendorNextAction?: string;
};

export default function ConversationMessageList(props: {
  ordered: MsgRow[];
  currentUserId: string;
  firstUnreadMessageId: string | null;
  unreadDividerRef: React.RefObject<HTMLDivElement | null>;
  messageRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  highlightedMessageId: string | null;
  hoverReactionMessageId: string | null;
  setHoverReactionMessageId: React.Dispatch<React.SetStateAction<string | null>>;
  latestOwnMessageId: string | null;
  counterpartLastSeenAt: string | null;
  counterpartOnline: boolean;
  myLastSeenAt: string | null;
  openActionMenu: (message: MsgRow, x: number, y: number) => void;
  jumpToMessage: (messageId?: string | null) => void;
  toggleReaction: (message: MsgRow, emoji: string) => Promise<void>;
  setActionMenu: React.Dispatch<
    React.SetStateAction<{
      message: MsgRow;
      x: number;
      y: number;
    } | null>
  >;
  setShowReactionPicker: React.Dispatch<React.SetStateAction<boolean>>;
  editingMessageId: string | null;
  editingText: string;
  setEditingText: React.Dispatch<React.SetStateAction<string>>;
  cancelEditMessage: () => void;
  saveEditMessage: (messageId: string) => Promise<void>;
  renderAttachment: (att: AttachmentRow, i: number) => React.ReactNode;
  fmtDateTime: (v?: string | null) => string;
  getDateDividerLabel: (v?: string | null) => string;
  toDisplayRole: (role?: string | null) => string;
  REACTION_EMOJIS: string[];
  onSendAiSuggestion?: (messageOverride?: string) => Promise<void>;
}) {
  const {
    ordered,
    currentUserId,
    firstUnreadMessageId,
    unreadDividerRef,
    messageRefs,
    highlightedMessageId,
    hoverReactionMessageId,
    setHoverReactionMessageId,
    latestOwnMessageId,
    counterpartLastSeenAt,
    counterpartOnline,
    myLastSeenAt,
    openActionMenu,
    jumpToMessage,
    toggleReaction,
    setActionMenu,
    setShowReactionPicker,
    editingMessageId,
    editingText,
    setEditingText,
    cancelEditMessage,
    saveEditMessage,
    renderAttachment,
    fmtDateTime,
    getDateDividerLabel,
    toDisplayRole,
    REACTION_EMOJIS,
    onSendAiSuggestion,
  } = props;

  const recentDealMessages = useMemo(
    () =>
      ordered
        .filter((m) => !m.meta?.deleted && m.message_type !== "system" && m.sender_role !== "system")
        .slice(-6)
        .map((m) => ({
          role: m.sender_user_id === currentUserId ? "me" : toDisplayRole(m.sender_role),
          body: String(m.body || "").slice(0, 500),
        })),
    [ordered, currentUserId, toDisplayRole]
  );

  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [aiSuggestionsLoading, setAiSuggestionsLoading] = useState(false);
  const [aiSuggestionsError, setAiSuggestionsError] = useState("");
  const [aiDealStage, setAiDealStage] = useState<AiDealStage | null>(null);
  const [aiDealStageLoading, setAiDealStageLoading] = useState(false);
  const [aiDealStageError, setAiDealStageError] = useState("");
  const [urgencySeconds, setUrgencySeconds] = useState(30);

  const defaultAiDealScore: AiDealScore = {
    score: 40,
    label: "Normal Lead",
    insight:
      "Conversation started but important deal details like price, quantity, delivery and confirmation are missing.",
    actionLabel: "Ask for details",
    actionMessage:
      "Please share price, quantity, delivery location and expected delivery time.",
    dealTemperature: "cold",
    closingProbability: 40,
    hesitationDetected: false,
    urgencyDetected: false,
    leadLossRisk: "medium",
    nextBestAction:
      "Ask for price, quantity, delivery location and expected delivery time.",
  };

  const defaultAiVendorAlert: AiVendorAlert = {
    alert: false,
    severity: "medium",
    audience: "both",
    priority: "free",
    premiumEligible: false,
    title: "Deal Activity Detected",
    insight:
      "Conversation is active. More price, quantity, delivery and confirmation details may be needed.",
    buyerHint:
      "Ask for final price, quantity, delivery location, delivery time and bill details before payment.",
    vendorHint:
      "Vendor should reply quickly with price, availability and delivery timeline.",
    upgradeHint:
      "Premium vendors can receive stronger priority alerts when buyers show closing intent.",
    actionLabel: "Ask Final Details",
    actionMessage:
      "Please confirm final price, quantity, delivery location, delivery time and bill/document availability.",
    hesitationDetected: false,
    urgencyDetected: false,
    leadLossRisk: "medium",
    dealTemperature: "cold",
    followUpNeeded: false,
    vendorNextAction:
      "Reply quickly with final price, availability, delivery timeline and bill details.",
  };

  const [aiDealScore, setAiDealScore] = useState<AiDealScore>(defaultAiDealScore);
  const [aiVendorAlert, setAiVendorAlert] =
    useState<AiVendorAlert>(defaultAiVendorAlert);

  useEffect(() => {
    let cancelled = false;

    async function loadAiSuggestions() {
      if (recentDealMessages.length === 0) {
        setAiSuggestions([]);
        return;
      }

      setAiSuggestionsLoading(true);
      setAiSuggestionsError("");

      try {
        const res = await fetch("/api/ai/chat-reply-suggestions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: recentDealMessages }),
        });

        const data = await res.json().catch(() => null);

        if (!res.ok || !Array.isArray(data?.suggestions)) {
          throw new Error(data?.error || "AI suggestions are not available.");
        }

        if (!cancelled) {
          setAiSuggestions(data.suggestions.slice(0, 3).map((x: any) => String(x)));
        }
      } catch (error: any) {
        if (!cancelled) {
          setAiSuggestions([]);
          setAiSuggestionsError(error?.message || "AI suggestions are not available.");
        }
      } finally {
        if (!cancelled) {
          setAiSuggestionsLoading(false);
        }
      }
    }

    void loadAiSuggestions();

    return () => {
      cancelled = true;
    };
  }, [recentDealMessages]);

useEffect(() => {
  let cancelled = false;

  async function loadAiDealScore() {
    try {
      const res = await fetch("/api/ai/deal-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ messages: recentDealMessages || [] }),
      });

      const data = await res.json().catch(() => null);

      if (!cancelled && res.ok) {
          setAiDealScore({
          score: Number(data?.score || defaultAiDealScore.score),
          label: String(data?.label || defaultAiDealScore.label),
          insight: String(data?.insight || defaultAiDealScore.insight),
          actionLabel: String(data?.actionLabel || defaultAiDealScore.actionLabel),
          actionMessage: String(data?.actionMessage || defaultAiDealScore.actionMessage),
          dealTemperature: data?.dealTemperature || defaultAiDealScore.dealTemperature,
          closingProbability: Number(
            data?.closingProbability || defaultAiDealScore.closingProbability || 40
          ),
          hesitationDetected: Boolean(
            data?.hesitationDetected ?? defaultAiDealScore.hesitationDetected
          ),
          urgencyDetected: Boolean(
            data?.urgencyDetected ?? defaultAiDealScore.urgencyDetected
          ),
          leadLossRisk: data?.leadLossRisk || defaultAiDealScore.leadLossRisk,
          nextBestAction: String(
            data?.nextBestAction || defaultAiDealScore.nextBestAction || ""
          ),
        });
      }
    } catch {
      if (!cancelled) {
        setAiDealScore(defaultAiDealScore);
      }
    }
  }

  void loadAiDealScore();

  const timer = setInterval(loadAiDealScore, 5000);

  return () => {
    cancelled = true;
    clearInterval(timer);
  };
}, [recentDealMessages]);

  useEffect(() => {
    let cancelled = false;

    async function loadAiVendorAlert() {
      try {
        const res = await fetch("/api/ai/vendor-alert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            side: "buyer",
            messages: recentDealMessages || [],
          }),
        });

        const data = await res.json().catch(() => null);

        if (!cancelled && res.ok) {
          setAiVendorAlert({
            alert: Boolean(data?.alert ?? defaultAiVendorAlert.alert),
            severity: data?.severity || defaultAiVendorAlert.severity,
            audience: data?.audience || defaultAiVendorAlert.audience,
            priority: data?.priority || defaultAiVendorAlert.priority,
            premiumEligible: Boolean(
              data?.premiumEligible ?? defaultAiVendorAlert.premiumEligible
            ),
            title: String(data?.title || defaultAiVendorAlert.title),
            insight: String(data?.insight || defaultAiVendorAlert.insight),
            buyerHint: String(data?.buyerHint || defaultAiVendorAlert.buyerHint),
            vendorHint: String(data?.vendorHint || defaultAiVendorAlert.vendorHint),
            upgradeHint: String(data?.upgradeHint || defaultAiVendorAlert.upgradeHint),
            actionLabel: String(data?.actionLabel || defaultAiVendorAlert.actionLabel),
            actionMessage: String(data?.actionMessage || defaultAiVendorAlert.actionMessage),
            hesitationDetected: Boolean(
              data?.hesitationDetected ?? defaultAiVendorAlert.hesitationDetected
            ),
            urgencyDetected: Boolean(
              data?.urgencyDetected ?? defaultAiVendorAlert.urgencyDetected
            ),
            leadLossRisk: data?.leadLossRisk || defaultAiVendorAlert.leadLossRisk,
            dealTemperature:
              data?.dealTemperature || defaultAiVendorAlert.dealTemperature,
            followUpNeeded: Boolean(
              data?.followUpNeeded ?? defaultAiVendorAlert.followUpNeeded
            ),
            vendorNextAction: String(
              data?.vendorNextAction || defaultAiVendorAlert.vendorNextAction || ""
            ),
          });
        }
      } catch {
        if (!cancelled) {
          setAiVendorAlert(defaultAiVendorAlert);
        }
      }
    }

    void loadAiVendorAlert();

    const timer = setInterval(loadAiVendorAlert, 5000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [recentDealMessages]);

  useEffect(() => {
    let cancelled = false;

    async function loadAiDealStage() {
      if (recentDealMessages.length === 0) {
        setAiDealStage(null);
        return;
      }

      setAiDealStageLoading(true);
      setAiDealStageError("");

      try {
        const res = await fetch("/api/ai/deal-stage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: recentDealMessages }),
        });

        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.stage) {
          throw new Error(data?.error || "AI deal stage is not available.");
        }

        if (!cancelled) {
          setAiDealStage({
            stage: String(data.stage || "discussion"),
            confidence: Number(data.confidence || 0),
            reason: String(data.reason || ""),
            ctaLabel: String(data.ctaLabel || "Continue Deal"),
            ctaMessage: String(data.ctaMessage || "Please confirm the next step for this deal."),
            dealMomentum: data.dealMomentum || "medium",
            followUpTiming: data.followUpTiming || "soon",
            staleLeadRisk: data.staleLeadRisk || "medium",
            buyerCoolingOff: Boolean(data.buyerCoolingOff),
            vendorResponseNeeded: Boolean(data.vendorResponseNeeded ?? true),
            timelineScore: Number(data.timelineScore || 50),
            nextTimelineAction: String(data.nextTimelineAction || ""),
          });
        }
      } catch (error: any) {
        if (!cancelled) {
          setAiDealStage(null);
          setAiDealStageError(error?.message || "AI deal stage is not available.");
        }
      } finally {
        if (!cancelled) {
          setAiDealStageLoading(false);
        }
      }
    }

    void loadAiDealStage();

    return () => {
      cancelled = true;
    };
  }, [recentDealMessages]);

    const latestIncomingMessage = useMemo(() => {
    const incoming = ordered.filter((m) => {
      const mine = String(m.sender_user_id ?? "") === String(currentUserId);
      const isSystem = m.sender_role === "system" || m.message_type === "system";
      return !mine && !isSystem && !m.meta?.deleted && String(m.body || "").trim();
    });

    return incoming.length > 0 ? incoming[incoming.length - 1] : null;
  }, [ordered, currentUserId]);

  const hasOwnReplyAfterLatestIncoming = useMemo(() => {
    if (!latestIncomingMessage?.created_at) return false;

    const incomingTime = new Date(latestIncomingMessage.created_at).getTime();

    return ordered.some((m) => {
      const mine = String(m.sender_user_id ?? "") === String(currentUserId);
      if (!mine || !m.created_at || m.meta?.deleted) return false;

      return new Date(m.created_at).getTime() > incomingTime;
    });
  }, [ordered, currentUserId, latestIncomingMessage]);

  const highIntentDeal =
    aiDealScore.score >= 70 ||
    aiVendorAlert.severity === "high" ||
    aiDealStage?.stage?.toLowerCase().includes("negotiation") ||
    aiDealStage?.stage?.toLowerCase().includes("closing") ||
    aiDealStage?.stage?.toLowerCase().includes("ready");

  const showBuyerWaitingUrgency =
    ordered.length > 0 &&
    !!latestIncomingMessage &&
    !hasOwnReplyAfterLatestIncoming &&
    highIntentDeal;

  useEffect(() => {
    setUrgencySeconds(30);

    if (!showBuyerWaitingUrgency) return;

    const timer = window.setInterval(() => {
      setUrgencySeconds((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [latestIncomingMessage?.id, showBuyerWaitingUrgency]);

  const liveDealHealth = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        (Number(aiDealScore.closingProbability || aiDealScore.score || 40) +
          Number(aiDealStage?.timelineScore || 50)) /
          2
      )
    )
  );

  const liveDealHealthLabel =
    liveDealHealth >= 80
      ? "Very strong"
      : liveDealHealth >= 65
      ? "Strong"
      : liveDealHealth >= 45
      ? "Active"
      : "Needs action";

  const liveDealRiskLabel =
    aiDealScore.leadLossRisk ||
    aiVendorAlert.leadLossRisk ||
    aiDealStage?.staleLeadRisk ||
    "medium";

  const procurementCopilotSuggestions = useMemo(() => {
    const suggestions: Array<{
      title: string;
      detail: string;
      action: string;
      tone: "blue" | "green" | "orange" | "red" | "purple";
    }> = [];

    const latestText = String(latestIncomingMessage?.body || "").toLowerCase();
    const conversationText = recentDealMessages.map((m) => String(m.body || "")).join(" ").toLowerCase();

    const mentionsPrice =
      conversationText.includes("price") ||
      conversationText.includes("rate") ||
      conversationText.includes("quote") ||
      conversationText.includes("₹") ||
      conversationText.includes("rs");

    const mentionsDelivery =
      conversationText.includes("delivery") ||
      conversationText.includes("transport") ||
      conversationText.includes("site") ||
      conversationText.includes("location");

    const mentionsInvoice =
      conversationText.includes("gst") ||
      conversationText.includes("invoice") ||
      conversationText.includes("bill");

    const mentionsPayment =
      conversationText.includes("payment") ||
      conversationText.includes("advance") ||
      conversationText.includes("upi") ||
      conversationText.includes("cash");

    if (!mentionsPrice) {
      suggestions.push({
        title: "💰 Confirm final price",
        detail: "Final price is not clearly confirmed yet.",
        action: "Please confirm your final price including all charges.",
        tone: "blue",
      });
    }

    if (!mentionsDelivery) {
      suggestions.push({
        title: "📦 Confirm delivery",
        detail: "Delivery timeline or location needs clearer confirmation.",
        action: "Please confirm delivery location, delivery date and transport charges.",
        tone: "orange",
      });
    }

    if (!mentionsInvoice) {
      suggestions.push({
        title: "🧾 Ask GST / invoice",
        detail: "Invoice or GST terms are not clearly discussed.",
        action: "Please confirm whether GST invoice or proper bill will be provided.",
        tone: "purple",
      });
    }

    if (!mentionsPayment) {
      suggestions.push({
        title: "🔐 Confirm payment safety",
        detail: "Payment terms should be confirmed before closing.",
        action: "Please confirm payment terms, advance amount if any, and final payment timing.",
        tone: "green",
      });
    }

    if (aiDealScore.hesitationDetected || aiVendorAlert.hesitationDetected) {
      suggestions.push({
        title: "⚠ Reduce hesitation",
        detail: "AI detected hesitation. Clarify doubts before pushing for closure.",
        action: "Please tell me if you have any doubt about price, delivery, quality or payment terms.",
        tone: "red",
      });
    }

    if (aiDealScore.urgencyDetected || aiVendorAlert.urgencyDetected || latestText.includes("urgent")) {
      suggestions.push({
        title: "🔥 Urgent deal",
        detail: "AI detected urgency. Fast confirmation can improve conversion.",
        action: "I understand this is urgent. Please confirm quantity and location so I can finalize quickly.",
        tone: "red",
      });
    }

    suggestions.push({
      title: "🤝 Close safely",
      detail: "Before closing, confirm all essential procurement terms.",
      action:
        aiDealStage?.ctaMessage ||
        aiDealScore.actionMessage ||
        aiVendorAlert.actionMessage ||
        "Please confirm final price, quantity, delivery location, timeline, invoice and payment terms.",
      tone: "green",
    });

    return suggestions.slice(0, 5);
  }, [
    latestIncomingMessage?.body,
    recentDealMessages,
    aiDealScore.hesitationDetected,
    aiDealScore.urgencyDetected,
    aiDealScore.actionMessage,
    aiVendorAlert.hesitationDetected,
    aiVendorAlert.urgencyDetected,
    aiVendorAlert.actionMessage,
    aiDealStage?.ctaMessage,
  ]);

  const copilotToneStyle = (
    tone: "blue" | "green" | "orange" | "red" | "purple"
  ): React.CSSProperties => {
    if (tone === "green") {
      return { border: "1px solid #bbf7d0", background: "#ecfdf5", color: "#065f46" };
    }
    if (tone === "orange") {
      return { border: "1px solid #fed7aa", background: "#fff7ed", color: "#9a3412" };
    }
    if (tone === "red") {
      return { border: "1px solid #fecaca", background: "#fff1f2", color: "#be123c" };
    }
    if (tone === "purple") {
      return { border: "1px solid #ddd6fe", background: "#f5f3ff", color: "#5b21b6" };
    }
    return { border: "1px solid #bfdbfe", background: "#eff6ff", color: "#1d4ed8" };
  };

  const useAiSuggestion = async (suggestion: string) => {
    const cleanSuggestion = String(suggestion || "").trim();
    if (!cleanSuggestion) return;

    if (onSendAiSuggestion) {
      await onSendAiSuggestion(cleanSuggestion);
      return;
    }

    try {
      await navigator.clipboard?.writeText(cleanSuggestion);
    } catch {
      // Clipboard may be blocked. In that case, show the text visually only.
    }
  };

  function fmtDeliveryStatus(args: {
    mine: boolean;
    isLatestOwnMessage: boolean;
    seenThisMessage: boolean;
    counterpartOnline: boolean;
    counterpartLastSeenAt: string | null;
    createdAt: string | null;
  }) {
    const {
      mine,
      isLatestOwnMessage,
      seenThisMessage,
      counterpartOnline,
      counterpartLastSeenAt,
      createdAt,
    } = args;

    if (!mine || !isLatestOwnMessage) return null;

    if (seenThisMessage) {
      return {
        text: "✓✓ Seen",
        color: "#166534",
        bg: "#dcfce7",
        border: "#bbf7d0",
      };
    }

    const delivered =
      counterpartOnline ||
      (!!counterpartLastSeenAt &&
        !!createdAt &&
        new Date(counterpartLastSeenAt).getTime() >= new Date(createdAt).getTime());

    if (delivered) {
      return {
        text: "Delivered",
        color: "#2563eb",
        bg: "#dbeafe",
        border: "#bfdbfe",
      };
    }

    return {
      text: "Sent",
      color: "#475569",
      bg: "#f1f5f9",
      border: "#e2e8f0",
    };
  }

  return (
    <>
      <div
        style={{
          margin: "0 0 12px 0",
          border: "1px solid #bfdbfe",
          background: "#ffffff",
          borderRadius: 18,
          padding: "12px 14px",
          boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 10,
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              alignItems: "center",
              fontSize: 12,
              fontWeight: 800,
              color: "#334155",
            }}
          >
            <span style={{ border: "1px solid #e5e7eb", background: "#fff", borderRadius: 12, padding: "5px 10px" }}>
              📦 Item under discussion
            </span>
            <span style={{ border: "1px solid #e5e7eb", background: "#fff", borderRadius: 12, padding: "5px 10px" }}>
              📍 Location shared
            </span>
            <span style={{ border: "1px solid #e5e7eb", background: "#fff", borderRadius: 12, padding: "5px 10px" }}>
              💬 Live negotiation
            </span>
          </div>

          <button
            type="button"
            style={{
              border: "1px solid #1d4ed8",
              background: "#2563eb",
              color: "#fff",
              borderRadius: 12,
              padding: "8px 12px",
              fontSize: 12,
              fontWeight: 900,
              cursor: "pointer",
              boxShadow: "0 6px 14px rgba(37,99,235,0.18)",
            }}
          >
            Confirm Deal Details
          </button>
        </div>
      </div>

            {showBuyerWaitingUrgency ? (
        <div
          style={{
            margin: "0 0 12px 0",
            border: "1px solid #fb7185",
            background: "#ffffff",
            borderRadius: 18,
            padding: "12px 14px",
            boxShadow: "0 10px 24px rgba(190,18,60,0.10)",
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 950, color: "#be123c" }}>
            ⏳ Buyer waiting for your reply
          </div>

          <div style={{ marginTop: 6, fontSize: 12, fontWeight: 800, color: "#475569" }}>
            AI detected a high-intent buyer message. Fast replies can improve your closing chance.
          </div>

          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span
              style={{
                border: "1px solid #fecaca",
                background: "#fff",
                color: "#991b1b",
                borderRadius: 12,
                padding: "5px 10px",
                fontSize: 12,
                fontWeight: 950,
              }}
            >
              ⏱ High-intent window: {urgencySeconds}s
            </span>

            <span
              style={{
                border: "1px solid #fed7aa",
                background: "#fff7ed",
                color: "#9a3412",
                borderRadius: 12,
                padding: "5px 10px",
                fontSize: 12,
                fontWeight: 950,
              }}
            >
              Deal Score: {aiDealScore.score}%
            </span>

            <button
              type="button"
              onClick={() =>
                useAiSuggestion(
                  aiDealScore.actionMessage ||
                    aiVendorAlert.actionMessage ||
                    "I am checking this now and will share the best final price and delivery timeline shortly."
                )
              }
              style={{
                border: "none",
                background: "#be123c",
                color: "#fff",
                borderRadius: 12,
                padding: "7px 11px",
                fontSize: 12,
                fontWeight: 950,
                cursor: "pointer",
              }}
            >
              Reply Fast with AI
            </button>
          </div>
        </div>
      ) : null}

      {ordered.length > 0 ? (
        <div
          style={{
            margin: "0 0 12px 0",
            border: "1px solid #c7d2fe",
            background: "#ffffff",
            borderRadius: 18,
            padding: "12px 14px",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 950, color: "#3730a3" }}>
            🧭 Live AI deal operating layer
          </div>

          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 900, color: "#475569" }}>
                Deal health: {liveDealHealthLabel}
              </span>
              <span style={{ fontSize: 12, fontWeight: 950, color: "#3730a3" }}>
                {liveDealHealth}%
              </span>
            </div>

            <div
              style={{
                height: 9,
                borderRadius: 12,
                background: "#e0e7ff",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${liveDealHealth}%`,
                  height: "100%",
                  borderRadius: 12,
                  background:
                    liveDealHealth >= 80
                      ? "#16a34a"
                      : liveDealHealth >= 65
                      ? "#2563eb"
                      : liveDealHealth >= 45
                      ? "#f59e0b"
                      : "#dc2626",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={{ border: "1px solid #ddd6fe", background: "#fff", borderRadius: 12, padding: "5px 9px", fontSize: 11, fontWeight: 900 }}>
                🌡 Temperature: {aiDealScore.dealTemperature || aiVendorAlert.dealTemperature || "cold"}
              </span>
              <span style={{ border: "1px solid #ddd6fe", background: "#fff", borderRadius: 12, padding: "5px 9px", fontSize: 11, fontWeight: 900 }}>
                ⚠ Lead risk: {liveDealRiskLabel}
              </span>
              <span style={{ border: "1px solid #ddd6fe", background: "#fff", borderRadius: 12, padding: "5px 9px", fontSize: 11, fontWeight: 900 }}>
                ⏱ Follow-up: {aiDealStage?.followUpTiming || "soon"}
              </span>
              <span style={{ border: "1px solid #ddd6fe", background: "#fff", borderRadius: 12, padding: "5px 9px", fontSize: 11, fontWeight: 900 }}>
                📈 Momentum: {aiDealStage?.dealMomentum || "medium"}
              </span>
            </div>

            {(aiDealScore.nextBestAction || aiDealStage?.nextTimelineAction) ? (
              <div style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>
                Next action: {aiDealScore.nextBestAction || aiDealStage?.nextTimelineAction}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {ordered.length > 0 ? (
        <div
          style={{
            margin: "0 0 12px 0",
            border: "1px solid #a7f3d0",
            background: "#ffffff",
            borderRadius: 18,
            padding: "12px 14px",
            boxShadow: "0 8px 20px rgba(16,185,129,0.08)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 950, color: "#047857" }}>
                🧠 AI Procurement Copilot
              </div>
              <div style={{ marginTop: 4, fontSize: 12, fontWeight: 800, color: "#475569" }}>
                AI checks price, delivery, GST, payment and closing safety from this chat.
              </div>
            </div>

            <span
              style={{
                alignSelf: "center",
                border: "1px solid #bbf7d0",
                background: "#fff",
                color: "#047857",
                borderRadius: 12,
                padding: "5px 10px",
                fontSize: 12,
                fontWeight: 950,
              }}
            >
              Deal health: {liveDealHealth}%
            </span>
          </div>

          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            {procurementCopilotSuggestions.map((item, idx) => (
              <div
                key={`${item.title}-${idx}`}
                style={{
                  ...copilotToneStyle(item.tone),
                  borderRadius: 12,
                  padding: 10,
                  display: "grid",
                  gap: 6,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 800 }}>{item.title}</div>
                <div style={{ fontSize: 12, fontWeight: 800 }}>{item.detail}</div>

                <button
                  type="button"
                  onClick={() => useAiSuggestion(item.action)}
                  style={{
                    justifySelf: "start",
                    border: "1px solid rgba(15,23,42,0.12)",
                    background: "#fff",
                    color: "inherit",
                    borderRadius: 12,
                    padding: "6px 10px",
                    fontSize: 12,
                    fontWeight: 950,
                    cursor: "pointer",
                  }}
                >
                  Use AI action
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {ordered.length === 0 ? (
        <div style={{ opacity: 0.7 }}>No messages yet.</div>
      ) : (
        ordered.map((m, index) => {
          const mine = m.sender_user_id === currentUserId && m.sender_role !== "system";
          const isSystem = m.sender_role === "system" || m.message_type === "system";
          const attachments = Array.isArray(m.meta?.attachments) ? m.meta?.attachments : [];
          const seenThisMessage =
            mine &&
            latestOwnMessageId === m.id &&
            !!counterpartLastSeenAt &&
            !!m.created_at &&
            new Date(counterpartLastSeenAt).getTime() >= new Date(m.created_at).getTime();

          const deliveryState = fmtDeliveryStatus({
            mine,
            isLatestOwnMessage: latestOwnMessageId === m.id,
            seenThisMessage,
            counterpartOnline,
            counterpartLastSeenAt,
            createdAt: m.created_at,
          });

          const prev = index > 0 ? ordered[index - 1] : null;
          const showDateDivider =
            !prev ||
            new Date(prev.created_at ?? 0).toDateString() !==
              new Date(m.created_at ?? 0).toDateString();

          const next = index < ordered.length - 1 ? ordered[index + 1] : null;

          const prevTime = prev?.created_at ? new Date(prev.created_at).getTime() : 0;
          const currentTime = m.created_at ? new Date(m.created_at).getTime() : 0;

          const prevMine =
            !!prev &&
            String(prev.sender_user_id ?? "") === String(m.sender_user_id ?? "") &&
            prev.sender_role === m.sender_role &&
            prev.message_type !== "system" &&
            m.message_type !== "system" &&
            !showDateDivider &&
            currentTime - prevTime < 5 * 60 * 1000;

          const nextTime = next?.created_at ? new Date(next.created_at).getTime() : 0;

          const nextMine =
            !!next &&
            String(next.sender_user_id ?? "") === String(m.sender_user_id ?? "") &&
            next.sender_role === m.sender_role &&
            next.message_type !== "system" &&
            m.message_type !== "system" &&
            new Date(next.created_at ?? 0).toDateString() ===
              new Date(m.created_at ?? 0).toDateString() &&
            nextTime - currentTime < 5 * 60 * 1000;

          if (isSystem) {
            return (
              <div key={m.id} style={{ textAlign: "center" }}>
                <div
                  style={{
                    display: "inline-block",
                    padding: "8px 12px",
                    borderRadius: 12,
                    background: "#eef2f7",
                    fontSize: 12,
                    color: "#374151",
                    maxWidth: "85%",
                  }}
                >
                  {m.body}
                </div>
                <div
                  style={{ marginTop: 4, fontSize: 11, opacity: 0.6 }}
                  suppressHydrationWarning
                >
                  {fmtDateTime(m.created_at)}
                </div>
              </div>
            );
          }

          return (
            <React.Fragment key={m.id}>
              {firstUnreadMessageId === m.id ? (
                <div
                  ref={unreadDividerRef}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    margin: "10px 0",
                  }}
                >
                  <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 900,
                      color: "#dc2626",
                      background: "#fff",
                      padding: "2px 10px",
                      borderRadius: 12,
                      border: "1px solid #fecaca",
                    }}
                  >
                    {(() => {
                      const unreadCount = ordered.filter((x) => {
                        if (String(x.sender_user_id ?? "") === String(currentUserId)) return false;
                        if (!x.created_at) return false;
                        if (!myLastSeenAt) return true;

                        return (
                          new Date(x.created_at).getTime() >
                          new Date(myLastSeenAt).getTime()
                        );
                      }).length;

                      return `${unreadCount} Unread Message${unreadCount === 1 ? "" : "s"}`;
                    })()}
                  </div>
                  <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
                </div>
              ) : null}

              <div
                ref={(el) => {
                  messageRefs.current[m.id] = el;
                }}
                data-msg-date={getDateDividerLabel(m.created_at)}
                style={{
                  display: "flex",
                  justifyContent: mine ? "flex-end" : "flex-start",
                  marginTop: prevMine ? -2 : 0,
                }}
              >
                <div
                  onDoubleClick={(e) => {
                    openActionMenu(m, e.clientX, e.clientY);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    openActionMenu(m, e.clientX, e.clientY);
                  }}
                  onMouseEnter={() => {
                    if (!m.meta?.deleted) {
                      setHoverReactionMessageId(m.id);
                    }
                  }}
                  onMouseLeave={() => {
                    setHoverReactionMessageId((prev) => (prev === m.id ? null : prev));
                  }}
                  style={{
                    maxWidth: "76%",
                    position: "relative",
                    padding: "10px 12px",
                    borderRadius: mine
                      ? prevMine && nextMine
                        ? "16px 4px 4px 16px"
                        : prevMine
                        ? "16px 4px 16px 16px"
                        : nextMine
                        ? "16px 16px 4px 16px"
                        : "16px 16px 4px 16px"
                      : prevMine && nextMine
                      ? "4px 16px 16px 4px"
                      : prevMine
                      ? "4px 16px 16px 16px"
                      : nextMine
                      ? "16px 16px 16px 4px"
                      : "16px 16px 16px 4px",
                    background: mine ? "#dcfce7" : "#ffffff",
                    border: "1px solid #e5e7eb",
                    outline: highlightedMessageId === m.id ? "2px solid #f59e0b" : "none",
                    boxShadow:
                      highlightedMessageId === m.id
                        ? "0 0 0 4px rgba(245,158,11,0.18)"
                        : "0 1px 2px rgba(0,0,0,0.03)",
                    marginTop: prevMine ? 2 : 0,
                  }}
                >
                  {!prevMine ? (
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 800,
                        marginBottom: 4,
                        opacity: 0.8,
                      }}
                    >
                      {mine ? "You" : toDisplayRole(m.sender_role)}
                    </div>
                  ) : null}

                  {m.meta?.reply_to ? (
                    <div
                      onClick={() => jumpToMessage(m.meta?.reply_to?.id)}
                      style={{
                        marginBottom: m.body ? 8 : 6,
                        padding: "8px 10px",
                        borderLeft: "3px solid #94a3b8",
                        background: "#f8fafc",
                        borderRadius: 8,
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                      title="Jump to original message"
                    >
                      <div style={{ fontWeight: 800, marginBottom: 2 }}>
                        {String(m.meta.reply_to.sender_user_id ?? "") === String(currentUserId)
                          ? "You"
                          : toDisplayRole(m.meta.reply_to.sender_role)}
                      </div>
                      <div
                        style={{
                          opacity: 0.8,
                          whiteSpace: "pre-wrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {String(m.meta.reply_to.body ?? "").trim() || "Message"}
                      </div>
                    </div>
                  ) : null}

                  {m.meta?.deleted ? (
                    <div
                      style={{
                        whiteSpace: "pre-wrap",
                        lineHeight: 1.45,
                        fontStyle: "italic",
                        opacity: 0.65,
                      }}
                    >
                      This message was deleted.
                    </div>
                  ) : editingMessageId === m.id ? (
                    <div style={{ display: "grid", gap: 8 }}>
                      <textarea
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        rows={3}
                        style={{
                          width: "100%",
                          padding: 10,
                          borderRadius: 10,
                          border: "1px solid #d1d5db",
                          resize: "vertical",
                          outline: "none",
                          background: "#fff",
                        }}
                      />
                      <div style={{ marginTop: 8 }}>
                        <button
                          type="button"
                          onClick={async () => {
                            const text =
                              (document.querySelector("textarea") as HTMLTextAreaElement)?.value || "";

                            if (!text) {
                              alert("Write message first");
                              return;
                            }

                            const res = await fetch("/api/ai/deal-message", {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                              },
                              body: JSON.stringify({ message: text }),
                            });

                            const data = await res.json();

                            if (data?.message) {
                              const textarea = document.querySelector("textarea") as HTMLTextAreaElement;
                              textarea.value = data.message;
                            }
                          }}
                          style={{
                            padding: "6px 10px",
                            borderRadius: 8,
                            background: "#22c55e",
                            color: "#fff",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          ⚡ Improve with AI
                        </button>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          justifyContent: "flex-end",
                          flexWrap: "wrap",
                        }}
                      >
                        <button
                          type="button"
                          onClick={cancelEditMessage}
                          style={{
                            padding: "6px 10px",
                            borderRadius: 8,
                            border: "1px solid #d1d5db",
                            background: "#fff",
                            fontWeight: 800,
                            cursor: "pointer",
                          }}
                        >
                          Cancel
                        </button>

                        <button
                          type="button"
                          onClick={() => saveEditMessage(m.id)}
                          style={{
                            padding: "6px 10px",
                            borderRadius: 8,
                            border: "1px solid #bbf7d0",
                            background: "#ecfdf5",
                            color: "#065f46",
                            fontWeight: 800,
                            cursor: "pointer",
                          }}
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : m.body ? (
                    <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.45 }}>
                      {m.body}

                      {String(m.sender_role || "").toLowerCase() === "buyer" ? (
                        <LeadScore message={m.body} />
                      ) : null}
                    </div>
                  ) : null}

                  {attachments.length > 0 ? (
                    <div style={{ marginTop: m.body ? 6 : 0 }}>
                      {attachments.map((att, i) => renderAttachment(att, i))}
                    </div>
                  ) : null}

                  {m.meta?.reactions ? (
                    <div
                      style={{
                        marginTop: 6,
                        display: "flex",
                        gap: 6,
                        flexWrap: "wrap",
                      }}
                    >
                      {Object.entries(m.meta.reactions).map(([emoji, users]) => {
                        const reactionUsers = Array.isArray(users) ? (users as string[]) : [];
                        const count = reactionUsers.length;
                        if (!count) return null;

                        const reacted = reactionUsers.includes(currentUserId);

                        return (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => toggleReaction(m, emoji)}
                            style={{
                              borderRadius: 12,
                              border: "1px solid #e5e7eb",
                              background: reacted ? "#dcfce7" : "#fff",
                              padding: "2px 8px",
                              fontSize: 12,
                              cursor: "pointer",
                            }}
                          >
                            {emoji} {count}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}

                  {hoverReactionMessageId === m.id && !m.meta?.deleted ? (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        position: "absolute",
                        top: -18,
                        right: mine ? 8 : "auto",
                        left: mine ? "auto" : 8,
                        display: "flex",
                        gap: 6,
                        alignItems: "center",
                        background: "#fff",
                        border: "1px solid #e5e7eb",
                        borderRadius: 12,
                        padding: "4px 6px",
                        boxShadow: "0 8px 20px rgba(0,0,0,0.10)",
                        zIndex: 3,
                      }}
                    >
                      {REACTION_EMOJIS.slice(0, 4).map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={async () => {
                            await toggleReaction(m, emoji);
                            setHoverReactionMessageId(null);
                          }}
                          style={{
                            border: "none",
                            background: "transparent",
                            cursor: "pointer",
                            fontSize: 16,
                            lineHeight: 1,
                            padding: 2,
                          }}
                        >
                          {emoji}
                        </button>
                      ))}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActionMenu({
                            message: m,
                            x: e.clientX,
                            y: e.clientY,
                          });
                          setShowReactionPicker(true);
                          setHoverReactionMessageId(null);
                        }}
                        style={{
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                          fontSize: 14,
                          lineHeight: 1,
                          padding: "2px 4px",
                          fontWeight: 900,
                        }}
                        title="More actions"
                      >
                        +
                      </button>
                    </div>
                  ) : null}

                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 11,
                      opacity: 0.72,
                      textAlign: "right",
                      display: "flex",
                      justifyContent: "flex-end",
                      alignItems: "center",
                      gap: 6,
                      flexWrap: "wrap",
                    }}
                    suppressHydrationWarning
                  >
                    <span>
                      {m.meta?.edited ? "edited • " : ""}
                      {fmtDateTime(m.created_at)}
                    </span>

                    {deliveryState ? (
                      <span
                        style={{
                          fontWeight: 900,
                          color: deliveryState.color,
                          background: deliveryState.bg,
                          border: `1px solid ${deliveryState.border}`,
                          borderRadius: 12,
                          padding: "2px 7px",
                          lineHeight: 1.4,
                        }}
                        title="Message delivery status"
                      >
                        {deliveryState.text}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </React.Fragment>
          );
        })
      )}

      {ordered.length > 0 && aiVendorAlert.alert ? (
        <div
          style={{
            marginTop: 14,
            border:
              aiVendorAlert.priority === "premium"
                ? "1px solid #f97316"
                : "1px solid #fde68a",
            background:
              aiVendorAlert.priority === "premium"
                ? "linear-gradient(90deg, #fff7ed, #ffffff)"
                : "linear-gradient(90deg, #fffbeb, #ffffff)",
            borderRadius: 18,
            padding: "12px 14px",
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 900,
              color: aiVendorAlert.priority === "premium" ? "#c2410c" : "#92400e",
              marginBottom: 8,
            }}
          >
            🔔 {aiVendorAlert.title}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            <span
              style={{
                border: "1px solid #fed7aa",
                background: "#fff",
                color: "#9a3412",
                borderRadius: 12,
                padding: "4px 8px",
                fontSize: 11,
                fontWeight: 900,
              }}
            >
              {aiVendorAlert.priority === "premium"
                ? "🔥 Premium Priority Signal"
                : "Free Alert"}
            </span>

            {aiVendorAlert.premiumEligible ? (
              <span
                style={{
                  border: "1px solid #c7d2fe",
                  background: "#eef2ff",
                  color: "#3730a3",
                  borderRadius: 12,
                  padding: "4px 8px",
                  fontSize: 11,
                  fontWeight: 900,
                }}
              >
                Monetization Eligible
              </span>
            ) : null}
          </div>

          <div style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>
            {aiVendorAlert.insight}
          </div>

          <div
            style={{
              marginTop: 8,
              border: "1px dashed #fdba74",
              background: "#fff",
              borderRadius: 12,
              padding: 10,
              fontSize: 12,
              fontWeight: 800,
              color: "#7c2d12",
            }}
          >
            🧠 Buyer AI: {aiVendorAlert.buyerHint}
          </div>

          <button
            type="button"
            onClick={() => useAiSuggestion(aiVendorAlert.actionMessage)}
            style={{
              marginTop: 10,
              border: "none",
              background: aiVendorAlert.priority === "premium" ? "#f97316" : "#f59e0b",
              color: "#fff",
              borderRadius: 12,
              padding: "8px 12px",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            {aiVendorAlert.actionLabel}
          </button>
        </div>
      ) : null}

      {ordered.length > 0 ? (
        <div
          style={{
            marginTop: 14,
            border: "1px solid #fca5a5",
            background: "#ffffff",
            borderRadius: 18,
            padding: "12px 14px",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 900, color: "#b91c1c", marginBottom: 8 }}>
            🔥 Deal Status
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <span style={{ fontWeight: 900 }}>
                {aiDealScore.score || 40}%
              </span>
              <span>{aiDealScore.label || "Normal Lead"}</span>
            </div>

            <div style={{ fontSize: 12 }}>
              {aiDealScore.insight ||
                "Conversation started but important deal details are missing."}
            </div>

            <button
              type="button"
              onClick={() =>
                onSendAiSuggestion?.(
                  aiDealScore.actionMessage ||
                    "Please share price, quantity, delivery location and expected delivery time."
                )
              }
              style={{
                border: "none",
                background: "#dc2626",
                color: "#fff",
                borderRadius: 12,
                padding: "8px 12px",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              {aiDealScore.actionLabel || "Ask for details"}
            </button>
          </div>
        </div>
      ) : null}
        <div
          style={{
            marginTop: 14,
            border: "1px solid #bbf7d0",
            background: "#ffffff",
            borderRadius: 18,
            padding: "12px 14px",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 900, color: "#065f46", marginBottom: 8 }}>
            🧠 AI deal stage intelligence
          </div>

          {aiDealStageLoading ? (
            <div style={{ fontSize: 12, fontWeight: 800, color: "#047857" }}>
              AI is detecting the current deal stage...
            </div>
          ) : aiDealStage ? (
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <span
                  style={{
                    border: "1px solid #bbf7d0",
                    background: "#fff",
                    color: "#065f46",
                    borderRadius: 12,
                    padding: "6px 10px",
                    fontSize: 12,
                    fontWeight: 900,
                  }}
                >
                  Stage: {aiDealStage.stage.replaceAll("_", " ")}
                </span>

                <span
                  style={{
                    border: "1px solid #d1fae5",
                    background: "#fff",
                    color: "#047857",
                    borderRadius: 12,
                    padding: "6px 10px",
                    fontSize: 12,
                    fontWeight: 900,
                  }}
                >
                  Confidence: {Math.round(aiDealStage.confidence * 100)}%
                </span>
              </div>

              {aiDealStage.reason ? (
                <div style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>
                  {aiDealStage.reason}
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => useAiSuggestion(aiDealStage.ctaMessage)}
                style={{
                  justifySelf: "start",
                  border: "1px solid #047857",
                  background: "#059669",
                  color: "#fff",
                  borderRadius: 12,
                  padding: "8px 12px",
                  fontSize: 12,
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                {aiDealStage.ctaLabel}
              </button>
            </div>
          ) : (
            <div style={{ fontSize: 12, fontWeight: 800, color: "#64748b" }}>
              {aiDealStageError || "AI will detect the deal stage after more messages."}
            </div>
          )}
        </div>

      {ordered.length > 0 ? (
        <div
          style={{
            marginTop: 14,
            border: "1px solid #ddd6fe",
            background: "#ffffff",
            borderRadius: 18,
            padding: "12px 14px",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 900, color: "#5b21b6", marginBottom: 8 }}>
            ✨ AI smart reply suggestions
          </div>

          {aiSuggestionsLoading ? (
            <div style={{ fontSize: 12, fontWeight: 800, color: "#6b21a8" }}>
              AI is reading the deal context...
            </div>
          ) : aiSuggestions.length > 0 ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {aiSuggestions.map((suggestion, index) => (
                <button
                  key={`${suggestion}-${index}`}
                  type="button"
                  onClick={() => useAiSuggestion(suggestion)}
                  title={onSendAiSuggestion ? "Click to send this AI suggestion" : "Click to copy this AI suggestion"}
                  style={{
                    border: "1px solid #c4b5fd",
                    background: "#fff",
                    color: "#4c1d95",
                    borderRadius: 12,
                    padding: "7px 10px",
                    fontSize: 12,
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12, fontWeight: 800, color: "#64748b" }}>
              {aiSuggestionsError || "AI suggestions will appear after deal messages are available."}
            </div>
          )}

          <div style={{ marginTop: 8, fontSize: 11, color: "#64748b", fontWeight: 700 }}>
            {onSendAiSuggestion
              ? "Click any suggestion to send it directly."
              : "Click any suggestion to copy it, then paste/send from the message box."}
          </div>
        </div>
      ) : null}
    </>
  );
}