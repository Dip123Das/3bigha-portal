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
    [key: string]: any;
  } | null;
  created_at: string | null;
};

export default function ConversationComposer(props: {
  QUICK_REPLIES: string[];
  COMPOSER_EMOJIS: string[];
  MAX_FILES: number;
  text: string;
  setText: React.Dispatch<React.SetStateAction<string>>;
  showEmojiBox: boolean;
  setShowEmojiBox: React.Dispatch<React.SetStateAction<boolean>>;
  replyingTo: MsgRow | null;
  getReplyPreviewSender: (message?: MsgRow | null) => string;
  getReplyPreviewText: (message?: MsgRow | null) => string;
  cancelReply: () => void;
  insertEmoji: (emoji: string) => void;
  sendTypingStart: () => void;
  sendTypingStop: () => void;
  typingStopTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  markConversationRead: () => Promise<void>;
  sendMessage: (messageOverride?: string) => Promise<void>;
  loading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onPickFiles: (files: FileList | null) => void;
  isRecording: boolean;
  handleMicClick: () => void;
  handleMicPressStart: () => void;
  handleMicPressEnd: () => void;
  clearSelectedFiles: () => void;
  selectedFiles: File[];
  recordedAudioFile: File | null;
  recordedAudioPreviewUrl: string;
  clearRecordedAudio: () => void;
  selectedFilePreviewUrls: Record<string, string>;
  removeSelectedFile: (index: number) => void;
  formatBytes: (bytes?: number) => string;
  err: string;
  applyQuickReply: (value: string) => void;
}) {
  const {
    QUICK_REPLIES,
    COMPOSER_EMOJIS,
    MAX_FILES,
    text,
    setText,
    showEmojiBox,
    setShowEmojiBox,
    replyingTo,
    getReplyPreviewSender,
    getReplyPreviewText,
    cancelReply,
    insertEmoji,
    sendTypingStart,
    sendTypingStop,
    typingStopTimeoutRef,
    markConversationRead,
    sendMessage,
    loading,
    fileInputRef,
    onPickFiles,
    isRecording,
    handleMicClick,
    handleMicPressStart,
    handleMicPressEnd,
    clearSelectedFiles,
    selectedFiles,
    recordedAudioFile,
    recordedAudioPreviewUrl,
    clearRecordedAudio,
    selectedFilePreviewUrls,
    removeSelectedFile,
    formatBytes,
    err,
    applyQuickReply,
  } = props;

  return (
    <div style={{ padding: 12, borderTop: "1px solid #e5e7eb", background: "#fff" }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        {QUICK_REPLIES.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => applyQuickReply(q)}
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              border: "1px solid #d1d5db",
              background: "#fff",
              fontSize: 12,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            {q}
          </button>
        ))}
      </div>

      {replyingTo ? (
        <div
          style={{
            marginBottom: 10,
            border: "1px solid #dbeafe",
            background: "#eff6ff",
            borderRadius: 12,
            padding: 10,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: "#1d4ed8", marginBottom: 4 }}>
              Replying to {getReplyPreviewSender(replyingTo)}
            </div>
            <div
              style={{
                fontSize: 13,
                color: "#1f2937",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: 520,
              }}
            >
              {getReplyPreviewText(replyingTo)}
            </div>
          </div>

          <button
            type="button"
            onClick={cancelReply}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              fontWeight: 900,
              fontSize: 16,
              lineHeight: 1,
              color: "#334155",
            }}
            title="Cancel reply"
          >
            ×
          </button>
        </div>
      ) : null}

      <div style={{ marginBottom: 10, position: "relative" }}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowEmojiBox((v) => !v);
          }}
          style={{
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid #d1d5db",
            background: "#fff",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          😊 Emoji
        </button>

        {showEmojiBox ? (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute",
              top: "44px",
              left: 0,
              zIndex: 20,
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
              padding: 10,
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: 8,
              minWidth: 220,
            }}
          >
            {COMPOSER_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => insertEmoji(emoji)}
                style={{
                  border: "none",
                  background: "#fff",
                  cursor: "pointer",
                  fontSize: 22,
                  lineHeight: 1.2,
                  padding: 6,
                  borderRadius: 8,
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <textarea
        value={text}
        onChange={(e) => {
          const nextValue = e.target.value;
          setText(nextValue);

          if (nextValue.trim()) {
            sendTypingStart();
          } else {
            sendTypingStop();
          }

          if (typingStopTimeoutRef.current) {
            clearTimeout(typingStopTimeoutRef.current);
          }

          typingStopTimeoutRef.current = setTimeout(() => {
            sendTypingStop();
          }, 1200);
        }}
        onFocus={() => {
          setShowEmojiBox(false);
          if (!String(text ?? "").trim()) {
            sendTypingStop();
          }
          void markConversationRead();
        }}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          if (e.shiftKey) return;

          e.preventDefault();
          void sendMessage();
        }}
        placeholder="Type your message..."
        rows={4}
        style={{
          width: "100%",
          padding: 12,
          borderRadius: 14,
          border: "1px solid #d1d5db",
          resize: "vertical",
          outline: "none",
        }}
      />

      <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={(e) => onPickFiles(e.target.files)}
          style={{ display: "none" }}
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={loading || isRecording}
          style={{
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid #d1d5db",
            background: "#fff",
            fontWeight: 800,
            cursor: loading || isRecording ? "default" : "pointer",
          }}
        >
          📎 Attach File / Image
        </button>

        <button
          type="button"
          onClick={handleMicClick}
          onMouseDown={handleMicPressStart}
          onMouseUp={handleMicPressEnd}
          onMouseLeave={handleMicPressEnd}
          onTouchStart={handleMicPressStart}
          onTouchEnd={handleMicPressEnd}
          disabled={loading}
          style={{
            padding: "8px 12px",
            borderRadius: 10,
            border: isRecording ? "1px solid #fecaca" : "1px solid #d1d5db",
            background: isRecording ? "#fff1f2" : "#fff",
            color: isRecording ? "#b91c1c" : "#111827",
            fontWeight: 800,
            cursor: loading ? "default" : "pointer",
          }}
          title="Tap to start/stop. Hold to record and release to stop."
        >
          {isRecording ? "⏺ Recording..." : "🎤 Voice"}
        </button>

        {selectedFiles.length > 0 ? (
          <button
            type="button"
            onClick={clearSelectedFiles}
            disabled={loading}
            style={{
              padding: "8px 12px",
              borderRadius: 10,
              border: "1px solid #fecaca",
              background: "#fff1f2",
              color: "#9f1239",
              fontWeight: 800,
              cursor: loading ? "default" : "pointer",
            }}
          >
            Clear Attachments
          </button>
        ) : null}

        <div style={{ fontSize: 12, opacity: 0.7 }}>
          Max {MAX_FILES} files, 10 MB each
        </div>
      </div>

      {recordedAudioPreviewUrl ? (
        <div
          style={{
            marginTop: 10,
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 10,
            background: "#f9fafb",
          }}
        >
          <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 8 }}>
            Voice Message Preview
          </div>

          <audio controls src={recordedAudioPreviewUrl} style={{ width: "100%" }} />

          <div style={{ marginTop: 10 }}>
            <button
              type="button"
              onClick={clearRecordedAudio}
              disabled={loading}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: "1px solid #fecaca",
                background: "#fff1f2",
                color: "#9f1239",
                fontWeight: 800,
                cursor: loading ? "default" : "pointer",
              }}
            >
              Remove Voice
            </button>
          </div>
        </div>
      ) : null}

      {selectedFiles.length > 0 ? (
        <div
          style={{
            marginTop: 10,
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 10,
            background: "#f9fafb",
          }}
        >
          <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 8 }}>
            Selected Attachments ({selectedFiles.length})
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            {selectedFiles.map((file, index) => {
              const previewKey = `${file.name}-${file.size}-${file.lastModified}`;
              const previewUrl = selectedFilePreviewUrls[previewKey] || "";

              return (
                <div
                  key={`${file.name}-${file.size}-${index}`}
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                    justifyContent: "space-between",
                    border: "1px solid #e5e7eb",
                    borderRadius: 10,
                    padding: 8,
                    background: "#fff",
                  }}
                >
                  <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt={file.name}
                        style={{
                          width: 52,
                          height: 52,
                          objectFit: "cover",
                          borderRadius: 8,
                          border: "1px solid #d1d5db",
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: 8,
                          border: "1px solid #d1d5db",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "#f3f4f6",
                          flexShrink: 0,
                          fontSize: 20,
                        }}
                      >
                        📄
                      </div>
                    )}

                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 800,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          maxWidth: 260,
                        }}
                      >
                        {file.name}
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.72 }}>
                        {file.type || "Unknown type"} • {formatBytes(file.size)}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeSelectedFile(index)}
                    disabled={loading}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: "1px solid #fecaca",
                      background: "#fff1f2",
                      color: "#9f1239",
                      fontWeight: 800,
                      cursor: loading ? "default" : "pointer",
                      flexShrink: 0,
                    }}
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div
        style={{
          marginTop: 10,
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div style={{ color: "crimson", fontSize: 13 }}>{err}</div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => sendMessage("Hello")}
            disabled={loading}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid #d1d5db",
              background: "#fff",
              fontWeight: 900,
              cursor: loading ? "default" : "pointer",
            }}
          >
            Quick Hello
          </button>

          <button
            type="button"
            onClick={() => sendMessage()}
            disabled={loading}
            style={{
              padding: "10px 16px",
              borderRadius: 12,
              border: "1px solid #bbf7d0",
              background: "#ecfdf5",
              color: "#065f46",
              fontWeight: 900,
              cursor: loading ? "default" : "pointer",
            }}
          >
            {loading
              ? "Sending..."
              : selectedFiles.length > 0 || recordedAudioFile
              ? "Send Message + Media"
              : "Send Message"}
          </button>
        </div>
      </div>
    </div>
  );
}