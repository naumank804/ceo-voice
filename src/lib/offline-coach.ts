import type { AnswerAnalysis, GrammarCorrection } from "./types";
import { computeMetrics } from "./speech-metrics";

/**
 * Rule-based fallback for the most common patterns non-native speakers produce
 * in interviews. Not a replacement for the AI coach — a safety net for the safety net.
 */
const RULES: { re: RegExp; fix: (m: RegExpMatchArray) => string; reason: string }[] = [
  { re: /\bi am agree\b/i, fix: () => "I agree", reason: "\"Agree\" is a verb — no \"am\" needed." },
  { re: /\b(discuss|explain|mention) about\b/i, fix: (m) => m[1], reason: "These verbs take a direct object — drop \"about\"." },
  { re: /\bexplain me\b/i, fix: () => "explain to me", reason: "You explain something *to* someone." },
  { re: /\b(i am|i'm) (working|living|doing) (here |this |there )?since (\d+|many|several|a few) (years?|months?)\b/i, fix: (m) => `I have been ${m[2]} ${m[3] ?? ""}for ${m[4]} ${m[5]}`.replace(/\s+/g, " "), reason: "Ongoing duration uses present perfect continuous + \"for\"." },
  { re: /\bsince (\d+|many|several|a few) (years?|months?|weeks?)\b/i, fix: (m) => `for ${m[1]} ${m[2]}`, reason: "Use \"for\" with a length of time, \"since\" with a starting point." },
  { re: /\bmore (better|faster|easier|bigger)\b/i, fix: (m) => m[1], reason: "Comparatives already mean \"more\"." },
  { re: /\b(informations|feedbacks|advices|equipments|softwares)\b/i, fix: (m) => m[1].slice(0, -1), reason: "Uncountable noun — no plural \"s\"." },
  { re: /\bdid (\w+ed)\b/i, fix: (m) => m[1], reason: "Use the simple past on its own: \"I missed\", not \"I did missed\"." },
  { re: /\bi have (\d+) years (old )?experience\b/i, fix: (m) => `I have ${m[1]} years of experience`, reason: "Say \"years of experience\"." },
  { re: /\bcan able to\b/i, fix: () => "can", reason: "\"Can\" and \"able to\" mean the same — use one." },
  { re: /\bdo the needful\b/i, fix: () => "take care of it", reason: "Regional phrase — may confuse international interviewers." },
  { re: /\bprepone\b/i, fix: () => "bring forward", reason: "Regional word — \"bring forward\" is universally understood." },
  { re: /\bhe don't|she don't|it don't\b/i, fix: (m) => m[0].replace("don't", "doesn't"), reason: "Third person singular takes \"doesn't\"." },
];

const HEDGE_REPLACEMENTS: [RegExp, string][] = [
  [/\bi think( that)?\s*/gi, ""],
  [/\bi guess\b/gi, "I believe"],
  [/\bmaybe\b/gi, "likely"],
  [/\bi tried to\b/gi, "I set out to"],
  [/\bkind of |sort of /gi, ""],
  [/\b(um+|uh+|erm|you know,?|basically,?|actually,?)\s*/gi, ""],
  // Last, so it catches a "So…" exposed by the filler removal above.
  [/^\s*(so|well|okay|ok),?\s+/i, ""],
];

export function offlineAnalysis(transcript: string): AnswerAnalysis {
  const corrections: GrammarCorrection[] = [];
  for (const rule of RULES) {
    const m = transcript.match(rule.re);
    // Skip matches already covered by a broader correction (e.g. "since 3 years" inside "I am working here since 3 years").
    if (m && !corrections.some((c) => c.original.toLowerCase().includes(m[0].toLowerCase()))) corrections.push({ original: m[0], suggestion: rule.fix(m), reason: rule.reason });
  }

  let rewrite = transcript;
  for (const c of corrections) rewrite = rewrite.replace(c.original, c.suggestion);
  for (const [re, rep] of HEDGE_REPLACEMENTS) rewrite = rewrite.replace(re, rep);
  rewrite = rewrite.replace(/\s{2,}/g, " ").trim();
  rewrite = rewrite.charAt(0).toUpperCase() + rewrite.slice(1);

  const m = computeMetrics(transcript, 60);
  const weak = Object.keys(m.weakPhrases);
  const coachingNote = weak.length
    ? `You softened your own achievements with "${weak.slice(0, 2).join('", "').replace(/\bi\b/g, "I")}". State results as facts: "I delivered…", "The outcome was…".`
    : m.wordCount < 40
      ? "Your answer was short. Use the STAR frame — Situation, Task, Action, Result — and finish with a number."
      : "Solid structure. Next rep: open with your result in the first sentence, then explain how you got there.";

  return { corrections, executiveRewrite: rewrite, coachingNote, source: "offline" };
}
