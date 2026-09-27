"use client";

import { useMemo, useState } from "react";
import { CLASSIC_BOOKS, LIBRARY, LIBRARY_CATEGORIES, type LibraryCategory, type LibraryItem, type Passage } from "@/lib/library";
import { Chip, primaryButton, secondaryButton, SectionLabel } from "./shared";

export interface DiscussRequest {
  topic: string;
  framework: string;
  /** Text to read before retelling it. */
  reference: string | null;
}

interface Props {
  speak: (text: string, rate?: number) => Promise<void>;
  stopSpeaking: () => void;
  onMemorize: (title: string, text: string) => void;
  onDiscuss: (req: DiscussRequest) => void;
}

/** A quote is discussed (PREP); anything longer is retold, which trains recall without word-for-word memorising. */
function discussFor(kind: LibraryItem["kind"], title: string, text: string, author: string): DiscussRequest {
  if (kind === "Quote") {
    return { topic: `“${text}” (${author}). What does this mean to you, and where have you seen it at work?`, framework: "prep", reference: null };
  }
  const what = kind === "Passage" ? `this passage from ${author}` : `“${title}”`;
  return { topic: `Retell ${what} in your own words, then say what it teaches.`, framework: "what", reference: text };
}

export function PracticeLibrary({ speak, stopSpeaking, onMemorize, onDiscuss }: Props) {
  const [category, setCategory] = useState<"All" | LibraryCategory>("All");
  const [query, setQuery] = useState("");
  const [playing, setPlaying] = useState<string | null>(null);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return LIBRARY.filter(
      (i) => (category === "All" || i.category === category) && (!q || `${i.title} ${i.text} ${i.source} ${i.lesson}`.toLowerCase().includes(q)),
    );
  }, [category, query]);

  const hear = async (id: string, text: string) => {
    if (playing === id) {
      stopSpeaking();
      return;
    }
    setPlaying(id);
    await speak(text, 0.9);
    setPlaying((p) => (p === id ? null : p));
  };

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-3">
          <SectionLabel tone="gold">Practice library</SectionLabel>
          <p className="font-serif text-3xl leading-snug text-graphite-100">Great words to practise with, from leaders, classics and real stories.</p>
          <p className="text-sm leading-relaxed text-graphite-300">
            <span className="text-graphite-100">Memorise it</span> to train recall with the step-by-step method.{" "}
            <span className="text-graphite-100">Talk about it</span> to practise speaking freely: explain a quote, or retell a story in your own
            words. Retelling is the best exercise if memorising is hard, because you remember the ideas, not the exact words.
          </p>
        </div>
        <ClassicsPanel speak={hear} playing={playing} onMemorize={onMemorize} onDiscuss={onDiscuss} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(["All", ...LIBRARY_CATEGORIES] as const).map((c) => (
          <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
            {c}
          </Chip>
        ))}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search…"
          className="ml-auto w-full rounded-md border border-graphite-700 bg-graphite-950 px-3 py-1.5 text-sm text-graphite-100 placeholder:text-graphite-600 focus:border-gold-600 focus:outline-none sm:w-56"
        />
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-graphite-400">Nothing matches. Try another category, or pull a passage from the classics above.</p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {items.map((item) => (
            <LibraryCard
              key={item.id}
              item={item}
              playing={playing === item.id}
              onHear={() => void hear(item.id, item.text)}
              onMemorize={() => onMemorize(item.title, item.text)}
              onDiscuss={() => onDiscuss(discussFor(item.kind, item.title, item.text, item.source.split(",")[0]))}
            />
          ))}
        </ul>
      )}

      <p className="text-xs leading-relaxed text-graphite-400">
        Everything here is public domain, freely licensed, or written for this app. Modern business books are copyrighted, so their text isn&apos;t
        included. For a book you own, paste your own notes or a short summary as a new speech.
      </p>
    </div>
  );
}

function LibraryCard({ item, playing, onHear, onMemorize, onDiscuss }: { item: LibraryItem; playing: boolean; onHear: () => void; onMemorize: () => void; onDiscuss: () => void }) {
  const [open, setOpen] = useState(false);
  const long = item.text.length > 280;
  const shown = open || !long ? item.text : `${item.text.slice(0, 260).trimEnd()}…`;

  return (
    <li className="flex flex-col rounded-xl border border-graphite-800 bg-graphite-950/70 p-5">
      <div className="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.2em]">
        <span className="text-gold-500">{item.kind}</span>
        <span className="text-graphite-400">{item.category}</span>
      </div>
      <h3 className="mt-1 font-serif text-2xl leading-tight text-graphite-100">{item.title}</h3>
      <p className="mt-1 text-xs text-graphite-400">{item.source}</p>
      <p className={`mt-3 whitespace-pre-line leading-relaxed text-graphite-300 ${item.kind === "Quote" ? "font-serif text-xl italic" : "text-sm"}`}>{shown}</p>
      {long && (
        <button type="button" onClick={() => setOpen((o) => !o)} className="mt-1 self-start text-xs text-graphite-400 underline-offset-4 hover:text-gold-400 hover:underline">
          {open ? "Show less" : "Read all"}
        </button>
      )}
      <p className="mt-3 text-sm text-graphite-100">
        <span className="text-graphite-400">Lesson: </span>
        {item.lesson}
      </p>
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
        <button type="button" onClick={onHear} className="rounded-md border border-graphite-700 px-3 py-1.5 text-xs text-graphite-300 transition hover:border-gold-600 hover:text-gold-300">
          {playing ? "■ Stop" : "▶ Hear it"}
        </button>
        <button type="button" onClick={onMemorize} className="rounded-md border border-graphite-700 px-3 py-1.5 text-xs text-graphite-300 transition hover:border-gold-600 hover:text-gold-300">
          Memorise it
        </button>
        <button type="button" onClick={onDiscuss} className="rounded-md bg-gold-500 px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-gold-400">
          {item.kind === "Quote" ? "Talk about it" : "Retell it"}
        </button>
      </div>
      <p className="mt-3 text-[10px] leading-snug text-graphite-600">{item.license}</p>
    </li>
  );
}

function ClassicsPanel({
  speak,
  playing,
  onMemorize,
  onDiscuss,
}: {
  speak: (id: string, text: string) => Promise<void>;
  playing: string | null;
  onMemorize: (title: string, text: string) => void;
  onDiscuss: (req: DiscussRequest) => void;
}) {
  const [bookId, setBookId] = useState(CLASSIC_BOOKS[0].id);
  const [passage, setPassage] = useState<Passage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPassage = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/library/passage?book=${bookId}`);
      const data = (await res.json()) as Passage & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Couldn't load a passage.");
      setPassage(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const playId = passage ? `passage-${passage.bookId}-${passage.text.length}` : "";

  return (
    <section className="rounded-xl border border-gold-600/40 bg-navy-900/50 p-5">
      <SectionLabel tone="gold">From the classics</SectionLabel>
      <p className="mt-1 text-xs text-graphite-400">A random passage from a public-domain book, fetched live from Project Gutenberg.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <select
          value={bookId}
          onChange={(e) => {
            setBookId(Number(e.target.value));
            setPassage(null);
          }}
          className="min-w-0 flex-1 rounded-md border border-graphite-700 bg-graphite-950 px-2 py-2 text-sm text-graphite-100"
        >
          {CLASSIC_BOOKS.map((b) => (
            <option key={b.id} value={b.id}>
              {b.title}: {b.author} ({b.category})
            </option>
          ))}
        </select>
        <button type="button" onClick={() => void fetchPassage()} disabled={loading} className={passage ? secondaryButton : primaryButton}>
          {loading ? "Opening the book…" : passage ? "↻ Another passage" : "Get a passage"}
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-signal-amber">{error}</p>}
      {passage && (
        <div className="animate-reveal mt-4">
          <blockquote className="max-h-64 overflow-y-auto font-serif text-lg leading-relaxed text-graphite-100">{passage.text}</blockquote>
          <p className="mt-2 text-xs text-graphite-400">
            {passage.author}, <span className="italic">{passage.title}</span> ·{" "}
            <a href={passage.url} target="_blank" rel="noreferrer" className="underline-offset-4 hover:text-gold-400 hover:underline">
              Project Gutenberg
            </a>{" "}
            · Public domain
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => void speak(playId, passage.text)} className="rounded-md border border-graphite-700 px-3 py-1.5 text-xs text-graphite-300 transition hover:border-gold-600 hover:text-gold-300">
              {playing === playId ? "■ Stop" : "▶ Hear it"}
            </button>
            <button type="button" onClick={() => onMemorize(`${passage.author}: ${passage.title}`, passage.text)} className="rounded-md border border-graphite-700 px-3 py-1.5 text-xs text-graphite-300 transition hover:border-gold-600 hover:text-gold-300">
              Memorise it
            </button>
            <button
              type="button"
              onClick={() => onDiscuss(discussFor("Passage", passage.title, passage.text, passage.author))}
              className="rounded-md bg-gold-500 px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-gold-400"
            >
              Retell it
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
