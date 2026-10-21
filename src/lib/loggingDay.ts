/**
 * The day an entry is being logged onto travels between screens as a `?day=`
 * search param, so Log → Analyze → Today all agree on where the meal lands and
 * a hardware back press restores the day the user was looking at.
 */

import { isFutureDay, isValidDayKey, todayKey, type DayKey } from "@/lib/dayKey";

export const DAY_PARAM = "day";

/** Reads a usable day from a URLSearchParams, falling back to today. */
export function readDayParam(params: URLSearchParams): DayKey {
  const raw = params.get(DAY_PARAM);
  if (isValidDayKey(raw) && !isFutureDay(raw)) return raw;
  return todayKey();
}

/** Appends `?day=` only when the target is not today, keeping URLs clean. */
export function withDay(path: string, day: DayKey): string {
  if (day === todayKey()) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}${DAY_PARAM}=${day}`;
}
