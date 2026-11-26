// Vocabulary Injector: "Hedged-to-Executive" flash drills. Each scenario gives a realistic, passive
// or verbose line; the user rewrites it as concise boardroom framing, then compares.

export type VocabCategory = "Stakeholder Pushback" | "Technical Debt" | "Risk & Compliance" | "Budget Trade-offs";

export const VOCAB_CATEGORIES: VocabCategory[] = ["Stakeholder Pushback", "Technical Debt", "Risk & Compliance", "Budget Trade-offs"];

export interface VocabScenario {
  id: string;
  category: VocabCategory;
  situation: string;
  hedged: string;
  executive: string;
  /** The move that makes the executive version work. */
  principle: string;
  /** Power words worth stealing. */
  power: string[];
}

export const VOCAB: VocabScenario[] = [
  // ── Stakeholder Pushback ──
  {
    id: "push-deadline",
    category: "Stakeholder Pushback",
    situation: "A business VP insists on a launch date your team can't safely hit.",
    hedged: "I think maybe we could possibly try to look at the date again, because it might be a little bit tight for the team, if that's okay.",
    executive: "The current date puts quality at risk. I recommend we launch the core release on the 15th and the remaining features two weeks later.",
    principle: "Name the risk, then make a recommendation with a concrete alternative.",
    power: ["I recommend", "puts … at risk", "core release"],
  },
  {
    id: "push-scope",
    category: "Stakeholder Pushback",
    situation: "A stakeholder adds new scope late in the program.",
    hedged: "We couldn't really say no to them, so we sort of just added it in and we'll see how it goes, hopefully it's fine.",
    executive: "We can add it, and here is the trade-off: two weeks of delay or dropping the reporting feature. Which matters more to you?",
    principle: "Never absorb scope silently. Make the trade-off visible and hand the choice back.",
    power: ["here is the trade-off", "which matters more"],
  },
  {
    id: "push-no",
    category: "Stakeholder Pushback",
    situation: "A senior executive asks for something that conflicts with your top priority.",
    hedged: "I'm not sure if we can do that right now, it's kind of difficult with everything else that's going on at the moment.",
    executive: "Not this quarter. Our capacity is committed to the regulatory release. If this is more important, I'll show you what we'd pause.",
    principle: "A clear no, a reason, and an open door. Short sentences signal confidence.",
    power: ["Not this quarter", "capacity is committed", "what we'd pause"],
  },
  {
    id: "push-blame",
    category: "Stakeholder Pushback",
    situation: "A partner team blames your squad for an outage in a meeting.",
    hedged: "Well, I mean, it wasn't really totally our fault, there were some issues on their side as well, basically.",
    executive: "Let's fix the problem first and assign causes in the review. I'll own our part: we'll have a timeline by Thursday.",
    principle: "Move from blame to action. Owning your part makes you the leader in the room.",
    power: ["I'll own our part", "assign causes in the review"],
  },
  {
    id: "push-align",
    category: "Stakeholder Pushback",
    situation: "Two directors want opposite things from your roadmap.",
    hedged: "It's a bit of a tricky situation because they both kind of want different things and I don't really know who to listen to.",
    executive: "We have two valid priorities and one roadmap. I'll bring both options with impact numbers to Friday's steering committee for a decision.",
    principle: "Escalate as a decision, not a complaint. Frame options with impact.",
    power: ["two valid priorities", "for a decision", "impact numbers"],
  },

  // ── Technical Debt ──
  {
    id: "debt-why",
    category: "Technical Debt",
    situation: "You need business funding to fix technical debt.",
    hedged: "The code is kind of old and messy and the developers basically don't like working on it, so we should probably fix it at some point.",
    executive: "Our legacy platform slows every release by three weeks. A six-week investment now cuts that to days and lowers outage risk.",
    principle: "Translate debt into business cost: speed, risk, money. Never 'messy code'.",
    power: ["slows every release", "investment", "lowers outage risk"],
  },
  {
    id: "debt-pause",
    category: "Technical Debt",
    situation: "You want to pause features for one sprint to stabilize.",
    hedged: "Maybe we could take a little break from new features, if it's not too much trouble, just to clean things up a bit.",
    executive: "I'm dedicating the next sprint to stability. It protects the Q3 launch, and features resume on the 1st.",
    principle: "Announce decisions you own. Tie them to an outcome the audience cares about.",
    power: ["I'm dedicating", "protects the launch", "resume on"],
  },
  {
    id: "debt-incident",
    category: "Technical Debt",
    situation: "An outage was caused by a known weak component.",
    hedged: "So, um, we kind of knew that component was a bit fragile, and it sort of broke again, unfortunately.",
    executive: "The outage came from a component we flagged in March. I'm accelerating its replacement and adding monitoring this week.",
    principle: "State the fact plainly, then show the corrective action and the date.",
    power: ["we flagged", "I'm accelerating", "this week"],
  },
  {
    id: "debt-cloud",
    category: "Technical Debt",
    situation: "The board asks why the cloud migration is taking longer than planned.",
    hedged: "It's actually been a lot harder than we thought, there were basically many dependencies that nobody really knew about.",
    executive: "We found forty undocumented dependencies. We've mapped them all, re-sequenced the waves, and the new date is March 30th.",
    principle: "Explain with a number, show control, give a new commitment.",
    power: ["re-sequenced", "we've mapped", "the new date is"],
  },

  // ── Risk & Compliance ──
  {
    id: "risk-regulator",
    category: "Risk & Compliance",
    situation: "A regulatory deadline is at risk.",
    hedged: "I guess there's a chance we might not fully make the regulator's deadline, but we're trying our best, hopefully.",
    executive: "We are at risk on the regulatory deadline. I've added two engineers and daily tracking, and I'll confirm status every Friday.",
    principle: "Bad news early, in one sentence, followed by your plan and cadence.",
    power: ["We are at risk", "daily tracking", "I'll confirm"],
  },
  {
    id: "risk-audit",
    category: "Risk & Compliance",
    situation: "An internal audit found gaps in your access controls.",
    hedged: "The audit kind of found some things that weren't really perfect with access, it was mostly small stuff, I think.",
    executive: "Audit found three access-control gaps. Two are closed; the third closes by month-end with quarterly reviews to prevent recurrence.",
    principle: "Quantify, show progress, and prevent recurrence. Don't minimize findings.",
    power: ["are closed", "closes by", "prevent recurrence"],
  },
  {
    id: "risk-vendor",
    category: "Risk & Compliance",
    situation: "A key vendor fails a security assessment.",
    hedged: "We're not totally sure what to do about the vendor, maybe we should look at other options or something like that.",
    executive: "The vendor failed our security review. They have thirty days to remediate; in parallel, I'm qualifying an alternative.",
    principle: "Set a clear condition and a parallel path. Decisive, not reactive.",
    power: ["in parallel", "remediate", "I'm qualifying"],
  },
  {
    id: "risk-data",
    category: "Risk & Compliance",
    situation: "A data quality issue affected a client report.",
    hedged: "There was sort of a mistake in the data that was sent, it was done by the system, it wasn't really anyone's fault.",
    executive: "A data error reached a client report. We corrected it within a day, informed the client, and added an automated check.",
    principle: "Active voice and ownership. 'Mistakes were made' erodes trust.",
    power: ["we corrected", "informed the client", "automated check"],
  },
  {
    id: "risk-ai",
    category: "Risk & Compliance",
    situation: "Leadership asks if using AI tools is safe for the bank.",
    hedged: "AI is kind of risky I think, but it could maybe be useful, it really depends on a lot of things, honestly.",
    executive: "AI is safe when it's governed. We start with internal use cases, no client data, and a review board approving each step.",
    principle: "Replace 'it depends' with the conditions that make the answer yes.",
    power: ["safe when it's governed", "we start with", "approving each step"],
  },

  // ── Budget Trade-offs ──
  {
    id: "budget-cut",
    category: "Budget Trade-offs",
    situation: "Finance asks you to cut your budget by 15%.",
    hedged: "That's going to be really hard, we're kind of already stretched, I'm not sure we can basically cut anything.",
    executive: "I can find 15%. Here are three options and their impact on delivery; my recommendation is option two.",
    principle: "Say yes to the goal, then shape it with options and a recommendation.",
    power: ["Here are three options", "my recommendation is"],
  },
  {
    id: "budget-ask",
    category: "Budget Trade-offs",
    situation: "You need additional funding for a program.",
    hedged: "We were wondering if maybe there's any chance of getting some extra money, because things have been a bit more expensive.",
    executive: "I'm requesting $1.2M to finish phase two. It protects $8M of annual savings; without it, we delay benefits by two quarters.",
    principle: "Ask directly with a number, and frame the return and the cost of inaction.",
    power: ["I'm requesting", "it protects", "without it"],
  },
  {
    id: "budget-overrun",
    category: "Budget Trade-offs",
    situation: "Your project is 10% over budget.",
    hedged: "Costs sort of went up a little bit more than expected, mostly because of things that were outside our control, really.",
    executive: "We're 10% over budget, driven by vendor rates. I've renegotiated two contracts and we'll land within 3% by year-end.",
    principle: "Size it, name the driver, show the correction and the landing point.",
    power: ["driven by", "I've renegotiated", "we'll land within"],
  },
  {
    id: "budget-prioritize",
    category: "Budget Trade-offs",
    situation: "You must choose between two funded initiatives.",
    hedged: "Both of them are kind of important, so it's really hard to say, I think we should maybe try to do both somehow.",
    executive: "We fund the payments upgrade first. It carries regulatory exposure; the analytics platform follows in Q2 with the freed capacity.",
    principle: "Choose. Give the reason in one clause and the plan for what waits.",
    power: ["We fund … first", "it carries", "follows in Q2"],
  },
];
