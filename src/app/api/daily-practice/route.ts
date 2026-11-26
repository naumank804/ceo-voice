import { listTopics } from "@/lib/content-store";
import { dailyPlan, renderDailyEmail } from "@/lib/daily-email";
import { libraryCard } from "@/lib/leadership";

// Called once a day by Vercel Schedules (see vercel.json). The route is public, so
// every request must carry the CRON_SECRET that Vercel sends as a bearer token.
//   GET                → send today's email
//   GET ?preview=1     → return today's email as HTML without sending (still needs the secret)

const APP_URL = process.env.APP_URL || "https://ceo-voice-iota.vercel.app";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Published Topic Library topics join the rotation; the email still sends if the database is down.
  const library = await listTopics()
    .then((ts) => ts.filter((t) => t.published).map(libraryCard))
    .catch(() => []);
  const plan = dailyPlan(new Date(), "America/Toronto", library);
  const email = renderDailyEmail(plan, APP_URL);
  if (new URL(request.url).searchParams.get("preview")) {
    return new Response(email.html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  const key = process.env.RESEND_API_KEY;
  const to = process.env.DAILY_EMAIL_TO;
  if (!key || !to) return Response.json({ error: "RESEND_API_KEY and DAILY_EMAIL_TO must be set" }, { status: 500 });

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      // A schedule can deliver the same run twice; one email per day, no matter what.
      "Idempotency-Key": `daily-practice-${plan.date}`,
    },
    body: JSON.stringify({
      from: process.env.DAILY_EMAIL_FROM || "CEO Voice Coach <coach@mail.aiforbasicpeople.com>",
      to: to.split(",").map((s) => s.trim()),
      subject: email.subject,
      html: email.html,
      text: email.text,
    }),
  });

  if (!res.ok) {
    console.error("[daily-practice] Resend error", res.status, await res.text());
    return Response.json({ error: "Email provider rejected the request" }, { status: 502 });
  }
  console.log(`[daily-practice] sent for ${plan.date}`);
  return Response.json({ sent: true, date: plan.date });
}
