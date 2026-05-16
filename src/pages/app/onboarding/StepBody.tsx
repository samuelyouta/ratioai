import { useState } from "react";
import { useNavigate } from "react-router-dom";
import OnboardingLayout from "@/components/OnboardingLayout";
import { ArrowRight } from "lucide-react";
import { getDraft, setDraft } from "@/lib/onboardingDraft";
import previewBody from "@/assets/preview-body.png";

type HeightUnit = "cm" | "in";
type WeightUnit = "kg" | "lbs";

const StepBody = () => {
  const navigate = useNavigate();
  const draft = getDraft();
  const initialHeightUnit: HeightUnit = draft.unit === "imperial" ? "in" : "cm";
  const initialWeightUnit: WeightUnit = draft.unit === "imperial" ? "lbs" : "kg";

  const [heightUnit, setHeightUnit] = useState<HeightUnit>(initialHeightUnit);
  const [weightUnit, setWeightUnit] = useState<WeightUnit>(initialWeightUnit);

  const [height, setHeight] = useState<string>(
    draft.heightCm ? (initialHeightUnit === "cm" ? String(draft.heightCm) : String(Math.round(draft.heightCm / 2.54))) : "",
  );
  const [weight, setWeight] = useState<string>(
    draft.weightKg ? (initialWeightUnit === "kg" ? String(draft.weightKg) : String(Math.round(draft.weightKg * 2.205))) : "",
  );

  const isValid = height && weight && Number(height) > 0 && Number(weight) > 0;

  const handleNext = () => {
    if (!isValid) return;
    const heightCm = heightUnit === "cm" ? Number(height) : Number(height) * 2.54;
    const weightKg = weightUnit === "kg" ? Number(weight) : Number(weight) / 2.205;
    // Persist `unit` to track user's preferred display; default to heightUnit's system
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
          className={`text-xs font-medium px-3 py-1 rounded-md transition-all ${
            value === o ? "gradient-glow text-primary-foreground" : "text-muted-foreground"
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );

  return (
    <OnboardingLayout step={2} totalSteps={4}>
      <div className="mb-6">
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">Your body</h2>
        <p className="text-muted-foreground mt-2 text-base">Used to calculate your metabolic rate.</p>
        <img
          src={previewBody}
          alt="Body info preview"
          loading="lazy"
          width={512}
          height={512}
          className="mt-5 mx-auto h-32 w-auto rounded-xl opacity-90"
        />
      </div>

      <div className="space-y-5 flex-1">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-foreground text-sm">Height</h3>
            <UnitToggle value={heightUnit} onChange={setHeightUnit} options={["cm", "in"] as const} />
          </div>
          <div className="relative">
            <input
              type="number"
              inputMode="decimal"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              placeholder={heightUnit === "cm" ? "175" : "69"}
              className="w-full bg-card border border-border rounded-xl py-3 px-4 pr-12 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              {heightUnit}
            </span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-foreground text-sm">Weight</h3>
            <UnitToggle value={weightUnit} onChange={setWeightUnit} options={["kg", "lbs"] as const} />
          </div>
          <div className="relative">
            <input
              type="number"
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder={weightUnit === "kg" ? "75" : "165"}
              className="w-full bg-card border border-border rounded-xl py-3 px-4 pr-12 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              {weightUnit}
            </span>
          </div>
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

export default StepBody;
