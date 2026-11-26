import { checkCode, createSession, findOrCreateUser, normaliseEmail, sessionCookie } from "@/lib/auth";

/** POST {email, code}: sign in (creating the account on first sign-in). */
export async function POST(req: Request) {
  const { email: raw, code } = (await req.json().catch(() => ({}))) as { email?: unknown; code?: unknown };
  const email = normaliseEmail(raw);
  if (!email) return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  try {
    if (!(await checkCode(email, code))) return Response.json({ error: "That code is wrong or has expired." }, { status: 401 });
    const user = await findOrCreateUser(email);
    const token = await createSession(user.id);
    return Response.json({ user }, { headers: { "Set-Cookie": sessionCookie(token) } });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
