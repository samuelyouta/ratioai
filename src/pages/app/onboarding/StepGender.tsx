import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import OnboardingLayout from "@/components/OnboardingLayout";
import { ArrowRight, Minus, Plus } from "lucide-react";
import { getDraft, setDraft } from "@/lib/onboardingDraft";
import type { Gender } from "@/lib/profile";

const genders: { id: Gender; label: string }[] = [
  { id: "male", label: "Male" },
  { id: "female", label: "Female" },
  { id: "other", label: "Other" },
];

const StepGender = () => {
  const navigate = useNavigate();
  const draft = getDraft();
  const [gender, setGender] = useState<Gender | null>(draft.gender ?? null);
  const [age, setAge] = useState<number>(draft.age ?? 25);

  const isValid = gender && age > 10 && age < 120;

  const handleNext = () => {
    if (!isValid) return;
    setDraft({ gender: gender!, age });
    navigate("/app/onboarding/body");
  };

  const bump = (delta: number) => setAge((a) => Math.max(11, Math.min(119, a + delta)));

  return (
    <OnboardingLayout step={1} totalSteps={4}>
      <div className="mb-8">
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">About you</h2>
        <p className="text-muted-foreground mt-2 text-base">We need this to calculate your ideal daily intake.</p>
      </div>

      <div className="space-y-10 flex-1">
        {/* Segmented gender control */}
        <div>
          <h3 className="font-semibold text-foreground text-sm mb-3 uppercase tracking-widest text-muted-foreground">
            Gender
          </h3>
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

        {/* Age picker */}
        <div>
          <h3 className="font-semibold text-sm mb-4 uppercase tracking-widest text-muted-foreground">Age</h3>
          <div className="flex items-center justify-center gap-8">
            <button
              onClick={() => bump(-1)}
              className="w-12 h-12 rounded-full border border-border bg-card flex items-center justify-center text-foreground hover:border-primary hover:text-primary transition-colors"
              aria-label="Decrease age"
            >
              <Minus className="w-5 h-5" />
            </button>
            <motion.div
              key={age}
              initial={{ scale: 0.92, opacity: 0.6 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 380, damping: 22 }}
            >
              <input
                type="number"
                value={age}
                min={11}
                max={119}
                onChange={(e) => {
                  const val = e.target.value === "" ? "" : parseInt(e.target.value, 10);
                  if (val === "") return;
                  if (!isNaN(val)) setAge(Math.max(11, Math.min(119, val)));
                }}
                className="text-7xl font-black tabular-nums text-primary tracking-tight bg-transparent border-none outline-none text-center w-[200px] focus:ring-0 p-0"
                style={{ textShadow: "0 0 24px hsl(var(--primary) / 0.45)" }}
              />
            </motion.div>
            <button
              onClick={() => bump(1)}
              className="w-12 h-12 rounded-full border border-border bg-card flex items-center justify-center text-foreground hover:border-primary hover:text-primary transition-colors"
              aria-label="Increase age"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-3">years old</p>
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
