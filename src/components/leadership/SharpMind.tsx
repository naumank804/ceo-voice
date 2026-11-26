"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CameraMirror } from "@/components/camera/CameraMirror";
import { LiveAnswer } from "@/components/interview/LiveAnswer";
import { Stat } from "@/components/interview/AnswerReport";
import { Chip, primaryButton, secondaryButton, SectionLabel, TakeStats } from "@/components/stage/shared";
import type { Camera } from "@/hooks/useCamera";
import { type TakeResult, useLiveTake } from "@/hooks/useLiveTake";
import {
  type AnswerCard,
  BRIDGE_PHRASES,
  type LeadershipState,
  recordFlash,
  recordSprint,
  factOrder,
  reviewOrder,
  SIGNPOSTS,
  signpostsUsed,
  SPRINT_PROMPTS,
} from "@/lib/leadership";
import { computeMetrics } from "@/lib/speech-metrics";
import type { SpeechMetrics } from "@/lib/types";
import { logTake } from "@/lib/progress";

export type Drill = "flash" | "facts" | "sprint" | "bridges";

interface Props {
  state: LeadershipState;
  update: (fn: (s: LeadershipState) => LeadershipState) => void;
  camera: Camera;
  speak: (text: string, rate?: number) => Promise<void>;
  stopSpeaking: () => void;
  initialDrill?: Drill;
}

const DRILLS: { id: Drill; name: string; body: string }[] = [
  { id: "flash", name: "Cheat-code recall", body: "See the question, say the three pillars in 10 seconds. Trains instant retrieval." },
  { id: "facts", name: "CV numbers", body: "Your budgets, percentages and team sizes. Know them without thinking." },
  { id: "sprint", name: "Rule-of-three sprint", body: "A surprise leadership prompt. Three points, 45 seconds, no notes. Trains thinking on your feet." },
  { id: "bridges", name: "Bridge phrases", body: "Lines that fill a pause like a leader, so a blank moment never sounds like one." },
];

export function SharpMind({ state, update, camera, speak, stopSpeaking, initialDrill = "flash" }: Props) {
  const [drill, setDrill] = useState<Drill>(initialDrill);
  return (
    <div className="space-y-6">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {DRILLS.map((d) => (
          <button
            key={d.id}
            type="button"
            aria-pressed={drill === d.id}
            onClick={() => {
              stopSpeaking();
              setDrill(d.id);
            }}
            className={`rounded-lg border p-3 text-left transition ${drill === d.id ? "border-gold-500 bg-gold-500/10" : "border-graphite-800 hover:border-graphite-600"}`}
          >
            <span className={`block font-medium ${drill === d.id ? "text-gold-300" : "text-graphite-100"}`}>{d.name}</span>
            <span className="block text-xs text-graphite-400">{d.body}</span>
          </button>
        ))}
      </div>
      {drill === "flash" && <FlashRecall state={state} update={update} speak={speak} />}
      {drill === "facts" && <FactRecall state={state} update={update} />}
      {drill === "sprint" && <Sprint update={update} camera={camera} speak={speak} stopSpeaking={stopSpeaking} />}
      {drill === "bridges" && <Bridges speak={speak} />}
    </div>
  );
}

// ── Cheat-code recall ───────────────────────────────────────────────────────

const FLASH_SEC = 10;

function FlashRecall({ state, update, speak }: Pick<Props, "state" | "update" | "speak">) {
  // Fix the deck when the drill starts so grading doesn't reshuffle it mid-round.
  const [deck, setDeck] = useState<AnswerCard[]>(() => reviewOrder(state).slice(0, 6));
  const [i, setI] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [clock, setClock] = useState(FLASH_SEC);
  const [tally, setTally] = useState({ got: 0, missed: 0 });
  const card = deck[i];

  useEffect(() => {
    if (revealed || !card) return;
    const id = window.setInterval(() => setClock((c) => c - 1), 1000);
    return () => window.clearInterval(id);
  }, [revealed, card]);
  useEffect(() => {
    if (clock <= 0) setRevealed(true);
  }, [clock]);

  const grade = (got: boolean) => {
    update((s) => recordFlash(s, card.id, got));
    setTally((t) => ({ got: t.got + (got ? 1 : 0), missed: t.missed + (got ? 0 : 1) }));
    setI(i + 1);
    setRevealed(false);
    setClock(FLASH_SEC);
  };

  const restart = () => {
    setDeck(reviewOrder(state).slice(0, 6));
    setI(0);
    setTally({ got: 0, missed: 0 });
    setRevealed(false);
    setClock(FLASH_SEC);
  };

  if (!card) {
    return (
      <section className="animate-reveal space-y-4 rounded-xl border border-gold-600/40 bg-navy-900/60 p-6">
        <SectionLabel tone="gold">Round complete</SectionLabel>
        <p className="font-serif text-3xl text-graphite-100">
          {tally.got} of {tally.got + tally.missed} recalled instantly
        </p>
        <p className="text-sm text-graphite-300">Missed cards come back first next time. Remembered ones come back in a few days, just before you&apos;d forget them.</p>
        <button type="button" onClick={restart} className={primaryButton}>
          Another round
        </button>
      </section>
    );
  }

  return (
    <section className="space-y-5 rounded-xl border border-graphite-800 bg-gradient-to-b from-navy-900/70 to-graphite-950 p-6 md:p-8">
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-graphite-400">
        <span>
          Card {i + 1} of {deck.length}
        </span>
        {!revealed && <span className="font-serif text-3xl normal-case tracking-normal text-gold-400 tabular-nums">{clock}s</span>}
      </div>
      <h2 className="font-serif text-3xl leading-snug text-graphite-100">{card.question}</h2>
      <p className="text-sm text-graphite-400">Say your three pillar words out loud, then the first line of the answer.</p>
      {revealed ? (
        <div className="animate-reveal space-y-4">
          <ol className="grid gap-2 sm:grid-cols-3">
            {card.pillars.map((p, j) => (
              <li key={j} className="rounded-lg border border-gold-500/60 bg-gold-500/10 p-3">
                <span className="block font-serif text-xl text-gold-300">{p.key}</span>
                <span className="block text-xs text-graphite-400">{p.tag}</span>
              </li>
            ))}
          </ol>
          <p className="text-sm italic text-graphite-300">&quot;{card.opening}&quot;</p>
          <div className="flex flex-wrap justify-end gap-3">
            <button type="button" onClick={() => void speak(card.pillars.map((p) => p.key).join(". "))} className={secondaryButton}>
              ▶ Hear it
            </button>
            <button type="button" onClick={() => grade(false)} className={secondaryButton}>
              Missed one
            </button>
            <button type="button" onClick={() => grade(true)} className={primaryButton}>
              Got all three
            </button>
          </div>
        </div>
      ) : (
        <div className="flex justify-end">
          <button type="button" onClick={() => setRevealed(true)} className={secondaryButton}>
            Reveal
          </button>
        </div>
      )}
    </section>
  );
}

// ── CV numbers ──────────────────────────────────────────────────────────────

const FACT_SEC = 8;

function FactRecall({ state, update }: Pick<Props, "state" | "update">) {
  const [deck, setDeck] = useState(() => factOrder(state).slice(0, 8));
  const [i, setI] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [clock, setClock] = useState(FACT_SEC);
  const [got, setGot] = useState(0);
  const fact = deck[i];

  useEffect(() => {
    if (revealed || !fact) return;
    const id = window.setInterval(() => setClock((c) => c - 1), 1000);
    return () => window.clearInterval(id);
  }, [revealed, fact]);
  useEffect(() => {
    if (clock <= 0) setRevealed(true);
  }, [clock]);

  if (!state.facts.length) {
    return (
      <p className="rounded-xl border border-graphite-800 bg-graphite-950/60 p-6 text-sm text-graphite-300">
        Import your CV in <span className="text-graphite-100">My CV</span> and generate your questions. Your numbers and facts will appear here.
      </p>
    );
  }

  const grade = (ok: boolean) => {
    update((s) => recordFlash(s, fact.id, ok, "facts"));
    if (ok) setGot((g) => g + 1);
    setI(i + 1);
    setRevealed(false);
    setClock(FACT_SEC);
  };

  if (!fact) {
    return (
      <section className="animate-reveal space-y-4 rounded-xl border border-gold-600/40 bg-navy-900/60 p-6">
        <SectionLabel tone="gold">Round complete</SectionLabel>
        <p className="font-serif text-3xl text-graphite-100">
          {got} of {deck.length} instantly
        </p>
        <button
          type="button"
          onClick={() => {
            setDeck(factOrder(state).slice(0, 8));
            setI(0);
            setGot(0);
            setRevealed(false);
            setClock(FACT_SEC);
          }}
          className={primaryButton}
        >
          Another round
        </button>
      </section>
    );
  }

  return (
    <section className="space-y-5 rounded-xl border border-graphite-800 bg-gradient-to-b from-navy-900/70 to-graphite-950 p-6 md:p-8">
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-graphite-400">
        <span>
          Fact {i + 1} of {deck.length}
        </span>
        {!revealed && <span className="font-serif text-3xl normal-case tracking-normal text-gold-400 tabular-nums">{clock}s</span>}
      </div>
      <h2 className="font-serif text-2xl leading-snug text-graphite-100 md:text-3xl">{fact.q}</h2>
      <p className="text-sm text-graphite-400">Say the answer out loud, the way you would in an interview.</p>
      {revealed ? (
        <div className="animate-reveal space-y-4">
          <p className="font-serif text-4xl text-gold-300">{fact.a}</p>
          <div className="flex flex-wrap justify-end gap-3">
            <button type="button" onClick={() => grade(false)} className={secondaryButton}>
              Not instantly
            </button>
            <button type="button" onClick={() => grade(true)} className={primaryButton}>
              Knew it
            </button>
          </div>
        </div>
      ) : (
        <div className="flex justify-end">
          <button type="button" onClick={() => setRevealed(true)} className={secondaryButton}>
            Reveal
          </button>
        </div>
      )}
    </section>
  );
}

// ── Rule-of-three sprint ────────────────────────────────────────────────────

type SprintPhase = "pick" | "think" | "live" | "report";
const THINK_SEC = 10;
const SPEAK_SEC = 45;

function Sprint({ update, camera, speak, stopSpeaking }: Pick<Props, "update" | "camera" | "speak" | "stopSpeaking">) {
  const [prompt, setPrompt] = useState(SPRINT_PROMPTS[0]);
  const [phase, setPhase] = useState<SprintPhase>("pick");
  const [clock, setClock] = useState(0);
  const [result, setResult] = useState<{ take: TakeResult; metrics: SpeechMetrics; signs: boolean[] } | null>(null);
  const take = useLiveTake({ netEnabled: true, camera });
  const signs = useMemo(() => signpostsUsed(take.transcript), [take.transcript]);
  const nextSign = signs.indexOf(false);

  const shuffle = useCallback(() => {
    setPrompt((cur) => {
      const pool = SPRINT_PROMPTS.filter((p) => p !== cur);
      return pool[Math.floor(Math.random() * pool.length)];
    });
  }, []);
  useEffect(() => shuffle(), [shuffle]);

  const finishRef = useRef<() => void>(() => {});
  // The clock keeps ticking while the mic starts/stops; make each transition run once.
  const busyRef = useRef(false);
  const goLive = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      stopSpeaking();
      await take.begin();
      setClock(SPEAK_SEC);
      setPhase("live");
    } finally {
      busyRef.current = false;
    }
  };
  const goLiveRef = useRef(goLive);
  goLiveRef.current = goLive;

  const finish = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      const t = await take.finish();
      const metrics = computeMetrics(t.transcript, t.durationSec);
      setResult({ take: t, metrics, signs: signpostsUsed(t.transcript) });
      if (t.transcript) {
        update(recordSprint);
        logTake("sprint", metrics);
      }
      setPhase("report");
    } finally {
      busyRef.current = false;
    }
  };
  finishRef.current = () => void finish();

  useEffect(() => {
    if (phase !== "think" && phase !== "live") return;
    const id = window.setInterval(() => setClock((c) => c - 1), 1000);
    return () => window.clearInterval(id);
  }, [phase]);
  useEffect(() => {
    if (clock > 0) return;
    if (phase === "think") void goLiveRef.current();
    else if (phase === "live") finishRef.current();
  }, [phase, clock]);

  useEffect(() => () => take.cancel(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const start = () => {
    setResult(null);
    setClock(THINK_SEC);
    setPhase("think");
    void speak(prompt);
  };

  if (phase === "report" && result) {
    const n = result.signs.filter(Boolean).length;
    return (
      <div className="animate-reveal space-y-5">
        <h2 className="font-serif text-2xl text-graphite-300">{prompt}</h2>
        <div className="rounded-xl border border-gold-600/40 bg-navy-900/60 p-6">
          <SectionLabel tone="gold">Result</SectionLabel>
          <p className="mt-2 font-serif text-2xl leading-snug text-graphite-100">
            {!result.take.transcript
              ? "Nothing came through. Check the mic and try again."
              : n === 3
                ? "Three clear points under time pressure. That's how a leader sounds."
                : `You signposted ${n} of 3 points. Say "First… Second… Third…" out loud, even when it feels obvious.`}
          </p>
        </div>
        {result.take.transcript && (
          <TakeStats
            metrics={result.metrics}
            netUsage={result.take.netUsage}
            extra={<Stat label="Points" value={`${n}/3`} note={SIGNPOSTS.map((s, j) => `${s.label} ${result.signs[j] ? "✓" : "·"}`).join("  ")} tone={n === 3 ? "good" : "warn"} />}
          />
        )}
        {result.take.transcript && (
          <section className="rounded-xl border border-graphite-800 bg-graphite-950/60 p-5">
            <SectionLabel>What you said</SectionLabel>
            <p className="mt-2 leading-relaxed text-graphite-200">{result.take.transcript}</p>
          </section>
        )}
        <div className="flex flex-wrap justify-end gap-3">
          <button type="button" onClick={start} className={secondaryButton}>
            Same prompt again
          </button>
          <button
            type="button"
            onClick={() => {
              shuffle();
              setPhase("pick");
            }}
            className={primaryButton}
          >
            New prompt →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-graphite-800 bg-gradient-to-b from-navy-900/70 to-graphite-950 p-6 md:p-8">
        <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-graphite-400">
          <span>{phase === "pick" ? "Your prompt" : phase === "think" ? "Find three points" : "Speak"}</span>
          {phase !== "pick" && <span className="font-serif text-3xl normal-case tracking-normal text-gold-400 tabular-nums">{Math.max(0, clock)}s</span>}
        </div>
        <h2 key={prompt} className="animate-reveal font-serif text-3xl leading-snug text-graphite-100 md:text-4xl">
          {prompt}
        </h2>
        {phase === "pick" && (
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" onClick={shuffle} className={secondaryButton}>
              ↻ Another prompt
            </button>
            <button type="button" onClick={start} className={primaryButton}>
              Start: {THINK_SEC}s think, {SPEAK_SEC}s speak
            </button>
          </div>
        )}
        {phase === "think" && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-graphite-300">One word per point. Don&apos;t build sentences yet.</p>
            <button type="button" onClick={() => void goLive()} className={primaryButton}>
              Start now
            </button>
          </div>
        )}
      </section>

      {phase === "live" && (
        <>
          <div className="flex flex-wrap gap-2">
            {SIGNPOSTS.map((s, j) => (
              <Chip key={s.label} active={signs[j]} onClick={() => {}}>
                {signs[j] ? "✓ " : ""}
                {s.label}
              </Chip>
            ))}
          </div>
          <p className="text-sm text-graphite-400" aria-live="polite">
            {take.net.level > 0 && nextSign >= 0 ? (
              <span className="text-graphite-100">
                Keep moving: say <span className="text-gold-300">&quot;{SIGNPOSTS[nextSign].label}…&quot;</span> and name the next point.
              </span>
            ) : take.net.showBreatheCue ? (
              "Pause. Breathe. Then the next point."
            ) : (
              "Open with your point of view in one sentence, then: First… Second… Third…"
            )}
          </p>
          <div className={camera.on ? "grid gap-5 lg:grid-cols-[1fr_380px]" : ""}>
            <LiveAnswer
              armed
              timeZone={[SPEAK_SEC - 15, SPEAK_SEC]}
              finishLabel="Finish"
              finalText={take.finalText}
              interimText={take.interimText}
              micLevel={take.micLevel}
              typedMode={take.typedMode}
              typed={take.typed}
              onTyped={take.setTyped}
              onFinish={() => void finish()}
            />
            <CameraMirror camera={camera} />
          </div>
        </>
      )}
      {take.error && <p className="rounded-md border border-signal-amber/40 bg-signal-amber/10 px-4 py-3 text-sm text-signal-amber">{take.error}</p>}
    </div>
  );
}

// ── Bridge phrases ──────────────────────────────────────────────────────────

function Bridges({ speak }: Pick<Props, "speak">) {
  return (
    <div className="space-y-4">
      <p className="max-w-2xl text-sm leading-relaxed text-graphite-300">
        A blank moment only looks like one if you go silent with a worried face. A bridge phrase gives your mind 3–4 seconds while you still sound in
        control. Pick one from each group, say it aloud five times, and make it yours.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {BRIDGE_PHRASES.map((g) => (
          <section key={g.group} className="rounded-xl border border-graphite-800 bg-graphite-950/60 p-5">
            <h3 className="font-serif text-2xl text-graphite-100">{g.group}</h3>
            <p className="text-xs text-graphite-400">{g.when}</p>
            <ul className="mt-3 space-y-2">
              {g.phrases.map((p) => (
                <li key={p} className="flex items-center justify-between gap-3">
                  <span className="text-graphite-200">&quot;{p}&quot;</span>
                  <button
                    type="button"
                    onClick={() => void speak(p, 0.9)}
                    aria-label={`Hear: ${p}`}
                    className="shrink-0 rounded-md border border-graphite-700 px-2 py-1 text-xs text-graphite-300 transition hover:border-gold-600 hover:text-gold-300"
                  >
                    ▶
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
