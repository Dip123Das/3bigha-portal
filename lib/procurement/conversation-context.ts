import { savePersistentProcurementMemory } from "@/lib/procurement/persistent-memory";

export type ProcurementConversationContext = {
  query: string;
  module: string;
  source: "search" | "rfq" | "vendor" | "price" | "comparison";
  href?: string;
  title?: string;
  timestamp: number;
};

const KEY = "3bigha.procurement.conversation.context.v1";

export function readConversationContext(): ProcurementConversationContext | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveConversationContext(
  context: ProcurementConversationContext
) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(KEY, JSON.stringify(context));

    savePersistentProcurementMemory({
      query: context.query,
      module: context.module,
      source: context.source,
      href: context.href,
      title: context.title,
      timestamp: context.timestamp,
    });
  } catch {}
}

export function clearConversationContext() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(KEY);
  } catch {}
}