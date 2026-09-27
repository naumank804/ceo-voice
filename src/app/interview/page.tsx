import type { Metadata } from "next";
import { InterviewSimulator } from "@/components/interview/InterviewSimulator";

export const metadata: Metadata = { title: "Interview Simulator · The CEO Voice" };

export default function InterviewPage() {
  return <InterviewSimulator />;
}
