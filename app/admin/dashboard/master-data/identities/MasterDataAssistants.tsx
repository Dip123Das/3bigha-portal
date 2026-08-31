"use client";

import { useEffect, useRef, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

type Props = {
  kind: string;
  context: Record<string, string>;
  currentValue: string;
  disabled: boolean;
  onApply: (description: string) => void;
};

export default function MasterDescriptionAi(props: Props) {
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const controller = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  const fingerprint = JSON.stringify([
    props.kind, props.context, props.currentValue, props.disabled,
  ]);
  const latest = useRef(fingerprint);
  latest.current = fingerprint;

  useEffect(() => {
    controller.current?.abort();
    sequence.current++;
    setBusy(false);
    setDraft(null);
    setMessage("");
    return () => {
      controller.current?.abort();
      sequence.current++;
    };
  }, [fingerprint]);

  async function generate() {
    if (busy || props.disabled) return;
    const snapshot = fingerprint;
    const ticket = ++sequence.current;
    const abort = new AbortController();
    controller.current?.abort();
    controller.current = abort;
    const isCurrent = () => ticket === sequence.current && latest.current === snapshot;

    setBusy(true);
    setDraft(null);
    setMessage("Drafting a description…");
    const timeout = window.setTimeout(() => abort.abort(), 60000);

    try {
      const { data } = await getSupabaseBrowser().auth.getSession();
      if (!data.session) throw new Error("Please sign in again to use AI.");
      if (!isCurrent()) return;

      const response = await fetch("/api/admin/master-description", {
        method: "POST",
        credentials: "same-origin",
        signal: abort.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + data.session.access_token,
        },
        body: JSON.stringify({
          kind: props.kind,
          context: props.context,
          existing: props.currentValue,
        }),
      });

      const result = await response.json();
      if (!isCurrent()) return;
      if (!response.ok) throw new Error(result.error || "AI request failed.");

      if (result.needs_clarification) {
        setMessage("AI needs clarification: " + result.question);
        return;
      }
      if (typeof result.description !== "string") {
        throw new Error("No description was returned.");
      }

      setDraft(result.description);
      setMessage("Review and edit the AI draft below. Your saved record and form description have not changed.");
    } catch (error) {
      if (!isCurrent()) return;
      setMessage(abort.signal.aborted
        ? "AI took too long. Retry or enter the description manually."
        : error instanceof Error ? error.message : "AI is unavailable.");
    } finally {
      window.clearTimeout(timeout);
      if (isCurrent()) setBusy(false);
    }
  }

  return (
    <div style={{
      padding: 14, border: "1px solid #93c5fd", borderRadius: 10,
      background: "#eff6ff", color: "#172033", lineHeight: 1.6,
    }}>
      <button type="button"
        disabled={busy || props.disabled || (props.context.name || "").trim().length < 3}
        onClick={() => void generate()}>
        {busy ? "Writing description…" : "Generate AI description"}
      </button>
      <div role="status" aria-live="polite" style={{ marginTop: 8 }}>
        {message || "AI drafts wording only. You review it before applying or saving."}
      </div>
      {draft !== null && (
        <>
          <label style={{ display: "block", marginTop: 12 }}>
            Review / edit AI draft
            <textarea
              rows={4}
              maxLength={600}
              value={draft}
              onChange={event => setDraft(event.target.value)}
              style={{
                display: "block", width: "100%", boxSizing: "border-box",
                padding: 10, marginTop: 6, border: "1px solid #cbd5e1",
                borderRadius: 8, background: "#fff", font: "inherit",
              }}
            />
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
            <button type="button" disabled={props.disabled || !draft.trim()}
              onClick={() => {
                if (props.currentValue.trim() &&
                    !window.confirm("Replace the form description with this reviewed draft? Nothing will be saved yet.")) return;
                props.onApply(draft.trim());
                setDraft(null);
              }}>
              Apply reviewed description
            </button>
            <button type="button" onClick={() => {
              setDraft(null);
              setMessage("Draft dismissed. Your description was not changed.");
            }}>
              Dismiss draft
            </button>
          </div>
          <small>After applying, you can still edit the main description before saving.</small>
        </>
      )}
    </div>
  );
}

export function MasterEditNavigation() {
  useEffect(() => {
    let frame = 0;

    function handleClick(event: MouseEvent) {
      if (!(event.target instanceof Element)) return;
      const button = event.target.closest("button");
      if (!button || button.disabled || button.textContent?.trim() !== "Edit") return;

      let form: HTMLFormElement | null = null;
      if (button.closest(".registrationMaster, .operatingMaster")) {
        form = button.closest("details")?.querySelector("form") || null;
      } else if (button.closest(".catalogue")) {
        form = document.querySelector<HTMLFormElement>("#identity-master-form");
      }
      if (!form) return;

      const targetForm = form;
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        frame = window.requestAnimationFrame(() => {
          if (!targetForm.isConnected) return;

          // Ensure an editor inside a collapsible section is visible.
          let parent: HTMLElement | null = targetForm.parentElement;
          while (parent) {
            if (parent instanceof HTMLDetailsElement) parent.open = true;
            parent = parent.parentElement;
          }

          targetForm.style.scrollMarginTop = "240px";
          const field = targetForm.querySelector<HTMLElement>(
            'input:not([disabled]):not([type="hidden"]):not([type="checkbox"]), textarea:not([disabled]), select:not([disabled])'
          );
          field?.focus({ preventScroll: true });

          targetForm.scrollIntoView({
            block: "start",
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
              ? "auto" : "smooth",
          });
        });
      });
    }

    document.addEventListener("click", handleClick, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
