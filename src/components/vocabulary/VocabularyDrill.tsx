"use client";

import { useEffect, useMemo, useState } from "react";
import { Chip, primaryButton, secondaryButton, SectionLabel } from "@/components/stage/shared";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { logProgress } from "@/lib/progress";
import { countHedges, findPassive, RUN_ON_WORDS, splitSentences } from "@/lib/scorecard";
import { tokenize } from "@/lib/speech-metrics";
import { VOCAB, VOCAB_CATEGORIES, type VocabCategory, type VocabScenario } from "@/lib/vocabulary";

const KEY = "ceo-voice.vocabulary";

interface VocabState {
  mastered: string[];
  reps: Record<string, number>;
}

function load(): VocabState {
  try {
    return { mastered: [], reps: {}, ...(JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<VocabState>) };
  } catch {
    return { mastered: [], reps: {} };
  }
}

function save(s: VocabState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* non-critical */
  }
}

/** Order: not yet mastered first, fewest reps first; mastered cards come back at the end. */
function deckFor(cat: "All" | VocabCategory, s: VocabState): VocabScenario[] {
  const pool = VOCAB.filter((v) => cat === "All" || v.category === cat);
  const rank = (v: VocabScenario) => (s.mastered.includes(v.id) ? 1000 : 0) + (s.reps[v.id] ?? 0);
  return [...pool].sort((a, b) => rank(a) - rank(b));
}

interface Check {
  words: number;
  hedgedWords: number;
  hedges: string[];
  longest: number;
  power: string[];
}

function check(text: string, v: VocabScenario): Check {
  const lower = text.toLowerCase();
  return {
    words: tokenize(text).length,
    hedgedWords: tokenize(v.hedged).length,
    hedges: [...countHedges(text).map((h) => h.phrase), ...findPassive(text).map((p) => `passive “${p}”`)],
    longest: Math.max(0, ...splitSentences(text).map((s) => s.split(/\s+/).length)),
    power: v.power.filter((p) => p.split("…").every((part) => !part.trim() || lower.includes(part.trim().toLowerCase()))),
  };
}

export function VocabularyDrill() {
  const [state, setState] = useState<VocabState>({ mastered: [], reps: {} });
  const [cat, setCat] = useState<"All" | VocabCategory>("All");
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState("");
  const [result, setResult] = useState<Check | null>(null);
  const [deck, setDeck] = useState<VocabScenario[]>(VOCAB);
  const stt = useSpeechRecognition();
  const tts = useSpeechSynthesis();

  useEffect(() => {
    const s = load();
    setState(s);
    setDeck(deckFor("All", s));
  }, []);

  // Dictation fills the box; typing still works.
  useEffect(() => {
    if (stt.listening && stt.fullText) setDraft(stt.fullText);
  }, [stt.fullText, stt.listening]);

  const card = deck[index % Math.max(1, deck.length)];
  const masteredCount = state.mastered.length;

  const pickCat = (c: "All" | VocabCategory) => {
    setCat(c);
    setDeck(deckFor(c, state));
    setIndex(0);
    reset();
  };

  const reset = () => {
    stt.stop();
    stt.reset();
    setDraft("");
    setResult(null);
    tts.cancel();
  };

  const compare = () => {
    stt.stop();
    if (!draft.trim()) return;
    const r = check(draft, card);
    setResult(r);
    logProgress({ source: "vocabulary", wpm: 0, words: r.words, fillers: 0, durationSec: 0 });
  };

  const rate = (grade: "nailed" | "close" | "again") => {
    const next: VocabState = {
      reps: { ...state.reps, [card.id]: (state.reps[card.id] ?? 0) + 1 },
      mastered: grade === "nailed" ? [...new Set([...state.mastered, card.id])] : grade === "again" ? state.mastered.filter((id) => id !== card.id) : state.mastered,
    };
    setState(next);
    save(next);
    setIndex((i) => i + 1);
    reset();
  };

  const cats = useMemo(() => ["All", ...VOCAB_CATEGORIES] as const, []);
  if (!card) return null;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-gold-500">Vocabulary Injector</p>
          <h1 className="font-serif text-5xl leading-tight">Hedged to Executive</h1>
          <p className="leading-relaxed text-graphite-300">
            Real situations, phrased the way nerves make us say them. Rewrite each one as a leader would say it in the boardroom: short, active, with a
            decision or a number. Then compare.
          </p>
        </div>
        <div className="w-full max-w-xs space-y-1.5">
          <div className="flex justify-between text-xs text-graphite-400">
            <span>Mastered</span>
            <span className="tabular-nums text-graphite-200">
              {masteredCount}/{VOCAB.length}
            </span>
          </div>
          <div className="h-2 rounded-full bg-graphite-800">
            <div className="h-2 rounded-full bg-gold-500 transition-[width] duration-500" style={{ width: `${(masteredCount / VOCAB.length) * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {cats.map((c) => (
          <Chip key={c} active={cat === c} onClick={() => pickCat(c)}>
            {c}
          </Chip>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="space-y-5 rounded-xl border border-graphite-800 bg-gradient-to-b from-navy-900/70 to-graphite-950 p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs uppercase tracking-[0.2em] text-graphite-400">
            <span>{card.category}</span>
            <span>
              Card {(index % deck.length) + 1} of {deck.length}
              {state.mastered.includes(card.id) && <span className="ml-2 text-signal-green">✓ mastered</span>}
            </span>
          </div>
          <p className="text-graphite-300">{card.situation}</p>
          <div>
            <SectionLabel>What nerves make you say</SectionLabel>
            <p className="mt-2 font-serif text-2xl leading-snug text-graphite-400 line-through decoration-signal-amber/50 decoration-1">“{card.hedged}”</p>
          </div>

          <div className="space-y-2">
            <SectionLabel tone="gold">Your executive version</SectionLabel>
            <textarea
              rows={4}
              value={draft}
              disabled={!!result}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Say it or type it: short, active, with a decision or a number."
              className="w-full resize-y rounded-md border border-graphite-700 bg-graphite-950 p-3 text-lg text-graphite-100 placeholder:text-graphite-600 focus:border-gold-600 focus:outline-none disabled:opacity-80"
            />
            {stt.error && <p className="text-sm text-signal-amber">{stt.error}</p>}
            {!result && (
              <div className="flex flex-wrap gap-3">
                {stt.supported && (
                  <button
                    type="button"
                    onClick={() => {
                      if (stt.listening) stt.stop();
                      else {
                        stt.reset();
                        stt.start();
                      }
                    }}
                    className={secondaryButton}
                  >
                    {stt.listening ? "■ Stop" : "🎙 Say it"}
                  </button>
                )}
                <button type="button" onClick={compare} disabled={!draft.trim()} className={primaryButton}>
                  Compare with the executive version
                </button>
                <button type="button" onClick={() => rate("close")} className="text-sm text-graphite-400 underline-offset-4 hover:underline">
                  Skip
                </button>
              </div>
            )}
          </div>
        </section>

        <aside className="h-fit space-y-4 rounded-xl border border-graphite-800 bg-graphite-950/60 p-6">
          {!result ? (
            <>
              <SectionLabel tone="gold">The executive formula</SectionLabel>
              <ul className="space-y-2 text-sm leading-relaxed text-graphite-300">
                <li>
                  <span className="text-graphite-100">Lead with the point.</span> The decision, risk or number first.
                </li>
                <li>
                  <span className="text-graphite-100">Active voice.</span> “I decided”, “we corrected”, not “it was done”.
                </li>
                <li>
                  <span className="text-graphite-100">No hedges.</span> Drop “I think”, “maybe”, “kind of”, “hopefully”.
                </li>
                <li>
                  <span className="text-graphite-100">Under {RUN_ON_WORDS} words a sentence.</span> Two short sentences beat one long one.
                </li>
                <li>
                  <span className="text-graphite-100">End with what happens next.</span> A date, an owner, a choice.
                </li>
              </ul>
            </>
          ) : (
            <div className="animate-reveal space-y-4">
              <SectionLabel tone="gold">How yours compares</SectionLabel>
              <ul className="space-y-1.5 text-sm">
                <Line ok={result.words <= result.hedgedWords * 0.8}>
                  {result.words} words (the hedged line had {result.hedgedWords})
                </Line>
                <Line ok={!result.hedges.length}>{result.hedges.length ? `Still hedging: ${result.hedges.join(", ")}` : "No hedges or passive voice"}</Line>
                <Line ok={result.longest <= RUN_ON_WORDS}>Longest sentence: {result.longest} words</Line>
                <Line ok={result.power.length > 0}>{result.power.length ? `Power phrase used: ${result.power.join(", ")}` : "Try a power phrase below"}</Line>
              </ul>
            </div>
          )}
        </aside>
      </div>

      {result && (
        <section className="animate-reveal space-y-4 rounded-xl border border-gold-600/40 bg-gradient-to-br from-navy-900/60 to-graphite-950 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SectionLabel tone="gold">Boardroom version</SectionLabel>
            <button
              type="button"
              onClick={() => void tts.speak(card.executive, 0.92)}
              className="rounded-md border border-graphite-700 px-3 py-1.5 text-xs text-graphite-300 transition hover:border-gold-600 hover:text-gold-300"
            >
              ▶ Hear it, then repeat it
            </button>
          </div>
          <p className="font-serif text-2xl leading-snug text-graphite-100">“{card.executive}”</p>
          <p className="text-sm text-graphite-300">
            <span className="text-gold-400">Why it works:</span> {card.principle}
          </p>
          <div className="flex flex-wrap gap-2">
            {card.power.map((p) => (
              <span key={p} className="rounded-md border border-gold-600/50 bg-gold-500/10 px-2.5 py-1 text-sm text-gold-300">
                {p}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3 border-t border-graphite-800 pt-4">
            <span className="text-sm text-graphite-400">How did you do?</span>
            <button type="button" onClick={() => rate("again")} className={secondaryButton}>
              Again soon
            </button>
            <button type="button" onClick={() => rate("close")} className={secondaryButton}>
              Close
            </button>
            <button type="button" onClick={() => rate("nailed")} className={primaryButton}>
              Nailed it ✓
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function Line({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <span className={ok ? "text-signal-green" : "text-signal-amber"}>{ok ? "✓" : "•"}</span>
      <span className="text-graphite-300">{children}</span>
    </li>
  );
}
