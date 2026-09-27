/**
 * Practice library: material to memorise, read aloud, or talk about.
 *
 * Licensing rule for everything bundled here: it must be public domain, explicitly
 * free to copy, or written for this app. Modern business books are copyrighted, so
 * their stories are not reproduced; well-documented historical events are retold
 * in our own words instead.
 */

export type LibraryCategory = "Leadership" | "Motivation" | "Management" | "Tech leadership" | "Program management" | "Product management";

export const LIBRARY_CATEGORIES: LibraryCategory[] = [
  "Leadership",
  "Motivation",
  "Management",
  "Tech leadership",
  "Program management",
  "Product management",
];

export type LibraryKind = "Speech" | "Quote" | "Story" | "Parable" | "Passage";

export interface LibraryItem {
  id: string;
  kind: LibraryKind;
  category: LibraryCategory;
  title: string;
  text: string;
  source: string;
  /** Shown under the item so users know why it's safe to use. */
  license: string;
  /** Takeaway used as the prompt when the user talks about the item. */
  lesson: string;
}

const PD = "Public domain";
const RETOLD = "Retold for this app from the historical record";
const ORIGINAL = "Written for this app";

export const LIBRARY: LibraryItem[] = [
  // ── Speeches ────────────────────────────────────────────────────────────
  {
    id: "arena",
    kind: "Speech",
    category: "Leadership",
    title: "The Man in the Arena",
    source: "Theodore Roosevelt, “Citizenship in a Republic”, Paris, 1910",
    license: PD,
    lesson: "Credit belongs to the people who try, not the critics.",
    text: `It is not the critic who counts; not the man who points out how the strong man stumbles, or where the doer of deeds could have done them better.

The credit belongs to the man who is actually in the arena, whose face is marred by dust and sweat and blood; who strives valiantly; who errs, who comes short again and again, because there is no effort without error and shortcoming;

but who does actually strive to do the deeds; who knows great enthusiasms, the great devotions; who spends himself in a worthy cause;

who at the best knows in the end the triumph of high achievement, and who at the worst, if he fails, at least fails while daring greatly, so that his place shall never be with those cold and timid souls who neither know victory nor defeat.`,
  },
  {
    id: "moon",
    kind: "Speech",
    category: "Tech leadership",
    title: "We choose to go to the Moon",
    source: "John F. Kennedy, Rice University, 1962 (excerpt)",
    license: "Public domain (U.S. government work)",
    lesson: "Hard goals organise a team's best energy.",
    text: `We choose to go to the Moon in this decade and do the other things, not because they are easy, but because they are hard;

because that goal will serve to organize and measure the best of our energies and skills,

because that challenge is one that we are willing to accept, one we are unwilling to postpone, and one we intend to win, and the others, too.`,
  },
  {
    id: "gettysburg",
    kind: "Speech",
    category: "Leadership",
    title: "The Gettysburg Address",
    source: "Abraham Lincoln, 1863",
    license: PD,
    lesson: "A great speech can be very short. Purpose beats length.",
    text: `Four score and seven years ago our fathers brought forth on this continent, a new nation, conceived in Liberty, and dedicated to the proposition that all men are created equal.

Now we are engaged in a great civil war, testing whether that nation, or any nation so conceived and so dedicated, can long endure. We are met on a great battle-field of that war. We have come to dedicate a portion of that field, as a final resting place for those who here gave their lives that that nation might live. It is altogether fitting and proper that we should do this.

But, in a larger sense, we can not dedicate, we can not consecrate, we can not hallow this ground. The brave men, living and dead, who struggled here, have consecrated it, far above our poor power to add or detract. The world will little note, nor long remember what we say here, but it can never forget what they did here.

It is for us the living, rather, to be dedicated here to the unfinished work which they who fought here have thus far so nobly advanced. It is rather for us to be here dedicated to the great task remaining before us, that from these honored dead we take increased devotion to that cause for which they gave the last full measure of devotion,

that we here highly resolve that these dead shall not have died in vain, that this nation, under God, shall have a new birth of freedom, and that government of the people, by the people, for the people, shall not perish from the earth.`,
  },
  {
    id: "agile",
    kind: "Speech",
    category: "Program management",
    title: "Manifesto for Agile Software Development",
    source:
      "Kent Beck, Mike Beedle, Arie van Bennekum, Alistair Cockburn, Ward Cunningham, Martin Fowler, James Grenning, Jim Highsmith, Andrew Hunt, Ron Jeffries, Jon Kern, Brian Marick, Robert C. Martin, Steve Mellor, Ken Schwaber, Jeff Sutherland, Dave Thomas",
    license: "© 2001, the above authors. This declaration may be freely copied in any form, but only in its entirety through this notice.",
    lesson: "Value people, working results, collaboration and adaptability.",
    text: `We are uncovering better ways of developing software by doing it and helping others do it. Through this work we have come to value:

Individuals and interactions over processes and tools. Working software over comprehensive documentation.

Customer collaboration over contract negotiation. Responding to change over following a plan.

That is, while there is value in the items on the right, we value the items on the left more.`,
  },

  // ── Quotes (public domain) ───────────────────────────────────────────────
  {
    id: "suntzu-know",
    kind: "Quote",
    category: "Leadership",
    title: "Know yourself",
    source: "Sun Tzu, The Art of War (Lionel Giles translation, 1910)",
    license: PD,
    lesson: "Preparation means understanding both yourself and the situation.",
    text: "If you know the enemy and know yourself, you need not fear the result of a hundred battles.",
  },
  {
    id: "franklin-well-done",
    kind: "Quote",
    category: "Motivation",
    title: "Well done",
    source: "Benjamin Franklin, Poor Richard's Almanack, 1737",
    license: PD,
    lesson: "Action matters more than talk.",
    text: "Well done is better than well said.",
  },
  {
    id: "emerson-trust",
    kind: "Quote",
    category: "Motivation",
    title: "Trust thyself",
    source: "Ralph Waldo Emerson, Self-Reliance, 1841",
    license: PD,
    lesson: "Confidence starts with trusting your own judgment.",
    text: "Trust thyself: every heart vibrates to that iron string.",
  },
  {
    id: "emerson-consistency",
    kind: "Quote",
    category: "Leadership",
    title: "Foolish consistency",
    source: "Ralph Waldo Emerson, Self-Reliance, 1841",
    license: PD,
    lesson: "Good leaders change their minds when the facts change.",
    text: "A foolish consistency is the hobgoblin of little minds, adored by little statesmen and philosophers and divines.",
  },
  {
    id: "smiles-heaven",
    kind: "Quote",
    category: "Motivation",
    title: "Help yourself",
    source: "Samuel Smiles, Self-Help, 1859",
    license: PD,
    lesson: "Improvement comes from your own effort.",
    text: "“Heaven helps those who help themselves” is a well-tried maxim, embodying in a small compass the results of vast human experience.",
  },
  {
    id: "allen-circumstances",
    kind: "Quote",
    category: "Motivation",
    title: "Improve yourself first",
    source: "James Allen, As a Man Thinketh, 1903",
    license: PD,
    lesson: "Changing your results starts with changing yourself.",
    text: "Men are anxious to improve their circumstances, but are unwilling to improve themselves; they therefore remain bound.",
  },
  {
    id: "taylor-system",
    kind: "Quote",
    category: "Management",
    title: "The system must be first",
    source: "Frederick W. Taylor, The Principles of Scientific Management, 1911",
    license: PD,
    lesson: "Good systems make good people more effective. (Do you agree?)",
    text: "In the past the man has been first; in the future the system must be first.",
  },
  {
    id: "roosevelt-what-you-have",
    kind: "Quote",
    category: "Motivation",
    title: "Where you are",
    source: "Quoted by Theodore Roosevelt in his Autobiography, 1913",
    license: PD,
    lesson: "Start now, with what you already have.",
    text: "Do what you can, with what you have, where you are.",
  },

  // ── True stories, retold ─────────────────────────────────────────────────
  {
    id: "apollo13",
    kind: "Story",
    category: "Tech leadership",
    title: "Apollo 13: a square peg in a round hole",
    source: "NASA, April 1970",
    license: RETOLD,
    lesson: "Under pressure, define the constraint clearly and let the team solve it.",
    text: `In April 1970, an oxygen tank exploded on Apollo 13, two hundred thousand miles from Earth. The three astronauts moved into the small lunar module to survive.

A new problem appeared. Carbon dioxide was building up. The filters in the lunar module were round, but the spare filters from the command module were square. They did not fit.

On the ground, engineers gathered everything the crew had on board: plastic bags, cardboard, hoses and tape. They designed an adapter from those items only, then read the instructions up to the crew step by step.

The crew built it, and it worked. The lesson for leaders: when the pressure is highest, state the constraint clearly, trust the team with the problem, and communicate the solution simply.`,
  },
  {
    id: "hopper-nanosecond",
    kind: "Story",
    category: "Tech leadership",
    title: "Grace Hopper's nanosecond",
    source: "Rear Admiral Grace Hopper, lectures from the 1960s onward",
    license: RETOLD,
    lesson: "Make abstract technical ideas physical and simple.",
    text: `Grace Hopper was a computer pioneer and a U.S. Navy rear admiral. People kept asking her why satellite messages took so long. The answer was the speed of light, but nobody can picture a nanosecond.

So she brought pieces of wire, each about thirty centimetres long. That, she explained, is the farthest light can travel in one billionth of a second.

Suddenly the idea was real. Generals and students could hold a nanosecond in their hands, and understand why every metre of distance matters.

The lesson: when you explain technology to non-technical people, don't explain more. Find one simple object that makes the idea visible.`,
  },
  {
    id: "andon",
    kind: "Story",
    category: "Management",
    title: "Toyota's andon cord",
    source: "Toyota Production System",
    license: RETOLD,
    lesson: "Make it safe to raise problems early.",
    text: `On a Toyota assembly line, there is a cord that any worker can pull. When someone sees a problem, they pull it, and a team leader comes immediately. If the problem can't be fixed quickly, the line stops.

To many managers this sounds crazy. Why let anyone stop production?

Because a problem found early is small and cheap. A problem found at the end is expensive, or reaches the customer.

The deeper lesson is about culture. The cord only works if people are thanked, not blamed, for pulling it. As a manager, ask yourself: what is the andon cord in my team, and do people feel safe pulling it?`,
  },
  {
    id: "shackleton",
    kind: "Story",
    category: "Leadership",
    title: "Shackleton and the Endurance",
    source: "Imperial Trans-Antarctic Expedition, 1914–1916",
    license: RETOLD,
    lesson: "In a crisis, a leader's calm and routine keep the team together.",
    text: `In 1915, Ernest Shackleton's ship, the Endurance, was trapped and then crushed by Antarctic ice. His goal of crossing Antarctica was gone. The new goal was simpler: bring every man home.

For months the crew camped on drifting ice. Shackleton kept daily routines, shared the worst jobs, and kept the complainers close to him so their fear would not spread.

Finally he sailed a small open boat across one of the roughest oceans on Earth to find help, then crossed the mountains of South Georgia on foot.

Every member of the ship's crew survived. The lesson: when the plan fails, a leader resets the goal, stays visibly calm, and takes care of morale as seriously as logistics.`,
  },
  {
    id: "nightingale",
    kind: "Story",
    category: "Management",
    title: "Florence Nightingale's charts",
    source: "Crimean War hospitals, 1850s",
    license: RETOLD,
    lesson: "Data persuades when it is shown clearly.",
    text: `Florence Nightingale is remembered as a nurse, but she was also a brilliant statistician.

In the Crimean War hospitals, she collected careful records and found something shocking: far more soldiers were dying from preventable disease than from their battle wounds.

Tables of numbers did not move officials. So she drew diagrams, circles divided into coloured wedges, that showed the problem at a glance.

The charts helped convince the government to improve hospital sanitation. The lesson for managers: being right is not enough. Present your data so that a busy decision-maker understands it in five seconds.`,
  },
  {
    id: "washington-sweep",
    kind: "Story",
    category: "Motivation",
    title: "Booker T. Washington's entrance exam",
    source: "Booker T. Washington, Up from Slavery, 1901",
    license: RETOLD,
    lesson: "Doing a small task with total excellence opens doors.",
    text: `As a young man, Booker T. Washington travelled hundreds of miles, often on foot, to reach the Hampton Institute. He arrived tired, hungry and poorly dressed.

The head teacher was unsure about admitting him. Finally she asked him to sweep a classroom.

He swept the room three times. Then he dusted it four times, every bench, table and desk. When she inspected it with a handkerchief, she could not find any dust. She said he would do to enter the school.

The lesson: you don't always get to choose your test. But you can choose to do it so well that nobody can ignore you.`,
  },
  {
    id: "franklin-virtues",
    kind: "Story",
    category: "Motivation",
    title: "Franklin's virtue chart",
    source: "Benjamin Franklin, Autobiography",
    license: RETOLD,
    lesson: "Improve one habit at a time, and track it.",
    text: `As a young man, Benjamin Franklin decided to improve his character. He listed thirteen virtues, such as order, resolution and silence.

He knew he could not fix everything at once. So he focused on one virtue each week, and kept a small book with a chart. Every day he marked a black spot for each fault.

He never became perfect, and he admitted it. But he said he became a better and happier man than he would have been without trying.

The lesson for anyone building a skill, including public speaking: pick one habit, track it daily, and move to the next. Small, visible progress beats a big vague goal.`,
  },
  {
    id: "garcia",
    kind: "Story",
    category: "Management",
    title: "A Message to Garcia",
    source: "Elbert Hubbard, 1899",
    license: RETOLD,
    lesson: "Take ownership; don't wait to be told every step.",
    text: `During the Spanish–American War, the U.S. President needed to reach General Garcia, a rebel leader somewhere in the mountains of Cuba. Nobody knew exactly where he was.

A young officer named Rowan was given the letter. According to Elbert Hubbard's famous essay, he did not ask where Garcia was or how to get there. He simply took the letter, landed in Cuba, crossed the jungle, and delivered it.

Hubbard's point was about ownership. Organisations need people who, given a clear goal, figure out the how themselves.

A modern manager might add: ownership works best when the goal is clear. So when you give someone a message to Garcia, make sure they know why it matters.`,
  },
  {
    id: "polaris",
    kind: "Story",
    category: "Program management",
    title: "Polaris and the birth of PERT",
    source: "U.S. Navy Special Projects Office, 1958",
    license: RETOLD,
    lesson: "Big programs succeed by making dependencies and the critical path visible.",
    text: `In the late 1950s, the U.S. Navy began the Polaris program: a missile launched from a submarine. It involved thousands of contractors and tasks that depended on each other.

To manage it, the team created a technique called PERT. Every task became a box in a network, with arrows showing what depended on what, and three time estimates: optimistic, likely and pessimistic.

The network revealed the critical path: the chain of tasks where any delay delays everything.

Today every program manager uses the idea. The lesson: you cannot manage what you cannot see. Draw the dependencies, find the critical path, and spend your attention there.`,
  },

  // ── Parables (original, for modern roles) ────────────────────────────────
  {
    id: "pm-dashboard",
    kind: "Parable",
    category: "Product management",
    title: "The dashboard nobody used",
    source: "A product management parable",
    license: ORIGINAL,
    lesson: "Solve the underlying problem, not the requested feature.",
    text: `A big customer asked for a dashboard with twenty charts. The team spent three months building it. After launch, only a few people opened it.

The product manager went back and asked a different question: not what do you want, but what decision are you trying to make on Monday morning?

The answer was simple. Managers wanted to know which three accounts needed attention this week.

The next release was a single email with three names and one reason each. Almost everyone read it. The lesson: customers are experts in their problems, not in our solutions. Ask about the decision, not the feature.`,
  },
  {
    id: "pm-no",
    kind: "Parable",
    category: "Product management",
    title: "Saying no with a reason",
    source: "A product management parable",
    license: ORIGINAL,
    lesson: "A clear strategy makes 'no' easy to say and easy to accept.",
    text: `A new product manager said yes to every request. Sales wanted a feature, support wanted a fix, the CEO wanted an experiment. Soon the roadmap was full, and nothing important shipped.

A mentor gave her one rule: every yes is a no to something else. Say which.

From then on, when someone asked for something, she answered: "If we do this, we delay the checkout redesign by three weeks. Is that the right trade?"

Most people chose the redesign. The lesson: saying no is easier when you make the trade-off visible. People accept a no when they can see the reason.`,
  },
  {
    id: "pgm-red",
    kind: "Parable",
    category: "Program management",
    title: "The red status that saved the launch",
    source: "A program management parable",
    license: ORIGINAL,
    lesson: "Report bad news early and with a plan.",
    text: `For weeks, every team on a big program reported green. Two weeks before launch, the program manager discovered that a key integration had not even started.

She could have softened it. Instead, at the leadership review, her first slide said: "Status red. We will miss the date unless we decide today."

She showed two options: move the date by three weeks, or launch without one feature. Leadership chose to launch without the feature, and the launch succeeded.

Afterwards, the sponsor said: "Green reports make me nervous. Your red report made me trust you." The lesson: watermelon status, green outside and red inside, is the enemy. Bad news early is a gift.`,
  },
  {
    id: "tech-rewrite",
    kind: "Parable",
    category: "Tech leadership",
    title: "The rewrite that didn't happen",
    source: "A technology leadership parable",
    license: ORIGINAL,
    lesson: "Translate technical decisions into business outcomes.",
    text: `The engineers wanted to rewrite the old system. They explained it to the executives with words like technical debt, frameworks and architecture. The executives said no.

A new engineering director tried again. She did not mention technology at all. She said: "Today, a small change takes us six weeks. After this work, it will take one week. That means we can respond to customers five times faster."

She proposed doing it in small steps, with a visible win every month.

This time the answer was yes. The lesson: leaders buy outcomes, not technology. Speak in time, money, risk and customers.`,
  },
  {
    id: "lead-listen",
    kind: "Parable",
    category: "Leadership",
    title: "The manager who spoke last",
    source: "A leadership parable",
    license: ORIGINAL,
    lesson: "Leaders who speak last hear the most.",
    text: `A new manager noticed something in her meetings. Whenever she shared her opinion first, everyone agreed with her, and the discussion ended.

So she changed one habit. She asked the question, then stayed silent. She asked the most junior person to speak first, and she spoke last.

At first the silence felt uncomfortable. Then ideas she had never heard started to appear, including the one that fixed their biggest customer problem.

The lesson: your title makes your voice louder than you think. If you want the truth from your team, go last.`,
  },
];

// ── Classic books, fetched live from Project Gutenberg ─────────────────────

export interface ClassicBook {
  /** Project Gutenberg ebook number. Only these IDs can be fetched (the API route checks). */
  id: number;
  title: string;
  author: string;
  year: string;
  category: LibraryCategory;
}

export const CLASSIC_BOOKS: ClassicBook[] = [
  { id: 2680, title: "Meditations", author: "Marcus Aurelius", year: "c. 170", category: "Leadership" },
  { id: 132, title: "The Art of War", author: "Sun Tzu", year: "c. 500 BC", category: "Leadership" },
  { id: 10661, title: "Discourses and Enchiridion", author: "Epictetus", year: "c. 108", category: "Motivation" },
  { id: 935, title: "Self-Help", author: "Samuel Smiles", year: "1859", category: "Motivation" },
  { id: 2541, title: "Character", author: "Samuel Smiles", year: "1871", category: "Leadership" },
  { id: 4507, title: "As a Man Thinketh", author: "James Allen", year: "1903", category: "Motivation" },
  { id: 21291, title: "Pushing to the Front", author: "Orison Swett Marden", year: "1894", category: "Motivation" },
  { id: 368, title: "Acres of Diamonds", author: "Russell Conwell", year: "1890", category: "Motivation" },
  { id: 2944, title: "Essays, First Series (incl. Self-Reliance)", author: "Ralph Waldo Emerson", year: "1841", category: "Motivation" },
  { id: 148, title: "Autobiography", author: "Benjamin Franklin", year: "1791", category: "Leadership" },
  { id: 2376, title: "Up from Slavery", author: "Booker T. Washington", year: "1901", category: "Leadership" },
  { id: 17195, title: "A Message to Garcia", author: "Elbert Hubbard", year: "1899", category: "Management" },
  { id: 6435, title: "The Principles of Scientific Management", author: "Frederick W. Taylor", year: "1911", category: "Management" },
  { id: 2274, title: "How to Live on 24 Hours a Day", author: "Arnold Bennett", year: "1908", category: "Program management" },
  { id: 4238, title: "On the Economy of Machinery and Manufactures", author: "Charles Babbage", year: "1832", category: "Tech leadership" },
  { id: 8581, title: "The Art of Money Getting", author: "P. T. Barnum", year: "1880", category: "Product management" },
];

export interface Passage {
  text: string;
  bookId: number;
  title: string;
  author: string;
  url: string;
}

/** Pulls speakable paragraphs (~35–170 words of real prose) out of a Gutenberg plain-text book. */
export function extractParagraphs(raw: string): string[] {
  const text = raw.replace(/\r/g, "");
  const start = text.search(/\*\*\* ?START OF (THE|THIS) PROJECT GUTENBERG[^\n]*\n/i);
  const end = text.search(/\*\*\* ?END OF (THE|THIS) PROJECT GUTENBERG/i);
  const body = text.slice(start >= 0 ? text.indexOf("\n", start) : 0, end > 0 ? end : undefined);
  return body
    .split(/\n\s*\n/)
    .map((p) => p.replace(/_/g, "").replace(/\s+/g, " ").trim())
    .filter((p) => {
      const words = p.split(" ").length;
      if (words < 35 || words > 170) return false;
      if (!/[.!?]["”’)]?$/.test(p)) return false;
      if (/\[|gutenberg|transcriber|produced by|e-?text|ebook|footnote|illustration/i.test(p)) return false;
      const letters = p.replace(/[^A-Za-z]/g, "");
      const upper = p.replace(/[^A-Z]/g, "");
      return letters.length > 0 && upper.length / letters.length < 0.2;
    });
}
