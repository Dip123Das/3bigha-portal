"use client";

import { useEffect, useRef, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

export type MappingAiDraft = {
  sector_key: string;
  sector_title: string;
  nature_modules: string[];
  reason: string;
};

type Props = {
  identityKey: string;
  sectorKey: string;
  modulesValue: string;
  disabled: boolean;
  onApply: (draft: MappingAiDraft) => void;
};

export default function MappingAiAssistant(props: Props) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [draft, setDraft] = useState<MappingAiDraft | null>(null);
  const latest = useRef(props);
  latest.current = props;
  const controller = useRef<AbortController | null>(null);
  const sequence = useRef(0);

  useEffect(() => {
    controller.current?.abort();
    sequence.current++;
    setDraft(null);
    setMessage("");
    setBusy(false);
    return () => {
      controller.current?.abort();
      sequence.current++;
    };
  }, [props.identityKey, props.sectorKey, props.modulesValue, props.disabled]);

  async function suggest() {
    if (busy || props.disabled || !props.identityKey) return;
    const snapshot = { ...props };
    const ticket = ++sequence.current;
    const abort = new AbortController();
    controller.current?.abort();
    controller.current = abort;

    const isCurrent = () =>
      ticket === sequence.current &&
      !latest.current.disabled &&
      latest.current.identityKey === snapshot.identityKey &&
      latest.current.sectorKey === snapshot.sectorKey &&
      latest.current.modulesValue === snapshot.modulesValue;

    setBusy(true);
    setDraft(null);
    setMessage("Preparing a mapping recommendation…");
    const timeout = window.setTimeout(() => abort.abort(), 60000);

    try {
      const { data } = await getSupabaseBrowser().auth.getSession();
      if (!data.session) throw new Error("Please sign in again to use AI.");
      if (!isCurrent()) return;

      const response = await fetch("/api/admin/mapping-suggestions", {
        method: "POST",
        credentials: "same-origin",
        signal: abort.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + data.session.access_token,
        },
        body: JSON.stringify({
          identityKey: snapshot.identityKey,
          sectorKey: snapshot.sectorKey,
        }),
      });

      const result = await response.json();
      if (!isCurrent()) return;
      if (!response.ok) throw new Error(result.error || "AI request failed.");
      if (result.needs_clarification) {
        setMessage("AI needs clarification: " + result.question);
        return;
      }
      if (!result.draft) throw new Error("AI returned no recommendation.");

      setDraft(result.draft);
      setMessage("Review this recommendation. Nothing has been changed or saved.");
    } catch (error) {
      if (!isCurrent()) return;
      setMessage(abort.signal.aborted
        ? "AI took too long. Retry or continue manually."
        : error instanceof Error ? error.message : "AI is unavailable.");
    } finally {
      window.clearTimeout(timeout);
      if (isCurrent()) setBusy(false);
    }
  }

  function apply() {
    if (!draft || busy || props.disabled) return;
    if ((props.sectorKey || props.modulesValue.trim()) &&
        !window.confirm(
          "Replace the sector and marketplace activities in this form with the reviewed AI suggestion? Display order and Active status will remain unchanged."
        )) return;

    props.onApply(draft);
    setDraft(null);
  }

  return (
    <aside style={{
      margin: "14px 0",
      padding: 16,
      border: "1px solid #93c5fd",
      borderRadius: 12,
      background: "#eff6ff",
      color: "#172033",
      lineHeight: 1.6,
    }}>
      <strong>AI mapping assistant</strong>
      <p style={{ margin: "6px 0 12px" }}>
        Choose a business identity first. Optionally choose a sector to limit
        the recommendation. AI cannot change this form until you apply its suggestion.
      </p>
      <button type="button" disabled={busy || props.disabled || !props.identityKey}
        onClick={() => void suggest()}>
        {busy ? "Preparing suggestion…" : "Suggest mapping"}
      </button>
      <div role="status" aria-live="polite" style={{ marginTop: 10 }}>
        {message}
      </div>
      {draft && (
        <div style={{ marginTop: 12 }}>
          <div><strong>Suggested sector:</strong> {draft.sector_title}</div>
          <div><strong>Marketplace activities:</strong> {draft.nature_modules.join(", ")}</div>
          <p style={{ margin: "8px 0" }}>{draft.reason}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <button type="button" disabled={busy || props.disabled} onClick={apply}>
              Apply suggestion to form
            </button>
            <button type="button" onClick={() => {
              setDraft(null);
              setMessage("Suggestion dismissed. Your form was not changed.");
            }}>
              Dismiss
            </button>
          </div>
          <small>Applying only fills the form. Review it, then use Add mapping to save.</small>
        </div>
      )}
    </aside>
  );
}
