import type { Session } from "@supabase/supabase-js";

const REQUEST_TIMEOUT_MS = 20_000;

export type MobileRequestFailure = "offline" | "timeout" | "service" | "response";

export class MobileRequestError extends Error {
  constructor(message: string, readonly kind: MobileRequestFailure, readonly retryable: boolean) {
    super(message);
    this.name = "MobileRequestError";
  }
}

function apiOrigin() {
  const value = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/$/, "");
  if (!value) throw new MobileRequestError("The approved 3Bigha API URL is not configured.", "response", false);
  return value;
}

function failureMessage(kind: MobileRequestFailure) {
  if (kind === "timeout") return "The network is taking longer than expected. Please check your connection and try again.";
  if (kind === "offline") return "3Bigha could not reach the internet. Please reconnect and try again.";
  return "3Bigha could not reach the service safely. Please try again shortly.";
}

export async function mobileApiRequest<T>(session: Session, path: string, init: RequestInit = {}, fallback = "This request could not be completed."): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${session.access_token}`);
    headers.set("Accept", "application/json");
    headers.set("Cache-Control", "no-store");

    const response = await fetch(`${apiOrigin()}${path.startsWith("/") ? path : `/${path}`}`, {
      ...init,
      headers,
      cache: "no-store",
      signal: controller.signal,
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || !body?.ok) {
      const retryable = response.status === 408 || response.status === 429 || response.status >= 500;
      throw new MobileRequestError(body?.error?.message || fallback, response.ok ? "response" : "service", retryable);
    }
    if (!("data" in body)) throw new MobileRequestError(fallback, "response", false);
    return body.data as T;
  } catch (error) {
    if (error instanceof MobileRequestError) throw error;
    const timedOut = controller.signal.aborted;
    const kind: MobileRequestFailure = timedOut ? "timeout" : "offline";
    throw new MobileRequestError(failureMessage(kind), kind, true);
  } finally {
    clearTimeout(timeout);
  }
}

export function canonicalApiUrl(path: string) {
  return `${apiOrigin()}${path.startsWith("/") ? path : `/${path}`}`;
}
