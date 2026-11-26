"use client";

import { useEffect, useState } from "react";

// Client side of accounts: who is signed in, and syncing this browser's ceo-voice.* storage
// with the account so progress follows the learner across devices.

export interface AccountUser {
  id: string;
  email: string;
}

const PREFIX = "ceo-voice.";
/** Sync bookkeeping lives outside the ceo-voice.* namespace so it never syncs itself. */
const META = "cv-sync-meta";
const EVENT = "ceo-voice:account";

interface Meta {
  userId: string;
  hash: string;
  syncedAt: string;
}

function readMeta(): Meta | null {
  try {
    return JSON.parse(localStorage.getItem(META) ?? "null") as Meta | null;
  } catch {
    return null;
  }
}

function writeMeta(m: Meta | null) {
  try {
    if (m) localStorage.setItem(META, JSON.stringify(m));
    else localStorage.removeItem(META);
  } catch {
    /* ignore */
  }
}

export function snapshot(): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(PREFIX) && k !== "ceo-voice.theme") out[k] = localStorage.getItem(k) ?? "";
  }
  return out;
}

function hashOf(data: Record<string, string>): string {
  const s = JSON.stringify(Object.keys(data).sort().map((k) => [k, data[k]]));
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return `${s.length}:${h}`;
}

function clearLocal() {
  for (const k of Object.keys(snapshot())) localStorage.removeItem(k);
}

function restore(data: Record<string, string>) {
  clearLocal();
  for (const [k, v] of Object.entries(data)) if (k.startsWith(PREFIX)) localStorage.setItem(k, v);
}

export async function fetchMe(): Promise<AccountUser | null> {
  try {
    const r = await fetch("/api/auth/me", { cache: "no-store" });
    return ((await r.json()) as { user: AccountUser | null }).user;
  } catch {
    return null;
  }
}

async function push(userId: string): Promise<void> {
  const data = snapshot();
  const hash = hashOf(data);
  if (readMeta()?.hash === hash && readMeta()?.userId === userId) return;
  const r = await fetch("/api/me/data", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data }) });
  if (r.ok) writeMeta({ userId, hash, syncedAt: ((await r.json()) as { updatedAt: string }).updatedAt });
}

/**
 * Right after sign-in: the account's saved data wins if it has any. If the account is new,
 * this browser's practice so far moves into it, unless that data belonged to a different account.
 * Returns true when the page should reload to pick up restored data.
 */
export async function afterSignIn(user: AccountUser): Promise<boolean> {
  const r = await fetch("/api/me/data", { cache: "no-store" });
  const server = (await r.json()) as { data: Record<string, string> | null; updatedAt: string | null };
  const meta = readMeta();
  if (server.data && Object.keys(server.data).length) {
    restore(server.data);
    writeMeta({ userId: user.id, hash: hashOf(snapshot()), syncedAt: server.updatedAt ?? new Date().toISOString() });
    window.dispatchEvent(new Event(EVENT));
    return true;
  }
  if (meta && meta.userId !== user.id) clearLocal();
  await push(user.id);
  window.dispatchEvent(new Event(EVENT));
  return false;
}

/** Signing out also clears this browser, so the next person on a shared computer starts clean. */
export async function signOut(): Promise<void> {
  const me = await fetchMe();
  if (me) await push(me.id).catch(() => {});
  await fetch("/api/auth/me", { method: "POST" });
  clearLocal();
  writeMeta(null);
  window.dispatchEvent(new Event(EVENT));
}

export async function deleteMyAccount(): Promise<void> {
  const r = await fetch("/api/auth/me", { method: "DELETE" });
  if (!r.ok) throw new Error("Couldn't delete the account. Try again.");
  clearLocal();
  writeMeta(null);
  window.dispatchEvent(new Event(EVENT));
}

/** The signed-in user (null when signed out, undefined while loading). */
export function useAccount(): AccountUser | null | undefined {
  const [user, setUser] = useState<AccountUser | null | undefined>(undefined);
  useEffect(() => {
    const load = () => void fetchMe().then(setUser);
    load();
    window.addEventListener(EVENT, load);
    return () => window.removeEventListener(EVENT, load);
  }, []);
  return user;
}

/** While signed in, upload changes every few seconds and when the tab is hidden. */
export function useAutoSync(user: AccountUser | null | undefined) {
  useEffect(() => {
    if (!user) return;
    let busy = false;
    const tick = async () => {
      if (busy) return;
      busy = true;
      try {
        await push(user.id);
      } catch {
        /* offline: retry next tick */
      } finally {
        busy = false;
      }
    };
    const id = window.setInterval(tick, 8000);
    const onHide = () => document.visibilityState === "hidden" && void tick();
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [user]);
}
