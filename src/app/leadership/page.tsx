import type { Metadata } from "next";
import { LeadershipStudio } from "@/components/leadership/LeadershipStudio";

export const metadata: Metadata = { title: "Leadership Practice · The CEO Voice" };

export default function LeadershipPage() {
  return <LeadershipStudio />;
}
