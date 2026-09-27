import type { Metadata } from "next";
import { StageStudio } from "@/components/stage/StageStudio";

export const metadata: Metadata = { title: "Speaking Stage · The CEO Voice" };

export default function StagePage() {
  return <StageStudio />;
}
