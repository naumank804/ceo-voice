import { NextResponse } from "next/server";
import { completeJSON } from "@/lib/openai";
import { offlineAnalysis } from "@/lib/offline-coach";
import { type ProfileInput, profileBlock } from "@/lib/profile-server";
import type { AnswerAnalysis, GrammarCorrection, StruggleLevel } from "@/lib/types";

interface Body {
  question: string;
  transcript: string;
  keywords: string[];
  level?: StruggleLevel;
  industry?: string;
  /** "impromptu" = an off-the-cuff talk on a topic, structured with a speaking framework. */
  mode?: "interview" | "impromptu";
  profile?: ProfileInput;
}

const AUDIENCE = {
  interview: "preparing for interviews",
  impromptu: "practising impromptu public speaking (a short talk on a surprise topic)",
} as const;

const system = (mode: keyof typeof AUDIENCE) => `You are an executive communication coach for non-native English speakers ${AUDIENCE[mode]}.
You receive a speech-to-text transcript of a spoken answer. Transcription drops punctuation — never flag punctuation or capitalisation.

Return JSON:
{
  "corrections": [{"original": string, "suggestion": string, "reason": string}],
  "executiveRewrite": string,
  "coachingNote": string,
  "cheatCode": [string, string, string],
  "fourSentence": [string, string, string, string]
}

Rules:
- "corrections": up to 5 genuine grammar errors or confusing sentence structures. "original" must be an exact substring of the transcript.
  "suggestion" is how a native professional would say it. "reason" is one plain-English sentence a non-native speaker understands.
  Do not invent errors. An empty list is fine.
- "executiveRewrite": the candidate's OWN story, rewritten the way a calm, concise senior leader would say it aloud (max ~120 words).
  Keep their facts; never invent numbers — use "[X%]" placeholders where a metric would help. Replace hedging ("I think", "maybe") with ownership ("I led", "I delivered").
- "cheatCode": three memorable words (one or two words each), one per point of the polished answer, in order. Prefer the anchor keywords when they fit.
- "fourSentence": the SAME polished answer in exactly four short spoken sentences, each max 22 words, active voice, no hedging.
  Sentence 1 is the headline (the answer in one line). Sentences 2-4 start "First,", "Second,", "Third," and match the cheat code.
  Use only the candidate's facts (and their profile, if given); use "[X]" where a number would help.
- If a candidate profile is given, use their role and real metrics to make the rewrite sound like them. Never invent beyond it.
- "coachingNote": ONE direct sentence naming the single most important fix, referencing a specific topic from their answer.
  Example: "You sounded unsure when discussing your Python skills — say 'I built' instead of 'I kind of worked on'."`;

function sanitize(raw: unknown, transcript: string): AnswerAnalysis | null {
  const r = raw as Partial<AnswerAnalysis>;
  if (typeof r?.executiveRewrite !== "string" || typeof r?.coachingNote !== "string") return null;
  const lower = transcript.toLowerCase();
  const corrections = (Array.isArray(r.corrections) ? r.corrections : [])
    .filter((c): c is GrammarCorrection => typeof c?.original === "string" && typeof c?.suggestion === "string")
    // Only keep corrections we can actually highlight in the transcript.
    .filter((c) => lower.includes(c.original.toLowerCase()))
    .slice(0, 5)
    .map((c) => ({ original: c.original, suggestion: c.suggestion, reason: String(c.reason ?? "") }));
  const words = (v: unknown, n: number) =>
    Array.isArray(v) && v.length >= n && v.slice(0, n).every((x) => typeof x === "string" && x.trim()) ? (v.slice(0, n) as string[]).map((x) => x.trim()) : undefined;
  return {
    corrections,
    executiveRewrite: r.executiveRewrite,
    coachingNote: r.coachingNote,
    cheatCode: words(r.cheatCode, 3),
    fourSentence: words(r.fourSentence, 4),
    source: "ai",
  };
}

export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  const transcript = (body.transcript ?? "").trim().slice(0, 8000);
  if (!transcript) return NextResponse.json({ error: "Empty transcript" }, { status: 400 });

  try {
    const mode = body.mode === "impromptu" ? "impromptu" : "interview";
    const raw = await completeJSON(
      system(mode),
      [
        `${mode === "impromptu" ? "Topic" : "Question"}: ${body.question}`,
        `Industry: ${body.industry ?? "General"}; English level: ${body.level ?? "Intermediate"}`,
        profileBlock(body.profile),
        `${mode === "impromptu" ? "Speaking framework steps" : "Anchor keywords"} they were encouraged to use: ${(body.keywords ?? []).join(", ")}`,
        `Transcript:\n"""\n${transcript}\n"""`,
      ].join("\n"),
    );
    const analysis = sanitize(raw, transcript);
    if (analysis) return NextResponse.json(analysis);
  } catch (err) {
    console.warn("[analyze] falling back to offline coach:", (err as Error).message);
  }

  return NextResponse.json(offlineAnalysis(transcript));
}
