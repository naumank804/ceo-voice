"use client";

import { SectionLabel } from "@/components/stage/shared";
import { allCards, BRIDGE_PHRASES, type Category, CATEGORY_LABEL, cheatCode, type LeadershipState } from "@/lib/leadership";

interface Props {
  state: LeadershipState;
  speak: (text: string, rate?: number) => Promise<void>;
  onOpen: (id: string) => void;
  onDrillFacts: () => void;
  onGoCv: () => void;
}

const GROUPS: { cat: Category; why: string }[] = [
  { cat: "Technical", why: "Show depth: how you build, secure and run platforms." },
  { cat: "Business", why: "Show judgement: value, money, stakeholders, partners." },
  { cat: "Leadership", why: "Show how you lead people and change." },
  { cat: "CV", why: "Every claim on your CV, ready to defend." },
  { cat: "Craft", why: "Speak with authority on any leadership subject." },
];

const HABITS = [
  ["Answer in threes", "Opening line → First, Second, Third → landing line. Your mind always knows what comes next."],
  ["Headline first", "Say the answer in one sentence, then the detail. Never build up to the point."],
  ["Pause, don't fill", "A two-second pause reads as thinking. \"Um\" reads as lost. Breathe instead."],
  ["Numbers make it real", "Every story gets one number: budget, %, team size, time saved."],
  ["Land it and stop", "Finish with your landing line, then silence. Stopping cleanly is confidence."],
];

export function Toolkit({ state, speak, onOpen, onDrillFacts, onGoCv }: Props) {
  const cards = allCards(state);
  const pitch = (cards.find((c) => c.id === "about-me") ?? cards.find((c) => c.id === "ex-about-me"));
  const firstPhrases = BRIDGE_PHRASES.map((g) => ({ group: g.group, phrase: g.phrases[0] }));

  return (
    <div className="space-y-8">
      <p className="max-w-2xl text-sm leading-relaxed text-graphite-300">
        Everything you should be able to say at a moment&apos;s notice, on one page. Read it before any interview, meeting or presentation. Tap any
        cheat code to practise it out loud.
      </p>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        {pitch && (
          <section className="rounded-xl border border-gold-600/40 bg-gradient-to-br from-navy-900/70 to-graphite-950 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <SectionLabel tone="gold">Your 30-second pitch · {cheatCode(pitch)}</SectionLabel>
              <button
                type="button"
                onClick={() => void speak([pitch.opening, ...pitch.pillars.map((p) => p.text), pitch.close].join(" "), 0.92)}
                className="rounded-md border border-graphite-700 px-3 py-1.5 text-xs text-graphite-300 transition hover:border-gold-600 hover:text-gold-300"
              >
                ▶ Hear it
              </button>
            </div>
            <p className="mt-3 font-serif text-xl leading-relaxed text-graphite-100">{pitch.opening}</p>
            <ol className="mt-3 space-y-1 text-sm text-graphite-300">
              {pitch.pillars.map((p, i) => (
                <li key={i}>
                  <span className="font-medium text-gold-300">{p.key}</span> ({p.tag}): {p.title}
                </li>
              ))}
            </ol>
            <button type="button" onClick={() => onOpen(pitch.id)} className="mt-4 text-sm text-gold-400 underline-offset-4 hover:underline">
              Practise it now →
            </button>
          </section>
        )}

        <section className="rounded-xl border border-graphite-800 bg-graphite-950/60 p-6">
          <div className="flex items-center justify-between gap-3">
            <SectionLabel>Numbers to know cold</SectionLabel>
            {state.facts.length > 0 && (
              <button type="button" onClick={onDrillFacts} className="text-sm text-gold-400 underline-offset-4 hover:underline">
                Drill them →
              </button>
            )}
          </div>
          {state.facts.length ? (
            <ul className="mt-3 max-h-72 space-y-1.5 overflow-y-auto pr-2 text-sm">
              {state.facts.map((f) => (
                <li key={f.id} className="flex justify-between gap-4 border-b border-graphite-800/60 pb-1.5">
                  <span className="text-graphite-300">{f.q}</span>
                  <span className="shrink-0 font-medium text-gold-300">{f.a}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-graphite-400">
              Import your CV and generate your questions to fill this list.{" "}
              <button type="button" onClick={onGoCv} className="text-gold-400 underline-offset-4 hover:underline">
                Go to My CV →
              </button>
            </p>
          )}
        </section>
      </div>

      <section className="space-y-4">
        <SectionLabel tone="gold">Cheat codes</SectionLabel>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {GROUPS.map((g) => {
            const list = cards.filter((c) => c.category === g.cat);
            if (!list.length) return null;
            return (
              <div key={g.cat} className="rounded-xl border border-graphite-800 bg-graphite-950/60 p-5">
                <h3 className="font-serif text-2xl text-graphite-100">{CATEGORY_LABEL[g.cat]}</h3>
                <p className="text-xs text-graphite-400">{g.why}</p>
                <ul className="mt-3 space-y-2">
                  {list.map((c) => (
                    <li key={c.id}>
                      <button type="button" onClick={() => onOpen(c.id)} className="group w-full text-left">
                        <span className="block text-sm text-graphite-200 group-hover:text-gold-300">{c.topic}</span>
                        <span className="block text-xs text-gold-400">{cheatCode(c)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-graphite-800 bg-graphite-950/60 p-6">
          <SectionLabel>Five speaking habits of a leader</SectionLabel>
          <ol className="mt-3 space-y-3">
            {HABITS.map(([h, d], i) => (
              <li key={h} className="flex gap-3">
                <span className="font-serif text-xl text-gold-500">{i + 1}</span>
                <span>
                  <span className="block font-medium text-graphite-100">{h}</span>
                  <span className="block text-sm text-graphite-400">{d}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>
        <section className="rounded-xl border border-graphite-800 bg-graphite-950/60 p-6">
          <SectionLabel>If your mind goes blank</SectionLabel>
          <ul className="mt-3 space-y-3">
            {firstPhrases.map((p) => (
              <li key={p.group} className="flex items-start justify-between gap-3">
                <span>
                  <span className="block text-xs uppercase tracking-[0.18em] text-graphite-400">{p.group}</span>
                  <span className="text-graphite-100">&quot;{p.phrase}&quot;</span>
                </span>
                <button
                  type="button"
                  onClick={() => void speak(p.phrase, 0.9)}
                  aria-label={`Hear: ${p.phrase}`}
                  className="shrink-0 rounded-md border border-graphite-700 px-2 py-1 text-xs text-graphite-300 transition hover:border-gold-600 hover:text-gold-300"
                >
                  ▶
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
