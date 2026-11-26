"use client";

import type { Telemetry } from "@/hooks/useDeliveryTelemetry";
import { PACE } from "@/lib/speech-metrics";

/** Target length for an executive answer. */
export const TIME_ZONE: [number, number] = [45, 75];

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/**
 * Quiet, glanceable delivery numbers under the live transcript:
 * time vs target zone, live pace, filler count and power pauses.
 */
export function TelemetryBar({ t, zone = TIME_ZONE, spoken }: { t: Telemetry; zone?: [number, number] | null; spoken: boolean }) {
  const recentPause = t.lastPauseAt > 0 && Date.now() - t.lastPauseAt < 1800;
  return (
    <div className="mt-4 grid gap-3 border-t border-graphite-800 pt-4 text-xs text-graphite-400 sm:grid-cols-2 lg:grid-cols-4" aria-label="Delivery telemetry">
      <TimeGauge sec={t.elapsedSec} zone={zone} />
      {spoken ? <PaceGauge wpm={t.wpm} /> : <Cell label="Pace" value="—" note="Typed answer" tone="muted" />}
      <Cell
        label="Fillers"
        value={String(t.fillerTotal)}
        note={Object.entries(t.fillers).map(([k, v]) => `${k} ×${v}`).join(" · ") || "um · uh · like · basically…"}
        tone={t.fillerTotal === 0 ? "good" : t.fillerTotal <= 2 ? "muted" : "warn"}
      />
      {spoken ? (
        <Cell
          label="Power pauses"
          value={String(t.powerPauses)}
          note={t.pausing ? "Holding a pause… good. Now speak." : recentPause ? "✓ Power pause landed" : "Pause 2s before you start and between points"}
          tone={t.pausing || recentPause ? "good" : "muted"}
          pulse={t.pausing}
        />
      ) : (
        <Cell label="Power pauses" value="—" note="Needs the microphone" tone="muted" />
      )}
    </div>
  );
}

function Cell({ label, value, note, tone, pulse }: { label: string; value: string; note: string; tone: "good" | "warn" | "muted"; pulse?: boolean }) {
  const color = tone === "good" ? "text-signal-green" : tone === "warn" ? "text-signal-amber" : "text-graphite-100";
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-[0.2em]">{label}</p>
      <p className={`font-serif text-2xl leading-tight tabular-nums ${color} ${pulse ? "animate-pulse" : ""}`}>{value}</p>
      <p className="truncate" title={note}>
        {note}
      </p>
    </div>
  );
}

function TimeGauge({ sec, zone }: { sec: number; zone: [number, number] | null }) {
  if (!zone) return <Cell label="Time" value={fmt(sec)} note="Elapsed" tone="muted" />;
  const max = zone[1] * 1.4;
  const pct = (v: number) => `${Math.min(100, (v / max) * 100)}%`;
  const state = sec < zone[0] ? "build" : sec <= zone[1] ? "in" : "over";
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-[0.2em]">Time</p>
      <p className={`font-serif text-2xl leading-tight tabular-nums ${state === "in" ? "text-signal-green" : state === "over" ? "text-signal-amber" : "text-graphite-100"}`}>{fmt(sec)}</p>
      <div className="relative mt-1 h-1.5 rounded-full bg-graphite-800">
        <div className="absolute inset-y-0 rounded-full bg-signal-green/30" style={{ left: pct(zone[0]), width: `calc(${pct(zone[1])} - ${pct(zone[0])})` }} />
        <div className="absolute inset-y-0 left-0 rounded-full bg-gold-500/80 transition-[width] duration-300" style={{ width: pct(sec) }} />
      </div>
      <p className="mt-0.5 truncate">{state === "build" ? `Target ${zone[0]}–${zone[1]}s` : state === "in" ? "In the zone. Land it soon." : "Over time. Land it now."}</p>
    </div>
  );
}

function PaceGauge({ wpm }: { wpm: number | null }) {
  const lo = 80;
  const hi = 190;
  const pos = (v: number) => `${((Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo)) * 100}%`;
  const state = wpm === null ? "wait" : wpm < PACE.min ? "slow" : wpm > PACE.max ? "fast" : "in";
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-[0.2em]">Pace</p>
      <p className={`font-serif text-2xl leading-tight tabular-nums ${state === "in" ? "text-signal-green" : state === "wait" ? "text-graphite-100" : "text-signal-amber"}`}>
        {wpm ?? "—"} <span className="font-sans text-[10px] text-graphite-400">wpm</span>
      </p>
      <div className="relative mt-1 h-1.5 rounded-full bg-graphite-800">
        <div className="absolute inset-y-0 rounded-full bg-signal-green/30" style={{ left: pos(PACE.min), width: `calc(${pos(PACE.max)} - ${pos(PACE.min)})` }} />
        {wpm !== null && <div className="absolute -top-0.5 size-2.5 -translate-x-1/2 rounded-full bg-gold-500 transition-[left] duration-500" style={{ left: pos(wpm) }} />}
      </div>
      <p className="mt-0.5 truncate">
        {state === "wait" ? `Target ${PACE.min}–${PACE.max}` : state === "slow" ? "A little slow. Keep moving." : state === "fast" ? "Too fast. Slow down." : "Boardroom pace."}
      </p>
    </div>
  );
}
