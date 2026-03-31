import { EnsureConversationPayload } from "@/types/conversation";

export async function openConversation(
  payload: EnsureConversationPayload
): Promise<{ conversationId: string; created: boolean }> {
  const res = await fetch("/api/conversations/ensure", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json?.error || "Failed to open conversation.");
  }

  return json;
}