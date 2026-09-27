import type { Industry, InterviewQuestion } from "./types";

/**
 * Offline question bank. Used when no OPENAI_API_KEY is set or the AI call fails.
 * Keywords are chosen as story anchors: each one should unlock a sentence.
 */
const CORE: InterviewQuestion[] = [
  {
    id: "core-intro",
    text: "Walk me through your background and what brings you to this role.",
    intent: "Can you give a structured, confident summary without rambling?",
    keywords: ["Current role", "Key achievement", "Why this role"],
    starter: "I'm currently a … where I focus on …, and the result I'm most proud of is …",
  },
  {
    id: "core-failure",
    text: "Tell me about a time you failed.",
    intent: "Do you take ownership and learn, or do you blame others?",
    keywords: ["Ownership", "Root cause", "Lesson applied"],
    starter: "Early in my time at …, I missed … and I take full ownership of that.",
  },
  {
    id: "core-conflict",
    text: "Describe a disagreement with a colleague and how you resolved it.",
    intent: "Can you handle conflict professionally and stay focused on outcomes?",
    keywords: ["Different priorities", "Listened first", "Shared outcome"],
    starter: "A colleague and I had different priorities on … so I started by listening to …",
  },
  {
    id: "core-pressure",
    text: "Tell me about a time you delivered under a tight deadline.",
    intent: "Do you stay calm, prioritise, and communicate under pressure?",
    keywords: ["Prioritised", "Communicated early", "Delivered result"],
    starter: "We had … days to deliver …, so the first thing I did was prioritise …",
  },
  {
    id: "core-leadership",
    text: "Give me an example of when you took the lead without being asked.",
    intent: "Do you show initiative and influence without authority?",
    keywords: ["Spotted gap", "Took initiative", "Measurable impact"],
    starter: "I noticed that our team was losing time on …, so I took the initiative to …",
  },
  {
    id: "core-weakness",
    text: "What is one area you are actively working to improve?",
    intent: "Are you self-aware, and do you have a concrete plan?",
    keywords: ["Honest area", "Concrete action", "Progress so far"],
    starter: "One area I'm actively developing is …, and to address it I have …",
  },
];

const INDUSTRY: Partial<Record<Industry, InterviewQuestion[]>> = {
  Tech: [
    {
      id: "tech-system",
      text: "Explain a technical system you built to someone without a technical background.",
      intent: "Can you translate complexity into business value?",
      keywords: ["Business problem", "Simple analogy", "User impact"],
      starter: "The business problem was …, and the simplest way to picture the solution is …",
    },
    {
      id: "tech-tradeoff",
      text: "Tell me about a technical trade-off you made and how you justified it.",
      intent: "Do you weigh options and communicate decisions clearly?",
      keywords: ["Two options", "Decision criteria", "Outcome"],
      starter: "We had two options: … or …. I chose … because …",
    },
  ],
  Finance: [
    {
      id: "fin-risk",
      text: "Describe a time you identified a financial risk others had missed.",
      intent: "Are you rigorous, and can you escalate with confidence?",
      keywords: ["Data signal", "Escalated", "Risk avoided"],
      starter: "While reviewing …, I noticed a signal in the data that …",
    },
  ],
  Consulting: [
    {
      id: "con-client",
      text: "Tell me about a difficult client and how you won their trust.",
      intent: "Can you manage stakeholders and stay composed?",
      keywords: ["Client concern", "Reframed", "Trust earned"],
      starter: "The client's main concern was …, so I reframed the conversation around …",
    },
  ],
};

export function offlineQuestions(industry: Industry, count = 5): InterviewQuestion[] {
  const pool = [...(INDUSTRY[industry] ?? []), ...CORE];
  // Always open with the intro, then rotate the rest.
  const [intro, ...rest] = [CORE[0], ...pool.filter((q) => q.id !== "core-intro")];
  const shuffled = rest.sort(() => Math.random() - 0.5);
  return [intro, ...shuffled].slice(0, count);
}
