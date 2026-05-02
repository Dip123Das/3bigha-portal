"use client";

import React, { useEffect, useState } from "react";

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
  touchMyPresence?: () => Promise<void>;
  sendMessage: (messageOverride?: string, replyOverride?: MsgRow | null) => Promise<void>;
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
    touchMyPresence,
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

  const [lastTextAttempt, setLastTextAttempt] = useState("");
  const [retryText, setRetryText] = useState("");
  const [aiAssistLoading, setAiAssistLoading] = useState(false);
  const [aiAssistError, setAiAssistError] = useState("");
  const [showDealCloser, setShowDealCloser] = useState(false);
  const [showAutoPilotHint, setShowAutoPilotHint] = useState(false);
  const [showPaymentTrigger, setShowPaymentTrigger] = useState(false);

  useEffect(() => {
    if (err && lastTextAttempt) {
      setRetryText(lastTextAttempt);
      return;
    }

    if (!loading && !err) {
      setLastTextAttempt("");
      setRetryText("");
    }
  }, [err, loading, lastTextAttempt]);

  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    const t = String(text || "").toLowerCase();

    const hasPrice =
      /\d+/.test(t) ||
      t.includes("price") ||
      t.includes("rate") ||
      t.includes("final");

    const hasIntent =
      t.includes("confirm") ||
      t.includes("ok") ||
      t.includes("done") ||
      t.includes("deal");

    if (hasPrice && hasIntent) {
      setShowAutoPilotHint(true);
      setShowDealCloser(true);
      setShowPaymentTrigger(true);
    } else {
      setShowAutoPilotHint(false);
      setShowDealCloser(false);
      setShowPaymentTrigger(false);
    }
  }, [text]);

  useEffect(() => {
    setIsPremium(true); // TEMP: replace with real subscription later
  }, []);

  const handleSend = (messageOverride?: string) => {
    const candidateText =
      typeof messageOverride === "string" ? messageOverride : String(text ?? "");

    const trimmedText = candidateText.trim();
    const isTextOnlyAttempt =
      !!trimmedText && selectedFiles.length === 0 && !recordedAudioFile;

    if (isTextOnlyAttempt) {
      setLastTextAttempt(trimmedText);
    } else if (!loading && !err) {
      setLastTextAttempt("");
    }

    void sendMessage(messageOverride);
  };

  const handleRetryFailedText = () => {
    if (!retryText.trim() || loading) return;
    setLastTextAttempt(retryText.trim());
    void sendMessage(retryText.trim());
  };

  const applyAiDealSuggestion = (value: string) => {
    setText(value);
    void touchMyPresence?.();
    sendTypingStart();

    if (typingStopTimeoutRef.current) {
      clearTimeout(typingStopTimeoutRef.current);
    }

    typingStopTimeoutRef.current = setTimeout(() => {
      sendTypingStop();
    }, 1500);
  };

  const improveMessageWithAi = async () => {
    const rawText = String(text ?? "").trim();

    if (!rawText || loading || aiAssistLoading) {
      setAiAssistError("Type a message to let AI improve your negotiation.");
      return;
    }

    setAiAssistLoading(true);
    setAiAssistError("");

    try {
      const res = await fetch("/api/ai/deal-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: rawText,
          context: "negotiation",
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.message) {
        throw new Error(data?.error || "AI could not improve this message.");
      }

      applyAiDealSuggestion(String(data.message));
    } catch (error: any) {
      setAiAssistError(error?.message || "AI assistant is not available right now.");
    } finally {
      setAiAssistLoading(false);
    }
  };

  return (
    <div style={{ padding: 12, borderTop: "1px solid #e5e7eb", background: "#fff" }}>
      {showAutoPilotHint && (
        <div
          style={{
            marginBottom: 10,
            padding: 10,
            borderRadius: 10,
            background: "#ecfeff",
            border: "1px solid #67e8f9",
            fontWeight: 900,
            fontSize: 12,
            color: "#0e7490",
          }}
        >
          🤖 AI Suggestion: Buyer is ready. Push for final confirmation & payment.
        </div>
      )}
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

      <div
        style={{
          marginBottom: 10,
          border: "1px solid #c7d2fe",
          background: "linear-gradient(90deg, #eef2ff, #ffffff)",
          borderRadius: 14,
          padding: "10px 12px",
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 900, color: "#3730a3", marginBottom: 8 }}>
          ✨ AI Deal Assistant
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() =>
              applyAiDealSuggestion(
                "Please confirm the exact item, quantity, delivery location, final price and expected delivery time."
              )
            }
            disabled={loading}
            style={{
              padding: "7px 10px",
              borderRadius: 999,
              border: "1px solid #c7d2fe",
              background: "#fff",
              color: "#3730a3",
              fontSize: 12,
              fontWeight: 900,
              cursor: loading ? "default" : "pointer",
            }}
          >
            Ask full deal details
          </button>

          <button
            type="button"
            onClick={() =>
              applyAiDealSuggestion(
                "Your price seems slightly higher than expected. Could you offer a better rate or any discount for immediate confirmation?"
              )
            }
            disabled={loading}
            style={{
              padding: "7px 10px",
              borderRadius: 999,
              border: "1px solid #f59e0b",
              background: "#fff",
              color: "#92400e",
              fontSize: 12,
              fontWeight: 900,
              cursor: loading ? "default" : "pointer",
            }}
          >
            💰 Ask for discount
          </button>

          <button
            type="button"
            onClick={() =>
              applyAiDealSuggestion(
                "I am comparing multiple vendors. If you can give your best final rate now, I can confirm quickly."
              )
            }
            disabled={loading}
            style={{
              padding: "7px 10px",
              borderRadius: 999,
              border: "1px solid #0ea5e9",
              background: "#fff",
              color: "#075985",
              fontSize: 12,
              fontWeight: 900,
              cursor: loading ? "default" : "pointer",
            }}
          >
            📊 Compare vendors
          </button>

          <button
            type="button"
            onClick={() =>
              applyAiDealSuggestion(
                "If the price and delivery can be finalized today, I am ready to proceed immediately."
              )
            }
            disabled={loading}
            style={{
              padding: "7px 10px",
              borderRadius: 999,
              border: "1px solid #16a34a",
              background: "#fff",
              color: "#065f46",
              fontSize: 12,
              fontWeight: 900,
              cursor: loading ? "default" : "pointer",
            }}
          >
            ⚡ Create urgency
          </button>

          <button
            type="button"
            onClick={() =>
              applyAiDealSuggestion(
                "Please confirm your final best offer. If everything is aligned, I will close this deal right now."
              )
            }
            disabled={loading}
            style={{
              padding: "7px 10px",
              borderRadius: 999,
              border: "1px solid #7c3aed",
              background: "#fff",
              color: "#4c1d95",
              fontSize: 12,
              fontWeight: 900,
              cursor: loading ? "default" : "pointer",
            }}
          >
            🏁 Close deal fast
          </button>

          <button
            type="button"
            onClick={() =>
              applyAiDealSuggestion(
                "Thank you. Please share your best final rate, including delivery charges and any applicable taxes."
              )
            }
            disabled={loading}
            style={{
              padding: "7px 10px",
              borderRadius: 999,
              border: "1px solid #c7d2fe",
              background: "#fff",
              color: "#3730a3",
              fontSize: 12,
              fontWeight: 900,
              cursor: loading ? "default" : "pointer",
            }}
          >
            Negotiate better price
          </button>

          <button
            type="button"
            onClick={() =>
              applyAiDealSuggestion(
                "Before we proceed, please confirm your business name, location, availability, and whether you can provide proper bill or document if required."
              )
            }
            disabled={loading}
            style={{
              padding: "7px 10px",
              borderRadius: 999,
              border: "1px solid #c7d2fe",
              background: "#fff",
              color: "#3730a3",
              fontSize: 12,
              fontWeight: 900,
              cursor: loading ? "default" : "pointer",
            }}
          >
            Verify vendor trust
          </button>

          <button
            type="button"
            onClick={improveMessageWithAi}
            disabled={loading || aiAssistLoading}
            style={{
              padding: "7px 10px",
              borderRadius: 999,
              border: "1px solid #7c3aed",
              background: aiAssistLoading ? "#ede9fe" : "#7c3aed",
              color: aiAssistLoading ? "#5b21b6" : "#fff",
              fontSize: 12,
              fontWeight: 900,
              cursor: loading || aiAssistLoading ? "default" : "pointer",
            }}
          >
            {aiAssistLoading ? "AI improving..." : "✨ Improve typed message"}
          </button>

          {aiAssistError ? (
            <span style={{ fontSize: 12, fontWeight: 800, color: "#b91c1c" }}>
              {aiAssistError}
            </span>
          ) : null}
        </div>
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

      <div
        style={{
          marginBottom: 10,
          border: "1px solid #bbf7d0",
          background: "linear-gradient(90deg, #ecfdf5, #ffffff)",
          borderRadius: 14,
          padding: "10px 12px",
          display: "flex",
          gap: 10,
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontSize: 13, fontWeight: 900, color: "#065f46" }}>
            Ready to close this deal?
          </div>
          <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>
            Confirm item, quantity, location and final price in chat before payment.
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            handleSend(
              "I confirm that the item, quantity, location and final price are discussed. Please confirm from your side."
            )
          }
          disabled={loading}
          style={{
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid #047857",
            background: loading ? "#d1fae5" : "#059669",
            color: "#fff",
            fontSize: 12,
            fontWeight: 900,
            cursor: loading ? "default" : "pointer",
          }}
        >
          ✅ Confirm Deal Details
        </button>
      </div>

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

      {showDealCloser ? (
        <div
          style={{
            marginBottom: 10,
            border: "1px solid #fde68a",
            background: "linear-gradient(90deg, #fffbeb, #ffffff)",
            borderRadius: 14,
            padding: "10px 12px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 900, color: "#92400e" }}>
              ⚡ AI suggests closing this deal
            </div>
            <div style={{ fontSize: 12, color: "#475569" }}>
              You seem close to agreement. Confirm details and finalize.
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              handleSend(
                "I confirm that we have agreed on price, quantity and delivery. Please confirm so we can proceed."
              )
            }
            disabled={loading}
            style={{
              padding: "8px 12px",
              borderRadius: 10,
              border: "1px solid #f59e0b",
              background: "#f59e0b",
              color: "#fff",
              fontSize: 12,
              fontWeight: 900,
              cursor: loading ? "default" : "pointer",
            }}
          >
            🚀 Send Final Confirmation
          </button>
        </div>
      ) : null}

      {showPaymentTrigger ? (
        <div
          style={{
            marginBottom: 10,
            border: "1px solid #bbf7d0",
            background: "linear-gradient(90deg, #ecfdf5, #ffffff)",
            borderRadius: 14,
            padding: "10px 12px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 900, color: "#065f46" }}>
              💳 Ready for Payment
            </div>
            <div style={{ fontSize: 12, color: "#475569" }}>
              Deal looks finalized. Proceed to secure payment.
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              window.location.href = "/dashboard/subscription/boost";
            }}
            style={{
              padding: "8px 12px",
              borderRadius: 10,
              border: "1px solid #059669",
              background: "#059669",
              color: "#fff",
              fontSize: 12,
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            💳 Proceed to Payment
          </button>
        </div>
      ) : null}

        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            void touchMyPresence?.();
            sendTypingStart();

            if (typingStopTimeoutRef.current) {
              clearTimeout(typingStopTimeoutRef.current);
            }

            typingStopTimeoutRef.current = setTimeout(() => {
              sendTypingStop();
            }, 1500);
          }}
        onFocus={() => {
            setShowEmojiBox(false);
            void markConversationRead();
            void touchMyPresence?.();
          }}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          if (e.shiftKey) return;

          e.preventDefault();
          handleSend();
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
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
            minHeight: 22,
          }}
        >
          {err ? (
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                flexWrap: "wrap",
                border: "1px solid #fecaca",
                background: "#fef2f2",
                color: "#991b1b",
                borderRadius: 12,
                padding: "8px 10px",
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              <span>⚠ Message could not be sent.</span>
              <span style={{ fontWeight: 700, opacity: 0.85 }}>{err}</span>
            </div>
          ) : null}

          {err && retryText ? (
            <button
              type="button"
              onClick={handleRetryFailedText}
              disabled={loading}
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                border: "1px solid #dc2626",
                background: loading ? "#fecaca" : "#dc2626",
                color: "#fff",
                fontWeight: 900,
                cursor: loading ? "default" : "pointer",
                boxShadow: loading ? "none" : "0 4px 10px rgba(220,38,38,0.22)",
              }}
            >
              {loading ? "Retrying..." : "🔁 Retry sending"}
            </button>
          ) : null}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {isPremium ? (
            <button
              type="button"
              onClick={async () => {
                const currentText = String(text ?? "").trim();

                if (!currentText) {
                  alert("Write message first");
                  return;
                }

                const res = await fetch("/api/ai/deal-message", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ message: currentText }),
                });

                const data = await res.json();

                if (data?.message) {
                  handleSend(data.message);
                }
              }}
              disabled={loading}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid #facc15",
                background: "#f59e0b",
                color: "#fff",
                fontWeight: 900,
                cursor: loading ? "default" : "pointer",
              }}
            >
              ⚡ Auto AI Reply
            </button>
          ) : (
            <button
              type="button"
              onClick={() => alert("Upgrade to Gold to unlock Auto AI Reply")}
              disabled={loading}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid #d1d5db",
                background: "#f3f4f6",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              🔒 Auto AI Reply
            </button>
          )}

          <button
            type="button"
            onClick={() => handleSend("Hello, I am interested. Please share more details.")}
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
            onClick={() => handleSend()}
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