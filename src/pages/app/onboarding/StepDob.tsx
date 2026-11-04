import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import OnboardingLayout from "@/components/OnboardingLayout";
import { ArrowRight } from "lucide-react";
import NumberDial from "@/components/onboarding/NumberDial";
import { getDraft, setDraft } from "@/lib/onboardingDraft";
import { intlLocale, useT } from "@/i18n";

function monthNames(lang: Parameters<typeof intlLocale>[0]) {
  const fmt = new Intl.DateTimeFormat(intlLocale(lang), { month: "short" });
  return Array.from({ length: 12 }, (_, i) => fmt.format(new Date(2024, i, 1)));
}

function daysInMonth(year: number, month1: number) {
  return new Date(year, month1, 0).getDate();
}

function ageFromDob(year: number, month1: number, day: number) {
  const today = new Date();
  let age = today.getFullYear() - year;
  const m = today.getMonth() + 1 - month1;
  if (m < 0 || (m === 0 && today.getDate() < day)) age--;
  return age;
}

const StepDob = () => {
  const navigate = useNavigate();
  const { t, rich, lang } = useT();
  const MONTHS = useMemo(() => monthNames(lang), [lang]);
  const draft = getDraft();
  const currentYear = new Date().getFullYear();

  const parsed = draft.dob ? draft.dob.split("-").map(Number) : null;
  const [year, setYear] = useState<number>(parsed?.[0] ?? currentYear - 25);
  const [month, setMonth] = useState<number>(parsed?.[1] ?? 1);
  const [day, setDay] = useState<number>(parsed?.[2] ?? 1);

  const maxDay = daysInMonth(year, month);
  const clampedDay = Math.min(day, maxDay);

  const age = useMemo(() => ageFromDob(year, month, clampedDay), [year, month, clampedDay]);
  const isValid = age >= 13 && age <= 110;

  const handleNext = () => {
    if (!isValid) return;
    const iso = `${year}-${String(month).padStart(2, "0")}-${String(clampedDay).padStart(2, "0")}`;
    setDraft({ dob: iso, age });
    navigate("/app/onboarding/body");
  };

  return (
    <OnboardingLayout step={3} totalSteps={8}>
      <div className="mb-6">
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
          {t("dob.title")}
        </h2>
        <p className="text-muted-foreground mt-2 text-base">
          {t("dob.subtitle")}
        </p>
      </div>

      <div className="flex-1 space-y-6">
        <div>
          <h3 className="font-semibold text-[11px] mb-1 uppercase tracking-widest text-muted-foreground text-center">
            {t("dob.day")}
          </h3>
          <NumberDial value={clampedDay} min={1} max={maxDay} onChange={setDay} />
        </div>

        <div>
          <h3 className="font-semibold text-[11px] mb-1 uppercase tracking-widest text-muted-foreground text-center">
            {t("dob.month")}
          </h3>
          <div className="text-center mb-2">
            <span
              className="text-5xl font-black text-primary tracking-tight"
              style={{ textShadow: "0 0 28px hsl(var(--primary) / 0.5)" }}
            >
              {MONTHS[month - 1]}
            </span>
          </div>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {MONTHS.map((m, i) => {
              const active = i + 1 === month;
              return (
                <button
                  key={m}
                  onClick={() => setMonth(i + 1)}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground shadow-glow"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-[11px] mb-1 uppercase tracking-widest text-muted-foreground text-center">
            {t("dob.year")}
          </h3>
          <NumberDial value={year} min={currentYear - 110} max={currentYear - 13} onChange={setYear} />
        </div>

        <p className="text-center text-sm text-muted-foreground">
          {rich("dob.age", { age: <span className="text-primary font-bold">{age}</span> })}
        </p>
      </div>

      <button
        disabled={!isValid}
        onClick={handleNext}
        className="gradient-glow text-primary-foreground font-semibold text-base px-8 py-4 rounded-2xl shadow-glow flex items-center gap-2 w-full justify-center mt-6 disabled:opacity-40 disabled:shadow-none transition-opacity"
      >
        {t("common.continue")} <ArrowRight className="w-5 h-5" />
      </button>
    </OnboardingLayout>
  );
};

export default StepDob;
