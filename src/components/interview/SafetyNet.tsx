"use client";

import type { SafetyNetLevel } from "@/lib/types";
import { SAFETY_NET } from "@/hooks/useSafetyNet";

interface Props {
  level: SafetyNetLevel;
  keywords: readonly [string, string, string];
  keywordsUsed: string[];
  starter: string;
  armed: boolean;
  docked: boolean;
  showBreatheCue: boolean;
  onOpen: () => void;
}

/** Keyword order follows the arc of a strong answer, so each anchor has a job. */
const ROLES = ["Open", "Develop", "Close"] as const;

/**
 * The Safety Net.
 *
 * Design intent (interview psychology):
 * - No countdown timer. A visible clock *causes* the freeze it's meant to catch.
 *   Instead, at 1.5s we reframe silence as a deliberate executive pause.
 * - At 3s we offer exactly three anchors — few enough to hold in working memory
 *   under stress, ordered so the candidate can walk them left to right.
 * - Anchors light up as they're spoken. Seeing progress re-engages the
 *   "I know this" state and pulls the candidate forward to the next anchor.
 * - Only if they're still stuck do we offer a full opening line — the
 *   smallest possible push, so the story remains theirs.
 */
export function SafetyNet({ level, keywords, keywordsUsed, starter, armed, docked, showBreatheCue, onOpen }: Props) {
  const used = new Set(keywordsUsed.map((k) => k.toLowerCase()));
  const nextIdx = keywords.findIndex((k) => !used.has(k.toLowerCase()));

  return (
    <section
      aria-label="Safety Net"
      aria-live="polite"
      className={`relative overflow-hidden rounded-xl border transition-all duration-500 ${
        level > 0 ? "border-gold-600/50 bg-navy-900/80" : "border-graphite-800 bg-graphite-950/60"
      } ${docked ? "scale-[0.98] opacity-60" : "opacity-100"}`}
    >
      {level > 0 && (
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-500/70 to-transparent" />
      )}

      <div className="flex items-center justify-between gap-4 px-5 pt-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold-500">Safety Net</p>
        {armed && level < 2 && (
          <button
            type="button"
            onClick={onOpen}
            className="rounded-md border border-graphite-700 px-3 py-1.5 text-xs text-graphite-300 transition hover:border-gold-600 hover:text-gold-300 focus-visible:outline-2 focus-visible:outline-gold-500"
          >
            {level === 0 ? "Show anchors" : "Show opening line"}
          </button>
        )}
      </div>

      <div className="px-5 pb-5 pt-3">
        {level === 0 && <Standby armed={armed} showBreatheCue={showBreatheCue} />}

        {level >= 1 && (
          <div className="space-y-4">
            <ol className="grid gap-2 sm:grid-cols-3">
              {keywords.map((kw, i) => {
                const isUsed = used.has(kw.toLowerCase());
                const isNext = i === nextIdx;
                return (
                  <li
                    key={kw}
                    style={{ animationDelay: `${i * 140}ms` }}
                    className={`animate-reveal rounded-lg border px-4 py-3 transition-colors duration-300 ${
                      isUsed
                        ? "border-gold-500/60 bg-gold-500/10"
                        : isNext
                          ? "border-graphite-400/60 bg-graphite-900"
                          : "border-graphite-700 bg-graphite-900/60"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em]">
                      <span className={isUsed ? "text-gold-400" : "text-graphite-400"}>
                        {String(i + 1).padStart(2, "0")} · {ROLES[i]}
                      </span>
                      {isUsed && <span className="text-gold-400" aria-label="covered">✓</span>}
                    </div>
                    <p className={`mt-1 font-serif text-2xl leading-tight ${isUsed ? "text-gold-300" : "text-graphite-100"}`}>{kw}</p>
                  </li>
                );
              })}
            </ol>
            <p className="text-sm text-graphite-400">
              {nextIdx === -1
                ? "All three anchors covered. Land it: finish with the result, then stop talking."
                : "Walk the anchors left to right. One or two sentences each — that's a complete answer."}
            </p>
          </div>
        )}

        {level === 2 && starter && (
          <figure className="animate-reveal mt-4 border-l-2 border-gold-500 pl-4">
            <figcaption className="text-[10px] uppercase tracking-[0.2em] text-graphite-400">Open with</figcaption>
            <blockquote className="mt-1 font-serif text-xl italic leading-snug text-gold-300">“{starter}”</blockquote>
          </figure>
        )}
      </div>
    </section>
  );
}

function Standby({ armed, showBreatheCue }: { armed: boolean; showBreatheCue: boolean }) {
  if (!armed) {
    return <p className="text-sm text-graphite-400">Listen to the question. The net arms when the interviewer finishes speaking.</p>;
  }
  return (
    <div className="flex items-center gap-4">
      <span aria-hidden className="relative flex size-6 items-center justify-center">
        <span className={`absolute inset-0 rounded-full bg-gold-500/20 ${showBreatheCue ? "animate-breathe" : ""}`} />
        <span className="size-2 rounded-full bg-gold-500/80" />
      </span>
      {showBreatheCue ? (
        <p className="animate-reveal text-sm text-graphite-100">
          A pause reads as confidence. <span className="text-graphite-400">Breathe in — then begin with your first point.</span>
        </p>
      ) : (
        <p className="text-sm text-graphite-400">
          Standing by. If you go quiet for {SAFETY_NET.freezeMs / 1000} seconds, three anchor words will appear.
        </p>
      )}
    </div>
  );
}
