import { todayKey } from "@/lib/dayKey";

/** AI photo scans allowed per calendar day. The server enforces the same number (api/_lib/scanLimit.js). */
export const DAILY_SCAN_LIMIT = 40;

const KEY = "ratioai.scans";

interface ScanCount {
  day: string;
  count: number;
}

function read(day: string): ScanCount {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<ScanCount> | null;
    if (parsed?.day === day && typeof parsed.count === "number" && parsed.count >= 0) {
      return { day, count: Math.floor(parsed.count) };
    }
  } catch {
    /* fall through to a fresh count */
  }
  return { day, count: 0 };
}

function write(state: ScanCount) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* the server still enforces the limit */
  }
}

export function scansUsedToday(day = todayKey()): number {
  return read(day).count;
}

export function scansLeftToday(day = todayKey()): number {
  return Math.max(DAILY_SCAN_LIMIT - scansUsedToday(day), 0);
}

export function recordScan(day = todayKey()) {
  const state = read(day);
  write({ day, count: state.count + 1 });
}

/** The server said today's allowance is gone; make this device agree. */
export function markScanLimitReached(day = todayKey()) {
  write({ day, count: Math.max(read(day).count, DAILY_SCAN_LIMIT) });
}

export class ScanLimitError extends Error {
  readonly limit: number;
  constructor(limit = DAILY_SCAN_LIMIT, message?: string) {
    super(
      message ??
        `You've used all ${limit} photo scans for today. Your allowance resets tomorrow. You can still log meals by searching or describing them.`,
    );
    this.name = "ScanLimitError";
    this.limit = limit;
  }
}
