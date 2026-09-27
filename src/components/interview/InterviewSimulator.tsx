"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { CameraMirror, CameraToggle } from "@/components/camera/CameraMirror";
import { useCamera } from "@/hooks/useCamera";
import { useSafetyNet } from "@/hooks/useSafetyNet";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { useVoiceActivity } from "@/hooks/useVoiceActivity";
import { offlineAnalysis } from "@/lib/offline-coach";
import { computeMetrics, computePresence, findKeywordsUsed } from "@/lib/speech-metrics";
import type { AnswerAnalysis, AnswerReport as Report, InterviewQuestion } from "@/lib/types";
import { AnswerReport } from "./AnswerReport";
import { LiveAnswer } from "./LiveAnswer";
import { QuestionCard } from "./QuestionCard";
import { SafetyNet } from "./SafetyNet";
import { SessionSummary } from "./SessionSummary";
import { SetupPanel, type SessionConfig } from "./SetupPanel";

type Phase = "setup" | "loading" | "asking" | "answering" | "analyzing" | "report" | "complete";

const HISTORY_KEY = "ceo-voice.interview-sessions";

export function InterviewSimulator() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [config, setConfig] = useState<SessionConfig | null>(null);
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [questionSource, setQuestionSource] = useState<"ai" | "offline">("offline");
  const [index, setIndex] = useState(0);
  const [reports, setReports] = useState<Report[]>([]);
  const [typed, setTyped] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const net = useSafetyNet({ armed: phase === "answering" });
  const stt = useSpeechRecognition({ onActivity: net.markActivity });
  const vad = useVoiceActivity({ onVoice: net.markActivity });
  const tts = useSpeechSynthesis();
  const camera = useCamera();

  const typedMode = stt.supported === false;
  const answerStartRef = useRef(0);
  /** Bumped on every navigation so stale async flows (TTS finishing late) can bail out. */
  const runRef = useRef(0);

  const question = questions[index];
  const liveText = typedMode ? typed : stt.fullText;
  const liveKeywords = useMemo(() => (question ? findKeywordsUsed(liveText, question.keywords) : []), [liveText, question]);

  const beginAnswer = useCallback(() => {
    setPhase("answering");
    if (!typedMode) stt.start();
    camera.startRecording();
  }, [typedMode, stt, camera]);

  const ask = useCallback(
    async (i: number, qs: InterviewQuestion[]) => {
      const run = ++runRef.current;
      stt.stop();
      stt.reset();
      net.reset();
      camera.discardRecording();
      setTyped("");
      setIndex(i);
      setPhase("asking");
      if (!typedMode) await vad.start(); // first call shows the mic permission prompt
      await tts.speak(qs[i].text);
      if (run !== runRef.current) return;
      answerStartRef.current = Date.now();
      beginAnswer();
    },
    [stt, net, typedMode, vad, tts, beginAnswer, camera],
  );

  const repeatQuestion = useCallback(async () => {
    if (!question) return;
    const run = ++runRef.current;
    // Pause listening so the interviewer's voice isn't transcribed; keep what was said so far.
    stt.stop();
    setPhase("asking");
    await tts.speak(question.text);
    if (run !== runRef.current) return;
    beginAnswer();
  }, [question, stt, tts, beginAnswer]);

  const startSession = useCallback(
    async (cfg: SessionConfig) => {
      setConfig(cfg);
      setReports([]);
      setNotice(null);
      setPhase("loading");
      try {
        const res = await fetch("/api/interview/questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cfg),
        });
        const data = (await res.json()) as { questions: InterviewQuestion[]; source: "ai" | "offline" };
        setQuestions(data.questions);
        setQuestionSource(data.source);
        void ask(0, data.questions);
      } catch {
        setNotice("Couldn't reach the server. Check that the app is running and try again.");
        setPhase("setup");
      }
    },
    [ask],
  );

  const finishAnswer = useCallback(async () => {
    if (!question || !config) return;
    runRef.current++;
    const transcript = liveText.trim();
    stt.stop();
    if (!transcript) return;

    // Measure pace over the time actually spent speaking, not the freeze before it.
    const first = net.firstSpeechAt() ?? answerStartRef.current;
    const last = Math.max(net.lastActivityAt(), first + 1000);
    const durationSec = typedMode ? 0 : (last - first) / 1000;
    const videoUrl = await camera.stopRecording();

    const metrics = computeMetrics(transcript, durationSec);
    const keywordsUsed = findKeywordsUsed(transcript, question.keywords);
    const report: Report = {
      question,
      transcript,
      metrics,
      keywordsUsed,
      safetyNet: net.usage,
      presence: computePresence(metrics, keywordsUsed.length, net.usage),
      analysis: null,
      videoUrl,
    };
    const at = index;
    const put = (r: Report) => setReports((prev) => Object.assign([...prev], { [at]: r }));
    put(report);
    setPhase("analyzing");

    let analysis: AnswerAnalysis;
    try {
      const res = await fetch("/api/interview/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.text, transcript, keywords: question.keywords, level: config.level, industry: config.industry }),
      });
      if (!res.ok) throw new Error(String(res.status));
      analysis = (await res.json()) as AnswerAnalysis;
    } catch {
      analysis = offlineAnalysis(transcript);
    }
    put({ ...report, analysis });
    setPhase("report");
  }, [question, config, liveText, stt, net, typedMode, index, camera]);

  const next = useCallback(() => {
    if (index + 1 < questions.length) {
      void ask(index + 1, questions);
      return;
    }
    vad.stop();
    camera.discardRecording();
    setPhase("complete");
    saveHistory(reports);
  }, [index, questions, ask, vad, reports, camera]);

  const restart = useCallback(() => {
    runRef.current++;
    tts.cancel();
    stt.stop();
    vad.stop();
    camera.discardRecording();
    setQuestions([]);
    setReports([]);
    setPhase("setup");
  }, [tts, stt, vad, camera]);

  // ── Render ────────────────────────────────────────────────────────────────

  if (phase === "setup" || phase === "loading") {
    return (
      <>
        {notice && <Banner>{notice}</Banner>}
        <SetupPanel onStart={startSession} busy={phase === "loading"} />
      </>
    );
  }

  if (phase === "complete") return <SessionSummary reports={reports.filter(Boolean)} onRestart={restart} />;

  const report = reports[index];
  const micError = stt.error ?? vad.error;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between text-xs text-graphite-400">
        <div className="flex items-center gap-3">
          <Progress total={questions.length} index={index} />
          {questionSource === "ai" && <span className="text-gold-600">Tailored to your role</span>}
        </div>
        <div className="flex items-center gap-4">
          <CameraToggle camera={camera} />
          <button type="button" onClick={restart} className="hover:text-graphite-100">
            End session
          </button>
        </div>
      </div>

      {micError && <Banner>{micError}</Banner>}

      {(phase === "asking" || phase === "answering") && question && (
        <>
          <QuestionCard
            question={question}
            index={index}
            total={questions.length}
            interviewerSpeaking={phase === "asking"}
            onRepeat={repeatQuestion}
            onSkipReading={tts.cancel}
          />
          <SafetyNet
            level={net.level}
            keywords={question.keywords}
            keywordsUsed={liveKeywords}
            starter={question.starter}
            armed={phase === "answering"}
            docked={net.docked}
            showBreatheCue={net.showBreatheCue}
            onOpen={net.open}
          />
          <div className={camera.on ? "grid gap-5 lg:grid-cols-[1fr_380px]" : ""}>
            <LiveAnswer
              armed={phase === "answering"}
              finalText={stt.finalText}
              interimText={stt.interimText}
              micLevel={vad.level}
              typedMode={typedMode}
              typed={typed}
              onTyped={(v) => {
                setTyped(v);
                net.markActivity();
              }}
              onFinish={finishAnswer}
            />
            <CameraMirror camera={camera} compact />
          </div>
        </>
      )}

      {(phase === "analyzing" || phase === "report") && report && (
        <>
          <h2 className="font-serif text-2xl text-graphite-300">{report.question.text}</h2>
          <AnswerReport
            report={report}
            analyzing={phase === "analyzing"}
            isLast={index + 1 >= questions.length}
            onRetry={() => void ask(index, questions)}
            onNext={next}
            onHear={(t) => void tts.speak(t, 0.92)}
          />
        </>
      )}
    </div>
  );
}

function Progress({ total, index }: { total: number; index: number }) {
  return (
    <div className="flex gap-1" aria-label={`Question ${index + 1} of ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`h-1 w-6 rounded-full ${i < index ? "bg-gold-600" : i === index ? "bg-gold-400" : "bg-graphite-700"}`} />
      ))}
    </div>
  );
}

function Banner({ children }: { children: React.ReactNode }) {
  return <div className="mb-5 rounded-md border border-signal-amber/40 bg-signal-amber/10 px-4 py-3 text-sm text-signal-amber">{children}</div>;
}

/** Local progress log until Supabase is wired in — enough to show week-over-week trends. */
function saveHistory(reports: Report[]) {
  const done = reports.filter(Boolean);
  if (!done.length) return;
  const words = done.reduce((a, r) => a + r.metrics.wordCount, 0);
  const entry = {
    at: new Date().toISOString(),
    avgPresence: Math.round(done.reduce((a, r) => a + r.presence.total, 0) / done.length),
    unaided: done.filter((r) => !r.safetyNet).length,
    answered: done.length,
    fillersPer100: words ? +((done.reduce((a, r) => a + r.metrics.fillerTotal, 0) / words) * 100).toFixed(2) : 0,
  };
  try {
    const prev = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]") as unknown[];
    localStorage.setItem(HISTORY_KEY, JSON.stringify([...prev, entry].slice(-100)));
  } catch {
    /* storage unavailable — non-critical */
  }
}
