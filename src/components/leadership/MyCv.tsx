"use client";

import { Fragment, useMemo, useRef, useState } from "react";
import { primaryButton, secondaryButton, SectionLabel } from "@/components/stage/shared";
import { cleanPack, type CvPack, hasNumber, lineKind, linesFromText, NUMBER_RE, offlineCvPack, packToCards, questionsForLine, readDocx } from "@/lib/cv";
import { type AnswerCard, allCards, cheatCode, dueLabel, type LeadershipState, progressOf } from "@/lib/leadership";

interface Props {
  state: LeadershipState;
  update: (fn: (s: LeadershipState) => LeadershipState) => void;
  /** Practise a CV question in the Answer Lab. */
  onPractise: (id: string) => void;
  /** Prepare a new answer for a CV line that has no question yet. */
  onPrepare: (draft: AnswerCard) => void;
}

const input =
  "w-full rounded-md border border-graphite-700 bg-graphite-950 px-3 py-2 text-sm text-graphite-100 placeholder:text-graphite-600 focus:border-gold-600 focus:outline-none";

export function MyCv({ state, update, onPractise, onPrepare }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pasting, setPasting] = useState(false);
  const [pasted, setPasted] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [onlyQuestions, setOnlyQuestions] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const packRef = useRef<HTMLInputElement>(null);

  const cv = state.cv;
  const cvCards = useMemo(() => allCards(state).filter((c) => c.category === "CV"), [state]);

  const saveCv = (lines: string[], fileName: string) => {
    update((s) => ({ ...s, cv: { fileName, importedAt: new Date().toISOString(), lines } }));
    setPasting(false);
    setPasted("");
  };

  const applyPack = (pack: CvPack) => {
    const { cards, facts } = packToCards(pack);
    update((s) => ({
      ...s,
      // A fresh pack replaces the previous CV questions and facts; your other cards are untouched.
      custom: [...s.custom.filter((c) => c.category !== "CV"), ...cards],
      facts,
    }));
  };

  const importFile = async (file: File) => {
    setError(null);
    setBusy("Reading your CV…");
    try {
      const lines = /\.docx$/i.test(file.name) ? await readDocx(file) : linesFromText(await file.text());
      if (lines.length < 5) throw new Error("I couldn't find much text in that file. Try pasting the text instead.");
      saveCv(lines, file.name);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const generate = async () => {
    if (!cv) return;
    setError(null);
    setBusy("Reading your CV like an interviewer… this takes about 30 seconds");
    let pack: CvPack | null = null;
    try {
      const res = await fetch("/api/leadership/cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines: cv.lines }),
      });
      if (res.ok) pack = cleanPack(await res.json());
    } catch {
      /* offline below */
    }
    applyPack(pack ?? offlineCvPack(cv.lines));
    setBusy(null);
  };

  const importPack = async (file: File) => {
    setError(null);
    try {
      const pack = cleanPack(JSON.parse(await file.text()));
      if (!pack) throw new Error("That file isn't a CV prep pack.");
      applyPack(pack);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const hidden = (
    <>
      <input ref={fileRef} type="file" accept=".docx,.txt,.md" hidden onChange={(e) => e.target.files?.[0] && void importFile(e.target.files[0])} />
      <input ref={packRef} type="file" accept=".json,application/json" hidden onChange={(e) => e.target.files?.[0] && void importPack(e.target.files[0])} />
    </>
  );

  if (!cv) {
    return (
      <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        {hidden}
        <section className="space-y-5 rounded-xl border border-graphite-800 bg-gradient-to-b from-navy-900/70 to-graphite-950 p-6 md:p-8">
          <h2 className="font-serif text-3xl text-graphite-100">Bring in your CV</h2>
          <p className="text-sm leading-relaxed text-graphite-300">
            Every line on your CV is a question waiting to be asked. Import it once, and the app highlights what an interviewer will probe, writes a
            cheat code for each, and drills the numbers you must know instantly.
          </p>
          {pasting ? (
            <div className="space-y-3">
              <textarea rows={12} className={input} value={pasted} onChange={(e) => setPasted(e.target.value)} placeholder="Paste your CV text here…" />
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setPasting(false)} className={secondaryButton}>
                  Cancel
                </button>
                <button type="button" disabled={pasted.trim().length < 200} onClick={() => saveCv(linesFromText(pasted), "Pasted CV")} className={primaryButton}>
                  Use this text
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              <button type="button" disabled={!!busy} onClick={() => fileRef.current?.click()} className={primaryButton}>
                {busy ?? "Choose my CV (.docx)"}
              </button>
              <button type="button" onClick={() => setPasting(true)} className={secondaryButton}>
                Paste the text instead
              </button>
            </div>
          )}
          {error && <p className="text-sm text-signal-amber">{error}</p>}
        </section>
        <aside className="h-fit space-y-3 rounded-xl border border-graphite-800 bg-navy-900/50 p-6">
          <SectionLabel tone="gold">Private by design</SectionLabel>
          <p className="text-sm leading-relaxed text-graphite-300">
            Your CV is read inside your browser and saved only on this device. It is never stored on a server. When you generate questions, the text
            is sent once to the AI coach to write them, and not kept.
          </p>
        </aside>
      </div>
    );
  }

  const numbered = cv.lines.filter(hasNumber).length;
  const covered = cv.lines.filter((l) => hasNumber(l) && questionsForLine(l, cvCards).length).length;

  return (
    <div className="space-y-6">
      {hidden}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="min-w-0 rounded-xl border border-graphite-800 bg-graphite-950/60 p-5 md:p-8">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <SectionLabel>
              {cv.fileName} · imported {new Date(cv.importedAt).toLocaleDateString()}
            </SectionLabel>
            <label className="flex items-center gap-2 text-xs text-graphite-400">
              <input type="checkbox" checked={onlyQuestions} onChange={(e) => setOnlyQuestions(e.target.checked)} />
              Show only lines an interviewer will probe
            </label>
          </div>
          <CvView lines={cv.lines} cards={cvCards} onlyQuestions={onlyQuestions} onPractise={onPractise} onPrepare={onPrepare} />
        </section>

        <aside className="h-fit space-y-4 lg:sticky lg:top-4">
          <div className="space-y-3 rounded-xl border border-gold-600/40 bg-navy-900/60 p-5">
            <SectionLabel tone="gold">Your CV prep</SectionLabel>
            {cvCards.length ? (
              <>
                <p className="font-serif text-3xl text-graphite-100">
                  {cvCards.length} <span className="text-lg text-graphite-400">likely questions</span>
                </p>
                <p className="text-sm text-graphite-300">
                  {state.facts.length} numbers and facts to know instantly · {covered}/{numbered} lines with numbers have a prepared answer
                </p>
              </>
            ) : (
              <p className="text-sm text-graphite-300">
                Let the coach read your CV like an interviewer: it predicts the questions, writes a cheat code and a spoken answer for each, and
                pulls out the numbers to memorise.
              </p>
            )}
            <button type="button" disabled={!!busy} onClick={() => void generate()} className={`${primaryButton} w-full`}>
              {busy ?? (cvCards.length ? "Regenerate questions" : "Find my likely questions")}
            </button>
            {cvCards.length > 0 && <p className="text-xs text-graphite-400">Regenerating replaces CV questions you haven&apos;t edited elsewhere.</p>}
            {error && <p className="text-sm text-signal-amber">{error}</p>}
          </div>

          {cvCards.length > 0 && (
            <div className="rounded-xl border border-graphite-800 bg-graphite-950/60 p-5">
              <SectionLabel>Questions to prepare</SectionLabel>
              <ul className="mt-3 space-y-3">
                {cvCards.map((c) => {
                  const d = dueLabel(progressOf(state, c.id));
                  return (
                    <li key={c.id}>
                      <button type="button" onClick={() => onPractise(c.id)} className="group w-full text-left">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="text-sm text-graphite-100 group-hover:text-gold-300">{c.topic}</span>
                          {d.due && <span className="shrink-0 text-[10px] uppercase tracking-widest text-gold-500">{d.label}</span>}
                        </span>
                        <span className="block text-xs text-gold-400">{cheatCode(c)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div className="space-y-2 rounded-xl border border-graphite-800 bg-graphite-950/60 p-5 text-sm">
            <button type="button" onClick={() => fileRef.current?.click()} className="block text-graphite-300 underline-offset-4 hover:underline">
              Import an updated CV
            </button>
            <button type="button" onClick={() => packRef.current?.click()} className="block text-graphite-300 underline-offset-4 hover:underline">
              Import a prep pack (.json)
            </button>
            {confirmRemove ? (
              <span className="flex items-center gap-2 text-graphite-300">
                Remove the CV from this browser?
                <button
                  type="button"
                  onClick={() => {
                    update((s) => ({ ...s, cv: null }));
                    setConfirmRemove(false);
                  }}
                  className="rounded-md border border-signal-red/60 px-2 py-1 text-xs text-signal-red"
                >
                  Remove
                </button>
                <button type="button" onClick={() => setConfirmRemove(false)} className="rounded-md border border-graphite-700 px-2 py-1 text-xs">
                  Keep
                </button>
              </span>
            ) : (
              <button type="button" onClick={() => setConfirmRemove(true)} className="block text-graphite-400 underline-offset-4 hover:underline">
                Remove CV from this browser
              </button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Numbers({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(new RegExp(NUMBER_RE.source, "gi"))) {
    const i = m.index ?? 0;
    parts.push(text.slice(last, i));
    parts.push(
      <mark key={i} className="rounded bg-gold-500/20 px-0.5 font-medium text-gold-300" title="Know this number cold">
        {m[0]}
      </mark>,
    );
    last = i + m[0].length;
  }
  parts.push(text.slice(last));
  return <>{parts}</>;
}

function CvView({
  lines,
  cards,
  onlyQuestions,
  onPractise,
  onPrepare,
}: {
  lines: string[];
  cards: AnswerCard[];
  onlyQuestions: boolean;
  onPractise: (id: string) => void;
  onPrepare: (draft: AnswerCard) => void;
}) {
  return (
    <div className="space-y-1.5 text-[15px] leading-relaxed">
      {lines.map((line, i) => {
        const kind = lineKind(line, i);
        const qs = questionsForLine(line, cards);
        const numbered = hasNumber(line);
        const probed = qs.length > 0 || numbered;
        if (onlyQuestions && !probed && kind !== "heading" && kind !== "role") return null;
        const body = line.replace(/^• /, "");

        if (kind === "name") return <h2 key={i} className="font-serif text-3xl text-graphite-100">{line}</h2>;
        if (kind === "heading")
          return (
            <h3 key={i} className="pt-5 text-[11px] font-semibold uppercase tracking-[0.22em] text-gold-500">
              {line}
            </h3>
          );
        if (kind === "role") return <p key={i} className="pt-3 font-semibold text-graphite-100"><Numbers text={line} /></p>;

        return (
          <Fragment key={i}>
            <div className={`group rounded-md py-1 pl-3 ${qs.length ? "border-l-2 border-gold-500 bg-gold-500/5" : numbered ? "border-l-2 border-graphite-600" : "border-l-2 border-transparent"}`}>
              <p className={kind === "bullet" ? "text-graphite-200 before:mr-2 before:text-graphite-500 before:content-['•']" : "text-graphite-300"}>
                <Numbers text={body} />
              </p>
              {qs.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {qs.map((q) => (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => onPractise(q.id)}
                      className="rounded-full border border-gold-500/60 px-2.5 py-0.5 text-xs text-gold-300 transition hover:bg-gold-500/15"
                      title={q.question}
                    >
                      Likely Q: {q.topic} · {cheatCode(q)}
                    </button>
                  ))}
                </div>
              )}
              {!qs.length && numbered && (
                <button
                  type="button"
                  onClick={() =>
                    onPrepare({
                      id: `cv-line-${Date.now().toString(36)}`,
                      category: "CV",
                      topic: body.split(/\s+/).slice(0, 5).join(" "),
                      question: `Tell me more about this: "${body.length > 140 ? `${body.slice(0, 137)}…` : body}" How did you achieve it?`,
                      opening: "",
                      pillars: [0, 1, 2].map(() => ({ key: "", tag: "", title: "", text: "", cues: [] })),
                      close: "",
                      cvMatch: [body.slice(0, 50)],
                      custom: true,
                    })
                  }
                  className="mt-1 text-xs text-graphite-400 opacity-70 transition hover:text-gold-300 group-hover:opacity-100"
                >
                  + Prepare an answer for this line
                </button>
              )}
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}
