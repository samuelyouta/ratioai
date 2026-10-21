import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  dayKey,
  formatDayLabel,
  hourOfDay,
  isFutureDay,
  recentDayKeys,
  setTimeZone,
  shiftDayKey,
  timestampForDay,
  todayKey,
} from "@/lib/dayKey";

describe("dayKey", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it("resolves an evening meal in New York to the local day, not the next UTC day", () => {
    setTimeZone("America/New_York");
    // 2026-03-10T01:30:00Z is still 2026-03-09 21:30 in New York.
    expect(dayKey("2026-03-10T01:30:00.000Z")).toBe("2026-03-09");
  });

  it("resolves an after-midnight meal in Paris to the local day, not the previous UTC day", () => {
    setTimeZone("Europe/Paris");
    // 2026-07-14T23:30:00Z is already 2026-07-15 01:30 in Paris.
    expect(dayKey("2026-07-14T23:30:00.000Z")).toBe("2026-07-15");
  });

  it("reads the hour of day in the selected zone", () => {
    setTimeZone("Asia/Tokyo");
    expect(hourOfDay("2026-05-01T03:00:00.000Z")).toBe(12);
  });

  it("steps across month, year, and DST boundaries", () => {
    expect(shiftDayKey("2026-03-01", -1)).toBe("2026-02-28");
    expect(shiftDayKey("2026-01-01", -1)).toBe("2025-12-31");
    expect(shiftDayKey("2026-12-31", 1)).toBe("2027-01-01");
    // US spring-forward day: still exactly one calendar day apart.
    expect(shiftDayKey("2026-03-08", -1)).toBe("2026-03-07");
  });

  it("lists recent days oldest first, ending today", () => {
    setTimeZone("UTC");
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-10T12:00:00.000Z"));
    expect(recentDayKeys(3)).toEqual(["2026-04-08", "2026-04-09", "2026-04-10"]);
  });

  it("never treats a past day as being in the future", () => {
    setTimeZone("UTC");
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-10T12:00:00.000Z"));
    expect(isFutureDay("2026-04-09")).toBe(false);
    expect(isFutureDay("2026-04-10")).toBe(false);
    expect(isFutureDay("2026-04-11")).toBe(true);
  });

  it("labels today and yesterday by name", () => {
    setTimeZone("UTC");
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-10T12:00:00.000Z"));
    expect(formatDayLabel("2026-04-10")).toBe("Today");
    expect(formatDayLabel("2026-04-09")).toBe("Yesterday");
  });

  describe("timestampForDay", () => {
    it("stamps an entry so it lands on the requested day", () => {
      setTimeZone("America/Los_Angeles");
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-06-15T05:00:00.000Z")); // 22:00 on the 14th locally

      const iso = timestampForDay("2026-06-10");
      expect(dayKey(iso)).toBe("2026-06-10");
    });

    it("keeps the exact current instant when logging to today", () => {
      setTimeZone("UTC");
      vi.useFakeTimers();
      const now = new Date("2026-06-15T05:00:00.000Z");
      vi.setSystemTime(now);
      expect(timestampForDay(todayKey())).toBe(now.toISOString());
    });

    it("lands on the right day even when the time of day does not exist there", () => {
      // 2026-03-08 02:30 does not exist in New York (clocks jump 02:00 → 03:00).
      setTimeZone("America/New_York");
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-03-20T07:30:00.000Z")); // 03:30 local
      const iso = timestampForDay("2026-03-08");
      expect(dayKey(iso)).toBe("2026-03-08");
    });
  });
});
