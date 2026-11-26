import type { Metadata } from "next";
import { Roadmap } from "@/components/roadmap/Roadmap";

export const metadata: Metadata = { title: "Your Roadmap · The CEO Voice" };

export default function RoadmapPage() {
  return <Roadmap />;
}
