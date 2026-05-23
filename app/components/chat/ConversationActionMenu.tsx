"use client";

import React from "react";

type MsgRow = {
  id: string;
  sender_user_id: string;
  sender_role: string;
  message_type: string;
  body: string;
  meta?: {
    deleted?: boolean;
    [key: string]: any;
  } | null;
  created_at: string | null;
};

export default function ConversationActionMenu(props: {
  actionMenu: {
    message: MsgRow;
    x: number;
    y: number;
  } | null;
  currentUserId: string;
  showReactionPicker: boolean;
  setShowReactionPicker: React.Dispatch<React.SetStateAction<boolean>>;
  startReply: (message: MsgRow) => void;
  closeActionMenu: () => void;
  startEditMessage: (message: MsgRow) => void;
  openDeleteConfirm: (message: MsgRow) => void;
  copyMessageText: (message: MsgRow) => Promise<void>;
  toggleReaction: (message: MsgRow, emoji: string) => Promise<void>;
  toDisplayRole: (role?: string | null) => string;
  REACTION_EMOJIS: string[];
}) {
  const {
    actionMenu,
    currentUserId,
    showReactionPicker,
    setShowReactionPicker,
    startReply,
    closeActionMenu,
    startEditMessage,
    openDeleteConfirm,
    copyMessageText,
    toggleReaction,
    toDisplayRole,
    REACTION_EMOJIS,
  } = props;

  if (!actionMenu) return null;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "sticky",
        top: actionMenu.y,
        left: actionMenu.x,
        zIndex: 1000,
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        boxShadow: "0 18px 40px rgba(0,0,0,0.14)",
        padding: 8,
        minWidth: 180,
      }}
    >
      <div
        style={{
          padding: "6px 12px 8px 12px",
          borderBottom: "1px solid #f1f5f9",
          marginBottom: 6,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 900,
            letterSpacing: 0.2,
            color:
              String(actionMenu.message.sender_user_id ?? "") === String(currentUserId)
                ? "#065f46"
                : "#475569",
            textTransform: "uppercase",
          }}
        >
          {String(actionMenu.message.sender_user_id ?? "") === String(currentUserId)
            ? "Your message"
            : `${toDisplayRole(actionMenu.message.sender_role)} message`}
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          startReply(actionMenu.message);
          closeActionMenu();
        }}
        style={{
          width: "100%",
          textAlign: "left",
          border: "none",
          background: "transparent",
          padding: "10px 12px",
          borderRadius: 10,
          cursor: "pointer",
          fontWeight: 700,
        }}
      >
        Reply
      </button>

      {String(actionMenu.message.sender_user_id ?? "") === String(currentUserId) &&
      !(actionMenu.message.meta?.deleted) ? (
        <React.Fragment>
          <button
            type="button"
            onClick={() => startEditMessage(actionMenu.message)}
            style={{
              width: "100%",
              textAlign: "left",
              border: "none",
              background: "transparent",
              padding: "10px 12px",
              borderRadius: 10,
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Edit
          </button>

          <button
            type="button"
            onClick={() => openDeleteConfirm(actionMenu.message)}
            style={{
              width: "100%",
              textAlign: "left",
              border: "none",
              background: "transparent",
              padding: "10px 12px",
              borderRadius: 10,
              cursor: "pointer",
              fontWeight: 700,
              color: "#b91c1c",
            }}
          >
            Delete
          </button>
        </React.Fragment>
      ) : null}

      <button
        type="button"
        onClick={() => copyMessageText(actionMenu.message)}
        style={{
          width: "100%",
          textAlign: "left",
          border: "none",
          background: "transparent",
          padding: "10px 12px",
          borderRadius: 10,
          cursor: "pointer",
          fontWeight: 700,
        }}
      >
        Copy
      </button>

      <button
        type="button"
        onClick={() => setShowReactionPicker((v) => !v)}
        style={{
          width: "100%",
          textAlign: "left",
          border: "none",
          background: "transparent",
          padding: "10px 12px",
          borderRadius: 10,
          cursor: "pointer",
          fontWeight: 700,
        }}
      >
        React
      </button>

      {showReactionPicker ? (
        <div
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            padding: "8px 12px 4px 12px",
          }}
        >
          {REACTION_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={async () => {
                await toggleReaction(actionMenu.message, emoji);
                closeActionMenu();
              }}
              style={{
                border: "1px solid #e5e7eb",
                background: "#fff",
                borderRadius: 12,
                padding: "6px 10px",
                cursor: "pointer",
                fontSize: 16,
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}