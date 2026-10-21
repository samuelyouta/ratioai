/**
 * Calendar-day helpers for the meal log.
 *
 * Meals are stamped with a UTC ISO instant, but "which day was this eaten on"
 * is a question about the user's wall clock, not UTC. Keying days off
 * `toISOString().slice(0, 10)` puts the day boundary at UTC midnight, so a
 * 9pm dinner in New York lands on tomorrow and a 1am snack in Paris lands on
 * yesterday. Everything here resolves days in the user's zone instead.
 */

const TIMEZONE_KEY = "ratioai.timezone";
const TIMEZONE_CONFIRMED_KEY = "ratioai.timezone.confirmed";

/** YYYY-MM-DD */
export type DayKey = string;

export function getDeviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** The zone all day boundaries are resolved in: user override, else device. */
export function getTimeZone(): string {
  try {
    const stored = localStorage.getItem(TIMEZONE_KEY);
    if (stored && isValidTimeZone(stored)) return stored;
  } catch {
    /* storage unavailable — fall through to device zone */
  }
  return getDeviceTimeZone();
}

/** Pass null to go back to following the device zone. */
export function setTimeZone(tz: string | null): void {
  try {
    if (!tz || tz === getDeviceTimeZone()) localStorage.removeItem(TIMEZONE_KEY);
    else if (isValidTimeZone(tz)) localStorage.setItem(TIMEZONE_KEY, tz);
  } catch {
    /* ignore */
  }
}

export function hasTimeZoneOverride(): boolean {
  try {
    const stored = localStorage.getItem(TIMEZONE_KEY);
    return !!stored && stored !== getDeviceTimeZone();
  } catch {
    return false;
  }
}

/** Whether the user has acknowledged the zone their days are grouped by. */
export function isTimeZoneConfirmed(): boolean {
  try {
    return localStorage.getItem(TIMEZONE_CONFIRMED_KEY) === getTimeZone();
  } catch {
    return true;
  }
}

export function confirmTimeZone(): void {
  try {
    localStorage.setItem(TIMEZONE_CONFIRMED_KEY, getTimeZone());
  } catch {
    /* ignore */
  }
}

const partsCache = new Map<string, Intl.DateTimeFormat>();

function dateParts(tz: string): Intl.DateTimeFormat {
  let fmt = partsCache.get(tz);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    partsCache.set(tz, fmt);
  }
  return fmt;
}

interface WallClock {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function wallClockIn(instant: Date, tz: string): WallClock {
  const parts = dateParts(tz).formatToParts(instant);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour"),
    minute: read("minute"),
    second: read("second"),
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

function keyOf(wall: WallClock): DayKey {
  return `${wall.year}-${pad(wall.month)}-${pad(wall.day)}`;
}

/** The calendar day an instant falls on, in the active zone. */
export function dayKey(instant: Date | string = new Date(), tz = getTimeZone()): DayKey {
  const date = typeof instant === "string" ? new Date(instant) : instant;
  if (Number.isNaN(date.getTime())) return todayKey(tz);
  return keyOf(wallClockIn(date, tz));
}

export function todayKey(tz = getTimeZone()): DayKey {
  return keyOf(wallClockIn(new Date(), tz));
}

/** Hour of day (0–23) an instant falls on, in the active zone. */
export function hourOfDay(instant: Date | string = new Date(), tz = getTimeZone()): number {
  const date = typeof instant === "string" ? new Date(instant) : instant;
  if (Number.isNaN(date.getTime())) return 0;
  return wallClockIn(date, tz).hour;
}

/** Clock time of an instant in the active zone, e.g. "19:45" rendered locally. */
export function formatTimeOfDay(instant: Date | string, tz = getTimeZone()): string {
  const date = typeof instant === "string" ? new Date(instant) : instant;
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: tz,
  });
}

export function isValidDayKey(key: string | null | undefined): key is DayKey {
  return !!key && /^\d{4}-\d{2}-\d{2}$/.test(key);
}

/** Move a day key by whole days. Safe across month, year, and DST boundaries. */
export function shiftDayKey(key: DayKey, days: number): DayKey {
  const [y, m, d] = key.split("-").map(Number);
  const moved = new Date(Date.UTC(y, m - 1, d + days));
  return `${moved.getUTCFullYear()}-${pad(moved.getUTCMonth() + 1)}-${pad(moved.getUTCDate())}`;
}

/** The last `count` day keys ending today, oldest first. */
export function recentDayKeys(count: number, tz = getTimeZone()): DayKey[] {
  const today = todayKey(tz);
  const out: DayKey[] = [];
  for (let i = count - 1; i >= 0; i--) out.push(shiftDayKey(today, -i));
  return out;
}

export function isFutureDay(key: DayKey, tz = getTimeZone()): boolean {
  return key > todayKey(tz);
}

export function isToday(key: DayKey, tz = getTimeZone()): boolean {
  return key === todayKey(tz);
}

/** A Date positioned at midday on that calendar day, for formatting only. */
export function dayKeyToDate(key: DayKey): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

/** "Today" / "Yesterday" / "Mon, Oct 20". */
export function formatDayLabel(key: DayKey, tz = getTimeZone()): string {
  const today = todayKey(tz);
  if (key === today) return "Today";
  if (key === shiftDayKey(today, -1)) return "Yesterday";
  if (key === shiftDayKey(today, 1)) return "Tomorrow";
  const date = dayKeyToDate(key);
  const sameYear = date.getFullYear() === dayKeyToDate(today).getFullYear();
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

export function formatDayLong(key: DayKey): string {
  return dayKeyToDate(key).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

/**
 * The UTC instant at which a given wall-clock time occurs in `tz`.
 * Two passes so the offset used is the one in force at the answer, which keeps
 * the result correct across DST transitions.
 */
function instantForWallClock(
  key: DayKey,
  hour: number,
  minute: number,
  second: number,
  tz: string,
): Date {
  const [y, m, d] = key.split("-").map(Number);
  const target = Date.UTC(y, m - 1, d, hour, minute, second);
  let instant = target;
  for (let i = 0; i < 2; i++) {
    const wall = wallClockIn(new Date(instant), tz);
    const asUtc = Date.UTC(
      wall.year,
      wall.month - 1,
      wall.day,
      wall.hour,
      wall.minute,
      wall.second,
    );
    instant = target - (asUtc - instant);
  }
  return new Date(instant);
}

/**
 * Timestamp to stamp an entry being logged onto `key`.
 * Today keeps the real time of logging; a past or future day reuses the
 * current time of day so entries stay in a sensible order within that day.
 */
export function timestampForDay(key: DayKey, tz = getTimeZone()): string {
  const now = new Date();
  if (key === todayKey(tz)) return now.toISOString();
  const wall = wallClockIn(now, tz);
  const instant = instantForWallClock(key, wall.hour, wall.minute, wall.second, tz);
  // Guard against a wall time that does not exist on that date (spring forward).
  if (dayKey(instant, tz) !== key) {
    return instantForWallClock(key, 12, 0, 0, tz).toISOString();
  }
  return instant.toISOString();
}

/** A short, readable zone label like "Europe/Paris · GMT+2". */
export function describeTimeZone(tz = getTimeZone()): string {
  try {
    const name = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "shortOffset",
    })
      .formatToParts(new Date())
      .find((p) => p.type === "timeZoneName")?.value;
    return name ? `${tz.replace(/_/g, " ")} · ${name}` : tz.replace(/_/g, " ");
  } catch {
    return tz;
  }
}

/**
 * Zones offered in the picker: everything the runtime knows about when it
 * supports enumeration, otherwise a representative spread plus the device zone.
 */
export function listTimeZones(): string[] {
  const device = getDeviceTimeZone();
  let zones: string[] = [];
  try {
    const supported = (
      Intl as unknown as { supportedValuesOf?: (key: string) => string[] }
    ).supportedValuesOf;
    if (typeof supported === "function") zones = supported("timeZone");
  } catch {
    zones = [];
  }
  if (zones.length === 0) zones = [...FALLBACK_ZONES];
  if (!zones.includes(device)) zones = [device, ...zones];
  return zones;
}

const FALLBACK_ZONES = [
  "UTC",
  "Pacific/Honolulu",
  "America/Anchorage",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Toronto",
  "America/Mexico_City",
  "America/Bogota",
  "America/Sao_Paulo",
  "Atlantic/Reykjavik",
  "Europe/London",
  "Europe/Dublin",
  "Europe/Lisbon",
  "Europe/Paris",
  "Europe/Madrid",
  "Europe/Berlin",
  "Europe/Rome",
  "Europe/Amsterdam",
  "Europe/Zurich",
  "Europe/Stockholm",
  "Europe/Warsaw",
  "Europe/Athens",
  "Europe/Istanbul",
  "Europe/Moscow",
  "Africa/Casablanca",
  "Africa/Lagos",
  "Africa/Cairo",
  "Africa/Johannesburg",
  "Africa/Nairobi",
  "Asia/Jerusalem",
  "Asia/Dubai",
  "Asia/Karachi",
  "Asia/Kolkata",
  "Asia/Dhaka",
  "Asia/Bangkok",
  "Asia/Jakarta",
  "Asia/Shanghai",
  "Asia/Hong_Kong",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Australia/Perth",
  "Australia/Brisbane",
  "Australia/Sydney",
  "Australia/Melbourne",
  "Pacific/Auckland",
];
