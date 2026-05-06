"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { ActionButton } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";

type SupportTicket = {
  id: string;
  ticket_no: string;
  user_id: string;
  user_email: string | null;
  user_role: string | null;
  user_display_id: string | null;
  category: string;
  status: string;
  priority: string;
  original_text: string;
  ai_drafted_text: string;
  admin_reply: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
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

type AiTicketSummary = {
  issue_summary: string;
  likely_category: string;
  urgency: string;
  risk_flag: string;
  suggested_next_action: string;
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
  if (s === "closed") return "#64748b";
  if (s === "in_review") return "#2563eb";
  if (s === "waiting_user") return "#7c3aed";
  if (s === "escalated") return "#dc2626";
  return "#f59e0b";
}

export default function AdminSupportTicketThreadPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const ticketId = String(params?.ticketId || "");

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [aiReplyLoading, setAiReplyLoading] = useState(false);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState<AiTicketSummary | null>(null);
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [replyText, setReplyText] = useState("");
  const [nextStatus, setNextStatus] = useState("in_review");
  const [error, setError] = useState<string | null>(null);

  async function loadThread() {
    setLoading(true);
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        router.replace(`/login?next=/admin/dashboard/support/${ticketId}`);
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

      if (!json.isAdmin) {
        setError("Admin access required.");
        return;
      }

      setTicket(json.ticket || null);
      setNextStatus(String(json.ticket?.status || "in_review"));
      setMessages(Array.isArray(json.messages) ? json.messages : []);
    } catch {
      setError("Failed to load support ticket.");
    } finally {
      setLoading(false);
    }
  }

    async function generateTicketSummaryWithAi() {
    setError(null);

    if (!ticket) {
      setError("Ticket details are not loaded yet.");
      return;
    }

    setAiSummaryLoading(true);

    try {
      const res = await fetch("/api/ai/support-ticket-summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ticket,
          messages,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json?.ok) {
        setError(json?.error || "AI could not generate ticket summary.");
        return;
      }

      setAiSummary(json.summary || null);
    } catch {
      setError("AI ticket summary failed.");
    } finally {
      setAiSummaryLoading(false);
    }
  }

    async function generateAdminReplyWithAi() {
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
          mode: "admin",
          ticket,
          messages,
          draftText: replyText,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json?.ok) {
        setError(json?.error || "AI could not generate admin reply.");
        return;
      }

      setReplyText(String(json.reply || ""));
    } catch {
      setError("AI admin reply generation failed.");
    } finally {
      setAiReplyLoading(false);
    }
  }

  async function sendAdminReply() {
    setError(null);

    if (!replyText.trim()) {
      setError("Please write an admin reply before sending.");
      return;
    }

    setSending(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        router.replace(`/login?next=/admin/dashboard/support/${ticketId}`);
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
          messageText: replyText,
          status: nextStatus,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json?.ok) {
        setError(json?.error || "Failed to send admin reply.");
        return;
      }

      setReplyText("");
      await loadThread();
    } catch {
      setError("Failed to send admin reply.");
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
          title="Admin Support Ticket Thread"
          subtitle="Reply to users in writing, update ticket status and maintain support history."
        />

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
          <ActionButton href="/admin/dashboard/support" variant="secondary">
            ← Support Desk
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
                Loading support ticket thread...
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
                      <Badge>{ticket.user_email || "No email"}</Badge>
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
                    AI-Drafted Written Complaint
                  </div>
                  <div style={{ marginTop: 6, fontSize: 14, lineHeight: 1.6 }}>
                    {ticket.ai_drafted_text}
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 12,
                    borderRadius: 14,
                    border: "1px solid #e5e7eb",
                    background: "#fff",
                    padding: 12,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 950, color: "#475569" }}>
                    Original User Words
                  </div>
                  <div style={{ marginTop: 6, fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>
                    {ticket.original_text}
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
                  <span>User ID: {ticket.user_id}</span>
                  <span>Created: {fmtDate(ticket.created_at)}</span>
                  <span>Updated: {fmtDate(ticket.updated_at)}</span>
                  <span>Resolved: {fmtDate(ticket.resolved_at)}</span>
                </div>
              </CardBody>
            </Card>

            <Card style={{ marginTop: 14 }}>
              <CardBody>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 950 }}>
                      🧠 AI Ticket Summary
                    </div>
                    <div style={{ marginTop: 4, color: "#64748b", fontSize: 13, fontWeight: 800 }}>
                      Generate a compact support intelligence summary for admin review.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={generateTicketSummaryWithAi}
                    disabled={aiSummaryLoading}
                    style={{
                      background: "#0f172a",
                      color: "#fff",
                      border: "none",
                      borderRadius: 12,
                      padding: "10px 14px",
                      fontWeight: 950,
                      cursor: aiSummaryLoading ? "default" : "pointer",
                      opacity: aiSummaryLoading ? 0.7 : 1,
                    }}
                  >
                    {aiSummaryLoading ? "Generating..." : "Generate AI Summary"}
                  </button>
                </div>

                {aiSummary ? (
                  <div
                    style={{
                      marginTop: 14,
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: 10,
                    }}
                  >
                    <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 10 }}>
                      <div style={{ fontSize: 11, fontWeight: 950, color: "#64748b" }}>
                        Issue Summary
                      </div>
                      <div style={{ marginTop: 5, fontSize: 13, fontWeight: 850 }}>
                        {aiSummary.issue_summary}
                      </div>
                    </div>

                    <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 10 }}>
                      <div style={{ fontSize: 11, fontWeight: 950, color: "#64748b" }}>
                        Category
                      </div>
                      <div style={{ marginTop: 5, fontSize: 13, fontWeight: 850 }}>
                        {titleCase(aiSummary.likely_category)}
                      </div>
                    </div>

                    <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 10 }}>
                      <div style={{ fontSize: 11, fontWeight: 950, color: "#64748b" }}>
                        Urgency
                      </div>
                      <div style={{ marginTop: 5, fontSize: 13, fontWeight: 850 }}>
                        {titleCase(aiSummary.urgency)}
                      </div>
                    </div>

                    <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 10 }}>
                      <div style={{ fontSize: 11, fontWeight: 950, color: "#64748b" }}>
                        Risk Flag
                      </div>
                      <div style={{ marginTop: 5, fontSize: 13, fontWeight: 850 }}>
                        {titleCase(aiSummary.risk_flag)}
                      </div>
                    </div>

                    <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 10 }}>
                      <div style={{ fontSize: 11, fontWeight: 950, color: "#64748b" }}>
                        Suggested Next Action
                      </div>
                      <div style={{ marginTop: 5, fontSize: 13, fontWeight: 850 }}>
                        {aiSummary.suggested_next_action}
                      </div>
                    </div>
                  </div>
                ) : null}
              </CardBody>
            </Card>

            <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
              <div style={{ fontSize: 18, fontWeight: 950 }}>
                Written Support Conversation
              </div>

              {messages.length === 0 ? (
                <Card>
                  <CardBody>
                    <div style={{ fontWeight: 850, color: "#64748b" }}>
                      No conversation replies yet. Send the first admin response below.
                    </div>
                  </CardBody>
                </Card>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      display: "flex",
                      justifyContent: m.is_admin_message ? "flex-end" : "flex-start",
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
                        {m.is_admin_message ? "Admin Support" : "User"} ·{" "}
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
                  Send Admin Written Reply
                </div>

                <div
                  style={{
                    marginTop: 6,
                    color: "#64748b",
                    fontSize: 13,
                    fontWeight: 800,
                  }}
                >
                  Keep support communication written. Update the ticket status when needed.
                </div>

                <label style={{ display: "block", marginTop: 10, fontWeight: 900 }}>
                  Ticket Status
                  <select
                    value={nextStatus}
                    onChange={(e) => setNextStatus(e.target.value)}
                    style={{
                      marginTop: 6,
                      width: "100%",
                      height: 42,
                      borderRadius: 12,
                      border: "1px solid #d1d5db",
                      padding: "0 10px",
                      fontWeight: 800,
                    }}
                  >
                    <option value="open">Open</option>
                    <option value="in_review">In Review</option>
                    <option value="waiting_user">Waiting for User</option>
                    <option value="escalated">Escalated</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </label>

                <button
                  type="button"
                  onClick={generateAdminReplyWithAi}
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
                  {aiReplyLoading ? "Generating..." : "✨ Generate Admin Reply with AI"}
                </button>

                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write admin reply..."
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
                  onClick={sendAdminReply}
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
                  {sending ? "Sending..." : "Send Reply & Update Status"}
                </button>
              </CardBody>
            </Card>
          </>
        ) : null}
      </Container>
    </main>
  );
}