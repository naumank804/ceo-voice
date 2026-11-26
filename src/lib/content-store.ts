import { Redis } from "@upstash/redis";

// Topic Library: topics added on the admin side, stored in Upstash Redis (Vercel Marketplace).
// Server-only. Every function degrades to "empty" when the database isn't connected,
// so the app keeps working offline / before setup.

export interface LibraryPillar {
  key: string;
  tag: string;
  text: string;
}

export interface LibraryTopic {
  id: string;
  section: string;
  title: string;
  /** The original passage, shown as "read the original text first". */
  text: string;
  opening: string;
  pillars: LibraryPillar[];
  close: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_SECTIONS = ["Motivation & Mindset"];

const TOPICS = "ceo-voice:library:topics";
const SECTIONS = "ceo-voice:library:sections";

let client: Redis | null | undefined;

function redis(): Redis | null {
  if (client !== undefined) return client;
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  client = url && token ? new Redis({ url, token }) : null;
  return client;
}

export const storeConfigured = () => redis() !== null;

function need(): Redis {
  const r = redis();
  if (!r) throw new Error("The content database isn't connected yet.");
  return r;
}

export async function listTopics(): Promise<LibraryTopic[]> {
  const r = redis();
  if (!r) return [];
  const all = (await r.hgetall<Record<string, LibraryTopic>>(TOPICS)) ?? {};
  return Object.values(all).sort((a, b) => a.section.localeCompare(b.section) || b.createdAt.localeCompare(a.createdAt));
}

export async function listSections(): Promise<string[]> {
  const r = redis();
  if (!r) return DEFAULT_SECTIONS;
  const saved = await r.get<string[]>(SECTIONS);
  return Array.isArray(saved) && saved.length ? saved : DEFAULT_SECTIONS;
}

export async function saveSections(sections: string[]): Promise<string[]> {
  const clean = [...new Set(sections.map((s) => s.trim().slice(0, 60)).filter(Boolean))].slice(0, 30);
  if (!clean.length) throw new Error("Keep at least one section.");
  await need().set(SECTIONS, clean);
  return clean;
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Validates untrusted input from the admin form into a topic. */
export function cleanTopic(raw: Partial<LibraryTopic>, existing?: LibraryTopic): LibraryTopic {
  const pillars = (Array.isArray(raw.pillars) ? raw.pillars : [])
    .map((p) => ({ key: str(p?.key, 40), tag: str(p?.tag, 80), text: str(p?.text, 600) }))
    .filter((p) => p.key && p.text)
    .slice(0, 3);
  const title = str(raw.title, 120);
  const section = str(raw.section, 60);
  if (!title) throw new Error("Give the topic a title.");
  if (!section) throw new Error("Choose a section.");
  if (pillars.length !== 3) throw new Error("A topic needs exactly three pillars, each with a key word and text.");
  const now = new Date().toISOString();
  return {
    id: existing?.id ?? `lib-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    section,
    title,
    text: str(raw.text, 20000),
    opening: str(raw.opening, 400),
    pillars,
    close: str(raw.close, 400),
    published: raw.published !== false,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

export async function getTopic(id: string): Promise<LibraryTopic | null> {
  return (await need().hget<LibraryTopic>(TOPICS, id)) ?? null;
}

export async function saveTopic(t: LibraryTopic): Promise<LibraryTopic> {
  await need().hset(TOPICS, { [t.id]: t });
  return t;
}

export async function deleteTopic(id: string): Promise<void> {
  await need().hdel(TOPICS, id);
}
