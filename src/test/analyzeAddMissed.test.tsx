import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const ai = vi.hoisted(() => ({ analyzeMealPhoto: vi.fn(), describeMealText: vi.fn() }));
vi.mock("@/lib/mealAiClient", () => ai);
vi.mock("@/lib/mealImageStore", () => ({ consumePendingMealImage: () => "data:image/jpeg;base64,AAAA" }));
vi.mock("@/lib/reviewPrompt", () => ({ maybeRequestReview: vi.fn() }));

import Analyze from "@/pages/app/Analyze";
import { getMeals } from "@/lib/profile";

describe("Analyze: add a missed item after the meal is logged", () => {
  beforeEach(() => {
    localStorage.clear();
    ai.analyzeMealPhoto.mockResolvedValue({
      title: "Chicken Bowl",
      icon: "🍗",
      items: [{ name: "Chicken", portion: "150g", calories: 250, protein: 40, carbs: 0, fat: 8, confidence: 90 }],
      hiddenIngredient: null,
      notes: "",
    });
  });

  it("appends the item to the same saved meal and updates totals", async () => {
    render(
      <MemoryRouter>
        <Analyze />
      </MemoryRouter>,
    );
    fireEvent.click(await screen.findByText("Confirm & log meal"));
    expect(await screen.findByText("Meal logged")).toBeInTheDocument();
    expect(getMeals()).toHaveLength(1);

    fireEvent.click(screen.getByText("Add a missed item"));
    fireEvent.change(await screen.findByPlaceholderText(/Search foods/), { target: { value: "rice" } });
    fireEvent.click(await screen.findByText(/White rice/));

    await waitFor(() => expect(getMeals()[0].items).toHaveLength(2));
    const meals = getMeals();
    expect(meals).toHaveLength(1);
    expect(meals[0].items.map((i) => i.name)).toEqual(["Chicken", expect.stringContaining("rice")]);
    expect(meals[0].totalCalories).toBeGreaterThan(250);
    expect(screen.getByText(new RegExp(`${meals[0].totalCalories} calories added`))).toBeInTheDocument();
  });
});
