"use client";

import type { AnswerReport } from "@/lib/types";
import { PresenceRing } from "./AnswerReport";

export function SessionSummary({ reports, onRestart }: { reports: AnswerReport[]; onRestart: () => void }) {
  const avg = Math.round(reports.reduce((a, r) => a + r.presence.total, 0) / Math.max(1, reports.length));
  const unaided = reports.filter((r) => !r.safetyNet).length;
  const fillers = reports.reduce((a, r) => a + r.metrics.fillerTotal, 0);
  const words = reports.reduce((a, r) => a + r.metrics.wordCount, 0);

  return (
    <div className="animate-reveal space-y-8">
      <div className="grid items-center gap-8 md:grid-cols-[auto_1fr]">
        <PresenceRing value={avg} size={180} />
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-gold-500">Session complete</p>
          <h1 className="font-serif text-4xl">Average Executive Presence: {avg}</h1>
          <p className="text-graphite-300">
            You answered <span className="text-graphite-100">{unaided} of {reports.length}</span> questions without the Safety Net
            {words > 0 && (
              <>
                , with <span className="text-graphite-100">{((fillers / words) * 100).toFixed(1)}</span> fillers per 100 words
              </>
            )}
            . Independence is the metric to watch: every unaided answer means the anchors are becoming automatic.
          </p>
        </div>
      </div>

      <ol className="divide-y divide-graphite-800 rounded-xl border border-graphite-800 bg-graphite-950/60">
        {reports.map((r, i) => (
          <li key={r.question.id} className="grid gap-2 p-5 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p className="text-xs text-graphite-400">Q{i + 1}</p>
              <p className="text-graphite-100">{r.question.text}</p>
              <p className="mt-1 text-sm text-graphite-400">{r.analysis?.coachingNote}</p>
            </div>
            <div className="flex items-center gap-4 text-sm sm:justify-end">
              <span className={r.safetyNet ? "text-graphite-400" : "text-signal-green"}>{r.safetyNet ? "Net used" : "Unaided"}</span>
              <span className="font-serif text-3xl text-gold-400">{r.presence.total}</span>
            </div>
          </li>
        ))}
      </ol>

      <div className="flex justify-end">
        <button type="button" onClick={onRestart} className="rounded-md bg-gold-500 px-6 py-3 text-sm font-semibold text-ink transition hover:bg-gold-400">
          Start another session
        </button>
      </div>
    </div>
  );
}
