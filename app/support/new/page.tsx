"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { ActionButton } from "@/components/ui/ActionButton";

type SupportGovernance = {
  ai_issue_category: string;
  ai_urgency: string;
  ai_risk_flag: string;
  escalation_level: number;
};

const categories = [
  { value: "general", label: "General Issue" },
  { value: "login", label: "Login / Account Issue" },
  { value: "listing", label: "Listing Issue" },
  { value: "buy_sell", label: "Buy / Sell Issue" },
  { value: "rfq", label: "RFQ / Quotation Issue" },
  { value: "chat", label: "Chat / Message Issue" },
  { value: "payment", label: "Payment Issue" },
  { value: "vendor", label: "Vendor Issue" },
  { value: "buyer", label: "Buyer Issue" },
  { value: "price", label: "Price / Market Rate Issue" },
  { value: "technical", label: "Technical Issue" },
];

export default function NewSupportTicketPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  const [category, setCategory] = useState("general");
  const [priority, setPriority] = useState("normal");
  const [roughIssue, setRoughIssue] = useState("");
  const [draftIssue, setDraftIssue] = useState("");
  const [governance, setGovernance] = useState<SupportGovernance | null>(null);

  const [userRole, setUserRole] = useState("user");
  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [ticketNo, setTicketNo] = useState<string | null>(null);

  React.useEffect(() => {
    async function loadUser() {
      setLoading(true);
      setError(null);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace("/login?next=/support/new");
        return;
      }

      setUserId(session.user.id);
      setUserEmail(session.user.email || "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("role,requested_role,is_vendor")
        .eq("id", session.user.id)
        .maybeSingle();

      const role = String(
        profile?.role ||
          profile?.requested_role ||
          (profile?.is_vendor ? "vendor" : "user")
      );

      setUserRole(role);
      setLoading(false);
    }

    loadUser();
  }, [router, supabase]);

  async function improveWithAi() {
    setError(null);

    if (!roughIssue.trim()) {
      setError("Please write a few words about your issue first.");
      return;
    }

    setAiLoading(true);

    try {
      const res = await fetch("/api/ai/support-issue-draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          issueText: roughIssue,
          role: userRole,
          userId,
          category,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json?.ok) {
        setError(json?.error || "AI could not improve the issue.");
        return;
      }

      setDraftIssue(String(json.draft || ""));

      if (json.governance) {
        setGovernance({
          ai_issue_category: String(json.governance.ai_issue_category || category),
          ai_urgency: String(json.governance.ai_urgency || priority),
          ai_risk_flag: String(json.governance.ai_risk_flag || "none"),
          escalation_level: Number(json.governance.escalation_level || 0),
        });
      }
    } catch {
      setError("AI support drafting failed.");
    } finally {
      setAiLoading(false);
    }
  }

  async function submitTicket() {
    setError(null);

    const finalText = draftIssue.trim() || roughIssue.trim();

    if (!roughIssue.trim()) {
      setError("Please write your issue before submitting.");
      return;
    }

    if (!finalText) {
      setError("Final complaint text is missing.");
      return;
    }

    setSubmitLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        router.replace("/login?next=/support/new");
        return;
      }

      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          category,
          priority,
          originalText: roughIssue,
          aiDraftedText: finalText,
          governance,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json?.ok) {
        setError(json?.error || "Failed to create support ticket.");
        return;
      }

      setTicketNo(json.ticketNo || json.ticket?.ticket_no || "Ticket created");
    } catch {
      setError("Support ticket submission failed.");
    } finally {
      setSubmitLoading(false);
    }
  }

  if (loading) {
    return (
      <main>
        <Container>
          <SectionHeader title="Support Ticket" subtitle="Loading your account..." />
        </Container>
      </main>
    );
  }

  if (ticketNo) {
    return (
      <main>
        <Container>
          <SectionHeader
            title="Support Ticket Created"
            subtitle="Your issue has been submitted in written form."
          />

          <Card>
            <CardBody>
              <div style={{ fontSize: 22, fontWeight: 950, color: "#065f46" }}>
                ✅ Ticket Generated
              </div>

              <div style={{ marginTop: 12, fontSize: 18, fontWeight: 950 }}>
                {ticketNo}
              </div>

              <div style={{ marginTop: 10, color: "#475569", fontSize: 14 }}>
                Please use this ticket number to track the status. Support will be handled in
                writing only. No phone call is required.
              </div>

              <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <ActionButton href="/support/my" variant="primary">
                  View My Tickets →
                </ActionButton>

                <ActionButton href="/dashboard" variant="secondary">
                  Back to Dashboard
                </ActionButton>
              </div>
            </CardBody>
          </Card>
        </Container>
      </main>
    );
  }

  return (
    <main>
      <Container>
        <SectionHeader
          title="Raise Written Support Ticket"
          subtitle="Write your issue. AI will help convert it into a proper complaint."
        />

        <Card>
          <CardBody>
            <div
              style={{
                border: "1px solid #dbeafe",
                background: "#eff6ff",
                borderRadius: 14,
                padding: 12,
                marginBottom: 14,
                fontSize: 13,
                color: "#1e3a8a",
                fontWeight: 850,
                lineHeight: 1.5,
              }}
            >
              Your role: <b>{userRole}</b> | User ID: <b>{userRole.toUpperCase()}-
              {userId.slice(0, 8)}</b> | Email: <b>{userEmail || "—"}</b>
              <br />
              All support communication must remain written. No phone call support.
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
                  fontWeight: 800,
                }}
              >
                {error}
              </div>
            ) : null}

            <div style={{ display: "grid", gap: 12 }}>
              <label style={{ fontWeight: 900 }}>
                Issue Category
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
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
                  {categories.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ fontWeight: 900 }}>
                Priority
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
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
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </label>

              <label style={{ fontWeight: 900 }}>
                Write your issue in simple words
                <textarea
                  value={roughIssue}
                  onChange={(e) => setRoughIssue(e.target.value)}
                  placeholder="Example: login failed, listing not showing, buyer issue, wrong price showing..."
                  rows={5}
                  style={{
                    marginTop: 6,
                    width: "100%",
                    borderRadius: 12,
                    border: "1px solid #d1d5db",
                    padding: 12,
                    fontWeight: 750,
                    resize: "vertical",
                  }}
                />
              </label>

              <button
                type="button"
                onClick={improveWithAi}
                disabled={aiLoading}
                style={{
                  background: "#2563eb",
                  color: "#fff",
                  border: "none",
                  borderRadius: 12,
                  padding: "10px 14px",
                  fontWeight: 950,
                  cursor: aiLoading ? "default" : "pointer",
                  opacity: aiLoading ? 0.7 : 1,
                }}
              >
                {aiLoading ? "Improving..." : "✨ Improve with AI"}
              </button>

              <label style={{ fontWeight: 900 }}>
                Final Written Complaint
                <textarea
                  value={draftIssue}
                  onChange={(e) => setDraftIssue(e.target.value)}
                  placeholder="AI improved complaint will appear here. You can also edit it before submitting."
                  rows={7}
                  style={{
                    marginTop: 6,
                    width: "100%",
                    borderRadius: 12,
                    border: "1px solid #d1d5db",
                    padding: 12,
                    fontWeight: 750,
                    resize: "vertical",
                  }}
                />
              </label>

              {governance ? (
                <div
                  style={{
                    border: "1px solid #e5e7eb",
                    background: "#f8fafc",
                    borderRadius: 14,
                    padding: 12,
                    fontSize: 13,
                    color: "#334155",
                    fontWeight: 850,
                    lineHeight: 1.6,
                  }}
                >
                  <div style={{ fontWeight: 950, marginBottom: 6 }}>
                    AI Support Classification
                  </div>
                  <div>Issue Type: {governance.ai_issue_category}</div>
                  <div>Urgency: {governance.ai_urgency}</div>
                  <div>Risk Flag: {governance.ai_risk_flag}</div>
                  <div>Escalation Level: L{governance.escalation_level}</div>
                </div>
              ) : null}

              <button
                type="button"
                onClick={submitTicket}
                disabled={submitLoading}
                style={{
                  background: "#059669",
                  color: "#fff",
                  border: "none",
                  borderRadius: 12,
                  padding: "11px 14px",
                  fontWeight: 950,
                  cursor: submitLoading ? "default" : "pointer",
                  opacity: submitLoading ? 0.7 : 1,
                }}
              >
                {submitLoading ? "Submitting..." : "Submit Written Ticket"}
              </button>
            </div>
          </CardBody>
        </Card>
      </Container>
    </main>
  );
}