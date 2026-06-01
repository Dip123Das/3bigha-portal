import OpenAI from "openai";
import { withRequestTimer } from "@/lib/observability/request-timer";

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.warn("OPENAI_API_KEY missing");
}

export const openai = new OpenAI({
  apiKey,
});

type JsonAiOptions = {
  label: string;
  prompt: string;
  system?: string;
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  slowThresholdMs?: number;
};

export async function runJsonAi<T>({
  label,
  prompt,
  system,
  model = "gpt-5-mini",
  temperature = 0.2,
  maxOutputTokens = 1200,
  slowThresholdMs = 8000,
}: JsonAiOptions): Promise<T> {
  return withRequestTimer(
    `openai:${label}`,
    async () => {
      const response = await openai.responses.create({
        model,
        temperature,
        max_output_tokens: maxOutputTokens,
        input: [
          ...(system
            ? [
                {
                  role: "system" as const,
                  content: system,
                },
              ]
            : []),
          {
            role: "user" as const,
            content: prompt,
          },
        ],
      });

      const text =
        response.output_text ||
        "{}";

      return JSON.parse(text) as T;
    },
    {
      slowThresholdMs,
      metadata: {
        model,
        label,
      },
    }
  );
}
