import { NextResponse } from "next/server";
import { completeJSON } from "@/lib/openai";
import { offlineQuestions } from "@/lib/question-bank";
import type { Industry, InterviewQuestion, StruggleLevel } from "@/lib/types";

interface Body {
  industry: Industry;
  level: StruggleLevel;
  jobDescription?: string;
  count?: number;
}

const SYSTEM = `You are a senior hiring manager and an interview coach for non-native English speakers.
Generate realistic interview questions for the candidate, plus a "Safety Net" for each one.

The Safety Net is what the candidate sees if they freeze for 3 seconds. It must:
- contain EXACTLY 3 keywords, each 1-3 words, in the order a strong answer would use them
  (think STAR: situation / action / result). Keywords are memory anchors, not sentences.
- use simple, high-frequency business English a non-native speaker can say without stumbling.
- include one "starter": a confident first sentence with "…" placeholders the candidate fills in.
  Starters must begin with "I" or "In my", never with "Um", "So", or "I think".

Respond with JSON: {"questions":[{"text":string,"intent":string,"keywords":[string,string,string],"starter":string}]}
"intent" is one short sentence describing what the interviewer is really testing.`;

function sanitize(raw: unknown): InterviewQuestion[] {
  const list = (raw as { questions?: unknown[] })?.questions;
  if (!Array.isArray(list)) return [];
  return list.flatMap((q, i) => {
    const r = q as Partial<InterviewQuestion>;
    if (typeof r.text !== "string" || !Array.isArray(r.keywords) || r.keywords.length < 3) return [];
    const [a, b, c] = r.keywords.map(String);
    return [
      {
        id: `ai-${Date.now()}-${i}`,
        text: r.text,
        intent: typeof r.intent === "string" ? r.intent : "",
        keywords: [a, b, c] as [string, string, string],
        starter: typeof r.starter === "string" ? r.starter : "",
      },
    ];
  });
}

export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  const count = Math.min(Math.max(body.count ?? 5, 1), 10);
  const industry = body.industry ?? "Tech";

  try {
    const jd = body.jobDescription?.trim().slice(0, 6000);
    const raw = await completeJSON(
      SYSTEM,
      [
        `Industry: ${industry}`,
        `Candidate English level: ${body.level ?? "Intermediate"}${body.level === "Beginner" ? " — keep questions short and plainly worded" : ""}`,
        `Number of questions: ${count}. Start with a "tell me about yourself"-style opener, then mix behavioural and role-specific questions.`,
        jd ? `Job description:\n"""\n${jd}\n"""` : "No job description provided — use common questions for this industry.",
      ].join("\n"),
    );
    const questions = sanitize(raw).slice(0, count);
    if (questions.length) return NextResponse.json({ questions, source: "ai" });
  } catch (err) {
    console.warn("[questions] falling back to offline bank:", (err as Error).message);
  }

  return NextResponse.json({ questions: offlineQuestions(industry, count), source: "offline" });
}
