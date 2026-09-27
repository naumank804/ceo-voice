"use client";

import { TakePlayback } from "@/components/camera/CameraMirror";
import { segmentTranscript } from "@/lib/highlight";
import type { AnswerReport as Report, GrammarCorrection } from "@/lib/types";

interface Props {
  report: Report;
  analyzing: boolean;
  isLast: boolean;
  onRetry: () => void;
  onNext: () => void;
  onHear: (text: string) => void;
}

export const PACE_COPY = {
  "too-slow": "Hesitant — aim for a steady 130–150.",
  "too-fast": "Rushing — slow down; speed reads as nerves.",
  steady: "Composed, boardroom pace.",
  insufficient: "Too short to measure pace.",
} as const;

export function AnswerReport({ report, analyzing, isLast, onRetry, onNext, onHear }: Props) {
  const { metrics: m, presence: p, analysis, safetyNet } = report;

  return (
    <div className="animate-reveal space-y-6">
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Score */}
        <section className="rounded-xl border border-graphite-800 bg-graphite-950/70 p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-graphite-400">Executive Presence</p>
          <PresenceRing value={p.total} />
          <dl className="mt-5 space-y-2.5 text-sm">
            <Bar label="Pace" value={p.pace} max={25} />
            <Bar label="Clarity" value={p.clarity} max={25} />
            <Bar label="Authority" value={p.authority} max={25} />
            <Bar label="Substance" value={p.substance} max={15} />
            <Bar label="Independence" value={p.independence} max={10} />
          </dl>
        </section>

        {/* Coaching */}
        <section className="space-y-4">
          <div className="rounded-xl border border-gold-600/40 bg-navy-900/60 p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold-500">Coach's note</p>
            <p className="mt-2 font-serif text-2xl leading-snug text-graphite-100">
              {analyzing ? <span className="text-graphite-400">Reviewing your answer…</span> : analysis?.coachingNote}
            </p>
            {report.question.intent && (
              <p className="mt-3 text-sm text-graphite-400">
                <span className="text-graphite-300">What they were really asking:</span> {report.question.intent}
              </p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Pace" value={`${m.wpm || "—"}`} unit="wpm" note={PACE_COPY[m.paceVerdict]} tone={m.paceVerdict === "steady" ? "good" : "warn"} />
            <Stat label="Fillers" value={`${m.fillerTotal}`} note={Object.entries(m.fillers).map(([k, v]) => `${k} ×${v}`).join(", ") || "Clean delivery."} tone={m.fillerTotal <= 2 ? "good" : "warn"} />
            <Stat
              label="Anchors used"
              value={`${report.keywordsUsed.length}/3`}
              note={report.keywordsUsed.join(", ") || report.question.keywords.join(" · ")}
              tone={report.keywordsUsed.length >= 2 ? "good" : "warn"}
            />
            <Stat
              label="Safety Net"
              value={!safetyNet ? "Unused" : safetyNet.level === 1 ? "Anchors" : "Full"}
              note={
                !safetyNet
                  ? "You answered unaided."
                  : safetyNet.triggeredAfterSec !== null
                    ? `Caught a ${safetyNet.triggeredAfterSec}s freeze — and you recovered.`
                    : "Opened manually — good self-awareness."
              }
              tone={!safetyNet ? "good" : "neutral"}
            />
          </div>
        </section>
      </div>

      {/* Transcript with annotations */}
      <section className="rounded-xl border border-graphite-800 bg-graphite-950/60 p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-graphite-400">What you said</p>
          <Legend />
        </div>
        <AnnotatedTranscript transcript={report.transcript} corrections={report.analysis?.corrections ?? []} />
      </section>

      {analysis && analysis.corrections.length > 0 && (
        <section className="rounded-xl border border-graphite-800 bg-graphite-950/60 p-6">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-graphite-400">Native / professional phrasing</p>
          <ul className="divide-y divide-graphite-800">
            {analysis.corrections.map((c, i) => (
              <li key={i} className="grid gap-1 py-3 sm:grid-cols-[1fr_1fr] sm:gap-6">
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

      {analysis?.executiveRewrite && (
        <section className="rounded-xl border border-graphite-800 bg-gradient-to-br from-navy-900/60 to-graphite-950 p-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold-500">The CEO version</p>
            <button
              type="button"
              onClick={() => onHear(analysis.executiveRewrite)}
              className="rounded-md border border-graphite-700 px-3 py-1.5 text-xs text-graphite-300 transition hover:border-gold-600 hover:text-gold-300"
            >
              ▶ Hear it, then repeat it
            </button>
          </div>
          <p className="font-serif text-xl leading-relaxed text-graphite-100">{analysis.executiveRewrite}</p>
          {analysis.source === "offline" && (
            <p className="mt-3 text-xs text-graphite-600">Offline coach. Add an OpenAI key for a full rewrite and deeper grammar review.</p>
          )}
        </section>
      )}

      {report.videoUrl && <TakePlayback url={report.videoUrl} filename={`interview-q${report.question.id}.webm`} />}

      <div className="flex flex-wrap justify-end gap-3">
        <button type="button" onClick={onRetry} className="rounded-md border border-graphite-700 px-5 py-2.5 text-sm text-graphite-300 transition hover:border-graphite-400">
          Answer again
        </button>
        <button type="button" onClick={onNext} className="rounded-md bg-gold-500 px-6 py-2.5 text-sm font-semibold text-ink transition hover:bg-gold-400">
          {isLast ? "See session summary" : "Next question →"}
        </button>
      </div>
    </div>
  );
}

export function PresenceRing({ value, size = 150 }: { value: number; size?: number }) {
  const r = 44;
  const c = 2 * Math.PI * r;
  const label = value >= 85 ? "Boardroom-ready" : value >= 70 ? "Composed" : value >= 50 ? "Developing" : "Building foundations";
  return (
    <div className="mt-4 flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" width={size} height={size} className="-rotate-90">
          <circle cx="50" cy="50" r={r} fill="none" stroke="var(--color-graphite-800)" strokeWidth="5" />
          <circle
            cx="50" cy="50" r={r} fill="none" stroke="var(--color-gold-500)" strokeWidth="5" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)}
            style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.2,0.7,0.2,1)" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="font-serif text-5xl leading-none text-graphite-100">{value}</p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-graphite-400">points</p>
        </div>
      </div>
      <p className="text-sm text-gold-400">{label}</p>
    </div>
  );
}

export function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs">
        <dt className="text-graphite-400">{label}</dt>
        <dd className="tabular-nums text-graphite-300">
          {value}<span className="text-graphite-600">/{max}</span>
        </dd>
      </div>
      <div className="mt-1 h-1 rounded-full bg-graphite-800">
        <div className="h-1 rounded-full bg-gold-500/80" style={{ width: `${(value / max) * 100}%` }} />
      </div>
    </div>
  );
}

export function Stat({ label, value, unit, note, tone }: { label: string; value: string; unit?: string; note: string; tone: "good" | "warn" | "neutral" }) {
  const dot = tone === "good" ? "bg-signal-green" : tone === "warn" ? "bg-signal-amber" : "bg-graphite-400";
  return (
    <div className="rounded-lg border border-graphite-800 bg-graphite-950/70 p-4">
      <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-graphite-400">
        <span className={`size-1.5 rounded-full ${dot}`} /> {label}
      </p>
      <p className="mt-1 font-serif text-3xl text-graphite-100">
        {value} {unit && <span className="font-sans text-xs text-graphite-400">{unit}</span>}
      </p>
      <p className="mt-1 text-xs leading-snug text-graphite-400">{note}</p>
    </div>
  );
}

export function AnnotatedTranscript({ transcript, corrections }: { transcript: string; corrections: GrammarCorrection[] }) {
  const segments = segmentTranscript(transcript, corrections);
  return (
    <p className="text-lg leading-loose text-graphite-300">
      {segments.map((s, i) => {
        switch (s.kind) {
          case "correction":
            return (
              <mark key={i} title={`Try: ${s.correction.suggestion}`} className="rounded-sm bg-signal-amber/15 px-0.5 text-graphite-100 underline decoration-signal-amber decoration-wavy underline-offset-4">
                {s.text}
              </mark>
            );
          case "filler":
            return <span key={i} className="text-signal-red/80 line-through decoration-signal-red/50">{s.text}</span>;
          case "weak":
            return <span key={i} className="underline decoration-graphite-400 decoration-dotted underline-offset-4">{s.text}</span>;
          default:
            return <span key={i}>{s.text}</span>;
        }
      })}
    </p>
  );
}

export function Legend() {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-graphite-400">
      <span><span className="underline decoration-signal-amber decoration-wavy underline-offset-4">phrasing</span> — hover for fix</span>
      <span><span className="text-signal-red/80 line-through">filler</span></span>
      <span><span className="underline decoration-dotted underline-offset-4">hedge</span></span>
    </div>
  );
}
