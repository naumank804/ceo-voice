"use client";

import { useEffect, useState } from "react";

// "Your Executive Profile": who the user is, so every AI prompt, cheat code and model answer
// is written for their real background. Lives only in this browser's localStorage.

export interface ExecutiveProfile {
  name: string;
  role: string;
  industry: string;
  metrics: string;
}

export const PROFILE_KEY = "ceo-voice.profile";
const EVENT = "ceo-voice:profile";
const PREFIX = "ceo-voice.";

export const EMPTY_PROFILE: ExecutiveProfile = { name: "", role: "", industry: "", metrics: "" };

export function loadProfile(): ExecutiveProfile {
  try {
    const raw = JSON.parse(localStorage.getItem(PROFILE_KEY) ?? "null") as Partial<ExecutiveProfile> | null;
    return { ...EMPTY_PROFILE, ...(raw ?? {}) };
  } catch {
    return EMPTY_PROFILE;
  }
}

export function saveProfile(p: ExecutiveProfile) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function hasProfile(p: ExecutiveProfile) {
  return Boolean(p.role.trim() || p.industry.trim() || p.metrics.trim());
}

/** The profile as sent to the AI routes. Undefined when empty, so requests stay unchanged. */
export function profilePayload(): ExecutiveProfile | undefined {
  if (typeof window === "undefined") return undefined;
  const p = loadProfile();
  return hasProfile(p) || p.name.trim() ? p : undefined;
}

/** Live profile for components; updates when the drawer saves. */
export function useProfile(): ExecutiveProfile {
  const [p, setP] = useState<ExecutiveProfile>(EMPTY_PROFILE);
  useEffect(() => {
    const sync = () => setP(loadProfile());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return p;
}

// ── Backup: every ceo-voice.* key (profile, answers, CV, progress, settings) ────────────

export interface Backup {
  app: "ceo-voice";
  version: 1;
  exportedAt: string;
  data: Record<string, string>;
}

export function exportBackup(): Backup {
  const data: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(PREFIX)) data[k] = localStorage.getItem(k) ?? "";
  }
  return { app: "ceo-voice", version: 1, exportedAt: new Date().toISOString(), data };
}

/** Restores a backup. Returns how many items were restored; throws on a file that isn't ours. */
export function importBackup(raw: unknown): number {
  const b = raw as Partial<Backup>;
  if (b?.app !== "ceo-voice" || typeof b.data !== "object" || !b.data) throw new Error("This isn't a CEO Voice backup file.");
  let n = 0;
  for (const [k, v] of Object.entries(b.data)) {
    if (k.startsWith(PREFIX) && typeof v === "string") {
      localStorage.setItem(k, v);
      n++;
    }
  }
  window.dispatchEvent(new Event(EVENT));
  return n;
}
