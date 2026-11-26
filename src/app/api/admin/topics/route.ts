import { isAdmin, unauthorized } from "@/lib/admin-auth";
import { cleanTopic, deleteTopic, getTopic, type LibraryTopic, listSections, listTopics, saveSections, saveTopic } from "@/lib/content-store";

// Admin CRUD for the Topic Library. Every method requires the admin cookie.

const fail = (e: unknown, status = 400) => Response.json({ error: e instanceof Error ? e.message : "Something went wrong." }, { status });

/** GET: every topic (drafts included) and the sections. */
export async function GET(req: Request) {
  if (!isAdmin(req)) return unauthorized();
  try {
    const [topics, sections] = await Promise.all([listTopics(), listSections()]);
    return Response.json({ topics, sections });
  } catch (e) {
    return fail(e, 500);
  }
}

/** POST: create a topic. PUT: update one (body.id). A new section name is added automatically. */
async function upsert(req: Request, isNew: boolean) {
  if (!isAdmin(req)) return unauthorized();
  try {
    const body = (await req.json()) as Partial<LibraryTopic>;
    const existing = isNew ? undefined : body.id ? ((await getTopic(body.id)) ?? undefined) : undefined;
    if (!isNew && !existing) return fail(new Error("That topic no longer exists."), 404);
    const topic = await saveTopic(cleanTopic(body, existing));
    const sections = await listSections();
    if (!sections.includes(topic.section)) await saveSections([...sections, topic.section]);
    return Response.json({ topic });
  } catch (e) {
    return fail(e);
  }
}

export const POST = (req: Request) => upsert(req, true);
export const PUT = (req: Request) => upsert(req, false);

/** DELETE ?id=… */
export async function DELETE(req: Request) {
  if (!isAdmin(req)) return unauthorized();
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return fail(new Error("Missing id."));
  try {
    await deleteTopic(id);
    return Response.json({ deleted: id });
  } catch (e) {
    return fail(e, 500);
  }
}

/** PATCH {sections}: rename / reorder / remove sections. */
export async function PATCH(req: Request) {
  if (!isAdmin(req)) return unauthorized();
  try {
    const { sections } = (await req.json()) as { sections?: string[] };
    return Response.json({ sections: await saveSections(Array.isArray(sections) ? sections.map(String) : []) });
  } catch (e) {
    return fail(e);
  }
}
