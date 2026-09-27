"use client";

import { useState } from "react";
import { CameraToggle } from "@/components/camera/CameraMirror";
import { useCamera } from "@/hooks/useCamera";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { ImpromptuDrill, type IncomingTopic } from "./ImpromptuDrill";
import { PracticeLibrary } from "./PracticeLibrary";
import { type IncomingSpeech, SpeechRehearsal } from "./SpeechRehearsal";

type Mode = "speech" | "impromptu" | "library";

const MODES: { id: Mode; name: string; body: string }[] = [
  { id: "speech", name: "Rehearse a speech", body: "Learn a prepared talk step by step, until you can deliver it without notes." },
  { id: "impromptu", name: "Impromptu drill", body: "Speak on a surprise topic using a simple path. Nothing to memorise." },
  { id: "library", name: "Practice library", body: "Quotes, speeches and stories on leadership, management, tech and product." },
];

export function StageStudio() {
  const [mode, setMode] = useState<Mode>("speech");
  const camera = useCamera();
  const tts = useSpeechSynthesis();
  const [speechHandoff, setSpeechHandoff] = useState<IncomingSpeech | null>(null);
  const [topicHandoff, setTopicHandoff] = useState<IncomingTopic | null>(null);

  const switchMode = (m: Mode) => {
    tts.cancel();
    camera.discardRecording();
    // A handoff is consumed once; switching tabs by hand starts clean.
    setSpeechHandoff(null);
    setTopicHandoff(null);
    setMode(m);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-gold-500">Public Speaking</p>
          <h1 className="font-serif text-5xl leading-tight">The Speaking Stage</h1>
          <p className="leading-relaxed text-graphite-300">
            Practise out loud, the way you&apos;ll speak on the day. Turn on the camera to see what your audience sees.
          </p>
        </div>
        <CameraToggle camera={camera} />
      </div>

      <div role="tablist" className="grid gap-2 sm:grid-cols-3">
        {MODES.map((m) => (
          <button
            key={m.id}
            role="tab"
            type="button"
            aria-selected={mode === m.id}
            onClick={() => switchMode(m.id)}
            className={`rounded-xl border p-4 text-left transition ${mode === m.id ? "border-gold-500 bg-gold-500/10" : "border-graphite-800 bg-graphite-950/60 hover:border-graphite-600"}`}
          >
            <span className={`block font-serif text-2xl ${mode === m.id ? "text-gold-300" : "text-graphite-100"}`}>{m.name}</span>
            <span className="block text-sm text-graphite-400">{m.body}</span>
          </button>
        ))}
      </div>

      {mode === "speech" && <SpeechRehearsal incoming={speechHandoff} camera={camera} speak={tts.speak} stopSpeaking={tts.cancel} />}
      {mode === "impromptu" && <ImpromptuDrill incoming={topicHandoff} camera={camera} speak={tts.speak} stopSpeaking={tts.cancel} />}
      {mode === "library" && (
        <PracticeLibrary
          speak={tts.speak}
          stopSpeaking={tts.cancel}
          onMemorize={(title, text) => {
            tts.cancel();
            setSpeechHandoff({ title, text, nonce: Date.now() });
            setMode("speech");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          onDiscuss={(req) => {
            tts.cancel();
            setTopicHandoff({ ...req, nonce: Date.now() });
            setMode("impromptu");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      )}
    </div>
  );
}
