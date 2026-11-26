"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CameraMirror, TakePlayback } from "@/components/camera/CameraMirror";
import { AnnotatedTranscript, Legend, Stat } from "@/components/interview/AnswerReport";
import { LiveAnswer } from "@/components/interview/LiveAnswer";
import { Chip, primaryButton, ScoreCard, secondaryButton, SectionLabel, TakeStats } from "@/components/stage/shared";
import type { Camera } from "@/hooks/useCamera";
import { type TakeResult, useLiveTake } from "@/hooks/useLiveTake";
import {
  type AnswerCard,
  answerRecall,
  cheatCode,
  fullAnswer,
  type Level,
  levelInfo,
  LEVELS,
  lettersOf,
  pillarProgress,
  recommendLevel,
  SIGNPOSTS,
  signpostsUsed,
} from "@/lib/leadership";
import { offlineAnalysis } from "@/lib/offline-coach";
import { computeMetrics } from "@/lib/speech-metrics";
import { scoreTake, type StageScore } from "@/lib/stage";
import type { AnswerAnalysis, SpeechMetrics } from "@/lib/types";
import { profilePayload } from "@/lib/profile";
import { logTake } from "@/lib/progress";
import { buildScorecard } from "@/lib/scorecard";
import { ExecutiveScorecard } from "@/components/ExecutiveScorecard";

type Phase = "ready" | "asking" | "think" | "live" | "analyzing" | "report";

export interface TakeSummary {
  level: Level;
  recall: number;
  score: number;
  netUsed: boolean;
  pillars: boolean[];
}

interface Result {
  take: TakeResult;
  metrics: SpeechMetrics;
  pillars: boolean[];
  signposts: boolean[];
  recall: number;
  score: StageScore;
  analysis: AnswerAnalysis | null;
}

interface Props {
  card: AnswerCard;
  initialLevel: Level;
  /** "lab" = learn one answer with fading support. "mock" = interview conditions, question read aloud, timed. */
  mode: "lab" | "mock";
  thinkSec?: number;
  targetSec?: number;
  camera: Camera;
  speak: (text: string, rate?: number) => Promise<void>;
  stopSpeaking: () => void;
  onRecorded: (t: TakeSummary) => void;
  onExit: () => void;
  /** Mock mode: go to the next question. */
  onNext?: () => void;
  nextLabel?: string;
  /** Mock mode starts by reading the question aloud straight away. */
  autoStart?: boolean;
  /** Shown above the question, e.g. "Question 2 of 5". */
  eyebrow?: string;
}

export function AnswerRoom({
  card,
  initialLevel,
  mode,
  thinkSec = 0,
  targetSec = 90,
  camera,
  speak,
  stopSpeaking,
  onRecorded,
  onExit,
  onNext,
  nextLabel = "Next question →",
  autoStart = false,
  eyebrow,
}: Props) {
  const [level, setLevel] = useState<Level>(mode === "mock" ? 4 : initialLevel);
  const [phase, setPhase] = useState<Phase>("ready");
  const [clock, setClock] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Level 1 shows the full answer, so automatic freeze hints are off; the manual hint button still works.
  const take = useLiveTake({ netEnabled: level > 1, camera });
  const pillars = useMemo(() => pillarProgress(card, take.transcript), [card, take.transcript]);
  const nextPillar = pillars.indexOf(false);

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

  const start = useCallback(async () => {
    setResult(null);
    setPhase("asking");
    await speak(card.question);
    if (thinkSec > 0) {
      setClock(thinkSec);
      setPhase("think");
    } else void goLive();
  }, [card.question, goLive, speak, thinkSec]);

  useEffect(() => {
    if (autoStart) void start();
    return () => take.cancel();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const goLiveRef = useRef(goLive);
  goLiveRef.current = goLive;
  useEffect(() => {
    if (phase !== "think" && phase !== "live") return;
    const id = window.setInterval(() => setClock((c) => (phase === "think" ? c - 1 : c + 1)), 1000);
    return () => window.clearInterval(id);
  }, [phase]);
  useEffect(() => {
    if (phase === "think" && clock <= 0) void goLiveRef.current();
  }, [phase, clock]);

  const finish = async () => {
    const t = await take.finish();
    if (!t.transcript) {
      setPhase("ready");
      setNotice("I didn't catch anything. Check the mic meter moves when you speak, then try again.");
      return;
    }
    const metrics = computeMetrics(t.transcript, t.durationSec);
    const got = pillarProgress(card, t.transcript);
    const recall = answerRecall(card, t.transcript);
    const score = scoreTake(metrics, recall, t.netUsage);
    const base: Result = { take: t, metrics, pillars: got, signposts: signpostsUsed(t.transcript), recall, score, analysis: null };
    setResult(base);
    onRecorded({ level, recall, score: score.total, netUsed: !!t.netUsage, pillars: got });
    logTake(mode === "mock" ? "mock" : "leadership", metrics, score.total);

    if (mode === "mock") {
      setResult({ ...base, analysis: offlineAnalysis(t.transcript) });
      setPhase("report");
      return;
    }
    setPhase("analyzing");
    let analysis: AnswerAnalysis;
    try {
      const res = await fetch("/api/interview/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "interview", question: card.question, transcript: t.transcript, keywords: card.pillars.map((p) => p.key), profile: profilePayload() }),
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
    const rec = recommendLevel(level, result.recall, !!result.take.netUsage);
    return (
      <Report
        card={card}
        mode={mode}
        level={level}
        result={result}
        analyzing={phase === "analyzing"}
        recommendation={rec.message}
        onHear={(t) => void speak(t, 0.92)}
        onAgain={() => {
          if (mode === "lab") setLevel(rec.next);
          setPhase("ready");
          setResult(null);
        }}
        onExit={onExit}
        onNext={onNext}
        nextLabel={nextLabel}
      />
    );
  }

  const light = clock >= targetSec ? "red" : clock >= targetSec * 0.8 ? "amber" : clock >= targetSec * 0.4 ? "green" : "none";

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-graphite-800 bg-gradient-to-b from-navy-900/70 to-graphite-950 p-6 md:p-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-[0.2em] text-graphite-400">
          <span>{eyebrow ?? card.topic}</span>
          {phase === "think" && <span className="font-serif text-3xl normal-case tracking-normal text-gold-400 tabular-nums">{Math.max(0, clock)}s</span>}
          {phase === "live" && mode === "mock" && <TimingLight light={light} />}
          {phase === "asking" && <span className="normal-case tracking-normal text-graphite-300">Interviewer is asking…</span>}
        </div>
        <h2 className="font-serif text-3xl leading-snug text-graphite-100 md:text-4xl">{card.question}</h2>
        {phase === "think" && <p className="mt-3 text-sm text-graphite-300">Breathe. Find your three pillar words. That&apos;s all you need.</p>}
      </section>

      {mode === "lab" && phase === "ready" && (
        <div className="space-y-2">
          <SectionLabel>Support level</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {LEVELS.map((l) => (
              <Chip key={l.level} active={level === l.level} onClick={() => setLevel(l.level)}>
                {l.level}. {l.name}
              </Chip>
            ))}
          </div>
          <p className="text-sm text-graphite-400">
            <span className="text-graphite-200">{levelInfo(level).shows}.</span> {levelInfo(level).hint}
          </p>
        </div>
      )}

      <PillarRail card={card} level={level} progress={phase === "live" ? pillars : card.pillars.map(() => false)} next={phase === "live" ? nextPillar : -1} netLevel={take.net.level} />

      {level <= 2 && phase !== "asking" && <Support card={card} level={level} />}

      {phase === "live" && (
        <p className="text-sm text-graphite-400" aria-live="polite">
          {take.net.level > 0 && nextPillar >= 0 ? (
            <span className="text-graphite-100">
              Next pillar: <span className="text-gold-300">{card.pillars[nextPillar].key}</span> ({card.pillars[nextPillar].tag})
              {take.net.level >= 2 && <span className="text-graphite-300">. Start with: &quot;{opening(card.pillars[nextPillar].text)}&quot;</span>}
            </span>
          ) : take.net.showBreatheCue ? (
            <span className="animate-reveal text-graphite-100">Pause. Breathe. A calm pause reads as thinking, not forgetting.</span>
          ) : nextPillar === -1 ? (
            card.close ? "All three pillars delivered. Land your closing line, then stop." : "All three pillars delivered. Stop cleanly. That's powerful."
          ) : (
            "Signpost as you go: First… Second… Third…"
          )}
          {nextPillar >= 0 && take.net.level < 2 && (
            <button
              type="button"
              onClick={take.net.open}
              className="ml-3 rounded-md border border-graphite-700 px-2.5 py-1 text-xs text-graphite-300 transition hover:border-gold-600 hover:text-gold-300"
            >
              I&apos;m stuck, give me a hint
            </button>
          )}
        </p>
      )}

      {card.source && phase === "ready" && (
        <details className="rounded-xl border border-graphite-800 bg-graphite-950/60 p-4">
          <summary className="cursor-pointer text-sm text-graphite-300">Read the original text first</summary>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-graphite-200">{card.source}</p>
        </details>
      )}

      {take.error && <p className="rounded-md border border-signal-amber/40 bg-signal-amber/10 px-4 py-3 text-sm text-signal-amber">{take.error}</p>}
      {notice && <p className="text-sm text-signal-amber">{notice}</p>}

      <div className={camera.on ? "grid gap-5 lg:grid-cols-[1fr_380px]" : ""}>
        {phase === "live" ? (
          <LiveAnswer
            armed
            timeZone={mode === "mock" ? [Math.round(targetSec / 2), Math.round(targetSec * 0.83)] : undefined}
            finishLabel="I've finished"
            finalText={take.finalText}
            interimText={take.interimText}
            micLevel={take.micLevel}
            typedMode={take.typedMode}
            typed={take.typed}
            onTyped={take.setTyped}
            onFinish={() => void finish()}
          />
        ) : (
          <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-graphite-800 bg-graphite-950/60 p-5">
            <button type="button" onClick={onExit} className={secondaryButton}>
              ← Back
            </button>
            <div className="flex flex-wrap gap-3">
              {phase === "ready" && level === 1 && (
                <button type="button" onClick={() => void speak(fullAnswer(card), 0.92)} className={secondaryButton}>
                  ▶ Hear the model answer
                </button>
              )}
              {phase === "think" ? (
                <button type="button" onClick={() => void goLive()} className={primaryButton}>
                  I&apos;m ready, start now
                </button>
              ) : (
                <button type="button" disabled={phase === "asking"} onClick={() => void start()} className={primaryButton}>
                  {phase === "asking" ? "Listening to the question…" : "Ask me, then I'll answer"}
                </button>
              )}
            </div>
          </section>
        )}
        <CameraMirror camera={camera} />
      </div>
    </div>
  );
}

function opening(text: string) {
  const words = text.replace(/^[^:]*:\s*/, "").split(/\s+/);
  return `${words.slice(0, 6).join(" ")} …`;
}

function PillarRail({ card, level, progress, next, netLevel }: { card: AnswerCard; level: Level; progress: boolean[]; next: number; netLevel: number }) {
  return (
    <ol className="grid gap-2 sm:grid-cols-3">
      {card.pillars.map((p, i) => {
        const done = progress[i];
        const hinted = netLevel > 0 && i === next;
        const visible = level <= 3 || done || hinted;
        return (
          <li
            key={i}
            className={`rounded-lg border p-3 transition ${
              done ? "border-signal-green/60 bg-signal-green/10" : hinted ? "border-gold-500 bg-gold-500/10" : "border-graphite-800 bg-graphite-950/60"
            }`}
          >
            <span className="block text-[10px] uppercase tracking-[0.2em] text-graphite-400">
              {["First", "Second", "Third", "Fourth", "Fifth"][i] ?? `#${i + 1}`} {done && "✓"}
            </span>
            <span className={`block font-serif text-xl ${done ? "text-signal-green" : "text-graphite-100"}`}>{visible ? p.key : "· · ·"}</span>
            {visible && <span className="block text-xs text-graphite-400">{p.tag}</span>}
          </li>
        );
      })}
    </ol>
  );
}

function Support({ card, level }: { card: AnswerCard; level: Level }) {
  const show = (t: string) => (level === 1 ? t : lettersOf(t));
  return (
    <section className={`space-y-3 rounded-xl border border-graphite-800 bg-graphite-950/60 p-5 leading-relaxed ${level === 2 ? "font-mono text-sm tracking-wide" : ""}`}>
      <p className="text-graphite-300">{show(card.opening)}</p>
      {card.pillars.map((p, i) => (
        <p key={i} className="text-graphite-100">
          {show(p.text)}
        </p>
      ))}
      {card.close && <p className="text-graphite-300">{show(card.close)}</p>}
    </section>
  );
}

function TimingLight({ light }: { light: "none" | "green" | "amber" | "red" }) {
  const copy = { none: "Keep going", green: "Good length", amber: "Start landing it", red: "Wrap up now" }[light];
  const color = { none: "bg-graphite-600", green: "bg-signal-green", amber: "bg-signal-amber", red: "bg-signal-red" }[light];
  return (
    <span className="flex items-center gap-2 normal-case tracking-normal">
      <span className={`size-3 rounded-full transition-colors duration-500 ${color}`} />
      <span className="text-sm text-graphite-300">{copy}</span>
    </span>
  );
}

function Report({
  card,
  mode,
  level,
  result: r,
  analyzing,
  recommendation,
  onHear,
  onAgain,
  onExit,
  onNext,
  nextLabel,
}: {
  card: AnswerCard;
  mode: "lab" | "mock";
  level: Level;
  result: Result;
  analyzing: boolean;
  recommendation: string;
  onHear: (t: string) => void;
  onAgain: () => void;
  onExit: () => void;
  onNext?: () => void;
  nextLabel: string;
}) {
  const hit = r.pillars.filter(Boolean).length;
  const signs = r.signposts.filter(Boolean).length;
  const missed = card.pillars.filter((_, i) => !r.pillars[i]);
  return (
    <div className="animate-reveal space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-graphite-400">
          {card.topic} · {mode === "mock" ? "Interview conditions" : `Level ${level}: ${levelInfo(level).name}`}
        </p>
        <h2 className="mt-1 font-serif text-2xl text-graphite-300">{card.question}</h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <ScoreCard score={r.score} contentLabel="Recall" independenceNote={`Recall ${Math.round(r.recall * 100)}% of the model answer's substance.`} />
        <section className="space-y-4">
          <div className="rounded-xl border border-gold-600/40 bg-navy-900/60 p-6">
            <SectionLabel tone="gold">{mode === "lab" ? "Next step" : "Coach's note"}</SectionLabel>
            <p className="mt-2 font-serif text-2xl leading-snug text-graphite-100">
              {mode === "lab" ? recommendation : analyzing ? <span className="text-graphite-400">Reviewing…</span> : r.analysis?.coachingNote}
            </p>
            {mode === "lab" && r.analysis && !analyzing && <p className="mt-3 text-sm text-graphite-300">{r.analysis.coachingNote}</p>}
            {missed.length > 0 && (
              <p className="mt-3 text-sm text-graphite-400">
                <span className="text-graphite-300">Pillars to bring in next time:</span> {missed.map((p) => `${p.key} (${p.tag})`).join(", ")}
              </p>
            )}
          </div>
          <TakeStats
            metrics={r.metrics}
            netUsage={r.take.netUsage}
            extra={
              <>
                <Stat
                  label="Pillars"
                  value={`${hit}/${card.pillars.length}`}
                  note={hit === card.pillars.length ? "Every pillar landed." : "pillars delivered"}
                  tone={hit === card.pillars.length ? "good" : "warn"}
                />
                <Stat
                  label="Signposts"
                  value={`${signs}/3`}
                  note={signs === 3 ? "First, second, third: you sounded in control." : `Missing: ${SIGNPOSTS.filter((_, i) => !r.signposts[i]).map((s) => s.label).join(", ")}`}
                  tone={signs >= 2 ? "good" : "warn"}
                />
              </>
            }
          />
        </section>
      </div>

      <ExecutiveScorecard
        sc={buildScorecard(r.take.transcript, r.metrics, card.pillars.map((p, i) => ({ key: p.key, hit: r.pillars[i] })))}
        transcript={r.take.transcript}
        keys={card.pillars.map((p) => p.key)}
        analysis={r.analysis}
        analyzing={analyzing}
        onHear={onHear}
      />

      <section className="rounded-xl border border-graphite-800 bg-graphite-950/60 p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <SectionLabel>What you said</SectionLabel>
          <Legend />
        </div>
        <AnnotatedTranscript transcript={r.take.transcript} corrections={r.analysis?.corrections ?? []} />
      </section>

      <section className="rounded-xl border border-graphite-800 bg-gradient-to-br from-navy-900/60 to-graphite-950 p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <SectionLabel tone="gold">Your model answer · {cheatCode(card)}</SectionLabel>
          <button
            type="button"
            onClick={() => onHear(fullAnswer(card))}
            className="rounded-md border border-graphite-700 px-3 py-1.5 text-xs text-graphite-300 transition hover:border-gold-600 hover:text-gold-300"
          >
            ▶ Hear it, then repeat it
          </button>
        </div>
        <div className="space-y-3 leading-relaxed text-graphite-200">
          <p>{card.opening}</p>
          {card.pillars.map((p, i) => (
            <p key={i} className={r.pillars[i] ? "" : "rounded-md bg-signal-amber/10 px-2 py-1"}>
              {p.text}
            </p>
          ))}
          {card.close && <p>{card.close}</p>}
        </div>
      </section>

      {mode === "lab" && r.analysis?.executiveRewrite && r.analysis.source === "ai" && (
        <section className="rounded-xl border border-graphite-800 bg-graphite-950/60 p-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <SectionLabel>Your take, polished</SectionLabel>
            <button
              type="button"
              onClick={() => onHear(r.analysis!.executiveRewrite)}
              className="rounded-md border border-graphite-700 px-3 py-1.5 text-xs text-graphite-300 transition hover:border-gold-600 hover:text-gold-300"
            >
              ▶ Hear it
            </button>
          </div>
          <p className="font-serif text-xl leading-relaxed text-graphite-100">{r.analysis.executiveRewrite}</p>
        </section>
      )}

      {r.take.videoUrl && <TakePlayback url={r.take.videoUrl} filename="leadership-take.webm" />}

      <div className="flex flex-wrap justify-end gap-3">
        <button type="button" onClick={onExit} className={secondaryButton}>
          {mode === "mock" ? "End interview" : "Back to answers"}
        </button>
        <button type="button" onClick={onAgain} className={secondaryButton}>
          Try again
        </button>
        {onNext && (
          <button type="button" onClick={onNext} className={primaryButton}>
            {nextLabel}
          </button>
        )}
      </div>
    </div>
  );
}
