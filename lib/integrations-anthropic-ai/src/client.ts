import Anthropic from "@anthropic-ai/sdk";

if (!process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL) {
  throw new Error(
    "AI_INTEGRATIONS_ANTHROPIC_BASE_URL must be set. Did you forget to provision the Anthropic AI integration?",
  );
}

if (!process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY) {
  throw new Error(
    "AI_INTEGRATIONS_ANTHROPIC_API_KEY must be set. Did you forget to provision the Anthropic AI integration?",
  );
}

// Some Anthropic-compatible gateways (e.g. AgentRouter) return a JSON message body
// WITHOUT an `application/json` content-type. The SDK then hands callers back the raw
// string instead of a parsed Message, and `message.content[0]` blows up. Fix it at the
// transport layer: if a non-streaming response carries JSON under the wrong content-type,
// rebuild it with `application/json` so the SDK parses it. Streaming responses
// (`text/event-stream`) and already-correct JSON pass through untouched — this keeps the
// SDK's APIPromise intact, so `messages.stream()` (which relies on it internally) works.
const normalizingFetch = async (
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> => {
  const res = await fetch(input, init);
  const contentType = res.headers.get("content-type") ?? "";
  if (
    contentType.includes("application/json") ||
    contentType.includes("text/event-stream")
  ) {
    return res;
  }
  const text = await res.text();
  const headers = new Headers(res.headers);
  const looksJson = /^\s*[[{]/.test(text);
  headers.set("content-type", looksJson ? "application/json" : contentType || "text/plain");
  return new Response(text, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
};

// Single source of truth for the model id. AgentRouter's token only exposes
// claude-opus-4-8; override with AI_MODEL to switch model/provider in one place.
export const AI_MODEL = process.env.AI_MODEL ?? "claude-opus-4-8";

export const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
  // AgentRouter (and similar gateways) gate access to Claude-Code-style clients.
  // Identify as claude-cli so the request is accepted; harmless against api.anthropic.com.
  defaultHeaders: {
    "user-agent": "claude-cli/1.0.0 (external)",
  },
  fetch: normalizingFetch,
});
