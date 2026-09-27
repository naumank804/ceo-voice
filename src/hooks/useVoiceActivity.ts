"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Options {
  /** Fired (throttled to animation frames) whenever the mic hears voice above the noise floor. */
  onVoice?: () => void;
}

/**
 * Raw microphone voice-activity detection via Web Audio.
 *
 * Why not rely on speech recognition alone? Recognition results arrive in bursts with
 * 0.5–1.5 s of latency, and it emits nothing for sounds it can't transcribe ("mmm…").
 * For a 3-second freeze detector we need to know the instant the candidate makes a sound.
 */
export function useVoiceActivity({ onVoice }: Options = {}) {
  const [active, setActive] = useState(false);
  const [level, setLevel] = useState(0); // 0..1 for the mic meter
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number>(0);
  const voiceRef = useRef(onVoice);
  voiceRef.current = onVoice;

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void ctxRef.current?.close();
    ctxRef.current = null;
    setActive(false);
    setLevel(0);
  }, []);

  const start = useCallback(async () => {
    if (streamRef.current) return true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      ctx.createMediaStreamSource(stream).connect(analyser);
      streamRef.current = stream;
      ctxRef.current = ctx;
      setActive(true);
      setError(null);

      const buf = new Float32Array(analyser.fftSize);
      let noiseFloor = 0.01;
      let lastLevelPush = 0;

      const tick = (t: number) => {
        analyser.getFloatTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
        const rms = Math.sqrt(sum / buf.length);

        // Adaptive threshold: track room noise slowly, so a fan or AC never counts as "speaking".
        const threshold = Math.max(0.015, noiseFloor * 2.5);
        const speaking = rms > threshold;
        if (!speaking) noiseFloor = noiseFloor * 0.98 + rms * 0.02;
        if (speaking) voiceRef.current?.();

        if (t - lastLevelPush > 66) {
          setLevel(Math.min(1, rms * 8));
          lastLevelPush = t;
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
      return true;
    } catch {
      setError("Microphone unavailable. Check permissions or plug in a mic.");
      return false;
    }
  }, []);

  useEffect(() => stop, [stop]);

  return { active, level, error, start, stop };
}
