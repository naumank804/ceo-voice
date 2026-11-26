import { adminConfigured, isAdmin, loginCookie, logoutCookie, passwordOk } from "@/lib/admin-auth";
import { storeConfigured } from "@/lib/content-store";

/** GET: am I logged in, and is everything configured? */
export async function GET(req: Request) {
  return Response.json({ admin: isAdmin(req), passwordSet: adminConfigured(), store: storeConfigured() });
}

/** POST {password}: log in. */
export async function POST(req: Request) {
  const { password } = (await req.json().catch(() => ({}))) as { password?: unknown };
  if (!adminConfigured()) return Response.json({ error: "ADMIN_PASSWORD isn't set on the server yet." }, { status: 503 });
  if (!passwordOk(password)) {
    // Slow down guessing.
    await new Promise((r) => setTimeout(r, 800));
    return Response.json({ error: "Wrong password." }, { status: 401 });
  }
  return Response.json({ admin: true }, { headers: { "Set-Cookie": loginCookie() } });
}

/** DELETE: log out. */
export async function DELETE() {
  return Response.json({ admin: false }, { headers: { "Set-Cookie": logoutCookie() } });
}
