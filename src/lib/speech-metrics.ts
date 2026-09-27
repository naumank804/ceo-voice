import type { PresenceBreakdown, SafetyNetUsage, SpeechMetrics } from "./types";

/** Ideal interview pace. Below = hesitation, above = panic. */
export const PACE = { min: 110, max: 165 } as const;

export const FILLER_PATTERNS: Record<string, RegExp> = {
  um: /\b(um+|umm+|erm)\b/gi,
  uh: /\b(uh+|er+|ah+)\b/gi,
  "you know": /\byou know\b(?!\s+(how|what|why|when|where|that|the|a|an|about))/gi,
  basically: /\bbasically\b/gi,
  actually: /\bactually\b/gi,
  "i mean": /\bi mean\b/gi,
  "sort of": /\bsort of\b/gi,
  "kind of": /\bkind of\b/gi,
};

/**
 * "like" is only a filler when it is not doing grammatical work
 * ("I would like", "it looks like", "tools like Kafka").
 */
const LIKE_NON_FILLER_PREV = new Set([
  "would", "i", "you", "we", "they", "he", "she", "looks", "look", "looked", "feel", "feels", "felt",
  "seems", "seem", "sounds", "sound", "things", "tools", "companies", "something", "just", "much", "more",
  "don't", "didn't", "do", "did", "really",
]);

export const WEAK_PHRASES = [
  "i think", "i guess", "maybe", "probably", "i'm not sure", "i am not sure", "hopefully",
  "i feel like", "i try to", "i tried to", "kind of", "sort of", "a little bit", "just", "i believe",
];

const STRONG_PHRASES = [
  "i led", "i delivered", "i owned", "i decided", "i built", "i drove", "i spearheaded", "i launched",
  "i achieved", "i increased", "i reduced", "i designed", "i negotiated", "i resolved", "i am confident",
  "i'm confident", "i took ownership", "resulted in", "the outcome was", "my recommendation", "i initiated",
  "i streamlined", "i secured", "i mentored",
];

export function tokenize(text: string): string[] {
  return text.toLowerCase().match(/[a-z']+/g) ?? [];
}

function countPhrases(text: string, phrases: string[]): Record<string, number> {
  const lower = ` ${text.toLowerCase()} `;
  const out: Record<string, number> = {};
  for (const p of phrases) {
    const re = new RegExp(`\\b${p.replace(/[.*+?^${}()|[\]\\']/g, "\\$&")}\\b`, "g");
    const n = lower.match(re)?.length ?? 0;
    if (n) out[p] = n;
  }
  return out;
}

function countFillers(text: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [label, re] of Object.entries(FILLER_PATTERNS)) {
    const n = text.match(re)?.length ?? 0;
    if (n) out[label] = n;
  }
  const words = tokenize(text);
  let likes = 0;
  words.forEach((w, i) => {
    if (w === "like" && !LIKE_NON_FILLER_PREV.has(words[i - 1] ?? "")) likes++;
  });
  if (likes) out.like = likes;
  return out;
}

export function computeMetrics(transcript: string, durationSec: number): SpeechMetrics {
  const wordCount = tokenize(transcript).length;
  const wpm = durationSec > 0 ? Math.round((wordCount / durationSec) * 60) : 0;
  const paceVerdict: SpeechMetrics["paceVerdict"] =
    wordCount < 15 || durationSec < 8 ? "insufficient" : wpm < PACE.min ? "too-slow" : wpm > PACE.max ? "too-fast" : "steady";
  const fillers = countFillers(transcript);
  return {
    wordCount,
    durationSec: Math.round(durationSec),
    wpm,
    paceVerdict,
    fillers,
    fillerTotal: Object.values(fillers).reduce((a, b) => a + b, 0),
    weakPhrases: countPhrases(transcript, WEAK_PHRASES),
    strongPhrases: countPhrases(transcript, STRONG_PHRASES),
  };
}

const SUFFIXES = ["ship", "ment", "ness", "tion", "sion", "ity", "ing", "ies", "ied", "ed", "er", "ly", "es", "s", "y", "e"];

/** Crude suffix stripper — enough to match "ownership" with "owned", "delivered" with "delivery". */
export function stem(word: string): string {
  let w = word.toLowerCase().replace(/[^a-z]/g, "");
  let prev = "";
  while (w !== prev) {
    prev = w;
    const suffix = SUFFIXES.find((s) => w.length - s.length >= 3 && w.endsWith(s));
    if (suffix) w = w.slice(0, -suffix.length);
  }
  return w;
}

const STOP = new Set(["a", "an", "the", "of", "to", "and", "or", "in", "on", "for", "with", "my", "your"]);

/** Returns the Safety Net keywords the user actually wove into their answer. */
export function findKeywordsUsed(transcript: string, keywords: readonly string[]): string[] {
  const spoken = new Set(tokenize(transcript).map(stem));
  return keywords.filter((kw) => {
    const parts = tokenize(kw).filter((w) => !STOP.has(w)).map(stem);
    // Multi-word anchors count once most of their words are spoken ("the lesson was…" covers "Lesson applied").
    const hits = parts.filter((p) => spoken.has(p)).length;
    return parts.length > 0 && hits >= Math.ceil(parts.length / 2);
  });
}

/**
 * Executive Presence Points (0–100). Weighted toward how the answer *sounded*,
 * because that is what interviewers remember.
 */
export function computePresence(
  m: SpeechMetrics,
  keywordsUsed: number,
  safetyNet: SafetyNetUsage | null,
): PresenceBreakdown {
  const clamp = (v: number, max: number) => Math.max(0, Math.min(max, Math.round(v)));

  // Pace — 25
  let pace = 25;
  if (m.paceVerdict === "insufficient") pace = 8;
  else if (m.paceVerdict === "too-slow") pace = 25 - (PACE.min - m.wpm) * 0.5;
  else if (m.paceVerdict === "too-fast") pace = 25 - (m.wpm - PACE.max) * 0.5;

  // Clarity — 25: fillers per 100 words. 0 → 25, 8+ → 0.
  const fillerRate = m.wordCount ? (m.fillerTotal / m.wordCount) * 100 : 0;
  const clarity = m.wordCount < 15 ? 8 : 25 - fillerRate * 3.2;

  // Authority — 25: owning language minus hedging.
  const strong = Object.values(m.strongPhrases).reduce((a, b) => a + b, 0);
  const weak = Object.values(m.weakPhrases).reduce((a, b) => a + b, 0);
  const authority = 13 + strong * 4 - weak * 3;

  // Substance — 15: covered anchor ideas and spoke long enough to tell a story.
  const lengthScore = m.wordCount >= 60 ? 7 : (m.wordCount / 60) * 7;
  const substance = lengthScore + (keywordsUsed / 3) * 8;

  // Independence — 10: answering without the net is the goal; using it is still rewarded over freezing.
  const independence = !safetyNet ? 10 : safetyNet.level === 1 ? 7 : 4;

  const parts = {
    pace: clamp(pace, 25),
    clarity: clamp(clarity, 25),
    authority: clamp(authority, 25),
    substance: clamp(substance, 15),
    independence: clamp(independence, 10),
  };
  return { ...parts, total: Object.values(parts).reduce((a, b) => a + b, 0) };
}
