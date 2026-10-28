import { describe, it, expect, beforeEach, vi } from "vitest";

type Row = { user_id: string; client_id: string; data: Record<string, unknown> };

const db = vi.hoisted(() => ({
  meals: [] as { user_id: string; client_id: string; logged_at: string; data: Record<string, unknown> }[],
  failMealFetch: false,
  onMealFetch: null as null | (() => void),
  fetchCalls: 0,
  upserts: 0,
}));

vi.mock("@/integrations/supabase/client", () => {
  const empty = () => {
    const q: Record<string, unknown> = {};
    q.select = () => q;
    q.eq = () => q;
    q.maybeSingle = async () => ({ data: null, error: null });
    q.upsert = async () => ({ error: null });
    return q;
  };

  const meals = () => ({
    select: () => {
      let userId = "";
      const q: Record<string, unknown> = {};
      q.eq = (_c: string, v: string) => ((userId = v), q);
      q.order = () => q;
      q.range = async (from: number, to: number) => {
        db.fetchCalls++;
        db.onMealFetch?.();
        if (db.failMealFetch) return { data: null, error: new Error("offline") };
        const rows = db.meals.filter((r) => r.user_id === userId).slice(from, to + 1);
        return { data: rows.map((r) => ({ data: r.data })), error: null };
      };
      return q;
    },
    upsert: async (rows: Row[]) => {
      db.upserts++;
      for (const r of rows) {
        const i = db.meals.findIndex((m) => m.user_id === r.user_id && m.client_id === r.client_id);
        const row = { ...r, logged_at: String(r.data.loggedAt) };
        if (i >= 0) db.meals[i] = row;
        else db.meals.push(row);
      }
      return { error: null };
    },
    delete: () => {
      const q: Record<string, unknown> = {};
      q.eq = () => q;
      q.in = async (_c: string, ids: string[]) => {
        db.meals = db.meals.filter((m) => !ids.includes(m.client_id));
        return { error: null };
      };
      return q;
    },
  });

  return {
    supabase: {
      from: (table: string) => (table === "meals" ? meals() : empty()),
      auth: { getSession: async () => ({ data: { session: { user: { id: "u1" } } } }) },
    },
  };
});

import { getMeals, getPendingMealIds, saveMeal, type Meal } from "@/lib/profile";
import { syncUserData } from "@/lib/userSync";
import { setTimeZone } from "@/lib/dayKey";

const meal = (id: string, over: Partial<Meal> = {}): Meal => ({
  id,
  loggedAt: "2026-05-20T18:00:00.000Z",
  title: id,
  icon: "",
  items: [],
  totalCalories: 400,
  totalProtein: 0,
  totalCarbs: 0,
  totalFat: 0,
  hiddenIngredient: null,
  source: "photo",
  verified: true,
  day: "2026-05-20",
  ...over,
});

const cloudRow = (m: Meal) => ({ user_id: "u1", client_id: m.id, logged_at: m.loggedAt, data: m as unknown as Record<string, unknown> });

describe("syncUserData", () => {
  beforeEach(() => {
    localStorage.clear();
    setTimeZone("UTC");
    db.meals = [];
    db.failMealFetch = false;
    db.onMealFetch = null;
    db.fetchCalls = 0;
    db.upserts = 0;
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  it("keeps a meal that was logged while the cloud fetch was in flight", async () => {
    db.meals = [cloudRow(meal("cloud"))];
    db.onMealFetch = () => saveMeal(meal("during-sync", { loggedAt: "2026-05-21T09:00:00.000Z", day: undefined }));

    await syncUserData("u1");

    const ids = getMeals().map((m) => m.id).sort();
    expect(ids).toEqual(["cloud", "during-sync"]);
    expect(db.meals.map((m) => m.client_id).sort()).toEqual(["cloud", "during-sync"]);
    expect(getPendingMealIds().size).toBe(0);
  });

  it("leaves the local log untouched when the cloud cannot be read", async () => {
    saveMeal(meal("a"));
    db.failMealFetch = true;
    await syncUserData("u1");
    expect(getMeals().map((m) => m.id)).toEqual(["a"]);
    expect(db.meals.map((m) => m.client_id)).toEqual(["a"]);
  });

  it("reads every page of the cloud history", async () => {
    db.meals = Array.from({ length: 1203 }, (_, i) =>
      cloudRow(meal(`m${i}`, { loggedAt: new Date(Date.UTC(2025, 0, 1, 0, i)).toISOString(), day: undefined })),
    );
    await syncUserData("u1");
    expect(getMeals()).toHaveLength(1203);
    expect(db.fetchCalls).toBe(3);
  });

  it("uploads local meals the cloud is missing even when they are not marked pending", async () => {
    localStorage.setItem("ratioai.meals", JSON.stringify([meal("legacy")]));
    await syncUserData("u1");
    expect(db.meals.map((m) => m.client_id)).toEqual(["legacy"]);
  });

  it("coalesces overlapping syncs into one follow-up run", async () => {
    await Promise.all([syncUserData("u1"), syncUserData("u1"), syncUserData("u1")]);
    expect(db.fetchCalls).toBe(2);
  });
});
