/** Short, reusable non-medical-advice notice for App Store health scrutiny. */

type Props = {
  className?: string;
  compact?: boolean;
};

const MedicalDisclaimer = ({ className = "", compact = false }: Props) => {
  if (compact) {
    return (
      <p className={`text-[11px] text-muted-foreground leading-relaxed ${className}`}>
        RatioAi provides nutrition estimates for informational purposes only — not medical advice
        or a medical device.
      </p>
    );
  }

  return (
    <div
      className={`rounded-xl border border-border bg-card/60 px-3.5 py-3 text-xs text-muted-foreground leading-relaxed ${className}`}
      role="note"
    >
      <p className="font-semibold text-foreground mb-1">Important health disclaimer</p>
      <p>
        RatioAi is a fitness and nutrition tracking tool. Calorie and macro estimates are AI-generated
        approximations and are <span className="text-foreground font-medium">not medical advice</span>.
        RatioAi is not a medical device and does not diagnose, treat, or prevent disease. Always consult
        a qualified healthcare professional before making significant dietary or health changes.
      </p>
    </div>
  );
};

export default MedicalDisclaimer;
