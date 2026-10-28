import { useEffect, useState } from "react";
import { DATA_CHANGED_EVENT } from "@/lib/profile";
import { todayKey, type DayKey } from "@/lib/dayKey";

const DAY_CHECK_MS = 30_000;

/**
 * Bumps whenever the meal log may have changed underneath a mounted screen:
 * a cloud merge finished, another screen saved, or the app returned to the
 * foreground. Use it as an effect dependency to re-read meals.
 */
export function useMealLogVersion(): number {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const bump = () => setVersion((v) => v + 1);
    const onVisible = () => {
      if (document.visibilityState === "visible") bump();
    };
    window.addEventListener(DATA_CHANGED_EVENT, bump);
    window.addEventListener("focus", bump);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener(DATA_CHANGED_EVENT, bump);
      window.removeEventListener("focus", bump);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return version;
}

/**
 * Today's day key, kept current. A screen left open (or an app resumed from the
 * background) past midnight rolls over to the new day instead of showing
 * yesterday's totals as "today".
 */
export function useTodayKey(): DayKey {
  const [today, setToday] = useState<DayKey>(() => todayKey());

  useEffect(() => {
    const check = () => setToday((prev) => {
      const next = todayKey();
      return next === prev ? prev : next;
    });
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    const timer = window.setInterval(check, DAY_CHECK_MS);
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return today;
}
