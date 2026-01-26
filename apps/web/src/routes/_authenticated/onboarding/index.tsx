import { createFileRoute, Navigate } from "@tanstack/react-router";
import { OnboardingPage } from "@/components/onboarding/onboarding-page";

export const Route = createFileRoute("/_authenticated/onboarding/")({
  component: OnboardingComponent,
});

function OnboardingComponent() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <OnboardingPage />
    </div>
  );
}
