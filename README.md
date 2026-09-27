# The CEO Voice

Executive communication training for non-native English speakers.

- **Interview Simulator** (`/interview`): mock interviews with a Safety Net that catches you when you freeze.
- **Speaking Stage** (`/stage`): public-speaking practice built for people who find memorising hard.
  - *Rehearse a speech*: your script is split into short sections, then support fades step by step
    (full script → first letters → 3 anchor words → nothing). Practise one section at a time, get a
    hint only when you freeze, and follow a spaced rehearsal schedule (1, 2, 4, 7… days).
  - *Impromptu drill*: speak on a surprise topic using a framework (PREP, Past-Present-Future,
    Problem-Solution-Benefit, What-So what-Now what) instead of memorising. Steps light up as you signpost them.
  - Templates: self-introduction, elevator pitch, team update, presentation opening, toast, tough Q&A.
  - *Practice library*: public-domain speeches and quotes (Roosevelt, Lincoln, JFK, Franklin, Emerson…),
    the Agile Manifesto, true stories retold (Apollo 13, Toyota andon, Shackleton, Polaris/PERT…) and parables
    for product/program management. Plus random passages fetched live from 16 public-domain classics on
    Project Gutenberg (`/api/library/passage`, allow-listed IDs in `src/lib/library.ts`).
    Every item can be memorised, or talked about / retold in the Impromptu drill.
- **Themes**: Light (default), Dark, Sepia, High contrast, or Match my device. Header picker, saved per browser.
- **Camera mirror** (both modules, optional): self-view with eye-line guides, per-take recording, and
  a watch-back self-review. Video never leaves the browser.

```bash
npm install
cp .env.example .env.local   # optional: add OPENAI_API_KEY
npm run dev                  # http://localhost:3000/interview
```

Use Chrome or Edge (Web Speech API). Without an OpenAI key the app runs fully offline with a built-in question bank and a rule-based grammar coach.

## Structure

```
src/
├─ app/
│  ├─ interview/page.tsx               Interview Simulator route
│  ├─ stage/page.tsx                   Speaking Stage route
│  └─ api/interview/
│     ├─ questions/route.ts            JD → questions + Safety Net anchors (OpenAI, offline fallback)
│     └─ analyze/route.ts              transcript → corrections, CEO rewrite, coaching note
├─ components/interview/
│  ├─ InterviewSimulator.tsx           phase machine: setup → asking → answering → report → summary
│  ├─ SafetyNet.tsx                    the 3s-freeze lifeline (anchors → opening line)
│  ├─ QuestionCard.tsx / LiveAnswer.tsx
│  ├─ AnswerReport.tsx / SessionSummary.tsx
│  └─ SetupPanel.tsx
├─ components/stage/
│  ├─ StageStudio.tsx                  mode tabs + shared camera/TTS
│  ├─ SpeechRehearsal.tsx              library, templates, editor
│  ├─ RehearsalRoom.tsx                memory ladder, section practice, lifeline, report
│  └─ ImpromptuDrill.tsx               topic → think time → framework-guided talk → report
├─ components/camera/CameraMirror.tsx  toggle, mirror, take playback + self-review
├─ hooks/
│  ├─ useCamera.ts                     webcam stream + MediaRecorder takes
│  ├─ useLiveTake.ts                   mic + STT + freeze detector for one Stage take
│  ├─ useSafetyNet.ts                  silence timer + escalation ladder
│  ├─ useVoiceActivity.ts              Web Audio mic energy (instant speech detection)
│  ├─ useSpeechRecognition.ts          Web Speech API STT with auto-restart
│  └─ useSpeechSynthesis.ts            interviewer voice (TTS)
└─ lib/
   ├─ stage.ts                          sections, fading cues, coverage, frameworks, topics, spaced rehearsal
   ├─ speech-metrics.ts                fillers, WPM, hedges, anchor matching, Presence Points
   ├─ offline-coach.ts / question-bank.ts
   └─ highlight.ts                     transcript annotation
```

## How the Safety Net works

1. The interviewer reads the question aloud. The net is **disarmed** while it speaks.
2. When the question ends, the silence clock starts. Any sound (mic energy **or** a recognised word) resets it.
3. At **1.5s** of silence: a calm cue reframes the pause ("A pause reads as confidence"). There's no visible countdown, because a ticking clock makes the freeze worse.
4. At **3s**: three anchor keywords appear in order (Open → Develop → Close).
5. **4s** more of silence: a confident opening sentence appears.
6. As the candidate speaks, anchors tick gold when used, and the panel "docks" (dims) so it doesn't compete for attention.
7. Usage is scored under *Independence*, so the trend to watch is more answers given without the net.
