import { LEVELS, levelFromRole, PROFESSIONS } from "@/lib/curriculum";
import { type OnboardingAnswers, professionName, type StarterItem } from "@/lib/onboarding";
import { completeJSON } from "@/lib/openai";

// Generates a new learner's personal starter questions from their onboarding answers.
// Nothing is stored here: the result goes back to the learner's own browser/account.

const STAGES = {
  "int-foundations": "Your story (tell me about yourself, why this role)",
  "int-behavioral": "Behavioural STAR questions",
  "int-technical": "Role expertise: deep knowledge of their own profession",
  "int-scenario": "Scenario-based: what would you do if…",
  "int-business": "Business & strategy: value, money, stakeholders",
  "int-leadership": "Leadership questions for their target level",
} as const;

const system = `You are a senior interview coach for professionals in ANY field (finance, audit, product, operations, sales, HR, healthcare, technology…), many of them non-native English speakers.
From a learner's profile, write the interview questions they are most likely to face for their TARGET role, each with a model answer they can memorise.

Return JSON: {"items": [{"stage": string, "topic": string, "question": string, "opening": string, "pillars": [{"key": string, "tag": string, "text": string}], "close": string}]}

Rules:
- 10 items, using these stage ids: ${Object.entries(STAGES)
  .map(([k, v]) => `"${k}" (${v})`)
  .join(", ")}.
  Mix: 2 int-foundations, 2 int-behavioral, 3 int-technical, 1 int-scenario, 1 int-business, 1 int-leadership.
- Questions must be specific to their profession, job title, target role, industry and seniority. For an auditor ask about audit standards, findings and risk; for finance about forecasting, variance and controls; for a product owner about prioritisation and stakeholders; and so on.
- "topic": 2-5 word label. "question": how a real interviewer asks it.
- "opening": one confident first sentence that answers directly and announces three points.
- Exactly 3 pillars. "key": ONE or TWO memorable words. "tag": 2-4 words. "text": 2-3 short spoken sentences in first person, starting "First, <key>:", "Second, <key>:", "Third, <key>:", max 50 words.
- Never invent the learner's employers, numbers or achievements. Where a personal fact belongs, write "[your example: …]" with a hint of what to add.
- "close": one memorable landing sentence.
- Plain, confident English. Active voice. No hedging.`;

const ORD = ["First", "Second", "Third"];

function clean(raw: unknown): StarterItem[] {
  const list = (raw as { items?: unknown[] })?.items;
  if (!Array.isArray(list)) return [];
  const s = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");
  return list.flatMap((x) => {
    const r = x as Partial<StarterItem>;
    const pillars = (Array.isArray(r.pillars) ? r.pillars : []).map((p) => ({ key: s(p?.key, 40), tag: s(p?.tag, 80), text: s(p?.text, 600) })).filter((p) => p.key && p.text);
    const stage = s(r.stage, 40);
    if (!(stage in STAGES) || pillars.length !== 3 || !s(r.question, 400)) return [];
    return [{ stage, topic: s(r.topic, 80) || s(r.question, 40), question: s(r.question, 400), opening: s(r.opening, 400), pillars: pillars.slice(0, 3), close: s(r.close, 400) }];
  });
}

/** Offline templates, so onboarding always produces a usable plan. */
function templates(a: OnboardingAnswers): StarterItem[] {
  const field = professionName(a);
  const target = a.targetRole.trim() || a.jobTitle.trim() || "this role";
  const t = (stage: string, topic: string, question: string, opening: string, keys: [string, string, string][], close: string): StarterItem => ({
    stage,
    topic,
    question,
    opening,
    pillars: keys.map(([key, tag, text], i) => ({ key, tag, text: `${ORD[i]}, ${key}: ${text}` })),
    close,
  });
  return [
    t("int-foundations", "Tell me about yourself", `Tell me about yourself, and why you're ready for a ${target} role.`, `I'm a ${a.jobTitle || "professional"} in ${field}, and three things make me ready for ${target}.`, [
      ["Experience", "where I've been", "[your example: years, organisations, scope]. That gave me a strong base in the work this role needs."],
      ["Impact", "one result", "[your example: one achievement with a number]. It shows the value I deliver."],
      ["Next step", "why this role", `I'm ready to take on ${target}: [your example: what you want to lead or improve].`],
    ], "That's why this role is the right next step, for me and for your team."),
    t("int-foundations", "Why this role", `Why do you want to be a ${target}?`, `I want this role for three reasons.`, [
      ["Strengths", "what I bring", "[your example: the strength that fits this role best], which I've used to [result]."],
      ["Growth", "what I'll learn", "It stretches me in [your example: area], where I'm ready for more responsibility."],
      ["Mission", "the organisation", "Your focus on [your example: their goal] matches what I care about."],
    ], "It's the role where my strengths and your priorities meet."),
    t("int-behavioral", "A conflict at work", "Tell me about a time you disagreed with a colleague. What did you do?", "I handle disagreement by staying focused on the goal. Here's an example in three steps.", [
      ["Situation", "the disagreement", "[your example: who, and what you disagreed about]."],
      ["Approach", "listen, then data", "I listened to their view, then used facts to find common ground: [your example]."],
      ["Outcome", "result and lesson", "[your example: what changed], and the relationship got stronger."],
    ], "Good disagreement makes better decisions."),
    t("int-behavioral", "A mistake you learned from", "Tell me about a mistake you made and what you learned.", "I own my mistakes quickly. Here's one, in three parts.", [
      ["Mistake", "what happened", "[your example: a real, moderate mistake]."],
      ["Fix", "what I did", "I took responsibility and fixed it by [your example]."],
      ["Lesson", "what changed", "Since then I always [your example: the new habit]."],
    ], "The lesson made me better at my job."),
    t("int-technical", `Core of ${field}`, `What does excellent work look like in ${field}, at the ${target} level?`, `Excellence in ${field} comes down to three things.`, [
      ["Accuracy", "get it right", "[your example: the standard or method you rely on] so the work can be trusted."],
      ["Judgement", "what matters", "Knowing which risks and details matter most: [your example]."],
      ["Communication", "make it clear", "Explaining findings so decision-makers can act: [your example]."],
    ], "Trusted, focused and clear: that's how I work."),
    t("int-technical", "Your toolkit", `Which methods or tools do you rely on most as a ${a.jobTitle || "professional"}?`, "I rely on three tools or methods every week.", [
      ["Method", "the core one", "[your example: method/tool], which helps me [benefit]."],
      ["Quality", "checks", "[your example: how you check your own work]."],
      ["Improvement", "what I've added", "[your example: a tool or process you introduced, with its result]."],
    ], "Good tools, used well, make results repeatable."),
    t("int-technical", "A complex problem", `Describe the most complex problem you've solved in ${field}.`, "The most complex problem I solved had three parts.", [
      ["Problem", "the challenge", "[your example: the problem and why it was hard]."],
      ["Analysis", "how I worked it", "[your example: how you broke it down and what you found]."],
      ["Result", "the outcome", "[your example: the result, ideally with a number]."],
    ], "Complex problems get simple when you break them down."),
    t("int-scenario", "First 90 days", `If we hired you as ${target}, what would you do in your first 90 days?`, "My first 90 days would follow three steps.", [
      ["Listen", "first 30 days", "Meet the team and stakeholders, learn what works and what doesn't."],
      ["Prioritise", "days 30–60", "Agree on the top two or three problems to solve, with clear owners."],
      ["Deliver", "days 60–90", "Deliver one visible early win and set the plan for the year."],
    ], "Listen, focus, deliver: that builds trust fast."),
    t("int-business", "Adding business value", "How does your work create value for the business?", "My work creates value in three ways.", [
      ["Revenue or savings", "the numbers", "[your example: money saved, earned or protected]."],
      ["Risk", "what we avoid", "[your example: risks reduced or problems prevented]."],
      ["Decisions", "better choices", "[your example: how your work helps leaders decide]."],
    ], "I measure my work by the value it creates."),
    t("int-leadership", "How you lead", `How would you lead a team as ${target}?`, "I lead with three principles.", [
      ["Clarity", "clear goals", "Everyone knows the goal and their part in it."],
      ["Trust", "empower people", "I delegate real ownership and coach rather than control: [your example]."],
      ["Results", "hold the bar", "We track outcomes, celebrate wins and fix problems early."],
    ], "Clear goals, trusted people, real results."),
  ];
}

export async function POST(req: Request) {
  const a = (await req.json().catch(() => null)) as OnboardingAnswers | null;
  if (!a || typeof a.jobTitle !== "string") return Response.json({ error: "Missing answers." }, { status: 400 });
  const level = LEVELS.find((l) => l.id === (levelFromRole(a.targetRole) ?? levelFromRole(a.jobTitle)))?.name ?? "not specified";
  const clip = (v: unknown, n: number) => String(v ?? "").slice(0, n);
  try {
    const items = clean(
      await completeJSON(
        system,
        [
          `Profession: ${clip(professionName(a), 80)} (${clip(PROFESSIONS.find((p) => p.id === a.profession)?.examples, 120)})`,
          `Current job title: ${clip(a.jobTitle, 120) || "not given"}`,
          `Target role: ${clip(a.targetRole, 120) || "same level"}; target seniority: ${level}`,
          `Industry: ${clip(a.industry, 120) || "not given"}; experience: ${clip(a.years, 20) || "not given"} years`,
          a.jobDescription?.trim() ? `Job description they're targeting:\n"""\n${clip(a.jobDescription, 6000)}\n"""` : "",
        ]
          .filter(Boolean)
          .join("\n"),
      ),
    );
    if (items.length >= 6) return Response.json({ items, source: "ai" });
  } catch (err) {
    console.warn("[onboarding] offline templates:", (err as Error).message);
  }
  return Response.json({ items: templates(a), source: "offline" });
}
