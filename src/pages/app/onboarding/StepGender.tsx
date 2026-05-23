import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import OnboardingLayout from "@/components/OnboardingLayout";
import { ArrowRight } from "lucide-react";
import { getDraft, setDraft } from "@/lib/onboardingDraft";
import NumberDial from "@/components/onboarding/NumberDial";
import type { Gender } from "@/lib/profile";

const genders: { id: Gender; label: string }[] = [
  { id: "male", label: "Male" },
  { id: "female", label: "Female" },
  { id: "other", label: "Other" },
];

const StepGender = () => {
  const navigate = useNavigate();
  const draft = getDraft();
  const [name, setName] = useState<string>(draft.name ?? "");
  const [gender, setGender] = useState<Gender | null>(draft.gender ?? null);
  const [age, setAge] = useState<number>(draft.age ?? 25);

  const isValid = !!gender && age > 10 && age < 120;

  const handleNext = () => {
    if (!isValid) return;
    setDraft({ gender: gender!, age, name: name.trim() || undefined });
    navigate("/app/onboarding/body");
  };

  return (
    <OnboardingLayout step={1} totalSteps={4}>
      <div className="mb-6">
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">About you</h2>
        <p className="text-muted-foreground mt-2 text-base">We need this to calculate your ideal daily intake.</p>
      </div>

      <div className="space-y-7 flex-1">
        {/* Name */}
        <div>
          <h3 className="font-semibold text-xs mb-3 uppercase tracking-widest text-muted-foreground">
            Your name <span className="normal-case font-normal text-muted-foreground/60">(optional)</span>
          </h3>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 30))}
            placeholder="e.g. Alex"
            className="w-full bg-secondary border border-border rounded-2xl px-4 py-3.5 text-base text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-colors"
          />
        </div>

        {/* Segmented gender control */}
        <div>
          <h3 className="font-semibold text-xs mb-3 uppercase tracking-widest text-muted-foreground">Gender</h3>
          <div className="relative flex bg-secondary rounded-2xl p-1">
            {gender && (
              <motion.div
                layoutId="gender-pill"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                className="absolute inset-y-1 gradient-glow rounded-xl shadow-glow"
                style={{
                  width: `calc(${100 / genders.length}% - 0.25rem)`,
                  left: `calc(${genders.findIndex((g) => g.id === gender) * (100 / genders.length)}% + 0.125rem)`,
                }}
              />
            )}
            {genders.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setGender(id)}
                className={`relative z-10 flex-1 py-3 text-sm font-semibold transition-colors ${
                  gender === id ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Age dial */}
        <div>
          <h3 className="font-semibold text-xs mb-2 uppercase tracking-widest text-muted-foreground">Age</h3>
          <NumberDial value={age} min={13} max={99} onChange={setAge} unitLabel="years" />
          <p className="text-center text-[11px] text-muted-foreground/70 mt-3">
            Swipe the dial or tap a number
          </p>
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
