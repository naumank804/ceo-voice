"use client";

import { useEffect, useRef, useState } from "react";
import type { Camera } from "@/hooks/useCamera";

/** Header switch that turns the camera mirror on and off. */
export function CameraToggle({ camera }: { camera: Camera }) {
  return (
    <span className="inline-flex flex-wrap items-center justify-end gap-3">
    {camera.error && !camera.on && <span className="text-xs normal-case tracking-normal text-signal-amber">{camera.error}</span>}
    <button
      type="button"
      onClick={() => (camera.on ? camera.stop() : void camera.start())}
      disabled={camera.starting}
      aria-pressed={camera.on}
      className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs transition ${
        camera.on ? "border-gold-500 bg-gold-500/10 text-gold-300" : "border-graphite-700 text-graphite-300 hover:border-gold-600 hover:text-gold-300"
      }`}
    >
      <span className={`size-1.5 rounded-full ${camera.on ? "bg-signal-green" : "bg-graphite-600"}`} />
      {camera.starting ? "Starting camera…" : camera.on ? "Camera on" : "Camera off"}
    </button>
    </span>
  );
}

/**
 * Live self-view. Mirrored (that's what people expect of a mirror), with a faint
 * eye-line guide: in a well-framed shot your eyes sit about a third of the way down.
 */
export function CameraMirror({ camera, compact = false }: { camera: Camera; compact?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [guides, setGuides] = useState(true);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = camera.stream;
  }, [camera.stream]);

  if (!camera.on) return null;

  return (
    <figure className="space-y-2">
      <div className="relative overflow-hidden rounded-xl border border-graphite-800 bg-graphite-900">
        <video ref={videoRef} autoPlay muted playsInline className="aspect-video w-full -scale-x-100 object-cover" />
        <p className="absolute inset-x-0 top-2 text-center text-[10px] uppercase tracking-[0.2em] text-white/90 drop-shadow">
          ▲ Eyes to the lens
        </p>
        {guides && (
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute inset-x-6 top-1/3 border-t border-dashed border-white/40" />
            <div className="absolute inset-y-6 left-1/2 border-l border-dashed border-white/25" />
          </div>
        )}
        {camera.recording && (
          <span className="absolute right-2 top-2 flex items-center gap-1.5 rounded bg-black/55 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-white">
            <span className="size-1.5 animate-pulse rounded-full bg-red-500" /> Rec
          </span>
        )}
      </div>
      {!compact && (
        <figcaption className="flex items-center justify-between gap-3 text-xs text-graphite-400">
          <span>Takes are recorded only in this tab, so you can watch them back.</span>
          <button type="button" onClick={() => setGuides((g) => !g)} className="shrink-0 underline-offset-4 hover:text-gold-400 hover:underline">
            {guides ? "Hide guides" : "Show guides"}
          </button>
        </figcaption>
      )}
    </figure>
  );
}

const REVIEW = [
  "Looked at the lens (not the screen) for most of it",
  "Head up, shoulders open, no swaying",
  "Used your hands to show structure (one, two, three)",
  "Paused between sections instead of filling the gap",
  "Face matched the message: smiled at the right moments",
];

/** Watch-back player with a short self-review. Seeing yourself is the fastest way to fix body language. */
export function TakePlayback({ url, filename = "my-take.webm" }: { url: string; filename?: string }) {
  const [checked, setChecked] = useState<boolean[]>(() => REVIEW.map(() => false));
  const done = checked.filter(Boolean).length;

  return (
    <section className="rounded-xl border border-graphite-800 bg-graphite-950/60 p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-graphite-400">Watch yourself back</p>
        <a href={url} download={filename} className="text-xs text-graphite-400 underline-offset-4 hover:text-gold-400 hover:underline">
          Save video
        </a>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <video src={url} controls playsInline className="aspect-video w-full rounded-lg bg-graphite-900 object-cover" />
        <div>
          <p className="mb-3 text-sm text-graphite-300">
            Watch once with the sound <span className="text-graphite-100">off</span>: body language is easier to judge without the words. Tick what you saw:
          </p>
          <ul className="space-y-2">
            {REVIEW.map((item, i) => (
              <li key={item}>
                <label className="flex cursor-pointer items-start gap-3 text-sm text-graphite-300">
                  <input
                    type="checkbox"
                    checked={checked[i]}
                    onChange={() => setChecked((c) => c.map((v, j) => (j === i ? !v : v)))}
                    className="mt-0.5 size-4 accent-[var(--color-gold-500)]"
                  />
                  <span className={checked[i] ? "text-graphite-100" : ""}>{item}</span>
                </label>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-graphite-400">
            {done === REVIEW.length
              ? "All five. That's how a confident speaker looks on camera."
              : done >= 3
                ? `${done} of 5. Pick one unticked item to focus on next take.`
                : "Pick just one item to focus on next take. One change at a time sticks."}
          </p>
        </div>
      </div>
    </section>
  );
}
