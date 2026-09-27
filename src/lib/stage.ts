import { PACE, stem, tokenize } from "./speech-metrics";
import type { SafetyNetUsage, SpeechMetrics } from "./types";

// ── Speech sections ("beats") ───────────────────────────────────────────────
//
// Memorising a whole speech fails for most people because working memory holds
// only a few items. So the script is split into short sections (~45 words), each
// with up to three anchor words. You learn sections, not sentences.

export interface Beat {
  id: string;
  text: string;
  /** Up to three memorable words, in the order they appear. */
  anchors: string[];
  /** The first few words — the smallest nudge that restarts a frozen speaker. */
  opening: string;
}

const STOP = new Set(
  (
    "a an the and or but if so of to in on at for with by from as is are was were be been being am do does did " +
    "have has had i me my we our us you your he she it its they them their this that these those there here " +
    "what which who whom when where why how not no yes can could will would should shall may might must " +
    "just very really also then than too more most much many some any all each every one about into over " +
    "out up down off again very get got make made let lets like well now today thing things way ways " +
    "hello morning afternoon evening everyone thank thanks welcome i'm i've i'd i'll we're we've it's that's don't didn't can't won't you're they're"
  ).split(" "),
);

const WORD_RE = /[A-Za-z0-9][A-Za-z0-9'’-]*/g;

export function splitIntoBeats(script: string): Beat[] {
  const clean = script.replace(/\r/g, "").trim();
  if (!clean) return [];
  let chunks = clean
    .split(/\n\s*\n+/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  // A long paragraph is too much to hold at once — break it at sentence boundaries.
  chunks = chunks.flatMap((c) => (chunks.length === 1 || tokenize(c).length > 90 ? groupSentences(c, 45) : [c]));
  return chunks.map((text, i) => ({ id: `b${i}`, text, anchors: pickAnchors(text), opening: openingWords(text, 7) }));
}

function groupSentences(text: string, targetWords: number): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g)?.map((s) => s.trim()).filter(Boolean) ?? [text];
  const out: string[] = [];
  let cur = "";
  for (const s of sentences) {
    if (cur && tokenize(cur).length + tokenize(s).length > targetWords) {
      out.push(cur);
      cur = s;
    } else cur = cur ? `${cur} ${s}` : s;
  }
  if (cur) out.push(cur);
  return out;
}

function openingWords(text: string, n: number): string {
  const words = text.split(/\s+/);
  return words.length <= n ? text : `${words.slice(0, n).join(" ")} …`;
}

/** "Good morning, everyone." → "G m, e." — the classic first-letter memory cue. */
export function firstLetters(text: string): string {
  return text.replace(WORD_RE, (w) => w[0]);
}

function normalise(word: string): string {
  return word.toLowerCase().replace(/’/g, "'").replace(/'s$/, "");
}

function pickAnchors(text: string, max = 3): string[] {
  const found = new Map<string, { word: string; pos: number; score: number }>();
  for (const m of text.matchAll(WORD_RE)) {
    const raw = m[0].replace(/[-']+$/, "");
    const lower = normalise(raw);
    const isNumber = /\d/.test(lower);
    if (STOP.has(lower) || (!isNumber && lower.length < 4)) continue;
    const key = isNumber ? lower : stem(lower);
    const prev = found.get(key);
    if (prev) {
      prev.score += 1; // repeated ideas are the backbone of the section
      continue;
    }
    const before = text.slice(0, m.index).trimEnd();
    const midSentenceCapital = /^[A-Z]/.test(raw) && before.length > 0 && !/[.!?:"“]$/.test(before);
    found.set(key, { word: raw, pos: m.index, score: raw.length / 3 + (isNumber ? 3 : 0) + (midSentenceCapital ? 2 : 0) });
  }
  return [...found.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .sort((a, b) => a.pos - b.pos)
    .map((a) => a.word);
}

function contentStems(text: string): Set<string> {
  return new Set(
    tokenize(text)
      .map(normalise)
      .filter((w) => !STOP.has(w) && w.length >= 3)
      .map(stem),
  );
}

/** A section counts as delivered once half of its content words have been spoken — in any wording. */
export const COVERED = 0.5;

/** Share of each section's content words heard so far (0..1). Order-insensitive, so paraphrasing still counts. */
export function beatCoverage(transcript: string, beats: Beat[]): number[] {
  const spoken = new Set(tokenize(transcript).map(normalise).map(stem));
  return beats.map((b) => {
    const words = contentStems(b.text);
    if (!words.size) return spoken.size ? 1 : 0;
    let hits = 0;
    words.forEach((w) => spoken.has(w) && hits++);
    return hits / words.size;
  });
}

/** The section the speaker is on: the one after the last section they've delivered. */
export function currentBeat(coverage: number[]): number {
  let last = -1;
  coverage.forEach((c, i) => {
    if (c >= COVERED) last = i;
  });
  return Math.max(0, Math.min(last + 1, coverage.length - 1));
}

export function anchorSpoken(anchor: string, transcript: string): boolean {
  if (/\d/.test(anchor)) return transcript.includes(anchor);
  const spoken = new Set(tokenize(transcript).map(normalise).map(stem));
  return spoken.has(stem(normalise(anchor)));
}

// ── The memory ladder ───────────────────────────────────────────────────────
//
// Each rung removes support. Retrieving words from memory (rather than re-reading
// them) is what makes them stick, so the goal is to climb as soon as a rung is easy.

export type LadderLevel = 1 | 2 | 3 | 4;

export const LADDER: { level: LadderLevel; name: string; shows: string; hint: string }[] = [
  { level: 1, name: "Read", shows: "Full script", hint: "Read it aloud to learn the flow and rhythm. Don't try to memorise yet." },
  { level: 2, name: "First letters", shows: "First letter of each word", hint: "Your memory fills in each word. This is where memorising really happens." },
  { level: 3, name: "Anchors", shows: "Three key words per section", hint: "Tell each section in your own words. The exact wording doesn't matter." },
  { level: 4, name: "Stage", shows: "Nothing", hint: "Deliver it for real. Hints appear only if you freeze." },
];

export function ladder(level: LadderLevel) {
  return LADDER[level - 1];
}

// ── Scoring ─────────────────────────────────────────────────────────────────

export interface StageScore {
  /** Recall for speeches, structure for impromptu: 0–40. */
  content: number;
  pace: number;
  clarity: number;
  independence: number;
  total: number;
}

export function scoreTake(m: SpeechMetrics, contentShare: number, net: SafetyNetUsage | null): StageScore {
  const clamp = (v: number, max: number) => Math.max(0, Math.min(max, Math.round(v)));
  const pace =
    m.paceVerdict === "insufficient" ? 6 : m.paceVerdict === "steady" ? 20 : 20 - Math.abs(m.wpm - (m.wpm < PACE.min ? PACE.min : PACE.max)) * 0.4;
  const fillerRate = m.wordCount ? (m.fillerTotal / m.wordCount) * 100 : 0;
  const clarity = m.wordCount < 15 ? 6 : 20 - fillerRate * 2.5;
  const independence = !net ? 20 : net.level === 1 ? 12 : 6;
  const parts = {
    content: clamp(contentShare * 40, 40),
    pace: clamp(pace, 20),
    clarity: clamp(clarity, 20),
    independence: clamp(independence, 20),
  };
  return { ...parts, total: parts.content + parts.pace + parts.clarity + parts.independence };
}

export function recommend(level: LadderLevel, recall: number, netUsed: boolean): { next: LadderLevel; message: string } {
  if (recall >= 0.85 && (!netUsed || level === 1)) {
    if (level < 4) {
      const up = (level + 1) as LadderLevel;
      return { next: up, message: `You've got this rung. Move up to "${ladder(up).name}": less on screen, more from memory.` };
    }
    return { next: 4, message: "Delivered from memory. Now keep it fresh: short rehearsals spaced over the next few days lock it in." };
  }
  if (recall >= 0.6) return { next: level, message: "Nearly there. One more take at this level usually makes it click." };
  if (level > 1) {
    const down = (level - 1) as LadderLevel;
    return { next: down, message: `Step back to "${ladder(down).name}" for one take. Rebuilding the path is faster than forcing it.` };
  }
  return { next: 1, message: "Read it through a couple more times, out loud. Try practising one section at a time." };
}

// ── Saved speeches + spaced rehearsal ───────────────────────────────────────

export interface Attempt {
  at: string;
  level: LadderLevel;
  recall: number;
  score: number;
  netUsed: boolean;
}

export interface SavedSpeech {
  id: string;
  title: string;
  text: string;
  level: LadderLevel;
  updatedAt: string;
  attempts: Attempt[];
}

const SPEECHES_KEY = "ceo-voice.stage-speeches";

export function loadSpeeches(): SavedSpeech[] {
  try {
    return JSON.parse(localStorage.getItem(SPEECHES_KEY) ?? "[]") as SavedSpeech[];
  } catch {
    return [];
  }
}

export function saveSpeeches(list: SavedSpeech[]) {
  try {
    localStorage.setItem(SPEECHES_KEY, JSON.stringify(list));
  } catch {
    /* storage unavailable: the session still works, it just won't persist */
  }
}

/** Gaps between rehearsals once a speech is solid. Recalling after a gap is what moves it to long-term memory. */
const REVIEW_DAYS = [1, 2, 4, 7, 14, 30];
const DAY = 86_400_000;

function isSolid(a: Attempt) {
  return a.level >= 3 && a.recall >= 0.85;
}

/** When to rehearse next. `null` means now. */
export function nextReview(s: SavedSpeech): Date | null {
  const last = s.attempts.at(-1);
  if (!last || !isSolid(last)) return null;
  // Count solid days in a row (several good takes on one day count once).
  const days = new Set<string>();
  for (let i = s.attempts.length - 1; i >= 0 && isSolid(s.attempts[i]); i--) days.add(s.attempts[i].at.slice(0, 10));
  const gap = REVIEW_DAYS[Math.min(days.size, REVIEW_DAYS.length) - 1];
  return new Date(new Date(last.at).getTime() + gap * DAY);
}

export function reviewLabel(s: SavedSpeech): { label: string; due: boolean } {
  const next = nextReview(s);
  if (!s.attempts.length) return { label: "Not rehearsed yet", due: true };
  if (!next || next.getTime() <= Date.now()) return { label: "Rehearse today", due: true };
  const days = Math.ceil((next.getTime() - Date.now()) / DAY);
  return { label: days <= 1 ? "Next rehearsal tomorrow" : `Next rehearsal in ${days} days`, due: false };
}

// ── Speech templates (use cases) ────────────────────────────────────────────

export const TEMPLATES: { id: string; title: string; when: string; text: string }[] = [
  {
    id: "intro",
    title: "Self-introduction",
    when: "New team, networking event, first day",
    text: `Hi everyone, I'm [name]. I work as a [role] at [company], where I focus on [main area].

Before this, I spent [number] years in [previous field], and the thing I'm proudest of is [one achievement].

What I enjoy most is [what energises you], and I'm always happy to talk about [topic people can ask you about].

I'm looking forward to working with all of you. Please come and say hello.`,
  },
  {
    id: "pitch",
    title: "Elevator pitch",
    when: "60 seconds to explain what you do",
    text: `You know how [audience] struggle with [problem]? It costs them [time, money or stress].

I help them [solve it] by [your approach]. Unlike [usual alternative], we [key difference].

For example, [client or project] went from [before] to [after] in [time].

If that sounds useful, I'd love to [clear next step: a call, a demo, a coffee].`,
  },
  {
    id: "update",
    title: "Team meeting update",
    when: "Weekly status, stand-up, project review",
    text: `Quick update on [project]. The headline: we are [on track / behind / ahead].

This week we finished [milestone], which means [why it matters to the team].

One risk: [risk]. My plan is to [mitigation], and I'll need [help or decision] from [person or team].

Next week we'll focus on [next milestone]. Happy to take questions.`,
  },
  {
    id: "present",
    title: "Presentation opening",
    when: "First two minutes of a talk or demo",
    text: `Good morning. In the next [number] minutes, I'll show you how we can [outcome the audience cares about].

Here's why this matters now: [surprising fact or number].

I'll cover three things: first, [point one]; second, [point two]; and third, [point three].

By the end, you'll be able to [what they can do or decide]. Let's start with [point one].`,
  },
  {
    id: "toast",
    title: "Toast or farewell",
    when: "Wedding, retirement, leaving party",
    text: `Good evening, everyone. For those who don't know me, I'm [name], and I've known [person] for [time].

The first time I met [person], [short, warm story].

What I admire most is [quality], and I've seen it every time [example].

So please raise your glasses: to [person], and to [wish for the future].`,
  },
  {
    id: "qa",
    title: "Answering a tough question",
    when: "Q&A after a talk, challenging meeting",
    text: `That's a fair question, thank you for raising it.

The short answer is [direct answer in one sentence].

The reason is [one clear reason], and you can see it in [evidence or example].

What I'd suggest next is [action]. Does that address your concern?`,
  },
];

// ── Impromptu speaking ──────────────────────────────────────────────────────
//
// When you can't memorise, memorise a *shape* instead. A framework gives every
// answer the same four-step path, so there's always a next step to reach for.

export interface FrameworkStep {
  label: string;
  job: string;
  starter: string;
  /** Signpost phrases that show this step was delivered. `null` = ticks once the speaker gets going. */
  cue: RegExp | null;
}

export interface Framework {
  id: string;
  name: string;
  bestFor: string;
  steps: FrameworkStep[];
}

export const FRAMEWORKS: Framework[] = [
  {
    id: "prep",
    name: "PREP",
    bestFor: "Opinions and \"what do you think about…\"",
    steps: [
      { label: "Point", job: "Say your answer in one sentence.", starter: "My view is simple: …", cue: null },
      { label: "Reason", job: "Give the main reason.", starter: "The main reason is …", cue: /\b(because|the (main |key |biggest )?reason|that'?s why|this is why|since)\b/ },
      { label: "Example", job: "Make it real with one example.", starter: "For example, …", cue: /\b(for (example|instance)|one time|i remember|let me give you|a good example|when i was)\b/ },
      { label: "Point", job: "Repeat your point, then stop.", starter: "So that's why I believe …", cue: /\b(so that'?s why|that'?s why|which is why|in (short|summary|conclusion)|to (sum up|summari[sz]e|conclude)|overall|so,? in the end|so my (answer|view|point))\b/ },
    ],
  },
  {
    id: "ppf",
    name: "Past · Present · Future",
    bestFor: "Introductions, \"tell us about…\", your career",
    steps: [
      { label: "Past", job: "Where it started.", starter: "A few years ago, …", cue: null },
      { label: "Present", job: "Where things are now.", starter: "Today, …", cue: /\b(today|now|currently|these days|at the moment|nowadays|right now|at present)\b/ },
      { label: "Future", job: "Where it's going next.", starter: "Looking ahead, …", cue: /\b(in the future|going forward|looking ahead|next (year|step|month)|my goal|i plan|i hope|i'?d (like|love) to|i want to|will)\b/ },
    ],
  },
  {
    id: "psb",
    name: "Problem · Solution · Benefit",
    bestFor: "Proposals, persuading, work stories",
    steps: [
      { label: "Problem", job: "Name the problem clearly.", starter: "The problem is …", cue: null },
      { label: "Solution", job: "Say what you'd do (or did).", starter: "What I'd suggest is …", cue: /\b(solution|to (solve|fix)|so (we|i) (decided|built|changed|started)|what i'?d (suggest|recommend|do)|my (suggestion|proposal|recommendation)|we (should|could)|the (answer|fix))\b/ },
      { label: "Benefit", job: "Say why it's worth it.", starter: "The benefit is …", cue: /\b(benefit|as a result|which means|this (means|saves|helps)|the result|the (impact|outcome)|so that|that way)\b/ },
    ],
  },
  {
    id: "what",
    name: "What · So what · Now what",
    bestFor: "Updates, news, lessons learned",
    steps: [
      { label: "What", job: "Describe what happened.", starter: "Here's what happened: …", cue: null },
      { label: "So what", job: "Explain why it matters.", starter: "This matters because …", cue: /\b(this matters|it matters|(it'?s |this is )?important because|which means|the reason (it|this) matters|so what|the impact)\b/ },
      { label: "Now what", job: "Say what should happen next.", starter: "So next, I suggest …", cue: /\b(next|going forward|i (suggest|recommend)|we should|let'?s|my (suggestion|recommendation)|from now on)\b/ },
    ],
  },
];

/** Which framework steps have been delivered, in order: each step's signpost must come after the previous one. */
export function frameworkProgress(transcript: string, fw: Framework): boolean[] {
  const lower = transcript.toLowerCase();
  const words = tokenize(transcript).length;
  let pos = 0;
  return fw.steps.map((step) => {
    if (!step.cue) return words >= 6;
    const re = new RegExp(step.cue.source, "gi");
    re.lastIndex = pos;
    const m = re.exec(lower);
    if (!m) return false;
    pos = m.index + m[0].length;
    return true;
  });
}

export type TopicCategory = "Work" | "Leadership" | "Opinion" | "Personal";

export const TOPICS: { text: string; category: TopicCategory; framework: string }[] = [
  { text: "Introduce yourself to a new team in under a minute.", category: "Work", framework: "ppf" },
  { text: "What's one tool or habit that makes you better at your job?", category: "Work", framework: "prep" },
  { text: "Your project is two weeks late. Update the stakeholders.", category: "Work", framework: "what" },
  { text: "Pitch one change that would make your team's meetings better.", category: "Work", framework: "psb" },
  { text: "Explain what your company does to a 12-year-old.", category: "Work", framework: "psb" },
  { text: "Tell us about a mistake at work and what it taught you.", category: "Work", framework: "what" },
  { text: "How has your industry changed since you joined it?", category: "Work", framework: "ppf" },
  { text: "What makes a great manager?", category: "Leadership", framework: "prep" },
  { text: "Should leaders always have the answer?", category: "Leadership", framework: "prep" },
  { text: "Convince your team to adopt a new way of working.", category: "Leadership", framework: "psb" },
  { text: "How do you give difficult feedback?", category: "Leadership", framework: "prep" },
  { text: "Describe the best leader you've worked with.", category: "Leadership", framework: "ppf" },
  { text: "Your team just missed a big target. Speak to them.", category: "Leadership", framework: "what" },
  { text: "Should everyone work from the office?", category: "Opinion", framework: "prep" },
  { text: "Is AI going to make work better or worse?", category: "Opinion", framework: "prep" },
  { text: "Is it better to be a specialist or a generalist?", category: "Opinion", framework: "prep" },
  { text: "What is one thing schools should teach but don't?", category: "Opinion", framework: "psb" },
  { text: "Is social media good for professionals?", category: "Opinion", framework: "prep" },
  { text: "What advice would you give your younger self?", category: "Personal", framework: "ppf" },
  { text: "Tell us about a place that changed how you think.", category: "Personal", framework: "ppf" },
  { text: "Describe a skill you learned as an adult.", category: "Personal", framework: "ppf" },
  { text: "Convince us to try your favourite food.", category: "Personal", framework: "psb" },
  { text: "Who has influenced you the most, and why?", category: "Personal", framework: "prep" },
  { text: "What does success mean to you?", category: "Personal", framework: "prep" },
];
