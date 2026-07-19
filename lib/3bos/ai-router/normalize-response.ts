import type { ThreeBOSAiAgentDefinition } from "@/lib/3bos/ai-agents";

import type {
  ThreeBOSAiNormalizedResponse,
  ThreeBOSAiUnknownRecord,
} from "./types";

function isRecord(value: unknown): value is ThreeBOSAiUnknownRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : null;
}

function firstDefined(...values: unknown[]): unknown {
  return values.find((value) => value !== undefined);
}

function extractContent(raw: unknown): unknown {
  if (!isRecord(raw)) {
    return raw;
  }

  return firstDefined(
    raw.content,
    raw.answer,
    raw.reply,
    raw.message,
    raw.copilot,
    raw.assistant,
    raw.result,
    raw.workflow,
    raw.rfq,
    raw.cognition,
    raw.analysis,
    raw.data,
    raw
  );
}

function extractSource(raw: unknown): string | null {
  if (!isRecord(raw)) {
    return null;
  }

  return (
    asString(raw.source) ??
    asString(raw.provider) ??
    asString(raw.model)
  );
}

function extractRecommendations(raw: unknown): unknown[] {
  if (!isRecord(raw)) {
    return [];
  }

  return asArray(
    firstDefined(
      raw.recommendations,
      raw.suggestions,
      raw.nextSteps
    )
  );
}

function extractActions(raw: unknown): unknown[] {
  if (!isRecord(raw)) {
    return [];
  }

  return asArray(
    firstDefined(
      raw.actions,
      raw.recommendedActions,
      raw.commands
    )
  );
}

function extractMetadata(raw: unknown): ThreeBOSAiUnknownRecord {
  if (!isRecord(raw)) {
    return {};
  }

  if (isRecord(raw.metadata)) {
    return raw.metadata;
  }

  if (isRecord(raw.meta)) {
    return raw.meta;
  }

  if (isRecord(raw.context)) {
    return { context: raw.context };
  }

  return {};
}

function extractError(
  raw: unknown,
  fallbackMessage?: string
): string | null {
  if (isRecord(raw)) {
    const directError =
      asString(raw.error) ??
      asString(raw.message);

    if (directError) {
      return directError;
    }

    if (isRecord(raw.error)) {
      return (
        asString(raw.error.message) ??
        asString(raw.error.code)
      );
    }
  }

  return fallbackMessage ?? null;
}

export function normalizeThreeBOSAiResponse(args: {
  agent: ThreeBOSAiAgentDefinition;
  status: number;
  responseOk: boolean;
  raw: unknown;
  fallbackError?: string;
}): ThreeBOSAiNormalizedResponse {
  const rawOk =
    isRecord(args.raw) && typeof args.raw.ok === "boolean"
      ? args.raw.ok
      : undefined;

  const ok = args.responseOk && rawOk !== false;

  return {
    ok,
    status: args.status,

    agentId: args.agent.id,
    agentTitle: args.agent.title,

    source: extractSource(args.raw),
    content: extractContent(args.raw),

    recommendations: extractRecommendations(args.raw),
    actions: extractActions(args.raw),

    metadata: extractMetadata(args.raw),
    error: ok
      ? null
      : extractError(args.raw, args.fallbackError),

    raw: args.raw,
  };
}
