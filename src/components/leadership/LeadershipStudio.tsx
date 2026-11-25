"use client";

import { useCallback, useEffect, useState } from "react";
import { CameraToggle } from "@/components/camera/CameraMirror";
import { SectionLabel } from "@/components/stage/shared";
import { useCamera } from "@/hooks/useCamera";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import {
  allCards,
  cheatCode,
  type DailyTask,
  dueLabel,
  emptyState,
  type LeadershipState,
  loadState,
  progressOf,
  reviewOrder,
  saveState,
  streak,
} from "@/lib/leadership";
import { AnswerLab } from "./AnswerLab";
import { MockInterview } from "./MockInterview";
import { type Drill, SharpMind } from "./SharpMind";

type Tab = "today" | "lab" | "mock" | "mind";

const TABS: { id: Tab; name: string; body: string }[] = [
  { id: "today", name: "Today", body: "Your 10-minute leader workout." },
  { id: "lab", name: "Answer Lab", body: "Learn each answer until it's automatic." },
  { id: "mock", name: "Mock Interview", body: "Questions read aloud, answered from memory." },
  { id: "mind", name: "Sharp Mind", body: "Fast recall, thinking in threes, no blank moments." },
];

const TASKS: { id: DailyTask; name: string; minutes: number; body: string }[] = [
  { id: "flash", name: "Cheat-code recall", minutes: 2, body: "Six questions, ten seconds each: name the three pillars." },
  { id: "sprint", name: "Rule-of-three sprint", minutes: 3, body: "One surprise leadership prompt. Three points, 45 seconds." },
  { id: "answer", name: "One answer, out loud", minutes: 5, body: "Your weakest answer, spoken at your current level." },
];

export function LeadershipStudio() {
  const [state, setState] = useState<LeadershipState>(emptyState);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<Tab>("today");
  const [drill, setDrill] = useState<Drill>("flash");
  const [openId, setOpenId] = useState<string | null>(null);
  /** Remounts a tab when we jump into it from the plan, so it opens on the right item. */
  const [nonce, setNonce] = useState(0);
  const camera = useCamera();
  const tts = useSpeechSynthesis();

  // Load after mount so server and client render the same HTML.
  useEffect(() => {
    setState(loadState());
    setLoaded(true);
  }, []);

  const update = useCallback((fn: (s: LeadershipState) => LeadershipState) => {
    setState((s) => {
      const next = fn(s);
      saveState(next);
      return next;
    });
  }, []);

  const go = (t: Tab, opts?: { drill?: Drill; openId?: string | null }) => {
    tts.cancel();
    camera.discardRecording();
    if (opts?.drill) setDrill(opts.drill);
    setOpenId(opts?.openId ?? null);
    setNonce((n) => n + 1);
    setTab(t);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const weakest = reviewOrder(state)[0];
  const days = streak(state);
  const doneToday = state.today.done;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-gold-500">Leadership Practice</p>
          <h1 className="font-serif text-5xl leading-tight">Speak like the leader you are</h1>
          <p className="leading-relaxed text-graphite-300">
            A sharp mind under pressure is trained, not born. Short daily reps of recall, structure and speaking out loud make your words come
            naturally, and keep you interview-ready every day.
          </p>
        </div>
        <CameraToggle camera={camera} />
      </div>

      <div role="tablist" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => go(t.id)}
            className={`rounded-xl border p-4 text-left transition ${tab === t.id ? "border-gold-500 bg-gold-500/10" : "border-graphite-800 bg-graphite-950/60 hover:border-graphite-600"}`}
          >
            <span className={`block font-serif text-2xl ${tab === t.id ? "text-gold-300" : "text-graphite-100"}`}>{t.name}</span>
            <span className="block text-sm text-graphite-400">{t.body}</span>
          </button>
        ))}
      </div>

      {tab === "today" && (
        <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
          <section className="space-y-4">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <SectionLabel tone="gold">Today&apos;s workout · about 10 minutes</SectionLabel>
              <span className="text-sm text-graphite-300">
                {loaded && days > 0 ? `🔥 ${days}-day streak` : "Start your streak today"} · {doneToday.length}/3 done
              </span>
            </div>
            <ol className="space-y-3">
              {TASKS.map((t, i) => {
                const done = doneToday.includes(t.id);
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() =>
                        t.id === "answer" ? go("lab", { openId: weakest?.id }) : go("mind", { drill: t.id === "flash" ? "flash" : "sprint" })
                      }
                      className={`flex w-full items-center gap-4 rounded-xl border p-5 text-left transition ${
                        done ? "border-signal-green/50 bg-signal-green/5" : "border-graphite-800 bg-graphite-950/60 hover:border-gold-500"
                      }`}
                    >
                      <span
                        className={`flex size-9 shrink-0 items-center justify-center rounded-full border font-serif text-lg ${
                          done ? "border-signal-green text-signal-green" : "border-graphite-600 text-graphite-300"
                        }`}
                      >
                        {done ? "✓" : i + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium text-graphite-100">
                          {t.name} <span className="text-xs font-normal text-graphite-400">· {t.minutes} min</span>
                        </span>
                        <span className="block text-sm text-graphite-400">
                          {t.id === "answer" && weakest ? `${t.body} Today: ${weakest.topic}.` : t.body}
                        </span>
                      </span>
                      <span className="text-gold-500">→</span>
                    </button>
                  </li>
                );
              })}
            </ol>
            <button
              type="button"
              onClick={() => go("mock")}
              className="w-full rounded-xl border border-dashed border-graphite-700 p-4 text-left text-sm text-graphite-300 transition hover:border-gold-500"
            >
              <span className="font-medium text-graphite-100">Interview this week?</span> Add a 5-question mock interview after the workout →
            </button>
            <Settings state={state} update={update} />
          </section>

          <aside className="h-fit space-y-4 rounded-xl border border-graphite-800 bg-navy-900/50 p-6">
            <SectionLabel tone="gold">Your cheat codes</SectionLabel>
            <ul className="space-y-2.5">
              {allCards(state).map((c) => {
                const d = dueLabel(progressOf(state, c.id));
                return (
                  <li key={c.id}>
                    <button type="button" onClick={() => go("lab", { openId: c.id })} className="group w-full text-left">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="text-sm text-graphite-100 group-hover:text-gold-300">{c.topic}</span>
                        {loaded && d.due && <span className="text-[10px] uppercase tracking-widest text-gold-500">{d.label}</span>}
                      </span>
                      <span className="block text-xs text-graphite-400">{cheatCode(c)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="border-t border-graphite-800 pt-3 text-xs leading-relaxed text-graphite-400">
              Why this works: pulling an answer from memory (not re-reading it) is what makes it stick, and spacing those pulls over days moves it
              into long-term memory. Thinking in threes gives your mind a path, so it never goes blank.
            </p>
          </aside>
        </div>
      )}

      {tab === "lab" && <AnswerLab key={nonce} state={state} update={update} camera={camera} speak={tts.speak} stopSpeaking={tts.cancel} openId={openId} />}
      {tab === "mock" && <MockInterview key={nonce} state={state} update={update} camera={camera} speak={tts.speak} stopSpeaking={tts.cancel} />}
      {tab === "mind" && (
        <SharpMind key={nonce} state={state} update={update} camera={camera} speak={tts.speak} stopSpeaking={tts.cancel} initialDrill={drill} />
      )}
    </div>
  );
}

function Settings({ state, update }: { state: LeadershipState; update: (fn: (s: LeadershipState) => LeadershipState) => void }) {
  return (
    <details className="rounded-xl border border-graphite-800 bg-graphite-950/60 p-4 text-sm">
      <summary className="cursor-pointer text-graphite-300">Settings</summary>
      <label className="mt-3 block space-y-1 text-graphite-300">
        Target company (optional)
        <input
          value={state.company}
          onChange={(e) => update((s) => ({ ...s, company: e.target.value }))}
          placeholder="Leave empty for neutral wording"
          className="w-full rounded-md border border-graphite-700 bg-graphite-950 px-3 py-2 text-sm text-graphite-100 placeholder:text-graphite-600 focus:border-gold-600 focus:outline-none"
        />
        <span className="block text-xs text-graphite-400">Fills the company name into answers like &quot;Why this company?&quot;. Saved only in this browser.</span>
      </label>
    </details>
  );
}
