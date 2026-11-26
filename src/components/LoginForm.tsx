"use client";

import { useState } from "react";
import { primaryButton, secondaryButton } from "@/components/stage/shared";
import { afterSignIn, type AccountUser } from "@/lib/account";
import { loadOnboarding } from "@/lib/onboarding";

const input =
  "w-full rounded-md border border-graphite-700 bg-graphite-950 px-3 py-2.5 text-base text-graphite-100 placeholder:text-graphite-600 focus:border-gold-600 focus:outline-none";

/** Passwordless sign-in: email → 6-digit code → signed in (account created on first sign-in). */
export function LoginForm() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);

  const request = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/auth/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const d = (await r.json()) as { error?: string; devCode?: string };
      if (!r.ok) throw new Error(d.error ?? "Couldn't send the code.");
      setDevCode(d.devCode ?? null);
      setStep("code");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/auth/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, code }) });
      const d = (await r.json()) as { error?: string; user?: AccountUser };
      if (!r.ok || !d.user) throw new Error(d.error ?? "Sign-in failed.");
      await afterSignIn(d.user);
      const next = new URLSearchParams(window.location.search).get("next");
      window.location.href = next?.startsWith("/") ? next : loadOnboarding() ? "/roadmap" : "/start";
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-6 pt-4">
      <div className="space-y-2 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-gold-500">Your account</p>
        <h1 className="font-serif text-4xl">{step === "email" ? "Sign in or create an account" : "Check your email"}</h1>
        <p className="text-graphite-400">
          {step === "email" ? "No password needed. We'll email you a 6-digit code." : `We sent a code to ${email}. It expires in 10 minutes.`}
        </p>
      </div>

      <form
        className="space-y-4 rounded-xl border border-graphite-800 bg-graphite-950/70 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          void (step === "email" ? request() : verify());
        }}
      >
        {step === "email" ? (
          <label className="block space-y-1 text-sm text-graphite-300">
            Email
            <input type="email" autoFocus autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={input} />
          </label>
        ) : (
          <label className="block space-y-1 text-sm text-graphite-300">
            6-digit code
            <input
              autoFocus
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className={`${input} text-center font-mono text-2xl tracking-[0.5em]`}
            />
            {devCode && <span className="block text-xs text-graphite-400">Development mode (no email configured): your code is {devCode}</span>}
          </label>
        )}
        {error && <p className="text-sm text-signal-amber">{error}</p>}
        <button type="submit" disabled={busy || (step === "email" ? !email : code.length !== 6)} className={`${primaryButton} w-full`}>
          {busy ? "One moment…" : step === "email" ? "Email me a code" : "Sign in"}
        </button>
        {step === "code" && (
          <div className="flex justify-between text-sm">
            <button type="button" onClick={() => setStep("email")} className="text-graphite-400 underline-offset-4 hover:underline">
              Use a different email
            </button>
            <button type="button" disabled={busy} onClick={() => void request()} className={`${secondaryButton} px-3 py-1 text-xs`}>
              Resend code
            </button>
          </div>
        )}
      </form>
      <p className="text-center text-xs leading-relaxed text-graphite-400">
        Signing in saves your plan, CV, answers and progress to your account so they follow you to any device. You can delete your account and all its data at any
        time from the account menu.
      </p>
    </div>
  );
}
