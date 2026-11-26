// The CEO Voice curriculum: tracks → ordered stages → content items.
// Every practice card (built-in, CV-generated, or published from /admin) belongs to one stage,
// and the roadmap recommends the next stage from the learner's progress and target level.

export type TrackId = "interview" | "leadership" | "speaking" | "communication" | "mindset";

/** Career level, used to start the leadership track at the right rung and to tag content. */
export type CareerLevel = "individual" | "manager" | "director" | "vp" | "csuite";

export const LEVELS: { id: CareerLevel; name: string; short: string }[] = [
  { id: "individual", name: "Individual contributor / team lead", short: "IC / Lead" },
  { id: "manager", name: "Manager (leads people)", short: "Manager" },
  { id: "director", name: "Director (leads managers)", short: "Director" },
  { id: "vp", name: "VP / AVP (leads a function)", short: "VP" },
  { id: "csuite", name: "C-suite (leads the enterprise)", short: "C-suite" },
];

/** Professions the app serves; content can be tagged to one or more (none = every profession). */
export const PROFESSIONS = [
  { id: "technology", name: "Technology & IT", examples: "engineering, delivery, architecture, security, data" },
  { id: "finance", name: "Finance & Accounting", examples: "FP&A, controllership, treasury, investment" },
  { id: "audit", name: "Audit, Risk & Compliance", examples: "internal/external audit, risk, compliance, regulatory" },
  { id: "product", name: "Product & Project", examples: "product owner, product manager, project/program manager, scrum" },
  { id: "operations", name: "Operations & Supply chain", examples: "operations, logistics, procurement, process improvement" },
  { id: "sales", name: "Sales, Marketing & Customer", examples: "sales, account management, marketing, customer success" },
  { id: "people", name: "HR & People", examples: "HR business partner, talent, L&D, recruiting" },
  { id: "healthcare", name: "Healthcare", examples: "clinical, nursing, healthcare administration" },
  { id: "other", name: "Other", examples: "anything else" },
] as const;

export type ProfessionId = (typeof PROFESSIONS)[number]["id"];

/** What a content item asks the learner to do. */
export type ContentKind = "question" | "talk";

export interface Stage {
  id: string;
  name: string;
  /** One-line learning goal shown on the roadmap. */
  goal: string;
  /** What belongs here; guides admins writing content. */
  covers: string[];
  /** Default kind for new content in this stage. */
  kind: ContentKind;
  /** Leadership ladder rung, when the stage is a level. */
  level?: CareerLevel;
  /** Personal stages are generated per learner (CV, job description), never authored centrally. */
  personal?: boolean;
}

export interface Track {
  id: TrackId;
  name: string;
  tagline: string;
  stages: Stage[];
}

export const TRACKS: Track[] = [
  {
    id: "interview",
    name: "Interview Mastery",
    tagline: "From your story to the toughest panel, one question type at a time.",
    stages: [
      {
        id: "int-foundations",
        name: "1 · Your story",
        goal: "Open every interview with a confident, 90-second story of who you are and why this role.",
        covers: ["Tell me about yourself", "Why this role / company", "Why are you leaving", "Strengths and weaknesses", "Career gaps and moves"],
        kind: "question",
      },
      {
        id: "int-behavioral",
        name: "2 · Behavioural (STAR)",
        goal: "Prove past performance with structured stories: situation, action, result, lesson.",
        covers: ["Conflict", "Failure and lessons", "Influence", "Tight deadlines", "Receiving feedback", "Ambiguity", "Leading change"],
        kind: "question",
      },
      {
        id: "int-cv",
        name: "3 · Your CV deep-dive",
        goal: "Answer any probe on any line of your CV, with the numbers at your fingertips.",
        covers: ["Generated from each learner's own CV and job description"],
        kind: "question",
        personal: true,
      },
      {
        id: "int-technical",
        name: "4 · Role expertise",
        goal: "Prove deep expertise in your own field, explained clearly to experts and executives alike.",
        covers: [
          "Technology: architecture, cloud, security, delivery",
          "Finance: forecasting, variance, controls",
          "Audit & risk: standards, findings, risk ratings",
          "Product: prioritisation, roadmaps, discovery",
          "…tagged by profession, plus questions generated for each learner",
        ],
        kind: "question",
      },
      {
        id: "int-scenario",
        name: "5 · Scenario-based",
        goal: "Think on your feet: structure a hypothetical in three steps before you answer.",
        covers: ["What would you do if…", "First 90 days", "A failing project", "A key person resigns", "Conflicting priorities"],
        kind: "question",
      },
      {
        id: "int-business",
        name: "6 · Business & strategy",
        goal: "Talk value, money and strategy like a business owner, not only a technologist.",
        covers: ["Business cases and ROI", "Budgets and trade-offs", "Portfolio management", "Vendors", "Stakeholder value", "Industry and market"],
        kind: "question",
      },
      {
        id: "int-leadership",
        name: "7 · Leadership questions",
        goal: "Show how you lead people and leaders, at the level you're interviewing for.",
        covers: ["Building and growing teams", "Performance and burnout", "Leading leaders", "Culture", "Hiring"],
        kind: "question",
      },
      {
        id: "int-closing",
        name: "8 · Closing & negotiation",
        goal: "End strong: sharp questions for them, salary conversations, and follow-up.",
        covers: ["Questions to ask the interviewer", "Salary and offer negotiation", "Handling 'any concerns?'", "Thank-you follow-up"],
        kind: "question",
      },
    ],
  },
  {
    id: "leadership",
    name: "Leadership Ladder",
    tagline: "The conversations each level of leadership must own, rung by rung.",
    stages: [
      {
        id: "lead-foundations",
        name: "1 · Leading yourself",
        goal: "Presence, decisions and trust: the base every leader stands on.",
        covers: ["Executive presence", "Decisions under uncertainty", "Building trust", "Accountability", "Personal brand"],
        kind: "talk",
        level: "individual",
      },
      {
        id: "lead-manager",
        name: "2 · Manager",
        goal: "Lead a team: feedback, delegation, coaching and healthy conflict.",
        covers: ["1-on-1s", "Giving difficult feedback", "Delegation", "Coaching", "Psychological safety", "Managing conflict", "Hiring well"],
        kind: "talk",
        level: "manager",
      },
      {
        id: "lead-director",
        name: "3 · Director",
        goal: "Lead managers and cross-functional work: influence, priorities and meetings that decide.",
        covers: ["Leading managers", "Influence without authority", "Prioritising a portfolio", "Effective meetings", "Developing successors"],
        kind: "talk",
        level: "director",
      },
      {
        id: "lead-vp",
        name: "4 · VP",
        goal: "Lead a function: strategy, budgets, org design and executive communication.",
        covers: ["Strategic thinking", "Org design", "Budget ownership", "Presenting to executives", "Leading change at scale"],
        kind: "talk",
        level: "vp",
      },
      {
        id: "lead-csuite",
        name: "5 · C-suite",
        goal: "Lead the enterprise: vision, board, crisis and culture.",
        covers: ["Vision and narrative", "Board and investor communication", "Leading in a crisis", "Culture", "Public voice of the company"],
        kind: "talk",
        level: "csuite",
      },
    ],
  },
  {
    id: "speaking",
    name: "Public Speaking",
    tagline: "From steady delivery to keynotes and boardrooms.",
    stages: [
      { id: "spk-delivery", name: "1 · Delivery basics", goal: "Pace, pauses, posture and no fillers.", covers: ["Pace 120–145 wpm", "Power pauses", "Removing fillers", "Voice and posture"], kind: "talk" },
      { id: "spk-structure", name: "2 · Structure", goal: "Rule of three, signposting and landing lines.", covers: ["Rule of three", "PREP", "Signposting", "Strong openings and closes"], kind: "talk" },
      { id: "spk-impromptu", name: "3 · Impromptu", goal: "Speak well on any topic with 30 seconds' notice.", covers: ["Table topics", "Bridge phrases", "Thinking in threes"], kind: "talk" },
      { id: "spk-story", name: "4 · Storytelling", goal: "Make ideas memorable with stories.", covers: ["Story arc", "Personal stories", "Data as story"], kind: "talk" },
      { id: "spk-persuasion", name: "5 · Persuasion", goal: "Move people to a decision.", covers: ["Problem–solution–benefit", "Handling objections", "Calls to action"], kind: "talk" },
      { id: "spk-presenting", name: "6 · Presentations & Q&A", goal: "Present to a room and own the Q&A.", covers: ["Slides that support you", "Hostile questions", "Time control"], kind: "talk" },
      { id: "spk-executive", name: "7 · Keynote & boardroom", goal: "Speak as the senior voice in the room.", covers: ["Keynotes", "Board updates", "Media and interviews", "Town halls"], kind: "talk" },
    ],
  },
  {
    id: "communication",
    name: "Executive Communication",
    tagline: "Everyday words that sound senior, in English that flows.",
    stages: [
      { id: "com-vocabulary", name: "1 · Executive vocabulary", goal: "Replace hedging with boardroom phrasing.", covers: ["Hedged to executive", "Power phrases", "Active voice"], kind: "talk" },
      { id: "com-meetings", name: "2 · Meetings", goal: "Speak up, steer and close meetings.", covers: ["Opening a meeting", "Interrupting politely", "Summarising decisions"], kind: "talk" },
      { id: "com-difficult", name: "3 · Difficult conversations", goal: "Say hard things clearly and kindly.", covers: ["Saying no", "Bad news", "Pushback from seniors"], kind: "talk" },
      { id: "com-crosscultural", name: "4 · Cross-cultural English", goal: "Sound natural as a non-native speaker.", covers: ["Idioms to use and avoid", "Regional phrases", "Clarity over complexity"], kind: "talk" },
    ],
  },
  {
    id: "mindset",
    name: "Mindset & Motivation",
    tagline: "The inner game: confidence, resilience and discipline.",
    stages: [
      { id: "mind-confidence", name: "Confidence", goal: "Build confidence from evidence, not hope.", covers: ["Self-belief", "Imposter feelings", "Presence under pressure"], kind: "talk" },
      { id: "mind-resilience", name: "Resilience", goal: "Recover from setbacks and rejection.", covers: ["Failure as feedback", "Rejection", "Endurance"], kind: "talk" },
      { id: "mind-discipline", name: "Discipline & habits", goal: "Act consistently, without excuses.", covers: ["Excuses vs action", "Habits", "Momentum"], kind: "talk" },
      { id: "mind-growth", name: "Growth", goal: "Keep learning and stay curious.", covers: ["Learning mindset", "Feedback", "Reinvention"], kind: "talk" },
    ],
  },
];

export const ALL_STAGES = TRACKS.flatMap((t) => t.stages.map((s) => ({ ...s, track: t.id })));

export function stageById(id: string | undefined) {
  return ALL_STAGES.find((s) => s.id === id);
}

export function trackOf(stageId: string | undefined): Track | undefined {
  return TRACKS.find((t) => t.stages.some((s) => s.id === stageId));
}

/** Built-in cards placed on the roadmap. Anything unmapped falls back by category. */
const BUILT_IN_STAGE: Record<string, string> = {
  "about-me": "int-foundations",
  "why-us": "int-foundations",
  "your-questions": "int-closing",
  stakeholders: "int-behavioral",
  "bad-news": "int-behavioral",
  "change-adoption": "int-behavioral",
  tradeoff: "int-technical",
  velocity: "int-technical",
  security: "int-technical",
  ai: "int-technical",
  "cloud-migration": "int-technical",
  architecture: "int-technical",
  "engineering-metrics": "int-technical",
  "tech-debt": "int-technical",
  iam: "int-technical",
  incident: "int-scenario",
  turnaround: "int-scenario",
  portfolio: "int-business",
  "business-case": "int-business",
  icb: "int-business",
  vendors: "int-business",
  "lead-leaders": "int-leadership",
  burnout: "int-leadership",
  presence: "lead-foundations",
  decisions: "lead-foundations",
  trust: "lead-foundations",
  feedback: "lead-manager",
  delegation: "lead-manager",
  coaching: "lead-manager",
  safety: "lead-manager",
  conflict: "lead-manager",
  influence: "lead-director",
  meetings: "lead-director",
  strategy: "lead-vp",
  board: "lead-vp",
  storytelling: "spk-story",
  crisis: "lead-csuite",
  "topic-winning-mindset": "mind-confidence",
};

const CATEGORY_STAGE: Record<string, string> = {
  CV: "int-cv",
  Business: "int-business",
  Technical: "int-technical",
  Leadership: "int-leadership",
  Craft: "lead-manager",
  Topic: "mind-growth",
};

/** Where a card sits on the roadmap. */
export function stageOfCard(card: { id: string; category: string; stage?: string }): string | undefined {
  return card.stage ?? BUILT_IN_STAGE[card.id] ?? BUILT_IN_STAGE[card.id.replace(/^craft-/, "")] ?? CATEGORY_STAGE[card.category];
}

/** Old Topic Library sections → stages, for topics saved before the curriculum existed. */
export function stageFromSection(section: string | undefined): string {
  const s = (section ?? "").toLowerCase();
  if (/excuse|disciplin|habit/.test(s)) return "mind-discipline";
  if (/resilien|failure/.test(s)) return "mind-resilience";
  if (/confiden/.test(s)) return "mind-confidence";
  return "mind-discipline";
}

/** Reads a career level from free text such as "AVP Digital Delivery" or "Senior Manager". */
export function levelFromRole(role: string): CareerLevel | null {
  const r = role.toLowerCase();
  if (/\b(ceo|cto|cio|cfo|coo|cdo|ciso|chief|president|c-suite|managing director)\b/.test(r)) return "csuite";
  if (/\b(a?vp|svp|evp|vice[- ]president|head of)\b/.test(r)) return "vp";
  if (/\b(director)\b/.test(r)) return "director";
  if (/\b(manager|lead(er)?|supervisor)\b/.test(r)) return "manager";
  return role.trim() ? "individual" : null;
}

/** A stage counts as mastered once most of its items reach the 2-day review box. */
export const MASTERY = { box: 2, share: 0.7 } as const;
