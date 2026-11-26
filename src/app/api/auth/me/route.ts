import { clearedSessionCookie, currentUser, deleteAccount, endSession } from "@/lib/auth";

/** GET: the signed-in user, or null. */
export async function GET(req: Request) {
  return Response.json({ user: await currentUser(req) }, { headers: { "Cache-Control": "no-store" } });
}

/** POST: sign out. */
export async function POST(req: Request) {
  await endSession(req).catch(() => {});
  return Response.json({ user: null }, { headers: { "Set-Cookie": clearedSessionCookie() } });
}

/** DELETE: delete my account and all its data. */
export async function DELETE(req: Request) {
  const user = await currentUser(req);
  if (!user) return Response.json({ error: "Not signed in." }, { status: 401 });
  await deleteAccount(user);
  await endSession(req).catch(() => {});
  return Response.json({ deleted: true }, { headers: { "Set-Cookie": clearedSessionCookie() } });
}
