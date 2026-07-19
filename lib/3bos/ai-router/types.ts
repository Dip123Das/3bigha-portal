import type {
  ThreeBOSAiAgentDefinition,
  ThreeBOSAiAgentId,
} from "@/lib/3bos/ai-agents";

export type ThreeBOSAiUnknownRecord = Record<string, unknown>;

export type ThreeBOSAiRouterInput = {
  agentId?: ThreeBOSAiAgentId;

  message?: string;
  text?: string;
  requirement?: string;
  question?: string;
  query?: string;
  searchIntent?: string;

  module?: string;
  category?: string;
  city?: string;
  district?: string;
  locality?: string;

  rfq?: unknown;
  quote?: unknown;
  priceData?: unknown;

  context?: unknown;
  options?: unknown;

  payload?: ThreeBOSAiUnknownRecord;

  headers?: HeadersInit;
  signal?: AbortSignal;
};

export type ThreeBOSAiNormalizedRequest = {
  agent: ThreeBOSAiAgentDefinition;
  url: string;
  method: "GET" | "POST";
  headers: HeadersInit;
  body?: string;
  signal?: AbortSignal;
};

export type ThreeBOSAiNormalizedResponse = {
  ok: boolean;
  status: number;

  agentId: ThreeBOSAiAgentId;
  agentTitle: string;

  source: string | null;
  content: unknown;

  recommendations: unknown[];
  actions: unknown[];

  metadata: ThreeBOSAiUnknownRecord;
  error: string | null;

  raw: unknown;
};

export type ThreeBOSAiRouterOptions = {
  fetcher?: typeof fetch;
};
