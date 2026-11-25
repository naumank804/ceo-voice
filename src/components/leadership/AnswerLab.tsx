"use client";

import { useState } from "react";
import { primaryButton, secondaryButton, SectionLabel } from "@/components/stage/shared";
import type { Camera } from "@/hooks/useCamera";
import {
  type AnswerCard,
  allCards,
  blankCard,
  cheatCode,
  DEFAULT_CARDS,
  dueLabel,
  type LeadershipState,
  levelInfo,
  progressOf,
  rawCards,
  recordTake,
} from "@/lib/leadership";
import { AnswerRoom } from "./AnswerRoom";

interface Props {
  state: LeadershipState;
  update: (fn: (s: LeadershipState) => LeadershipState) => void;
  camera: Camera;
  speak: (text: string, rate?: number) => Promise<void>;
  stopSpeaking: () => void;
  /** Open straight into this card (from the daily plan). */
  openId?: string | null;
}

export function AnswerLab({ state, update, camera, speak, stopSpeaking, openId }: Props) {
  const [activeId, setActiveId] = useState<string | null>(openId ?? null);
  const [editing, setEditing] = useState<AnswerCard | null>(null);
  const cards = allCards(state);
  const active = cards.find((c) => c.id === activeId);

  if (editing) {
    return (
      <CardEditor
        card={editing}
        isDefault={DEFAULT_CARDS.some((d) => d.id === editing.id)}
        overridden={!!state.overrides[editing.id]}
        onCancel={() => setEditing(null)}
        onSave={(c) => {
          update((s) => {
            if (DEFAULT_CARDS.some((d) => d.id === c.id)) return { ...s, overrides: { ...s.overrides, [c.id]: c } };
            const exists = s.custom.some((x) => x.id === c.id);
            return { ...s, custom: exists ? s.custom.map((x) => (x.id === c.id ? c : x)) : [...s.custom, c] };
          });
          setEditing(null);
        }}
        onDelete={() => {
          update((s) => {
            if (DEFAULT_CARDS.some((d) => d.id === editing.id)) {
              const { [editing.id]: _, ...rest } = s.overrides;
              return { ...s, overrides: rest };
            }
            return { ...s, custom: s.custom.filter((x) => x.id !== editing.id) };
          });
          setEditing(null);
        }}
      />
    );
  }

  if (active) {
    return (
      <AnswerRoom
        key={active.id}
        card={active}
        mode="lab"
        initialLevel={progressOf(state, active.id).level}
        camera={camera}
        speak={speak}
        stopSpeaking={stopSpeaking}
        onRecorded={(t) => update((s) => recordTake(s, active.id, t))}
        onExit={() => {
          stopSpeaking();
          setActiveId(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <p className="max-w-2xl text-sm leading-relaxed text-graphite-300">
          Every answer has the same shape: <span className="text-graphite-100">opening → three pillars → landing line</span>. Learn the three-word
          cheat code and the whole answer unfolds from it. Climb from reading to speaking from memory; cards come back on a spaced schedule so they stay
          sharp.
        </p>
        <button type="button" onClick={() => setEditing(blankCard())} className={secondaryButton}>
          + Add a question
        </button>
      </div>
      <ul className="grid gap-3 md:grid-cols-2">
        {cards.map((c) => {
          const p = progressOf(state, c.id);
          const due = dueLabel(p);
          return (
            <li key={c.id} className="flex flex-col rounded-xl border border-graphite-800 bg-graphite-950/60 p-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-serif text-2xl text-graphite-100">{c.topic}</h3>
                <span className={`shrink-0 text-[10px] uppercase tracking-widest ${due.due ? "text-gold-500" : "text-graphite-400"}`}>{due.label}</span>
              </div>
              <p className="mt-1 text-sm text-graphite-400">{c.question}</p>
              <p className="mt-3 text-sm font-medium text-gold-400">{cheatCode(c)}</p>
              <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4">
                <span className="text-xs text-graphite-400">
                  Level {p.level}: {levelInfo(p.level).name}
                  {p.best > 0 && ` · best ${p.best}`}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing(rawCards(state).find((x) => x.id === c.id) ?? c)}
                    className="rounded-md border border-graphite-700 px-3 py-1.5 text-xs text-graphite-300 transition hover:border-graphite-500"
                  >
                    Edit
                  </button>
                  <button type="button" onClick={() => setActiveId(c.id)} className="rounded-md bg-gold-500 px-4 py-1.5 text-xs font-semibold text-ink transition hover:bg-gold-400">
                    Practise
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const input =
  "w-full rounded-md border border-graphite-700 bg-graphite-950 px-3 py-2 text-sm text-graphite-100 placeholder:text-graphite-600 focus:border-gold-600 focus:outline-none";

function CardEditor({
  card,
  isDefault,
  overridden,
  onSave,
  onCancel,
  onDelete,
}: {
  card: AnswerCard;
  isDefault: boolean;
  overridden: boolean;
  onSave: (c: AnswerCard) => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const [c, setC] = useState<AnswerCard>(card);
  const [confirming, setConfirming] = useState(false);
  const setPillar = (i: number, patch: Partial<AnswerCard["pillars"][number]>) =>
    setC((x) => ({ ...x, pillars: x.pillars.map((p, j) => (j === i ? { ...p, ...patch } : p)) }));
  const valid = c.question.trim() && c.pillars.every((p) => p.key.trim() && p.text.trim());
  const isNew = card.custom && !card.topic;

  const save = () =>
    onSave({
      ...c,
      topic: c.topic.trim() || c.question.trim().slice(0, 40),
      pillars: c.pillars.map((p) => ({
        ...p,
        title: p.title.trim() || p.key.trim(),
        // Cue words default to the pillar key and tag, so live tracking works for new questions too.
        cues: p.cues.length ? p.cues : [p.key, ...p.tag.split(/[\s/,]+/)].map((w) => w.trim()).filter((w) => w.length > 2),
      })),
    });

  return (
    <div className="space-y-5">
      <div>
        <SectionLabel tone="gold">{isNew ? "New question" : "Edit answer"}</SectionLabel>
        <p className="mt-1 text-sm text-graphite-400">
          Write <code className="text-graphite-200">{"{company}"}</code> wherever the company name should go. It is filled from the target company in
          settings.
        </p>
      </div>
      <label className="block space-y-1 text-sm text-graphite-300">
        Short name
        <input className={input} value={c.topic} onChange={(e) => setC({ ...c, topic: e.target.value })} placeholder="e.g. Handling conflict" />
      </label>
      <label className="block space-y-1 text-sm text-graphite-300">
        The question
        <input className={input} value={c.question} onChange={(e) => setC({ ...c, question: e.target.value })} />
      </label>
      <label className="block space-y-1 text-sm text-graphite-300">
        Opening line
        <textarea rows={2} className={input} value={c.opening} onChange={(e) => setC({ ...c, opening: e.target.value })} placeholder="I approach this through three principles." />
      </label>
      <div className="grid gap-4 lg:grid-cols-3">
        {c.pillars.map((p, i) => (
          <fieldset key={i} className="space-y-2 rounded-lg border border-graphite-800 p-3">
            <legend className="px-1 text-xs uppercase tracking-[0.2em] text-graphite-400">Pillar {i + 1}</legend>
            <input className={input} value={p.key} onChange={(e) => setPillar(i, { key: e.target.value })} placeholder="Cheat-code word" />
            <input className={input} value={p.tag} onChange={(e) => setPillar(i, { tag: e.target.value })} placeholder="Memory tag, e.g. OKRs" />
            <textarea rows={5} className={input} value={p.text} onChange={(e) => setPillar(i, { text: e.target.value })} placeholder="First, …" />
          </fieldset>
        ))}
      </div>
      <label className="block space-y-1 text-sm text-graphite-300">
        Landing line
        <textarea rows={2} className={input} value={c.close} onChange={(e) => setC({ ...c, close: e.target.value })} />
      </label>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          {(!isDefault || overridden) &&
            (confirming ? (
              <span className="flex items-center gap-2 text-sm text-graphite-300">
                {isDefault ? "Restore the original answer?" : "Delete this question?"}
                <button type="button" onClick={onDelete} className="rounded-md border border-signal-red/60 px-3 py-1.5 text-xs text-signal-red">
                  Yes
                </button>
                <button type="button" onClick={() => setConfirming(false)} className="rounded-md border border-graphite-700 px-3 py-1.5 text-xs text-graphite-300">
                  No
                </button>
              </span>
            ) : (
              <button type="button" onClick={() => setConfirming(true)} className="text-sm text-graphite-400 underline-offset-4 hover:underline">
                {isDefault ? "Restore original" : "Delete question"}
              </button>
            ))}
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={onCancel} className={secondaryButton}>
            Cancel
          </button>
          <button type="button" disabled={!valid} onClick={save} className={primaryButton}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
