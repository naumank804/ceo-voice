import type { Metadata } from "next";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

export const metadata: Metadata = { title: "Get started · The CEO Voice" };

export default function StartPage() {
  return <OnboardingWizard />;
}
