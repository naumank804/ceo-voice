"use client";

import { useEffect, useState } from "react";
import { allCards, INTERVIEW_CATEGORIES, type LeadershipState, progressOf } from "@/lib/leadership";
import { loadProgress, type ProgressSummary, streakOf, summarize } from "@/lib/progress";
import { PACE } from "@/lib/speech-metrics";

/** A card counts as mastered once it has reached the 7-day review box. */
const MASTERED_BOX = 4;

/**
 * Progress & mastery across the whole app: mastered interview answers, streak,
 * drills done, average pace and the filler-word trend.
 */
export function MasteryDashboard({ state, refresh }: { state: LeadershipState; refresh: unknown }) {
  const [sum, setSum] = useState<ProgressSummary | null>(null);
  useEffect(() => setSum(summarize(loadProgress())), [refresh, state]);

  const interview = allCards(state).filter((c) => INTERVIEW_CATEGORIES.includes(c.category));
  const mastered = interview.filter((c) => progressOf(state, c.id).box >= MASTERED_BOX).length;
  const learning = interview.filter((c) => {
    const b = progressOf(state, c.id).box;
    return b > 0 && b < MASTERED_BOX;
  }).length;
  const pct = interview.length ? (mastered / interview.length) * 100 : 0;
  const pctLearning = interview.length ? (learning / interview.length) * 100 : 0;
  const days = streakOf([...state.days, ...(sum?.days ?? [])]);
  const wpm = sum?.avgWpm ?? null;

  return (
    <section className="rounded-xl border border-graphite-800 bg-graphite-950/60 p-5" aria-label="Progress and mastery">
      <div className="grid gap-5 md:grid-cols-[1.4fr_repeat(4,1fr)] md:items-center">
        <div className="min-w-0">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-graphite-400">Interview answers mastered</p>
            <p className="tabular-nums text-sm text-graphite-200">
              <span className="font-serif text-xl text-graphite-100">{mastered}</span>/{interview.length}
            </p>
          </div>
          <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-graphite-800" role="img" aria-label={`${mastered} mastered, ${learning} in progress, of ${interview.length}`}>
            <div className="h-full bg-gold-500 transition-[width] duration-700" style={{ width: `${pct}%` }} />
            <div className="h-full bg-gold-500/35 transition-[width] duration-700" style={{ width: `${pctLearning}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-graphite-400">
            <span className="text-gold-400">■</span> mastered (7-day recall) · <span className="text-gold-400/50">■</span> {learning} in progress
          </p>
        </div>

        <Tile label="Daily streak" value={days ? `🔥 ${days}` : "0"} note={days ? (days === 1 ? "day" : "days in a row") : "Practise today to start"} />
        <Tile label="Drills done" value={String(sum?.drills ?? 0)} note={`${sum?.drillsToday ?? 0} today`} />
        <Tile
          label="Avg pace"
          value={wpm ? `${wpm}` : "—"}
          unit={wpm ? "wpm" : undefined}
          note={wpm ? (wpm < PACE.min ? "a bit slow" : wpm > PACE.max ? "a bit fast" : "in the zone") : `target ${PACE.min}–${PACE.max}`}
          tone={wpm ? (wpm >= PACE.min && wpm <= PACE.max ? "good" : "warn") : undefined}
        />
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.2em] text-graphite-400">Filler trend</p>
          {sum && sum.fillerTrend.length >= 2 ? (
            <>
              <Sparkline values={sum.fillerTrend} />
              <p className={`text-xs ${sum.fillerChange === "better" ? "text-signal-green" : sum.fillerChange === "worse" ? "text-signal-amber" : "text-graphite-400"}`}>
                {sum.fillerChange === "better" ? "↓ fewer fillers" : sum.fillerChange === "worse" ? "↑ more fillers lately" : `${sum.fillerTrend.at(-1)} per 100 words`}
              </p>
            </>
          ) : (
            <p className="mt-1 text-xs text-graphite-400">Appears after a few spoken answers</p>
          )}
        </div>
      </div>
    </section>
  );
}

function Tile({ label, value, unit, note, tone }: { label: string; value: string; unit?: string; note: string; tone?: "good" | "warn" }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-[0.2em] text-graphite-400">{label}</p>
      <p className={`font-serif text-2xl tabular-nums leading-tight ${tone === "good" ? "text-signal-green" : tone === "warn" ? "text-signal-amber" : "text-graphite-100"}`}>
        {value} {unit && <span className="font-sans text-[10px] text-graphite-400">{unit}</span>}
      </p>
      <p className="truncate text-xs text-graphite-400">{note}</p>
    </div>
  );
}

/** Fillers per 100 words, most recent takes; lower is better. */
function Sparkline({ values }: { values: number[] }) {
  const w = 120;
  const h = 28;
  const max = Math.max(4, ...values);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - 2 - (v / max) * (h - 4)}`);
  const last = pts.at(-1)!.split(",");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="mt-1 overflow-visible" aria-label={`Fillers per 100 words, last ${values.length} answers`}>
      <polyline points={pts.join(" ")} fill="none" stroke="var(--color-gold-500)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r="2.5" fill="var(--color-gold-500)" />
    </svg>
  );
}
