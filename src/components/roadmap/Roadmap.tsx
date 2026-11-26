"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SectionLabel } from "@/components/stage/shared";
import { type CareerLevel, LEVELS, levelFromRole, MASTERY, type Stage, stageOfCard, type Track, type TrackId, TRACKS } from "@/lib/curriculum";
import { type AnswerCard, allCards, cheatCode, emptyState, type LeadershipState, libraryCard, loadState, progressOf, saveState } from "@/lib/leadership";
import { useProfile } from "@/lib/profile";

/** Practice tools that serve a stage even before authored content exists. */
const TOOLS: Record<string, { label: string; href: string }[]> = {
  "int-cv": [{ label: "Import your CV and generate questions", href: "/leadership?tab=cv" }],
  "int-foundations": [{ label: "Mock interview", href: "/interview" }],
  "spk-delivery": [{ label: "Speech rehearsal with live pace & filler meter", href: "/stage" }],
  "spk-structure": [{ label: "Rule-of-three sprint", href: "/leadership?tab=mind" }],
  "spk-impromptu": [{ label: "Impromptu drill", href: "/stage" }],
  "com-vocabulary": [{ label: "Hedged-to-executive drills", href: "/vocabulary" }],
};

type Status = "mastered" | "progress" | "next" | "todo" | "empty" | "below";

interface StageView {
  stage: Stage;
  items: AnswerCard[];
  mastered: number;
  practised: number;
  status: Status;
}

function practiseHref(c: AnswerCard) {
  const tab = c.category === "Library" ? "library" : c.category === "Craft" || c.category === "Topic" ? "craft" : "lab";
  return `/leadership?tab=${tab}&open=${encodeURIComponent(c.id)}`;
}

function buildTrack(track: Track, cards: AnswerCard[], state: LeadershipState, level: CareerLevel | null): StageView[] {
  const startAt = track.id === "leadership" && level ? Math.max(0, track.stages.findIndex((s) => s.level === level)) : 0;
  const views = track.stages.map((stage, i): StageView => {
    const items = cards.filter((c) => stageOfCard(c) === stage.id);
    const mastered = items.filter((c) => progressOf(state, c.id).box >= MASTERY.box).length;
    const practised = items.filter((c) => progressOf(state, c.id).takes > 0).length;
    const done = items.length > 0 && mastered / items.length >= MASTERY.share;
    const status: Status = done ? "mastered" : i < startAt ? "below" : !items.length && !TOOLS[stage.id] ? "empty" : practised ? "progress" : "todo";
    return { stage, items, mastered, practised, status };
  });
  const next = views.findIndex((v, i) => i >= startAt && (v.status === "progress" || v.status === "todo"));
  if (next >= 0) views[next].status = "next";
  return views;
}

export function Roadmap() {
  const [state, setState] = useState<LeadershipState>(emptyState);
  const [loaded, setLoaded] = useState(false);
  const [track, setTrack] = useState<TrackId>("interview");
  const [open, setOpen] = useState<string | null>(null);
  const profile = useProfile();
  const level = levelFromRole(profile.role);

  useEffect(() => {
    const s = loadState();
    setState(s);
    setLoaded(true);
    const t = new URLSearchParams(window.location.search).get("track") as TrackId | null;
    if (t && TRACKS.some((x) => x.id === t)) setTrack(t);
    fetch("/api/content")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { topics?: Parameters<typeof libraryCard>[0][] } | null) => {
        if (!d?.topics) return;
        setState((prev) => {
          const next = { ...prev, library: d.topics!.map(libraryCard) };
          saveState(next);
          return next;
        });
      })
      .catch(() => {});
  }, []);

  const cards = useMemo(() => allCards(state), [state]);
  const views = useMemo(() => Object.fromEntries(TRACKS.map((t) => [t.id, buildTrack(t, cards, state, level)])) as Record<TrackId, StageView[]>, [cards, state, level]);
  const t = TRACKS.find((x) => x.id === track)!;
  const nextSteps = TRACKS.map((tr) => ({ track: tr, view: views[tr.id].find((v) => v.status === "next") })).filter((x) => x.view);

  return (
    <div className="space-y-10">
      <div className="max-w-3xl space-y-3">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-gold-500">Your roadmap</p>
        <h1 className="font-serif text-5xl leading-tight">One stage at a time</h1>
        <p className="leading-relaxed text-graphite-300">
          Five tracks take you from your first answer to the boardroom. Each stage has a clear goal; master most of its items (recalled from memory on two separate
          days) and the next stage lights up.
          {level ? (
            <>
              {" "}
              Your Leadership Ladder starts at <span className="text-gold-300">{LEVELS.find((l) => l.id === level)?.short}</span>, from your profile.
            </>
          ) : (
            <> Add your role in Your profile and the Leadership Ladder starts at your level.</>
          )}
        </p>
      </div>

      {loaded && nextSteps.length > 0 && (
        <section className="space-y-3">
          <SectionLabel tone="gold">Your next steps</SectionLabel>
          <div className="grid gap-3 md:grid-cols-3">
            {nextSteps.slice(0, 3).map(({ track: tr, view }) => {
              const first = view!.items.find((c) => progressOf(state, c.id).box < MASTERY.box);
              const tool = TOOLS[view!.stage.id]?.[0];
              return (
                <div key={tr.id} className="flex flex-col rounded-xl border border-gold-600/40 bg-gradient-to-b from-navy-900/70 to-graphite-950 p-5">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-graphite-400">{tr.name}</p>
                  <p className="mt-1 font-serif text-2xl text-graphite-100">{view!.stage.name}</p>
                  <p className="mt-1 text-sm text-graphite-300">{view!.stage.goal}</p>
                  <div className="mt-auto pt-4">
                    {first ? (
                      <Link href={practiseHref(first)} className="text-sm font-semibold text-gold-400 underline-offset-4 hover:underline">
                        Practise “{first.topic}” →
                      </Link>
                    ) : tool ? (
                      <Link href={tool.href} className="text-sm font-semibold text-gold-400 underline-offset-4 hover:underline">
                        {tool.label} →
                      </Link>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div role="tablist" className="flex gap-2 overflow-x-auto pb-1">
        {TRACKS.map((x) => {
          const v = views[x.id];
          const done = v.filter((s) => s.status === "mastered").length;
          return (
            <button
              key={x.id}
              role="tab"
              type="button"
              aria-selected={track === x.id}
              onClick={() => {
                setTrack(x.id);
                setOpen(null);
              }}
              className={`min-w-[170px] flex-1 rounded-xl border p-3 text-left transition ${track === x.id ? "border-gold-500 bg-gold-500/10" : "border-graphite-800 bg-graphite-950/60 hover:border-graphite-600"}`}
            >
              <span className={`block font-serif text-lg ${track === x.id ? "text-gold-300" : "text-graphite-100"}`}>{x.name}</span>
              <span className="block text-xs text-graphite-400">
                {done}/{x.stages.length} stages mastered
              </span>
            </button>
          );
        })}
      </div>

      <section className="space-y-4">
        <p className="text-graphite-300">{t.tagline}</p>
        <ol className="relative space-y-3 border-l-2 border-graphite-800 pl-6">
          {views[track].map((v) => (
            <StageRow key={v.stage.id} v={v} state={state} open={open === v.stage.id} onToggle={() => setOpen(open === v.stage.id ? null : v.stage.id)} />
          ))}
        </ol>
      </section>
    </div>
  );
}

const STATUS: Record<Status, { label: string; dot: string; text: string }> = {
  mastered: { label: "Mastered", dot: "bg-signal-green border-signal-green", text: "text-signal-green" },
  progress: { label: "In progress", dot: "bg-gold-500 border-gold-500", text: "text-gold-400" },
  next: { label: "Next up", dot: "bg-gold-500 border-gold-300 ring-4 ring-gold-500/20", text: "text-gold-300" },
  todo: { label: "Ready", dot: "bg-graphite-950 border-graphite-600", text: "text-graphite-400" },
  empty: { label: "Content coming soon", dot: "bg-graphite-950 border-graphite-700 border-dashed", text: "text-graphite-600" },
  below: { label: "Below your level: optional review", dot: "bg-graphite-800 border-graphite-700", text: "text-graphite-400" },
};

function StageRow({ v, state, open, onToggle }: { v: StageView; state: LeadershipState; open: boolean; onToggle: () => void }) {
  const s = STATUS[v.status];
  const tools = TOOLS[v.stage.id] ?? [];
  const pct = v.items.length ? (v.mastered / v.items.length) * 100 : 0;
  return (
    <li className="relative">
      <span className={`absolute -left-[33px] top-5 size-4 rounded-full border-2 ${s.dot}`} aria-hidden />
      <div className={`rounded-xl border p-4 transition ${v.status === "next" ? "border-gold-500 bg-gold-500/5" : "border-graphite-800 bg-graphite-950/60"}`}>
        <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full flex-wrap items-start justify-between gap-3 text-left">
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-baseline gap-x-3">
              <span className="font-serif text-2xl text-graphite-100">{v.stage.name}</span>
              <span className={`text-[10px] uppercase tracking-widest ${s.text}`}>{s.label}</span>
            </span>
            <span className="block text-sm text-graphite-300">{v.stage.goal}</span>
          </span>
          <span className="w-40 shrink-0 text-right">
            <span className="block text-xs tabular-nums text-graphite-400">
              {v.items.length ? `${v.mastered}/${v.items.length} mastered` : v.stage.personal ? "from your CV" : "—"}
            </span>
            {v.items.length > 0 && (
              <span className="mt-1 block h-1.5 rounded-full bg-graphite-800">
                <span className="block h-1.5 rounded-full bg-gold-500" style={{ width: `${pct}%` }} />
              </span>
            )}
          </span>
        </button>

        {open && (
          <div className="animate-reveal mt-4 space-y-3 border-t border-graphite-800 pt-4">
            <p className="text-xs text-graphite-400">
              <span className="text-graphite-300">Covers:</span> {v.stage.covers.join(" · ")}
            </p>
            {tools.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tools.map((tl) => (
                  <Link key={tl.href + tl.label} href={tl.href} className="rounded-md border border-gold-600/50 px-3 py-1.5 text-sm text-gold-300 hover:bg-gold-500/10">
                    {tl.label} →
                  </Link>
                ))}
              </div>
            )}
            {v.items.length > 0 ? (
              <ul className="grid gap-2 md:grid-cols-2">
                {v.items.map((c) => {
                  const p = progressOf(state, c.id);
                  const done = p.box >= MASTERY.box;
                  return (
                    <li key={c.id}>
                      <Link href={practiseHref(c)} className="group flex items-start justify-between gap-3 rounded-lg border border-graphite-800 p-3 hover:border-gold-500">
                        <span className="min-w-0">
                          <span className="block text-sm text-graphite-100 group-hover:text-gold-300">{c.topic}</span>
                          <span className="block truncate text-xs text-gold-400">{cheatCode(c)}</span>
                        </span>
                        <span className={`shrink-0 text-[10px] uppercase tracking-widest ${done ? "text-signal-green" : p.takes ? "text-gold-400" : "text-graphite-400"}`}>
                          {done ? "✓ mastered" : p.takes ? `${p.takes} take${p.takes > 1 ? "s" : ""}` : "new"}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              !tools.length && <p className="text-sm text-graphite-400">Content for this stage is being prepared.</p>
            )}
          </div>
        )}
      </div>
    </li>
  );
}
