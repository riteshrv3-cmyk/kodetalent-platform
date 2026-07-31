import { anthropic, AI_MODEL_RESUME } from "@workspace/integrations-anthropic-ai";
import { extractJson } from "../extractJson";
import { logger } from "../logger";

export interface CallJsonOptions {
  system: string;
  user: string;
  maxTokens: number;
  temperature: number;
  signal?: AbortSignal;
  stageName: string;
}

/**
 * Calls the resume model with JSON mode, extracts + parses the response, and
 * retries once on a parse failure (the model occasionally wraps JSON in
 * prose despite instructions). Never retries on an abort — that's the
 * caller's cancellation, not a transient failure.
 */
export async function callJson<T>(opts: CallJsonOptions): Promise<T> {
  const attempt = async (): Promise<T> => {
    const response = await anthropic.messages.create({
      model: AI_MODEL_RESUME,
      max_tokens: opts.maxTokens,
      temperature: opts.temperature,
      system: opts.system,
      response_format: { type: "json_object" },
      signal: opts.signal,
      messages: [{ role: "user", content: opts.user }],
    });
    const text = response.content[0]?.type === "text" ? response.content[0].text : "";
    return extractJson<T>(text);
  };

  try {
    return await attempt();
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw err;
    logger.warn({ err, stage: opts.stageName }, "resume pipeline: JSON call failed, retrying once");
    return await attempt();
  }
}
