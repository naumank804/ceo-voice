"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";

const SECONDS = 15;

const QUESTION = "What makes you a strong leader?";

/** Each pillar lights up when the speaker signposts it or says something that belongs to it. */
const PILLARS: { key: string; tag: string; match: RegExp }[] = [
  { key: "Clarity", tag: "set direction", match: /\b(first(ly)?|clarity|clear|direction|vision|goal|priorit\w*)\b/i },
  { key: "Trust", tag: "empower people", match: /\b(second(ly)?|trust|empower\w*|team|people|delegat\w*|coach\w*)\b/i },
  { key: "Results", tag: "deliver outcomes", match: /\b(third(ly)?|finally|results?|deliver\w*|outcomes?|impact|percent|\d+)\b/i },
];

type Phase = "idle" | "live" | "done";

/**
 * The core mechanic in 15 seconds, right on the landing page: three words on screen,
 * speak, and watch each pillar light up as you hit it.
 */
export function TryCheatCode() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [left, setLeft] = useState(SECONDS);
  const [tapped, setTapped] = useState<boolean[]>([false, false, false]);
  const stt = useSpeechRecognition();
  const timer = useRef<number | null>(null);
  const voice = stt.supported === true;

  // Each pillar unlocks in order, so "first… second… third…" lights them one by one.
  const hits = (() => {
    if (!voice) return tapped;
    const out = [false, false, false];
    let from = 0;
    const text = stt.fullText;
    PILLARS.forEach((p, i) => {
      const m = text.slice(from).match(p.match);
      if (m && m.index !== undefined) {
        out[i] = true;
        from += m.index + m[0].length;
      }
    });
    return out;
  })();
  const count = hits.filter(Boolean).length;

  const stop = () => {
    if (timer.current) window.clearInterval(timer.current);
    timer.current = null;
    stt.stop();
    setPhase("done");
  };
  const stopRef = useRef(stop);
  stopRef.current = stop;

  const start = () => {
    stt.reset();
    setTapped([false, false, false]);
    setLeft(SECONDS);
    setPhase("live");
    if (voice) stt.start();
    timer.current = window.setInterval(() => setLeft((s) => s - 1), 1000);
  };

  useEffect(() => {
    if (phase === "live" && (left <= 0 || count === 3)) stopRef.current();
  }, [left, phase, count]);
  useEffect(() => () => void (timer.current && window.clearInterval(timer.current)), []);

  return (
    <div className="rounded-xl border border-graphite-800 bg-gradient-to-b from-navy-900/70 to-graphite-950 p-5 shadow-sm md:p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold-500">Try a 3-word cheat code · 15s</p>
        {phase === "live" && <span className="font-serif text-2xl tabular-nums text-gold-400">{Math.max(0, left)}s</span>}
      </div>
      <p className="mt-3 font-serif text-2xl leading-snug text-graphite-100">“{QUESTION}”</p>
      <p className="mt-1 text-sm text-graphite-400">Don&apos;t memorise a speech. Hold three words and say one sentence for each.</p>

      <ol className="mt-4 grid grid-cols-3 gap-2">
        {PILLARS.map((p, i) => (
          <li key={p.key}>
            <button
              type="button"
              disabled={phase !== "live" || voice}
              onClick={() => setTapped((t) => t.map((v, j) => (j === i ? true : v)))}
              className={`w-full rounded-lg border p-3 text-left transition disabled:cursor-default ${
                hits[i] ? "border-signal-green/60 bg-signal-green/10" : "border-graphite-800 bg-graphite-950/60"
              }`}
            >
              <span className="block text-[10px] uppercase tracking-[0.2em] text-graphite-400">
                {["First", "Second", "Third"][i]} {hits[i] && "✓"}
              </span>
              <span className={`block font-serif text-xl ${hits[i] ? "text-signal-green" : "text-graphite-100"}`}>{p.key}</span>
              <span className="block text-xs text-graphite-400">{p.tag}</span>
            </button>
          </li>
        ))}
      </ol>

      <div className="mt-4 min-h-10 text-sm text-graphite-300" aria-live="polite">
        {phase === "idle" && (
          <button type="button" onClick={start} className="rounded-md bg-gold-500 px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-gold-400">
            {voice ? "🎙 Start speaking" : "Start the 15 seconds"}
          </button>
        )}
        {phase === "live" && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="min-w-0 flex-1 truncate text-graphite-400">
              {voice ? stt.fullText || "Listening… start with “First, clarity…”" : "Say it out loud, and tap each word as you cover it."}
            </span>
            <button type="button" onClick={stop} className="rounded-md border border-graphite-700 px-3 py-1.5 text-xs hover:border-gold-500">
              Done
            </button>
          </div>
        )}
        {phase === "done" && (
          <div className="animate-reveal flex flex-wrap items-center justify-between gap-3">
            <span>
              <span className="font-serif text-xl text-graphite-100">{count}/3 pillars.</span>{" "}
              {count === 3 ? "That's the whole method: structure frees your mind." : "Now imagine your own answers, each with three words."}
            </span>
            <span className="flex gap-3">
              <button type="button" onClick={start} className="text-sm text-graphite-400 underline-offset-4 hover:underline">
                Again
              </button>
              <Link href="/leadership" className="text-sm font-semibold text-gold-400 underline-offset-4 hover:underline">
                Train your own →
              </Link>
            </span>
          </div>
        )}
        {stt.error && <p className="mt-2 text-xs text-signal-amber">{stt.error}</p>}
      </div>
    </div>
  );
}
