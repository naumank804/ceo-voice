"use client";

import { Bar, PACE_COPY, PresenceRing, Stat } from "@/components/interview/AnswerReport";
import type { StageScore } from "@/lib/stage";
import type { SafetyNetUsage, SpeechMetrics } from "@/lib/types";

export function ScoreCard({ score, contentLabel, independenceNote }: { score: StageScore; contentLabel: string; independenceNote?: string }) {
  return (
    <section className="rounded-xl border border-graphite-800 bg-graphite-950/70 p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-graphite-400">Stage Presence</p>
      <PresenceRing value={score.total} />
      <dl className="mt-5 space-y-2.5 text-sm">
        <Bar label={contentLabel} value={score.content} max={40} />
        <Bar label="Pace" value={score.pace} max={20} />
        <Bar label="Clarity" value={score.clarity} max={20} />
        <Bar label="Independence" value={score.independence} max={20} />
      </dl>
      {independenceNote && <p className="mt-3 text-xs text-graphite-400">{independenceNote}</p>}
    </section>
  );
}

export function TakeStats({ metrics: m, netUsage, extra }: { metrics: SpeechMetrics; netUsage: SafetyNetUsage | null; extra?: React.ReactNode }) {
  const minutes = Math.floor(m.durationSec / 60);
  const seconds = String(m.durationSec % 60).padStart(2, "0");
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {extra}
      <Stat label="Pace" value={`${m.wpm || "—"}`} unit="wpm" note={PACE_COPY[m.paceVerdict]} tone={m.paceVerdict === "steady" ? "good" : "warn"} />
      <Stat
        label="Fillers"
        value={`${m.fillerTotal}`}
        note={Object.entries(m.fillers).map(([k, v]) => `${k} ×${v}`).join(", ") || "Clean delivery."}
        tone={m.fillerTotal <= 2 ? "good" : "warn"}
      />
      <Stat
        label="Hints"
        value={!netUsage ? "None" : netUsage.level === 1 ? "Light" : "Full"}
        note={!netUsage ? "Delivered unaided." : "You froze and recovered. Recovering is the skill."}
        tone={!netUsage ? "good" : "neutral"}
      />
      {m.durationSec > 0 && <Stat label="Length" value={`${minutes}:${seconds}`} note={`${m.wordCount} words`} tone="neutral" />}
    </div>
  );
}

export function SectionLabel({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "gold" }) {
  return (
    <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${tone === "gold" ? "text-gold-500" : "text-graphite-400"}`}>{children}</p>
  );
}

export function Chip({ active, onClick, children, disabled }: { active: boolean; onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-md border px-3 py-1.5 text-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
        active ? "border-gold-500 bg-gold-500/10 text-gold-300" : "border-graphite-700 text-graphite-300 hover:border-graphite-600"
      }`}
    >
      {children}
    </button>
  );
}

export const primaryButton =
  "rounded-md bg-gold-500 px-6 py-2.5 text-sm font-semibold text-ink transition hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-50";
export const secondaryButton =
  "rounded-md border border-graphite-700 px-5 py-2.5 text-sm text-graphite-300 transition hover:border-graphite-400 disabled:cursor-not-allowed disabled:opacity-50";
