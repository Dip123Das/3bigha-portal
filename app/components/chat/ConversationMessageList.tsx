"use client";

import React from "react";

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
  } = props;

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
        text: "Seen",
        color: "#166534",
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
      };
    }

    return {
      text: "Sent",
      color: "#475569",
    };
  }

  return (
    <>
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
                    borderRadius: 999,
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
                      borderRadius: 999,
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
                    <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.45 }}>{m.body}</div>
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
                              borderRadius: 999,
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
                        borderRadius: 999,
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
                          fontWeight: 800,
                          color: deliveryState.color,
                        }}
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
    </>
  );
}