import { currentUser, getUserData, MAX_DATA_BYTES, putUserData } from "@/lib/auth";

/** GET: my synced data. PUT {data}: replace it with this browser's snapshot. */
export async function GET(req: Request) {
  const user = await currentUser(req);
  if (!user) return Response.json({ error: "Not signed in." }, { status: 401 });
  return Response.json((await getUserData(user.id)) ?? { data: null, updatedAt: null }, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(req: Request) {
  const user = await currentUser(req);
  if (!user) return Response.json({ error: "Not signed in." }, { status: 401 });
  const raw = await req.text();
  if (raw.length > MAX_DATA_BYTES + 10_000) return Response.json({ error: "Too large to sync." }, { status: 413 });
  try {
    const { data } = JSON.parse(raw) as { data?: Record<string, string> };
    if (!data || typeof data !== "object") return Response.json({ error: "Missing data." }, { status: 400 });
    const rec = await putUserData(user.id, data);
    return Response.json({ updatedAt: rec.updatedAt });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
