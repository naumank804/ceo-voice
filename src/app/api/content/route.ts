import { listSections, listTopics } from "@/lib/content-store";

/** Public: published Topic Library content for the practice app. */
export async function GET() {
  try {
    const [topics, sections] = await Promise.all([listTopics(), listSections()]);
    return Response.json(
      { sections, topics: topics.filter((t) => t.published) },
      { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=300" } },
    );
  } catch (err) {
    console.error("[content] library unavailable:", (err as Error).message);
    return Response.json({ sections: [], topics: [] });
  }
}
