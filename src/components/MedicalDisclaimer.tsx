import { useT } from "@/i18n";

/** Short, reusable non-medical-advice notice for App Store health scrutiny. */

type Props = {
  className?: string;
  compact?: boolean;
};

const MedicalDisclaimer = ({ className = "", compact = false }: Props) => {
  const { t } = useT();
  if (compact) {
    return (
      <p className={`text-[11px] text-muted-foreground leading-relaxed ${className}`}>
        {t("disclaimer.short")}
      </p>
    );
  }

  return (
    <div
      className={`rounded-xl border border-border bg-card/60 px-3.5 py-3 text-xs text-muted-foreground leading-relaxed ${className}`}
      role="note"
    >
      <p className="font-semibold text-foreground mb-1">{t("disclaimer.title")}</p>
      <p>{t("disclaimer.body")}</p>
    </div>
  );
};

export default MedicalDisclaimer;
