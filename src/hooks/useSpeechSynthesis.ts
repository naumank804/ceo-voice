"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Voices that sound like a composed interviewer rather than a robot, in order of preference. */
const PREFERRED = [/Google UK English Male/i, /Microsoft (Ryan|Guy|Andrew|Christopher)/i, /Daniel/i, /en-GB/i, /en-US/i];

function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  for (const re of PREFERRED) {
    const v = voices.find((v) => re.test(v.name) || re.test(v.lang));
    if (v) return v;
  }
  return voices.find((v) => v.lang.startsWith("en"));
}

export function useSpeechSynthesis() {
  const [speaking, setSpeaking] = useState(false);
  const voiceRef = useRef<SpeechSynthesisVoice | undefined>(undefined);
  const finishRef = useRef<(() => void) | null>(null);
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(() => {
    if (!supported) return;
    const load = () => (voiceRef.current = pickVoice(window.speechSynthesis.getVoices()));
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", load);
      window.speechSynthesis.cancel();
    };
  }, [supported]);

  /** Resolves when speech finishes (or is cancelled). */
  const speak = useCallback(
    (text: string, rate = 0.95) =>
      new Promise<void>((resolve) => {
        if (!supported) return resolve();
        finishRef.current?.();
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.voice = voiceRef.current ?? null;
        u.rate = rate;
        u.pitch = 0.95;

        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          finishRef.current = null;
          setSpeaking(false);
          resolve();
        };
        finishRef.current = finish;
        u.onend = finish;
        u.onerror = finish;
        // Chrome occasionally never fires `onend`; don't leave the candidate stuck.
        window.setTimeout(finish, 2000 + text.split(/\s+/).length * 550);

        setSpeaking(true);
        window.speechSynthesis.speak(u);
      }),
    [supported],
  );

  /** Stops speech and resolves the pending `speak()` promise immediately. */
  const cancel = useCallback(() => {
    if (supported) window.speechSynthesis.cancel();
    finishRef.current?.();
    setSpeaking(false);
  }, [supported]);

  return { supported, speaking, speak, cancel };
}
