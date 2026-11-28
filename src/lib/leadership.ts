import { anchorSpoken, type Beat, beatCoverage, COVERED, firstLetters, pickAnchors } from "./stage";
import { CRAFT_CARDS } from "./leadership-craft";
import { stem, tokenize } from "./speech-metrics";

// ── Answer cards ────────────────────────────────────────────────────────────
//
// Every answer has the same shape: an opening line, three pillars, a landing line.
// The cheat code is the three pillar keys. Remember three words and the
// whole answer unfolds from them, so there's never a blank moment.

export interface Pillar {
  /** The cheat-code word, e.g. "Automation". */
  key: string;
  /** Short memory tag shown beside the key, e.g. "CI/CD". */
  tag: string;
  /** The heading inside the answer, e.g. "Rapid Roadblock Removal". */
  title: string;
  text: string;
  /** Words that show this pillar was delivered, even in your own wording. */
  cues: string[];
}

export type Category = "Business" | "Technical" | "Leadership" | "CV" | "Role" | "Craft" | "Topic" | "Library";
/** Questions an interviewer asks. */
export const INTERVIEW_CATEGORIES: Category[] = ["Role", "Business", "Technical", "Leadership", "CV"];
/** Things a leader talks about: leadership craft and your own topics. */
export const TALK_CATEGORIES: Category[] = ["Craft", "Topic"];
/** Topics published from the admin Topic Library (motivation, mindset…), grouped by `section`. */
export const LIBRARY_CATEGORIES: Category[] = ["Library"];
/** Spoken talks rather than interview answers. */
export const isTalk = (c: Category) => TALK_CATEGORIES.includes(c) || LIBRARY_CATEGORIES.includes(c);
export const CATEGORY_LABEL: Record<Category, string> = {
  Business: "Business",
  Technical: "Technical",
  Leadership: "Leadership",
  CV: "My CV",
  Role: "My role",
  Craft: "Leadership craft",
  Topic: "My topics",
  Library: "Topic library",
};

export interface AnswerCard {
  id: string;
  category: Category;
  /** Short name for lists, e.g. "Delivery velocity". */
  topic: string;
  question: string;
  opening: string;
  pillars: Pillar[];
  close: string;
  /** For topics: the original text you pasted, to re-read before practising. */
  source?: string;
  /** For Topic Library cards: display group (the stage name). */
  section?: string;
  /** Curriculum stage (lib/curriculum.ts); built-in cards are mapped in curriculum.ts. */
  stage?: string;
  /** Library items: an interview question to answer, or a talk to give. */
  kind?: "question" | "talk";
  /** Library items: professions this suits (empty = all). */
  professions?: string[];
  /** For CV questions: short phrases from the CV this question probes (used to highlight the CV). */
  cvMatch?: string[];
  custom?: boolean;
}

const BASE_CARDS: AnswerCard[] = [
  // Neutral examples that suit any profession. They show the shape (opening, three pillars,
  // landing line). Each learner's own answers live in their account, never in this file.
  {
    id: "ex-about-me",
    category: "Business",
    topic: "Tell me about yourself",
    question: "Tell me about yourself and your background.",
    opening: `I'm a professional with [X] years of experience in [your field], and my career is built on three strengths.`,
    pillars: [
      {
        key: "Expertise",
        tag: "Your craft",
        title: "Deep Expertise",
        text: `First, Expertise: I have built strong skills in [your core area], and I'm known for getting the details right on work that matters.`,
        cues: ["expertise", "skills", "experience", "known"],
      },
      {
        key: "Results",
        tag: "One number",
        title: "Measurable Results",
        text: `Second, Results: In my last role I [delivered a result], which [saved time, money or risk] by [a number].`,
        cues: ["results", "delivered", "saved", "improved"],
      },
      {
        key: "People",
        tag: "Trust",
        title: "Working Through People",
        text: `Third, People: I work well across teams. I build trust early, so people bring me problems before they become crises.`,
        cues: ["people", "teams", "trust", "stakeholders"],
      },
    ],
    close: `That's why I'm excited about this role at {company}: it uses all three on day one.`,
  },
  {
    id: "ex-why-role",
    category: "Role",
    topic: "Why this role",
    question: "Why do you want this role, and why now?",
    opening: `There are three reasons this role is the right next step for me.`,
    pillars: [
      {
        key: "Fit",
        tag: "Skills match",
        title: "A Strong Fit",
        text: `First, Fit: The role needs [the key skill in the job description], which is exactly what I've done for the last few years.`,
        cues: ["fit", "match", "skills", "experience"],
      },
      {
        key: "Growth",
        tag: "Next level",
        title: "The Right Stretch",
        text: `Second, Growth: It gives me more scope, with bigger decisions and more impact, which is where I want to grow next.`,
        cues: ["growth", "scope", "impact", "next"],
      },
      {
        key: "Mission",
        tag: "Why them",
        title: "Their Mission",
        text: `Third, Mission: I respect what {company} is building, and I want my work to contribute to it directly.`,
        cues: ["mission", "values", "building", "contribute"],
      },
    ],
    close: `So it's the right skills, the right stretch, and the right place.`,
  },
  {
    id: "ex-stakeholder",
    category: "Leadership",
    topic: "Difficult stakeholder",
    question: "Tell me about a time you worked with a difficult stakeholder.",
    opening: `With difficult stakeholders, I follow three steps, and one example shows how.`,
    pillars: [
      {
        key: "Listen",
        tag: "Understand first",
        title: "Listen First",
        text: `First, Listen: I met them one-to-one to understand what they really needed and what worried them. Usually the conflict is about a hidden concern.`,
        cues: ["listen", "understand", "concern", "needed"],
      },
      {
        key: "Align",
        tag: "Shared goal",
        title: "Find the Shared Goal",
        text: `Second, Align: I tied the work back to a goal we both cared about, so the conversation moved from "me versus you" to "us versus the problem".`,
        cues: ["align", "goal", "shared", "together"],
      },
      {
        key: "Follow through",
        tag: "Keep promises",
        title: "Follow Through",
        text: `Third, Follow through: I kept them updated, delivered what I promised, and the relationship became one of my strongest.`,
        cues: ["follow", "updated", "delivered", "relationship"],
      },
    ],
    close: `Difficult stakeholders often become your best allies when they feel heard.`,
  },
  {
    id: "ex-mistake",
    category: "Leadership",
    topic: "A mistake you learned from",
    question: "Tell me about a mistake you made and what you learned.",
    opening: `Early in my career I made a mistake that taught me a lesson I still use. I'll share it in three parts.`,
    pillars: [
      {
        key: "Own",
        tag: "No excuses",
        title: "Own It",
        text: `First, Own: I [describe the mistake briefly]. When I saw it, I told my manager straight away instead of hoping no one would notice.`,
        cues: ["own", "mistake", "told", "responsibility"],
      },
      {
        key: "Fix",
        tag: "Act fast",
        title: "Fix It",
        text: `Second, Fix: I put a plan in place the same day to limit the impact, and we [the fix and the result].`,
        cues: ["fix", "plan", "impact", "resolved"],
      },
      {
        key: "Prevent",
        tag: "New habit",
        title: "Prevent It",
        text: `Third, Prevent: I changed how I work. Now I [the new habit or check], and it hasn't happened again.`,
        cues: ["prevent", "changed", "habit", "check"],
      },
    ],
    close: `Mistakes happen; what matters is how fast you own them and what you change.`,
  },
  {
    id: "ex-your-questions",
    category: "Business",
    topic: "Your questions for us",
    question: "Do you have any questions for us?",
    opening: `Yes, I have three questions.`,
    pillars: [
      {
        key: "Success",
        tag: "First year",
        title: "What Success Looks Like",
        text: `First, Success: What would a great first year in this role look like to you?`,
        cues: ["success", "first year", "great"],
      },
      {
        key: "Challenge",
        tag: "Biggest problem",
        title: "The Biggest Challenge",
        text: `Second, Challenge: What is the biggest challenge the team is facing right now?`,
        cues: ["challenge", "facing", "problem"],
      },
      {
        key: "Team",
        tag: "Culture",
        title: "The Team",
        text: `Third, Team: How would you describe the team I'd be working with, and how do they like to work?`,
        cues: ["team", "culture", "describe"],
      },
    ],
    close: `Thank you, that helps me picture how I'd add value from day one.`,
  },
  // ── Topics ──
  {
    id: "topic-winning-mindset",
    category: "Topic",
    topic: "Winning starts in the mind",
    question: `Share the key ideas of "Winning starts here" in your own words.`,
    opening: `Winning starts in the mind, long before it shows in our actions. There are three ideas I take from this.`,
    pillars: [
      {
        key: "Mindset",
        tag: "Thinking guides effort",
        title: "Mindset Comes First",
        text: `First, Mindset: When my thinking is clear and strong, my effort becomes powerful; when it's weak, effort feels scattered. Winning thinking is not always positive, it's honest: it sees problems as real, but manageable.`,
        cues: ["mindset", "thinking", "effort", "honest"],
      },
      {
        key: "Ownership",
        tag: "Control what you let in",
        title: "Own Your Inner World",
        text: `Second, Ownership: I can't control everything outside, but I control what I let inside. I pause and ask: Is this thought helpful? Is it true? Does it move me forward? And I replace "I cannot" with "I don't know yet."`,
        cues: ["ownership", "control", "helpful", "inside"],
      },
      {
        key: "Habits",
        tag: "Repetition replaces",
        title: "Thoughts Are Habits",
        text: `Third, Habits: Thoughts are habits. Repetition created them, and repetition can replace them. After a mistake I correct instead of criticize, and ask, "What can I do next?" Each small choice is proof, and proof becomes confidence.`,
        cues: ["habits", "repetition", "correct", "proof", "confidence"],
      },
    ],
    close: `So I start each day deliberately: focus on what I can control, take one step, and let progress build my confidence.`,
    source: `Winning starts with your mindset. It's not just about what you have or who's on your side, because circumstances can change in an instant. True victory begins quietly within your thoughts. Your mind is the starting point because it guides your efforts. When your thinking is strong and clear, your actions become powerful; if it's weak, your efforts can feel scattered.

It's not about always being positive. It's about being honest and responsible. Winning thinking acknowledges problems but refuses to be defeated by them. You can't control everything outside, but you can control what you let inside. Winning thinking pauses to ask: "Is this thought helpful? Is it true? Does it push me forward?" That pause creates space for better choices.

Thoughts are habits, and habits can be changed. Repetition created them, and repetition can replace them. Pay attention to how you talk to yourself after a mistake. Do you criticize or do you correct? Correction asks, "What can I do next?" Each time you choose a helpful thought, you create proof, and over time those proof points grow into trust in your abilities.

Replace "I cannot" with "I do not know yet." Approach each morning as a fresh start, focusing on what matters and what you can control. The person you are becoming is listening.`,
  },
];

export const DEFAULT_CARDS: AnswerCard[] = [...BASE_CARDS, ...CRAFT_CARDS];

export function cheatCode(card: AnswerCard): string {
  return card.pillars.map((p) => p.key).join(" | ");
}

export function fullAnswer(card: AnswerCard): string {
  return [card.opening, ...card.pillars.map((p) => p.text), card.close].filter(Boolean).join("\n\n");
}

// ── Practice levels (support fades step by step) ───────────────────────────

export type Level = 1 | 2 | 3 | 4;

export const LEVELS: { level: Level; name: string; shows: string; hint: string }[] = [
  { level: 1, name: "Read", shows: "Full answer", hint: "Read it aloud twice. Feel the rhythm: opening, three pillars, landing line." },
  { level: 2, name: "Fill the gaps", shows: "Key words + first letters", hint: "Key words stay, the rest shows its first letter. Your memory fills each gap: this is where the answer starts to stick." },
  { level: 3, name: "Cheat code", shows: "Three pillar words only", hint: "Say it in your own words. Each pillar word unlocks a whole paragraph." },
  { level: 4, name: "Interview", shows: "The question only", hint: "Answer like it's the real thing. A hint appears only if you freeze." },
];

export function levelInfo(l: Level) {
  return LEVELS[l - 1];
}

export function lettersOf(text: string) {
  return firstLetters(text);
}

/** One piece of a fill-in-the-blanks answer: `shown` is visible, `hidden` is the rest of the word to recall. */
export interface ClozeToken {
  shown: string;
  hidden: string;
}

const GLUE = new Set(["a", "an", "the", "i", "we", "my", "our", "to", "of", "in", "on", "at", "by", "for", "and", "or", "but", "so", "is", "it", "as", "be", "was", "are", "with", "that", "this"]);

/**
 * Level 2 "First letters": a readable cloze, not letter soup. Short glue words, numbers,
 * names/acronyms and the "First, Key:" signpost stay whole; other words show their first
 * letter and a gap the length of the rest, so memory fills in each word.
 */
export function clozeOf(text: string): ClozeToken[] {
  const signpost = text.match(/^((?:First|Second|Third|Fourth|Fifth),\s*[^:]{1,40}:\s*)/);
  const head = signpost ? signpost[1] : "";
  const tokens: ClozeToken[] = head ? [{ shown: head, hidden: "" }] : [];
  const parts = text.slice(head.length).split(/(\s+)/);
  parts.forEach((part, i) => {
    const m = part.match(/^([^A-Za-z0-9$]*)([A-Za-z0-9$][\w$%.,'’&/+-]*?)([^A-Za-z0-9%]*)$/);
    if (!m || /^\s+$/.test(part)) {
      tokens.push({ shown: part, hidden: "" });
      return;
    }
    const [, pre, word, post] = m;
    const prev = parts.slice(0, i).join("").trim();
    const sentenceStart = !prev || /[.!?:]$/.test(prev);
    const keep =
      word.length <= 2 ||
      GLUE.has(word.toLowerCase()) ||
      /\d|\$|%/.test(word) ||
      /^[A-Z0-9&/+-]{2,}$/.test(word) || // acronyms: IAM, CTO, AWS
      (!sentenceStart && /^[A-Z]/.test(word)); // names: Guidewire, Okta
    tokens.push(keep ? { shown: part, hidden: "" } : { shown: pre + word[0], hidden: word.slice(1) }, ...(keep || !post ? [] : [{ shown: post, hidden: "" }]));
  });
  return tokens;
}

// ── Live tracking ───────────────────────────────────────────────────────────

/** Opening, each pillar, and landing line as sections, so the shared coverage maths applies. */
export function cardBeats(card: AnswerCard): Beat[] {
  const parts = [card.opening, ...card.pillars.map((p) => p.text), card.close].filter(Boolean);
  return parts.map((text, i) => ({ id: `${card.id}-${i}`, text, anchors: [], opening: text.split(/\s+/).slice(0, 7).join(" ") }));
}

/** Which pillars have been delivered: a cue word was said, or enough of the paragraph's ideas were. */
export function pillarProgress(card: AnswerCard, transcript: string): boolean[] {
  if (!transcript.trim()) return card.pillars.map(() => false);
  const beats = card.pillars.map((p, i) => ({ id: `p${i}`, text: p.text, anchors: [], opening: "" }));
  const coverage = beatCoverage(transcript, beats);
  return card.pillars.map(
    (p, i) => coverage[i] >= COVERED * 0.8 || [p.key, ...p.cues].some((c) => c.split(/\s+/).every((w) => anchorSpoken(w, transcript))),
  );
}

/** How much of the model answer's substance came through (0..1), in any wording. */
export function answerRecall(card: AnswerCard, transcript: string): number {
  const cov = beatCoverage(transcript, cardBeats(card));
  const wordShare = cov.reduce((s, c) => s + Math.min(1, c / COVERED), 0) / Math.max(1, cov.length);
  const pillars = pillarProgress(card, transcript);
  const pillarShare = pillars.filter(Boolean).length / Math.max(1, pillars.length);
  return 0.65 * pillarShare + 0.35 * wordShare;
}

/** Leaders signpost. "First… Second… Third…" tells the listener you're in control. */
export const SIGNPOSTS: { label: string; re: RegExp }[] = [
  { label: "First", re: /\b(first|firstly|first of all|number one|to start)\b/i },
  { label: "Second", re: /\b(second|secondly|next|number two)\b/i },
  { label: "Third", re: /\b(third|thirdly|finally|lastly|number three)\b/i },
];

export function signpostsUsed(transcript: string): boolean[] {
  return SIGNPOSTS.map((s) => s.re.test(transcript));
}

export function recommendLevel(level: Level, recall: number, netUsed: boolean): { next: Level; message: string } {
  if (recall >= 0.8 && (!netUsed || level === 1)) {
    if (level < 4) {
      const up = (level + 1) as Level;
      return { next: up, message: `Solid. Move up to "${levelInfo(up).name}": less on screen, more from you.` };
    }
    return { next: 4, message: "Interview-ready. Keep it fresh: this card comes back in a few days so it stays automatic." };
  }
  if (recall >= 0.55) return { next: level, message: "Close. One more take at this level usually makes it click." };
  if (level > 1) {
    const down = (level - 1) as Level;
    return { next: down, message: `Step back to "${levelInfo(down).name}" for one take. Rebuilding the path is faster than forcing it.` };
  }
  return { next: 1, message: "Read it aloud a couple more times. Focus on the three pillar words." };
}

// ── Progress, spaced review and daily streak ────────────────────────────────

export interface CardProgress {
  /** Spaced-review box: 0 = learning, 5 = long-term. */
  box: number;
  due: string;
  level: Level;
  best: number;
  takes: number;
}

export type DailyTask = "flash" | "facts" | "sprint" | "answer" | "craft";

export interface LeadershipState {
  progress: Record<string, CardProgress>;
  custom: AnswerCard[];
  overrides: Record<string, AnswerCard>;
  /** Days (YYYY-MM-DD) with any practice, for the streak. */
  days: string[];
  today: { date: string; done: DailyTask[] };
  /** The company you're interviewing with; fills `{company}` in answers. Empty = neutral wording. */
  company: string;
  /** Your CV, imported in this browser only. */
  cv: CvDoc | null;
  /** Facts and numbers from your CV to know instantly. */
  facts: CvFact[];
  /** Published Topic Library cards from the admin side (cached so practice works offline). */
  library: AnswerCard[];
  /** From onboarding: the learner's profession, used to filter library content. */
  profession?: string;
  /** Show the built-in example interview answers (default: only until you have answers of your own). */
  showExamples?: boolean;
}

export interface CvDoc {
  fileName: string;
  importedAt: string;
  lines: string[];
}

export interface CvFact {
  id: string;
  q: string;
  a: string;
}

const KEY = "ceo-voice.leadership";
const DAY = 86_400_000;
/** Days until the next review for each box. Recalling after a gap is what makes memory last. */
const BOX_DAYS = [0, 1, 2, 4, 7, 14];

export function todayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function emptyState(): LeadershipState {
  return { progress: {}, custom: [], overrides: {}, days: [], today: { date: todayKey(), done: [] }, company: "", cv: null, facts: [], library: [] };
}

export function loadState(): LeadershipState {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<LeadershipState> | null;
    const s = { ...emptyState(), ...(raw ?? {}) };
    if (s.today.date !== todayKey()) s.today = { date: todayKey(), done: [] };
    // Cards saved before categories existed.
    s.custom = s.custom.map((c) => ({ ...c, category: c.category ?? "Business" }));
    for (const id of Object.keys(s.overrides)) s.overrides[id] = { ...s.overrides[id], category: s.overrides[id].category ?? DEFAULT_CARDS.find((d) => d.id === id)?.category ?? "Business" };
    // Edits to built-in answers that no longer ship with the app become the learner's own cards (same id, so progress stays).
    for (const [id, card] of Object.entries(s.overrides)) {
      if (DEFAULT_CARDS.some((d) => d.id === id)) continue;
      if (!s.custom.some((c) => c.id === id)) s.custom.push({ ...card, custom: true });
      delete s.overrides[id];
    }
    return s;
  } catch {
    return emptyState();
  }
}

export function saveState(s: LeadershipState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable: practice still works, it just won't persist */
  }
}

/** Raw cards, with `{company}` placeholders intact (for editing). */
export function rawCards(s: LeadershipState): AnswerCard[] {
  // Built-in interview answers are neutral examples; once the learner has their own answers, they step aside.
  const showExamples = s.showExamples ?? !s.custom.some((c) => INTERVIEW_CATEGORIES.includes(c.category));
  const defaults = DEFAULT_CARDS.filter((c) => showExamples || !INTERVIEW_CATEGORIES.includes(c.category)).map((c) => s.overrides[c.id] ?? c);
  const library = (s.library ?? []).filter((c) => !s.profession || !c.professions?.length || c.professions.includes(s.profession));
  return [...defaults, ...s.custom, ...library];
}

/** Fills `{company}` / `{Company}` with the target company, or a neutral phrase when none is set. */
export function fillCompany(text: string, company: string): string {
  const name = company.trim();
  return text.replace(/\{company\}/g, name || "your organization").replace(/\{Company\}/g, name || "Your organization");
}

function fillCard(card: AnswerCard, company: string): AnswerCard {
  const f = (t: string) => fillCompany(t, company);
  return {
    ...card,
    topic: f(card.topic),
    question: f(card.question),
    opening: f(card.opening),
    close: f(card.close),
    pillars: card.pillars.map((p) => ({ ...p, title: f(p.title), text: f(p.text) })),
  };
}

/** Cards ready to practise, with the target company filled in. */
export function allCards(s: LeadershipState): AnswerCard[] {
  return rawCards(s).map((c) => fillCard(c, s.company));
}

export function progressOf(s: LeadershipState, id: string): CardProgress {
  return s.progress[id] ?? { box: 0, due: new Date(0).toISOString(), level: 1, best: 0, takes: 0 };
}

export function isDue(p: CardProgress) {
  return new Date(p.due).getTime() <= Date.now();
}

/** Due cards first (weakest box first), then the rest. */
export function reviewOrder(s: LeadershipState): AnswerCard[] {
  const cards = allCards(s);
  return [...cards].sort((a, b) => {
    const pa = progressOf(s, a.id);
    const pb = progressOf(s, b.id);
    const da = isDue(pa) ? 0 : 1;
    const db = isDue(pb) ? 0 : 1;
    return da - db || pa.box - pb.box || new Date(pa.due).getTime() - new Date(pb.due).getTime();
  });
}

export function dueLabel(p: CardProgress): { label: string; due: boolean } {
  if (!p.takes && p.box === 0) return { label: "New", due: true };
  if (isDue(p)) return { label: "Review today", due: true };
  const days = Math.ceil((new Date(p.due).getTime() - Date.now()) / DAY);
  return { label: days <= 1 ? "Review tomorrow" : `Review in ${days} days`, due: false };
}

function markDay(s: LeadershipState, task: DailyTask): LeadershipState {
  const day = todayKey();
  const today = s.today.date === day ? s.today : { date: day, done: [] };
  return {
    ...s,
    days: s.days.includes(day) ? s.days : [...s.days, day].slice(-400),
    today: { date: day, done: today.done.includes(task) ? today.done : [...today.done, task] },
  };
}

/** A recall result moves the card between boxes: remembered → longer gap, forgotten → back to the start. */
export function recordRecall(s: LeadershipState, id: string, remembered: boolean): LeadershipState {
  const p = progressOf(s, id);
  const box = remembered ? Math.min(BOX_DAYS.length - 1, p.box + 1) : 0;
  const due = new Date(Date.now() + BOX_DAYS[box] * DAY).toISOString();
  return { ...s, progress: { ...s.progress, [id]: { ...p, box, due } } };
}

export function recordFlash(s: LeadershipState, id: string, remembered: boolean, task: DailyTask = "flash"): LeadershipState {
  return markDay(recordRecall(s, id, remembered), task);
}

/** Facts due for recall first, weakest box first. */
export function factOrder(s: LeadershipState): CvFact[] {
  return [...s.facts].sort((a, b) => {
    const pa = progressOf(s, a.id);
    const pb = progressOf(s, b.id);
    return (isDue(pa) ? 0 : 1) - (isDue(pb) ? 0 : 1) || pa.box - pb.box;
  });
}

export function recordTake(s: LeadershipState, id: string, take: { level: Level; recall: number; score: number; netUsed: boolean }): LeadershipState {
  const p = progressOf(s, id);
  const next = recommendLevel(take.level, take.recall, take.netUsed).next;
  let out: LeadershipState = {
    ...s,
    progress: { ...s.progress, [id]: { ...p, level: next, best: Math.max(p.best, take.score), takes: p.takes + 1 } },
  };
  // Only unaided takes from memory count as a successful review.
  if (take.level >= 3) out = recordRecall(out, id, take.recall >= 0.8 && !take.netUsed);
  const card = rawCards(s).find((c) => c.id === id);
  return markDay(out, card && isTalk(card.category) ? "craft" : "answer");
}

export function recordSprint(s: LeadershipState): LeadershipState {
  return markDay(s, "sprint");
}

export function streak(s: LeadershipState): number {
  const set = new Set(s.days);
  const d = new Date();
  // Today not done yet doesn't break the streak until tomorrow.
  if (!set.has(todayKey(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (set.has(todayKey(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

// ── Sharp-mind drills ───────────────────────────────────────────────────────

/** Rule-of-three prompts: think in threes and you're never stuck for what comes next. */
export const SPRINT_PROMPTS: string[] = [
  "Three reasons large programs miss their deadlines.",
  "Three things you would do in your first week as a new leader.",
  "Three ways to rebuild trust with an unhappy business partner.",
  "Three signs a squad is about to burn out.",
  "Three questions you ask before approving a business case.",
  "Three lessons from a release that went wrong.",
  "Three ways AI could help a delivery team next quarter.",
  "Three things great leaders do in a crisis.",
  "Three ways to make a status meeting shorter and better.",
  "Three risks of a big-bang migration.",
  "Three things you look for when hiring a delivery manager.",
  "Three ways to say no to a senior executive without damaging the relationship.",
  "Three metrics that tell you a portfolio is healthy.",
  "Three habits that make a leader trusted.",
  "Three ways to bring a vendor back on track.",
  "Three reasons security should start on day one of a project.",
  "Three things you'd tell a new manager on their first day.",
  "Three ways to explain a technical risk to a non-technical board.",
  "Three things that make an agile transformation stick.",
  "Three ways you handle a project that is over budget.",
  "Three things you learned from leading teams at a bank.",
  "Three ways to keep a remote team connected.",
  "Three things you would change in a slow approval process.",
  "Three reasons regulated companies should still move fast.",
];

/** Phrases that fill a pause like a leader, so a blank moment never sounds like one. */
export const BRIDGE_PHRASES: { group: string; when: string; phrases: string[] }[] = [
  {
    group: "Buy thinking time",
    when: "The question lands and your mind is still loading.",
    phrases: [
      "That's a great question. Let me frame it in three parts.",
      "Let me take a moment to give you a precise answer.",
      "I'd look at that from three angles.",
      "The short answer is yes, and here's how I approach it.",
    ],
  },
  {
    group: "Structure on the spot",
    when: "You know the content but need a path through it.",
    phrases: [
      "There are three things that matter here.",
      "Let me start with the outcome, then explain how we got there.",
      "I'll give you the context, the action, and the result.",
      "The principle is simple, and I'll give you an example.",
    ],
  },
  {
    group: "Recover from a blank",
    when: "You lost your thread mid-answer.",
    phrases: [
      "Let me come back to the core point.",
      "To put it simply:",
      "What matters most here is this.",
      "Let me bring that back to the business outcome.",
    ],
  },
  {
    group: "Land it",
    when: "You've said enough. Finish strong and stop.",
    phrases: [
      "So in short:",
      "That's how I keep delivery fast and safe.",
      "And that's the approach I would bring to this role.",
      "Happy to go deeper on any of those.",
    ],
  },
];

export function newCardId() {
  return `custom-${Date.now().toString(36)}`;
}

export function blankCard(): AnswerCard {
  return {
    id: newCardId(),
    topic: "",
    question: "",
    opening: "",
    pillars: [0, 1, 2].map(() => ({ key: "", tag: "", title: "", text: "", cues: [] })),
    close: "",
    category: "Business",
    custom: true,
  };
}

// ── Your own topics ─────────────────────────────────────────────────────────
//
// Paste any article, note or passage. It becomes a practice card: three key
// ideas you can retell from memory, the same way you answer interview questions.

export interface TopicDraft {
  opening: string;
  pillars: { key: string; tag: string; text: string }[];
  close: string;
}

const ORDINALS = ["First", "Second", "Third"];

function sentencesOf(text: string): string[] {
  return (text.replace(/\s+/g, " ").match(/[^.!?]+[.!?]+["')\]”’]*|[^.!?]+$/g) ?? []).map((s) => s.trim()).filter((s) => tokenize(s).length >= 4);
}

const capital = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);

/** Offline draft: split the text into three parts and keep the most central sentences of each. */
export function offlineTopicDraft(title: string, text: string): TopicDraft {
  const sentences = sentencesOf(text);
  const freq = new Map<string, number>();
  for (const w of tokenize(text)) if (w.length > 3) freq.set(stem(w), (freq.get(stem(w)) ?? 0) + 1);
  const score = (s: string) => {
    const words = tokenize(s).filter((w) => w.length > 3);
    return words.reduce((n, w) => n + (freq.get(stem(w)) ?? 0), 0) / Math.sqrt(Math.max(1, tokenize(s).length));
  };

  const per = Math.max(1, Math.ceil(sentences.length / 3));
  const chunks = [0, 1, 2].map((i) => sentences.slice(i * per, (i + 1) * per)).filter((c) => c.length);
  const pillars = chunks.map((chunk, i) => {
    const best = [...chunk].sort((a, b) => score(b) - score(a));
    const picked: string[] = [];
    for (const s of best) {
      if (picked.length && tokenize([...picked, s].join(" ")).length > 45) break;
      picked.push(s);
      if (picked.length === 2) break;
    }
    const ordered = chunk.filter((s) => picked.includes(s));
    const anchors = pickAnchors(chunk.join(" "), 3);
    const key = capital(anchors[0] ?? `Idea ${i + 1}`);
    return { key, tag: anchors.slice(1).map(capital).join(" · "), text: `${ORDINALS[i]}, ${key}: ${ordered.join(" ")}` };
  });
  const top = [...sentences].sort((a, b) => score(b) - score(a))[0] ?? "";
  return {
    opening: `The key ideas of "${title}" come down to three points.`,
    pillars,
    close: top ? `In short: ${top}` : "",
  };
}

/** A published Topic Library topic (from /api/content) as a practice card. */
export function libraryCard(t: {
  id: string;
  section: string;
  professions?: string[];
  stage?: string;
  kind?: "question" | "talk";
  question?: string;
  title: string;
  text: string;
  opening: string;
  pillars: { key: string; tag: string; text: string }[];
  close: string;
}): AnswerCard {
  return {
    id: t.id,
    category: "Library",
    section: t.section,
    stage: t.stage,
    kind: t.kind ?? "talk",
    professions: t.professions ?? [],
    topic: t.title,
    question: t.kind === "question" && t.question ? t.question : `Speak for a minute on "${t.title}". Make your three points.`,
    opening: t.opening,
    pillars: t.pillars.map((p) => ({ key: p.key, tag: p.tag, title: p.key, text: p.text, cues: [p.key, ...p.tag.split(/\s+/)].filter((w) => w.length > 3) })),
    close: t.close,
    source: t.text || undefined,
  };
}

/** Onboarding starter questions → this learner's own "My role" cards. */
export function starterCards(items: { stage: string; topic: string; question: string; opening: string; pillars: { key: string; tag: string; text: string }[]; close: string }[]): AnswerCard[] {
  const seen = new Set<string>();
  return items.map((q, i) => {
    let id = `role-${q.topic.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || i}`;
    if (seen.has(id)) id = `${id}-${i}`;
    seen.add(id);
    return {
      id,
      category: "Role",
      stage: q.stage,
      topic: q.topic,
      question: q.question,
      opening: q.opening,
      pillars: q.pillars.map((p) => ({ key: p.key, tag: p.tag, title: p.key, text: p.text, cues: [p.key, ...p.tag.split(/\s+/)].filter((w) => w.length > 3) })),
      close: q.close,
      custom: true,
    };
  });
}

export function draftToCard(title: string, source: string, d: TopicDraft): AnswerCard {
  return {
    id: newCardId(),
    category: "Topic",
    topic: title,
    question: `Share the key ideas of "${title}" in your own words.`,
    opening: d.opening,
    pillars: d.pillars.map((p) => ({ key: p.key, tag: p.tag, title: p.key, text: p.text, cues: [] })),
    close: d.close,
    source,
    custom: true,
  };
}

// ── Import / export of a learner's own answers ─────────────────────────────

export interface AnswersFile {
  type: "ceo-voice-answers";
  version: 1;
  cards: AnswerCard[];
}

function validCard(c: unknown): c is AnswerCard {
  const x = c as AnswerCard;
  return !!x && typeof x.id === "string" && typeof x.question === "string" && typeof x.opening === "string" && Array.isArray(x.pillars) && typeof x.close === "string";
}

/** Adds cards from an answers file. Cards already in the state (same id) are kept as they are. */
export function importAnswers(s: LeadershipState, file: unknown): { state: LeadershipState; added: number; skipped: number } {
  const cards = (file as Partial<AnswersFile>)?.cards;
  if (!Array.isArray(cards)) throw new Error("That file isn't a CEO Voice answers file.");
  const ok = cards.filter(validCard).slice(0, 200);
  if (!ok.length) throw new Error("No answers found in that file.");
  const have = new Set([...s.custom.map((c) => c.id), ...DEFAULT_CARDS.map((c) => c.id)]);
  const fresh = ok
    .filter((c) => !have.has(c.id))
    .map((c) => ({ ...c, category: c.category ?? "Business", pillars: c.pillars.map((p) => ({ ...p, cues: Array.isArray(p.cues) ? p.cues : [] })), custom: true }));
  return { state: { ...s, custom: [...s.custom, ...fresh] }, added: fresh.length, skipped: ok.length - fresh.length };
}

/** The learner's own interview answers, as a file they can keep or move. */
export function exportAnswers(s: LeadershipState): AnswersFile {
  return { type: "ceo-voice-answers", version: 1, cards: s.custom.filter((c) => INTERVIEW_CATEGORIES.includes(c.category)) };
}
