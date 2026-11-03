import { useEffect, useMemo, useState } from "react";
import { Field, Sheet } from "@/components/app/Sheet";
import type { Activity, Gender, Goal, Profile, Unit } from "@/lib/profile";
import {
  applyDraft,
  cmToFtIn,
  draftFromProfile,
  ftInToCm,
  hasCustomTargets,
  kgToLbs,
  lbsToKg,
  macroCalories,
  parseNumber,
  recommendedTargets,
  rescaleMacros,
  validateProfile,
  type ProfileDraft,
} from "@/lib/profileEdit";

const GOALS: { id: Goal; label: string }[] = [
  { id: "lose", label: "Lose Fat" },
  { id: "muscle", label: "Build Muscle" },
  { id: "maintain", label: "Recomp" },
  { id: "endurance", label: "Endurance" },
];
const ACTIVITIES: { id: Activity; label: string }[] = [
  { id: "sedentary", label: "Sedentary" },
  { id: "light", label: "Lightly Active" },
  { id: "moderate", label: "Moderately Active" },
  { id: "very", label: "Very Active" },
];
const GENDERS: { id: Gender; label: string }[] = [
  { id: "male", label: "Male" },
  { id: "female", label: "Female" },
  { id: "other", label: "Other" },
];

function Chips<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <p className="text-[11px] font-medium text-muted-foreground mb-1">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            aria-pressed={value === o.id}
            className={`px-3 h-9 rounded-xl text-xs font-semibold border transition-colors ${
              value === o.id
                ? "bg-primary/15 border-primary text-primary"
                : "bg-secondary border-border text-foreground/80"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const fmt = (n: number) => String(Math.round(n * 10) / 10);

interface Props {
  open: boolean;
  profile: Profile;
  onSave: (profile: Profile) => void;
  onClose: () => void;
}

/**
 * Edit every profile setting in place. Targets follow the body stats, goal and
 * activity until the user types their own numbers; from then on only the
 * "Use recommended" button changes them.
 */
const ProfileEditSheet = ({ open, profile, onSave, onClose }: Props) => {
  const [draft, setDraft] = useState<ProfileDraft>(() => draftFromProfile(profile));
  const [customTargets, setCustomTargets] = useState(false);
  const [age, setAge] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [heightFt, setHeightFt] = useState("");
  const [heightIn, setHeightIn] = useState("");
  const [weight, setWeight] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!open) return;
    const d = draftFromProfile(profile);
    setDraft(d);
    setCustomTargets(hasCustomTargets(d));
    setAge(String(d.age));
    setHeightCm(fmt(d.heightCm));
    const { ft, inches } = cmToFtIn(d.heightCm);
    setHeightFt(String(ft));
    setHeightIn(String(inches));
    setWeight(fmt(d.unit === "imperial" ? kgToLbs(d.weightKg) : d.weightKg));
    setSubmitted(false);
  }, [open, profile]);

  const imperial = draft.unit === "imperial";

  /** Applies a change, then refreshes targets from the formula unless the user owns them. */
  const update = (patch: Partial<ProfileDraft>) => {
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      return customTargets ? next : { ...next, ...recommendedTargets(next) };
    });
  };

  const setUnit = (unit: Unit) => {
    if (unit === draft.unit) return;
    setDraft((prev) => ({ ...prev, unit }));
    setWeight(fmt(unit === "imperial" ? kgToLbs(draft.weightKg) : draft.weightKg));
    setHeightCm(fmt(draft.heightCm));
    const { ft, inches } = cmToFtIn(draft.heightCm);
    setHeightFt(String(ft));
    setHeightIn(String(inches));
  };

  const errors = useMemo(() => validateProfile(draft), [draft]);
  const showError = (key: keyof ProfileDraft) => (submitted ? errors[key] : undefined);

  const setTarget = (key: "proteinTarget" | "carbsTarget" | "fatTarget", text: string) => {
    setCustomTargets(true);
    setDraft((prev) => ({ ...prev, [key]: parseNumber(text) }));
  };

  const setCalories = (text: string) => {
    setCustomTargets(true);
    const calories = parseNumber(text);
    setDraft((prev) =>
      Number.isFinite(calories) && calories > 0
        ? { ...prev, calorieTarget: calories, ...rescaleMacros(prev, calories) }
        : { ...prev, calorieTarget: calories },
    );
  };

  const useRecommended = () => {
    setCustomTargets(false);
    setDraft((prev) => ({ ...prev, ...recommendedTargets(prev) }));
  };

  const handleSave = () => {
    setSubmitted(true);
    if (Object.keys(errors).length > 0) return;
    onSave(applyDraft(profile, draft));
  };

  const macroKcal = macroCalories(draft);
  const macroGap = Math.abs(macroKcal - draft.calorieTarget);
  const rec = recommendedTargets(draft);

  return (
    <Sheet open={open} title="Edit profile & targets" onClose={onClose}>
      <div className="space-y-5">
        <Field
          label="Name"
          value={draft.name}
          onChange={(v) => setDraft((p) => ({ ...p, name: v }))}
          placeholder="Your name"
        />

        <Chips label="Goal" options={GOALS} value={draft.goal} onChange={(goal) => update({ goal })} />
        <Chips
          label="Activity level"
          options={ACTIVITIES}
          value={draft.activity}
          onChange={(activity) => update({ activity })}
        />
        <Chips label="Sex" options={GENDERS} value={draft.gender} onChange={(gender) => update({ gender })} />

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-medium text-muted-foreground">Body</p>
            <div className="flex bg-secondary rounded-lg p-0.5">
              {(["metric", "imperial"] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUnit(u)}
                  className={`text-[11px] font-semibold px-3 py-1 rounded-md ${
                    draft.unit === u ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  {u === "metric" ? "cm / kg" : "ft / lb"}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Age"
              suffix="yrs"
              numeric
              value={age}
              error={!!showError("age")}
              onChange={(v) => {
                setAge(v);
                update({ age: parseNumber(v) });
              }}
            />
            <Field
              label="Weight"
              suffix={imperial ? "lb" : "kg"}
              numeric
              value={weight}
              error={!!showError("weightKg")}
              onChange={(v) => {
                setWeight(v);
                const n = parseNumber(v);
                update({ weightKg: imperial ? lbsToKg(n) : n });
              }}
            />
            {imperial ? (
              <>
                <Field
                  label="Height"
                  suffix="ft"
                  numeric
                  value={heightFt}
                  error={!!showError("heightCm")}
                  onChange={(v) => {
                    setHeightFt(v);
                    update({ heightCm: ftInToCm(parseNumber(v), parseNumber(heightIn) || 0) });
                  }}
                />
                <Field
                  label=" "
                  suffix="in"
                  numeric
                  value={heightIn}
                  error={!!showError("heightCm")}
                  onChange={(v) => {
                    setHeightIn(v);
                    update({ heightCm: ftInToCm(parseNumber(heightFt), parseNumber(v) || 0) });
                  }}
                />
              </>
            ) : (
              <Field
                label="Height"
                suffix="cm"
                numeric
                value={heightCm}
                error={!!showError("heightCm")}
                onChange={(v) => {
                  setHeightCm(v);
                  update({ heightCm: parseNumber(v) });
                }}
              />
            )}
          </div>
          {(showError("age") || showError("weightKg") || showError("heightCm")) && (
            <p className="mt-1 text-[11px] text-destructive">
              {showError("age") || showError("weightKg") || showError("heightCm")}
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-medium text-muted-foreground">Daily targets</p>
            <button
              type="button"
              onClick={useRecommended}
              className="text-[11px] font-semibold text-primary"
            >
              Use recommended ({rec.calorieTarget} cal)
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground mb-3">
            {customTargets
              ? "These are your own numbers. They won't change when you edit your stats."
              : "Calculated from your stats and goal. Type a number to set your own."}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Calories"
              suffix="cal"
              numeric
              value={Number.isFinite(draft.calorieTarget) ? String(draft.calorieTarget) : ""}
              error={!!showError("calorieTarget")}
              onChange={setCalories}
            />
            <Field
              label="Protein"
              suffix="g"
              numeric
              value={Number.isFinite(draft.proteinTarget) ? String(draft.proteinTarget) : ""}
              error={!!showError("proteinTarget")}
              onChange={(v) => setTarget("proteinTarget", v)}
            />
            <Field
              label="Carbs"
              suffix="g"
              numeric
              value={Number.isFinite(draft.carbsTarget) ? String(draft.carbsTarget) : ""}
              error={!!showError("carbsTarget")}
              onChange={(v) => setTarget("carbsTarget", v)}
            />
            <Field
              label="Fat"
              suffix="g"
              numeric
              value={Number.isFinite(draft.fatTarget) ? String(draft.fatTarget) : ""}
              error={!!showError("fatTarget")}
              onChange={(v) => setTarget("fatTarget", v)}
            />
          </div>
          {showError("calorieTarget") && (
            <p className="mt-1 text-[11px] text-destructive">{showError("calorieTarget")}</p>
          )}
          {Number.isFinite(macroKcal) && macroGap > 100 && Number.isFinite(draft.calorieTarget) && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Your macros add up to {macroKcal} cal, {macroKcal > draft.calorieTarget ? "above" : "below"} your
              calorie target.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="w-full h-12 rounded-xl gradient-glow text-primary-foreground font-semibold text-sm"
        >
          Save changes
        </button>
      </div>
    </Sheet>
  );
};

export default ProfileEditSheet;
