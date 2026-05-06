"use client";

import React, { useEffect, useMemo, useState } from "react";
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

export default function AdminSupportPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<SupportTicket[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");

  async function loadTickets() {
    setLoading(true);
    setError(null);

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
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTickets();
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
            onClick={loadTickets}
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

                  {ticket.admin_reply ? (
                    <div
                      style={{
                        marginTop: 12,
                        borderRadius: 14,
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