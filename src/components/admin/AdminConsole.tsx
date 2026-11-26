"use client";

import { useCallback, useEffect, useState } from "react";
import { Chip, primaryButton, secondaryButton, SectionLabel } from "@/components/stage/shared";
import type { LibraryTopic } from "@/lib/content-store";

const input =
  "w-full rounded-md border border-graphite-700 bg-graphite-950 px-3 py-2 text-sm text-graphite-100 placeholder:text-graphite-600 focus:border-gold-600 focus:outline-none";

type Draft = Omit<LibraryTopic, "id" | "createdAt" | "updatedAt"> & { id?: string };

const emptyDraft = (section: string): Draft => ({
  section,
  title: "",
  text: "",
  opening: "",
  pillars: [0, 1, 2].map(() => ({ key: "", tag: "", text: "" })),
  close: "",
  published: true,
});

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
  const [sections, setSections] = useState<string[]>([]);
  const [filter, setFilter] = useState("All");
  const [editing, setEditing] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await api<{ topics: LibraryTopic[]; sections: string[] }>("/api/admin/topics");
      setTopics(d.topics);
      setSections(d.sections);
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
      <TopicEditor
        draft={editing}
        sections={sections}
        onCancel={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          void load();
        }}
      />
    );

  const shown = filter === "All" ? topics : topics.filter((t) => t.section === filter);

  return (
    <div className="space-y-8">
      <Header
        onLogout={async () => {
          await api("/api/admin/session", { method: "DELETE" });
          setSession({ ...session, admin: false });
        }}
      />
      {error && <p className="rounded-md border border-signal-amber/40 bg-signal-amber/10 px-4 py-3 text-sm text-signal-amber">{error}</p>}

      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {["All", ...sections].map((s) => (
                <Chip key={s} active={filter === s} onClick={() => setFilter(s)}>
                  {s} <span className="text-graphite-400">· {s === "All" ? topics.length : topics.filter((t) => t.section === s).length}</span>
                </Chip>
              ))}
            </div>
            <button type="button" onClick={() => setEditing(emptyDraft(filter !== "All" ? filter : sections[0]))} className={primaryButton}>
              + New topic
            </button>
          </div>

          {shown.length ? (
            <ul className="divide-y divide-graphite-800 rounded-xl border border-graphite-800 bg-graphite-950/60">
              {shown.map((t) => (
                <TopicRow
                  key={t.id}
                  topic={t}
                  onEdit={() => setEditing(t)}
                  onToggle={async () => {
                    await api("/api/admin/topics", { method: "PUT", body: JSON.stringify({ ...t, published: !t.published }) });
                    void load();
                  }}
                  onDelete={async () => {
                    await api(`/api/admin/topics?id=${encodeURIComponent(t.id)}`, { method: "DELETE" });
                    void load();
                  }}
                />
              ))}
            </ul>
          ) : (
            <div className="rounded-xl border border-dashed border-graphite-700 p-8 text-center text-graphite-400">
              No topics here yet. Click <span className="text-graphite-200">+ New topic</span>, paste a passage, and the coach turns it into a three-pillar talk.
            </div>
          )}
        </section>

        <SectionsManager
          sections={sections}
          topics={topics}
          onSave={async (next) => {
            try {
              const d = await api<{ sections: string[] }>("/api/admin/topics", { method: "PATCH", body: JSON.stringify({ sections: next }) });
              setSections(d.sections);
              setError(null);
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        />
      </div>
    </div>
  );
}

function Header({ onLogout }: { onLogout?: () => void }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-gold-500">Admin</p>
        <h1 className="font-serif text-5xl leading-tight">Topic Library</h1>
        <p className="text-graphite-300">
          Add passages to practise speaking on: motivation, mindset or any section you create. Published topics appear in Leadership Practice → Topic Library
          on every device, and rotate into the daily email.
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
        <h1 className="font-serif text-4xl">Topic Library</h1>
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

function TopicRow({ topic: t, onEdit, onToggle, onDelete }: { topic: LibraryTopic; onEdit: () => void; onToggle: () => void; onDelete: () => void }) {
  const [confirm, setConfirm] = useState(false);
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 p-4">
      <button type="button" onClick={onEdit} className="group min-w-0 flex-1 text-left">
        <span className="flex items-center gap-2">
          <span className="font-serif text-xl text-graphite-100 group-hover:text-gold-300">{t.title}</span>
          <span className={`rounded px-1.5 py-0.5 text-[10px] uppercase tracking-widest ${t.published ? "bg-signal-green/15 text-signal-green" : "bg-graphite-800 text-graphite-400"}`}>
            {t.published ? "Published" : "Draft"}
          </span>
        </span>
        <span className="block text-xs text-graphite-400">
          {t.section} · <span className="text-gold-400">{t.pillars.map((p) => p.key).join(" | ")}</span>
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

function SectionsManager({ sections, topics, onSave }: { sections: string[]; topics: LibraryTopic[]; onSave: (s: string[]) => void }) {
  const [name, setName] = useState("");
  return (
    <aside className="h-fit space-y-3 rounded-xl border border-graphite-800 bg-navy-900/50 p-5">
      <SectionLabel tone="gold">Sections</SectionLabel>
      <ul className="space-y-1.5 text-sm">
        {sections.map((s) => {
          const n = topics.filter((t) => t.section === s).length;
          return (
            <li key={s} className="flex items-center justify-between gap-2">
              <span className="text-graphite-100">
                {s} <span className="text-graphite-400">({n})</span>
              </span>
              {n === 0 && sections.length > 1 && (
                <button type="button" onClick={() => onSave(sections.filter((x) => x !== s))} className="text-xs text-graphite-400 hover:text-signal-red">
                  Remove
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) onSave([...sections, name.trim()]);
          setName("");
        }}
      >
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New section, e.g. Communication" className={input} />
        <button type="submit" disabled={!name.trim()} className={secondaryButton}>
          Add
        </button>
      </form>
      <p className="text-xs text-graphite-400">A section can be removed once it has no topics.</p>
    </aside>
  );
}

function TopicEditor({ draft, sections, onCancel, onSaved }: { draft: Draft; sections: string[]; onCancel: () => void; onSaved: () => void }) {
  const [d, setD] = useState<Draft>(draft);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const setPillar = (i: number, k: "key" | "tag" | "text", v: string) => setD((x) => ({ ...x, pillars: x.pillars.map((p, j) => (j === i ? { ...p, [k]: v } : p)) }));
  const hasCard = d.pillars.some((p) => p.key || p.text);

  const generate = async () => {
    setBusy("Building the cheat code…");
    setError(null);
    try {
      const g = await api<{ opening: string; pillars: { key: string; tag: string; text: string }[]; close: string; source: string }>("/api/leadership/topic", {
        method: "POST",
        body: JSON.stringify({ title: d.title || "Topic", text: d.text }),
      });
      setD((x) => ({ ...x, opening: g.opening, pillars: g.pillars, close: g.close }));
      if (g.source === "offline") setError("Built offline from the text's key sentences. Edit the pillars to make them yours.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const save = async () => {
    setBusy("Saving…");
    setError(null);
    try {
      await api("/api/admin/topics", { method: d.id ? "PUT" : "POST", body: JSON.stringify(d) });
      onSaved();
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-4xl">{d.id ? "Edit topic" : "New topic"}</h1>
        <button type="button" onClick={onCancel} className={secondaryButton}>
          ← Back to library
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4 rounded-xl border border-graphite-800 bg-graphite-950/60 p-5">
          <SectionLabel>1 · The passage</SectionLabel>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1 text-sm text-graphite-300">
              Title
              <input value={d.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Excuses" className={input} />
            </label>
            <label className="block space-y-1 text-sm text-graphite-300">
              Section
              <select value={d.section} onChange={(e) => set("section", e.target.value)} className={input}>
                {[...new Set([...sections, d.section])].filter(Boolean).map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="block space-y-1 text-sm text-graphite-300">
            Text to learn from
            <textarea rows={14} value={d.text} onChange={(e) => set("text", e.target.value)} placeholder="Paste the article or passage here." className={`${input} resize-y leading-relaxed`} />
          </label>
          <button type="button" disabled={!d.text.trim() || !!busy} onClick={() => void generate()} className={`${primaryButton} w-full`}>
            {busy === "Building the cheat code…" ? busy : hasCard ? "Regenerate the cheat code" : "Generate the cheat code"}
          </button>
        </section>

        <section className="space-y-4 rounded-xl border border-graphite-800 bg-graphite-950/60 p-5">
          <SectionLabel tone="gold">2 · The talk: opening, three pillars, landing line</SectionLabel>
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
          Published (visible in the app)
        </label>
        <button type="button" onClick={onCancel} className={secondaryButton}>
          Cancel
        </button>
        <button type="button" disabled={!!busy || !d.title.trim()} onClick={() => void save()} className={primaryButton}>
          {busy === "Saving…" ? busy : "Save topic"}
        </button>
      </div>
    </div>
  );
}
