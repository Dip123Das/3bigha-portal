import {
  getDefaultThreeBOSAiAgent,
  getThreeBOSAiAgent,
  hasThreeBOSAiAgent,
} from "@/lib/3bos/ai-agents";

import type {
  ThreeBOSAiNormalizedRequest,
  ThreeBOSAiRouterInput,
  ThreeBOSAiUnknownRecord,
} from "./types";

function firstNonEmptyString(
  ...values: Array<string | null | undefined>
): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

function compactRecord(
  value: ThreeBOSAiUnknownRecord
): ThreeBOSAiUnknownRecord {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined)
  );
}

export function resolveThreeBOSAiRouterAgent(
  input: ThreeBOSAiRouterInput
) {
  if (input.agentId) {
    if (!hasThreeBOSAiAgent(input.agentId)) {
      throw new Error(
        `Unknown 3BOS AI agent: ${String(input.agentId)}`
      );
    }

    const agent = getThreeBOSAiAgent(input.agentId);

    if (!agent.enabled) {
      throw new Error(`3BOS AI agent is disabled: ${agent.id}`);
    }

    return agent;
  }

  return getDefaultThreeBOSAiAgent();
}

function buildCommonPayload(
  input: ThreeBOSAiRouterInput
): ThreeBOSAiUnknownRecord {
  const primaryText = firstNonEmptyString(
    input.message,
    input.text,
    input.requirement,
    input.question,
    input.query
  );

  return compactRecord({
    message: primaryText,
    text: primaryText,
    requirement: primaryText,
    question: primaryText,
    query: primaryText,

    searchIntent: input.searchIntent,
    module: input.module,
    category: input.category,
    city: input.city,
    district: input.district,
    locality: input.locality,

    rfq: input.rfq,
    quote: input.quote,
    priceData: input.priceData,

    context: input.context,
    options: input.options,

    ...(input.payload ?? {}),
  });
}

function buildPayloadForAgent(
  input: ThreeBOSAiRouterInput,
  agentId: string
): ThreeBOSAiUnknownRecord {
  const common = buildCommonPayload(input);

  switch (agentId) {
    case "procurement-assistant":
      return compactRecord({
        message: common.message,
        module: common.module,
        category: common.category,
        rfq: common.rfq,
        priceData: common.priceData,
        quote: common.quote,
        context: common.context,
        ...(input.payload ?? {}),
      });

    case "procurement-copilot":
      return compactRecord({
        message: common.message,
        text: common.text,
        requirement: common.requirement,
        module: common.module,
        category: common.category,
        city: common.city,
        district: common.district,
        locality: common.locality,
        rfq: common.rfq,
        priceData: common.priceData,
        quote: common.quote,
        context: common.context,
        ...(input.payload ?? {}),
      });

    case "procurement-command":
      return compactRecord({
        question: common.question,
        context: common.context,
        ...(input.payload ?? {}),
      });

    case "marketplace-discovery":
      return compactRecord({
        query: common.query,
        searchIntent: common.searchIntent,
        city: common.city,
        district: common.district,
        locality: common.locality,
        category: common.category,
        context: common.context,
        ...(input.payload ?? {}),
      });

    case "marketplace-orchestrator":
      return compactRecord({
        context: common.context,
        options: common.options,
        ...(input.payload ?? {}),
      });

    case "rfq-generator":
      return compactRecord({
        text: common.text,
        query: common.query,
        requirement: common.requirement,
        context: common.context,
        ...(input.payload ?? {}),
      });

    case "quote-risk-analysis":
      return compactRecord({
        ...(typeof input.quote === "object" &&
        input.quote !== null &&
        !Array.isArray(input.quote)
          ? (input.quote as ThreeBOSAiUnknownRecord)
          : {}),
        quote: input.quote,
        context: input.context,
        ...(input.payload ?? {}),
      });

    case "unified-cognition":
      return compactRecord({
        query: common.query,
        module: common.module,
        category: common.category,
        city: common.city,
        district: common.district,
        locality: common.locality,
        context: common.context,
        ...(input.payload ?? {}),
      });

    default:
      return common;
  }
}

function appendQueryParameters(
  endpoint: string,
  payload: ThreeBOSAiUnknownRecord
): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(payload)) {
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      searchParams.set(key, String(value));
    }
  }

  const queryString = searchParams.toString();

  if (!queryString) {
    return endpoint;
  }

  return `${endpoint}${endpoint.includes("?") ? "&" : "?"}${queryString}`;
}

export function normalizeThreeBOSAiRequest(
  input: ThreeBOSAiRouterInput
): ThreeBOSAiNormalizedRequest {
  const agent = resolveThreeBOSAiRouterAgent(input);
  const payload = buildPayloadForAgent(input, agent.id);

  const headers = new Headers(input.headers);

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  if (agent.method === "GET") {
    return {
      agent,
      method: "GET",
      url: appendQueryParameters(agent.endpoint, payload),
      headers,
      signal: input.signal,
    };
  }

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return {
    agent,
    method: "POST",
    url: agent.endpoint,
    headers,
    body: JSON.stringify(payload),
    signal: input.signal,
  };
}
