import { SiteHeader } from "@/components/site-header";
import { OnboardingForm } from "./onboarding-form";

export default function OnboardingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <SiteHeader homeHref="/protected" />
      <div className="w-full max-w-lg p-5 py-12">
        <OnboardingForm />
      </div>
    </main>
  );
}
