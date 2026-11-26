import { createHmac, timingSafeEqual } from "node:crypto";

// Admin access: one password in the ADMIN_PASSWORD env var. Logging in sets an httpOnly cookie
// holding an HMAC derived from that password, so changing the password logs every session out.

const COOKIE = "cv_admin";
const MAX_AGE = 60 * 60 * 24 * 30;

export const adminConfigured = () => Boolean(process.env.ADMIN_PASSWORD);

function token(): string | null {
  const pw = process.env.ADMIN_PASSWORD;
  return pw ? createHmac("sha256", pw).update("ceo-voice-admin-v1").digest("hex") : null;
}

function same(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function passwordOk(input: unknown): boolean {
  const pw = process.env.ADMIN_PASSWORD;
  return typeof input === "string" && !!pw && same(input, pw);
}

export function isAdmin(req: Request): boolean {
  const t = token();
  if (!t) return false;
  const cookie = req.headers.get("cookie") ?? "";
  const v = cookie
    .split(/;\s*/)
    .find((c) => c.startsWith(`${COOKIE}=`))
    ?.slice(COOKIE.length + 1);
  return !!v && same(v, t);
}

export function loginCookie(): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE}=${token()}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${MAX_AGE}${secure}`;
}

export function logoutCookie(): string {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;
}

export const unauthorized = () => Response.json({ error: "Please log in to the admin." }, { status: 401 });
