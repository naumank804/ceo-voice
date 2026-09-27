"use client";

interface Props {
  armed: boolean;
  finalText: string;
  interimText: string;
  micLevel: number;
  /** Speech recognition unavailable (Firefox, Safari without permission) — fall back to typing. */
  typedMode: boolean;
  typed: string;
  onTyped: (v: string) => void;
  onFinish: () => void;
  title?: string;
  finishLabel?: string;
  idleText?: string;
}

export function LiveAnswer({
  armed,
  finalText,
  interimText,
  micLevel,
  typedMode,
  typed,
  onTyped,
  onFinish,
  title = "Your answer",
  finishLabel = "I've finished my answer",
  idleText = "The mic opens after the question.",
}: Props) {
  const hasContent = typedMode ? typed.trim().length > 0 : (finalText + interimText).trim().length > 0;

  return (
    <section className="rounded-xl border border-graphite-800 bg-graphite-950/60 p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-graphite-400">{title}</p>
        {!typedMode && <MicMeter level={armed ? micLevel : 0} />}
      </div>

      {typedMode ? (
        <textarea
          rows={6}
          value={typed}
          disabled={!armed}
          onChange={(e) => onTyped(e.target.value)}
          placeholder="Speech recognition isn't available in this browser — type your answer as you would say it."
          className="w-full resize-y rounded-md border border-graphite-700 bg-graphite-900 p-3 text-graphite-100 placeholder:text-graphite-600 focus:border-gold-600 focus:outline-none"
        />
      ) : (
        <p className="min-h-24 text-lg leading-relaxed text-graphite-300">
          {finalText}
          {interimText && <span className="text-graphite-600"> {interimText}</span>}
          {!hasContent && <span className="text-graphite-600">{armed ? "Listening…" : idleText}</span>}
        </p>
      )}

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={onFinish}
          disabled={!armed || !hasContent}
          className="rounded-md border border-gold-600 px-5 py-2 text-sm font-medium text-gold-300 transition hover:bg-gold-500 hover:text-ink disabled:cursor-not-allowed disabled:border-graphite-700 disabled:text-graphite-600 disabled:hover:bg-transparent"
        >
          {finishLabel}
        </button>
      </div>
    </section>
  );
}

function MicMeter({ level }: { level: number }) {
  const bars = 12;
  return (
    <div className="flex h-4 items-end gap-0.5" aria-hidden>
      {Array.from({ length: bars }, (_, i) => {
        const on = level * bars > i;
        return <span key={i} className={`w-1 rounded-sm transition-colors duration-75 ${on ? "bg-gold-500" : "bg-graphite-700"}`} style={{ height: `${30 + (i / bars) * 70}%` }} />;
      })}
    </div>
  );
}
