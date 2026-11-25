import { NextResponse } from "next/server";
import { offlineTopicDraft, type TopicDraft } from "@/lib/leadership";
import { completeJSON } from "@/lib/openai";

const system = `You turn a text into a short spoken talking-point card for a senior leader who is a non-native English speaker.
Return JSON:
{
  "opening": string,
  "pillars": [{"key": string, "tag": string, "text": string}],
  "close": string
}
Rules:
- Exactly 3 pillars: the three most important ideas, in a logical order.
- "key": ONE or TWO memorable words (the cheat-code word), e.g. "Ownership".
- "tag": 2–4 words that jog the memory, e.g. "Control what you let in".
- "text": 2–3 short spoken sentences in first person where natural, starting with "First, <key>:", "Second, <key>:", "Third, <key>:". Max 50 words. Plain, confident, everyday English.
- "opening": one sentence that frames the topic and says there are three ideas.
- "close": one memorable landing sentence.
- Stay faithful to the text. Do not invent facts or numbers.`;

function valid(raw: unknown): TopicDraft | null {
  const r = raw as Partial<TopicDraft>;
  if (typeof r?.opening !== "string" || typeof r?.close !== "string" || !Array.isArray(r.pillars)) return null;
  const pillars = r.pillars
    .filter((p) => typeof p?.key === "string" && typeof p?.text === "string" && p.key.trim() && p.text.trim())
    .slice(0, 3)
    .map((p) => ({ key: p.key.trim(), tag: String(p.tag ?? "").trim(), text: p.text.trim() }));
  return pillars.length === 3 ? { opening: r.opening, pillars, close: r.close } : null;
}

export async function POST(req: Request) {
  const body = (await req.json()) as { title?: string; text?: string };
  const title = (body.title ?? "").trim().slice(0, 120) || "My topic";
  const text = (body.text ?? "").trim().slice(0, 20000);
  if (!text) return NextResponse.json({ error: "Empty text" }, { status: 400 });

  try {
    const draft = valid(await completeJSON(system, `Title: ${title}\n\nText:\n"""\n${text}\n"""`));
    if (draft) return NextResponse.json({ ...draft, source: "ai" });
  } catch (err) {
    console.warn("[topic] falling back to offline draft:", (err as Error).message);
  }
  return NextResponse.json({ ...offlineTopicDraft(title, text), source: "offline" });
}
