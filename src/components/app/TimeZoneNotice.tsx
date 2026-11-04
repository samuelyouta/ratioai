import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Globe2 } from "lucide-react";
import TimeZonePicker from "@/components/app/TimeZonePicker";
import { useT } from "@/i18n";
import {
  confirmTimeZone,
  describeTimeZone,
  formatDayLong,
  isTimeZoneConfirmed,
  todayKey,
} from "@/lib/dayKey";

/**
 * Shown once per time zone until the user confirms it. Days are grouped by this
 * zone, so getting it wrong is what makes entries land on the wrong date.
 */
const TimeZoneNotice = () => {
  const { t, rich } = useT();
  const [confirmed, setConfirmed] = useState(() => isTimeZoneConfirmed());
  const [editing, setEditing] = useState(false);
  const [zoneLabel, setZoneLabel] = useState(() => describeTimeZone());
  const [today, setToday] = useState(() => todayKey());

  if (confirmed && !editing) return null;

  const refresh = () => {
    setZoneLabel(describeTimeZone());
    setToday(todayKey());
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-primary/30 rounded-2xl p-4"
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 shrink-0 rounded-xl bg-primary/15 flex items-center justify-center">
          <Globe2 className="w-4 h-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{t("tz.question")}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {rich("tz.explain", {
              zone: <span className="text-foreground">{zoneLabel}</span>,
              today: <span className="text-foreground">{formatDayLong(today)}</span>,
            })}
          </p>
        </div>
      </div>

      {editing ? (
        <div className="mt-3">
          <TimeZonePicker
            onChange={() => {
              refresh();
              confirmTimeZone();
            }}
          />
          <button
            type="button"
            onClick={() => {
              confirmTimeZone();
              setEditing(false);
              setConfirmed(true);
            }}
            className="mt-3 w-full gradient-glow text-primary-foreground font-semibold text-sm py-2.5 rounded-xl"
          >
            {t("common.done")}
          </button>
        </div>
      ) : (
        <div className="flex gap-2 mt-3">
          <button
            type="button"
            onClick={() => {
              confirmTimeZone();
              setConfirmed(true);
            }}
            className="flex-1 gradient-glow text-primary-foreground font-semibold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            {t("tz.yes")}
          </button>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex-1 bg-secondary text-foreground font-semibold text-xs py-2.5 rounded-xl"
          >
            {t("tz.change")}
          </button>
        </div>
      )}
    </motion.div>
  );
};

export default TimeZoneNotice;
