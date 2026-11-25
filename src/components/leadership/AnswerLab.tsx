"use client";

import { useState } from "react";
import { Chip, primaryButton, secondaryButton, SectionLabel } from "@/components/stage/shared";
import type { Camera } from "@/hooks/useCamera";
import {
  type AnswerCard,
  allCards,
  blankCard,
  type Category,
  draftToCard,
  offlineTopicDraft,
  type TopicDraft,
  CATEGORY_LABEL,
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
  /** Which kinds of card this lab shows (interview questions, or leadership talks). */
  categories: Category[];
  intro: React.ReactNode;
  /** Open the editor with this draft (e.g. preparing an answer for a CV line). */
  initialEdit?: AnswerCard | null;
}

const FILTER_LABEL: Record<string, string> = { All: "All", ...CATEGORY_LABEL };

export function AnswerLab({ state, update, camera, speak, stopSpeaking, openId, categories, intro, initialEdit }: Props) {
  const FILTERS: ("All" | Category)[] = ["All", ...categories];
  const talk = categories.includes("Craft");
  const [activeId, setActiveId] = useState<string | null>(openId ?? null);
  const [editing, setEditing] = useState<AnswerCard | null>(initialEdit ?? null);
  const [importing, setImporting] = useState(false);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const all = allCards(state).filter((c) => categories.includes(c.category));
  const cards = filter === "All" ? all : all.filter((c) => c.category === filter);
  const active = all.find((c) => c.id === activeId);

  if (importing) {
    return (
      <TopicImporter
        onCancel={() => setImporting(false)}
        onDraft={(c) => {
          setImporting(false);
          setEditing(c);
        }}
      />
    );
  }

  if (editing) {
    return (
      <CardEditor
        card={editing}
        categories={categories}
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
        <div className="max-w-2xl text-sm leading-relaxed text-graphite-300">{intro}</div>
        <div className="flex flex-wrap gap-2">
          {talk && (
            <button type="button" onClick={() => setImporting(true)} className={secondaryButton}>
              + Paste a topic
            </button>
          )}
          {talk && all.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveId(all[Math.floor(Math.random() * all.length)].id)}
              className={secondaryButton}
            >
              🎲 Speak on anything
            </button>
          )}
          <button type="button" onClick={() => setEditing({ ...blankCard(), category: categories[0] })} className={secondaryButton}>
            {talk ? "+ Add a leadership topic" : "+ Add a question"}
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>
            {FILTER_LABEL[f]} <span className="text-graphite-400">{f === "All" ? all.length : all.filter((c) => c.category === f).length}</span>
          </Chip>
        ))}
      </div>
      <ul className="grid gap-3 md:grid-cols-2">
        {cards.map((c) => {
          const p = progressOf(state, c.id);
          const due = dueLabel(p);
          return (
            <li key={c.id} className="flex flex-col rounded-xl border border-graphite-800 bg-graphite-950/60 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-graphite-400">{FILTER_LABEL[c.category]}</span>
                  <h3 className="font-serif text-2xl text-graphite-100">{c.topic}</h3>
                </div>
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
  categories,
  isDefault,
  overridden,
  onSave,
  onCancel,
  onDelete,
}: {
  card: AnswerCard;
  categories: Category[];
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
      <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
        <label className="block space-y-1 text-sm text-graphite-300">
          Short name
          <input className={input} value={c.topic} onChange={(e) => setC({ ...c, topic: e.target.value })} placeholder="e.g. Handling conflict" />
        </label>
        <label className="block space-y-1 text-sm text-graphite-300">
          Type
          <select className={input} value={c.category} onChange={(e) => setC({ ...c, category: e.target.value as Category })}>
            {categories.map((k) => (
              <option key={k} value={k}>
                {FILTER_LABEL[k]}
              </option>
            ))}
          </select>
        </label>
      </div>
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
      {c.category === "Topic" && (
        <label className="block space-y-1 text-sm text-graphite-300">
          Original text (to re-read before practising)
          <textarea rows={6} className={input} value={c.source ?? ""} onChange={(e) => setC({ ...c, source: e.target.value })} />
        </label>
      )}
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

function TopicImporter({ onDraft, onCancel }: { onDraft: (c: AnswerCard) => void; onCancel: () => void }) {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  const build = async () => {
    const name = title.trim() || text.trim().split(/\s+/).slice(0, 5).join(" ");
    setBusy(true);
    let draft: TopicDraft;
    try {
      const res = await fetch("/api/leadership/topic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: name, text }),
      });
      if (!res.ok) throw new Error(String(res.status));
      draft = (await res.json()) as TopicDraft;
    } catch {
      draft = offlineTopicDraft(name, text);
    }
    setBusy(false);
    onDraft(draftToCard(name, text.trim(), draft));
  };

  return (
    <div className="space-y-5">
      <div className="max-w-2xl space-y-2">
        <SectionLabel tone="gold">Add a topic to practise</SectionLabel>
        <p className="text-sm leading-relaxed text-graphite-300">
          Paste an article, a book passage, meeting notes, or a technical concept you want to explain well. It becomes three key ideas with a
          cheat code, so you can retell it out loud from memory. You can edit everything before saving.
        </p>
      </div>
      <label className="block space-y-1 text-sm text-graphite-300">
        Title
        <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Winning starts here, Kubernetes basics, Q3 strategy" />
      </label>
      <label className="block space-y-1 text-sm text-graphite-300">
        Text <span className="text-graphite-400">· {words} words</span>
        <textarea rows={12} className={input} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste the text here…" />
      </label>
      <div className="flex justify-end gap-3">
        <button type="button" onClick={onCancel} className={secondaryButton}>
          Cancel
        </button>
        <button type="button" disabled={words < 30 || busy} onClick={() => void build()} className={primaryButton}>
          {busy ? "Finding the three key ideas…" : "Build my cheat code →"}
        </button>
      </div>
      {words > 0 && words < 30 && <p className="text-right text-xs text-graphite-400">Paste at least 30 words.</p>}
    </div>
  );
}
