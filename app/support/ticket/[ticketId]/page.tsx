"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import UniversalMediaUploader from "@/app/components/media/UniversalMediaUploader";
import type { UploadedMediaAsset } from "@/lib/media/media-config";
import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { ActionButton } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";

type SupportTicket = {
  id: string;
  ticket_no: string;
  user_role: string | null;
  user_display_id: string | null;
  category: string;
  status: string;
  priority: string;
  ai_drafted_text: string;
  admin_reply: string | null;
  created_at: string;
  updated_at: string;
};

type SupportMessage = {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_role: string | null;
  sender_email: string | null;
  message_text: string;
  is_admin_message: boolean;
  created_at: string;
};

function fmtDate(value: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function titleCase(value: string) {
  return String(value || "general")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusColor(status: string) {
  const s = String(status || "").toLowerCase();
  if (s === "resolved") return "#059669";
  if (s === "in_review") return "#2563eb";
  if (s === "rejected") return "#dc2626";
  return "#f59e0b";
}

function supportProgress(status: string) {
  const s = String(status || "").toLowerCase();

  if (s === "resolved" || s === "closed") return 100;
  if (s === "escalated") return 75;
  if (s === "waiting_user") return 55;
  if (s === "in_review") return 35;
  if (s === "open") return 10;

  return 0;
}

function supportProgressLabel(status: string) {
  const s = String(status || "").toLowerCase();

  if (s === "resolved") return "Complaint resolved";
  if (s === "closed") return "Complaint closed";
  if (s === "escalated") return "Escalated for priority review";
  if (s === "waiting_user") return "Waiting for user response";
  if (s === "in_review") return "Under admin review";
  if (s === "open") return "Complaint received";

  return "Status pending";
}

function ProgressBar({ status }: { status: string }) {
  const progress = supportProgress(status);
  const color = statusColor(status);

  return (
    <div style={{ marginTop: 12 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          fontSize: 12,
          fontWeight: 950,
          color: "#334155",
        }}
      >
        <span>Complaint Progress</span>
        <span>{progress}%</span>
      </div>

      <div
        style={{
          marginTop: 7,
          height: 10,
          borderRadius: 999,
          background: "#e5e7eb",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: "100%",
            borderRadius: 999,
            background: color,
            transition: "width 0.35s ease",
          }}
        />
      </div>

      <div
        style={{
          marginTop: 6,
          fontSize: 12,
          fontWeight: 850,
          color,
        }}
      >
        {supportProgressLabel(status)}
      </div>
    </div>
  );
}

export default function SupportTicketThreadPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const ticketId = String(params?.ticketId || "");

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [aiReplyLoading, setAiReplyLoading] = useState(false);
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [replyText, setReplyText] = useState("");
  const [mediaAssets, setMediaAssets] = useState<UploadedMediaAsset[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function loadThread() {
    setLoading(true);
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        router.replace(`/login?next=/support/ticket/${ticketId}`);
        return;
      }

      const res = await fetch(`/api/support/messages/${ticketId}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: "no-store",
      });

      const json = await res.json();

      if (!res.ok || !json?.ok) {
        setError(json?.error || "Failed to load support ticket.");
        return;
      }

      setTicket(json.ticket || null);
      setMessages(Array.isArray(json.messages) ? json.messages : []);
    } catch {
      setError("Failed to load support ticket.");
    } finally {
      setLoading(false);
    }
  }

    async function improveReplyWithAi() {
    setError(null);

    if (!ticket) {
      setError("Ticket details are not loaded yet.");
      return;
    }

    setAiReplyLoading(true);

    try {
      const res = await fetch("/api/ai/support-reply-suggestion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ticket,
          messages: [
            ...messages,
            replyText.trim()
              ? {
                  sender_role: "user",
                  message_text: replyText.trim(),
                  is_admin_message: false,
                }
              : null,
          ].filter(Boolean),
        }),
      });

      const json = await res.json();

      if (!res.ok || !json?.ok) {
        setError(json?.error || "AI could not improve the reply.");
        return;
      }

      setReplyText(String(json.reply || ""));
    } catch {
      setError("AI reply improvement failed.");
    } finally {
      setAiReplyLoading(false);
    }
  }

  async function sendReply() {
    setError(null);

    if (!replyText.trim() && mediaAssets.length === 0) {
      setError("Please write a reply or upload evidence before sending.");
      return;
    }

    const evidenceText = mediaAssets.length
      ? `\n\nUploaded evidence:\n${mediaAssets
          .map((asset, index) => `${index + 1}. ${asset.kind}: ${asset.url}`)
          .join("\n")}`
      : "";

    const finalMessageText = `${replyText.trim() || "Uploaded support evidence."}${evidenceText}`;

    setSending(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        router.replace(`/login?next=/support/ticket/${ticketId}`);
        return;
      }

      const res = await fetch("/api/support/reply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          ticketId,
          messageText: finalMessageText,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json?.ok) {
        setError(json?.error || "Failed to send reply.");
        return;
      }

      setReplyText("");
      setMediaAssets([]);
      await loadThread();
    } catch {
      setError("Failed to send reply.");
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    if (ticketId) loadThread();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  return (
    <main>
      <Container>
        <SectionHeader
          title="Support Ticket Conversation"
          subtitle="Continue written communication with the support team."
        />

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
          <ActionButton href="/support/my" variant="secondary">
            ← My Tickets
          </ActionButton>

          <button
            type="button"
            onClick={loadThread}
            style={{
              height: 40,
              padding: "0 14px",
              borderRadius: 12,
              border: "1px solid #d1d5db",
              background: "#fff",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Refresh
          </button>
        </div>

        {error ? (
          <div
            style={{
              marginBottom: 12,
              color: "#b91c1c",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 12,
              padding: 10,
              fontWeight: 850,
            }}
          >
            {error}
          </div>
        ) : null}

        {loading ? (
          <Card>
            <CardBody>
              <div style={{ fontWeight: 900, color: "#475569" }}>
                Loading ticket conversation...
              </div>
            </CardBody>
          </Card>
        ) : null}

        {!loading && ticket ? (
          <>
            <Card>
              <CardBody>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                    alignItems: "flex-start",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 950 }}>
                      {ticket.ticket_no}
                    </div>

                    <div
                      style={{
                        marginTop: 8,
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <Badge>{titleCase(ticket.category)}</Badge>
                      <Badge>Priority: {titleCase(ticket.priority)}</Badge>
                      <Badge>{ticket.user_display_id || ticket.user_role || "User"}</Badge>
                    </div>
                  </div>

                  <div
                    style={{
                      borderRadius: 999,
                      padding: "7px 11px",
                      color: "#fff",
                      background: statusColor(ticket.status),
                      fontWeight: 950,
                      fontSize: 12,
                    }}
                  >
                    {titleCase(ticket.status)}
                  </div>
                </div>

                <ProgressBar status={ticket.status} />

                <div
                  style={{
                    marginTop: 12,
                    borderRadius: 14,
                    border: "1px solid #e5e7eb",
                    background: "#f8fafc",
                    padding: 12,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 950, color: "#475569" }}>
                    Original Written Complaint
                  </div>
                  <div style={{ marginTop: 6, fontSize: 14, lineHeight: 1.6 }}>
                    {ticket.ai_drafted_text}
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 12,
                    color: "#64748b",
                    fontSize: 12,
                    fontWeight: 850,
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <span>Created: {fmtDate(ticket.created_at)}</span>
                  <span>Updated: {fmtDate(ticket.updated_at)}</span>
                </div>
              </CardBody>
            </Card>

            <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
              <div style={{ fontSize: 18, fontWeight: 950 }}>
                Written Conversation
              </div>

              {messages.length === 0 ? (
                <Card>
                  <CardBody>
                    <div style={{ fontWeight: 850, color: "#64748b" }}>
                      No replies yet. You may write an additional message below.
                    </div>
                  </CardBody>
                </Card>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      display: "flex",
                      justifyContent: m.is_admin_message ? "flex-start" : "flex-end",
                    }}
                  >
                    <div
                      style={{
                        maxWidth: 720,
                        borderRadius: 16,
                        padding: 12,
                        border: m.is_admin_message
                          ? "1px solid #bfdbfe"
                          : "1px solid #bbf7d0",
                        background: m.is_admin_message ? "#eff6ff" : "#ecfdf5",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 950,
                          color: m.is_admin_message ? "#1d4ed8" : "#047857",
                        }}
                      >
                        {m.is_admin_message ? "Admin Support" : "You"} ·{" "}
                        {titleCase(m.sender_role || "")}
                      </div>

                      <div style={{ marginTop: 6, fontSize: 14, lineHeight: 1.6 }}>
                        {m.message_text}
                      </div>

                      <div
                        style={{
                          marginTop: 8,
                          fontSize: 11,
                          color: "#64748b",
                          fontWeight: 800,
                        }}
                      >
                        {fmtDate(m.created_at)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <Card style={{ marginTop: 14 }}>
              <CardBody>
                <div style={{ fontSize: 16, fontWeight: 950 }}>
                  Add Written Reply
                </div>

                <div
                  style={{
                    marginTop: 6,
                    color: "#64748b",
                    fontSize: 13,
                    fontWeight: 800,
                  }}
                >
                  Keep all support communication written. No phone call is required.
                </div>

                <button
                  type="button"
                  onClick={improveReplyWithAi}
                  disabled={aiReplyLoading}
                  style={{
                    marginTop: 10,
                    background: "#7c3aed",
                    color: "#fff",
                    border: "none",
                    borderRadius: 12,
                    padding: "10px 14px",
                    fontWeight: 950,
                    cursor: aiReplyLoading ? "default" : "pointer",
                    opacity: aiReplyLoading ? 0.7 : 1,
                  }}
                >
                  {aiReplyLoading ? "Improving..." : "✨ Improve Reply with AI"}
                </button>

                <UniversalMediaUploader
                  module="support"
                  value={mediaAssets}
                  onChange={setMediaAssets}
                  label="Attach screenshots / photos / videos / PDF"
                  helperText="Upload screenshots, payment proof, listing issue photos, short videos, or PDF documents for this support conversation."
                  allowImages
                  allowVideos
                  allowDocuments
                  maxFiles={8}
                />

                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write your reply or additional issue detail..."
                  rows={5}
                  style={{
                    marginTop: 10,
                    width: "100%",
                    borderRadius: 12,
                    border: "1px solid #d1d5db",
                    padding: 12,
                    fontWeight: 750,
                    resize: "vertical",
                  }}
                />

                <button
                  type="button"
                  onClick={sendReply}
                  disabled={sending}
                  style={{
                    marginTop: 10,
                    background: "#2563eb",
                    color: "#fff",
                    border: "none",
                    borderRadius: 12,
                    padding: "10px 14px",
                    fontWeight: 950,
                    cursor: sending ? "default" : "pointer",
                    opacity: sending ? 0.7 : 1,
                  }}
                >
                  {sending ? "Sending..." : "Send Written Reply"}
                </button>
              </CardBody>
            </Card>
          </>
        ) : null}
      </Container>
    </main>
  );
}