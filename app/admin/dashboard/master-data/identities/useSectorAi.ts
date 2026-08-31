"use client";

import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

type SectorFields = {
  title: string;
  key: string;
  symbol: string;
  description: string;
};
type DraftField = Exclude<keyof SectorFields, "title">;
const draftFields: DraftField[] = ["key", "symbol", "description"];

export function useSectorAi<T extends SectorFields>(
  form: T,
  setForm: Dispatch<SetStateAction<T>>,
  editingKey: string | null
) {
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMessage, setAiMessage] = useState("");
  const [revision, setRevision] = useState(0);
  const manual = useRef(new Set<DraftField>());
  const controller = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  const latest = useRef({ form, editingKey });
  latest.current = { form, editingKey };

  useEffect(() => { manual.current.clear(); }, [editingKey]);

  function changeField(field: keyof SectorFields, value: string) {
    if (field !== "title") manual.current.add(field);

    if (field === "description") {
      setForm(current => ({ ...current, description: value }));
      return;
    }

    controller.current?.abort();
    sequence.current++;
    setForm(current => {
      const next = { ...current, [field]: value };
      if (field === "title" && !editingKey) {
        for (const key of draftFields) {
          if (!manual.current.has(key)) Object.assign(next, { [key]: "" });
        }
      }
      return next;
    });
    setRevision(value => value + 1);
  }

  function regenerate() {
    if (editingKey || aiBusy) return;
    if (latest.current.form.description.trim() &&
        !window.confirm(
          "Generate a replacement description? Your manually edited key and symbol will be preserved."
        )) return;
    manual.current.delete("description");
    setRevision(value => value + 1);
  }

  useEffect(() => {
    controller.current?.abort();
    const ticket = ++sequence.current;
    let active = true;
    const title = form.title.trim();

    if (editingKey || title.length < 3 || title.length > 120) {
      setAiBusy(false);
      setAiMessage(editingKey
        ? "Existing sector: AI suggestions are disabled and the permanent key is locked."
        : "Enter a sector title of 3–120 characters. AI will suggest details after you pause.");
      if (!title && !editingKey) manual.current.clear();
      return;
    }

    const abort = new AbortController();
    controller.current = abort;
    const currentRequest = () =>
      active && ticket === sequence.current &&
      latest.current.editingKey === null &&
      latest.current.form.title.trim() === title;

    setAiBusy(true);
    setAiMessage("Preparing sector suggestions…");

    const timer = window.setTimeout(async () => {
      const timeout = window.setTimeout(() => abort.abort(), 60000);
      try {
        const entered: Partial<SectorFields> = {};
        for (const key of manual.current) entered[key] = latest.current.form[key];

        const { data } = await getSupabaseBrowser().auth.getSession();
        if (!data.session) throw new Error("Please sign in again to use AI.");
        if (!currentRequest()) return;

        const response = await fetch("/api/admin/sector-suggestions", {
          method: "POST",
          credentials: "same-origin",
          signal: abort.signal,
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + data.session.access_token,
          },
          body: JSON.stringify({ title, manual: entered }),
        });

        const result = await response.json();
        if (!currentRequest()) return;
        if (!response.ok) throw new Error(result.error || "AI request failed.");

        if (result.needs_clarification) {
          setAiMessage("AI needs clarification: " + result.question +
            " Update the title or enter the details manually.");
          return;
        }
        if (!result.draft) throw new Error("AI returned no suggestions.");

        setForm(current => {
          if (!currentRequest()) return current;
          const next = { ...current };
          for (const key of draftFields) {
            if (!manual.current.has(key) && typeof result.draft[key] === "string") {
              Object.assign(next, { [key]: result.draft[key] });
            }
          }
          return next;
        });
        setAiMessage(
          "AI has suggested the details and drafted the description. Please review and change anything required before saving. Manual edits were preserved."
        );
      } catch (error) {
        if (!currentRequest()) return;
        setAiMessage(abort.signal.aborted
          ? "AI took too long. Retry or enter the details manually."
          : error instanceof Error ? error.message : "AI is unavailable. Use manual entry.");
      } finally {
        window.clearTimeout(timeout);
        if (currentRequest()) setAiBusy(false);
      }
    }, 1800);

    return () => {
      active = false;
      window.clearTimeout(timer);
      abort.abort();
    };
    // AI-written fields do not trigger more AI requests.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.title, editingKey, revision, setForm]);

  return { aiBusy, aiMessage, changeField, regenerate };
}
