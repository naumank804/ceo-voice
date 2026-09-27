"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Camera } from "@/hooks/useCamera";
import {
  type Attempt,
  ladder,
  type LadderLevel,
  loadSpeeches,
  reviewLabel,
  type SavedSpeech,
  saveSpeeches,
  splitIntoBeats,
  TEMPLATES,
} from "@/lib/stage";
import { RehearsalRoom } from "./RehearsalRoom";
import { primaryButton, secondaryButton, SectionLabel } from "./shared";

interface Draft {
  id: string | null;
  title: string;
  text: string;
}

type View = { kind: "library" } | { kind: "edit"; draft: Draft } | { kind: "rehearse"; id: string };

export interface IncomingSpeech {
  title: string;
  text: string;
  nonce: number;
}

interface Props {
  /** A speech handed over from the Practice library: saved and opened straight away. */
  incoming?: IncomingSpeech | null;
  camera: Camera;
  speak: (text: string, rate?: number) => Promise<void>;
  stopSpeaking: () => void;
}

export function SpeechRehearsal({ incoming, camera, speak, stopSpeaking }: Props) {
  const [speeches, setSpeeches] = useState<SavedSpeech[]>([]);
  const [view, setView] = useState<View>({ kind: "library" });

  // localStorage is browser-only, so load after mount to keep server and client HTML identical.
  useEffect(() => setSpeeches(loadSpeeches()), []);

  const update = (fn: (prev: SavedSpeech[]) => SavedSpeech[]) =>
    setSpeeches((prev) => {
      const next = fn(prev);
      saveSpeeches(next);
      return next;
    });

  const create = (title: string, text: string) => {
    const id = crypto.randomUUID();
    const speech: SavedSpeech = { id, title, text, level: 1, updatedAt: new Date().toISOString(), attempts: [] };
    update((prev) => [speech, ...prev]);
    setView({ kind: "rehearse", id });
  };

  // Runs after the load effect above, so the new speech is added on top of the saved list.
  const handledRef = useRef<number | null>(null);
  useEffect(() => {
    if (!incoming || handledRef.current === incoming.nonce) return;
    handledRef.current = incoming.nonce;
    create(incoming.title, incoming.text);
  }, [incoming]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveDraft = (d: Draft) => {
    const now = new Date().toISOString();
    const title = d.title.trim() || "Untitled speech";
    if (d.id) {
      update((prev) => prev.map((s) => (s.id === d.id ? { ...s, title, text: d.text, updatedAt: now } : s)));
      setView({ kind: "rehearse", id: d.id });
    } else create(title, d.text);
  };

  const recordAttempt = (id: string, attempt: Attempt, level: LadderLevel) => {
    update((prev) => prev.map((s) => (s.id === id ? { ...s, level, attempts: [...s.attempts, attempt].slice(-50) } : s)));
  };

  if (view.kind === "edit") {
    return <SpeechEditor initial={view.draft} onCancel={() => setView(view.draft.id ? { kind: "rehearse", id: view.draft.id } : { kind: "library" })} onSave={saveDraft} speak={speak} stopSpeaking={stopSpeaking} />;
  }

  const active = view.kind === "rehearse" ? speeches.find((s) => s.id === view.id) : undefined;
  if (active) {
    return (
      <RehearsalRoom
        key={active.id}
        speech={active}
        camera={camera}
        speak={speak}
        stopSpeaking={stopSpeaking}
        onAttempt={(a, level) => recordAttempt(active.id, a, level)}
        onBack={() => setView({ kind: "library" })}
        onEdit={() => setView({ kind: "edit", draft: { id: active.id, title: active.title, text: active.text } })}
      />
    );
  }

  return (
    <SpeechLibrary
      speeches={speeches}
      onNew={(draft) => setView({ kind: "edit", draft })}
      onOpen={(id) => setView({ kind: "rehearse", id })}
      onDelete={(id) => update((prev) => prev.filter((s) => s.id !== id))}
    />
  );
}

function SpeechLibrary({
  speeches,
  onNew,
  onOpen,
  onDelete,
}: {
  speeches: SavedSpeech[];
  onNew: (d: Draft) => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState<string | null>(null);
  // Due speeches first: the schedule only works if the next rehearsal is the obvious one.
  const sorted = useMemo(
    () => [...speeches].sort((a, b) => Number(reviewLabel(b).due) - Number(reviewLabel(a).due) || b.updatedAt.localeCompare(a.updatedAt)),
    [speeches],
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <SectionLabel>Your speeches</SectionLabel>
          <button type="button" onClick={() => onNew({ id: null, title: "", text: "" })} className={primaryButton}>
            + New speech
          </button>
        </div>

        {sorted.length === 0 ? (
          <div className="rounded-xl border border-dashed border-graphite-700 p-8 text-center">
            <p className="font-serif text-2xl text-graphite-100">Nothing here yet</p>
            <p className="mt-2 text-sm text-graphite-400">Paste a speech you need to give, or start from one of the templates.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {sorted.map((s) => {
              const review = reviewLabel(s);
              const last = s.attempts.at(-1);
              return (
                <li key={s.id} className="rounded-xl border border-graphite-800 bg-graphite-950/70 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-serif text-2xl text-graphite-100">{s.title}</p>
                      <p className="mt-1 text-xs text-graphite-400">
                        {splitIntoBeats(s.text).length} sections · Step {s.level}: {ladder(s.level).name}
                        {last && <> · Last score {last.score}</>}
                      </p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] ${review.due ? "bg-gold-500/15 text-gold-300" : "bg-graphite-900 text-graphite-400"}`}>
                      {review.label}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button type="button" onClick={() => onOpen(s.id)} className="rounded-md bg-gold-500 px-4 py-2 text-sm font-semibold text-ink transition hover:bg-gold-400">
                      Rehearse
                    </button>
                    {confirming === s.id ? (
                      <>
                        <span className="text-sm text-graphite-400">Delete this speech?</span>
                        <button type="button" onClick={() => onDelete(s.id)} className="text-sm text-signal-red hover:underline">
                          Delete
                        </button>
                        <button type="button" onClick={() => setConfirming(null)} className="text-sm text-graphite-400 hover:underline">
                          Keep
                        </button>
                      </>
                    ) : (
                      <button type="button" onClick={() => setConfirming(s.id)} className="text-sm text-graphite-400 hover:text-signal-red">
                        Delete
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="rounded-xl border border-graphite-800 bg-graphite-950/60 p-5">
          <SectionLabel>Start from a template</SectionLabel>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {TEMPLATES.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => onNew({ id: null, title: t.title, text: t.text })}
                  className="h-full w-full rounded-lg border border-graphite-700 p-3 text-left transition hover:border-gold-600"
                >
                  <span className="block text-sm font-medium text-graphite-100">{t.title}</span>
                  <span className="block text-xs text-graphite-400">{t.when}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <aside className="h-fit space-y-4 rounded-xl border border-graphite-800 bg-navy-900/50 p-6">
        <SectionLabel tone="gold">If memorising is hard for you</SectionLabel>
        <p className="font-serif text-2xl leading-snug text-graphite-100">You don&apos;t need a better memory. You need a better method.</p>
        <ol className="space-y-3 text-sm leading-relaxed text-graphite-300">
          <li>
            <span className="font-semibold text-graphite-100">1. Small pieces.</span> Your speech is split into short sections. Learn one, then
            add the next.
          </li>
          <li>
            <span className="font-semibold text-graphite-100">2. Fade the words.</span> Full script → first letters → three key words → nothing.
            Pulling words from memory is what makes them stick; re-reading doesn&apos;t.
          </li>
          <li>
            <span className="font-semibold text-graphite-100">3. Say it, don&apos;t read it.</span> Every rep is out loud. Your mouth
            remembers what your eyes forget.
          </li>
          <li>
            <span className="font-semibold text-graphite-100">4. Space it out.</span> A short take tomorrow beats ten takes tonight. The list
            tells you when each speech is due.
          </li>
          <li>
            <span className="font-semibold text-graphite-100">5. Ideas, not sentences.</span> At step 3 you only need the idea of each section.
            If a word changes, that&apos;s fine. The audience never saw your script.
          </li>
        </ol>
      </aside>
    </div>
  );
}

function SpeechEditor({
  initial,
  onSave,
  onCancel,
  speak,
  stopSpeaking,
}: {
  initial: Draft;
  onSave: (d: Draft) => void;
  onCancel: () => void;
  speak: (text: string, rate?: number) => Promise<void>;
  stopSpeaking: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [playing, setPlaying] = useState(false);
  const beats = useMemo(() => splitIntoBeats(draft.text), [draft.text]);
  const placeholders = draft.text.match(/\[[^\]]+\]/g)?.length ?? 0;
  const words = draft.text.trim() ? draft.text.trim().split(/\s+/).length : 0;

  const listen = async () => {
    if (playing) return stopSpeaking();
    setPlaying(true);
    await speak(draft.text, 0.9);
    setPlaying(false);
  };

  return (
    <form
      className="grid gap-8 lg:grid-cols-[1.4fr_1fr]"
      onSubmit={(e) => {
        e.preventDefault();
        stopSpeaking();
        onSave(draft);
      }}
    >
      <div className="space-y-4">
        <input
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          placeholder="Speech title (e.g. Team offsite opening)"
          className="w-full border-b border-graphite-700 bg-transparent pb-2 font-serif text-4xl text-graphite-100 placeholder:text-graphite-600 focus:border-gold-600 focus:outline-none"
        />
        <textarea
          rows={16}
          value={draft.text}
          onChange={(e) => setDraft({ ...draft, text: e.target.value })}
          placeholder={"Paste or write your speech here.\n\nLeave a blank line between sections: each section becomes one piece you learn at a time."}
          className="w-full resize-y rounded-xl border border-graphite-700 bg-graphite-950 p-5 text-lg leading-relaxed text-graphite-100 placeholder:text-graphite-600 focus:border-gold-600 focus:outline-none"
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-graphite-400">
            {words} words · about {Math.max(1, Math.round(words / 140))} min spoken · {beats.length} section{beats.length === 1 ? "" : "s"}
          </p>
          <div className="flex gap-3">
            <button type="button" onClick={onCancel} className={secondaryButton}>
              Cancel
            </button>
            <button type="button" onClick={() => void listen()} disabled={!words} className={secondaryButton}>
              {playing ? "■ Stop" : "▶ Listen"}
            </button>
            <button type="submit" disabled={!words} className={primaryButton}>
              Save &amp; rehearse
            </button>
          </div>
        </div>
      </div>

      <aside className="space-y-4">
        {placeholders > 0 && (
          <div className="rounded-lg border border-signal-amber/40 bg-signal-amber/10 p-4 text-sm text-signal-amber">
            Replace the {placeholders} [bracketed] part{placeholders === 1 ? "" : "s"} with your own words. A speech in your own words is far
            easier to remember than one borrowed.
          </div>
        )}
        <div className="rounded-xl border border-graphite-800 bg-graphite-950/60 p-5">
          <SectionLabel>How it will be split</SectionLabel>
          {beats.length === 0 ? (
            <p className="mt-3 text-sm text-graphite-400">Sections and their key words will appear here as you write.</p>
          ) : (
            <ol className="mt-3 space-y-3">
              {beats.map((b, i) => (
                <li key={b.id} className="text-sm">
                  <span className="text-xs text-graphite-400">Section {i + 1}</span>
                  <p className="text-graphite-300">{b.opening}</p>
                  <p className="mt-1 flex flex-wrap gap-1.5">
                    {b.anchors.map((a) => (
                      <span key={a} className="rounded border border-gold-500/40 bg-gold-500/10 px-1.5 py-0.5 text-xs text-gold-300">
                        {a}
                      </span>
                    ))}
                  </p>
                </li>
              ))}
            </ol>
          )}
          <p className="mt-4 text-xs text-graphite-400">
            Tips: short sentences are easier to remember and easier to say. Aim for 2–3 sentences per section, and one idea each.
          </p>
        </div>
      </aside>
    </form>
  );
}
