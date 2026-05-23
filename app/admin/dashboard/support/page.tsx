"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ActionButton } from "@/components/ui/ActionButton";

type SupportTicket = {
  id: string;
  ticket_no: string;
  user_id: string;
  user_email: string | null;
  user_role: string | null;
  user_display_id: string | null;
  category: string;
  original_text: string;
  ai_drafted_text: string;
  status: string;
  priority: string;
  admin_reply: string | null;
  assigned_to: string | null;
  escalation_level: number | null;
  sla_deadline: string | null;
  waiting_for_user: boolean | null;
  ai_risk_flag: string | null;
  ai_issue_category: string | null;
  ai_urgency: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
};

function titleCase(value: string) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function fmtDate(value: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
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
  if (s === "waiting_user") return "Waiting for your response";
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
          borderRadius: 12,
          background: "#e5e7eb",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: "100%",
            borderRadius: 12,
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

function slaLabel(deadline: string | null) {
  if (!deadline) return "SLA not set";

  const end = new Date(deadline).getTime();
  const now = Date.now();

  if (Number.isNaN(end)) return "SLA invalid";

  const diff = end - now;

  if (diff <= 0) return "SLA breached";

  const hours = Math.ceil(diff / (1000 * 60 * 60));

  if (hours < 24) return `SLA due in ${hours}h`;

  return `SLA due in ${Math.ceil(hours / 24)}d`;
}

function slaColor(deadline: string | null) {
  if (!deadline) return "#64748b";

  const end = new Date(deadline).getTime();
  const now = Date.now();

  if (Number.isNaN(end)) return "#64748b";
  if (end <= now) return "#dc2626";
  if (end - now <= 1000 * 60 * 60 * 2) return "#f59e0b";

  return "#059669";
}

export default function AdminSupportPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<SupportTicket[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [liveNotice, setLiveNotice] = useState<string | null>(null);
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);
  const liveRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function loadTickets(silent = false) {
    if (!silent) setLoading(true);
    if (!silent) setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        router.replace("/login?next=/admin/dashboard/support");
        return;
      }

      const res = await fetch("/api/support/tickets", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: "no-store",
      });

      const json = await res.json();

      if (!res.ok || !json?.ok) {
        setError(json?.error || "Failed to load support tickets.");
        setRows([]);
        return;
      }

      if (!json.isAdmin) {
        setError("Admin access required.");
        setRows([]);
        return;
      }

      setRows(Array.isArray(json.rows) ? json.rows : []);
    } catch {
      setError("Failed to load support tickets.");
      setRows([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;

    function triggerLiveRefresh(message: string) {
      if (!mounted) return;

      setLiveNotice(message);

      if (liveRefreshTimerRef.current) {
        clearTimeout(liveRefreshTimerRef.current);
      }

      liveRefreshTimerRef.current = setTimeout(() => {
        loadTickets(true);
      }, 700);
    }

    loadTickets();

    const channel = supabase
      .channel("admin-support-desk-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_tickets" },
        () => {
          triggerLiveRefresh("Live support ticket update received.");
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_ticket_messages" },
        () => {
          triggerLiveRefresh("New support message received.");
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setRealtimeEnabled(true);
        }
      });

    return () => {
      mounted = false;

      if (liveRefreshTimerRef.current) {
        clearTimeout(liveRefreshTimerRef.current);
      }

      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredRows =
    statusFilter === "all"
      ? rows
      : rows.filter((row) => String(row.status).toLowerCase() === statusFilter);

  return (
    <main>
      <Container>
        <SectionHeader
          title="Admin Support Desk"
          subtitle="View written support tickets, user roles, ticket numbers and issue details."
        />

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
          <ActionButton href="/admin/dashboard" variant="secondary">
            ← Admin Dashboard
          </ActionButton>

          <button
            type="button"
            onClick={() => loadTickets()}
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

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              height: 40,
              padding: "0 12px",
              borderRadius: 12,
              border: "1px solid #d1d5db",
              background: "#fff",
              fontWeight: 900,
            }}
          >
            <option value="all">All Tickets</option>
            <option value="open">Open</option>
            <option value="in_review">In Review</option>
            <option value="waiting_user">Waiting for User</option>
            <option value="escalated">Escalated</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>

                <div
          style={{
            marginBottom: 12,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <Badge>
            {realtimeEnabled ? "🟢 Realtime Support Active" : "⚪ Realtime Connecting"}
          </Badge>

          {liveNotice ? <Badge>{liveNotice}</Badge> : null}
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

        <div style={{ marginBottom: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Badge>Total: {rows.length}</Badge>
          <Badge>Open: {rows.filter((r) => r.status === "open").length}</Badge>
          <Badge>
            In Review: {rows.filter((r) => r.status === "in_review").length}
          </Badge>
          <Badge>Waiting: {rows.filter((r) => r.status === "waiting_user").length}</Badge>
          <Badge>Escalated: {rows.filter((r) => r.status === "escalated").length}</Badge>
          <Badge>Resolved: {rows.filter((r) => r.status === "resolved").length}</Badge>
          <Badge>Closed: {rows.filter((r) => r.status === "closed").length}</Badge>
          <Badge>Urgent: {rows.filter((r) => r.priority === "urgent").length}</Badge>
          <Badge>SLA Breached: {rows.filter((r) => r.sla_deadline && new Date(r.sla_deadline).getTime() <= Date.now()).length}</Badge>
          <Badge>Risk: {rows.filter((r) => r.ai_risk_flag && r.ai_risk_flag !== "none").length}</Badge>
        </div>

        {loading ? (
          <Card>
            <CardBody>
              <div style={{ fontWeight: 900, color: "#475569" }}>
                Loading support tickets...
              </div>
            </CardBody>
          </Card>
        ) : null}

        {!loading && filteredRows.length === 0 ? (
          <Card>
            <CardBody>
              <div style={{ fontSize: 18, fontWeight: 950 }}>
                No support tickets found.
              </div>
              <div style={{ marginTop: 8, color: "#64748b", fontSize: 14 }}>
                Tickets submitted by users will appear here.
              </div>
            </CardBody>
          </Card>
        ) : null}

        {!loading && filteredRows.length > 0 ? (
          <div style={{ display: "grid", gap: 12 }}>
            {filteredRows.map((ticket) => (
              <Card key={ticket.id}>
                <CardBody>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 950 }}>
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
                        <Badge>Escalation: L{ticket.escalation_level ?? 0}</Badge>
                        <Badge>{slaLabel(ticket.sla_deadline)}</Badge>
                        {ticket.ai_risk_flag && ticket.ai_risk_flag !== "none" ? (
                          <Badge>Risk: {titleCase(ticket.ai_risk_flag)}</Badge>
                        ) : null}
                      </div>
                    </div>

                    <div
                      style={{
                        borderRadius: 12,
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
                      borderRadius: 12,
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
                      borderRadius: 12,
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

                  {ticket.admin_reply ? (
                    <div
                      style={{
                        marginTop: 12,
                        borderRadius: 12,
                        border: "1px solid #bbf7d0",
                        background: "#ecfdf5",
                        padding: 12,
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 950, color: "#065f46" }}>
                        Admin Reply
                      </div>
                      <div style={{ marginTop: 6, fontSize: 14, lineHeight: 1.6 }}>
                        {ticket.admin_reply}
                      </div>
                    </div>
                  ) : null}

                  <div
                    style={{
                      marginTop: 12,
                      display: "flex",
                      gap: 10,
                      flexWrap: "wrap",
                      color: "#64748b",
                      fontSize: 12,
                      fontWeight: 850,
                    }}
                  >
                                      <div
                    style={{
                      marginTop: 12,
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: 12,
                        padding: 10,
                        background: "#f8fafc",
                      }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 950, color: "#64748b" }}>
                        SLA Status
                      </div>
                      <div
                        style={{
                          marginTop: 5,
                          fontSize: 13,
                          fontWeight: 950,
                          color: slaColor(ticket.sla_deadline),
                        }}
                      >
                        {slaLabel(ticket.sla_deadline)}
                      </div>
                    </div>

                    <div
                      style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: 12,
                        padding: 10,
                        background: "#f8fafc",
                      }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 950, color: "#64748b" }}>
                        AI Issue Category
                      </div>
                      <div style={{ marginTop: 5, fontSize: 13, fontWeight: 950 }}>
                        {titleCase(ticket.ai_issue_category || ticket.category || "general")}
                      </div>
                    </div>

                    <div
                      style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: 12,
                        padding: 10,
                        background: "#f8fafc",
                      }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 950, color: "#64748b" }}>
                        AI Urgency
                      </div>
                      <div style={{ marginTop: 5, fontSize: 13, fontWeight: 950 }}>
                        {titleCase(ticket.ai_urgency || ticket.priority || "normal")}
                      </div>
                    </div>

                    <div
                      style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: 12,
                        padding: 10,
                        background: ticket.ai_risk_flag && ticket.ai_risk_flag !== "none" ? "#fef2f2" : "#f8fafc",
                      }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 950, color: "#64748b" }}>
                        AI Risk Flag
                      </div>
                      <div
                        style={{
                          marginTop: 5,
                          fontSize: 13,
                          fontWeight: 950,
                          color: ticket.ai_risk_flag && ticket.ai_risk_flag !== "none" ? "#dc2626" : "#334155",
                        }}
                      >
                        {titleCase(ticket.ai_risk_flag || "none")}
                      </div>
                    </div>
                  </div>

                    <span>User ID: {ticket.user_id}</span>
                    <span>Created: {fmtDate(ticket.created_at)}</span>
                    <span>Updated: {fmtDate(ticket.updated_at)}</span>
                    <span>Resolved: {fmtDate(ticket.resolved_at)}</span>
                  </div>

                  <div style={{ marginTop: 14 }}>
                    <ActionButton
                      href={`/admin/dashboard/support/${ticket.id}`}
                      variant="primary"
                    >
                      Open Thread / Reply →
                    </ActionButton>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        ) : null}
      </Container>
    </main>
  );
}