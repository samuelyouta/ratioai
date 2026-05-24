import { useState } from "react";
import { useNavigate } from "react-router-dom";
import OnboardingLayout from "@/components/OnboardingLayout";
import { ArrowRight } from "lucide-react";
import { getDraft, setDraft } from "@/lib/onboardingDraft";

const StepName = () => {
  const navigate = useNavigate();
  const draft = getDraft();
  const [name, setName] = useState<string>(draft.name ?? "");

  const trimmed = name.trim();
  const isValid = trimmed.length >= 2;

  const handleNext = () => {
    if (!isValid) return;
    setDraft({ name: trimmed });
    navigate("/app/onboarding/gender");
  };

  return (
    <OnboardingLayout step={1} totalSteps={8}>
      <div className="mb-8">
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
          What should we call you?
        </h2>
        <p className="text-muted-foreground mt-2 text-base">
          We'll use this to personalize your daily plan.
        </p>
      </div>

      <div className="flex-1">
        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 30))}
          onKeyDown={(e) => e.key === "Enter" && handleNext()}
          placeholder="e.g. Alex"
          className="w-full bg-secondary border border-border rounded-2xl px-5 py-5 text-2xl font-semibold text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-colors text-center"
        />
        <p className="text-center text-[11px] text-muted-foreground/70 mt-3">
          At least 2 characters
        </p>
      </div>

      <button
        disabled={!isValid}
        onClick={handleNext}
        className="gradient-glow text-primary-foreground font-semibold text-base px-8 py-4 rounded-2xl shadow-glow flex items-center gap-2 w-full justify-center mt-6 disabled:opacity-40 disabled:shadow-none transition-opacity"
      >
        Continue <ArrowRight className="w-5 h-5" />
      </button>
    </OnboardingLayout>
  );
};

export default StepName;
