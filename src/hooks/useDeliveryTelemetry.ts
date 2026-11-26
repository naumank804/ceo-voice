"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { computeMetrics, tokenize } from "@/lib/speech-metrics";

/** A deliberate pause: long enough to land a point, short enough not to be a freeze. */
export const POWER_PAUSE = { minMs: 2000, maxMs: 6000 } as const;

export interface Telemetry {
  elapsedSec: number;
  /** Live words per minute over the time since the first word; null until there's enough speech. */
  wpm: number | null;
  fillers: Record<string, number>;
  fillerTotal: number;
  powerPauses: number;
  /** True while the speaker is currently holding a pause of 2s or more. */
  pausing: boolean;
  /** Timestamp of the last completed power pause, for a brief "✓" flash. */
  lastPauseAt: number;
}

/**
 * Live delivery numbers while someone speaks. Speech activity is inferred from the transcript
 * growing, which is what the Web Speech API reports in near real time.
 */
export function useDeliveryTelemetry(text: string, active: boolean, spoken: boolean): Telemetry {
  const [now, setNow] = useState(() => Date.now());
  const startRef = useRef(0);
  const firstWordRef = useRef(0);
  const lastWordRef = useRef(0);
  const wordsRef = useRef(0);
  const [pauses, setPauses] = useState(0);
  const [lastPauseAt, setLastPauseAt] = useState(0);

  const words = useMemo(() => tokenize(text).length, [text]);

  // New take: reset when the mic opens on an empty answer.
  useEffect(() => {
    if (!active) return;
    if (words === 0 || !startRef.current) {
      startRef.current = Date.now();
      firstWordRef.current = 0;
      lastWordRef.current = 0;
      wordsRef.current = 0;
      setPauses(0);
      setLastPauseAt(0);
    }
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!active || words <= wordsRef.current) {
      wordsRef.current = Math.max(wordsRef.current, words);
      return;
    }
    const t = Date.now();
    // Gap before this burst of words: the opening pause, or a pause between points.
    const gap = t - (lastWordRef.current || startRef.current);
    if (spoken && gap >= POWER_PAUSE.minMs && gap <= POWER_PAUSE.maxMs) {
      setPauses((n) => n + 1);
      setLastPauseAt(t);
    }
    if (!firstWordRef.current) firstWordRef.current = t;
    lastWordRef.current = t;
    wordsRef.current = words;
  }, [words, active, spoken]);

  const metrics = useMemo(() => computeMetrics(text, 1), [text]);
  const speakingMs = firstWordRef.current ? now - firstWordRef.current : 0;
  const silentMs = now - (lastWordRef.current || startRef.current);

  return {
    elapsedSec: active && startRef.current ? Math.max(0, Math.floor((now - startRef.current) / 1000)) : 0,
    wpm: spoken && speakingMs >= 6000 && words >= 12 ? Math.round((words / speakingMs) * 60000) : null,
    fillers: metrics.fillers,
    fillerTotal: metrics.fillerTotal,
    powerPauses: pauses,
    pausing: spoken && active && silentMs >= POWER_PAUSE.minMs && silentMs <= POWER_PAUSE.maxMs,
    lastPauseAt,
  };
}
