import { NextResponse } from "next/server";
import { cleanPack, offlineCvPack } from "@/lib/cv";
import { completeJSON } from "@/lib/openai";

// The CV text is used only to generate questions for this request; it is not stored or logged.

const system = `You are a senior executive interview coach. You receive a candidate's CV.
Predict the questions a sharp interviewer will ask about THIS CV, and prepare spoken answers the candidate can memorise.

Return JSON:
{
  "questions": [{
    "topic": string,          // 2-5 word label, e.g. "Lynx $50M program"
    "question": string,       // how the interviewer would actually ask it
    "cvMatch": string[],      // 1-4 SHORT phrases (2-6 words) copied EXACTLY from the CV that this question probes
    "opening": string,        // one confident first sentence that ends by announcing three points
    "pillars": [{"key": string, "tag": string, "text": string}],  // exactly 3
    "close": string           // one landing sentence
  }],
  "facts": [{"q": string, "a": string}]   // numbers and facts to know instantly
}

Rules for questions (aim for 14):
- Cover: the most recent role, every headline number (budgets, %, team sizes), the biggest programs, career moves and tenure,
  technical depth (platforms, security, cloud, AI), business impact, awards, side projects and how they fit, and one "why should we hire you".
- Ask the probing follow-ups a real interviewer asks ("How exactly did you get 20%?", "What went wrong?").
- "key" is ONE or TWO memorable words (the cheat-code word). "tag" is 1-3 words that jog memory (a number, a system name).
- Each pillar "text" is 1-3 short spoken sentences, first person, starting "First, <key>:", "Second, <key>:", "Third, <key>:". Max 45 words.
- Use ONLY facts in the CV. Never invent numbers, names or outcomes. If a detail would help but isn't in the CV, write "[add example]".
- Plain, confident English for a non-native speaker. No buzzword chains.

Rules for facts (aim for 20): one precise question each, addressed to the candidate ("Your largest budget?", "Budget of the Lynx program?") with a short exact answer from the CV ("$50M").
Never include phone numbers, emails or addresses.`;

export async function POST(req: Request) {
  const body = (await req.json()) as { lines?: string[] };
  const lines = (Array.isArray(body.lines) ? body.lines : []).map(String).slice(0, 600);
  const text = lines.join("\n").slice(0, 40_000);
  if (!text.trim()) return NextResponse.json({ error: "Empty CV" }, { status: 400 });

  try {
    const pack = cleanPack(await completeJSON(system, `CV:\n"""\n${text}\n"""`));
    if (pack && pack.questions.length >= 5) return NextResponse.json({ ...pack, source: "ai" });
  } catch (err) {
    console.warn("[cv] falling back to offline pack:", (err as Error).message);
  }
  return NextResponse.json({ ...offlineCvPack(lines), source: "offline" });
}
