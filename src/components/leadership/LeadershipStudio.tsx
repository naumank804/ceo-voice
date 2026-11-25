"use client";

import { useCallback, useEffect, useState } from "react";
import { CameraToggle } from "@/components/camera/CameraMirror";
import { SectionLabel } from "@/components/stage/shared";
import { useCamera } from "@/hooks/useCamera";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import {
  type AnswerCard,
  CATEGORY_LABEL,
  cheatCode,
  type DailyTask,
  dueLabel,
  emptyState,
  INTERVIEW_CATEGORIES,
  isDue,
  type LeadershipState,
  loadState,
  progressOf,
  reviewOrder,
  saveState,
  streak,
  TALK_CATEGORIES,
} from "@/lib/leadership";
import { AnswerLab } from "./AnswerLab";
import { MockInterview } from "./MockInterview";
import { MyCv } from "./MyCv";
import { type Drill, SharpMind } from "./SharpMind";
import { Toolkit } from "./Toolkit";

type Tab = "today" | "cv" | "toolkit" | "lab" | "craft" | "mock" | "mind";

const TABS: { id: Tab; name: string; body: string }[] = [
  { id: "today", name: "Today", body: "Your daily leader workout." },
  { id: "cv", name: "My CV", body: "What they'll ask about it." },
  { id: "toolkit", name: "Toolkit", body: "Everything to have ready." },
  { id: "lab", name: "Answer Lab", body: "Interview answers, until automatic." },
  { id: "craft", name: "Leadership Craft", body: "Speak on any leadership topic." },
  { id: "mock", name: "Mock Interview", body: "Real conditions, from memory." },
  { id: "mind", name: "Sharp Mind", body: "Recall, numbers, thinking in threes." },
];

const TASKS: { id: DailyTask; area: string; name: string; minutes: number; body: string }[] = [
  { id: "flash", area: "Memory", name: "Cheat-code recall", minutes: 2, body: "Six questions, ten seconds each: name the three pillars." },
  { id: "facts", area: "Memory", name: "CV numbers", minutes: 1, body: "Your budgets, percentages and team sizes, instantly." },
  { id: "sprint", area: "Thinking", name: "Rule-of-three sprint", minutes: 3, body: "A surprise prompt. Three points, 45 seconds, no notes." },
  { id: "answer", area: "Interview", name: "One answer, out loud", minutes: 4, body: "Your weakest interview answer, at your current level." },
  { id: "craft", area: "Leadership", name: "One leadership talk", minutes: 3, body: "Speak on a leadership topic like you're addressing your team." },
];

export function LeadershipStudio() {
  const [state, setState] = useState<LeadershipState>(emptyState);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<Tab>("today");
  const [drill, setDrill] = useState<Drill>("flash");
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AnswerCard | null>(null);
  /** Remounts a tab when we jump into it, so it opens on the right item. */
  const [nonce, setNonce] = useState(0);
  const camera = useCamera();
  const tts = useSpeechSynthesis();

  // Load after mount so server and client render the same HTML. `?tab=` lets the daily email deep-link.
  useEffect(() => {
    setState(loadState());
    setLoaded(true);
    const t = new URLSearchParams(window.location.search).get("tab") as Tab | null;
    if (t && TABS.some((x) => x.id === t)) setTab(t);
  }, []);

  const update = useCallback((fn: (s: LeadershipState) => LeadershipState) => {
    setState((s) => {
      const next = fn(s);
      saveState(next);
      return next;
    });
  }, []);

  const go = (t: Tab, opts?: { drill?: Drill; openId?: string | null; draft?: AnswerCard | null }) => {
    tts.cancel();
    camera.discardRecording();
    if (opts?.drill) setDrill(opts.drill);
    setOpenId(opts?.openId ?? null);
    setDraft(opts?.draft ?? null);
    setNonce((n) => n + 1);
    setTab(t);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /** Open a card in whichever lab holds it. */
  const openCard = (id: string) => {
    const card = reviewOrder(state).find((c) => c.id === id);
    go(card && TALK_CATEGORIES.includes(card.category) ? "craft" : "lab", { openId: id });
  };

  const ordered = reviewOrder(state);
  const weakestInterview = ordered.find((c) => INTERVIEW_CATEGORIES.includes(c.category));
  const weakestCraft = ordered.find((c) => TALK_CATEGORIES.includes(c.category));
  const due = ordered.filter((c) => isDue(progressOf(state, c.id))).slice(0, 8);
  const days = streak(state);
  const doneToday = state.today.done;
  const shared = { state, update, camera, speak: tts.speak, stopSpeaking: tts.cancel };

  const startTask = (t: DailyTask) => {
    if (t === "answer") go("lab", { openId: weakestInterview?.id });
    else if (t === "craft") go("craft", { openId: weakestCraft?.id });
    else go("mind", { drill: t === "flash" ? "flash" : t === "facts" ? "facts" : "sprint" });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-gold-500">Leadership Practice</p>
          <h1 className="font-serif text-5xl leading-tight">Speak like the leader you are</h1>
          <p className="leading-relaxed text-graphite-300">
            A sharp mind under pressure is trained, not born. Short daily practice of recall, structure and speaking out loud makes your words come
            naturally, keeps you interview-ready, and builds the voice of a leader who can talk to anyone about anything.
          </p>
        </div>
        <CameraToggle camera={camera} />
      </div>

      <div role="tablist" className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => go(t.id)}
            className={`min-w-[150px] flex-1 rounded-xl border p-3 text-left transition ${tab === t.id ? "border-gold-500 bg-gold-500/10" : "border-graphite-800 bg-graphite-950/60 hover:border-graphite-600"}`}
          >
            <span className={`block font-serif text-xl ${tab === t.id ? "text-gold-300" : "text-graphite-100"}`}>{t.name}</span>
            <span className="block text-xs text-graphite-400">{t.body}</span>
          </button>
        ))}
      </div>

      {tab === "today" && (
        <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
          <section className="space-y-4">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <SectionLabel tone="gold">Today&apos;s workout · about 13 minutes</SectionLabel>
              <span className="text-sm text-graphite-300">
                {loaded && days > 0 ? `🔥 ${days}-day streak` : "Start your streak today"} · {doneToday.length}/{TASKS.length} done
              </span>
            </div>
            <ol className="space-y-3">
              {TASKS.map((t, i) => {
                const done = doneToday.includes(t.id);
                const detail =
                  t.id === "answer" && weakestInterview
                    ? ` Today: ${weakestInterview.topic}.`
                    : t.id === "craft" && weakestCraft
                      ? ` Today: ${weakestCraft.topic}.`
                      : t.id === "facts" && !state.facts.length
                        ? " (Import your CV first.)"
                        : "";
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => (t.id === "facts" && !state.facts.length ? go("cv") : startTask(t.id))}
                      className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition ${
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
                        <span className="block text-[10px] uppercase tracking-[0.2em] text-graphite-400">{t.area}</span>
                        <span className="block font-medium text-graphite-100">
                          {t.name} <span className="text-xs font-normal text-graphite-400">· {t.minutes} min</span>
                        </span>
                        <span className="block text-sm text-graphite-400">
                          {t.body}
                          {detail}
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
            <SectionLabel tone="gold">Due for review</SectionLabel>
            {loaded && due.length ? (
              <ul className="space-y-2.5">
                {due.map((c) => (
                  <li key={c.id}>
                    <button type="button" onClick={() => openCard(c.id)} className="group w-full text-left">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="text-sm text-graphite-100 group-hover:text-gold-300">{c.topic}</span>
                        <span className="shrink-0 text-[10px] uppercase tracking-widest text-graphite-400">
                          {CATEGORY_LABEL[c.category]} · {dueLabel(progressOf(state, c.id)).label}
                        </span>
                      </span>
                      <span className="block text-xs text-gold-400">{cheatCode(c)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-graphite-300">Nothing due. Your memory is fresh. Try a mock interview or speak on a new leadership topic.</p>
            )}
            <button type="button" onClick={() => go("toolkit")} className="text-sm text-gold-400 underline-offset-4 hover:underline">
              See your whole toolkit →
            </button>
            <p className="border-t border-graphite-800 pt-3 text-xs leading-relaxed text-graphite-400">
              Why this works: pulling an answer from memory (not re-reading it) is what makes it stick, and spacing those pulls over days moves it
              into long-term memory. Thinking in threes gives your mind a path, so it never goes blank.
            </p>
          </aside>
        </div>
      )}

      {tab === "cv" && (
        <MyCv key={nonce} state={state} update={update} onPractise={(id) => go("lab", { openId: id })} onPrepare={(d) => go("lab", { draft: d })} />
      )}
      {tab === "toolkit" && (
        <Toolkit state={state} speak={tts.speak} onOpen={openCard} onDrillFacts={() => go("mind", { drill: "facts" })} onGoCv={() => go("cv")} />
      )}
      {tab === "lab" && (
        <AnswerLab
          key={nonce}
          {...shared}
          openId={openId}
          initialEdit={draft}
          categories={INTERVIEW_CATEGORIES}
          intro={
            <>
              Every answer has the same shape: <span className="text-graphite-100">opening → three pillars → landing line</span>. Learn the
              three-word cheat code and the whole answer unfolds from it. Business, technical, leadership, and questions about your CV.
            </>
          }
        />
      )}
      {tab === "craft" && (
        <AnswerLab
          key={nonce}
          {...shared}
          openId={openId}
          categories={TALK_CATEGORIES}
          intro={
            <>
              The subjects a senior leader is expected to speak on with ease: in a town hall, a 1-on-1, a panel or an interview. Each has a
              three-word cheat code. Add your own leadership topics, paste anything you read, or let the dice pick one so you learn to{" "}
              <span className="text-graphite-100">speak on anything</span>.
            </>
          }
        />
      )}
      {tab === "mock" && <MockInterview key={nonce} {...shared} />}
      {tab === "mind" && <SharpMind key={nonce} {...shared} initialDrill={drill} />}
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
