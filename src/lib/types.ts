export type Industry = "Tech" | "Finance" | "Healthcare" | "Consulting" | "Marketing" | "Operations";
export type StruggleLevel = "Beginner" | "Intermediate" | "Advanced";

export interface InterviewQuestion {
  id: string;
  text: string;
  /** What the interviewer is really testing — shown after the answer. */
  intent: string;
  /** Exactly three anchor keywords offered by the Safety Net. */
  keywords: [string, string, string];
  /** A confident opening line, revealed if the user stays frozen after the keywords. */
  starter: string;
}

export interface SpeechMetrics {
  wordCount: number;
  durationSec: number;
  wpm: number;
  paceVerdict: "too-slow" | "steady" | "too-fast" | "insufficient";
  fillers: Record<string, number>;
  fillerTotal: number;
  weakPhrases: Record<string, number>;
  strongPhrases: Record<string, number>;
}

export interface GrammarCorrection {
  original: string;
  suggestion: string;
  reason: string;
}

export interface AnswerAnalysis {
  corrections: GrammarCorrection[];
  /** The user's own answer, rewritten the way a calm, senior native speaker would say it. */
  executiveRewrite: string;
  /** One sentence of direct coaching, e.g. "You sounded unsure when discussing Python..." */
  coachingNote: string;
  source: "ai" | "offline";
}

export interface SafetyNetUsage {
  /** Seconds of silence before the net fired, or null if the user opened it manually. */
  triggeredAfterSec: number | null;
  level: SafetyNetLevel;
}

/** 0 = hidden, 1 = keywords shown, 2 = keywords + opening line shown. */
export type SafetyNetLevel = 0 | 1 | 2;

export interface AnswerReport {
  question: InterviewQuestion;
  transcript: string;
  metrics: SpeechMetrics;
  keywordsUsed: string[];
  safetyNet: SafetyNetUsage | null;
  presence: PresenceBreakdown;
  analysis: AnswerAnalysis | null;
  /** Camera recording of the answer, if the mirror was on. A blob URL, valid for this tab only. */
  videoUrl?: string | null;
}

export interface PresenceBreakdown {
  pace: number;
  clarity: number;
  authority: number;
  substance: number;
  independence: number;
  total: number;
}
