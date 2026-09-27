"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Minimal typings — the Web Speech API is not in TypeScript's DOM lib.
interface SpeechRecognitionAlternative { transcript: string }
interface SpeechRecognitionResult { isFinal: boolean; 0: SpeechRecognitionAlternative; length: number }
interface SpeechRecognitionEvent { resultIndex: number; results: ArrayLike<SpeechRecognitionResult> }
interface SpeechRecognitionErrorEvent { error: string }
interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

function getCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

interface Options {
  lang?: string;
  /** Fired on every recognition result — used as a speech-activity signal by the Safety Net. */
  onActivity?: () => void;
}

/**
 * Continuous speech-to-text via the browser's Web Speech API.
 * Chrome ends a session after a few seconds of silence, so we transparently restart
 * until `stop()` is called — a frozen candidate must not silently lose the mic.
 */
export function useSpeechRecognition({ lang = "en-US", onActivity }: Options = {}) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [listening, setListening] = useState(false);
  const [finalText, setFinalText] = useState("");
  const [interimText, setInterimText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recRef = useRef<SpeechRecognitionInstance | null>(null);
  const wantRef = useRef(false);
  const activityRef = useRef(onActivity);
  activityRef.current = onActivity;

  useEffect(() => setSupported(getCtor() !== null), []);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) return;
    wantRef.current = true;
    setError(null);

    recRef.current?.abort();
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = lang;

    rec.onresult = (e) => {
      let interim = "";
      let finalChunk = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalChunk += r[0].transcript;
        else interim += r[0].transcript;
      }
      if (finalChunk) setFinalText((prev) => `${prev} ${finalChunk}`.replace(/\s+/g, " ").trim());
      setInterimText(interim);
      activityRef.current?.();
    };
    rec.onerror = (e) => {
      // "no-speech" and "aborted" are expected during long pauses / restarts.
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        wantRef.current = false;
        setError("Microphone access was blocked. Allow it in your browser's address bar and try again.");
      } else if (e.error === "network") {
        setError("Speech service unreachable. Check your connection.");
      }
    };
    rec.onend = () => {
      // A newer instance has replaced this one (stop → start in quick succession).
      if (recRef.current !== rec) return;
      if (wantRef.current) {
        try {
          rec.start();
          return;
        } catch {
          /* fall through */
        }
      }
      setListening(false);
      setInterimText("");
    };

    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setError("Could not start speech recognition.");
    }
  }, [lang]);

  const stop = useCallback(() => {
    wantRef.current = false;
    recRef.current?.stop();
  }, []);

  const reset = useCallback(() => {
    setFinalText("");
    setInterimText("");
  }, []);

  useEffect(
    () => () => {
      wantRef.current = false;
      recRef.current?.abort();
    },
    [],
  );

  /** Everything heard so far, including words still being recognised. */
  const fullText = `${finalText} ${interimText}`.trim();

  return { supported, listening, finalText, interimText, fullText, error, start, stop, reset, setFinalText };
}
