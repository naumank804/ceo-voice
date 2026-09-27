"use client";

import { useState } from "react";
import type { Industry, StruggleLevel } from "@/lib/types";

export interface SessionConfig {
  industry: Industry;
  level: StruggleLevel;
  jobDescription: string;
  count: number;
}

const INDUSTRIES: Industry[] = ["Tech", "Finance", "Healthcare", "Consulting", "Marketing", "Operations"];
const LEVELS: { value: StruggleLevel; hint: string }[] = [
  { value: "Beginner", hint: "I freeze often; simple questions please" },
  { value: "Intermediate", hint: "I get through it, but I stumble" },
  { value: "Advanced", hint: "I want to sound senior" },
];

export function SetupPanel({ onStart, busy }: { onStart: (c: SessionConfig) => void; busy: boolean }) {
  const [cfg, setCfg] = useState<SessionConfig>({ industry: "Tech", level: "Intermediate", jobDescription: "", count: 5 });

  return (
    <form
      className="grid gap-10 lg:grid-cols-[1fr_1.2fr]"
      onSubmit={(e) => {
        e.preventDefault();
        onStart(cfg);
      }}
    >
      <div className="space-y-5">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-gold-500">Stumble-to-Flow</p>
        <h1 className="font-serif text-5xl leading-tight">The Interview Room</h1>
        <p className="leading-relaxed text-graphite-300">
          The interviewer will ask each question aloud. Answer out loud, as you would in the room.
        </p>
        <div className="rounded-lg border border-graphite-800 bg-graphite-950 p-5 text-sm leading-relaxed text-graphite-300">
          <p className="mb-2 font-semibold text-graphite-100">If your mind goes blank</p>
          Stay silent for three seconds and the <span className="text-gold-400">Safety Net</span> appears with three anchor words.
          Walk through them in order. Over repeated sessions, your brain learns to reach for the anchors on its own —
          that's the point.
        </div>
        <p className="text-xs text-graphite-400">Best in Chrome or Edge. Your microphone is used only in this tab.</p>
      </div>

      <div className="space-y-7 rounded-xl border border-graphite-800 bg-graphite-950/70 p-6">
        <fieldset>
          <legend className="mb-3 text-sm font-medium text-graphite-300">Industry</legend>
          <div className="flex flex-wrap gap-2">
            {INDUSTRIES.map((ind) => (
              <button
                key={ind}
                type="button"
                aria-pressed={cfg.industry === ind}
                onClick={() => setCfg({ ...cfg, industry: ind })}
                className={`rounded-md border px-3 py-1.5 text-sm transition ${
                  cfg.industry === ind ? "border-gold-500 bg-gold-500/10 text-gold-300" : "border-graphite-700 text-graphite-300 hover:border-graphite-600"
                }`}
              >
                {ind}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-3 text-sm font-medium text-graphite-300">Where are you today?</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {LEVELS.map((l) => (
              <label
                key={l.value}
                className={`cursor-pointer rounded-md border p-3 transition ${
                  cfg.level === l.value ? "border-gold-500 bg-gold-500/10" : "border-graphite-700 hover:border-graphite-600"
                }`}
              >
                <input type="radio" name="level" className="sr-only" checked={cfg.level === l.value} onChange={() => setCfg({ ...cfg, level: l.value })} />
                <span className={`block text-sm font-medium ${cfg.level === l.value ? "text-gold-300" : "text-graphite-100"}`}>{l.value}</span>
                <span className="mt-1 block text-xs text-graphite-400">{l.hint}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-graphite-300">
            Job description <span className="font-normal text-graphite-400">(optional — tailors the questions)</span>
          </span>
          <textarea
            rows={5}
            value={cfg.jobDescription}
            onChange={(e) => setCfg({ ...cfg, jobDescription: e.target.value })}
            placeholder="Paste the role's responsibilities and requirements…"
            className="w-full resize-y rounded-md border border-graphite-700 bg-graphite-900 p-3 text-sm text-graphite-100 placeholder:text-graphite-600 focus:border-gold-600 focus:outline-none"
          />
        </label>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <label className="flex items-center gap-3 text-sm text-graphite-300">
            Questions
            <select
              value={cfg.count}
              onChange={(e) => setCfg({ ...cfg, count: Number(e.target.value) })}
              className="rounded-md border border-graphite-700 bg-graphite-900 px-2 py-1 text-graphite-100"
            >
              {[3, 5, 7].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-gold-500 px-6 py-3 text-sm font-semibold text-ink transition hover:bg-gold-400 disabled:cursor-wait disabled:opacity-60"
          >
            {busy ? "Preparing your interviewer…" : "Enter the room"}
          </button>
        </div>
      </div>
    </form>
  );
}
