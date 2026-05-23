"use client";

import React from "react";

export default function ConversationDeleteConfirm(props: {
  deleteConfirmMessage: {
    id: string;
    body: string;
  } | null;
  closeDeleteConfirm: () => void;
  deleteMessageForEveryone: (messageId: string) => Promise<void>;
}) {
  const { deleteConfirmMessage, closeDeleteConfirm, deleteMessageForEveryone } = props;

  if (!deleteConfirmMessage) return null;

  return (
    <div
      onClick={closeDeleteConfirm}
      style={{
        position: "sticky",
        inset: 0,
        background: "rgba(0,0,0,0.28)",
        zIndex: 1100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 12,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 360,
          background: "#fff",
          borderRadius: 12,
          boxShadow: "0 2px 6px rgba(15,23,42,0.04)",
          border: "1px solid #e5e7eb",
          padding: 12,
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 900 }}>
          Delete message?
        </div>

        <div
          style={{
            marginTop: 8,
            fontSize: 13,
            lineHeight: 1.5,
            color: "#4b5563",
          }}
        >
          This will delete the message for everyone.
        </div>

        <div
          style={{
            marginTop: 14,
            padding: "10px 12px",
            borderRadius: 10,
            background: "#f9fafb",
            border: "1px solid #e5e7eb",
            fontSize: 13,
            maxHeight: 100,
            overflow: "auto",
          }}
        >
          {String(deleteConfirmMessage.body ?? "").trim() || "Attachment / message"}
        </div>

        <div
          style={{
            marginTop: 16,
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
          }}
        >
          <button
            type="button"
            onClick={closeDeleteConfirm}
            style={{
              padding: "9px 12px",
              borderRadius: 10,
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
            onClick={() => deleteMessageForEveryone(deleteConfirmMessage.id)}
            style={{
              padding: "9px 12px",
              borderRadius: 10,
              border: "1px solid #fecaca",
              background: "#fff1f2",
              color: "#b91c1c",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Delete for everyone
          </button>
        </div>
      </div>
    </div>
  );
}