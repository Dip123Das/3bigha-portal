import { NextResponse } from "next/server";

import { requireMasterAdmin } from "@/lib/admin/requireMasterAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "private, no-store, max-age=0" };
const clean = (value: unknown) => String(value || "").trim();

export async function POST(request: Request) {
  const access = await requireMasterAdmin();

  if ("error" in access) {
    return NextResponse.json(
      { ok: false, error: access.error || "Master administrator access is required." },
      { status: Number(access.status || 403), headers }
    );
  }

  const body = await request.json().catch(() => ({}));
  const action = clean(body?.action);
  const caseId = clean(body?.caseId);
  const userId = clean(body?.userId);

  if (!action || !caseId || !userId) {
    return NextResponse.json(
      { ok: false, error: "Action, registration case, and member are required." },
      { status: 400, headers }
    );
  }

  try {
    const { data: existing, error: existingError } = await access.admin
      .from("registration_review_assignments")
      .select("*")
      .eq("case_id", caseId)
      .maybeSingle();

    if (existingError) throw existingError;
    const now = new Date().toISOString();

    if (action === "claim") {
      if (existing?.assigned_to && existing.assigned_to !== access.user.id && existing.status !== "released") {
        return NextResponse.json(
          { ok: false, error: "This review is already assigned to another reviewer." },
          { status: 409, headers }
        );
      }

      const next = {
        assigned_to: access.user.id,
        assigned_by: access.user.id,
        priority: existing?.priority || "normal",
        status: "in_progress",
        claimed_at: now,
        released_at: null,
        completed_at: null,
        last_activity_at: now,
        updated_at: now,
      };

      const { error } = await access.admin
        .from("registration_review_assignments")
        .upsert({ case_id: caseId, user_id: userId, ...next }, { onConflict: "case_id" });
      if (error) throw error;

      await access.admin.from("registration_review_activity").insert({
        case_id: caseId,
        user_id: userId,
        actor_id: access.user.id,
        action: "review_claimed",
        previous_value: existing || {},
        next_value: next,
      });

      return NextResponse.json({ ok: true }, { headers });
    }

    if (action === "release") {
      if (existing?.assigned_to && existing.assigned_to !== access.user.id) {
        return NextResponse.json(
          { ok: false, error: "Only the assigned reviewer can release this case." },
          { status: 403, headers }
        );
      }

      const next = {
        assigned_to: null,
        status: "released",
        released_at: now,
        last_activity_at: now,
        updated_at: now,
      };

      const { error } = await access.admin
        .from("registration_review_assignments")
        .upsert({
          case_id: caseId,
          user_id: userId,
          assigned_by: existing?.assigned_by || access.user.id,
          priority: existing?.priority || "normal",
          ...next,
        }, { onConflict: "case_id" });
      if (error) throw error;

      await access.admin.from("registration_review_activity").insert({
        case_id: caseId,
        user_id: userId,
        actor_id: access.user.id,
        action: "review_released",
        previous_value: existing || {},
        next_value: next,
      });

      return NextResponse.json({ ok: true }, { headers });
    }

    if (action === "priority") {
      const priority = clean(body?.priority);
      if (!["normal", "high", "critical"].includes(priority)) {
        return NextResponse.json(
          { ok: false, error: "A valid priority is required." },
          { status: 400, headers }
        );
      }

      const next = { priority, last_activity_at: now, updated_at: now };
      const { error } = await access.admin
        .from("registration_review_assignments")
        .upsert({
          case_id: caseId,
          user_id: userId,
          assigned_to: existing?.assigned_to || null,
          assigned_by: existing?.assigned_by || access.user.id,
          status: existing?.status || "open",
          ...next,
        }, { onConflict: "case_id" });
      if (error) throw error;

      await access.admin.from("registration_review_activity").insert({
        case_id: caseId,
        user_id: userId,
        actor_id: access.user.id,
        action: "priority_changed",
        previous_value: existing || {},
        next_value: next,
      });

      return NextResponse.json({ ok: true }, { headers });
    }

    if (action === "note") {
      const note = clean(body?.note);
      if (!note || note.length > 4000) {
        return NextResponse.json(
          { ok: false, error: "A note between 1 and 4000 characters is required." },
          { status: 400, headers }
        );
      }

      const { error } = await access.admin.from("registration_review_notes").insert({
        case_id: caseId,
        user_id: userId,
        author_id: access.user.id,
        note,
      });
      if (error) throw error;

      await access.admin.from("registration_review_assignments").upsert({
        case_id: caseId,
        user_id: userId,
        assigned_to: existing?.assigned_to || null,
        assigned_by: existing?.assigned_by || access.user.id,
        priority: existing?.priority || "normal",
        status: existing?.status || "open",
        last_activity_at: now,
        updated_at: now,
      }, { onConflict: "case_id" });

      await access.admin.from("registration_review_activity").insert({
        case_id: caseId,
        user_id: userId,
        actor_id: access.user.id,
        action: "review_note_added",
        previous_value: {},
        next_value: { noteLength: note.length },
      });

      return NextResponse.json({ ok: true }, { headers });
    }

    return NextResponse.json(
      { ok: false, error: "Unsupported workbench action." },
      { status: 400, headers }
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Reviewer workbench action failed." },
      { status: 500, headers }
    );
  }
}
