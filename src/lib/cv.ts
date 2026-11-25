import type { AnswerCard, CvFact } from "./leadership";
import { pickAnchors } from "./stage";

// ── Reading a .docx in the browser ──────────────────────────────────────────
//
// A .docx is a zip; the text lives in word/document.xml. Reading it here keeps
// the CV on the user's device: it is never uploaded or stored on a server.

async function inflateRaw(data: Uint8Array): Promise<string> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Response(stream).text();
}

async function readZipEntry(buf: Uint8Array, wanted: string): Promise<string> {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65_557); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("This doesn't look like a Word (.docx) file.");
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const dec = new TextDecoder();
  for (let n = 0; n < count && dv.getUint32(p, true) === 0x02014b50; n++) {
    const method = dv.getUint16(p + 10, true);
    const size = dv.getUint32(p + 20, true);
    const nameLen = dv.getUint16(p + 28, true);
    const extraLen = dv.getUint16(p + 30, true);
    const commentLen = dv.getUint16(p + 32, true);
    const local = dv.getUint32(p + 42, true);
    const name = dec.decode(buf.subarray(p + 46, p + 46 + nameLen));
    if (name === wanted) {
      const start = local + 30 + dv.getUint16(local + 26, true) + dv.getUint16(local + 28, true);
      const data = buf.subarray(start, start + size);
      if (method === 0) return dec.decode(data);
      if (method === 8) return inflateRaw(data);
      throw new Error("Unsupported compression in this .docx file.");
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  throw new Error("No document text found in this file.");
}

/** Returns the CV as lines; bullet points are prefixed with "• ". */
export async function readDocx(file: File): Promise<string[]> {
  const xml = await readZipEntry(new Uint8Array(await file.arrayBuffer()), "word/document.xml");
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const lines: string[] = [];
  for (const para of Array.from(doc.getElementsByTagName("w:p"))) {
    let text = "";
    for (const node of Array.from(para.getElementsByTagName("*"))) {
      if (node.tagName === "w:t") text += node.textContent ?? "";
      else if (node.tagName === "w:tab") text += " ";
      else if (node.tagName === "w:br") text += " ";
    }
    text = text.replace(/\s+/g, " ").trim();
    if (!text) continue;
    const bullet = para.getElementsByTagName("w:numPr").length > 0;
    lines.push(bullet ? `• ${text}` : text);
  }
  return lines;
}

export function linesFromText(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*[-*•●▪]\s+/, "• ").replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

// ── Reading the structure ───────────────────────────────────────────────────

export type LineKind = "name" | "heading" | "role" | "bullet" | "text";

const DATE_RE = /\b(19|20)\d{2}\b|\b\d{2}\/\d{4}\b|present/i;

export function lineKind(line: string, index: number): LineKind {
  if (index === 0) return "name";
  if (line.startsWith("• ")) return "bullet";
  const letters = line.replace(/[^A-Za-z]/g, "");
  if (letters.length >= 4 && letters === letters.toUpperCase() && line.length < 70) return "heading";
  if (line.length < 140 && DATE_RE.test(line) && !/[.]$/.test(line)) return "role";
  // "Employer | City" lines under a job title.
  if (line.length < 80 && line.includes(" | ") && !/[.]$/.test(line)) return "role";
  return "text";
}

/** Numbers an interviewer will ask about: money, percentages, team sizes, counts. */
export const NUMBER_RE =
  /(\$\s?\d[\d,.]*\s?(?:[MKB]|million|billion)?\+?(?:\s?[–-]\s?\$?\d[\d,.]*\s?[MKB]?)?|\b\d+(?:\.\d+)?\s?%|\b\d+\s?[–-]\s?\d+\s(?:members|people|stakeholders)|\b\d+\+?\s(?:years|production releases|releases|airlines|pillars|phases|strategies)\b)/gi;

export function hasNumber(line: string) {
  NUMBER_RE.lastIndex = 0;
  return NUMBER_RE.test(line);
}

/** CV questions whose phrases appear in this line. */
export function questionsForLine(line: string, cards: AnswerCard[]): AnswerCard[] {
  const lower = line.toLowerCase();
  return cards.filter((c) => c.cvMatch?.some((m) => m.trim().length > 2 && lower.includes(m.toLowerCase())));
}

// ── The CV prep pack ────────────────────────────────────────────────────────

export interface CvPackQuestion {
  topic: string;
  question: string;
  cvMatch: string[];
  opening: string;
  pillars: { key: string; tag: string; text: string }[];
  close: string;
}

export interface CvPack {
  questions: CvPackQuestion[];
  facts: { q: string; a: string }[];
}

export function packToCards(pack: CvPack): { cards: AnswerCard[]; facts: CvFact[] } {
  const stamp = Date.now().toString(36);
  const cards = pack.questions.map(
    (q, i): AnswerCard => ({
      id: `cv-${stamp}-${i}`,
      category: "CV",
      topic: q.topic,
      question: q.question,
      opening: q.opening,
      pillars: q.pillars.slice(0, 3).map((p) => ({
        key: p.key,
        tag: p.tag,
        title: p.key,
        text: p.text,
        cues: [p.key, ...p.tag.split(/[\s/,·]+/)].map((w) => w.trim()).filter((w) => w.length > 2),
      })),
      close: q.close,
      cvMatch: q.cvMatch,
      custom: true,
    }),
  );
  const facts = pack.facts.map((f, i) => ({ id: `fact-${stamp}-${i}`, q: f.q, a: f.a }));
  return { cards, facts };
}

export function isPack(raw: unknown): raw is CvPack {
  const r = raw as CvPack;
  return Array.isArray(r?.questions) && Array.isArray(r?.facts);
}

/** Keeps only well-formed questions and facts from an untrusted pack. */
export function cleanPack(raw: unknown): CvPack | null {
  if (!isPack(raw)) return null;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const questions = raw.questions
    .map((q) => ({
      topic: str(q?.topic),
      question: str(q?.question),
      cvMatch: Array.isArray(q?.cvMatch) ? q.cvMatch.map(str).filter(Boolean).slice(0, 6) : [],
      opening: str(q?.opening),
      pillars: Array.isArray(q?.pillars) ? q.pillars.map((p) => ({ key: str(p?.key), tag: str(p?.tag), text: str(p?.text) })).filter((p) => p.key && p.text) : [],
      close: str(q?.close),
    }))
    .filter((q) => q.question && q.pillars.length === 3)
    .slice(0, 25);
  const facts = raw.facts.map((f) => ({ q: str(f?.q), a: str(f?.a) })).filter((f) => f.q && f.a).slice(0, 40);
  return questions.length || facts.length ? { questions, facts } : null;
}

const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);
const ORD = ["First", "Second", "Third"];

/**
 * Offline fallback: one "walk me through" question per role (built from its strongest bullets),
 * plus a recall fact for every number in the CV.
 */
export function offlineCvPack(lines: string[]): CvPack {
  const questions: CvPackQuestion[] = [];
  const facts: { q: string; a: string }[] = [];
  let role: string | null = null;
  let bullets: string[] = [];

  const flush = () => {
    if (!role || bullets.length < 3) return;
    const ranked = [...bullets].sort((a, b) => Number(hasNumber(b)) - Number(hasNumber(a)) || b.length - a.length).slice(0, 3);
    const title = role.split(/[|–-]/)[0].replace(DATE_RE, "").trim().slice(0, 60);
    questions.push({
      topic: title,
      question: `Walk me through your role as ${title}. What did you deliver?`,
      cvMatch: [title],
      opening: `In my role as ${title}, I focused on three things.`,
      pillars: ranked.map((b, i) => {
        const key = cap(pickAnchors(b, 1)[0] ?? `Point ${i + 1}`);
        return { key, tag: pickAnchors(b, 3).slice(1).map(cap).join(" · "), text: `${ORD[i]}, ${key}: ${b.replace(/^• /, "")}` };
      }),
      close: "That's the impact I'd bring to this role.",
    });
  };

  lines.forEach((line, i) => {
    const kind = lineKind(line, i);
    if (kind === "role") {
      flush();
      role = line;
      bullets = [];
    } else if (kind === "heading") {
      flush();
      role = null;
      bullets = [];
    } else if (role && (kind === "bullet" || kind === "text") && line.length > 40) bullets.push(line);

    NUMBER_RE.lastIndex = 0;
    for (const m of line.matchAll(NUMBER_RE)) {
      const blanked = line.replace(m[0], "____").replace(/^• /, "");
      if (facts.length < 30) facts.push({ q: blanked.length > 220 ? `${blanked.slice(0, 217)}…` : blanked, a: m[0].trim() });
    }
  });
  flush();
  return { questions: questions.slice(0, 12), facts };
}
