import { describe, expect, it } from "vitest";
import { freeTrialDays } from "@/lib/subscriptions";
import { trialReminderDate } from "@/lib/trialReminder";

describe("freeTrialDays", () => {
  it("counts a free introductory offer in days", () => {
    expect(
      freeTrialDays({ price: 0, periodUnit: "DAY", periodNumberOfUnits: 3, cycles: 1 }),
    ).toBe(3);
    expect(
      freeTrialDays({ price: 0, periodUnit: "WEEK", periodNumberOfUnits: 1, cycles: 1 }),
    ).toBe(7);
  });

  it("ignores paid introductory offers", () => {
    expect(
      freeTrialDays({ price: 0.99, periodUnit: "MONTH", periodNumberOfUnits: 1, cycles: 1 }),
    ).toBeNull();
    expect(freeTrialDays(null)).toBeNull();
  });
});

describe("trialReminderDate", () => {
  const now = Date.parse("2026-11-17T15:00:00Z");

  it("reminds one day before a short trial ends", () => {
    const ends = now + 3 * 24 * 60 * 60 * 1000;
    expect(trialReminderDate(ends, now)?.toISOString()).toBe(
      new Date(ends - 24 * 60 * 60 * 1000).toISOString(),
    );
  });

  it("reminds two days before a longer trial ends", () => {
    const ends = now + 7 * 24 * 60 * 60 * 1000;
    expect(trialReminderDate(ends, now)?.toISOString()).toBe(
      new Date(ends - 2 * 24 * 60 * 60 * 1000).toISOString(),
    );
  });

  it("skips a trial that is about to end", () => {
    expect(trialReminderDate(now + 30 * 60 * 1000, now)).toBeNull();
  });
});
