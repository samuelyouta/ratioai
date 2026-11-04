import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useT } from "@/i18n";

export function Sheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const { t } = useT();
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-label={title}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="relative w-full max-h-[88vh] overflow-y-auto bg-background border-t border-border rounded-t-3xl px-5 pt-4 pb-6 safe-bottom"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-foreground">{title}</h3>
              <button
                onClick={onClose}
                aria-label={t("common.close")}
                className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center"
              >
                <X className="w-4 h-4 text-foreground" />
              </button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function Field({
  label,
  suffix,
  value,
  onChange,
  numeric,
  placeholder,
  error,
}: {
  label: string;
  suffix?: string;
  value: string;
  onChange: (v: string) => void;
  numeric?: boolean;
  placeholder?: string;
  error?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <div className="relative mt-1">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          inputMode={numeric ? "decimal" : "text"}
          placeholder={placeholder}
          className={`w-full h-11 px-3 ${suffix ? "pr-10" : ""} rounded-xl bg-secondary text-foreground text-sm border focus:outline-none focus:ring-2 focus:ring-primary/40 ${
            error ? "border-destructive" : "border-border"
          }`}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    </label>
  );
}
