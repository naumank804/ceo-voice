"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { primaryButton, secondaryButton, SectionLabel } from "@/components/stage/shared";
import { LEVELS, PROFESSIONS, TRACKS } from "@/lib/curriculum";
import { loadState, saveState, starterCards } from "@/lib/leadership";
import {
  buildPlan,
  EMPTY_ANSWERS,
  GOALS,
  loadOnboarding,
  type Onboarding,
  type OnboardingAnswers,
  professionName,
  saveOnboarding,
  type StarterItem,
  STRUGGLES,
} from "@/lib/onboarding";
import { loadProfile, saveProfile } from "@/lib/profile";

const input =
  "w-full rounded-md border border-graphite-700 bg-graphite-950 px-3 py-2.5 text-base text-graphite-100 placeholder:text-graphite-600 focus:border-gold-600 focus:outline-none";

const STEPS = ["goal", "profession", "roles", "background", "struggles", "time", "name"] as const;
type Step = (typeof STEPS)[number];

export function OnboardingWizard() {
  const [a, setA] = useState<OnboardingAnswers>(EMPTY_ANSWERS);
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<"asking" | "building" | "done">("asking");
  const [result, setResult] = useState<{ o: Onboarding; count: number; source: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Retaking onboarding starts from the previous answers.
  useEffect(() => {
    const prev = loadOnboarding();
    const p = loadProfile();
    setA({ ...EMPTY_ANSWERS, ...(prev?.answers ?? {}), name: prev?.answers.name || p.name, jobTitle: prev?.answers.jobTitle || p.role, targetRole: prev?.answers.targetRole || p.targetRole, industry: prev?.answers.industry || p.industry });
  }, []);

  const set = <K extends keyof OnboardingAnswers>(k: K, v: OnboardingAnswers[K]) => setA((x) => ({ ...x, [k]: v }));
  const id: Step = STEPS[step];
  const canNext =
    id === "goal" ? !!a.goal : id === "profession" ? a.profession !== "other" || !!a.professionOther.trim() : id === "roles" ? !!a.jobTitle.trim() : true;

  const finish = async () => {
    setPhase("building");
    setError(null);
    let items: StarterItem[] = [];
    let source = "offline";
    try {
      const res = await fetch("/api/onboarding/starter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(a) });
      const d = (await res.json()) as { items?: StarterItem[]; source?: string; error?: string };
      if (!res.ok || !d.items) throw new Error(d.error ?? "Couldn't build your questions.");
      items = d.items;
      source = d.source ?? "offline";
    } catch (e) {
      setError((e as Error).message);
      setPhase("asking");
      return;
    }
    const o: Onboarding = { answers: a, plan: buildPlan(a), completedAt: new Date().toISOString() };
    saveOnboarding(o);
    const p = loadProfile();
    saveProfile({ ...p, name: a.name || p.name, role: a.jobTitle, targetRole: a.targetRole, industry: a.industry || p.industry });
    const s = loadState();
    const cards = starterCards(items);
    saveState({
      ...s,
      profession: a.profession,
      // Replace any previous onboarding set; CV questions and your own cards stay.
      custom: [...s.custom.filter((c) => c.category !== "Role"), ...cards],
    });
    setResult({ o, count: cards.length, source });
    setPhase("done");
  };

  if (phase === "building")
    return (
      <div className="mx-auto max-w-xl space-y-4 py-16 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-gold-500">Building your plan</p>
        <h1 className="font-serif text-4xl">Writing questions for a {a.targetRole || a.jobTitle}…</h1>
        <p className="text-graphite-300">The coach is preparing interview questions and model answers for {professionName(a)}. This takes a few seconds.</p>
        <div className="mx-auto h-1 w-48 overflow-hidden rounded-full bg-graphite-800">
          <div className="h-1 w-1/3 animate-pulse rounded-full bg-gold-500" />
        </div>
      </div>
    );

  if (phase === "done" && result) return <PlanReady o={result.o} count={result.count} source={result.source} />;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-gold-500">Get started · {step + 1} of {STEPS.length}</p>
        <div className="flex gap-1" aria-hidden>
          {STEPS.map((_, i) => (
            <span key={i} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-gold-500" : "bg-graphite-800"}`} />
          ))}
        </div>
      </div>

      <div className="animate-reveal space-y-5" key={id}>
        {id === "goal" && (
          <Question title="What do you want most right now?" hint="Your roadmap puts this first.">
            <Options value={a.goal} options={GOALS} onPick={(v) => set("goal", v)} />
            {(a.goal === "interview" || a.goal === "all") && (
              <label className="block space-y-1 text-sm text-graphite-300">
                Interview date, if you have one
                <input type="date" value={a.interviewDate} onChange={(e) => set("interviewDate", e.target.value)} className={`${input} max-w-xs`} />
              </label>
            )}
          </Question>
        )}

        {id === "profession" && (
          <Question title="What's your profession?" hint="Questions and examples are written for your field.">
            <Options value={a.profession} options={PROFESSIONS.map((p) => ({ id: p.id, name: p.name, body: p.examples }))} onPick={(v) => set("profession", v)} />
            {a.profession === "other" && <input autoFocus value={a.professionOther} onChange={(e) => set("professionOther", e.target.value)} placeholder="Your field, e.g. Legal, Education" className={input} />}
          </Question>
        )}

        {id === "roles" && (
          <Question title="Where are you now, and where are you going?" hint="Your target role sets the level of your questions and where your Leadership Ladder starts.">
            <label className="block space-y-1 text-sm text-graphite-300">
              Your current job title
              <input autoFocus value={a.jobTitle} onChange={(e) => set("jobTitle", e.target.value)} placeholder="e.g. Senior Auditor, Product Owner, Financial Analyst" className={input} />
            </label>
            <label className="block space-y-1 text-sm text-graphite-300">
              The role you're targeting
              <input value={a.targetRole} onChange={(e) => set("targetRole", e.target.value)} placeholder="e.g. Audit Manager, Head of Product, Finance Director" className={input} />
            </label>
            {a.targetRole && (
              <p className="text-sm text-graphite-400">
                Target level detected: <span className="text-gold-300">{LEVELS.find((l) => l.id === buildPlan(a).targetLevel)?.name ?? "—"}</span>
              </p>
            )}
          </Question>
        )}

        {id === "background" && (
          <Question title="A little background" hint="Optional, but it makes scenario and business questions sharper.">
            <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
              <label className="block space-y-1 text-sm text-graphite-300">
                Industry
                <input value={a.industry} onChange={(e) => set("industry", e.target.value)} placeholder="e.g. Banking, Insurance, Retail, Public sector" className={input} />
              </label>
              <label className="block space-y-1 text-sm text-graphite-300">
                Years of experience
                <select value={a.years} onChange={(e) => set("years", e.target.value)} className={input}>
                  <option value="">—</option>
                  {["0–2", "3–5", "6–10", "11–15", "16–20", "20+"].map((y) => (
                    <option key={y}>{y}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block space-y-1 text-sm text-graphite-300">
              A job description you&apos;re aiming for <span className="text-graphite-400">(optional, paste it)</span>
              <textarea rows={5} value={a.jobDescription} onChange={(e) => set("jobDescription", e.target.value)} className={`${input} resize-y text-sm`} />
            </label>
          </Question>
        )}

        {id === "struggles" && (
          <Question title="What's hardest for you when speaking?" hint="Pick any. We'll train these first.">
            <div className="grid gap-2 sm:grid-cols-2">
              {STRUGGLES.map((s) => {
                const on = a.struggles.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => set("struggles", on ? a.struggles.filter((x) => x !== s.id) : [...a.struggles, s.id])}
                    className={`rounded-xl border p-4 text-left transition ${on ? "border-gold-500 bg-gold-500/10" : "border-graphite-800 bg-graphite-950/60 hover:border-graphite-600"}`}
                  >
                    <span className={`block font-medium ${on ? "text-gold-300" : "text-graphite-100"}`}>
                      {on ? "✓ " : ""}
                      {s.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </Question>
        )}

        {id === "time" && (
          <Question title="How much time can you practise each day?" hint="Little and often beats long and rare.">
            <Options
              value={String(a.minutesPerDay)}
              options={[
                { id: "5", name: "5 minutes", body: "One recall drill and one answer." },
                { id: "10", name: "10 minutes", body: "The full daily workout." },
                { id: "20", name: "20 minutes", body: "Workout plus a mock interview or talk." },
              ]}
              onPick={(v) => set("minutesPerDay", Number(v) as OnboardingAnswers["minutesPerDay"])}
            />
          </Question>
        )}

        {id === "name" && (
          <Question title="What should your coach call you?" hint="Optional.">
            <input autoFocus value={a.name} onChange={(e) => set("name", e.target.value)} placeholder="First name" className={`${input} max-w-sm`} />
            <p className="text-sm text-graphite-400">
              Next, the coach writes about 10 interview questions with model answers for a <span className="text-graphite-200">{a.targetRole || a.jobTitle}</span> in{" "}
              {professionName(a)}, and builds your roadmap.
            </p>
          </Question>
        )}
      </div>

      {error && <p className="text-sm text-signal-amber">{error}</p>}
      <div className="flex items-center justify-between gap-3">
        <button type="button" disabled={step === 0} onClick={() => setStep((s) => s - 1)} className={secondaryButton}>
          ← Back
        </button>
        {step < STEPS.length - 1 ? (
          <button type="button" disabled={!canNext} onClick={() => setStep((s) => s + 1)} className={primaryButton}>
            Continue →
          </button>
        ) : (
          <button type="button" onClick={() => void finish()} className={primaryButton}>
            Build my roadmap →
          </button>
        )}
      </div>
    </div>
  );
}

function Question({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <section className="space-y-5">
      <div className="space-y-1">
        <h1 className="font-serif text-4xl leading-tight text-graphite-100">{title}</h1>
        <p className="text-graphite-400">{hint}</p>
      </div>
      {children}
    </section>
  );
}

function Options<T extends string>({ value, options, onPick }: { value: string; options: readonly { id: T; name: string; body: string }[]; onPick: (v: T) => void }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={value === o.id}
          onClick={() => onPick(o.id)}
          className={`rounded-xl border p-4 text-left transition ${value === o.id ? "border-gold-500 bg-gold-500/10" : "border-graphite-800 bg-graphite-950/60 hover:border-graphite-600"}`}
        >
          <span className={`block font-medium ${value === o.id ? "text-gold-300" : "text-graphite-100"}`}>{o.name}</span>
          <span className="block text-sm text-graphite-400">{o.body}</span>
        </button>
      ))}
    </div>
  );
}

function PlanReady({ o, count, source }: { o: Onboarding; count: number; source: string }) {
  const { plan, answers: a } = o;
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-gold-500">Your roadmap is ready</p>
        <h1 className="font-serif text-5xl leading-tight">{a.name ? `${a.name}, here's your plan` : "Here's your plan"}</h1>
        <p className="text-lg text-graphite-300">
          {a.jobTitle}
          {a.targetRole && (
            <>
              {" "}
              → <span className="text-gold-300">{a.targetRole}</span>
            </>
          )}{" "}
          · {professionName(a)} · {plan.minutesPerDay} minutes a day
          {plan.daysToInterview !== null && <> · interview in {plan.daysToInterview} days</>}
        </p>
      </div>

      <section className="space-y-3">
        <SectionLabel tone="gold">Your tracks, in order</SectionLabel>
        <ol className="grid gap-2 sm:grid-cols-5">
          {plan.trackOrder.map((t, i) => (
            <li key={t} className={`rounded-lg border p-3 ${i === 0 ? "border-gold-500 bg-gold-500/10" : "border-graphite-800 bg-graphite-950/60"}`}>
              <span className="block text-[10px] uppercase tracking-[0.2em] text-graphite-400">{i === 0 ? "Start here" : `#${i + 1}`}</span>
              <span className="block font-serif text-lg text-graphite-100">{TRACKS.find((x) => x.id === t)?.name}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-graphite-800 bg-graphite-950/60 p-5">
          <SectionLabel>Written for you</SectionLabel>
          <p className="mt-2 font-serif text-3xl text-graphite-100">{count} interview questions</p>
          <p className="text-sm text-graphite-400">
            With model answers for your role, placed on your Interview roadmap.{source === "offline" && " (Starter templates: they improve when the AI coach is available.)"}
          </p>
        </div>
        <div className="rounded-xl border border-graphite-800 bg-graphite-950/60 p-5">
          <SectionLabel>Leadership Ladder starts at</SectionLabel>
          <p className="mt-2 font-serif text-3xl text-graphite-100">{LEVELS.find((l) => l.id === plan.targetLevel)?.short ?? "Leading yourself"}</p>
          <p className="text-sm text-graphite-400">Your target level. Earlier rungs stay open for review.</p>
        </div>
      </section>

      {plan.focus.length > 0 && (
        <section className="space-y-2">
          <SectionLabel>We&apos;ll train first</SectionLabel>
          <ul className="space-y-1.5 text-graphite-300">
            {plan.focus.map((f) => (
              <li key={f}>• {f}</li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap gap-3">
        <Link href="/roadmap" className={primaryButton}>
          Open my roadmap →
        </Link>
        <Link href="/leadership?tab=cv" className={secondaryButton}>
          Add my CV (recommended)
        </Link>
        <Link href="/login" className={secondaryButton}>
          Save to an account
        </Link>
      </div>
    </div>
  );
}
