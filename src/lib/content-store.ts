import { Redis } from "@upstash/redis";
import { type CareerLevel, type ContentKind, LEVELS, stageById, stageFromSection, trackOf } from "./curriculum";

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
  /** Curriculum placement (see lib/curriculum.ts). */
  track: string;
  stage: string;
  kind: ContentKind;
  /** For interview questions: the question exactly as an interviewer asks it. */
  question: string;
  /** Leadership levels this suits; empty = all levels. */
  levels: CareerLevel[];
  difficulty: 1 | 2 | 3;
  /** Where the content came from, and whether we may use it commercially. */
  sourceName: string;
  sourceUrl: string;
  license: "original" | "licensed" | "public-domain" | "cc" | "unknown";
  /** Display group: the stage name. Kept for older clients. */
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

/** Topics saved before the curriculum existed get a stage from their old section. */
function upgrade(t: LibraryTopic): LibraryTopic {
  if (t.stage && stageById(t.stage)) return t;
  const stage = stageFromSection(t.section);
  return {
    ...t,
    stage,
    track: trackOf(stage)?.id ?? "mindset",
    kind: t.kind ?? "talk",
    question: t.question ?? "",
    levels: t.levels ?? [],
    difficulty: t.difficulty ?? 1,
    sourceName: t.sourceName ?? "",
    sourceUrl: t.sourceUrl ?? "",
    license: t.license ?? "unknown",
    section: stageById(stage)?.name ?? t.section,
  };
}

export async function listTopics(): Promise<LibraryTopic[]> {
  const r = redis();
  if (!r) return [];
  const all = (await r.hgetall<Record<string, LibraryTopic>>(TOPICS)) ?? {};
  return Object.values(all)
    .map(upgrade)
    .sort((a, b) => a.stage.localeCompare(b.stage) || b.createdAt.localeCompare(a.createdAt));
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
  const stage = stageById(str(raw.stage, 40));
  const track = trackOf(stage?.id);
  if (!title) throw new Error("Give the item a title.");
  if (!stage || !track) throw new Error("Choose a track and a stage.");
  const kind: ContentKind = raw.kind === "question" ? "question" : "talk";
  const question = str(raw.question, 400);
  if (kind === "question" && !question) throw new Error("Write the interview question.");
  const levelIds = LEVELS.map((l) => l.id);
  const licenses = ["original", "licensed", "public-domain", "cc", "unknown"] as const;
  if (pillars.length !== 3) throw new Error("A topic needs exactly three pillars, each with a key word and text.");
  const now = new Date().toISOString();
  return {
    id: existing?.id ?? `lib-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    track: track.id,
    stage: stage.id,
    kind,
    question,
    levels: (Array.isArray(raw.levels) ? raw.levels : []).filter((l): l is CareerLevel => levelIds.includes(l as CareerLevel)),
    difficulty: raw.difficulty === 2 || raw.difficulty === 3 ? raw.difficulty : 1,
    sourceName: str(raw.sourceName, 120),
    sourceUrl: str(raw.sourceUrl, 300),
    license: licenses.includes(raw.license as (typeof licenses)[number]) ? (raw.license as LibraryTopic["license"]) : "unknown",
    section: stage.name,
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
  const t = await need().hget<LibraryTopic>(TOPICS, id);
  return t ? upgrade(t) : null;
}

export async function saveTopic(t: LibraryTopic): Promise<LibraryTopic> {
  await need().hset(TOPICS, { [t.id]: t });
  return t;
}

export async function deleteTopic(id: string): Promise<void> {
  await need().hdel(TOPICS, id);
}
