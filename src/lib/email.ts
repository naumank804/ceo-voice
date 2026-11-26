// Transactional email through the Resend REST API (same account as the daily practice email).

export const EMAIL_FROM = process.env.DAILY_EMAIL_FROM || "CEO Voice Coach <coach@mail.aiforbasicpeople.com>";

export const emailConfigured = () => Boolean(process.env.RESEND_API_KEY);

export async function sendEmail(msg: { to: string; subject: string; html: string; text: string; idempotencyKey?: string }): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("Email isn't configured (RESEND_API_KEY).");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(msg.idempotencyKey ? { "Idempotency-Key": msg.idempotencyKey } : {}),
    },
    body: JSON.stringify({ from: EMAIL_FROM, to: [msg.to], subject: msg.subject, html: msg.html, text: msg.text }),
  });
  if (!res.ok) {
    console.error("[email] Resend error", res.status, await res.text());
    throw new Error("The email couldn't be sent. Try again in a minute.");
  }
}
