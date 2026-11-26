import type { Metadata } from "next";
import { VocabularyDrill } from "@/components/vocabulary/VocabularyDrill";

export const metadata: Metadata = { title: "Vocabulary Injector · The CEO Voice" };

export default function VocabularyPage() {
  return <VocabularyDrill />;
}
