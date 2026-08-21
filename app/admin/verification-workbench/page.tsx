import Link from "next/link";
import { redirect } from "next/navigation";

import { requireMasterAdmin } from "@/lib/admin/requireMasterAdmin";
import ReviewerWorkbenchClient from "./ReviewerWorkbenchClient";

export const dynamic = "force-dynamic";

function ageHours(value: unknown) {
  const time = new Date(String(value || "")).getTime();
  return Number.isFinite(time)
    ? Math.max(0, Math.floor((Date.now() - time) / 3_600_000))
    : 0;
}

function priorityRank(value: unknown) {
  if (value === "critical") return 3;
  if (value === "high") return 2;
  return 1;
}

export default async function VerificationWorkbenchPage({
  searchParams,
}: {
  searchParams?: { view?: string };
}) {
  const access = await requireMasterAdmin();

  if ("error" in access) {
    if (access.status === 401) {
      redirect("/login?next=/admin/verification-workbench");
    }
    return <main style={{ padding: 24 }}>Access denied</main>;
  }

  const [casesRes, assignmentsRes, profilesRes, notesRes] = await Promise.all([
    access.admin
      .from("registration_verification_cases")
      .select("id,user_id,status,confidence,created_at")
      .order("created_at", { ascending: false })
      .limit(1000),
    access.admin.from("registration_review_assignments").select("*").limit(2000),
    access.admin.from("profiles").select("id,full_name,email").limit(5000),
    access.admin
      .from("registration_review_notes")
      .select("id,case_id,author_id,note,created_at")
      .order("created_at", { ascending: false })
      .limit(2000),
  ]);

  const loadError = casesRes.error || assignmentsRes.error || profilesRes.error || notesRes.error;
  if (loadError) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Reviewer Workbench</h1>
        <pre>{loadError.message}</pre>
      </main>
    );
  }

  const closed = new Set(["auto_verified", "admin_verified", "restricted", "rejected"]);
  const latestByUser = new Map<string, any>();
  for (const item of casesRes.data || []) {
    if (!latestByUser.has(item.user_id)) latestByUser.set(item.user_id, item);
  }

  const assignmentMap = new Map((assignmentsRes.data || []).map((item: any) => [item.case_id, item]));
  const profileMap = new Map((profilesRes.data || []).map((item: any) => [item.id, item]));
  const noteMap = new Map<string, any[]>();
  for (const note of notesRes.data || []) {
    const list = noteMap.get(note.case_id) || [];
    list.push(note);
    noteMap.set(note.case_id, list);
  }

  const view = searchParams?.view || "all";
  const rows = [...latestByUser.values()]
    .filter((item: any) => !closed.has(item.status))
    .map((item: any) => {
      const assignment = assignmentMap.get(item.id) || {};
      return {
        ...item,
        assignment: {
          caseId: item.id,
          userId: item.user_id,
          assignedTo: assignment.assigned_to || null,
          priority: assignment.priority || "normal",
          status: assignment.status || "open",
        },
        reviewer: profileMap.get(assignment.assigned_to) || null,
        notes: noteMap.get(item.id) || [],
      };
    })
    .filter((item: any) => {
      if (view === "mine") return item.assignment.assignedTo === access.user.id;
      if (view === "unassigned") return !item.assignment.assignedTo;
      return true;
    })
    .sort((left: any, right: any) => {
      const priorityDifference = priorityRank(right.assignment.priority) - priorityRank(left.assignment.priority);
      return priorityDifference || ageHours(right.created_at) - ageHours(left.created_at);
    });

  return (
    <main style={{ padding: 24, width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ color: "#0f766e", fontWeight: 950, fontSize: 12 }}>REG-OPS-03</div>
          <h1 style={{ margin: "5px 0 6px" }}>Reviewer Workbench</h1>
          <p style={{ margin: 0, color: "#475569" }}>
            Claim reviews, manage priority, record internal notes, and keep ownership visible.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/admin/verification-workbench?view=all">Team queue</Link>
          <Link href="/admin/verification-workbench?view=mine">My queue</Link>
          <Link href="/admin/verification-workbench?view=unassigned">Unassigned</Link>
          <Link href="/admin/verification-operations">Operations</Link>
        </div>
      </div>

      <div style={{ display: "grid", gap: 14, marginTop: 20 }}>
        {rows.map((item: any) => (
          <article
            key={item.id}
            style={{
              padding: 16,
              border:
                item.assignment.priority === "critical"
                  ? "1px solid #fecaca"
                  : item.assignment.priority === "high"
                    ? "1px solid #fde68a"
                    : "1px solid #cbd5e1",
              borderRadius: 14,
              background: "white",
            }}
          >
            <strong>{String(item.status || "").replaceAll("_", " ")}</strong>
            <div style={{ marginTop: 5, color: "#475569" }}>
              Age: {ageHours(item.created_at)}h · Priority: {item.assignment.priority} · Owner: {item.reviewer?.full_name || item.reviewer?.email || "Unassigned"}
            </div>
            <Link
              href={`/admin/verification-reviews?case=${encodeURIComponent(item.id)}`}
              style={{ display: "inline-block", marginTop: 8 }}
            >
              Open registration review
            </Link>

            <ReviewerWorkbenchClient
              assignment={item.assignment}
              currentReviewerId={access.user.id}
            />

            {item.notes.length ? (
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid #e2e8f0" }}>
                <strong>Recent notes</strong>
                <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                  {item.notes.slice(0, 3).map((note: any) => {
                    const author = profileMap.get(note.author_id);
                    return (
                      <div key={note.id} style={{ padding: 10, border: "1px solid #e2e8f0", borderRadius: 9, background: "#f8fafc" }}>
                        <div>{note.note}</div>
                        <div style={{ marginTop: 4, color: "#64748b", fontSize: 12 }}>
                          {author?.full_name || author?.email || "Administrator"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </article>
        ))}

        {!rows.length ? (
          <div style={{ padding: 16, border: "1px solid #bbf7d0", borderRadius: 12, background: "#f0fdf4", color: "#166534", fontWeight: 850 }}>
            No registration is currently in this queue.
          </div>
        ) : null}
      </div>
    </main>
  );
}
