import Link from "next/link";

const MODULES = [
  { name: "Stumble-to-Flow Interview Simulator", href: "/interview", status: "Available", body: "Mock interviews with a Safety Net that catches you when you freeze." },
  { name: "Speaking Stage", href: "/stage", status: "New", body: "Learn speeches without a great memory, drill impromptu talks, and watch yourself back on camera." },
  { name: "CEO Mode", href: null, status: "Next", body: "Real-time filler, pace and authority coaching during live meetings." },
  { name: "Vocabulary Injector", href: null, status: "Planned", body: "Daily drills in the language of the boardroom, applied to your own work." },
];

export default function Home() {
  return (
    <div className="space-y-14">
      <section className="max-w-3xl space-y-5">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-gold-500">Executive Presence Training</p>
        <h1 className="font-serif text-5xl leading-[1.05] text-graphite-100 md:text-6xl">
          You know your work.
          <br />
          <span className="text-graphite-400">Now say it like you own it.</span>
        </h1>
        <p className="max-w-xl text-lg leading-relaxed text-graphite-300">
          For professionals who think clearly in English but lose their words under pressure.
          Train the calm, concise delivery that interviewers, teams and audiences read as leadership.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/interview"
            className="inline-flex items-center gap-2 rounded-md bg-gold-500 px-5 py-3 text-sm font-semibold text-ink transition hover:bg-gold-400"
          >
            Begin a mock interview →
          </Link>
          <Link
            href="/stage"
            className="inline-flex items-center gap-2 rounded-md border border-graphite-700 px-5 py-3 text-sm font-semibold text-graphite-100 transition hover:border-gold-500"
          >
            Rehearse a speech
          </Link>
        </div>
      </section>

      <section className="grid gap-px overflow-hidden rounded-lg border border-graphite-800 bg-graphite-800 sm:grid-cols-2">
        {MODULES.map((m) => {
          const inner = (
            <div className="h-full space-y-2 bg-graphite-950 p-6 transition group-hover:bg-graphite-900">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-2xl text-graphite-100">{m.name}</h2>
                <span className={`text-[10px] uppercase tracking-widest ${m.href ? "text-gold-500" : "text-graphite-400"}`}>{m.status}</span>
              </div>
              <p className="text-sm text-graphite-400">{m.body}</p>
            </div>
          );
          return m.href ? (
            <Link key={m.name} href={m.href} className="group">
              {inner}
            </Link>
          ) : (
            <div key={m.name} className="opacity-70">
              {inner}
            </div>
          );
        })}
      </section>
    </div>
  );
}
