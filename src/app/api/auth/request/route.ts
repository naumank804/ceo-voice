import { issueCode, normaliseEmail } from "@/lib/auth";
import { emailConfigured, sendEmail } from "@/lib/email";

/** POST {email}: email a 6-digit sign-in code. */
export async function POST(req: Request) {
  const { email: raw } = (await req.json().catch(() => ({}))) as { email?: unknown };
  const email = normaliseEmail(raw);
  if (!email) return Response.json({ error: "Enter a valid email address." }, { status: 400 });

  let code: string;
  try {
    code = await issueCode(email);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 429 });
  }

  // Local development without email: show the code on screen instead. Never in production.
  if (!emailConfigured() && process.env.NODE_ENV !== "production") return Response.json({ sent: true, devCode: code });

  try {
    await sendEmail({
      to: email,
      subject: `${code} is your CEO Voice sign-in code`,
      text: `Your sign-in code is ${code}\n\nIt expires in 10 minutes. If you didn't ask for it, you can ignore this email.`,
      html: `<div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1d2433">
  <div style="font-family:Georgia,serif;font-size:22px">The CEO <span style="color:#9a7b2f">Voice</span></div>
  <p style="font-size:15px;color:#444;margin:20px 0 8px">Your sign-in code:</p>
  <div style="font-size:34px;letter-spacing:8px;font-weight:700;font-family:Menlo,Consolas,monospace">${code}</div>
  <p style="font-size:13px;color:#777;margin-top:20px">It expires in 10 minutes. If you didn't ask for it, you can ignore this email.</p>
</div>`,
    });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
  return Response.json({ sent: true });
}
