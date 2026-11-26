// Cross-module practice log: every spoken take and drill rep, so the mastery dashboard can show
// pace and filler trends across the Interview Simulator, Leadership Practice, Stage and Vocabulary.

export type ProgressSource = "interview" | "leadership" | "mock" | "stage" | "impromptu" | "sprint" | "vocabulary" | "hero";

export interface ProgressEvent {
  at: string;
  day: string;
  source: ProgressSource;
  /** 0 when not spoken (typed answers, vocabulary reps). */
  wpm: number;
  words: number;
  fillers: number;
  durationSec: number;
  score?: number;
}

const KEY = "ceo-voice.progress";

export function dayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function loadProgress(): ProgressEvent[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]") as unknown;
    return Array.isArray(raw) ? (raw as ProgressEvent[]) : [];
  } catch {
    return [];
  }
}

export function logProgress(e: Omit<ProgressEvent, "at" | "day">) {
  try {
    const now = new Date();
    const next = [...loadProgress(), { ...e, at: now.toISOString(), day: dayKey(now) }].slice(-600);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* non-critical */
  }
}

/** Log a spoken take from its metrics. */
export function logTake(source: ProgressSource, m: { wpm: number; wordCount: number; fillerTotal: number; durationSec: number }, score?: number) {
  logProgress({ source, wpm: m.durationSec > 0 ? m.wpm : 0, words: m.wordCount, fillers: m.fillerTotal, durationSec: m.durationSec, score });
}

/** Consecutive days with any practice, counting back from today (or yesterday if today isn't done yet). */
export function streakOf(days: Iterable<string>): number {
  const set = new Set(days);
  const d = new Date();
  if (!set.has(dayKey(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (set.has(dayKey(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

export interface ProgressSummary {
  drills: number;
  drillsToday: number;
  avgWpm: number | null;
  /** Fillers per 100 words for the most recent spoken takes, oldest first. */
  fillerTrend: number[];
  fillerChange: "better" | "worse" | "flat" | null;
  days: string[];
}

export function summarize(events: ProgressEvent[]): ProgressSummary {
  const today = dayKey();
  const spoken = events.filter((e) => e.wpm > 0 && e.words >= 15);
  const recent = spoken.slice(-10);
  const trend = events
    .filter((e) => e.words >= 15)
    .slice(-12)
    .map((e) => +((e.fillers / e.words) * 100).toFixed(1));
  let change: ProgressSummary["fillerChange"] = null;
  if (trend.length >= 4) {
    const half = Math.floor(trend.length / 2);
    const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    const diff = avg(trend.slice(half)) - avg(trend.slice(0, half));
    change = diff < -0.3 ? "better" : diff > 0.3 ? "worse" : "flat";
  }
  return {
    drills: events.length,
    drillsToday: events.filter((e) => e.day === today).length,
    avgWpm: recent.length ? Math.round(recent.reduce((a, e) => a + e.wpm, 0) / recent.length) : null,
    fillerTrend: trend,
    fillerChange: change,
    days: [...new Set(events.map((e) => e.day))],
  };
}
