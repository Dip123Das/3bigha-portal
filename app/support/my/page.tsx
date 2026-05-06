"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
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
  original_text: string;
  ai_drafted_text: string;
  status: string;
  priority: string;
  admin_reply: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
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

export default function MySupportTicketsPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<SupportTicket[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function loadTickets() {
    setLoading(true);
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        router.replace("/login?next=/support/my");
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

  return (
    <main>
      <Container>
        <SectionHeader
          title="My Support Tickets"
          subtitle="Track your written complaints, ticket status and admin replies."
        />

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
          <ActionButton href="/support/new" variant="primary">
            Raise New Ticket →
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
                Loading support tickets...
              </div>
            </CardBody>
          </Card>
        ) : null}

        {!loading && rows.length === 0 ? (
          <Card>
            <CardBody>
              <div style={{ fontSize: 18, fontWeight: 950 }}>
                No support tickets yet.
              </div>
              <div style={{ marginTop: 8, color: "#64748b", fontSize: 14 }}>
                Raise a written ticket whenever you face a listing, login, buyer,
                vendor, RFQ, chat or technical issue.
              </div>

              <div style={{ marginTop: 14 }}>
                <ActionButton href="/support/new" variant="primary">
                  Create First Ticket →
                </ActionButton>
              </div>
            </CardBody>
          </Card>
        ) : null}

        {!loading && rows.length > 0 ? (
          <div style={{ display: "grid", gap: 12 }}>
            {rows.map((ticket) => (
              <Card key={ticket.id}>
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
                      <div style={{ fontSize: 18, fontWeight: 950, color: "#111827" }}>
                        {ticket.ticket_no}
                      </div>

                      <div
                        style={{
                          marginTop: 6,
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
                      Written Complaint
                    </div>
                    <div style={{ marginTop: 6, fontSize: 14, lineHeight: 1.6 }}>
                      {ticket.ai_drafted_text}
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
                      <div
                        style={{
                          marginTop: 6,
                          fontSize: 14,
                          lineHeight: 1.6,
                          color: "#064e3b",
                          fontWeight: 800,
                        }}
                      >
                        {ticket.admin_reply}
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        marginTop: 12,
                        borderRadius: 14,
                        border: "1px dashed #f59e0b",
                        background: "#fffbeb",
                        padding: 12,
                        color: "#92400e",
                        fontSize: 13,
                        fontWeight: 850,
                      }}
                    >
                      Admin reply is pending. Please wait and track this ticket number.
                    </div>
                  )}

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
                    <span>Created: {fmtDate(ticket.created_at)}</span>
                    <span>Updated: {fmtDate(ticket.updated_at)}</span>
                    <span>Resolved: {fmtDate(ticket.resolved_at)}</span>
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