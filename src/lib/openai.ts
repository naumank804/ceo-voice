import OpenAI from "openai";

let client: OpenAI | null = null;

/** Returns null when no key is configured so callers can fall back to offline mode. */
export function getOpenAI(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

export const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o";

/** Ask for a JSON object and parse it; throws on malformed output so the caller can fall back. */
export async function completeJSON<T>(system: string, user: string): Promise<T> {
  const openai = getOpenAI();
  if (!openai) throw new Error("OPENAI_API_KEY not configured");
  const res = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    temperature: 0.4,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  const text = res.choices[0]?.message?.content;
  if (!text) throw new Error("Empty completion");
  return JSON.parse(text) as T;
}
