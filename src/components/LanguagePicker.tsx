import { useState } from "react";
import { Check, ChevronRight, Globe } from "lucide-react";
import { Sheet } from "@/components/app/Sheet";
import { LANGUAGES, languageInfo, setLanguage, useT } from "@/i18n";

/**
 * "pill" is the compact corner button used on the first onboarding screen;
 * "row" is the full-width settings row used on the Profile screen.
 */
const LanguagePicker = ({ variant = "pill" }: { variant?: "pill" | "row" }) => {
  const { t, lang } = useT();
  const [open, setOpen] = useState(false);
  const current = languageInfo(lang);

  return (
    <>
      {variant === "pill" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t("language.change")}
          className="h-10 px-3 rounded-xl bg-card border border-border flex items-center gap-1.5 text-xs font-semibold text-foreground"
        >
          <Globe className="w-4 h-4 text-muted-foreground" />
          {current.native}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t("language.change")}
          className="w-full flex items-center gap-3 p-4 rounded-2xl bg-card border border-border text-left"
        >
          <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center shrink-0">
            <Globe className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">{t("language.title")}</p>
            <p className="text-xs text-muted-foreground">{current.native}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
      )}

      <Sheet open={open} title={t("language.title")} onClose={() => setOpen(false)}>
        <ul className="space-y-2">
          {LANGUAGES.map((l) => {
            const active = l.code === lang;
            return (
              <li key={l.code}>
                <button
                  type="button"
                  onClick={() => {
                    setLanguage(l.code);
                    setOpen(false);
                  }}
                  aria-pressed={active}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-colors ${
                    active ? "border-primary bg-primary/[0.07]" : "border-border bg-card"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{l.native}</p>
                    {l.native !== l.english && (
                      <p className="text-[11px] text-muted-foreground">{l.english}</p>
                    )}
                  </div>
                  {active && <Check className="w-4 h-4 text-primary shrink-0" />}
                </button>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-[11px] text-muted-foreground">{t("language.note")}</p>
      </Sheet>
    </>
  );
};

export default LanguagePicker;
