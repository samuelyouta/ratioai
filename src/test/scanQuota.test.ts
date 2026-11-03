import { beforeEach, describe, expect, it } from "vitest";
import {
  DAILY_SCAN_LIMIT,
  ScanLimitError,
  markScanLimitReached,
  recordScan,
  scansLeftToday,
  scansUsedToday,
} from "@/lib/scanQuota";

describe("scanQuota", () => {
  beforeEach(() => localStorage.clear());

  it("limits to 40 a day", () => {
    expect(DAILY_SCAN_LIMIT).toBe(40);
    expect(scansLeftToday("2026-05-01")).toBe(40);
  });

  it("counts scans per day and resets on a new day", () => {
    recordScan("2026-05-01");
    recordScan("2026-05-01");
    expect(scansUsedToday("2026-05-01")).toBe(2);
    expect(scansLeftToday("2026-05-01")).toBe(38);
    expect(scansUsedToday("2026-05-02")).toBe(0);
  });

  it("never goes below zero and honours a server-side limit", () => {
    markScanLimitReached("2026-05-01");
    expect(scansLeftToday("2026-05-01")).toBe(0);
    recordScan("2026-05-01");
    expect(scansLeftToday("2026-05-01")).toBe(0);
    markScanLimitReached("2026-05-01");
    expect(scansUsedToday("2026-05-01")).toBeGreaterThanOrEqual(40);
  });

  it("survives corrupt storage", () => {
    localStorage.setItem("ratioai.scans", "{nope");
    expect(scansUsedToday("2026-05-01")).toBe(0);
  });

  it("explains the limit", () => {
    expect(new ScanLimitError().message).toContain("40");
  });
});
