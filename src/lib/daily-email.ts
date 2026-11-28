import { BRIDGE_PHRASES, DEFAULT_CARDS, fillCompany, INTERVIEW_CATEGORIES, SPRINT_PROMPTS, type AnswerCard } from "./leadership";

// The daily 5-minute practice email. Content rotates by date, so every day is
// different and the same question comes back every few weeks (spaced repetition).

const HABITS: [string, string][] = [
  ["Answer in threes", "Opening line, then First, Second, Third, then a landing line. Your mind always knows what comes next."],
  ["Headline first", "Say the answer in one sentence, then the detail. Never build up to the point."],
  ["Pause, don't fill", "A two-second pause sounds like thinking. \"Um\" sounds lost. Breathe instead."],
  ["Numbers make it real", "Give every story one number: budget, percentage, team size, or time saved."],
  ["Land it and stop", "Finish with your landing line, then stay silent. Stopping cleanly shows confidence."],
  ["Slow is strong", "Speak 10% slower than feels natural. Calm pace reads as authority."],
  ["Own it", "Say \"I led\", \"I decided\", \"My recommendation is\". Drop \"I think maybe\"."],
];

export interface DailyPlan {
  date: string;
  dayNumber: number;
  interview: AnswerCard;
  craft: AnswerCard;
  sprint: string;
  habit: [string, string];
  bridge: { group: string; phrase: string };
}

function pick<T>(list: T[], day: number, salt: number): T {
  return list[(day * 7 + salt) % list.length];
}

/**
 * `library` = published Topic Library cards; they rotate into step 3 alongside leadership craft.
 * `own` = the reader's own interview answers (from their account); the built-in examples are the fallback.
 */
export function dailyPlan(now = new Date(), timeZone = "America/Toronto", library: AnswerCard[] = [], own: AnswerCard[] = []): DailyPlan {
  const date = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const day = Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000);
  const interview = own.length ? own : DEFAULT_CARDS.filter((c) => INTERVIEW_CATEGORIES.includes(c.category));
  const craft = [...DEFAULT_CARDS.filter((c) => c.category === "Craft"), ...library];
  const bridges = BRIDGE_PHRASES.flatMap((g) => g.phrases.map((phrase) => ({ group: g.group, phrase })));
  return {
    date,
    dayNumber: day,
    // Consecutive days walk through every question before repeating.
    interview: interview[day % interview.length],
    craft: craft[day % craft.length],
    sprint: pick(SPRINT_PROMPTS, day, 3),
    habit: HABITS[day % HABITS.length],
    bridge: pick(bridges, day, 5),
  };
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const neutral = (s: string) => fillCompany(s, "");
const keys = (c: AnswerCard) => c.pillars.map((p) => p.key).join(" | ");

function pillarsHtml(c: AnswerCard) {
  return c.pillars
    .map(
      (p, i) =>
        `<tr><td style="padding:4px 10px 4px 0;color:#9a7b2f;font-weight:600;white-space:nowrap;vertical-align:top">${i + 1}. ${esc(p.key)}</td><td style="padding:4px 0;color:#555">${esc(p.tag)}</td></tr>`,
    )
    .join("");
}

function block(step: string, minutes: string, title: string, body: string) {
  return `
  <tr><td style="padding:18px 24px;border-top:1px solid #ece6d8">
    <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#9a7b2f">${step} · ${minutes}</div>
    <div style="font-family:Georgia,serif;font-size:20px;color:#1d2433;margin:4px 0 8px">${title}</div>
    <div style="font-size:15px;line-height:1.55;color:#333">${body}</div>
  </td></tr>`;
}

export function renderDailyEmail(plan: DailyPlan, appUrl: string): { subject: string; html: string; text: string } {
  const q = plan.interview;
  const c = plan.craft;
  const link = (tab: string) => `${appUrl.replace(/\/$/, "")}/leadership?tab=${tab}`;
  const subject = `Your 5 minutes today: ${neutral(q.topic)} + ${c.topic}`;

  const html = `<!doctype html><html><body style="margin:0;background:#f6f3ec;font-family:-apple-system,Segoe UI,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f3ec;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fffdf8;border:1px solid #ece6d8;border-radius:12px">
  <tr><td style="padding:24px 24px 8px">
    <div style="font-family:Georgia,serif;font-size:22px;color:#1d2433">The CEO <span style="color:#9a7b2f">Voice</span></div>
    <div style="font-size:14px;color:#666;margin-top:6px">Five minutes, out loud, before your day starts. Read a step, look up, and speak.</div>
  </td></tr>
  ${block("1 · Warm up", "30 sec", esc(plan.habit[0]), `${esc(plan.habit[1])}<br><br>Say this bridge line three times, slowly:<br><b>“${esc(plan.bridge.phrase)}”</b> <span style="color:#888">(${esc(plan.bridge.group.toLowerCase())})</span>`)}
  ${block(
    "2 · Interview",
    "2 min",
    esc(neutral(q.question)),
    `Before you read on, say your three pillar words out loud.<br><br>
     <table role="presentation" cellpadding="0" cellspacing="0" style="font-size:15px">${pillarsHtml(q)}</table><br>
     Now answer out loud in 90 seconds: opening, First, Second, Third, landing line.<br>
     <span style="color:#666">Opening: “${esc(neutral(q.opening))}”</span>`,
  )}
  ${block(
    `3 · ${esc(c.section ?? "Leadership")}`,
    "1 min",
    esc(c.topic),
    `${esc(c.question)}<br><br><table role="presentation" cellpadding="0" cellspacing="0" style="font-size:15px">${pillarsHtml(c)}</table><br>
     ${c.category === "Library" ? "Speak for 60 seconds on it, in your own words." : "Speak for 60 seconds as if you were addressing your team."}`,
  )}
  ${block(
    "4 · Sharp mind",
    "1 min",
    "Think on your feet",
    `This trains you to answer a question you did <i>not</i> prepare, the way a surprise interview question or a CEO's hallway question feels.<br><br>
     Your topic: <b>${esc(plan.sprint)}</b><br><br>
     <b>How to do it:</b><br>
     1. Start a 45-second timer on your phone.<br>
     2. Don't plan. Start speaking immediately using this frame:<br>
     <div style="margin:8px 0;padding:10px 14px;background:#f6f3ec;border-left:3px solid #b8913a;border-radius:4px;color:#1d2433">
       “My view is simple: <i>[one sentence]</i>.<br>
       First, <i>[point]</i>.<br>
       Second, <i>[point]</i>.<br>
       Third, <i>[point]</i>.<br>
       So the bottom line is <i>[repeat your view]</i>.”
     </div>
     3. If your mind goes blank, say today's bridge line from step 1 and keep going.<br><br>
     <b>You win if:</b> you reached “Third” and a closing line before the timer ended, with no long silence. Perfect content doesn't matter. Not freezing does.`,
  )}
  ${block(
    "5 · Lock it in",
    "30 sec",
    "Test your memory",
    `Memory gets stronger when you <i>pull</i> something out of your head, not when you read it again. So this is a quick test.<br><br>
     <b>Don't scroll up.</b> Say these out loud from memory:<br>
     1. The three pillar words for today's interview question (step 2)<br>
     2. The three pillar words for today's leadership topic (step 3)<br>
     3. Today's bridge line (step 1)<br><br>
     Now check your answers at the very bottom of this email.<br>
     <b>All correct:</b> you're done for today.<br>
     <b>Missed one:</b> say the full answer once more out loud, then you're done. It will stick by tomorrow.`,
  )}
  <tr><td style="padding:20px 24px 26px;border-top:1px solid #ece6d8" align="center">
    <a href="${link("today")}" style="display:inline-block;background:#b8913a;color:#1d2433;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:8px">Open today's full workout →</a>
    <div style="font-size:12px;color:#888;margin-top:12px">Want more? <a href="${link("mock")}" style="color:#9a7b2f">Mock interview</a> · <a href="${link("cv")}" style="color:#9a7b2f">CV numbers</a> · <a href="${link("craft")}" style="color:#9a7b2f">Leadership craft</a></div>
  </td></tr>
  <tr><td style="padding:60px 24px 22px;border-top:1px dashed #ece6d8">
    <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#9a7b2f">Answers for step 5</div>
    <div style="font-size:14px;line-height:1.6;color:#555;margin-top:6px">
      1. Interview: <b>${esc(keys(q))}</b><br>
      2. Leadership: <b>${esc(keys(c))}</b><br>
      3. Bridge line: <b>“${esc(plan.bridge.phrase)}”</b>
    </div>
  </td></tr>
</table></td></tr></table></body></html>`;

  const text = [
    "THE CEO VOICE: your 5 minutes today",
    "",
    `1. WARM UP (30 sec): ${plan.habit[0]}. ${plan.habit[1]}`,
    `   Say three times: "${plan.bridge.phrase}"`,
    "",
    `2. INTERVIEW (2 min): ${neutral(q.question)}`,
    `   Cheat code: ${q.pillars.map((p) => `${p.key} (${p.tag})`).join(" | ")}`,
    "   Answer out loud in 90 seconds.",
    "",
    `3. ${(c.section ?? "Leadership").toUpperCase()} (1 min): ${c.question}`,
    `   Cheat code: ${c.pillars.map((p) => `${p.key} (${p.tag})`).join(" | ")}`,
    "",
    `4. SHARP MIND (1 min): think on your feet. Topic: ${plan.sprint}`,
    "   Start a 45-second timer and speak at once, no planning:",
    '   "My view is simple: ... First, ... Second, ... Third, ... So the bottom line is ..."',
    "   If you blank, use today's bridge line. You win if you reach Third without freezing.",
    "",
    "5. LOCK IT IN (30 sec): without scrolling up, say out loud:",
    "   - the three pillar words for today's interview question",
    "   - the three pillar words for today's leadership topic",
    "   - today's bridge line",
    "   Then check the answers at the bottom. Missed one? Say the full answer once more.",
    "",
    `Full workout: ${link("today")}`,
    "",
    "",
    "ANSWERS FOR STEP 5",
    `Interview: ${keys(q)}`,
    `Leadership: ${keys(c)}`,
    `Bridge line: "${plan.bridge.phrase}"`,
  ].join("\n");

  return { subject, html, text };
}
