import { isAdmin, unauthorized } from "@/lib/admin-auth";
import { LEVELS, stageById } from "@/lib/curriculum";
import { completeJSON } from "@/lib/openai";

// Admin-only: draft a model answer (opening, three pillars, landing line) for an interview
// question or a talk title, placed in a curriculum stage. Content is generic, with placeholders
// where each learner will add their own example, because it's shared by every user.

interface Draft {
  opening: string;
  pillars: { key: string; tag: string; text: string }[];
  close: string;
}

const system = `You write model answers for an executive interview and leadership speaking coach used by non-native English speakers.
Return JSON: {"opening": string, "pillars": [{"key": string, "tag": string, "text": string}], "close": string}
Rules:
- Exactly 3 pillars in a logical order. "key": ONE or TWO memorable words (the cheat code). "tag": 2-4 words that jog memory.
- Each pillar "text": 2-3 short spoken sentences, first person, starting "First, <key>:", "Second, <key>:", "Third, <key>:". Max 50 words.
- The answer is shared by many learners: never invent personal facts, employers or numbers. Where a personal example belongs, write "[your example: …]" with a hint.
- "opening": one confident sentence that answers directly and announces three points. "close": one memorable landing sentence.
- Plain, confident English. Active voice. No hedging, no buzzword chains.
- Pitch the depth at the leadership level given.`;

const ORD = ["First", "Second", "Third"];

function valid(raw: unknown): Draft | null {
  const r = raw as Partial<Draft>;
  if (typeof r?.opening !== "string" || typeof r?.close !== "string" || !Array.isArray(r.pillars)) return null;
  const pillars = r.pillars
    .filter((p) => typeof p?.key === "string" && typeof p?.text === "string" && p.key.trim())
    .slice(0, 3)
    .map((p) => ({ key: p.key.trim(), tag: String(p.tag ?? "").trim(), text: p.text.trim() }));
  return pillars.length === 3 ? { opening: r.opening, pillars, close: r.close } : null;
}

/** Offline skeleton so admins can still write by hand. */
function skeleton(prompt: string): Draft {
  return {
    opening: `[Answer "${prompt}" directly in one sentence, then announce three points.]`,
    pillars: ORD.map((o, i) => ({ key: `Point ${i + 1}`, tag: "", text: `${o}, Point ${i + 1}: [two short sentences, with your example: …]` })),
    close: "[One memorable landing sentence.]",
  };
}

export async function POST(req: Request) {
  if (!isAdmin(req)) return unauthorized();
  const body = (await req.json().catch(() => ({}))) as { prompt?: string; stage?: string; kind?: string; levels?: string[] };
  const prompt = String(body.prompt ?? "").trim().slice(0, 400);
  if (!prompt) return Response.json({ error: "Write the question or title first." }, { status: 400 });
  const stage = stageById(body.stage);
  const levels = LEVELS.filter((l) => body.levels?.includes(l.id)).map((l) => l.name);
  try {
    const draft = valid(
      await completeJSON(
        system,
        [
          `${body.kind === "question" ? "Interview question" : "Talk topic"}: ${prompt}`,
          stage && `Curriculum stage: ${stage.name}. Goal: ${stage.goal}`,
          `Leadership level: ${levels.length ? levels.join(", ") : "any level"}`,
        ]
          .filter(Boolean)
          .join("\n"),
      ),
    );
    if (draft) return Response.json({ ...draft, source: "ai" });
  } catch (err) {
    console.warn("[admin draft] offline skeleton:", (err as Error).message);
  }
  return Response.json({ ...skeleton(prompt), source: "offline" });
}
