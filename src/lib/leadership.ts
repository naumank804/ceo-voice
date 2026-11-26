import { anchorSpoken, type Beat, beatCoverage, COVERED, firstLetters, pickAnchors } from "./stage";
import { CRAFT_CARDS } from "./leadership-craft";
import { stem, tokenize } from "./speech-metrics";

// ── Answer cards ────────────────────────────────────────────────────────────
//
// Every answer has the same shape: an opening line, three pillars, a landing line.
// The cheat code is the three pillar keys. Remember three words and the
// whole answer unfolds from them, so there's never a blank moment.

export interface Pillar {
  /** The cheat-code word, e.g. "Automation". */
  key: string;
  /** Short memory tag shown beside the key, e.g. "CI/CD". */
  tag: string;
  /** The heading inside the answer, e.g. "Rapid Roadblock Removal". */
  title: string;
  text: string;
  /** Words that show this pillar was delivered, even in your own wording. */
  cues: string[];
}

export type Category = "Business" | "Technical" | "Leadership" | "CV" | "Role" | "Craft" | "Topic" | "Library";
/** Questions an interviewer asks. */
export const INTERVIEW_CATEGORIES: Category[] = ["Role", "Business", "Technical", "Leadership", "CV"];
/** Things a leader talks about: leadership craft and your own topics. */
export const TALK_CATEGORIES: Category[] = ["Craft", "Topic"];
/** Topics published from the admin Topic Library (motivation, mindset…), grouped by `section`. */
export const LIBRARY_CATEGORIES: Category[] = ["Library"];
/** Spoken talks rather than interview answers. */
export const isTalk = (c: Category) => TALK_CATEGORIES.includes(c) || LIBRARY_CATEGORIES.includes(c);
export const CATEGORY_LABEL: Record<Category, string> = {
  Business: "Business",
  Technical: "Technical",
  Leadership: "Leadership",
  CV: "My CV",
  Role: "My role",
  Craft: "Leadership craft",
  Topic: "My topics",
  Library: "Topic library",
};

export interface AnswerCard {
  id: string;
  category: Category;
  /** Short name for lists, e.g. "Delivery velocity". */
  topic: string;
  question: string;
  opening: string;
  pillars: Pillar[];
  close: string;
  /** For topics: the original text you pasted, to re-read before practising. */
  source?: string;
  /** For Topic Library cards: display group (the stage name). */
  section?: string;
  /** Curriculum stage (lib/curriculum.ts); built-in cards are mapped in curriculum.ts. */
  stage?: string;
  /** Library items: an interview question to answer, or a talk to give. */
  kind?: "question" | "talk";
  /** Library items: professions this suits (empty = all). */
  professions?: string[];
  /** For CV questions: short phrases from the CV this question probes (used to highlight the CV). */
  cvMatch?: string[];
  custom?: boolean;
}

const BASE_CARDS: AnswerCard[] = [
  {
    id: "about-me",
    category: "Business",
    topic: "Tell me about yourself",
    question: "Tell me about yourself and your background.",
    opening: `I am a technology delivery and strategic alignment executive with over 20 years of experience leading enterprise digital transformation across Canadian financial institutions and insurance. My career is built on three core pillars.`,
    pillars: [
      {
        key: "Scale",
        tag: "$50M+",
        title: "Large-Scale Delivery",
        text: `First, Large-Scale Delivery: I have directed digital portfolios exceeding $50M, leading cross-functional agile squads across modern cloud, trading, and core modernization programs.`,
        cues: ["scale", "portfolio", "50", "squads", "large"],
      },
      {
        key: "Security",
        tag: "AVP Risk",
        title: "Technology Risk & Security",
        text: `Second, Technology Risk & Security: At Canada Life as AVP, I led enterprise security, Identity and Access Management, and pre-go-live risk governance across our wealth and dealership platforms.`,
        cues: ["security", "risk", "identity", "governance", "Canada"],
      },
      {
        key: "Business Value",
        tag: "TD",
        title: "Strategic Business Alignment",
        text: `Third, Strategic Business Alignment: At TD, I modernized critical direct investing channels like Active Trader, translating executive strategy into high-velocity digital capabilities.`,
        cues: ["alignment", "strategic", "trader", "investing", "business"],
      },
    ],
    close: `I specialize in bridging executive strategy with engineering execution, scaling delivery velocity safely in highly regulated environments.`,
  },
  {
    id: "velocity",
    category: "Technical",
    topic: "Delivery velocity",
    question: "How do you maintain high delivery velocity across multiple squads without compromising quality?",
    opening: `To maintain high delivery velocity across squads, I embed three core mechanisms into our delivery model.`,
    pillars: [
      {
        key: "Automation",
        tag: "CI/CD",
        title: "Automation",
        text: `First, Automation: We eliminate manual bottlenecks by investing in automated testing, CI/CD pipelines, and DevOps. Automating quality gates allows teams to release faster with fewer defects.`,
        cues: ["automation", "automated", "pipelines", "devops", "testing"],
      },
      {
        key: "Roadblocks",
        tag: "Daily triage",
        title: "Rapid Roadblock Removal",
        text: `Second, Rapid Roadblock Removal: Velocity dies when dependencies sit idle. I run a daily triage cadence with engineering leads and vendor partners to clear blockers in hours, not weeks.`,
        cues: ["roadblock", "blockers", "triage", "dependencies"],
      },
      {
        key: "Phased MVP",
        tag: "Small slices",
        title: "A Phased MVP Approach",
        text: `Third, A Phased MVP Approach: Instead of risky big-bang releases, we deliver in smaller, incremental production slices. This de-risks the launch and delivers continuous value to our business partners.`,
        cues: ["MVP", "phased", "incremental", "slices", "big-bang"],
      },
    ],
    close: `This balance of automation, proactive triage, and phased delivery keeps velocity high without burning out teams.`,
  },
  {
    id: "lead-leaders",
    category: "Leadership",
    topic: "Leading other leaders",
    question: "You will be leading other senior managers and practice leads. How do you lead through other leaders and ensure accountability?",
    opening: `When leading other leaders, I focus on three simple principles.`,
    pillars: [
      {
        key: "Outcomes",
        tag: "OKRs",
        title: "Define Clear Outcomes",
        text: `First, Define Clear Outcomes: I establish the what, not the how. I set transparent OKRs and business targets so every delivery manager understands their milestones.`,
        cues: ["outcomes", "OKRs", "targets", "milestones"],
      },
      {
        key: "Autonomy",
        tag: "Trust",
        title: "Give Them Autonomy",
        text: `Second, Give Them Autonomy: I do not micromanage. I empower my leaders to make decisions and run their squads, while my role is to clear organizational roadblocks and support them.`,
        cues: ["autonomy", "micromanage", "empower", "trust"],
      },
      {
        key: "Cadence",
        tag: "Metrics",
        title: "Maintain Structured Cadence",
        text: `Third, Maintain Structured Cadence: I hold regular 1-on-1s and review delivery health metrics: sprint velocity, defect escape rates, and open risks.`,
        cues: ["cadence", "metrics", "1-on-1s", "health", "defect"],
      },
    ],
    close: `That gives my leaders complete ownership while keeping portfolio delivery aligned and accountable.`,
  },
  {
    id: "stakeholders",
    category: "Business",
    topic: "Demanding stakeholders",
    question: "How do you handle demanding business partners who push for unrealistic deadlines or out-of-cycle scope?",
    opening: `When managing demanding stakeholders, my principle is simple: never just say no. Bring the data and offer trade-offs. I follow three steps.`,
    pillars: [
      {
        key: "Empathy",
        tag: "Align",
        title: "Empathy",
        text: `First, Empathy: I align with their business intent first. I make sure they know I want to hit their commercial target, so we start on the exact same team.`,
        cues: ["empathy", "intent", "same team", "align"],
      },
      {
        key: "Data",
        tag: "Capacity",
        title: "Objective Data",
        text: `Second, Objective Data: I remove personal opinions from the table. I show transparent capacity models: team velocity, resource allocation, and existing release commitments.`,
        cues: ["data", "capacity", "objective", "allocation"],
      },
      {
        key: "Trade-offs",
        tag: "Options",
        title: "Clear Trade-offs",
        text: `Third, Clear Trade-offs: I put the strategic decision in their hands: "We can accelerate feature A, but it means pausing initiative B. Which one delivers greater immediate business value?"`,
        cues: ["trade-off", "tradeoffs", "options", "accelerate", "pausing"],
      },
    ],
    close: `That protects team bandwidth while building genuine trust with executive business partners.`,
  },
  {
    id: "burnout",
    category: "Leadership",
    topic: "Preventing burnout",
    question: "High-pressure digital environments can strain teams. How do you recognize burnout across your delivery squads, and what do you do to prevent it?",
    opening: `Preventing burnout is essential for sustaining long-term delivery velocity. I manage it through three actions.`,
    pillars: [
      {
        key: "Signals",
        tag: "Defects",
        title: "Watch the Early Signals",
        text: `First, Watch the Early Signals: I monitor delivery data and team behavior. Rising defect rates, missed sprint targets, or silence during retrospectives are immediate red flags that squads are overwhelmed.`,
        cues: ["signals", "red flags", "retrospectives", "monitor", "defect"],
      },
      {
        key: "Workload",
        tag: "Protect scope",
        title: "Re-balance the Workload",
        text: `Second, Re-balance the Workload: I actively protect sprint boundaries. I don't allow unplanned scope creep, and I work with business partners to shift non-critical deliverables to future cycles.`,
        cues: ["workload", "rebalance", "scope", "boundaries", "creep"],
      },
      {
        key: "Recovery",
        tag: "Downtime",
        title: "Enforce Recovery",
        text: `Third, Enforce Recovery: After a high-stakes deployment or intense milestone, I make sure teams decompress. We publicly celebrate their wins, recognize key contributors, and give them breathing room before kicking off the next heavy sprint.`,
        cues: ["recovery", "decompress", "celebrate", "breathing", "recognize"],
      },
    ],
    close: `Protecting team energy keeps our attrition low and delivery consistent.`,
  },
  {
    id: "security",
    category: "Technical",
    topic: "Risk & platform security",
    question: "How do you embed governance and security into fast-paced digital delivery without slowing down teams?",
    opening: `I treat security as an enabler of speed, not an afterthought. I balance delivery velocity and security through three practices.`,
    pillars: [
      {
        key: "Shift-Left",
        tag: "Pipelines",
        title: "Shift-Left Security",
        text: `First, Shift-Left Security: We embed automated vulnerability scanning and code quality checks directly into our CI/CD pipelines. Developers catch security flaws in real time before code merges to main branches.`,
        cues: ["shift-left", "shift", "scanning", "vulnerability", "pipelines"],
      },
      {
        key: "Pre-Go-Live",
        tag: "Gates",
        title: "Pre-Go-Live Risk Gates",
        text: `Second, Pre-Go-Live Risk Gates: We conduct threat modeling, penetration testing, and access governance reviews during design and sprint testing, not at the finish line.`,
        cues: ["go-live", "gates", "threat", "penetration", "modeling"],
      },
      {
        key: "Single View",
        tag: "Dashboard",
        title: "A Centralized Risk Dashboard",
        text: `Third, A Centralized Risk Dashboard: I establish a single governance view across the portfolio. Delivery squads, security officers, and executive stakeholders have complete visibility into open risks and remediation timelines.`,
        cues: ["dashboard", "single", "centralized", "visibility", "remediation"],
      },
    ],
    close: `This allows squads to deploy fast with zero compliance surprises at release time.`,
  },
  {
    id: "ai",
    category: "Technical",
    topic: "Applied AI",
    question: "AI is on every executive roadmap. How do you approach implementing applied AI and automation practically in an enterprise?",
    opening: `My approach to enterprise AI is grounded in practical business value, not hype. I apply three clear rules.`,
    pillars: [
      {
        key: "Solve",
        tag: "Bottlenecks",
        title: "Solve Real Bottlenecks",
        text: `First, Solve Real Bottlenecks: I target high-friction, repetitive operational workflows, like automated data reconciliation, support ticket triage, or synthetic test data generation.`,
        cues: ["bottlenecks", "repetitive", "reconciliation", "friction", "workflows"],
      },
      {
        key: "Safeguard",
        tag: "Compliance",
        title: "Safeguard the Data",
        text: `Second, Safeguard the Data: In financial services, security and compliance come first. We establish strict guardrails around sensitive client data, model hallucinations, and regulatory explainability.`,
        cues: ["safeguard", "guardrails", "hallucinations", "explainability", "compliance"],
      },
      {
        key: "Scale",
        tag: "Pilots",
        title: "Scale Through MVPs",
        text: `Third, Scale Through MVPs: I avoid multi-year bets upfront. We run small, contained proof-of-concepts, validate the ROI with a pilot user group, and only scale what proves measurable business impact.`,
        cues: ["pilot", "proof-of-concept", "concept", "ROI", "MVPs"],
      },
    ],
    close: `That drives tangible operational efficiency while keeping risk strictly controlled.`,
  },
  {
    id: "portfolio",
    category: "Business",
    topic: "Managing a portfolio",
    question: "Tell me about your experience managing a technology portfolio rather than just individual projects.",
    opening: `Managing a technology portfolio is fundamentally about maximizing business value, managing capital, and optimizing systemic capacity across multiple initiatives. I focus on three core disciplines.`,
    pillars: [
      {
        key: "Prioritization",
        tag: "ROI",
        title: "Strategic Prioritization",
        text: `First, Strategic Prioritization: I partner with business executives to establish an objective intake model. We prioritize initiatives based on clear business outcomes: customer acquisition, operational efficiency, regulatory compliance, and direct ROI.`,
        cues: ["prioritization", "prioritize", "intake", "ROI"],
      },
      {
        key: "Governance",
        tag: "Stage-gates",
        title: "Financial & Risk Governance",
        text: `Second, Financial & Risk Governance: I oversee the overall portfolio capital allocation and burn rate. I implement disciplined stage-gate funding, releasing capital in tranches based on milestone validation, while ensuring risk and OSFI compliance gates are met upfront.`,
        cues: ["governance", "stage-gate", "capital", "burn", "OSFI", "tranches"],
      },
      {
        key: "Orchestration",
        tag: "Dependencies",
        title: "Cross-Portfolio Orchestration",
        text: `Third, Cross-Portfolio Orchestration: I maintain a centralized "single pane of glass" portfolio view tracking shared services, vendor commitments, and critical path dependencies across squads, resolving resource contention before it impacts delivery dates.`,
        cues: ["orchestration", "dependencies", "pane", "critical path", "contention"],
      },
    ],
    close: `This approach keeps multi-million dollar portfolios aligned with commercial strategy while maintaining predictable delivery.`,
  },
  {
    id: "business-case",
    category: "Business",
    topic: "Business case & funding",
    question: "How do you approach business case development and funding decisions?",
    opening: `I treat business case development and funding as a continuous investment lifecycle, using three core principles.`,
    pillars: [
      {
        key: "Outcome-Led",
        tag: "TCO",
        title: "Outcome-Led Justification",
        text: `First, Outcome-Led Justification: I anchor every case in tangible commercial outcomes rather than technical features: revenue growth, cost reduction, or risk mitigation, with a transparent Total Cost of Ownership.`,
        cues: ["outcome", "TCO", "total cost", "ownership", "revenue"],
      },
      {
        key: "Tranche-Funding",
        tag: "Gates",
        title: "Tranche-Based Funding",
        text: `Second, Tranche-Based Funding: I move away from funding entire multi-year programs upfront. Funding is released in phased tranches tied to delivery gates, unlocking the next phase only after validating an MVP or hitting production milestones.`,
        cues: ["tranche", "tranches", "phased", "unlocking", "gates"],
      },
      {
        key: "Measurable-ROI",
        tag: "Post-launch",
        title: "Measurable Value Realization",
        text: `Third, Measurable Value Realization: I establish post-implementation reviews at 90 and 180 days to compare projected ROI against actual operational metrics, like user adoption, cycle-time savings, or platform run-cost efficiencies.`,
        cues: ["measurable", "realization", "post-implementation", "180", "adoption"],
      },
    ],
    close: `This protects enterprise capital and ensures tech spend delivers real commercial value.`,
  },
  {
    id: "icb",
    category: "Business",
    topic: "Investment & corporate banking",
    question: "What is your experience in the Investment and Corporate Banking space?",
    opening: `I bridge directly into Investment and Corporate Banking through three core enterprise capabilities.`,
    pillars: [
      {
        key: "Trading Execution",
        tag: "Active Trader",
        title: "High-Speed Trading Platforms",
        text: `First, High-Speed Trading Platforms: At TD, I led delivery for Active Trader. We managed high-concurrency order placement, real-time market data streaming, and low-latency execution where platform stability was critical.`,
        cues: ["trading", "trader", "latency", "market data", "concurrency"],
      },
      {
        key: "Institutional Security",
        tag: "IAM",
        title: "Institutional Security & Access",
        text: `Second, Institutional Security & Access: At Canada Life, I led wealth dealership technology. We managed advisor portals and institutional networks, putting in strict Identity and Access Management to safeguard high-value client transactions.`,
        cues: ["institutional", "identity", "access", "advisor", "dealership"],
      },
      {
        key: "Regulatory Compliance",
        tag: "OSFI",
        title: "Regulatory & Risk Governance",
        text: `Third, Regulatory & Risk Governance: Across both environments, we operated under strict OSFI and CIRO regulations. I built risk gates directly into our delivery pipelines so audit, security, and compliance were verified before production.`,
        cues: ["regulatory", "OSFI", "CIRO", "regulations", "audit"],
      },
    ],
    close: `The products change, but the core challenges, high transaction volume, zero downtime, and heavy regulation, are exactly the same.`,
  },
  {
    id: "tradeoff",
    category: "Technical",
    topic: "A technical trade-off",
    question: "Tell me about a technical trade-off you made and how you justified it to executive leadership.",
    opening: `During our platform modernization program, I managed a critical architectural trade-off.`,
    pillars: [
      {
        key: "Choice",
        tag: "Phased vs big-bang",
        title: "The Choice",
        text: `The Choice: We had to choose between a big-bang replacement of our core systems or an incremental, API-driven phased rollout. Big-bang appeared faster on paper, but carried extreme operational risk to live transaction processing. The phased approach required temporary integration adapters, adding minor short-term architectural overhead.`,
        cues: ["choice", "choose", "big-bang", "rollout", "adapters"],
      },
      {
        key: "Justification",
        tag: "Risk",
        title: "The Justification",
        text: `The Justification: I justified the phased model based on business continuity and risk governance. I proved that a major outage would breach client SLAs and damage trust. Phased delivery allowed us to pilot critical lines first, stabilize under real traffic, and then safely migrate the rest.`,
        cues: ["justified", "justification", "continuity", "outage", "SLAs"],
      },
      {
        key: "Outcome",
        tag: "Zero downtime",
        title: "The Outcome",
        text: `The Outcome: We delivered the entire suite on schedule with zero production downtime, protecting core client operations.`,
        cues: ["outcome", "downtime", "schedule", "zero", "delivered"],
      },
    ],
    close: ``,
  },
  {
    id: "why-us",
    category: "Business",
    topic: "Why this company?",
    question: "Why are you interested in {company}, and why this role specifically?",
    opening: `{Company} stands out to me for three reasons.`,
    pillars: [
      {
        key: "Market Leadership",
        tag: "Scale",
        title: "Market Leadership",
        text: `First, Market Leadership: {company} has an exceptional reputation in financial services, operating at an enterprise scale where technology delivery directly impacts millions of clients.`,
        cues: ["market", "leadership", "reputation", "millions"],
      },
      {
        key: "Digital Scale",
        tag: "Cloud",
        title: "Digital as a Differentiator",
        text: `Second, Digital as a Differentiator: I see {company} actively prioritizing digital client experience and cloud modernization as core growth engines, which aligns perfectly with my background in leading large-scale transformations.`,
        cues: ["digital", "differentiator", "cloud", "client experience"],
      },
      {
        key: "Culture of Trust",
        tag: "Governance",
        title: "Culture of Trust",
        text: `Third, Culture of Trust: {company} stands out for stability, client focus, and strong governance, an environment where I can drive high delivery velocity safely.`,
        cues: ["culture", "trust", "stability", "client focus"],
      },
    ],
    close: ``,
  },
  {
    id: "your-questions",
    category: "Business",
    topic: "Your questions for them",
    question: "We're near the end. Do you have any questions for us?",
    opening: `Yes, thank you. I have three questions.`,
    pillars: [
      {
        key: "First 90 Days",
        tag: "Success",
        title: "What success looks like",
        text: `First: What would success look like for this role in the first 90 days, and what is the biggest delivery challenge the portfolio is facing right now?`,
        cues: ["90", "success", "first", "challenge"],
      },
      {
        key: "Partnership",
        tag: "Business",
        title: "How tech and business partner",
        text: `Second: How does the technology delivery team partner with the business today? Where is that partnership strongest, and where would you like it to grow?`,
        cues: ["partner", "partnership", "grow", "strongest"],
      },
      {
        key: "Roadmap",
        tag: "AI & digital",
        title: "Where the role goes next",
        text: `Third: As digital and AI priorities scale across the organization, how do you see this role shaping the technology roadmap over the next two years?`,
        cues: ["roadmap", "two years", "shaping", "priorities"],
      },
    ],
    close: `Thank you. This has been a great conversation, and I'm genuinely excited about the opportunity.`,
  },
  // ── Technical ──
  {
    id: "cloud-migration",
    category: "Technical",
    topic: "Cloud migration",
    question: "How would you approach migrating a legacy core platform to the cloud?",
    opening: `I treat cloud migration as a business risk program, not just an infrastructure move. I run it in three stages.`,
    pillars: [
      {
        key: "Assess",
        tag: "6 Rs",
        title: "Assess the Portfolio",
        text: `First, Assess: We map every application and its dependencies, then decide the right path for each one: rehost, replatform, refactor, or retire. Not everything should move, and not everything should move the same way.`,
        cues: ["assess", "rehost", "refactor", "retire", "dependencies"],
      },
      {
        key: "Landing Zone",
        tag: "Guardrails",
        title: "Build a Secure Landing Zone",
        text: `Second, Landing Zone: Before any workload moves, we build the foundation: identity and access, network segmentation, encryption, logging, and cost controls, all as code. That way security and compliance are built in, not bolted on.`,
        cues: ["landing", "foundation", "encryption", "guardrails", "as code"],
      },
      {
        key: "Waves",
        tag: "Pilot first",
        title: "Migrate in Waves",
        text: `Third, Waves: We start with a low-risk pilot, prove performance and rollback, then migrate in planned waves. Critical systems move last, once the team and the tooling are proven.`,
        cues: ["waves", "pilot", "rollback", "wave"],
      },
    ],
    close: `That approach reduces risk, controls cost, and keeps the business running while we modernize.`,
  },
  {
    id: "architecture",
    category: "Technical",
    topic: "Architecture decisions",
    question: "How do you make and govern architecture decisions across many squads?",
    opening: `I want squads to move fast without creating a patchwork of systems. I balance that through three practices.`,
    pillars: [
      {
        key: "Principles",
        tag: "Guardrails",
        title: "Clear Principles",
        text: `First, Principles: We agree a short set of architecture principles, like API-first, cloud-native, and secure by design. Squads decide freely inside those guardrails.`,
        cues: ["principles", "guardrails", "api-first", "secure by design"],
      },
      {
        key: "Decision Records",
        tag: "ADRs",
        title: "Lightweight Decision Records",
        text: `Second, Decision Records: Significant decisions are written as short architecture decision records, with the options, the trade-offs, and the reason. A light review forum looks only at decisions that cross teams.`,
        cues: ["decision records", "ADR", "review", "options"],
      },
      {
        key: "Fitness",
        tag: "Measure",
        title: "Measure Architecture Health",
        text: `Third, Fitness: We track measurable signals, like coupling between services, performance, and security findings, so architecture quality is visible, not a matter of opinion.`,
        cues: ["fitness", "coupling", "measurable", "health"],
      },
    ],
    close: `That keeps teams autonomous while the platform stays coherent and secure.`,
  },
  {
    id: "incident",
    category: "Technical",
    topic: "Major production incident",
    question: "Walk me through how you handle a major production incident.",
    opening: `In a major incident, calm structure matters more than speed. I follow three steps.`,
    pillars: [
      {
        key: "Stabilize",
        tag: "Incident command",
        title: "Stabilize First",
        text: `First, Stabilize: We open an incident bridge with one clear incident commander. The priority is restoring service, through rollback, failover, or a workaround, before searching for the root cause.`,
        cues: ["stabilize", "commander", "rollback", "failover", "restore"],
      },
      {
        key: "Communicate",
        tag: "Regular updates",
        title: "Communicate on a Cadence",
        text: `Second, Communicate: Business leaders, client teams, and where needed regulators get short, regular updates: what happened, the impact, and the next update time. Silence creates more pressure than bad news.`,
        cues: ["communicate", "updates", "regulators", "cadence"],
      },
      {
        key: "Learn",
        tag: "Blameless review",
        title: "Learn Without Blame",
        text: `Third, Learn: Within days we run a blameless post-incident review, find the real root cause, and track the actions to closure, like better monitoring, automated tests, or a design fix.`,
        cues: ["learn", "blameless", "root cause", "post-incident", "postmortem"],
      },
    ],
    close: `That restores trust quickly and makes the platform stronger after every incident.`,
  },
  {
    id: "engineering-metrics",
    category: "Technical",
    topic: "Measuring engineering performance",
    question: "How do you measure the performance of your engineering and delivery teams?",
    opening: `I measure what predicts good outcomes, not just activity. I look at three layers.`,
    pillars: [
      {
        key: "Flow",
        tag: "DORA",
        title: "Delivery Flow",
        text: `First, Flow: I use the DORA metrics: deployment frequency and lead time for changes. They show how quickly value moves from idea to production.`,
        cues: ["flow", "DORA", "deployment frequency", "lead time"],
      },
      {
        key: "Stability",
        tag: "Change failure",
        title: "Quality and Stability",
        text: `Second, Stability: Change failure rate, time to restore service, and escaped defects. Speed without stability is not real velocity.`,
        cues: ["stability", "change failure", "restore", "escaped"],
      },
      {
        key: "Outcomes",
        tag: "Business KPIs",
        title: "Business Outcomes",
        text: `Third, Outcomes: Every team links its work to a business measure, like client adoption, cycle-time savings, or cost to serve. Metrics are for learning, never for punishing teams.`,
        cues: ["outcomes", "adoption", "business measure", "kpi"],
      },
    ],
    close: `Together they tell me if we are fast, safe, and actually creating value.`,
  },
  {
    id: "tech-debt",
    category: "Technical",
    topic: "Technical debt",
    question: "How do you balance technical debt against new feature delivery?",
    opening: `Technical debt is a business risk, so I manage it like one. I use three practices.`,
    pillars: [
      {
        key: "Visible",
        tag: "Debt register",
        title: "Make It Visible",
        text: `First, Make it Visible: We keep a technical debt register with the impact of each item in business terms, like slower releases, outage risk, or security exposure.`,
        cues: ["visible", "register", "impact"],
      },
      {
        key: "Capacity",
        tag: "15–20%",
        title: "Reserve Capacity",
        text: `Second, Reserve Capacity: Each squad protects a fixed share of every sprint, typically fifteen to twenty percent, for debt and platform health, so it never waits for a perfect moment.`,
        cues: ["capacity", "percent", "reserve", "protect"],
      },
      {
        key: "Risk-Based",
        tag: "Prioritize",
        title: "Prioritize by Risk",
        text: `Third, Risk-Based: We fix first what blocks delivery or creates security and regulatory exposure. Debt that costs nothing today can wait.`,
        cues: ["risk", "prioritize", "exposure", "regulatory"],
      },
    ],
    close: `That keeps the platform healthy without stopping the business roadmap.`,
  },
  {
    id: "iam",
    category: "Technical",
    topic: "Identity & access management",
    question: "How would you strengthen identity and access management on a wealth or banking platform?",
    opening: `Identity is the new security perimeter. I strengthen it in three layers.`,
    pillars: [
      {
        key: "Least Privilege",
        tag: "RBAC",
        title: "Least Privilege",
        text: `First, Least Privilege: Role-based access, with people getting only what their job needs, plus regular access recertification so old access is removed.`,
        cues: ["least privilege", "role-based", "recertification", "RBAC"],
      },
      {
        key: "Strong Authentication",
        tag: "MFA + SSO",
        title: "Strong Authentication",
        text: `Second, Strong Authentication: Multi-factor authentication and single sign-on for advisors, employees, and clients, with extra controls for privileged and high-value actions.`,
        cues: ["authentication", "multi-factor", "MFA", "single sign-on"],
      },
      {
        key: "Monitor",
        tag: "Privileged access",
        title: "Monitor and Respond",
        text: `Third, Monitor: Privileged accounts are vaulted, and every sensitive action is logged and monitored, so unusual behaviour is caught and investigated quickly.`,
        cues: ["monitor", "privileged", "vaulted", "logged"],
      },
    ],
    close: `That protects client assets and keeps us audit-ready for regulators.`,
  },
  // ── Business ──
  {
    id: "turnaround",
    category: "Business",
    topic: "Turning around a troubled program",
    question: "How do you turn around a program that is late, over budget, or losing stakeholder trust?",
    opening: `When a program is in trouble, I focus on facts before fixes. I follow three steps.`,
    pillars: [
      {
        key: "Diagnose",
        tag: "Two weeks",
        title: "Diagnose Honestly",
        text: `First, Diagnose: In the first two weeks I talk to the team, the vendors, and the sponsors, and review the plan against real velocity. I find the true critical path and the real blockers.`,
        cues: ["diagnose", "critical path", "real", "review"],
      },
      {
        key: "Reset",
        tag: "Scope & plan",
        title: "Reset the Plan",
        text: `Second, Reset: I present a realistic re-plan with clear options: reduce scope, add capacity, or move the date. Leadership chooses with full information.`,
        cues: ["reset", "re-plan", "options", "scope"],
      },
      {
        key: "Rebuild Trust",
        tag: "Weekly cadence",
        title: "Rebuild Trust",
        text: `Third, Rebuild Trust: Short weekly updates, early warnings, and small visible wins. Trust comes back when people see promises kept, week after week.`,
        cues: ["trust", "weekly", "wins", "promises"],
      },
    ],
    close: `Honest diagnosis, a credible plan, and steady delivery turn a troubled program around.`,
  },
  {
    id: "vendors",
    category: "Business",
    topic: "Managing vendors",
    question: "How do you manage vendors and delivery partners to get the outcomes you need?",
    opening: `I treat strong vendors as partners, but I manage them on outcomes. I rely on three things.`,
    pillars: [
      {
        key: "Outcomes",
        tag: "SLAs",
        title: "Contract for Outcomes",
        text: `First, Outcomes: Contracts and statements of work are tied to deliverables, quality levels, and service levels, not just hours billed.`,
        cues: ["outcomes", "contract", "service levels", "SLA", "deliverables"],
      },
      {
        key: "Joint Governance",
        tag: "One team",
        title: "Joint Governance",
        text: `Second, Joint Governance: Vendor leads join our delivery cadence: the same stand-ups, risk reviews, and dashboards. One team, one plan.`,
        cues: ["governance", "joint", "one team", "cadence"],
      },
      {
        key: "Performance",
        tag: "Scorecard",
        title: "Performance and Escalation",
        text: `Third, Performance: A quarterly scorecard on quality, timeliness, and value, with a clear escalation path. Good partners earn more work; poor performance is addressed early.`,
        cues: ["performance", "scorecard", "escalation", "quarterly"],
      },
    ],
    close: `That gives us the speed of partners with the accountability of an internal team.`,
  },
  {
    id: "bad-news",
    category: "Business",
    topic: "Delivering bad news to executives",
    question: "How do you tell senior executives that a key initiative is going to be late?",
    opening: `Bad news does not get better with age. I handle it in three steps.`,
    pillars: [
      {
        key: "Early",
        tag: "No surprises",
        title: "Raise It Early",
        text: `First, Early: As soon as the data shows real risk to the date, I raise it. Executives can handle bad news; what they can't handle is surprises.`,
        cues: ["early", "surprises", "as soon"],
      },
      {
        key: "Facts & Impact",
        tag: "Root cause",
        title: "Facts and Impact",
        text: `Second, Facts and Impact: I explain what happened, why, and what it means for clients, revenue, or regulatory commitments, without excuses or blame.`,
        cues: ["facts", "impact", "excuses"],
      },
      {
        key: "Options",
        tag: "Recommendation",
        title: "Options and a Recommendation",
        text: `Third, Options: I bring two or three recovery options with their trade-offs, and my clear recommendation, so the conversation moves straight to a decision.`,
        cues: ["options", "recommendation", "recovery", "decision"],
      },
    ],
    close: `Executives trust the leader who brings problems early, with a plan.`,
  },
  {
    id: "change-adoption",
    category: "Leadership",
    topic: "Leading change",
    question: "How do you lead a large change, like an agile or digital transformation, so that it actually sticks?",
    opening: `Most transformations fail on people, not process. I lead change through three levers.`,
    pillars: [
      {
        key: "Why",
        tag: "Vision",
        title: "Explain the Why",
        text: `First, Why: I explain clearly why the change matters for clients and for the team, and what will be different for each person. People support what they understand.`,
        cues: ["vision", "understand", "matters"],
      },
      {
        key: "Champions",
        tag: "Pilot teams",
        title: "Start with Champions",
        text: `Second, Champions: I start with pilot teams and respected champions, prove it works, and let their success pull others in, instead of forcing a big-bang rollout.`,
        cues: ["champions", "pilot", "success", "pull"],
      },
      {
        key: "Reinforce",
        tag: "Measure",
        title: "Measure and Reinforce",
        text: `Third, Reinforce: We measure adoption and results, celebrate progress publicly, and remove the old processes, so people can't slip back.`,
        cues: ["reinforce", "measure", "adoption", "celebrate"],
      },
    ],
    close: `When people understand it, see it work, and feel it rewarded, change sticks.`,
  },
  // ── Topics ──
  {
    id: "topic-winning-mindset",
    category: "Topic",
    topic: "Winning starts in the mind",
    question: `Share the key ideas of "Winning starts here" in your own words.`,
    opening: `Winning starts in the mind, long before it shows in our actions. There are three ideas I take from this.`,
    pillars: [
      {
        key: "Mindset",
        tag: "Thinking guides effort",
        title: "Mindset Comes First",
        text: `First, Mindset: When my thinking is clear and strong, my effort becomes powerful; when it's weak, effort feels scattered. Winning thinking is not always positive, it's honest: it sees problems as real, but manageable.`,
        cues: ["mindset", "thinking", "effort", "honest"],
      },
      {
        key: "Ownership",
        tag: "Control what you let in",
        title: "Own Your Inner World",
        text: `Second, Ownership: I can't control everything outside, but I control what I let inside. I pause and ask: Is this thought helpful? Is it true? Does it move me forward? And I replace "I cannot" with "I don't know yet."`,
        cues: ["ownership", "control", "helpful", "inside"],
      },
      {
        key: "Habits",
        tag: "Repetition replaces",
        title: "Thoughts Are Habits",
        text: `Third, Habits: Thoughts are habits. Repetition created them, and repetition can replace them. After a mistake I correct instead of criticize, and ask, "What can I do next?" Each small choice is proof, and proof becomes confidence.`,
        cues: ["habits", "repetition", "correct", "proof", "confidence"],
      },
    ],
    close: `So I start each day deliberately: focus on what I can control, take one step, and let progress build my confidence.`,
    source: `Winning starts with your mindset. It's not just about what you have or who's on your side, because circumstances can change in an instant. True victory begins quietly within your thoughts. Your mind is the starting point because it guides your efforts. When your thinking is strong and clear, your actions become powerful; if it's weak, your efforts can feel scattered.

It's not about always being positive. It's about being honest and responsible. Winning thinking acknowledges problems but refuses to be defeated by them. You can't control everything outside, but you can control what you let inside. Winning thinking pauses to ask: "Is this thought helpful? Is it true? Does it push me forward?" That pause creates space for better choices.

Thoughts are habits, and habits can be changed. Repetition created them, and repetition can replace them. Pay attention to how you talk to yourself after a mistake. Do you criticize or do you correct? Correction asks, "What can I do next?" Each time you choose a helpful thought, you create proof, and over time those proof points grow into trust in your abilities.

Replace "I cannot" with "I do not know yet." Approach each morning as a fresh start, focusing on what matters and what you can control. The person you are becoming is listening.`,
  },
];

export const DEFAULT_CARDS: AnswerCard[] = [...BASE_CARDS, ...CRAFT_CARDS];

export function cheatCode(card: AnswerCard): string {
  return card.pillars.map((p) => p.key).join(" | ");
}

export function fullAnswer(card: AnswerCard): string {
  return [card.opening, ...card.pillars.map((p) => p.text), card.close].filter(Boolean).join("\n\n");
}

// ── Practice levels (support fades step by step) ───────────────────────────

export type Level = 1 | 2 | 3 | 4;

export const LEVELS: { level: Level; name: string; shows: string; hint: string }[] = [
  { level: 1, name: "Read", shows: "Full answer", hint: "Read it aloud twice. Feel the rhythm: opening, three pillars, landing line." },
  { level: 2, name: "Fill the gaps", shows: "Key words + first letters", hint: "Key words stay, the rest shows its first letter. Your memory fills each gap: this is where the answer starts to stick." },
  { level: 3, name: "Cheat code", shows: "Three pillar words only", hint: "Say it in your own words. Each pillar word unlocks a whole paragraph." },
  { level: 4, name: "Interview", shows: "The question only", hint: "Answer like it's the real thing. A hint appears only if you freeze." },
];

export function levelInfo(l: Level) {
  return LEVELS[l - 1];
}

export function lettersOf(text: string) {
  return firstLetters(text);
}

/** One piece of a fill-in-the-blanks answer: `shown` is visible, `hidden` is the rest of the word to recall. */
export interface ClozeToken {
  shown: string;
  hidden: string;
}

const GLUE = new Set(["a", "an", "the", "i", "we", "my", "our", "to", "of", "in", "on", "at", "by", "for", "and", "or", "but", "so", "is", "it", "as", "be", "was", "are", "with", "that", "this"]);

/**
 * Level 2 "First letters": a readable cloze, not letter soup. Short glue words, numbers,
 * names/acronyms and the "First, Key:" signpost stay whole; other words show their first
 * letter and a gap the length of the rest, so memory fills in each word.
 */
export function clozeOf(text: string): ClozeToken[] {
  const signpost = text.match(/^((?:First|Second|Third|Fourth|Fifth),\s*[^:]{1,40}:\s*)/);
  const head = signpost ? signpost[1] : "";
  const tokens: ClozeToken[] = head ? [{ shown: head, hidden: "" }] : [];
  const parts = text.slice(head.length).split(/(\s+)/);
  parts.forEach((part, i) => {
    const m = part.match(/^([^A-Za-z0-9$]*)([A-Za-z0-9$][\w$%.,'’&/+-]*?)([^A-Za-z0-9%]*)$/);
    if (!m || /^\s+$/.test(part)) {
      tokens.push({ shown: part, hidden: "" });
      return;
    }
    const [, pre, word, post] = m;
    const prev = parts.slice(0, i).join("").trim();
    const sentenceStart = !prev || /[.!?:]$/.test(prev);
    const keep =
      word.length <= 2 ||
      GLUE.has(word.toLowerCase()) ||
      /\d|\$|%/.test(word) ||
      /^[A-Z0-9&/+-]{2,}$/.test(word) || // acronyms: IAM, CTO, AWS
      (!sentenceStart && /^[A-Z]/.test(word)); // names: Guidewire, Okta
    tokens.push(keep ? { shown: part, hidden: "" } : { shown: pre + word[0], hidden: word.slice(1) }, ...(keep || !post ? [] : [{ shown: post, hidden: "" }]));
  });
  return tokens;
}

// ── Live tracking ───────────────────────────────────────────────────────────

/** Opening, each pillar, and landing line as sections, so the shared coverage maths applies. */
export function cardBeats(card: AnswerCard): Beat[] {
  const parts = [card.opening, ...card.pillars.map((p) => p.text), card.close].filter(Boolean);
  return parts.map((text, i) => ({ id: `${card.id}-${i}`, text, anchors: [], opening: text.split(/\s+/).slice(0, 7).join(" ") }));
}

/** Which pillars have been delivered: a cue word was said, or enough of the paragraph's ideas were. */
export function pillarProgress(card: AnswerCard, transcript: string): boolean[] {
  if (!transcript.trim()) return card.pillars.map(() => false);
  const beats = card.pillars.map((p, i) => ({ id: `p${i}`, text: p.text, anchors: [], opening: "" }));
  const coverage = beatCoverage(transcript, beats);
  return card.pillars.map(
    (p, i) => coverage[i] >= COVERED * 0.8 || [p.key, ...p.cues].some((c) => c.split(/\s+/).every((w) => anchorSpoken(w, transcript))),
  );
}

/** How much of the model answer's substance came through (0..1), in any wording. */
export function answerRecall(card: AnswerCard, transcript: string): number {
  const cov = beatCoverage(transcript, cardBeats(card));
  const wordShare = cov.reduce((s, c) => s + Math.min(1, c / COVERED), 0) / Math.max(1, cov.length);
  const pillars = pillarProgress(card, transcript);
  const pillarShare = pillars.filter(Boolean).length / Math.max(1, pillars.length);
  return 0.65 * pillarShare + 0.35 * wordShare;
}

/** Leaders signpost. "First… Second… Third…" tells the listener you're in control. */
export const SIGNPOSTS: { label: string; re: RegExp }[] = [
  { label: "First", re: /\b(first|firstly|first of all|number one|to start)\b/i },
  { label: "Second", re: /\b(second|secondly|next|number two)\b/i },
  { label: "Third", re: /\b(third|thirdly|finally|lastly|number three)\b/i },
];

export function signpostsUsed(transcript: string): boolean[] {
  return SIGNPOSTS.map((s) => s.re.test(transcript));
}

export function recommendLevel(level: Level, recall: number, netUsed: boolean): { next: Level; message: string } {
  if (recall >= 0.8 && (!netUsed || level === 1)) {
    if (level < 4) {
      const up = (level + 1) as Level;
      return { next: up, message: `Solid. Move up to "${levelInfo(up).name}": less on screen, more from you.` };
    }
    return { next: 4, message: "Interview-ready. Keep it fresh: this card comes back in a few days so it stays automatic." };
  }
  if (recall >= 0.55) return { next: level, message: "Close. One more take at this level usually makes it click." };
  if (level > 1) {
    const down = (level - 1) as Level;
    return { next: down, message: `Step back to "${levelInfo(down).name}" for one take. Rebuilding the path is faster than forcing it.` };
  }
  return { next: 1, message: "Read it aloud a couple more times. Focus on the three pillar words." };
}

// ── Progress, spaced review and daily streak ────────────────────────────────

export interface CardProgress {
  /** Spaced-review box: 0 = learning, 5 = long-term. */
  box: number;
  due: string;
  level: Level;
  best: number;
  takes: number;
}

export type DailyTask = "flash" | "facts" | "sprint" | "answer" | "craft";

export interface LeadershipState {
  progress: Record<string, CardProgress>;
  custom: AnswerCard[];
  overrides: Record<string, AnswerCard>;
  /** Days (YYYY-MM-DD) with any practice, for the streak. */
  days: string[];
  today: { date: string; done: DailyTask[] };
  /** The company you're interviewing with; fills `{company}` in answers. Empty = neutral wording. */
  company: string;
  /** Your CV, imported in this browser only. */
  cv: CvDoc | null;
  /** Facts and numbers from your CV to know instantly. */
  facts: CvFact[];
  /** Published Topic Library cards from the admin side (cached so practice works offline). */
  library: AnswerCard[];
  /** From onboarding: the learner's profession, used to filter library content. */
  profession?: string;
  /** Show the built-in example interview answers (written for a technology delivery leader). */
  showExamples?: boolean;
}

export interface CvDoc {
  fileName: string;
  importedAt: string;
  lines: string[];
}

export interface CvFact {
  id: string;
  q: string;
  a: string;
}

const KEY = "ceo-voice.leadership";
const DAY = 86_400_000;
/** Days until the next review for each box. Recalling after a gap is what makes memory last. */
const BOX_DAYS = [0, 1, 2, 4, 7, 14];

export function todayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function emptyState(): LeadershipState {
  return { progress: {}, custom: [], overrides: {}, days: [], today: { date: todayKey(), done: [] }, company: "", cv: null, facts: [], library: [] };
}

export function loadState(): LeadershipState {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<LeadershipState> | null;
    const s = { ...emptyState(), ...(raw ?? {}) };
    if (s.today.date !== todayKey()) s.today = { date: todayKey(), done: [] };
    // Cards saved before categories existed.
    s.custom = s.custom.map((c) => ({ ...c, category: c.category ?? "Business" }));
    for (const id of Object.keys(s.overrides)) s.overrides[id] = { ...s.overrides[id], category: s.overrides[id].category ?? DEFAULT_CARDS.find((d) => d.id === id)?.category ?? "Business" };
    return s;
  } catch {
    return emptyState();
  }
}

export function saveState(s: LeadershipState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable: practice still works, it just won't persist */
  }
}

/** Raw cards, with `{company}` placeholders intact (for editing). */
export function rawCards(s: LeadershipState): AnswerCard[] {
  // Built-in interview answers are examples for a technology leader; other professions get their own generated set.
  const showExamples = s.showExamples ?? (!s.profession || s.profession === "technology");
  const defaults = DEFAULT_CARDS.filter((c) => showExamples || !INTERVIEW_CATEGORIES.includes(c.category)).map((c) => s.overrides[c.id] ?? c);
  const library = (s.library ?? []).filter((c) => !s.profession || !c.professions?.length || c.professions.includes(s.profession));
  return [...defaults, ...s.custom, ...library];
}

/** Fills `{company}` / `{Company}` with the target company, or a neutral phrase when none is set. */
export function fillCompany(text: string, company: string): string {
  const name = company.trim();
  return text.replace(/\{company\}/g, name || "your organization").replace(/\{Company\}/g, name || "Your organization");
}

function fillCard(card: AnswerCard, company: string): AnswerCard {
  const f = (t: string) => fillCompany(t, company);
  return {
    ...card,
    topic: f(card.topic),
    question: f(card.question),
    opening: f(card.opening),
    close: f(card.close),
    pillars: card.pillars.map((p) => ({ ...p, title: f(p.title), text: f(p.text) })),
  };
}

/** Cards ready to practise, with the target company filled in. */
export function allCards(s: LeadershipState): AnswerCard[] {
  return rawCards(s).map((c) => fillCard(c, s.company));
}

export function progressOf(s: LeadershipState, id: string): CardProgress {
  return s.progress[id] ?? { box: 0, due: new Date(0).toISOString(), level: 1, best: 0, takes: 0 };
}

export function isDue(p: CardProgress) {
  return new Date(p.due).getTime() <= Date.now();
}

/** Due cards first (weakest box first), then the rest. */
export function reviewOrder(s: LeadershipState): AnswerCard[] {
  const cards = allCards(s);
  return [...cards].sort((a, b) => {
    const pa = progressOf(s, a.id);
    const pb = progressOf(s, b.id);
    const da = isDue(pa) ? 0 : 1;
    const db = isDue(pb) ? 0 : 1;
    return da - db || pa.box - pb.box || new Date(pa.due).getTime() - new Date(pb.due).getTime();
  });
}

export function dueLabel(p: CardProgress): { label: string; due: boolean } {
  if (!p.takes && p.box === 0) return { label: "New", due: true };
  if (isDue(p)) return { label: "Review today", due: true };
  const days = Math.ceil((new Date(p.due).getTime() - Date.now()) / DAY);
  return { label: days <= 1 ? "Review tomorrow" : `Review in ${days} days`, due: false };
}

function markDay(s: LeadershipState, task: DailyTask): LeadershipState {
  const day = todayKey();
  const today = s.today.date === day ? s.today : { date: day, done: [] };
  return {
    ...s,
    days: s.days.includes(day) ? s.days : [...s.days, day].slice(-400),
    today: { date: day, done: today.done.includes(task) ? today.done : [...today.done, task] },
  };
}

/** A recall result moves the card between boxes: remembered → longer gap, forgotten → back to the start. */
export function recordRecall(s: LeadershipState, id: string, remembered: boolean): LeadershipState {
  const p = progressOf(s, id);
  const box = remembered ? Math.min(BOX_DAYS.length - 1, p.box + 1) : 0;
  const due = new Date(Date.now() + BOX_DAYS[box] * DAY).toISOString();
  return { ...s, progress: { ...s.progress, [id]: { ...p, box, due } } };
}

export function recordFlash(s: LeadershipState, id: string, remembered: boolean, task: DailyTask = "flash"): LeadershipState {
  return markDay(recordRecall(s, id, remembered), task);
}

/** Facts due for recall first, weakest box first. */
export function factOrder(s: LeadershipState): CvFact[] {
  return [...s.facts].sort((a, b) => {
    const pa = progressOf(s, a.id);
    const pb = progressOf(s, b.id);
    return (isDue(pa) ? 0 : 1) - (isDue(pb) ? 0 : 1) || pa.box - pb.box;
  });
}

export function recordTake(s: LeadershipState, id: string, take: { level: Level; recall: number; score: number; netUsed: boolean }): LeadershipState {
  const p = progressOf(s, id);
  const next = recommendLevel(take.level, take.recall, take.netUsed).next;
  let out: LeadershipState = {
    ...s,
    progress: { ...s.progress, [id]: { ...p, level: next, best: Math.max(p.best, take.score), takes: p.takes + 1 } },
  };
  // Only unaided takes from memory count as a successful review.
  if (take.level >= 3) out = recordRecall(out, id, take.recall >= 0.8 && !take.netUsed);
  const card = rawCards(s).find((c) => c.id === id);
  return markDay(out, card && isTalk(card.category) ? "craft" : "answer");
}

export function recordSprint(s: LeadershipState): LeadershipState {
  return markDay(s, "sprint");
}

export function streak(s: LeadershipState): number {
  const set = new Set(s.days);
  const d = new Date();
  // Today not done yet doesn't break the streak until tomorrow.
  if (!set.has(todayKey(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (set.has(todayKey(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

// ── Sharp-mind drills ───────────────────────────────────────────────────────

/** Rule-of-three prompts: think in threes and you're never stuck for what comes next. */
export const SPRINT_PROMPTS: string[] = [
  "Three reasons large programs miss their deadlines.",
  "Three things you would do in your first week as an AVP.",
  "Three ways to rebuild trust with an unhappy business partner.",
  "Three signs a squad is about to burn out.",
  "Three questions you ask before approving a business case.",
  "Three lessons from a release that went wrong.",
  "Three ways AI could help a delivery team next quarter.",
  "Three things great leaders do in a crisis.",
  "Three ways to make a status meeting shorter and better.",
  "Three risks of a big-bang migration.",
  "Three things you look for when hiring a delivery manager.",
  "Three ways to say no to a senior executive without damaging the relationship.",
  "Three metrics that tell you a portfolio is healthy.",
  "Three habits that make a leader trusted.",
  "Three ways to bring a vendor back on track.",
  "Three reasons security should start on day one of a project.",
  "Three things you'd tell a new manager on their first day.",
  "Three ways to explain a technical risk to a non-technical board.",
  "Three things that make an agile transformation stick.",
  "Three ways you handle a project that is over budget.",
  "Three things you learned from leading teams at a bank.",
  "Three ways to keep a remote team connected.",
  "Three things you would change in a slow approval process.",
  "Three reasons regulated companies should still move fast.",
];

/** Phrases that fill a pause like a leader, so a blank moment never sounds like one. */
export const BRIDGE_PHRASES: { group: string; when: string; phrases: string[] }[] = [
  {
    group: "Buy thinking time",
    when: "The question lands and your mind is still loading.",
    phrases: [
      "That's a great question. Let me frame it in three parts.",
      "Let me take a moment to give you a precise answer.",
      "I'd look at that from three angles.",
      "The short answer is yes, and here's how I approach it.",
    ],
  },
  {
    group: "Structure on the spot",
    when: "You know the content but need a path through it.",
    phrases: [
      "There are three things that matter here.",
      "Let me start with the outcome, then explain how we got there.",
      "I'll give you the context, the action, and the result.",
      "The principle is simple, and I'll give you an example.",
    ],
  },
  {
    group: "Recover from a blank",
    when: "You lost your thread mid-answer.",
    phrases: [
      "Let me come back to the core point.",
      "To put it simply:",
      "What matters most here is this.",
      "Let me bring that back to the business outcome.",
    ],
  },
  {
    group: "Land it",
    when: "You've said enough. Finish strong and stop.",
    phrases: [
      "So in short:",
      "That's how I keep delivery fast and safe.",
      "And that's the approach I would bring to this role.",
      "Happy to go deeper on any of those.",
    ],
  },
];

export function newCardId() {
  return `custom-${Date.now().toString(36)}`;
}

export function blankCard(): AnswerCard {
  return {
    id: newCardId(),
    topic: "",
    question: "",
    opening: "",
    pillars: [0, 1, 2].map(() => ({ key: "", tag: "", title: "", text: "", cues: [] })),
    close: "",
    category: "Business",
    custom: true,
  };
}

// ── Your own topics ─────────────────────────────────────────────────────────
//
// Paste any article, note or passage. It becomes a practice card: three key
// ideas you can retell from memory, the same way you answer interview questions.

export interface TopicDraft {
  opening: string;
  pillars: { key: string; tag: string; text: string }[];
  close: string;
}

const ORDINALS = ["First", "Second", "Third"];

function sentencesOf(text: string): string[] {
  return (text.replace(/\s+/g, " ").match(/[^.!?]+[.!?]+["')\]”’]*|[^.!?]+$/g) ?? []).map((s) => s.trim()).filter((s) => tokenize(s).length >= 4);
}

const capital = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);

/** Offline draft: split the text into three parts and keep the most central sentences of each. */
export function offlineTopicDraft(title: string, text: string): TopicDraft {
  const sentences = sentencesOf(text);
  const freq = new Map<string, number>();
  for (const w of tokenize(text)) if (w.length > 3) freq.set(stem(w), (freq.get(stem(w)) ?? 0) + 1);
  const score = (s: string) => {
    const words = tokenize(s).filter((w) => w.length > 3);
    return words.reduce((n, w) => n + (freq.get(stem(w)) ?? 0), 0) / Math.sqrt(Math.max(1, tokenize(s).length));
  };

  const per = Math.max(1, Math.ceil(sentences.length / 3));
  const chunks = [0, 1, 2].map((i) => sentences.slice(i * per, (i + 1) * per)).filter((c) => c.length);
  const pillars = chunks.map((chunk, i) => {
    const best = [...chunk].sort((a, b) => score(b) - score(a));
    const picked: string[] = [];
    for (const s of best) {
      if (picked.length && tokenize([...picked, s].join(" ")).length > 45) break;
      picked.push(s);
      if (picked.length === 2) break;
    }
    const ordered = chunk.filter((s) => picked.includes(s));
    const anchors = pickAnchors(chunk.join(" "), 3);
    const key = capital(anchors[0] ?? `Idea ${i + 1}`);
    return { key, tag: anchors.slice(1).map(capital).join(" · "), text: `${ORDINALS[i]}, ${key}: ${ordered.join(" ")}` };
  });
  const top = [...sentences].sort((a, b) => score(b) - score(a))[0] ?? "";
  return {
    opening: `The key ideas of "${title}" come down to three points.`,
    pillars,
    close: top ? `In short: ${top}` : "",
  };
}

/** A published Topic Library topic (from /api/content) as a practice card. */
export function libraryCard(t: {
  id: string;
  section: string;
  professions?: string[];
  stage?: string;
  kind?: "question" | "talk";
  question?: string;
  title: string;
  text: string;
  opening: string;
  pillars: { key: string; tag: string; text: string }[];
  close: string;
}): AnswerCard {
  return {
    id: t.id,
    category: "Library",
    section: t.section,
    stage: t.stage,
    kind: t.kind ?? "talk",
    professions: t.professions ?? [],
    topic: t.title,
    question: t.kind === "question" && t.question ? t.question : `Speak for a minute on "${t.title}". Make your three points.`,
    opening: t.opening,
    pillars: t.pillars.map((p) => ({ key: p.key, tag: p.tag, title: p.key, text: p.text, cues: [p.key, ...p.tag.split(/\s+/)].filter((w) => w.length > 3) })),
    close: t.close,
    source: t.text || undefined,
  };
}

/** Onboarding starter questions → this learner's own "My role" cards. */
export function starterCards(items: { stage: string; topic: string; question: string; opening: string; pillars: { key: string; tag: string; text: string }[]; close: string }[]): AnswerCard[] {
  const seen = new Set<string>();
  return items.map((q, i) => {
    let id = `role-${q.topic.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || i}`;
    if (seen.has(id)) id = `${id}-${i}`;
    seen.add(id);
    return {
      id,
      category: "Role",
      stage: q.stage,
      topic: q.topic,
      question: q.question,
      opening: q.opening,
      pillars: q.pillars.map((p) => ({ key: p.key, tag: p.tag, title: p.key, text: p.text, cues: [p.key, ...p.tag.split(/\s+/)].filter((w) => w.length > 3) })),
      close: q.close,
      custom: true,
    };
  });
}

export function draftToCard(title: string, source: string, d: TopicDraft): AnswerCard {
  return {
    id: newCardId(),
    category: "Topic",
    topic: title,
    question: `Share the key ideas of "${title}" in your own words.`,
    opening: d.opening,
    pillars: d.pillars.map((p) => ({ key: p.key, tag: p.tag, title: p.key, text: p.text, cues: [] })),
    close: d.close,
    source,
    custom: true,
  };
}
