import { type CareerLevel, levelFromRole, type ProfessionId, PROFESSIONS, type TrackId } from "./curriculum";

// Onboarding: a few questions turn a new learner into a personal plan, which drives
// the Roadmap (track order, starting stages) and the AI-generated starter content.

export type Goal = "interview" | "leader" | "speak" | "all";
export type Struggle = "freeze" | "fillers" | "words" | "structure" | "confidence";

export interface OnboardingAnswers {
  name: string;
  goal: Goal;
  /** YYYY-MM-DD, or "" when there's no interview scheduled. */
  interviewDate: string;
  profession: ProfessionId;
  professionOther: string;
  jobTitle: string;
  targetRole: string;
  industry: string;
  years: string;
  struggles: Struggle[];
  minutesPerDay: 5 | 10 | 20;
  /** Optional job description to tailor the starter questions. */
  jobDescription: string;
}

export interface Plan {
  trackOrder: TrackId[];
  currentLevel: CareerLevel | null;
  targetLevel: CareerLevel | null;
  /** Days until the interview, when one is scheduled. */
  daysToInterview: number | null;
  minutesPerDay: number;
  focus: string[];
}

export interface Onboarding {
  answers: OnboardingAnswers;
  plan: Plan;
  completedAt: string;
}

export const ONBOARDING_KEY = "ceo-voice.onboarding";

export const EMPTY_ANSWERS: OnboardingAnswers = {
  name: "",
  goal: "all",
  interviewDate: "",
  profession: "technology",
  professionOther: "",
  jobTitle: "",
  targetRole: "",
  industry: "",
  years: "",
  struggles: [],
  minutesPerDay: 10,
  jobDescription: "",
};

export const GOALS: { id: Goal; name: string; body: string }[] = [
  { id: "interview", name: "Win my next interview", body: "Answers for my role, my CV, and the tough questions." },
  { id: "leader", name: "Grow as a leader", body: "Speak and act like the next level up." },
  { id: "speak", name: "Speak with confidence", body: "Presentations, meetings, thinking on my feet." },
  { id: "all", name: "All of these", body: "A balanced plan across every track." },
];

export const STRUGGLES: { id: Struggle; name: string; drill: string }[] = [
  { id: "freeze", name: "My mind goes blank", drill: "Cheat-code recall and the Safety Net: three words so you never freeze." },
  { id: "fillers", name: "Too many “um” and “like”", drill: "Live filler meter and power pauses in every answer." },
  { id: "words", name: "Finding the right English words", drill: "Hedged-to-executive vocabulary drills, daily." },
  { id: "structure", name: "My answers ramble", drill: "Rule-of-three sprints: opening, First, Second, Third, landing line." },
  { id: "confidence", name: "I don't sound confident", drill: "Mindset talks plus pace and presence coaching." },
];

const ORDER: Record<Goal, TrackId[]> = {
  interview: ["interview", "communication", "speaking", "leadership", "mindset"],
  leader: ["leadership", "communication", "speaking", "interview", "mindset"],
  speak: ["speaking", "communication", "mindset", "leadership", "interview"],
  all: ["interview", "leadership", "speaking", "communication", "mindset"],
};

export function buildPlan(a: OnboardingAnswers, now = new Date()): Plan {
  const days = a.interviewDate ? Math.ceil((Date.parse(`${a.interviewDate}T23:59:59`) - now.getTime()) / 86_400_000) : null;
  const soon = days !== null && days >= 0 && days <= 30;
  const order = soon ? (["interview", ...ORDER[a.goal].filter((t) => t !== "interview")] as TrackId[]) : ORDER[a.goal];
  const currentLevel = levelFromRole(a.jobTitle);
  return {
    trackOrder: order,
    currentLevel,
    targetLevel: levelFromRole(a.targetRole) ?? currentLevel,
    daysToInterview: days !== null && days >= 0 ? days : null,
    minutesPerDay: a.minutesPerDay,
    focus: STRUGGLES.filter((s) => a.struggles.includes(s.id)).map((s) => s.drill),
  };
}

export function professionName(a: Pick<OnboardingAnswers, "profession" | "professionOther">) {
  return a.profession === "other" ? a.professionOther.trim() || "your field" : (PROFESSIONS.find((p) => p.id === a.profession)?.name ?? "your field");
}

export function loadOnboarding(): Onboarding | null {
  try {
    const raw = JSON.parse(localStorage.getItem(ONBOARDING_KEY) ?? "null") as Onboarding | null;
    return raw?.answers ? raw : null;
  } catch {
    return null;
  }
}

export function saveOnboarding(o: Onboarding) {
  try {
    localStorage.setItem(ONBOARDING_KEY, JSON.stringify(o));
  } catch {
    /* storage unavailable */
  }
}

/** A starter question generated for one learner (by AI or the offline templates). */
export interface StarterItem {
  stage: string;
  topic: string;
  question: string;
  opening: string;
  pillars: { key: string; tag: string; text: string }[];
  close: string;
}
