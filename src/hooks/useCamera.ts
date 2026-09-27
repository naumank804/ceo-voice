"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const MIME_TYPES = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"];

/**
 * Webcam mirror + take recorder. Everything stays in the browser: recordings are
 * blob URLs that disappear when the tab closes, unless the user saves them.
 */
export function useCamera() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const urlsRef = useRef<string[]>([]);

  const start = useCallback(async () => {
    if (streamRef.current) return true;
    setStarting(true);
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = s;
      setStream(s);
      setError(null);
      return true;
    } catch {
      setError("Camera unavailable. Allow camera access in the address bar, or practise without it.");
      return false;
    } finally {
      setStarting(false);
    }
  }, []);

  const discardRecording = useCallback(() => {
    const rec = recorderRef.current;
    recorderRef.current = null;
    if (rec && rec.state !== "inactive") {
      rec.ondataavailable = null;
      rec.onstop = null;
      rec.stop();
    }
    chunksRef.current = [];
    setRecording(false);
  }, []);

  const stop = useCallback(() => {
    discardRecording();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
  }, [discardRecording]);

  /** Starts a new take. No-op without a camera, or if a take is already rolling. */
  const startRecording = useCallback(() => {
    const s = streamRef.current;
    if (!s || recorderRef.current || typeof MediaRecorder === "undefined") return;
    const mimeType = MIME_TYPES.find((t) => MediaRecorder.isTypeSupported(t));
    try {
      const rec = new MediaRecorder(s, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.start(1000);
      recorderRef.current = rec;
      setRecording(true);
    } catch {
      setError("Recording isn't supported in this browser — the mirror still works.");
    }
  }, []);

  /** Ends the take and resolves with a playable URL (or null if nothing was recorded). */
  const stopRecording = useCallback(
    () =>
      new Promise<string | null>((resolve) => {
        const rec = recorderRef.current;
        recorderRef.current = null;
        setRecording(false);
        if (!rec || rec.state === "inactive") return resolve(null);
        rec.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: rec.mimeType || "video/webm" });
          chunksRef.current = [];
          if (!blob.size) return resolve(null);
          const url = URL.createObjectURL(blob);
          urlsRef.current.push(url);
          resolve(url);
        };
        rec.stop();
      }),
    [],
  );

  useEffect(
    () => () => {
      recorderRef.current?.state === "recording" && recorderRef.current.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      urlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    },
    [],
  );

  return { stream, on: stream !== null, starting, recording, error, start, stop, startRecording, stopRecording, discardRecording };
}

export type Camera = ReturnType<typeof useCamera>;
