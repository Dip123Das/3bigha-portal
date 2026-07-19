import { normalizeThreeBOSAiRequest } from "./normalize-request";
import { normalizeThreeBOSAiResponse } from "./normalize-response";

import type {
  ThreeBOSAiNormalizedResponse,
  ThreeBOSAiRouterInput,
  ThreeBOSAiRouterOptions,
} from "./types";

async function readResponsePayload(
  response: Response
): Promise<unknown> {
  const contentType =
    response.headers.get("content-type")?.toLowerCase() ?? "";

  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  try {
    const text = await response.text();

    return text || null;
  } catch {
    return null;
  }
}

export async function routeThreeBOSAiRequest(
  input: ThreeBOSAiRouterInput,
  options: ThreeBOSAiRouterOptions = {}
): Promise<ThreeBOSAiNormalizedResponse> {
  const request = normalizeThreeBOSAiRequest(input);
  const fetcher = options.fetcher ?? fetch;

  try {
    const response = await fetcher(request.url, {
      method: request.method,
      headers: request.headers,
      body: request.body,
      signal: request.signal,
      credentials: "same-origin",
      cache: "no-store",
    });

    const raw = await readResponsePayload(response);

    return normalizeThreeBOSAiResponse({
      agent: request.agent,
      status: response.status,
      responseOk: response.ok,
      raw,
      fallbackError: response.statusText || "AI request failed.",
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to contact the AI service.";

    return normalizeThreeBOSAiResponse({
      agent: request.agent,
      status: 0,
      responseOk: false,
      raw: {
        ok: false,
        error: message,
      },
      fallbackError: message,
    });
  }
}

export const runThreeBOSAiRouter = routeThreeBOSAiRequest;
