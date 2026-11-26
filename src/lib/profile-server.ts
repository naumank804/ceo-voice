// Server side of the Executive Profile: turns the (untrusted, user-typed) profile into a prompt block.

export interface ProfileInput {
  name?: unknown;
  role?: unknown;
  industry?: unknown;
  metrics?: unknown;
}

const clip = (v: unknown, n: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, n) : "");

/** A short block for the user prompt, or "" when no profile was sent. */
export function profileBlock(raw: ProfileInput | undefined | null): string {
  if (!raw || typeof raw !== "object") return "";
  const role = clip(raw.role, 120);
  const industry = clip(raw.industry, 120);
  const metrics = clip(raw.metrics, 1500);
  if (!role && !industry && !metrics) return "";
  return [
    "Candidate profile (use it to tailor wording and examples; never invent facts beyond it):",
    role && `- Current / target role: ${role}`,
    industry && `- Industry: ${industry}`,
    metrics && `- Key career metrics and projects: ${metrics}`,
  ]
    .filter(Boolean)
    .join("\n");
}
