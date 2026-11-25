import type { AnswerCard, Pillar } from "./leadership";

// Leadership craft: the topics a senior leader is expected to speak about with
// ease, in a town hall, a 1-on-1, a panel or an interview. Same 3-pillar shape
// as interview answers, so one cheat code unlocks a whole talk.

function craft(id: string, topic: string, question: string, opening: string, pillars: [string, string, string, string[]][], close: string): AnswerCard {
  const ord = ["First", "Second", "Third"];
  return {
    id: `craft-${id}`,
    category: "Craft",
    topic,
    question,
    opening,
    pillars: pillars.map(
      ([key, tag, text, cues], i): Pillar => ({ key, tag, title: key, text: `${ord[i]}, ${key}: ${text}`, cues: [key.toLowerCase(), ...cues] }),
    ),
    close,
  };
}

export const CRAFT_CARDS: AnswerCard[] = [
  craft(
    "presence",
    "Executive presence",
    "What does executive presence mean to you, and how do you build it?",
    "Executive presence is not about being loud. It's about how people feel when you speak. I build it on three things.",
    [
      ["Calm", "Slow and steady", "Under pressure I slow down, breathe, and pause before I answer. A calm voice tells the room the situation is under control.", ["pause", "breathe", "pressure"]],
      ["Concise", "Headline first", "I give the headline first, then the detail only if it's needed. Leaders respect people who respect their time.", ["headline", "detail", "time"]],
      ["Conviction", "Own the view", "I state a clear point of view and own it: \"My recommendation is…\", not \"I think maybe…\". Conviction with openness builds trust.", ["recommendation", "point of view", "own"]],
    ],
    "Calm, concise, and clear conviction: that's what makes people lean in.",
  ),
  craft(
    "influence",
    "Influence without authority",
    "How do you influence people who don't report to you?",
    "Most of my best work has depended on people outside my reporting line. I influence them in three steps.",
    [
      ["Listen", "Their goals first", "I start by understanding what they need and what they're measured on. People help those who understand them.", ["understand", "measured", "need"]],
      ["Align", "Shared win", "I frame my request around a shared outcome, so helping me also moves their goals forward.", ["shared", "outcome", "frame"]],
      ["Credit", "Give it away", "When it works, I give them the credit publicly. That turns one favour into a lasting partnership.", ["credit", "publicly", "partnership"]],
    ],
    "Influence is built before you need it, and repaid after you get it.",
  ),
  craft(
    "feedback",
    "Giving difficult feedback",
    "How do you give difficult feedback to a senior member of your team?",
    "Difficult feedback is a gift when it's specific and kind. I use a simple structure.",
    [
      ["Situation", "When and where", "I name the specific moment: \"In yesterday's steering committee…\" Specific, never general.", ["specific", "moment", "yesterday"]],
      ["Behaviour", "What I saw", "I describe what I observed, not my judgement of the person: \"You interrupted the business lead twice.\"", ["behaviour", "observed", "describe"]],
      ["Impact", "Why it matters", "I explain the impact, then ask for their view and agree on a next step together.", ["impact", "next step", "agree"]],
    ],
    "Specific, factual, and forward-looking: that's feedback people can actually use.",
  ),
  craft(
    "delegation",
    "Delegation",
    "How do you delegate without losing control of the outcome?",
    "Delegation is how leaders scale. I delegate in three steps.",
    [
      ["Outcome", "Define done", "I define what success looks like, the deadline, and the boundaries, but not the method.", ["success", "deadline", "boundaries"]],
      ["Ownership", "Real authority", "I hand over real decision rights, not just tasks, and I tell others that this person now owns it.", ["decision", "authority", "owns"]],
      ["Check-ins", "Agreed rhythm", "We agree on check-in points up front, so I stay informed without hovering.", ["check-in", "rhythm", "informed"]],
    ],
    "Clear outcomes, real ownership, light check-ins: that's how teams grow and leaders scale.",
  ),
  craft(
    "decisions",
    "Decisions under uncertainty",
    "How do you make important decisions when you don't have all the information?",
    "In leadership you rarely have all the facts. I decide in three steps.",
    [
      ["Frame", "Reversible?", "I ask: is this decision easy to reverse or not? Reversible decisions should be fast; irreversible ones deserve more care.", ["reversible", "reverse", "irreversible"]],
      ["Enough Data", "70 percent", "I aim for about seventy percent of the information. Waiting for a hundred percent usually means deciding too late.", ["seventy", "information", "late"]],
      ["Commit", "Then review", "I make the call, explain the reasoning, and set a date to review it. Commitment plus learning beats endless debate.", ["commit", "review", "reasoning"]],
    ],
    "A good decision on time beats a perfect decision too late.",
  ),
  craft(
    "trust",
    "Building trust",
    "How do you build trust with a new team or a new executive?",
    "Trust is built in small moments, not big speeches. I build it through three things.",
    [
      ["Competence", "Deliver early", "I find an early, visible win and deliver it. People trust results.", ["deliver", "win", "results"]],
      ["Consistency", "Do what I say", "I do what I said I'd do, every time, even on small things. Reliability is trust in action.", ["reliable", "every time", "said"]],
      ["Care", "Know the person", "I take time to understand people as people: their goals, their pressures. People trust leaders who care about them.", ["care", "people", "goals"]],
    ],
    "Competence, consistency, and care: trust grows from all three together.",
  ),
  craft(
    "safety",
    "Psychological safety",
    "How do you create a team where people speak up about problems early?",
    "Teams only raise problems early when it feels safe to do so. I create that in three ways.",
    [
      ["Invite", "Ask directly", "I ask directly: \"What are we missing? What worries you?\" Silence is not agreement.", ["ask", "missing", "worries"]],
      ["Respond Well", "Thank the messenger", "When someone brings bad news, I thank them first. How I react the first time decides if they come back.", ["thank", "bad news", "react"]],
      ["Model It", "Admit mistakes", "I share my own mistakes openly. When the leader is human, the team feels safe to be honest.", ["mistakes", "honest", "openly"]],
    ],
    "Safe teams surface risks early, and early risks are cheap to fix.",
  ),
  craft(
    "strategy",
    "Strategic thinking",
    "How do you think strategically about technology for a business?",
    "Strategy is about making clear choices. I think about it in three parts.",
    [
      ["Context", "Where we are", "I start with an honest view of the current state: capabilities, gaps, costs, risks, and what the market is doing.", ["current state", "gaps", "market"]],
      ["Choices", "Where to play", "Then I make explicit choices: what we will invest in, and just as important, what we will stop doing.", ["invest", "stop", "choices"]],
      ["Sequence", "Roadmap", "Finally I sequence it into a roadmap with funding gates, so the strategy turns into delivered outcomes.", ["roadmap", "sequence", "funding"]],
    ],
    "Strategy without choices is a wish list; strategy without a roadmap is a slide.",
  ),
  craft(
    "storytelling",
    "Storytelling",
    "How do you use storytelling to communicate as a leader?",
    "Facts inform, but stories move people to act. I tell stories in three beats.",
    [
      ["Situation", "Set the scene", "I start with a real situation people can picture: a client, a team, a moment.", ["scene", "client", "picture"]],
      ["Struggle", "The tension", "I name the problem or the stakes. Without tension there is no story.", ["tension", "problem", "stakes"]],
      ["Shift", "What changed", "I end with what changed and what it means for us now. That's the message people remember.", ["changed", "means", "remember"]],
    ],
    "Numbers go into the head; stories go into the heart. Leaders need both.",
  ),
  craft(
    "coaching",
    "Coaching your team",
    "How do you coach and develop the people who work for you?",
    "My job is to grow leaders, not followers. I coach with three simple steps.",
    [
      ["Goal", "What they want", "I ask what they want to achieve, in this situation and in their career.", ["achieve", "career", "want"]],
      ["Options", "Ask, don't tell", "I ask questions that help them find their own options, instead of giving the answer.", ["questions", "options", "answer"]],
      ["Commitment", "Next step", "We agree on one concrete next step and follow up. Growth happens in the follow-through.", ["next step", "follow up", "concrete"]],
    ],
    "When people find the answer themselves, they own it, and they grow.",
  ),
  craft(
    "conflict",
    "Managing conflict",
    "How do you handle conflict between two senior people on your team?",
    "Conflict between good people is usually about goals, not personalities. I handle it in three steps.",
    [
      ["Pause", "Separate people", "I separate the people from the problem, and talk to each person first, one-on-one.", ["separate", "one-on-one", "problem"]],
      ["Interests", "The why", "I look for the interests behind their positions: what each of them really needs.", ["interests", "positions", "needs"]],
      ["Agreement", "Shared criteria", "I bring them together around shared criteria, like client impact or risk, and we agree on a decision and how we'll review it.", ["criteria", "decision", "together"]],
    ],
    "Handled well, conflict becomes better decisions and stronger relationships.",
  ),
  craft(
    "crisis",
    "Leading in a crisis",
    "How do you lead your team through a crisis?",
    "In a crisis, people look at the leader before they look at the problem. I lead with three things.",
    [
      ["Calm", "Steady presence", "I stay visibly calm. My tone sets the team's tone.", ["steady", "tone", "visibly"]],
      ["Clarity", "Few priorities", "I narrow focus to a few clear priorities and clear roles, so nobody wastes energy.", ["priorities", "roles", "focus"]],
      ["Communicate", "Often and honest", "I communicate often and honestly, including what we don't know yet.", ["honest", "often", "don't know"]],
    ],
    "Calm, clarity, and honest communication turn a crisis into a moment of trust.",
  ),
  craft(
    "meetings",
    "Running effective meetings",
    "How do you run meetings that actually move work forward?",
    "Meetings are expensive, so I run them with discipline. Three rules.",
    [
      ["Purpose", "Decision or input", "Every meeting has a clear purpose: a decision, input, or alignment. If there's no purpose, there's no meeting.", ["decision", "alignment", "agenda"]],
      ["People", "Right room", "Only the people who are needed, and everyone knows why they're there.", ["needed", "room", "why"]],
      ["Actions", "Owner and date", "We end with clear actions, each with an owner and a date, sent out the same day.", ["owner", "date", "actions"]],
    ],
    "Clear purpose, the right people, and owned actions: meetings become momentum.",
  ),
  craft(
    "board",
    "Presenting to executives",
    "How do you present a recommendation to senior executives or a board?",
    "Executives want the answer first. I structure every executive conversation in three parts.",
    [
      ["Headline", "Answer first", "I open with my recommendation in one sentence: what I'm asking for and why it matters.", ["recommendation", "asking", "first"]],
      ["Evidence", "Three facts", "I support it with three facts: the business value, the risk, and the cost. Detail goes in the appendix.", ["facts", "value", "cost"]],
      ["Ask", "Clear decision", "I close with the exact decision I need from them today, and the next step if they agree.", ["decision", "today", "next step"]],
    ],
    "Answer first, evidence second, clear ask last: that's how you get decisions in the room.",
  ),
];
