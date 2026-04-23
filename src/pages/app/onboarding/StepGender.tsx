import { useState } from "react";
import { useNavigate } from "react-router-dom";
import OnboardingLayout from "@/components/OnboardingLayout";
import { ArrowRight } from "lucide-react";
import { getDraft, setDraft } from "@/lib/onboardingDraft";
import type { Gender } from "@/lib/profile";

const genders: { id: Gender; label: string; icon: string }[] = [
  { id: "male", label: "Male", icon: "♂️" },
  { id: "female", label: "Female", icon: "♀️" },
  { id: "other", label: "Other", icon: "⚧️" },
];

const StepGender = () => {
  const navigate = useNavigate();
  const draft = getDraft();
  const [gender, setGender] = useState<Gender | null>(draft.gender ?? null);
  const [age, setAge] = useState<string>(draft.age ? String(draft.age) : "");

  const isValid = gender && age && Number(age) > 10 && Number(age) < 120;

  const handleNext = () => {
    if (!isValid) return;
    setDraft({ gender: gender!, age: Number(age) });
    navigate("/app/onboarding/body");
  };

  return (
    <OnboardingLayout step={1} totalSteps={4}>
      <div className="mt-8 mb-6">
        <h2 className="text-2xl font-bold text-foreground">About you</h2>
        <p className="text-muted-foreground mt-1 text-sm">We need this to calculate your ideal daily intake.</p>
      </div>

      <div className="space-y-6 flex-1">
        <div>
          <h3 className="font-semibold text-foreground text-sm mb-2.5">Gender</h3>
          <div className="flex gap-2">
            {genders.map(({ id, label, icon }) => (
              <button
                key={id}
                onClick={() => setGender(id)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-all ${
                  gender === id ? "border-primary bg-primary/5 text-foreground" : "border-border bg-card text-muted-foreground"
                }`}
              >
                <span>{icon}</span> {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-foreground text-sm mb-2.5">Age</h3>
          <input
            type="number"
            inputMode="numeric"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            placeholder="25"
            className="w-full bg-card border border-border rounded-xl py-3 px-4 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
          />
        </div>
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

export default StepGender;
