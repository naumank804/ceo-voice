import type { GrammarCorrection } from "./types";
import { FILLER_PATTERNS, WEAK_PHRASES } from "./speech-metrics";

export type Segment =
  | { kind: "text"; text: string }
  | { kind: "correction"; text: string; correction: GrammarCorrection }
  | { kind: "filler"; text: string }
  | { kind: "weak"; text: string };

interface Range { start: number; end: number; seg: Exclude<Segment, { kind: "text" }> }

/** Split a transcript into plain text and annotated spans. Corrections win over fillers/hedges when they overlap. */
export function segmentTranscript(transcript: string, corrections: GrammarCorrection[]): Segment[] {
  const lower = transcript.toLowerCase();
  const ranges: Range[] = [];

  for (const c of corrections) {
    const needle = c.original.toLowerCase();
    let i = lower.indexOf(needle);
    while (i !== -1 && needle) {
      ranges.push({ start: i, end: i + needle.length, seg: { kind: "correction", text: transcript.slice(i, i + needle.length), correction: c } });
      i = lower.indexOf(needle, i + needle.length);
    }
  }
  for (const re of Object.values(FILLER_PATTERNS)) {
    for (const m of transcript.matchAll(new RegExp(re.source, "gi"))) {
      ranges.push({ start: m.index, end: m.index + m[0].length, seg: { kind: "filler", text: m[0] } });
    }
  }
  for (const p of WEAK_PHRASES) {
    for (const m of transcript.matchAll(new RegExp(`\\b${p.replace(/'/g, "'")}\\b`, "gi"))) {
      ranges.push({ start: m.index, end: m.index + m[0].length, seg: { kind: "weak", text: m[0] } });
    }
  }

  const priority = { correction: 0, filler: 1, weak: 2 } as const;
  ranges.sort((a, b) => a.start - b.start || priority[a.seg.kind] - priority[b.seg.kind]);

  const out: Segment[] = [];
  let cursor = 0;
  for (const r of ranges) {
    if (r.start < cursor) continue; // overlaps a higher-priority / earlier span
    if (r.start > cursor) out.push({ kind: "text", text: transcript.slice(cursor, r.start) });
    out.push(r.seg);
    cursor = r.end;
  }
  if (cursor < transcript.length) out.push({ kind: "text", text: transcript.slice(cursor) });
  return out;
}
