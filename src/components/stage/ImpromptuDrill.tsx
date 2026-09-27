"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CameraMirror, TakePlayback } from "@/components/camera/CameraMirror";
import { AnnotatedTranscript, Legend, Stat } from "@/components/interview/AnswerReport";
import { LiveAnswer } from "@/components/interview/LiveAnswer";
import type { Camera } from "@/hooks/useCamera";
import { useLiveTake, type TakeResult } from "@/hooks/useLiveTake";
import { offlineAnalysis } from "@/lib/offline-coach";
import { computeMetrics } from "@/lib/speech-metrics";
import { type Framework, FRAMEWORKS, frameworkProgress, scoreTake, type StageScore, type TopicCategory, TOPICS } from "@/lib/stage";
import type { AnswerAnalysis, SpeechMetrics } from "@/lib/types";
import { Chip, primaryButton, ScoreCard, secondaryButton, SectionLabel, TakeStats } from "./shared";

type Phase = "pick" | "prep" | "live" | "analyzing" | "report";
const CATEGORIES: ("All" | TopicCategory)[] = ["All", "Work", "Leadership", "Opinion", "Personal"];

interface Result {
  take: TakeResult;
  metrics: SpeechMetrics;
  steps: boolean[];
  score: StageScore;
  analysis: AnswerAnalysis | null;
}

export interface IncomingTopic {
  topic: string;
  framework: string;
  reference: string | null;
  nonce: number;
}

interface Props {
  /** A topic handed over from the Practice library. */
  incoming?: IncomingTopic | null;
  camera: Camera;
  speak: (text: string, rate?: number) => Promise<void>;
  stopSpeaking: () => void;
}

export function ImpromptuDrill({ incoming, camera, speak, stopSpeaking }: Props) {
  const [phase, setPhase] = useState<Phase>("pick");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("All");
  const [topic, setTopic] = useState(TOPICS[0].text);
  const [custom, setCustom] = useState("");
  const [frameworkId, setFrameworkId] = useState(TOPICS[0].framework);
  const [prepSec, setPrepSec] = useState(30);
  const [targetSec, setTargetSec] = useState(60);
  const [clock, setClock] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  /** Source text for "retell it" topics: readable before speaking, hidden while speaking. */
  const [reference, setReference] = useState<string | null>(null);

  const fw = FRAMEWORKS.find((f) => f.id === frameworkId) ?? FRAMEWORKS[0];
  const take = useLiveTake({ netEnabled: true, camera });
  const steps = useMemo(() => frameworkProgress(take.transcript, fw), [take.transcript, fw]);
  const nextStep = steps.indexOf(false);
  const activeTopic = custom.trim() || topic;

  const shuffle = useCallback(() => {
    const pool = TOPICS.filter((t) => (category === "All" || t.category === category) && t.text !== topic);
    const pick = pool[Math.floor(Math.random() * pool.length)] ?? TOPICS[0];
    setTopic(pick.text);
    setFrameworkId(pick.framework);
    setCustom("");
    setReference(null);
  }, [category, topic]);

  // Random topic on first load; done after mount so server and client render the same HTML.
  useEffect(() => {
    if (!incoming) shuffle();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!incoming) return;
    take.cancel();
    setCustom(incoming.topic);
    setFrameworkId(incoming.framework);
    setReference(incoming.reference);
    setResult(null);
    setPhase("pick");
  }, [incoming]); // eslint-disable-line react-hooks/exhaustive-deps

  // The prep clock keeps ticking while the mic permission prompt is open; start only once.
  const startingRef = useRef(false);
  const goLive = useCallback(async () => {
    if (startingRef.current) return;
    startingRef.current = true;
    stopSpeaking();
    setNotice(null);
    try {
      await take.begin();
      setClock(0);
      setPhase("live");
    } finally {
      startingRef.current = false;
    }
  }, [stopSpeaking, take]);

  const startPrep = () => {
    setResult(null);
    setClock(prepSec);
    setPhase("prep");
    void speak(activeTopic);
  };

  // One ticking clock: counts down during prep, counts up while speaking.
  const goLiveRef = useRef(goLive);
  goLiveRef.current = goLive;
  useEffect(() => {
    if (phase !== "prep" && phase !== "live") return;
    const id = window.setInterval(() => setClock((c) => (phase === "prep" ? c - 1 : c + 1)), 1000);
    return () => window.clearInterval(id);
  }, [phase]);
  useEffect(() => {
    if (phase === "prep" && clock <= 0) void goLiveRef.current();
  }, [phase, clock]);

  const finish = async () => {
    const t = await take.finish();
    if (!t.transcript) {
      setPhase("pick");
      setNotice("I didn't catch anything. Check the mic meter moves when you speak, then try again.");
      return;
    }
    const metrics = computeMetrics(t.transcript, t.durationSec);
    const done = frameworkProgress(t.transcript, fw);
    const score = scoreTake(metrics, done.filter(Boolean).length / done.length, t.netUsage);
    const base: Result = { take: t, metrics, steps: done, score, analysis: null };
    setResult(base);
    setPhase("analyzing");

    let analysis: AnswerAnalysis;
    try {
      const res = await fetch("/api/interview/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "impromptu", question: activeTopic, transcript: t.transcript, keywords: fw.steps.map((s) => s.label) }),
      });
      if (!res.ok) throw new Error(String(res.status));
      analysis = (await res.json()) as AnswerAnalysis;
    } catch {
      analysis = offlineAnalysis(t.transcript);
    }
    setResult({ ...base, analysis });
    setPhase("report");
  };

  if ((phase === "analyzing" || phase === "report") && result) {
    return (
      <ImpromptuReport
        topic={activeTopic}
        fw={fw}
        result={result}
        analyzing={phase === "analyzing"}
        onHear={(t) => void speak(t, 0.92)}
        onAgain={startPrep}
        onNew={() => {
          shuffle();
          setPhase("pick");
        }}
      />
    );
  }

  if (phase === "pick") {
    return (
      <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        <section className="space-y-5">
          <div className="rounded-xl border border-graphite-800 bg-gradient-to-b from-navy-900/70 to-graphite-950 p-6 md:p-8">
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
                  {c}
                </Chip>
              ))}
            </div>
            <p className="mt-6 text-[10px] uppercase tracking-[0.2em] text-graphite-400">Your topic</p>
            <h2 key={activeTopic} className="animate-reveal mt-1 font-serif text-3xl leading-snug text-graphite-100 md:text-4xl">
              {activeTopic}
            </h2>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button type="button" onClick={shuffle} className={secondaryButton}>
                ↻ Another topic
              </button>
              <input
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder="…or type your own (e.g. tomorrow's meeting)"
                className="min-w-0 flex-1 rounded-md border border-graphite-700 bg-graphite-950 px-3 py-2 text-sm text-graphite-100 placeholder:text-graphite-600 focus:border-gold-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <SectionLabel>Your path through it</SectionLabel>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {FRAMEWORKS.map((f) => (
                <li key={f.id}>
                  <button
                    type="button"
                    aria-pressed={f.id === fw.id}
                    onClick={() => setFrameworkId(f.id)}
                    className={`h-full w-full rounded-lg border p-3 text-left transition ${f.id === fw.id ? "border-gold-500 bg-gold-500/10" : "border-graphite-700 hover:border-graphite-600"}`}
                  >
                    <span className={`block font-medium ${f.id === fw.id ? "text-gold-300" : "text-graphite-100"}`}>{f.name}</span>
                    <span className="block text-xs text-graphite-400">{f.steps.map((s) => s.label).join(" → ")}</span>
                    <span className="mt-1 block text-xs text-graphite-400">Best for: {f.bestFor}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-4 text-sm text-graphite-300">
              <label className="flex items-center gap-2">
                Think time
                <select value={prepSec} onChange={(e) => setPrepSec(Number(e.target.value))} className="rounded-md border border-graphite-700 bg-graphite-900 px-2 py-1 text-graphite-100">
                  {[15, 30, 60].map((n) => (
                    <option key={n} value={n}>
                      {n}s
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2">
                Speak for
                <select value={targetSec} onChange={(e) => setTargetSec(Number(e.target.value))} className="rounded-md border border-graphite-700 bg-graphite-900 px-2 py-1 text-graphite-100">
                  {[60, 90, 120].map((n) => (
                    <option key={n} value={n}>
                      {n / 60 === Math.floor(n / 60) ? `${n / 60} min` : `${n}s`}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button type="button" onClick={startPrep} className={primaryButton}>
              Start thinking time
            </button>
          </div>
          {notice && <p className="text-sm text-signal-amber">{notice}</p>}
          {reference && <ReferenceText text={reference} />}
        </section>

        <aside className="h-fit space-y-3 rounded-xl border border-graphite-800 bg-navy-900/50 p-6">
          <SectionLabel tone="gold">Why this works without memorising</SectionLabel>
          <p className="font-serif text-2xl leading-snug text-graphite-100">Don&apos;t memorise speeches. Memorise one shape.</p>
          <p className="text-sm leading-relaxed text-graphite-300">
            Most confident speakers aren&apos;t reciting. They follow a simple path, like <span className="text-graphite-100">Point → Reason → Example →
            Point</span>, and fill it with whatever they know. Learn 2–3 paths and you can speak on almost any topic, in meetings, Q&amp;A, or
            on stage, with nothing to forget.
          </p>
          <p className="text-sm leading-relaxed text-graphite-300">
            While you speak, each step lights up when you use its signpost phrase (&quot;because…&quot;, &quot;for example…&quot;). Freeze for 3 seconds
            and the next step&apos;s opening words appear.
          </p>
        </aside>
      </div>
    );
  }

  // prep + live
  const light = clock >= targetSec ? "red" : clock >= targetSec * 0.85 ? "amber" : clock >= targetSec * 0.5 ? "green" : "none";

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-graphite-800 bg-gradient-to-b from-navy-900/70 to-graphite-950 p-6 md:p-8">
        <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-graphite-400">
          <span>{phase === "prep" ? "Thinking time" : "You're on"}</span>
          {phase === "prep" ? (
            <span className="font-serif text-3xl normal-case tracking-normal text-gold-400 tabular-nums">{Math.max(0, clock)}s</span>
          ) : (
            <TimingLight light={light} />
          )}
        </div>
        <h2 className="font-serif text-3xl leading-snug text-graphite-100 md:text-4xl">{activeTopic}</h2>
      </section>

      {phase === "prep" && reference && <ReferenceText text={reference} />}

      <FrameworkRail fw={fw} steps={phase === "live" ? steps : fw.steps.map(() => false)} next={phase === "live" ? nextStep : -1} showStarters={phase === "prep"} netLevel={take.net.level} />

      {phase === "live" && (
        <p className="text-sm text-graphite-400" aria-live="polite">
          {take.net.level > 0 && nextStep >= 0 ? (
            <span className="text-graphite-100">
              Next: <span className="text-gold-300">{fw.steps[nextStep].label}</span>. {fw.steps[nextStep].job}
            </span>
          ) : take.net.showBreatheCue ? (
            <span className="animate-reveal text-graphite-100">Pause. Breathe. Silence looks like thinking, not forgetting.</span>
          ) : nextStep === -1 ? (
            "Every step covered. Land your final sentence, then stop. Stopping cleanly is powerful."
          ) : (
            "Walk the path left to right. Steps light up as you go."
          )}
        </p>
      )}

      {take.error && <p className="rounded-md border border-signal-amber/40 bg-signal-amber/10 px-4 py-3 text-sm text-signal-amber">{take.error}</p>}

      <div className={camera.on ? "grid gap-5 lg:grid-cols-[1fr_380px]" : ""}>
        {phase === "prep" ? (
          <section className="rounded-xl border border-graphite-800 bg-graphite-950/60 p-5">
            <p className="text-sm text-graphite-300">
              Don&apos;t write sentences. For each step, pick <span className="text-graphite-100">one idea</span> and hold it in your head. That&apos;s all
              you need.
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  stopSpeaking();
                  setPhase("pick");
                }}
                className={secondaryButton}
              >
                Back
              </button>
              <button type="button" onClick={() => void goLive()} className={primaryButton}>
                I&apos;m ready, start now
              </button>
            </div>
          </section>
        ) : (
          <LiveAnswer
            armed
            title="What you're saying"
            finishLabel="Finish"
            finalText={take.finalText}
            interimText={take.interimText}
            micLevel={take.micLevel}
            typedMode={take.typedMode}
            typed={take.typed}
            onTyped={take.setTyped}
            onFinish={() => void finish()}
          />
        )}
        <CameraMirror camera={camera} />
      </div>
    </div>
  );
}

function ReferenceText({ text }: { text: string }) {
  return (
    <details open className="rounded-xl border border-graphite-800 bg-graphite-950/60 p-5">
      <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-[0.22em] text-graphite-400">
        Read it once, then retell it (it hides while you speak)
      </summary>
      <p className="mt-3 whitespace-pre-line font-serif text-lg leading-relaxed text-graphite-100">{text}</p>
    </details>
  );
}

function FrameworkRail({ fw, steps, next, showStarters, netLevel }: { fw: Framework; steps: boolean[]; next: number; showStarters: boolean; netLevel: 0 | 1 | 2 }) {
  return (
    <ol className={`grid gap-2 ${fw.steps.length === 4 ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
      {fw.steps.map((s, i) => {
        const done = steps[i];
        const isNext = i === next;
        const starter = showStarters || (isNext && netLevel === 2);
        return (
          <li
            key={`${s.label}-${i}`}
            className={`rounded-lg border px-4 py-3 transition-colors duration-300 ${
              done ? "border-gold-500/60 bg-gold-500/10" : isNext && netLevel > 0 ? "border-gold-500 bg-navy-900" : isNext ? "border-graphite-400/60 bg-graphite-900" : "border-graphite-700 bg-graphite-900/60"
            }`}
          >
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em]">
              <span className={done ? "text-gold-400" : "text-graphite-400"}>{String(i + 1).padStart(2, "0")}</span>
              {done && <span className="text-gold-400">✓</span>}
            </div>
            <p className={`mt-1 font-serif text-2xl leading-tight ${done ? "text-gold-300" : "text-graphite-100"}`}>{s.label}</p>
            <p className="mt-1 text-xs text-graphite-400">{s.job}</p>
            {starter && <p className="animate-reveal mt-2 font-serif text-lg italic text-gold-300">“{s.starter}”</p>}
          </li>
        );
      })}
    </ol>
  );
}

/** Toastmasters-style timing lights: guidance on length without a ticking countdown. */
function TimingLight({ light }: { light: "none" | "green" | "amber" | "red" }) {
  const copy = { none: "Keep going", green: "Good length", amber: "Start wrapping up", red: "Land it now" }[light];
  const color = { none: "bg-graphite-600", green: "bg-signal-green", amber: "bg-signal-amber", red: "bg-signal-red" }[light];
  return (
    <span className="flex items-center gap-2 normal-case tracking-normal">
      <span className={`size-3 rounded-full transition-colors duration-500 ${color}`} />
      <span className="text-sm text-graphite-300">{copy}</span>
    </span>
  );
}

function ImpromptuReport({
  topic,
  fw,
  result: r,
  analyzing,
  onHear,
  onAgain,
  onNew,
}: {
  topic: string;
  fw: Framework;
  result: Result;
  analyzing: boolean;
  onHear: (t: string) => void;
  onAgain: () => void;
  onNew: () => void;
}) {
  const hit = r.steps.filter(Boolean).length;
  const missed = fw.steps.filter((_, i) => !r.steps[i]);
  return (
    <div className="animate-reveal space-y-6">
      <h2 className="font-serif text-2xl text-graphite-300">{topic}</h2>
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <ScoreCard score={r.score} contentLabel="Structure" />
        <section className="space-y-4">
          <div className="rounded-xl border border-gold-600/40 bg-navy-900/60 p-6">
            <SectionLabel tone="gold">Coach&apos;s note</SectionLabel>
            <p className="mt-2 font-serif text-2xl leading-snug text-graphite-100">
              {analyzing ? <span className="text-graphite-400">Reviewing your talk…</span> : r.analysis?.coachingNote}
            </p>
            {missed.length > 0 && (
              <p className="mt-3 text-sm text-graphite-400">
                <span className="text-graphite-300">Steps to signpost next time:</span>{" "}
                {missed.map((s) => `${s.label} ("${s.starter}")`).join(", ")}
              </p>
            )}
          </div>
          <TakeStats
            metrics={r.metrics}
            netUsage={r.take.netUsage}
            extra={
              <Stat
                label={fw.name}
                value={`${hit}/${fw.steps.length}`}
                note={hit === fw.steps.length ? "Clear structure, start to finish." : "steps signposted"}
                tone={hit === fw.steps.length ? "good" : "warn"}
              />
            }
          />
        </section>
      </div>

      <section className="rounded-xl border border-graphite-800 bg-graphite-950/60 p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <SectionLabel>What you said</SectionLabel>
          <Legend />
        </div>
        <AnnotatedTranscript transcript={r.take.transcript} corrections={r.analysis?.corrections ?? []} />
      </section>

      {r.analysis && r.analysis.corrections.length > 0 && (
        <section className="rounded-xl border border-graphite-800 bg-graphite-950/60 p-6">
          <SectionLabel>Native / professional phrasing</SectionLabel>
          <ul className="mt-4 divide-y divide-graphite-800">
            {r.analysis.corrections.map((c, i) => (
              <li key={i} className="grid gap-1 py-3 sm:grid-cols-2 sm:gap-6">
                <p className="text-graphite-400 line-through decoration-signal-amber/60">{c.original}</p>
                <div>
                  <p className="text-gold-300">{c.suggestion}</p>
                  <p className="mt-0.5 text-xs text-graphite-400">{c.reason}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {r.analysis?.executiveRewrite && (
        <section className="rounded-xl border border-graphite-800 bg-gradient-to-br from-navy-900/60 to-graphite-950 p-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <SectionLabel tone="gold">A stronger version</SectionLabel>
            <button
              type="button"
              onClick={() => onHear(r.analysis!.executiveRewrite)}
              className="rounded-md border border-graphite-700 px-3 py-1.5 text-xs text-graphite-300 transition hover:border-gold-600 hover:text-gold-300"
            >
              ▶ Hear it, then repeat it
            </button>
          </div>
          <p className="font-serif text-xl leading-relaxed text-graphite-100">{r.analysis.executiveRewrite}</p>
        </section>
      )}

      {r.take.videoUrl && <TakePlayback url={r.take.videoUrl} filename="impromptu-take.webm" />}

      <div className="flex flex-wrap justify-end gap-3">
        <button type="button" onClick={onAgain} className={secondaryButton}>
          Same topic again
        </button>
        <button type="button" onClick={onNew} className={primaryButton}>
          New topic →
        </button>
      </div>
    </div>
  );
}
