"use client";

import { useState } from "react";
import { Chip, primaryButton, SectionLabel } from "@/components/stage/shared";
import type { Camera } from "@/hooks/useCamera";
import { type AnswerCard, type Category, CATEGORY_LABEL, cheatCode, INTERVIEW_CATEGORIES, type LeadershipState, recordTake, reviewOrder } from "@/lib/leadership";
import { AnswerRoom, type TakeSummary } from "./AnswerRoom";

interface Props {
  state: LeadershipState;
  update: (fn: (s: LeadershipState) => LeadershipState) => void;
  camera: Camera;
  speak: (text: string, rate?: number) => Promise<void>;
  stopSpeaking: () => void;
}

const select = "rounded-md border border-graphite-700 bg-graphite-900 px-2 py-1 text-graphite-100";

export function MockInterview({ state, update, camera, speak, stopSpeaking }: Props) {
  const [count, setCount] = useState(5);
  const [thinkSec, setThinkSec] = useState(5);
  const [targetSec, setTargetSec] = useState(90);
  const [order, setOrder] = useState<"due" | "random">("due");
  const [focus, setFocus] = useState<"All" | Category>("All");
  const [queue, setQueue] = useState<AnswerCard[] | null>(null);
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<{ card: AnswerCard; take: TakeSummary }[]>([]);
  const [done, setDone] = useState(false);

  const begin = () => {
    const pool = reviewOrder(state).filter((c) => INTERVIEW_CATEGORIES.includes(c.category) && (focus === "All" || c.category === focus));
    const picked = order === "due" ? pool : [...pool].sort(() => Math.random() - 0.5);
    // A full interview opens with "Tell me about yourself" and ends with your questions.
    const opener = focus === "All" ? picked.find((c) => c.id === "about-me") : undefined;
    const closer = focus === "All" ? picked.find((c) => c.id === "your-questions") : undefined;
    const middle = picked.filter((c) => c !== opener && c !== closer);
    const n = Math.min(count, picked.length);
    const body = middle.slice(0, Math.max(0, n - (opener ? 1 : 0) - (closer && n > 2 ? 1 : 0)));
    setQueue([...(opener ? [opener] : []), ...body, ...(closer && n > 2 ? [closer] : [])].slice(0, n));
    setIndex(0);
    setResults([]);
    setDone(false);
  };

  if (queue && !done) {
    const card = queue[index];
    const last = index === queue.length - 1;
    return (
      <AnswerRoom
        key={`${card.id}-${index}`}
        card={card}
        mode="mock"
        initialLevel={4}
        thinkSec={thinkSec}
        targetSec={targetSec}
        autoStart
        eyebrow={`Question ${index + 1} of ${queue.length}`}
        camera={camera}
        speak={speak}
        stopSpeaking={stopSpeaking}
        onRecorded={(t) => {
          update((s) => recordTake(s, card.id, t));
          setResults((r) => [...r.filter((x) => x.card.id !== card.id), { card, take: t }]);
        }}
        onExit={() => {
          stopSpeaking();
          setDone(true);
        }}
        onNext={() => (last ? setDone(true) : setIndex(index + 1))}
        nextLabel={last ? "See my results →" : "Next question →"}
      />
    );
  }

  if (done && results.length) {
    const avg = Math.round(results.reduce((s, r) => s + r.take.score, 0) / results.length);
    return (
      <div className="animate-reveal space-y-6">
        <div className="rounded-xl border border-gold-600/40 bg-navy-900/60 p-6">
          <SectionLabel tone="gold">Interview complete</SectionLabel>
          <p className="mt-2 font-serif text-4xl text-graphite-100">
            {avg}
            <span className="text-xl text-graphite-400"> / 100 average</span>
          </p>
          <p className="mt-2 text-sm text-graphite-300">
            Weak answers go back to the top of your review list automatically. Practise those in the Answer Lab, then run another mock.
          </p>
        </div>
        <ul className="divide-y divide-graphite-800 rounded-xl border border-graphite-800 bg-graphite-950/60">
          {results.map(({ card, take }) => (
            <li key={card.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="text-graphite-100">{card.topic}</p>
                <p className="text-xs text-graphite-400">
                  {card.pillars.map((p, i) => (
                    <span key={i} className={take.pillars[i] ? "text-signal-green" : "text-signal-amber"}>
                      {i > 0 && " | "}
                      {p.key}
                    </span>
                  ))}
                  {take.netUsed && " · used a hint"}
                </p>
              </div>
              <span className={`font-serif text-2xl ${take.score >= 75 ? "text-signal-green" : take.score >= 55 ? "text-gold-400" : "text-signal-amber"}`}>{take.score}</span>
            </li>
          ))}
        </ul>
        <div className="flex justify-end">
          <button type="button" onClick={begin} className={primaryButton}>
            Run another mock interview
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
      <section className="space-y-5 rounded-xl border border-graphite-800 bg-gradient-to-b from-navy-900/70 to-graphite-950 p-6 md:p-8">
        <h2 className="font-serif text-3xl text-graphite-100">Interview conditions</h2>
        <p className="text-sm leading-relaxed text-graphite-300">
          The interviewer reads each question aloud. You get a few seconds to find your three pillar words, then you answer with nothing on screen.
          Freeze for 3 seconds and the next pillar word appears. A light tells you when to land the answer.
        </p>
        <div className="flex flex-wrap gap-2">
          {(["All", ...INTERVIEW_CATEGORIES] as const).map((f) => (
            <Chip key={f} active={focus === f} onClick={() => setFocus(f)}>
              {f === "All" ? "Full interview" : CATEGORY_LABEL[f]}
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-graphite-300">
          <label className="flex items-center gap-2">
            Questions
            <select value={count} onChange={(e) => setCount(Number(e.target.value))} className={select}>
              {[3, 5, 8, 99].map((n) => (
                <option key={n} value={n}>
                  {n === 99 ? "All" : n}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            Think time
            <select value={thinkSec} onChange={(e) => setThinkSec(Number(e.target.value))} className={select}>
              {[0, 3, 5, 10].map((n) => (
                <option key={n} value={n}>
                  {n ? `${n}s` : "None"}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            Answer length
            <select value={targetSec} onChange={(e) => setTargetSec(Number(e.target.value))} className={select}>
              {[60, 90, 120].map((n) => (
                <option key={n} value={n}>
                  {n === 60 ? "1 min" : n === 90 ? "90s" : "2 min"}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            Order
            <select value={order} onChange={(e) => setOrder(e.target.value as "due" | "random")} className={select}>
              <option value="due">Weakest first</option>
              <option value="random">Random</option>
            </select>
          </label>
        </div>
        <button type="button" onClick={begin} className={primaryButton}>
          Start the interview
        </button>
      </section>
      <aside className="h-fit space-y-3 rounded-xl border border-graphite-800 bg-navy-900/50 p-6">
        <SectionLabel tone="gold">Before you start</SectionLabel>
        <ul className="space-y-2 text-sm text-graphite-300">
          <li>Sit up, shoulders down, one slow breath out.</li>
          <li>Answer in threes: &quot;First… Second… Third…&quot;</li>
          <li>Land the last sentence, then stop. Silence after a strong answer is confidence.</li>
          <li>If you blank, use a bridge: &quot;Let me frame that in three parts.&quot;</li>
        </ul>
        <p className="pt-2 text-xs text-graphite-400">Your cheat codes: {reviewOrder(state).slice(0, 3).map(cheatCode).join(" · ")} …</p>
      </aside>
    </div>
  );
}
