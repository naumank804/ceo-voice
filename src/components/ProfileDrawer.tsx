"use client";

import { useEffect, useRef, useState } from "react";
import { EMPTY_PROFILE, type ExecutiveProfile, exportBackup, hasProfile, importBackup, loadProfile, saveProfile } from "@/lib/profile";

const input =
  "w-full rounded-md border border-graphite-700 bg-graphite-950 px-3 py-2 text-sm text-graphite-100 placeholder:text-graphite-600 focus:border-gold-600 focus:outline-none";

/** "Your Executive Profile": opened from the top nav, saved to this browser as you type. */
export function ProfileDrawer() {
  const [open, setOpen] = useState(false);
  const [p, setP] = useState<ExecutiveProfile>(EMPTY_PROFILE);
  const [note, setNote] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setP(loadProfile()), []);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const set = (k: keyof ExecutiveProfile, v: string) => {
    const next = { ...p, [k]: v };
    setP(next);
    saveProfile(next);
    setNote("Saved in this browser.");
  };

  const download = () => {
    const blob = new Blob([JSON.stringify(exportBackup(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ceo-voice-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setNote("Backup downloaded. It includes your profile, answers, CV and progress.");
  };

  const restore = async (file: File) => {
    try {
      const n = importBackup(JSON.parse(await file.text()));
      setP(loadProfile());
      setNote(`Restored ${n} items. Reloading…`);
      window.setTimeout(() => window.location.reload(), 900);
    } catch (e) {
      setNote(e instanceof Error ? e.message : "That file couldn't be read.");
    }
  };

  const initials = p.name.trim() ? p.name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase() : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-md border border-graphite-700 px-2.5 py-1 text-sm text-graphite-300 transition hover:border-gold-500 hover:text-gold-300"
      >
        <span className={`flex size-5 items-center justify-center rounded-full text-[10px] font-semibold ${initials ? "bg-gold-500 text-ink" : "border border-graphite-600"}`}>
          {initials ?? "+"}
        </span>
        {hasProfile(p) ? "Profile" : "Your profile"}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="profile-title">
          <button type="button" aria-label="Close profile" className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <aside className="animate-reveal relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-graphite-800 bg-paper p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold-500">Your Executive Profile</p>
                <h2 id="profile-title" className="mt-1 font-serif text-3xl text-graphite-100">
                  Who you are
                </h2>
              </div>
              <button ref={closeRef} type="button" onClick={() => setOpen(false)} className="rounded-md px-2 py-1 text-graphite-400 hover:text-graphite-100">
                ✕
              </button>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-graphite-400">
              Interview questions, cheat codes and rewritten answers use this to sound like your real background. It stays in this browser, and is only sent
              to the AI coach with a request.
            </p>

            <div className="mt-6 space-y-4 text-sm text-graphite-300">
              <Field label="Name">
                <input value={p.name} onChange={(e) => set("name", e.target.value)} placeholder="How the coach greets you" className={input} />
              </Field>
              <Field label="Current / target role">
                <input value={p.role} onChange={(e) => set("role", e.target.value)} placeholder="e.g. AVP Digital Delivery" className={input} />
              </Field>
              <Field label="Industry domain">
                <input value={p.industry} onChange={(e) => set("industry", e.target.value)} placeholder="e.g. Financial Services / Wealth" className={input} />
              </Field>
              <Field label="Key career metrics & projects">
                <textarea
                  rows={7}
                  value={p.metrics}
                  onChange={(e) => set("metrics", e.target.value)}
                  placeholder={"e.g.\n• $50M+ portfolio across 6 squads\n• OSFI compliance program\n• CI/CD rollout: release time cut 40%"}
                  className={`${input} resize-y leading-relaxed`}
                />
                <span className="text-xs text-graphite-400">One per line. Real numbers make the rewrites sound like you.</span>
              </Field>
            </div>

            <div className="mt-6 space-y-3 border-t border-graphite-800 pt-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-graphite-400">Backup</p>
              <p className="text-xs text-graphite-400">Everything lives in this browser. Download a backup to move it to another device, or to keep it safe.</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={download} className="rounded-md bg-gold-500 px-4 py-2 text-sm font-semibold text-ink transition hover:bg-gold-400">
                  Export backup (JSON)
                </button>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="rounded-md border border-graphite-700 px-4 py-2 text-sm text-graphite-300 transition hover:border-gold-500"
                >
                  Import backup
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/json,.json"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void restore(f);
                    e.target.value = "";
                  }}
                />
              </div>
              {note && (
                <p className="text-xs text-graphite-300" aria-live="polite">
                  {note}
                </p>
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="block text-xs uppercase tracking-[0.15em] text-graphite-400">{label}</span>
      {children}
    </label>
  );
}
