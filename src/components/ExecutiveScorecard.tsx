"use client";

import { SectionLabel } from "@/components/stage/shared";
import { offlineFourSentence, RUN_ON_WORDS, type Scorecard } from "@/lib/scorecard";
import { PACE } from "@/lib/speech-metrics";
import type { AnswerAnalysis } from "@/lib/types";

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/**
 * "Rule of 3" & Executive Presence Scorecard: structure, sentence punch, hedging, delivery,
 * then the user's own answer rewritten as a 4-sentence executive version under a cheat-code header.
 */
export function ExecutiveScorecard({
  sc,
  transcript,
  keys,
  analysis,
  analyzing,
  onHear,
}: {
  sc: Scorecard;
  transcript: string;
  keys: readonly string[];
  analysis: AnswerAnalysis | null;
  analyzing: boolean;
  onHear: (text: string) => void;
}) {
  const ai = analysis?.fourSentence?.length === 4 ? analysis.fourSentence : null;
  const sentences = ai ?? offlineFourSentence(transcript, keys);
  const code = (analysis?.cheatCode?.length === 3 ? analysis.cheatCode : keys.slice(0, 3)).map((w) => w.toUpperCase());
  const d = sc.delivery;
  const paceIn = d.durationSec === 0 || (d.wpm >= PACE.min && d.wpm <= PACE.max);

  return (
    <section className="space-y-5 rounded-xl border border-graphite-800 bg-graphite-950/60 p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <SectionLabel tone="gold">Rule of 3 · Executive Presence Scorecard</SectionLabel>
        <span className="font-serif text-3xl text-graphite-100">
          {sc.grade}
          <span className="text-base text-graphite-400"> / 100</span>
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Area n={1} title="Rule of 3 adherence" good={sc.rule3.hits === sc.rule3.pillars.length}>
          <div className="flex flex-wrap gap-2">
            {sc.rule3.pillars.map((p, i) => (
              <span
                key={i}
                className={`rounded-md border px-2.5 py-1 text-sm ${p.hit ? "border-signal-green/60 bg-signal-green/10 text-signal-green" : "border-signal-amber/50 bg-signal-amber/10 text-signal-amber"}`}
              >
                {p.hit ? "✓" : "✗"} {p.key}
              </span>
            ))}
          </div>
          <p className="mt-2">{sc.rule3.verdict}</p>
        </Area>

        <Area n={2} title="Conciseness & sentence punch" good={!sc.punch.runOns.length && sc.hedging.total === 0}>
          <p>
            {sc.punch.sentences} sentences · avg {sc.punch.avgWords} words. {sc.punch.verdict}
          </p>
          {sc.punch.runOns.slice(0, 2).map((s, i) => (
            <p key={i} className="mt-1.5 border-l-2 border-signal-amber/60 pl-2 text-xs italic text-graphite-400">
              “{s.split(" ").slice(0, 16).join(" ")}…” <span className="not-italic">({s.split(" ").length} words, aim ≤ {RUN_ON_WORDS})</span>
            </p>
          ))}
          <p className="mt-2">
            {sc.hedging.total === 0 ? (
              <span className="text-signal-green">No hedging. You sounded certain.</span>
            ) : (
              <>
                <span className="text-signal-amber">Hedging:</span>{" "}
                {[...sc.hedging.phrases.map((h) => `“${h.phrase}”${h.count > 1 ? ` ×${h.count}` : ""}`), ...sc.hedging.passive.map((p) => `passive “${p}”`)].join(", ")}
                . Replace with “I decided”, “I led”, “My recommendation is”.
              </>
            )}
          </p>
        </Area>

        <Area n={3} title="Delivery metrics" good={paceIn && d.fillers <= 2}>
          <dl className="grid grid-cols-3 gap-2">
            <Metric label="Pace" value={d.durationSec ? `${d.wpm}` : "—"} unit="wpm" ok={paceIn} />
            <Metric label="Fillers" value={String(d.fillers)} ok={d.fillers <= 2} />
            <Metric label="Duration" value={d.durationSec ? fmt(d.durationSec) : "—"} ok={!d.durationSec || (d.durationSec >= 45 && d.durationSec <= 75)} />
          </dl>
          <p className="mt-2 text-xs">
            Targets: {PACE.min}–{PACE.max} wpm, 45–75 seconds, under 3 fillers.{d.fillerDetail && ` You said ${d.fillerDetail}.`}
          </p>
        </Area>

        <Area n={4} title="Executive rewrite" good>
          <p>Your own answer, in four sentences: a headline, then one sentence per pillar. Learn it, then say it out loud.</p>
        </Area>
      </div>

      <div className="rounded-xl border border-gold-600/40 bg-gradient-to-br from-navy-900/60 to-graphite-950 p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <p className="font-serif text-xl tracking-wide text-gold-400">{code.join(" · ")}</p>
          <button
            type="button"
            disabled={analyzing}
            onClick={() => onHear(sentences.join(" "))}
            className="rounded-md border border-graphite-700 px-3 py-1.5 text-xs text-graphite-300 transition hover:border-gold-600 hover:text-gold-300 disabled:opacity-50"
          >
            ▶ Hear it, then repeat it
          </button>
        </div>
        {analyzing ? (
          <p className="text-graphite-400">Writing your executive version…</p>
        ) : (
          <ol className="space-y-2 font-serif text-lg leading-relaxed text-graphite-100">
            {sentences.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-1 shrink-0 font-sans text-[10px] uppercase tracking-[0.2em] text-graphite-400">{i === 0 ? "Headline" : code[i - 1] ?? i}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        )}
        {!analyzing && !ai && <p className="mt-3 text-xs text-graphite-600">Built offline from your own sentences. With the AI coach on, this is fully rewritten.</p>}
      </div>
    </section>
  );
}

function Area({ n, title, good, children }: { n: number; title: string; good: boolean; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-graphite-800 bg-graphite-950/70 p-4 text-sm leading-relaxed text-graphite-300">
      <p className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-graphite-400">
        <span className={`size-1.5 rounded-full ${good ? "bg-signal-green" : "bg-signal-amber"}`} />
        {n}. {title}
      </p>
      {children}
    </div>
  );
}

function Metric({ label, value, unit, ok }: { label: string; value: string; unit?: string; ok: boolean }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.15em] text-graphite-400">{label}</dt>
      <dd className={`font-serif text-2xl tabular-nums ${ok ? "text-graphite-100" : "text-signal-amber"}`}>
        {value} {unit && <span className="font-sans text-[10px] text-graphite-400">{unit}</span>}
      </dd>
    </div>
  );
}
