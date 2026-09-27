import { NextResponse } from "next/server";
import { CLASSIC_BOOKS, extractParagraphs, type Passage } from "@/lib/library";

/** Paragraphs per book, kept for the life of the server so each book is downloaded once. */
const cache = new Map<number, string[]>();

async function paragraphsFor(id: number): Promise<string[]> {
  const hit = cache.get(id);
  if (hit) return hit;
  const res = await fetch(`https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Gutenberg responded ${res.status}`);
  const paragraphs = extractParagraphs(await res.text());
  cache.set(id, paragraphs);
  return paragraphs;
}

/** GET /api/library/passage?book=2680 → a random speakable paragraph from that public-domain book. */
export async function GET(req: Request) {
  const id = Number(new URL(req.url).searchParams.get("book"));
  // Allow-list only: this route must never become a general-purpose fetch proxy.
  const book = CLASSIC_BOOKS.find((b) => b.id === id);
  if (!book) return NextResponse.json({ error: "Unknown book" }, { status: 400 });

  try {
    const paragraphs = await paragraphsFor(id);
    if (!paragraphs.length) throw new Error("No usable paragraphs");
    const passage: Passage = {
      text: paragraphs[Math.floor(Math.random() * paragraphs.length)],
      bookId: id,
      title: book.title,
      author: book.author,
      url: `https://www.gutenberg.org/ebooks/${id}`,
    };
    return NextResponse.json(passage);
  } catch (err) {
    console.warn("[library] passage fetch failed:", (err as Error).message);
    return NextResponse.json({ error: "Couldn't reach Project Gutenberg. Check your internet connection." }, { status: 502 });
  }
}
