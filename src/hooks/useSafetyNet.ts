"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SafetyNetLevel, SafetyNetUsage } from "@/lib/types";

export const SAFETY_NET = {
  /** Silence before the three keywords appear. */
  freezeMs: 3000,
  /** Further silence (after keywords are shown) before the opening line appears. */
  escalateMs: 4000,
  /** Silence after which we show a calm "pausing is fine" cue — reframes silence before panic sets in. */
  breatheCueMs: 1500,
  tickMs: 100,
} as const;

interface Options {
  /** Only count silence while the candidate is expected to be answering (not while the question is read aloud). */
  armed: boolean;
}

/**
 * Freeze detector + escalation ladder.
 *
 *   silence ≥ 3s  → level 1: three anchor keywords
 *   still silent  → level 2: a confident opening sentence
 *
 * Call `markActivity()` on any sign of speech (mic energy, recognition result, keystroke).
 * Once the candidate is talking again the net "docks" — it stays on screen but steps back
 * visually, so the keywords remain available without competing for attention.
 */
export function useSafetyNet({ armed }: Options) {
  const [level, setLevel] = useState<SafetyNetLevel>(0);
  const [silentMs, setSilentMs] = useState(0);
  const [usage, setUsage] = useState<SafetyNetUsage | null>(null);

  const lastActivityRef = useRef(Date.now());
  const revealedAtRef = useRef(0);
  const levelRef = useRef<SafetyNetLevel>(0);
  const firstSpeechAtRef = useRef<number | null>(null);
  const armedRef = useRef(armed);
  armedRef.current = armed;

  const reveal = useCallback((next: SafetyNetLevel, triggeredAfterSec: number | null) => {
    if (next <= levelRef.current) return;
    levelRef.current = next;
    revealedAtRef.current = Date.now();
    setLevel(next);
    setUsage((prev) => ({
      // Keep the *first* trigger reason — that's the moment the freeze happened.
      triggeredAfterSec: prev ? prev.triggeredAfterSec : triggeredAfterSec,
      level: next,
    }));
  }, []);

  const markActivity = useCallback(() => {
    // Ignore sound while disarmed (e.g. the interviewer's voice coming through the speakers).
    if (!armedRef.current) return;
    const now = Date.now();
    lastActivityRef.current = now;
    firstSpeechAtRef.current ??= now;
  }, []);

  /** Manual "Safety Net" button — each press climbs one rung. */
  const open = useCallback(() => {
    reveal(levelRef.current === 0 ? 1 : 2, null);
  }, [reveal]);

  const reset = useCallback(() => {
    levelRef.current = 0;
    revealedAtRef.current = 0;
    firstSpeechAtRef.current = null;
    lastActivityRef.current = Date.now();
    setLevel(0);
    setSilentMs(0);
    setUsage(null);
  }, []);

  useEffect(() => {
    if (!armed) {
      setSilentMs(0);
      return;
    }
    // Arming starts the clock fresh: the candidate gets the full window after the question ends.
    lastActivityRef.current = Date.now();

    const id = window.setInterval(() => {
      const now = Date.now();
      const silent = now - lastActivityRef.current;
      setSilentMs(silent);

      if (levelRef.current === 0 && silent >= SAFETY_NET.freezeMs) {
        reveal(1, Math.round(silent / 100) / 10);
      } else if (levelRef.current === 1) {
        // Measure from whichever came last: the reveal, or their last word after it.
        const since = now - Math.max(lastActivityRef.current, revealedAtRef.current);
        if (since >= SAFETY_NET.escalateMs) reveal(2, null);
      }
    }, SAFETY_NET.tickMs);

    return () => window.clearInterval(id);
  }, [armed, reveal]);

  const spokeSinceReveal = level > 0 && lastActivityRef.current > revealedAtRef.current;

  return {
    level,
    usage,
    silentMs,
    /** Visible but de-emphasised once the candidate has found their words again. */
    docked: armed && spokeSinceReveal && silentMs < SAFETY_NET.freezeMs,
    showBreatheCue: armed && level === 0 && silentMs >= SAFETY_NET.breatheCueMs,
    firstSpeechAt: () => firstSpeechAtRef.current,
    lastActivityAt: () => lastActivityRef.current,
    markActivity,
    open,
    reset,
  };
}
