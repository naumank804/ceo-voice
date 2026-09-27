"use client";

import { useCallback, useRef, useState } from "react";
import type { SafetyNetUsage } from "@/lib/types";
import type { Camera } from "./useCamera";
import { useSafetyNet } from "./useSafetyNet";
import { useSpeechRecognition } from "./useSpeechRecognition";
import { useVoiceActivity } from "./useVoiceActivity";

export interface TakeResult {
  transcript: string;
  durationSec: number;
  netUsage: SafetyNetUsage | null;
  videoUrl: string | null;
}

/**
 * One spoken take: mic + live transcript + freeze detector (+ optional camera recording).
 * Shared by the Stage's speech rehearsal and impromptu drill.
 */
export function useLiveTake({ netEnabled, camera }: { netEnabled: boolean; camera: Camera }) {
  const [live, setLive] = useState(false);
  const [typed, setTyped] = useState("");

  const net = useSafetyNet({ armed: live && netEnabled });
  const stt = useSpeechRecognition({ onActivity: net.markActivity });
  const vad = useVoiceActivity({ onVoice: net.markActivity });

  const typedMode = stt.supported === false;
  const startedAtRef = useRef(0);
  const transcript = (typedMode ? typed : stt.fullText).trim();

  const begin = useCallback(async () => {
    net.reset();
    stt.reset();
    setTyped("");
    if (!typedMode) await vad.start();
    camera.startRecording();
    startedAtRef.current = Date.now();
    setLive(true);
    if (!typedMode) stt.start();
  }, [net, stt, typedMode, vad, camera]);

  const finish = useCallback(async (): Promise<TakeResult> => {
    stt.stop();
    vad.stop();
    setLive(false);
    // Pace is measured over the time spent speaking, not the silence before the first word.
    const first = net.firstSpeechAt() ?? startedAtRef.current;
    const last = Math.max(net.firstSpeechAt() ? net.lastActivityAt() : Date.now(), first + 1000);
    const videoUrl = await camera.stopRecording();
    return { transcript, durationSec: typedMode ? 0 : (last - first) / 1000, netUsage: net.usage, videoUrl };
  }, [stt, vad, net, camera, transcript, typedMode]);

  const cancel = useCallback(() => {
    stt.stop();
    vad.stop();
    camera.discardRecording();
    setLive(false);
  }, [stt, vad, camera]);

  return {
    live,
    typedMode,
    transcript,
    finalText: stt.finalText,
    interimText: stt.interimText,
    typed,
    setTyped: (v: string) => {
      setTyped(v);
      net.markActivity();
    },
    micLevel: vad.level,
    error: stt.error ?? vad.error,
    net,
    startedAt: () => startedAtRef.current,
    begin,
    finish,
    cancel,
  };
}

export type LiveTake = ReturnType<typeof useLiveTake>;
