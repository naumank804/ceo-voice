import { findKeywordsUsed } from "./speech-metrics";
import type { SpeechMetrics } from "./types";

// "Rule of 3" & Executive Presence Scorecard, shown after an answer in the Interview Simulator
// and Leadership Practice. Pure functions, so it works offline and on typed answers too.

export const RUN_ON_WORDS = 22;

/** Hedges and passive cop-outs, longest first so "i think maybe" isn't also counted as "i think". */
export const HEDGES = [
  "i think maybe", "we couldn't say no", "we could not say no", "we had no choice", "i'm not sure", "i am not sure",
  "i feel like", "i would say", "to be honest", "more or less", "a little bit", "i guess", "i think", "i tried to",
  "we tried to", "kind of", "sort of", "maybe", "probably", "hopefully", "somewhat",
];

const PASSIVE = /\b(?:was|were|has been|have been|had been|got|is being|was being)\s+(?:\w+ed|done|made|given|taken|told|asked|chosen|known|seen|built|run|set)\b(?!\s+(?:up|out|to))/gi;

/** Words that usually start a new spoken sentence when speech-to-text drops the full stops. */
const BREAKS = /\s+(?=(?:first(?:ly)?|second(?:ly)?|third(?:ly)?|finally|so|but|however|because of that|as a result|then|after that|the result|the outcome|my|our|i|we)\b)/i;

/**
 * Split a transcript into sentences. Uses punctuation when present; long unpunctuated stretches
 * (speech-to-text) are cut before discourse markers and new subjects ("I", "we").
 */
export function splitSentences(text: string): string[] {
  const rough = text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const out: string[] = [];
  for (const chunk of rough) {
    const words = chunk.split(" ");
    if (words.length <= RUN_ON_WORDS) {
      out.push(chunk);
      continue;
    }
    // Walk the chunk and cut at the first break marker after at least 6 words.
    let cur: string[] = [];
    for (const w of words) {
      if (cur.length >= 6 && BREAKS.test(` ${w}`)) {
        out.push(cur.join(" "));
        cur = [];
      }
      cur.push(w);
    }
    if (cur.length) out.push(cur.join(" "));
  }
  return out;
}

export interface Scorecard {
  rule3: { pillars: { key: string; hit: boolean }[]; hits: number; verdict: string };
  punch: { sentences: number; avgWords: number; runOns: string[]; verdict: string };
  hedging: { phrases: { phrase: string; count: number }[]; passive: string[]; total: number };
  delivery: { wpm: number; fillers: number; fillerDetail: string; durationSec: number; words: number };
  /** 0–100, an at-a-glance grade for the four areas. */
  grade: number;
}

export function countHedges(text: string): { phrase: string; count: number }[] {
  let lower = ` ${text.toLowerCase().replace(/[’]/g, "'")} `;
  const out: { phrase: string; count: number }[] = [];
  for (const h of HEDGES) {
    const re = new RegExp(`\\b${h.replace(/[.*+?^${}()|[\]\\']/g, "\\$&")}\\b`, "g");
    const n = lower.match(re)?.length ?? 0;
    if (n) {
      out.push({ phrase: h, count: n });
      lower = lower.replace(re, " ");
    }
  }
  return out;
}

export function findPassive(text: string): string[] {
  return [...new Set((text.match(PASSIVE) ?? []).map((s) => s.toLowerCase()))].slice(0, 5);
}

export function buildScorecard(transcript: string, metrics: SpeechMetrics, pillars: { key: string; hit: boolean }[]): Scorecard {
  const hits = pillars.filter((p) => p.hit).length;
  const sentences = splitSentences(transcript);
  const lengths = sentences.map((s) => s.split(/\s+/).length);
  const runOns = sentences.filter((_, i) => lengths[i] > RUN_ON_WORDS);
  const avgWords = lengths.length ? Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length) : 0;
  const phrases = countHedges(transcript);
  const passive = findPassive(transcript);
  const hedgeTotal = phrases.reduce((a, p) => a + p.count, 0) + passive.length;

  const ruleScore = pillars.length ? hits / pillars.length : 0;
  const punchScore = sentences.length ? 1 - runOns.length / sentences.length : 0;
  const hedgeScore = Math.max(0, 1 - hedgeTotal / 5);
  const per100 = metrics.wordCount ? (metrics.fillerTotal / metrics.wordCount) * 100 : 0;
  const paceOk = metrics.durationSec === 0 || (metrics.wpm >= 120 && metrics.wpm <= 145) ? 1 : metrics.wpm >= 105 && metrics.wpm <= 165 ? 0.6 : 0.3;
  const deliveryScore = Math.max(0, 1 - per100 / 8) * 0.6 + paceOk * 0.4;

  return {
    rule3: {
      pillars,
      hits,
      verdict:
        hits === pillars.length
          ? "All three pillars landed. That is a structured executive answer."
          : hits === 0
            ? "None of the three pillars came through. Say each cheat-code word out loud as a signpost."
            : `${hits} of ${pillars.length} landed. Signpost what's missing: ${pillars
              .map((p, i) => (p.hit ? null : `“${["First", "Second", "Third"][i] ?? "Next"}, ${p.key.toLowerCase()}…”`))
              .filter(Boolean)
              .join(", ")}.`,
    },
    punch: {
      sentences: sentences.length,
      avgWords,
      runOns,
      verdict: runOns.length
        ? `${runOns.length} sentence${runOns.length > 1 ? "s" : ""} ran past ${RUN_ON_WORDS} words. Stop, breathe, start a new sentence.`
        : "Short, punchy sentences. Easy to follow and quote.",
    },
    hedging: { phrases, passive, total: hedgeTotal },
    delivery: {
      wpm: metrics.wpm,
      fillers: metrics.fillerTotal,
      fillerDetail: Object.entries(metrics.fillers).map(([k, v]) => `${k} ×${v}`).join(", "),
      durationSec: metrics.durationSec,
      words: metrics.wordCount,
    },
    grade: Math.round((ruleScore * 0.35 + punchScore * 0.2 + hedgeScore * 0.2 + deliveryScore * 0.25) * 100),
  };
}

/** Scorecard straight from a transcript and its cheat-code words (Interview Simulator anchors). */
export function scorecardFor(transcript: string, metrics: SpeechMetrics, keys: readonly string[]): Scorecard {
  const used = new Set(findKeywordsUsed(transcript, keys));
  return buildScorecard(transcript, metrics, keys.map((key) => ({ key, hit: used.has(key) })));
}

// ── Offline 4-sentence executive rewrite ──────────────────────────────────────

const ORDINAL = ["First", "Second", "Third"];

const LEAD = /^\s*(so|well|okay|ok|and|but|then|first(ly)?|second(ly)?|third(ly)?|finally|the main thing (was|is)( that)?),?\s+/i;
const TAIL = /\s+(and|but|so|that|because|or|which|with|the|a|to)$/i;

const clean = (s: string) => {
  let t = s
    .replace(/\b(um+|uh+|erm|you know,?|basically,?|actually,?|like,)\s*/gi, "")
    .replace(/\b(i think maybe|i think( that)?|i guess|kind of|sort of|maybe|probably|really)\s*/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  // Strip stacked openers ("so first …") and dangling connectors ("… and").
  while (LEAD.test(t)) t = t.replace(LEAD, "");
  while (TAIL.test(t)) t = t.replace(TAIL, "");
  return t;
};

const trimWords = (s: string, n: number) => {
  const w = s.split(/\s+/);
  return w.length > n ? `${w.slice(0, n).join(" ")}` : s;
};

const sentence = (s: string) => {
  const t = s.replace(/[.,;:\s]+$/, "");
  return t ? `${t.charAt(0).toUpperCase()}${t.slice(1)}.` : "";
};

/**
 * A rule-based stand-in for the AI rewrite: headline + one sentence per pillar, built only
 * from the user's own words. Missing pillars get a placeholder instead of invented facts.
 */
export function offlineFourSentence(transcript: string, keys: readonly string[]): string[] {
  const parts = splitSentences(transcript).map(clean).filter((s) => s.split(" ").length >= 4);
  const used = new Set<number>();
  const pick = (key: string) => {
    const i = parts.findIndex((s, j) => !used.has(j) && findKeywordsUsed(s, [key]).length > 0);
    if (i >= 0) used.add(i);
    return i;
  };
  const pillarIdx = keys.slice(0, 3).map(pick);
  // Headline: prefer an unused sentence with a number or result, else the first unused one.
  const free = parts.map((_, j) => j).filter((j) => !used.has(j));
  const headIdx = free.find((j) => /\d|percent|million|deliver|result|outcome/i.test(parts[j])) ?? free[0] ?? -1;
  if (headIdx >= 0) used.add(headIdx);
  const head = headIdx >= 0 ? sentence(trimWords(parts[headIdx], 20)) : "My answer comes down to three things.";
  const body = keys.slice(0, 3).map((key, k) => {
    let i = pillarIdx[k];
    if (i < 0) {
      i = parts.findIndex((_, j) => !used.has(j));
      if (i >= 0) used.add(i);
    }
    return i >= 0 ? `${ORDINAL[k]}, ${sentence(trimWords(parts[i], 20)).replace(/^[A-Z](?![\s'])/, (c) => c.toLowerCase())}` : `${ORDINAL[k]}, ${key.toLowerCase()}: [add one concrete example with a number].`;
  });
  return [head, ...body];
}
