import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { Redis } from "@upstash/redis";

// Learner accounts: passwordless sign-in with a 6-digit email code.
// Users, codes, sessions and synced data live in Upstash Redis. Server-only.

export interface User {
  id: string;
  email: string;
  createdAt: string;
}

const P = "ceo-voice:acct";
const CODE_TTL = 10 * 60;
const SESSION_TTL = 30 * 24 * 60 * 60;
const MAX_ATTEMPTS = 5;
const MAX_SENDS_PER_HOUR = 5;
export const SESSION_COOKIE = "cv_session";

let client: Redis | null | undefined;
function redis(): Redis {
  if (client === undefined) {
    const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
    client = url && token ? new Redis({ url, token }) : null;
  }
  if (!client) throw new Error("Accounts aren't available: the database isn't connected.");
  return client;
}

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

export function normaliseEmail(raw: unknown): string | null {
  const e = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  return /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/.test(e) ? e : null;
}

/** Creates and stores a code; returns it for emailing. Throws when the sender is rate-limited. */
export async function issueCode(email: string): Promise<string> {
  const r = redis();
  const cooldown = await r.set(`${P}:cooldown:${email}`, 1, { nx: true, ex: 45 });
  if (cooldown === null) throw new Error("A code was just sent. Please wait a moment before asking again.");
  const sends = await r.incr(`${P}:sends:${email}`);
  if (sends === 1) await r.expire(`${P}:sends:${email}`, 3600);
  if (sends > MAX_SENDS_PER_HOUR) throw new Error("Too many codes requested. Try again in an hour.");
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await r.set(`${P}:code:${email}`, { hash: sha(`${email}:${code}`), attempts: 0 }, { ex: CODE_TTL });
  return code;
}

/** Checks a code; on success the code is consumed. */
export async function checkCode(email: string, code: unknown): Promise<boolean> {
  const r = redis();
  const key = `${P}:code:${email}`;
  const rec = await r.get<{ hash: string; attempts: number }>(key);
  if (!rec || typeof code !== "string" || !/^\d{6}$/.test(code.trim())) return false;
  if (rec.attempts >= MAX_ATTEMPTS) {
    await r.del(key);
    return false;
  }
  const a = Buffer.from(rec.hash);
  const b = Buffer.from(sha(`${email}:${code.trim()}`));
  if (a.length === b.length && timingSafeEqual(a, b)) {
    await r.del(key);
    return true;
  }
  const ttl = await r.ttl(key);
  await r.set(key, { ...rec, attempts: rec.attempts + 1 }, { ex: Math.max(1, ttl) });
  return false;
}

export async function findOrCreateUser(email: string): Promise<User> {
  const r = redis();
  const existing = await r.get<string>(`${P}:email:${email}`);
  if (existing) {
    const u = await r.get<User>(`${P}:user:${existing}`);
    if (u) return u;
  }
  const user: User = { id: randomBytes(12).toString("hex"), email, createdAt: new Date().toISOString() };
  await r.set(`${P}:user:${user.id}`, user);
  await r.set(`${P}:email:${email}`, user.id);
  return user;
}

/** The user id for an email, without creating an account. */
export async function findUserId(email: string): Promise<string | null> {
  return (await redis().get<string>(`${P}:email:${email}`)) ?? null;
}

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await redis().set(`${P}:session:${sha(token)}`, userId, { ex: SESSION_TTL });
  return token;
}

function tokenFrom(req: Request): string | null {
  const cookie = req.headers.get("cookie") ?? "";
  const v = cookie
    .split(/;\s*/)
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);
  return v || null;
}

export async function currentUser(req: Request): Promise<User | null> {
  const token = tokenFrom(req);
  if (!token) return null;
  try {
    const r = redis();
    const id = await r.get<string>(`${P}:session:${sha(token)}`);
    return id ? ((await r.get<User>(`${P}:user:${id}`)) ?? null) : null;
  } catch {
    return null;
  }
}

export async function endSession(req: Request): Promise<void> {
  const token = tokenFrom(req);
  if (token) await redis().del(`${P}:session:${sha(token)}`);
}

export function sessionCookie(token: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL}${secure}`;
}

export const clearedSessionCookie = () => `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;

// ── Synced learner data: a snapshot of the app's ceo-voice.* browser storage ─────────

export interface UserData {
  data: Record<string, string>;
  updatedAt: string;
}

export const MAX_DATA_BYTES = 900_000;

export async function getUserData(userId: string): Promise<UserData | null> {
  return (await redis().get<UserData>(`${P}:data:${userId}`)) ?? null;
}

export async function putUserData(userId: string, data: Record<string, string>): Promise<UserData> {
  const clean: Record<string, string> = {};
  for (const [k, v] of Object.entries(data)) if (k.startsWith("ceo-voice.") && typeof v === "string") clean[k] = v;
  if (JSON.stringify(clean).length > MAX_DATA_BYTES) throw new Error("Your saved data is too large to sync.");
  const rec: UserData = { data: clean, updatedAt: new Date().toISOString() };
  await redis().set(`${P}:data:${userId}`, rec);
  return rec;
}

/** Deletes the account, its data and its email mapping. Sessions expire on their own. */
export async function deleteAccount(user: User): Promise<void> {
  const r = redis();
  await r.del(`${P}:data:${user.id}`, `${P}:user:${user.id}`, `${P}:email:${user.email}`);
}
