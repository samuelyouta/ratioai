import { useState } from "react";
import { useNavigate } from "react-router-dom";
import OnboardingLayout from "@/components/OnboardingLayout";
import { ArrowRight } from "lucide-react";
import { getDraft, setDraft } from "@/lib/onboardingDraft";
import ScaleSlider from "@/components/onboarding/ScaleSlider";

type HeightUnit = "cm" | "in";
type WeightUnit = "kg" | "lbs";

const StepBody = () => {
  const navigate = useNavigate();
  const draft = getDraft();
  const [heightUnit, setHeightUnit] = useState<HeightUnit>(draft.unit === "imperial" ? "in" : "cm");
  const [weightUnit, setWeightUnit] = useState<WeightUnit>(draft.unit === "imperial" ? "lbs" : "kg");
  const [heightCm, setHeightCm] = useState<number>(draft.heightCm ?? 175);
  const [weightKg, setWeightKg] = useState<number>(draft.weightKg ?? 75);

  const handleNext = () => {
    setDraft({
      unit: heightUnit === "cm" && weightUnit === "kg" ? "metric" : "imperial",
      heightCm: Math.round(heightCm),
      weightKg: Math.round(weightKg * 10) / 10,
    });
    navigate("/app/onboarding/activity");
  };

  const renderToggle = (value: string, options: readonly string[], onChange: (v: string) => void) => (
    <div className="flex bg-secondary rounded-lg p-0.5">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-all ${
            value === o ? "gradient-glow text-primary-foreground shadow-glow" : "text-muted-foreground"
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );

  // ----- Height label -----
  const heightLabel = (cm: number) => {
    if (heightUnit === "cm") {
      return (
        <div>
          <span
            className="text-7xl font-black tabular-nums text-primary tracking-tight"
            style={{ textShadow: "0 0 28px hsl(var(--primary) / 0.5)" }}
          >
            {Math.round(cm)}
          </span>
          <span className="text-2xl font-bold text-muted-foreground ml-2">cm</span>
        </div>
      );
    }
    const totalInches = Math.round(cm / 2.54);
    const ft = Math.floor(totalInches / 12);
    const inch = totalInches % 12;
    return (
      <div>
        <span
          className="text-7xl font-black tabular-nums text-primary tracking-tight"
          style={{ textShadow: "0 0 28px hsl(var(--primary) / 0.5)" }}
        >
          {ft}
        </span>
        <span className="text-2xl font-bold text-muted-foreground mr-3">ft</span>
        <span
          className="text-7xl font-black tabular-nums text-primary tracking-tight"
          style={{ textShadow: "0 0 28px hsl(var(--primary) / 0.5)" }}
        >
          {inch}
        </span>
        <span className="text-2xl font-bold text-muted-foreground ml-2">in</span>
      </div>
    );
  };

  // ----- Weight label -----
  const weightLabel = (kg: number) => {
    const display = weightUnit === "kg" ? Math.round(kg) : Math.round(kg * 2.205);
    return (
      <div>
        <span
          className="text-7xl font-black tabular-nums text-primary tracking-tight"
          style={{ textShadow: "0 0 28px hsl(var(--primary) / 0.5)" }}
        >
          {display}
        </span>
        <span className="text-2xl font-bold text-muted-foreground ml-2">{weightUnit}</span>
      </div>
    );
  };

  return (
    <OnboardingLayout step={2} totalSteps={4}>
      <div className="mb-6">
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">Your body</h2>
        <p className="text-muted-foreground mt-2 text-base">Drag to adjust. We use this for your metabolic rate.</p>
      </div>

      <div className="space-y-10 flex-1">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-xs uppercase tracking-widest text-muted-foreground">Height</h3>
            {renderToggle(heightUnit, ["cm", "in"], (v) => setHeightUnit(v as HeightUnit))}
          </div>
          <ScaleSlider
            value={heightCm}
            min={120}
            max={220}
            step={1}
            onChange={setHeightCm}
            renderLabel={heightLabel}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-xs uppercase tracking-widest text-muted-foreground">Weight</h3>
            {renderToggle(weightUnit, ["kg", "lbs"], (v) => setWeightUnit(v as WeightUnit))}
          </div>
          <ScaleSlider
            value={weightKg}
            min={35}
            max={200}
            step={1}
            onChange={setWeightKg}
            renderLabel={weightLabel}
          />
        </div>
      </div>

      <button
        onClick={handleNext}
        className="gradient-glow text-primary-foreground font-semibold text-base px-8 py-4 rounded-2xl shadow-glow flex items-center gap-2 w-full justify-center mt-6 transition-opacity"
      >
        Continue <ArrowRight className="w-5 h-5" />
      </button>
    </OnboardingLayout>
  );
};

export default StepBody;
