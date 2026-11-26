"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Chip, primaryButton, secondaryButton, SectionLabel } from "@/components/stage/shared";
import type { LibraryTopic } from "@/lib/content-store";
import { type CareerLevel, LEVELS, stageById, type TrackId, TRACKS } from "@/lib/curriculum";

const input =
  "w-full rounded-md border border-graphite-700 bg-graphite-950 px-3 py-2 text-sm text-graphite-100 placeholder:text-graphite-600 focus:border-gold-600 focus:outline-none";

type Draft = Omit<LibraryTopic, "id" | "createdAt" | "updatedAt"> & { id?: string };

const LICENSES: { id: LibraryTopic["license"]; name: string }[] = [
  { id: "original", name: "Original (written by us)" },
  { id: "licensed", name: "Licensed / permission granted" },
  { id: "public-domain", name: "Public domain" },
  { id: "cc", name: "Creative Commons" },
  { id: "unknown", name: "Unknown: not for commercial launch" },
];

function emptyDraft(stageId: string): Draft {
  const stage = stageById(stageId)!;
  return {
    track: stage.track,
    stage: stage.id,
    kind: stage.kind,
    question: "",
    levels: stage.level ? [stage.level] : [],
    difficulty: 1,
    sourceName: "",
    sourceUrl: "",
    license: "original",
    section: stage.name,
    title: "",
    text: "",
    opening: "",
    pillars: [0, 1, 2].map(() => ({ key: "", tag: "", text: "" })),
    close: "",
    published: true,
  };
}

interface Session {
  admin: boolean;
  passwordSet: boolean;
  store: boolean;
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data;
}

export function AdminConsole() {
  const [session, setSession] = useState<Session | null>(null);
  const [topics, setTopics] = useState<LibraryTopic[]>([]);
  const [track, setTrack] = useState<TrackId>("interview");
  const [stage, setStage] = useState<string>("all");
  const [editing, setEditing] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await api<{ topics: LibraryTopic[] }>("/api/admin/topics");
      setTopics(d.topics);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void api<Session>("/api/admin/session").then((s) => {
      setSession(s);
      if (s.admin) void load();
    });
  }, [load]);

  const t = TRACKS.find((x) => x.id === track)!;
  const inTrack = useMemo(() => topics.filter((x) => x.track === track), [topics, track]);
  const shown = stage === "all" ? inTrack : inTrack.filter((x) => x.stage === stage);

  if (!session) return <p className="text-graphite-400">Loading…</p>;
  if (!session.passwordSet || !session.store) return <SetupNeeded session={session} />;
  if (!session.admin)
    return (
      <Login
        onDone={() => {
          setSession({ ...session, admin: true });
          void load();
        }}
      />
    );

  if (editing)
    return (
      <ItemEditor
        draft={editing}
        onCancel={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          void load();
        }}
      />
    );

  return (
    <div className="space-y-8">
      <Header
        onLogout={async () => {
          await api("/api/admin/session", { method: "DELETE" });
          setSession({ ...session, admin: false });
        }}
      />
      {error && <p className="rounded-md border border-signal-amber/40 bg-signal-amber/10 px-4 py-3 text-sm text-signal-amber">{error}</p>}

      <div role="tablist" className="flex gap-2 overflow-x-auto pb-1">
        {TRACKS.map((x) => (
          <button
            key={x.id}
            role="tab"
            type="button"
            aria-selected={track === x.id}
            onClick={() => {
              setTrack(x.id);
              setStage("all");
            }}
            className={`min-w-[170px] flex-1 rounded-xl border p-3 text-left transition ${track === x.id ? "border-gold-500 bg-gold-500/10" : "border-graphite-800 bg-graphite-950/60 hover:border-graphite-600"}`}
          >
            <span className={`block font-serif text-lg ${track === x.id ? "text-gold-300" : "text-graphite-100"}`}>{x.name}</span>
            <span className="block text-xs text-graphite-400">{topics.filter((y) => y.track === x.id).length} items</span>
          </button>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <Chip active={stage === "all"} onClick={() => setStage("all")}>
                All stages <span className="text-graphite-400">· {inTrack.length}</span>
              </Chip>
              {t.stages.map((s) => (
                <Chip key={s.id} active={stage === s.id} onClick={() => setStage(s.id)}>
                  {s.name} <span className="text-graphite-400">· {inTrack.filter((x) => x.stage === s.id).length}</span>
                </Chip>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEditing(emptyDraft(stage !== "all" ? stage : t.stages.find((s) => !s.personal)!.id))}
            className={primaryButton}
          >
            + New item in {stage !== "all" ? stageById(stage)?.name : t.name}
          </button>

          {shown.length ? (
            <ul className="divide-y divide-graphite-800 rounded-xl border border-graphite-800 bg-graphite-950/60">
              {shown.map((x) => (
                <ItemRow
                  key={x.id}
                  item={x}
                  onEdit={() => setEditing(x)}
                  onToggle={async () => {
                    await api("/api/admin/topics", { method: "PUT", body: JSON.stringify({ ...x, published: !x.published }) });
                    void load();
                  }}
                  onDelete={async () => {
                    await api(`/api/admin/topics?id=${encodeURIComponent(x.id)}`, { method: "DELETE" });
                    void load();
                  }}
                />
              ))}
            </ul>
          ) : (
            <div className="rounded-xl border border-dashed border-graphite-700 p-8 text-sm text-graphite-400">
              {stage !== "all" && stageById(stage)?.personal ? (
                "This stage is personal: each learner's questions are generated from their own CV and job description, so there's nothing to author here."
              ) : (
                <>
                  Nothing here yet.{" "}
                  {stage !== "all" && (
                    <>
                      This stage should cover: <span className="text-graphite-200">{stageById(stage)?.covers.join(" · ")}</span>.
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </section>

        <Coverage track={t} topics={topics} onPick={setStage} />
      </div>
    </div>
  );
}

/** Content coverage per stage: where the library is thin and needs sourcing. */
function Coverage({ track, topics, onPick }: { track: (typeof TRACKS)[number]; topics: LibraryTopic[]; onPick: (s: string) => void }) {
  const TARGET = 6;
  return (
    <aside className="h-fit space-y-3 rounded-xl border border-graphite-800 bg-navy-900/50 p-5">
      <SectionLabel tone="gold">Content coverage</SectionLabel>
      <p className="text-xs text-graphite-400">Aim for {TARGET}+ published items per stage. Built-in starter cards in the app also count for learners.</p>
      <ul className="space-y-2.5">
        {track.stages.map((s) => {
          const n = topics.filter((x) => x.stage === s.id && x.published).length;
          return (
            <li key={s.id}>
              <button type="button" onClick={() => onPick(s.id)} className="group w-full text-left">
                <span className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="text-graphite-100 group-hover:text-gold-300">{s.name}</span>
                  <span className={`tabular-nums text-xs ${s.personal ? "text-graphite-400" : n >= TARGET ? "text-signal-green" : n ? "text-gold-400" : "text-signal-amber"}`}>
                    {s.personal ? "per learner" : `${n}/${TARGET}`}
                  </span>
                </span>
                {!s.personal && (
                  <span className="mt-1 block h-1 rounded-full bg-graphite-800">
                    <span className="block h-1 rounded-full bg-gold-500" style={{ width: `${Math.min(100, (n / TARGET) * 100)}%` }} />
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

function Header({ onLogout }: { onLogout?: () => void }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-gold-500">Admin · Content library</p>
        <h1 className="font-serif text-5xl leading-tight">Curriculum content</h1>
        <p className="text-graphite-300">
          Every item belongs to a track and a stage on the learner&apos;s roadmap. Published items appear on the Roadmap and in practice on every device.
        </p>
      </div>
      {onLogout && (
        <button type="button" onClick={onLogout} className="text-sm text-graphite-400 underline-offset-4 hover:underline">
          Log out
        </button>
      )}
    </div>
  );
}

function SetupNeeded({ session }: { session: Session }) {
  return (
    <div className="max-w-xl space-y-4">
      <Header />
      <div className="rounded-xl border border-signal-amber/40 bg-signal-amber/10 p-5 text-sm text-graphite-200">
        <p className="font-medium">Almost ready. The server still needs:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {!session.store && <li>The content database (Upstash Redis) connected to this project.</li>}
          {!session.passwordSet && <li>An admin password: the ADMIN_PASSWORD environment variable.</li>}
        </ul>
      </div>
    </div>
  );
}

function Login({ onDone }: { onDone: () => void }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="mx-auto max-w-sm space-y-6 pt-6">
      <div className="space-y-2 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-gold-500">Admin</p>
        <h1 className="font-serif text-4xl">Content library</h1>
      </div>
      <form
        className="space-y-3 rounded-xl border border-graphite-800 bg-graphite-950/70 p-6"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            await api("/api/admin/session", { method: "POST", body: JSON.stringify({ password: pw }) });
            onDone();
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="block space-y-1 text-sm text-graphite-300">
          Admin password
          <input type="password" autoFocus autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} className={input} />
        </label>
        {error && <p className="text-sm text-signal-amber">{error}</p>}
        <button type="submit" disabled={!pw || busy} className={`${primaryButton} w-full`}>
          {busy ? "Checking…" : "Log in"}
        </button>
      </form>
    </div>
  );
}

function ItemRow({ item: t, onEdit, onToggle, onDelete }: { item: LibraryTopic; onEdit: () => void; onToggle: () => void; onDelete: () => void }) {
  const [confirm, setConfirm] = useState(false);
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 p-4">
      <button type="button" onClick={onEdit} className="group min-w-0 flex-1 text-left">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-serif text-xl text-graphite-100 group-hover:text-gold-300">{t.title}</span>
          <Badge tone={t.published ? "good" : "muted"}>{t.published ? "Published" : "Draft"}</Badge>
          <Badge tone="muted">{t.kind === "question" ? "Interview question" : "Talk"}</Badge>
          {t.license === "unknown" && <Badge tone="warn">Source licence unknown</Badge>}
        </span>
        <span className="block text-xs text-graphite-400">
          {stageById(t.stage)?.name} · {"●".repeat(t.difficulty)}
          {"○".repeat(3 - t.difficulty)}
          {t.levels.length > 0 && ` · ${t.levels.map((l) => LEVELS.find((x) => x.id === l)?.short).join(", ")}`} ·{" "}
          <span className="text-gold-400">{t.pillars.map((p) => p.key).join(" | ")}</span>
        </span>
      </button>
      <span className="flex items-center gap-2 text-xs">
        <button type="button" onClick={onToggle} className="rounded-md border border-graphite-700 px-2.5 py-1 hover:border-gold-500">
          {t.published ? "Unpublish" : "Publish"}
        </button>
        <button type="button" onClick={onEdit} className="rounded-md border border-graphite-700 px-2.5 py-1 hover:border-gold-500">
          Edit
        </button>
        {confirm ? (
          <>
            <button type="button" onClick={onDelete} className="rounded-md border border-signal-red/60 px-2.5 py-1 text-signal-red">
              Delete
            </button>
            <button type="button" onClick={() => setConfirm(false)} className="px-1 text-graphite-400">
              Keep
            </button>
          </>
        ) : (
          <button type="button" onClick={() => setConfirm(true)} className="px-1 text-graphite-400 hover:text-signal-red">
            Delete
          </button>
        )}
      </span>
    </li>
  );
}

function Badge({ tone, children }: { tone: "good" | "warn" | "muted"; children: React.ReactNode }) {
  const c = tone === "good" ? "bg-signal-green/15 text-signal-green" : tone === "warn" ? "bg-signal-amber/15 text-signal-amber" : "bg-graphite-800 text-graphite-400";
  return <span className={`rounded px-1.5 py-0.5 text-[10px] uppercase tracking-widest ${c}`}>{children}</span>;
}

function ItemEditor({ draft, onCancel, onSaved }: { draft: Draft; onCancel: () => void; onSaved: () => void }) {
  const [d, setD] = useState<Draft>(draft);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const setPillar = (i: number, k: "key" | "tag" | "text", v: string) => setD((x) => ({ ...x, pillars: x.pillars.map((p, j) => (j === i ? { ...p, [k]: v } : p)) }));
  const track = TRACKS.find((t) => t.id === d.track) ?? TRACKS[0];
  const hasCard = d.pillars.some((p) => p.key || p.text);
  const canDraft = d.text.trim() || (d.kind === "question" ? d.question.trim() : d.title.trim());

  const generate = async () => {
    setBusy("draft");
    setError(null);
    try {
      // A pasted passage is summarised faithfully; otherwise a model answer is drafted from the question/title.
      const g = d.text.trim()
        ? await api<{ opening: string; pillars: Draft["pillars"]; close: string; source: string }>("/api/leadership/topic", {
            method: "POST",
            body: JSON.stringify({ title: d.title || "Topic", text: d.text }),
          })
        : await api<{ opening: string; pillars: Draft["pillars"]; close: string; source: string }>("/api/admin/draft", {
            method: "POST",
            body: JSON.stringify({ prompt: d.kind === "question" ? d.question : d.title, stage: d.stage, kind: d.kind, levels: d.levels }),
          });
      setD((x) => ({ ...x, opening: g.opening, pillars: g.pillars, close: g.close }));
      if (g.source === "offline") setError("The AI coach isn't available, so this is a skeleton to fill in by hand.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const save = async () => {
    setBusy("save");
    setError(null);
    try {
      await api("/api/admin/topics", { method: d.id ? "PUT" : "POST", body: JSON.stringify(d) });
      onSaved();
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  };

  const toggleLevel = (l: CareerLevel) => set("levels", d.levels.includes(l) ? d.levels.filter((x) => x !== l) : [...d.levels, l]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-4xl">{d.id ? "Edit item" : "New item"}</h1>
        <button type="button" onClick={onCancel} className={secondaryButton}>
          ← Back to library
        </button>
      </div>

      <section className="grid gap-4 rounded-xl border border-graphite-800 bg-graphite-950/60 p-5 md:grid-cols-4">
        <label className="block space-y-1 text-sm text-graphite-300">
          Track
          <select
            value={d.track}
            onChange={(e) => {
              const nt = TRACKS.find((t) => t.id === e.target.value)!;
              const st = nt.stages.find((s) => !s.personal)!;
              setD((x) => ({ ...x, track: nt.id, stage: st.id, kind: st.kind, levels: st.level ? [st.level] : x.levels }));
            }}
            className={input}
          >
            {TRACKS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1 text-sm text-graphite-300">
          Stage
          <select
            value={d.stage}
            onChange={(e) => {
              const st = stageById(e.target.value)!;
              setD((x) => ({ ...x, stage: st.id, kind: st.kind, levels: st.level ? [st.level] : x.levels }));
            }}
            className={input}
          >
            {track.stages
              .filter((s) => !s.personal)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </select>
        </label>
        <label className="block space-y-1 text-sm text-graphite-300">
          Type
          <select value={d.kind} onChange={(e) => set("kind", e.target.value as Draft["kind"])} className={input}>
            <option value="question">Interview question</option>
            <option value="talk">Talk / speak on a topic</option>
          </select>
        </label>
        <label className="block space-y-1 text-sm text-graphite-300">
          Difficulty
          <select value={d.difficulty} onChange={(e) => set("difficulty", Number(e.target.value) as Draft["difficulty"])} className={input}>
            <option value={1}>● Foundation</option>
            <option value={2}>●● Intermediate</option>
            <option value={3}>●●● Advanced</option>
          </select>
        </label>
        <div className="space-y-1 text-sm text-graphite-300 md:col-span-4">
          Suits leadership levels <span className="text-xs text-graphite-400">(none selected = every level)</span>
          <div className="flex flex-wrap gap-2">
            {LEVELS.map((l) => (
              <Chip key={l.id} active={d.levels.includes(l.id)} onClick={() => toggleLevel(l.id)}>
                {l.short}
              </Chip>
            ))}
          </div>
        </div>
        <p className="text-xs text-graphite-400 md:col-span-4">
          <span className="text-graphite-300">This stage covers:</span> {stageById(d.stage)?.covers.join(" · ")}
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4 rounded-xl border border-graphite-800 bg-graphite-950/60 p-5">
          <SectionLabel>1 · Content</SectionLabel>
          <label className="block space-y-1 text-sm text-graphite-300">
            Title (short name in lists)
            <input value={d.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Handling a conflict with a peer" className={input} />
          </label>
          {d.kind === "question" && (
            <label className="block space-y-1 text-sm text-graphite-300">
              Interview question
              <input value={d.question} onChange={(e) => set("question", e.target.value)} placeholder="e.g. Tell me about a time you disagreed with a peer." className={input} />
            </label>
          )}
          <label className="block space-y-1 text-sm text-graphite-300">
            Source passage <span className="text-xs text-graphite-400">(optional: paste an article to summarise; leave empty to draft a model answer)</span>
            <textarea rows={8} value={d.text} onChange={(e) => set("text", e.target.value)} className={`${input} resize-y leading-relaxed`} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1 text-sm text-graphite-300">
              Source name
              <input value={d.sourceName} onChange={(e) => set("sourceName", e.target.value)} placeholder="Author, book, site" className={input} />
            </label>
            <label className="block space-y-1 text-sm text-graphite-300">
              Source link
              <input value={d.sourceUrl} onChange={(e) => set("sourceUrl", e.target.value)} placeholder="https://…" className={input} />
            </label>
          </div>
          <label className="block space-y-1 text-sm text-graphite-300">
            Licence
            <select value={d.license} onChange={(e) => set("license", e.target.value as Draft["license"])} className={input}>
              {LICENSES.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
          <button type="button" disabled={!canDraft || !!busy} onClick={() => void generate()} className={`${primaryButton} w-full`}>
            {busy === "draft" ? "Drafting…" : hasCard ? "Regenerate the answer" : d.text.trim() ? "Summarise into a cheat code" : "Draft a model answer"}
          </button>
        </section>

        <section className="space-y-4 rounded-xl border border-graphite-800 bg-graphite-950/60 p-5">
          <SectionLabel tone="gold">2 · Model answer: opening, three pillars, landing line</SectionLabel>
          <label className="block space-y-1 text-sm text-graphite-300">
            Opening line
            <input value={d.opening} onChange={(e) => set("opening", e.target.value)} className={input} />
          </label>
          {d.pillars.map((p, i) => (
            <div key={i} className="space-y-2 rounded-lg border border-graphite-800 p-3">
              <div className="grid gap-2 sm:grid-cols-[1fr_1.4fr]">
                <input value={p.key} onChange={(e) => setPillar(i, "key", e.target.value)} placeholder={`Pillar ${i + 1} word`} className={`${input} font-serif text-base`} />
                <input value={p.tag} onChange={(e) => setPillar(i, "tag", e.target.value)} placeholder="Memory tag" className={input} />
              </div>
              <textarea rows={3} value={p.text} onChange={(e) => setPillar(i, "text", e.target.value)} placeholder={`${["First", "Second", "Third"][i]}, …`} className={`${input} resize-y`} />
            </div>
          ))}
          <label className="block space-y-1 text-sm text-graphite-300">
            Landing line
            <input value={d.close} onChange={(e) => set("close", e.target.value)} className={input} />
          </label>
        </section>
      </div>

      {error && <p className="text-sm text-signal-amber">{error}</p>}
      <div className="flex flex-wrap items-center justify-end gap-4">
        <label className="flex items-center gap-2 text-sm text-graphite-300">
          <input type="checkbox" checked={d.published} onChange={(e) => set("published", e.target.checked)} className="size-4 accent-[var(--color-gold-500)]" />
          Published (visible to learners)
        </label>
        <button type="button" onClick={onCancel} className={secondaryButton}>
          Cancel
        </button>
        <button type="button" disabled={!!busy || !d.title.trim()} onClick={() => void save()} className={primaryButton}>
          {busy === "save" ? "Saving…" : "Save item"}
        </button>
      </div>
    </div>
  );
}
