"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CameraMirror, TakePlayback } from "@/components/camera/CameraMirror";
import { AnnotatedTranscript, Legend, Stat } from "@/components/interview/AnswerReport";
import { LiveAnswer } from "@/components/interview/LiveAnswer";
import type { Camera } from "@/hooks/useCamera";
import { useLiveTake, type TakeResult } from "@/hooks/useLiveTake";
import { computeMetrics } from "@/lib/speech-metrics";
import {
  anchorSpoken,
  type Attempt,
  type Beat,
  beatCoverage,
  COVERED,
  currentBeat,
  firstLetters,
  LADDER,
  ladder,
  type LadderLevel,
  recommend,
  type SavedSpeech,
  scoreTake,
  splitIntoBeats,
  type StageScore,
} from "@/lib/stage";
import type { SpeechMetrics } from "@/lib/types";
import { Chip, primaryButton, ScoreCard, secondaryButton, SectionLabel, TakeStats } from "./shared";

interface Props {
  speech: SavedSpeech;
  camera: Camera;
  speak: (text: string, rate?: number) => Promise<void>;
  stopSpeaking: () => void;
  onAttempt: (attempt: Attempt, nextLevel: LadderLevel) => void;
  onBack: () => void;
  onEdit: () => void;
}

interface Result {
  take: TakeResult;
  metrics: SpeechMetrics;
  coverage: number[];
  beats: Beat[];
  recall: number;
  score: StageScore;
  level: LadderLevel;
  section: number | "all";
  rec: ReturnType<typeof recommend>;
}

export function RehearsalRoom({ speech, camera, speak, stopSpeaking, onAttempt, onBack, onEdit }: Props) {
  const allBeats = useMemo(() => splitIntoBeats(speech.text), [speech.text]);
  const [level, setLevel] = useState<LadderLevel>(speech.level);
  const [section, setSection] = useState<number | "all">("all");
  const [phase, setPhase] = useState<"ready" | "live" | "report">("ready");
  const [result, setResult] = useState<Result | null>(null);
  const [listening, setListening] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const beats = useMemo(() => (section === "all" ? allBeats : [allBeats[section]]), [allBeats, section]);
  // Reading needs no freeze detection: the words are on screen.
  const take = useLiveTake({ netEnabled: level >= 2, camera });
  const coverage = useMemo(() => beatCoverage(take.transcript, beats), [take.transcript, beats]);
  const cur = phase === "live" ? currentBeat(coverage) : -1;

  const listen = async () => {
    if (listening) {
      stopSpeaking();
      return;
    }
    setListening(true);
    await speak(beats.map((b) => b.text).join(" "), 0.9);
    setListening(false);
  };

  const start = async () => {
    stopSpeaking();
    setNotice(null);
    await take.begin();
    setPhase("live");
  };

  const finish = async () => {
    const t = await take.finish();
    if (!t.transcript) {
      setPhase("ready");
      setNotice("I didn't catch anything. Check the mic meter moves when you speak, then try again.");
      return;
    }
    const metrics = computeMetrics(t.transcript, t.durationSec);
    const cov = beatCoverage(t.transcript, beats);
    const recall = cov.filter((c) => c >= COVERED).length / beats.length;
    const netUsage = level === 1 ? null : t.netUsage;
    const score = scoreTake(metrics, recall, netUsage);
    const rec = recommend(level, recall, !!netUsage);
    // Only whole-speech takes count towards the rehearsal schedule; sections are practice reps.
    if (section === "all") onAttempt({ at: new Date().toISOString(), level, recall, score: score.total, netUsed: !!netUsage }, rec.next);
    setResult({ take: { ...t, netUsage }, metrics, coverage: cov, beats, recall, score, level, section, rec });
    setPhase("report");
  };

  const again = (nextLevel: LadderLevel, nextSection: number | "all") => {
    setLevel(nextLevel);
    setSection(nextSection);
    setResult(null);
    setPhase("ready");
  };

  if (phase === "report" && result) return <RehearsalReport result={result} total={allBeats.length} onAgain={again} onBack={onBack} />;

  const hint1 = level === 3 ? "opening" : "anchors";
  const lifelineBeat = cur >= 0 ? beats[cur] : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <button type="button" onClick={onBack} className="text-xs text-graphite-400 hover:text-gold-400">
            ← All speeches
          </button>
          <h2 className="mt-1 font-serif text-4xl text-graphite-100">{speech.title}</h2>
        </div>
        {phase === "ready" && (
          <button type="button" onClick={onEdit} className="text-sm text-graphite-400 underline-offset-4 hover:text-gold-400 hover:underline">
            Edit script
          </button>
        )}
      </div>

      {phase === "ready" && (
        <section className="space-y-5 rounded-xl border border-graphite-800 bg-graphite-950/70 p-5">
          <div>
            <SectionLabel>How much help do you want?</SectionLabel>
            <ol className="mt-3 grid gap-2 sm:grid-cols-4">
              {LADDER.map((l) => (
                <li key={l.level}>
                  <button
                    type="button"
                    aria-pressed={level === l.level}
                    onClick={() => setLevel(l.level)}
                    className={`h-full w-full rounded-lg border p-3 text-left transition ${
                      level === l.level ? "border-gold-500 bg-gold-500/10" : "border-graphite-700 hover:border-graphite-600"
                    }`}
                  >
                    <span className="text-[10px] uppercase tracking-[0.2em] text-graphite-400">Step {l.level}</span>
                    <span className={`block font-serif text-xl ${level === l.level ? "text-gold-300" : "text-graphite-100"}`}>{l.name}</span>
                    <span className="block text-xs text-graphite-400">Shows: {l.shows}</span>
                    {speech.level === l.level && <span className="mt-1 block text-[10px] uppercase tracking-widest text-gold-500">Your level</span>}
                  </button>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-sm text-graphite-300">{ladder(level).hint}</p>
          </div>

          {allBeats.length > 1 && (
            <div>
              <SectionLabel>Practise</SectionLabel>
              <div className="mt-3 flex flex-wrap gap-2">
                <Chip active={section === "all"} onClick={() => setSection("all")}>
                  Whole speech
                </Chip>
                {allBeats.map((b, i) => (
                  <Chip key={b.id} active={section === i} onClick={() => setSection(i)}>
                    Section {i + 1}
                  </Chip>
                ))}
              </div>
              <p className="mt-2 text-xs text-graphite-400">
                Struggling with a long speech? Learn one section at a time, then put them together. Short pieces stick faster.
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-3">
            {notice && <p className="mr-auto text-sm text-signal-amber">{notice}</p>}
            <button type="button" onClick={() => void listen()} className={secondaryButton}>
              {listening ? "■ Stop" : "▶ Listen first"}
            </button>
            <button type="button" onClick={() => void start()} className={primaryButton}>
              Start take
            </button>
          </div>
        </section>
      )}

      {take.error && <p className="rounded-md border border-signal-amber/40 bg-signal-amber/10 px-4 py-3 text-sm text-signal-amber">{take.error}</p>}

      <div className={camera.on ? "grid gap-5 lg:grid-cols-[1fr_380px]" : ""}>
        <div className="space-y-5">
          <CueSheet beats={beats} level={level} coverage={coverage} current={cur} transcript={take.transcript} live={phase === "live"} offset={section === "all" ? 0 : section} />

          {phase === "live" && level >= 2 && lifelineBeat && (
            <Lifeline netLevel={take.net.level} beat={lifelineBeat} hint1={hint1} showBreathe={take.net.showBreatheCue} onOpen={take.net.open} />
          )}

          {phase === "live" && (
            <LiveAnswer
              armed
              title="What you're saying"
              finishLabel="Finish take"
              finalText={take.finalText}
              interimText={take.interimText}
              micLevel={take.micLevel}
              typedMode={take.typedMode}
              typed={take.typed}
              onTyped={take.setTyped}
              onFinish={() => void finish()}
            />
          )}
        </div>
        <div className="space-y-3">
          <CameraMirror camera={camera} />
        </div>
      </div>
    </div>
  );
}

/** The script, shown with as much support as the chosen ladder step allows. */
function CueSheet({
  beats,
  level,
  coverage,
  current,
  transcript,
  live,
  offset,
}: {
  beats: Beat[];
  level: LadderLevel;
  coverage: number[];
  current: number;
  transcript: string;
  live: boolean;
  offset: number;
}) {
  const refs = useRef<(HTMLLIElement | null)[]>([]);
  useEffect(() => {
    if (live && current >= 0) refs.current[current]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [current, live]);

  if (level === 4) {
    const done = coverage.filter((c) => c >= COVERED).length;
    return (
      <section className="rounded-xl border border-graphite-800 bg-gradient-to-b from-navy-900/70 to-graphite-950 p-8 text-center">
        <SectionLabel>The stage is yours</SectionLabel>
        <div className="mt-5 flex justify-center gap-2" aria-label={`${done} of ${beats.length} sections delivered`}>
          {beats.map((b, i) => (
            <span
              key={b.id}
              className={`h-2 w-10 rounded-full transition-colors duration-500 ${
                live && coverage[i] >= COVERED ? "bg-gold-500" : live && i === current ? "bg-gold-500/40" : "bg-graphite-700"
              }`}
            />
          ))}
        </div>
        <p className="mt-4 font-serif text-2xl text-graphite-300">
          {live ? `Section ${Math.min(current + 1, beats.length) + offset}` : `${beats.length} section${beats.length > 1 ? "s" : ""}, from memory`}
        </p>
        <p className="mt-1 text-sm text-graphite-400">Look up, not down. If you go quiet, a hint will appear.</p>
      </section>
    );
  }

  return (
    <ol className="space-y-3">
      {beats.map((b, i) => {
        const covered = live && coverage[i] >= COVERED;
        const isCurrent = live && i === current && !covered;
        return (
          <li
            key={b.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            className={`rounded-xl border p-5 transition-all duration-300 ${
              isCurrent
                ? "border-gold-500/70 bg-navy-900/70 shadow-sm"
                : covered
                  ? "border-gold-500/30 bg-gold-500/5"
                  : "border-graphite-800 bg-graphite-950/60"
            } ${live && !isCurrent && !covered ? "opacity-60" : ""}`}
          >
            <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.2em]">
              <span className={covered ? "text-gold-400" : "text-graphite-400"}>Section {i + 1 + offset}</span>
              {covered && <span className="text-gold-400">✓ Delivered</span>}
              {isCurrent && <span className="text-gold-500">You are here</span>}
            </div>
            {level === 1 && <p className="font-serif text-2xl leading-relaxed text-graphite-100">{b.text}</p>}
            {level === 2 && <p className="font-serif text-2xl leading-relaxed tracking-wide text-graphite-100">{firstLetters(b.text)}</p>}
            {level === 3 && (
              <ul className="flex flex-wrap gap-2">
                {b.anchors.map((a) => {
                  const said = live && anchorSpoken(a, transcript);
                  return (
                    <li
                      key={a}
                      className={`rounded-lg border px-4 py-2 font-serif text-2xl transition-colors ${
                        said ? "border-gold-500/60 bg-gold-500/10 text-gold-300" : "border-graphite-700 bg-graphite-900 text-graphite-100"
                      }`}
                    >
                      {said && <span className="mr-2 text-sm text-gold-400">✓</span>}
                      {a}
                    </li>
                  );
                })}
              </ul>
            )}
            {live && coverage[i] > 0 && !covered && (
              <div className="mt-3 h-0.5 rounded-full bg-graphite-800">
                <div className="h-0.5 rounded-full bg-gold-500/70 transition-all" style={{ width: `${Math.min(1, coverage[i] / COVERED) * 100}%` }} />
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Freeze rescue for memorised speeches. Hints always target the section you're
 * on, and escalate in the smallest steps possible, so recall stays yours.
 */
function Lifeline({
  netLevel,
  beat,
  hint1,
  showBreathe,
  onOpen,
}: {
  netLevel: 0 | 1 | 2;
  beat: Beat;
  hint1: "anchors" | "opening";
  showBreathe: boolean;
  onOpen: () => void;
}) {
  const first = hint1 === "anchors" ? <Anchors beat={beat} /> : <Opening beat={beat} />;
  const second = hint1 === "anchors" ? <Opening beat={beat} /> : <p className="font-serif text-xl leading-relaxed text-graphite-300">{firstLetters(beat.text)}</p>;
  return (
    <section aria-live="polite" className={`rounded-xl border p-5 transition-colors ${netLevel > 0 ? "border-gold-600/50 bg-navy-900/80" : "border-graphite-800 bg-graphite-950/60"}`}>
      <div className="flex items-center justify-between gap-3">
        <SectionLabel tone="gold">Lifeline</SectionLabel>
        {netLevel < 2 && (
          <button type="button" onClick={onOpen} className="rounded-md border border-graphite-700 px-3 py-1.5 text-xs text-graphite-300 transition hover:border-gold-600 hover:text-gold-300">
            Give me a hint
          </button>
        )}
      </div>
      <div className="mt-3 space-y-3">
        {netLevel === 0 &&
          (showBreathe ? (
            <p className="animate-reveal text-sm text-graphite-100">
              Pause. Breathe. <span className="text-graphite-400">The audience can&apos;t tell you&apos;re searching. It just looks like you&apos;re thinking.</span>
            </p>
          ) : (
            <p className="text-sm text-graphite-400">Standing by. If you go quiet for 3 seconds, a hint for this section appears.</p>
          ))}
        {netLevel >= 1 && <div className="animate-reveal">{first}</div>}
        {netLevel === 2 && <div className="animate-reveal">{second}</div>}
      </div>
    </section>
  );
}

function Anchors({ beat }: { beat: Beat }) {
  return (
    <div className="flex flex-wrap gap-2">
      {beat.anchors.map((a) => (
        <span key={a} className="rounded-lg border border-gold-500/50 bg-graphite-950 px-4 py-2 font-serif text-2xl text-graphite-100">
          {a}
        </span>
      ))}
    </div>
  );
}

function Opening({ beat }: { beat: Beat }) {
  return (
    <figure className="border-l-2 border-gold-500 pl-4">
      <figcaption className="text-[10px] uppercase tracking-[0.2em] text-graphite-400">This section starts</figcaption>
      <blockquote className="mt-1 font-serif text-xl italic text-gold-300">“{beat.opening}”</blockquote>
    </figure>
  );
}

function RehearsalReport({
  result: r,
  total,
  onAgain,
  onBack,
}: {
  result: Result;
  total: number;
  onAgain: (level: LadderLevel, section: number | "all") => void;
  onBack: () => void;
}) {
  const offset = r.section === "all" ? 0 : r.section;
  const firstMissed = r.coverage.findIndex((c) => c < COVERED);
  const delivered = r.coverage.filter((c) => c >= COVERED).length;

  return (
    <div className="animate-reveal space-y-6">
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <ScoreCard
          score={r.score}
          contentLabel="Recall"
          independenceNote={r.level === 1 ? "Reading take: independence isn't tested at step 1." : undefined}
        />
        <section className="space-y-4">
          <div className="rounded-xl border border-gold-600/40 bg-navy-900/60 p-6">
            <SectionLabel tone="gold">Next step</SectionLabel>
            <p className="mt-2 font-serif text-2xl leading-snug text-graphite-100">{r.rec.message}</p>
            <p className="mt-3 text-sm text-graphite-400">
              This take: <span className="text-graphite-300">{ladder(r.level).name}</span>
              {r.section !== "all" && <> · Section {r.section + 1} of {total}</>}
            </p>
          </div>
          <TakeStats
            metrics={r.metrics}
            netUsage={r.take.netUsage}
            extra={
              <Stat
                label="Recall"
                value={`${delivered}/${r.beats.length}`}
                note={delivered === r.beats.length ? "Every section delivered." : "sections delivered"}
                tone={r.recall >= 0.85 ? "good" : "warn"}
              />
            }
          />
        </section>
      </div>

      <section className="rounded-xl border border-graphite-800 bg-graphite-950/60 p-6">
        <SectionLabel>Section by section</SectionLabel>
        <ol className="mt-4 divide-y divide-graphite-800">
          {r.beats.map((b, i) => {
            const c = r.coverage[i];
            const status = c >= COVERED ? "delivered" : c >= COVERED / 2 ? "partial" : "missed";
            return (
              <li key={b.id} className="grid gap-2 py-3 sm:grid-cols-[120px_1fr]">
                <p className={`text-xs uppercase tracking-[0.18em] ${status === "delivered" ? "text-signal-green" : status === "partial" ? "text-signal-amber" : "text-signal-red"}`}>
                  {i + 1 + offset}. {status}
                </p>
                <p className={status === "delivered" ? "text-sm text-graphite-400" : "text-graphite-100"}>
                  {b.text}
                  {status !== "delivered" && <span className="mt-1 block text-xs text-graphite-400">Read this one aloud twice before your next take.</span>}
                </p>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="rounded-xl border border-graphite-800 bg-graphite-950/60 p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <SectionLabel>What you said</SectionLabel>
          <Legend />
        </div>
        <AnnotatedTranscript transcript={r.take.transcript} corrections={[]} />
      </section>

      {r.take.videoUrl && <TakePlayback url={r.take.videoUrl} filename="speech-take.webm" />}

      <div className="flex flex-wrap justify-end gap-3">
        <button type="button" onClick={onBack} className={secondaryButton}>
          All speeches
        </button>
        {r.section === "all" && firstMissed >= 0 && r.beats.length > 1 && (
          <button type="button" onClick={() => onAgain(r.level, firstMissed)} className={secondaryButton}>
            Practise section {firstMissed + 1} alone
          </button>
        )}
        {r.section !== "all" && (
          <button type="button" onClick={() => onAgain(r.rec.next, "all")} className={secondaryButton}>
            Try the whole speech
          </button>
        )}
        <button type="button" onClick={() => onAgain(r.rec.next, r.section)} className={primaryButton}>
          Next take: {ladder(r.rec.next).name}
        </button>
      </div>
    </div>
  );
}
