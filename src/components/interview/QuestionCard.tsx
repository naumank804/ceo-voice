"use client";

import type { InterviewQuestion } from "@/lib/types";

interface Props {
  question: InterviewQuestion;
  index: number;
  total: number;
  interviewerSpeaking: boolean;
  onRepeat: () => void;
  onSkipReading: () => void;
}

export function QuestionCard({ question, index, total, interviewerSpeaking, onRepeat, onSkipReading }: Props) {
  return (
    <section className="rounded-xl border border-graphite-800 bg-gradient-to-b from-navy-900/70 to-graphite-950 p-6 md:p-8">
      <div className="mb-5 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-graphite-400">
        <span>
          Question {index + 1} <span className="text-graphite-600">/ {total}</span>
        </span>
        <span className="flex items-center gap-2">
          <span className={`size-1.5 rounded-full ${interviewerSpeaking ? "animate-pulse bg-gold-500" : "bg-graphite-600"}`} />
          {interviewerSpeaking ? "Interviewer speaking" : "Your turn"}
        </span>
      </div>

      <h2 key={question.id} className="animate-reveal font-serif text-3xl leading-snug text-graphite-100 md:text-4xl">
        {question.text}
      </h2>

      <div className="mt-6 flex gap-4 text-sm">
        {interviewerSpeaking ? (
          <button type="button" onClick={onSkipReading} className="text-graphite-400 underline-offset-4 hover:text-gold-400 hover:underline">
            Skip reading
          </button>
        ) : (
          <button type="button" onClick={onRepeat} className="text-graphite-400 underline-offset-4 hover:text-gold-400 hover:underline">
            Could you repeat the question?
          </button>
        )}
      </div>
    </section>
  );
}
