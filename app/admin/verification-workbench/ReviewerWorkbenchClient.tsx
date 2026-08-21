"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Assignment = {
  caseId: string;
  userId: string;
  assignedTo: string | null;
  priority: "normal" | "high" | "critical";
  status: string;
};

export default function ReviewerWorkbenchClient({
  assignment,
  currentReviewerId,
}: {
  assignment: Assignment;
  currentReviewerId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState("");

  async function run(action: string, extra: Record<string, unknown> = {}) {
    setBusy(action);
    try {
      const response = await fetch("/api/admin/registration-workbench", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          caseId: assignment.caseId,
          userId: assignment.userId,
          ...extra,
        }),
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Reviewer workbench action failed.");
      }
      if (action === "note") setNote("");
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Reviewer workbench action failed.");
    } finally {
      setBusy("");
    }
  }

  const ownedByMe = assignment.assignedTo === currentReviewerId;

  return (
    <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {!assignment.assignedTo || assignment.status === "released" ? (
          <button type="button" disabled={Boolean(busy)} onClick={() => run("claim")}>
            {busy === "claim" ? "Claiming…" : "Claim review"}
          </button>
        ) : null}

        {ownedByMe ? (
          <button type="button" disabled={Boolean(busy)} onClick={() => run("release")}>
            {busy === "release" ? "Releasing…" : "Release"}
          </button>
        ) : null}

        <select
          value={assignment.priority}
          disabled={Boolean(busy)}
          onChange={(event) => run("priority", { priority: event.target.value })}
        >
          <option value="normal">Normal priority</option>
          <option value="high">High priority</option>
          <option value="critical">Critical priority</option>
        </select>
      </div>

      <textarea
        value={note}
        maxLength={4000}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Add an internal reviewer note"
        rows={3}
        style={{ width: "100%", resize: "vertical" }}
      />
      <button
        type="button"
        disabled={Boolean(busy) || !note.trim()}
        onClick={() => run("note", { note: note.trim() })}
      >
        {busy === "note" ? "Saving note…" : "Save internal note"}
      </button>
    </div>
  );
}
