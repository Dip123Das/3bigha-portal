"use client";

import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

type AiFields = {
  label: string;
  identity_key: string;
  family_key: string;
  lifecycle_stage: string;
  workspace_label: string;
  description: string;
};

type SuggestedField = Exclude<keyof AiFields, "label">;

const suggestedFields: SuggestedField[] = [
  "identity_key", "family_key", "lifecycle_stage",
  "workspace_label", "description",
];

export function useIdentityAi<T extends AiFields>(
  form: T,
  setForm: Dispatch<SetStateAction<T>>,
  editingId: string | null
) {
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMessage, setAiMessage] = useState("");
  const [revision, setRevision] = useState(0);
  const touched = useRef(new Set<SuggestedField>());
  const controller = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  const latest = useRef({ form, editingId });
  latest.current = { form, editingId };

  useEffect(() => {
    touched.current.clear();
  }, [editingId]);

  function changeAiField(field: keyof AiFields, value: string) {
    if (field === "description") {
      touched.current.add("description");
      setForm(current => ({ ...current, description: value }));
      return;
    }
    controller.current?.abort();
    sequence.current++;

    if (field !== "label") touched.current.add(field);

    setForm(current => {
      const next = { ...current, [field]: value };

      if (field === "label" && !editingId) {
        // Discard suggestions belonging to the previous name, but retain
        // anything the administrator deliberately entered.
        for (const key of suggestedFields) {
          if (!touched.current.has(key)) {
            Object.assign(next, { [key]: "" });
          }
        }
      }
      return next;
    });

    // Manual description edits should not trigger another AI call.
    // Other changes may affect how the description should be written.
    setRevision(value => value + 1);
  }

  function regenerateDescription() {
    if (editingId || aiBusy) return;
    if (latest.current.form.description.trim() &&
        !window.confirm(
          "Generate a replacement description? Your other manually edited fields will be preserved."
        )) return;

    touched.current.delete("description");
    setRevision(value => value + 1);
  }

  useEffect(() => {
    controller.current?.abort();
    const ticket = ++sequence.current;
    let active = true;
    const name = form.label.trim();

    if (editingId || name.length < 3) {
      setAiBusy(false);
      setAiMessage(editingId
        ? "Automatic AI suggestions are disabled while editing an existing identity."
        : "Enter an identity name. AI will suggest the details after you pause typing.");
      if (!name && !editingId) touched.current.clear();
      return;
    }

    if (name.length > 120) {
      setAiBusy(false);
      setAiMessage("Use an identity name of at most 120 characters for AI suggestions.");
      return;
    }

    setAiBusy(true);
    setAiMessage("Preparing AI suggestions…");

    const abort = new AbortController();
    controller.current = abort;

    const stillCurrent = () =>
      active && ticket === sequence.current &&
      latest.current.editingId === null &&
      latest.current.form.label.trim() === name;

    const timer = window.setTimeout(async () => {
      const timeout = window.setTimeout(() => abort.abort(), 60000);
      try {
        const manual: Partial<AiFields> = {};
        for (const key of touched.current) {
          manual[key] = latest.current.form[key];
        }

        const supabase = getSupabaseBrowser();
        const { data } = await supabase.auth.getSession();
        if (!data.session) throw new Error("Please sign in again to use AI suggestions.");
        if (!stillCurrent()) return;

        const response = await fetch("/api/admin/identity-suggestions", {
          method: "POST",
          credentials: "same-origin",
          signal: abort.signal,
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + data.session.access_token,
          },
          body: JSON.stringify({ name, manual }),
        });

        const result = await response.json();
        if (!stillCurrent()) return;
        if (!response.ok) throw new Error(result.error || "AI suggestions failed.");

        if (result.needs_clarification) {
          setAiMessage("AI needs clarification: " + result.question +
            " Update the identity name, or fill the fields manually.");
          return;
        }

        if (!result.draft) throw new Error("AI returned no suggestions.");

        const draft = result.draft as Record<string, string>;
        const writable = suggestedFields.filter(key => !touched.current.has(key));

        setForm(current => {
          if (!stillCurrent()) return current;
          const next = { ...current };
          for (const key of writable) {
            // Check again in case an edit happened while the response arrived.
            if (!touched.current.has(key) && typeof draft[key] === "string") {
              Object.assign(next, { [key]: draft[key] });
            }
          }
          return next;
        });

        setAiMessage(
          "AI has suggested these details and drafted the description. Please review and change anything required before saving. Your manual edits were preserved."
        );
      } catch (error) {
        if (!stillCurrent()) return;
        setAiMessage(abort.signal.aborted
          ? "AI took too long. Retry or enter the details manually."
          : error instanceof Error ? error.message : "AI is unavailable. Manual entry is still available.");
      } finally {
        window.clearTimeout(timeout);
        if (stillCurrent()) setAiBusy(false);
      }
    }, 1800);

    return () => {
      active = false;
      window.clearTimeout(timer);
      abort.abort();
    };
    // The form is read through latest so AI-written fields do not cause loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.label, editingId, revision, setForm]);

  return {
    aiBusy,
    aiMessage,
    changeAiField,
    regenerateDescription,
  };
}
