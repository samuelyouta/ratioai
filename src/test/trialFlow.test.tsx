import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import TrialIntro from "@/pages/app/TrialIntro";
import TrialReminder from "@/pages/app/TrialReminder";
import Paywall from "@/pages/app/Paywall";

vi.mock("@/hooks/useSubscription", () => ({
  useSubscription: () => ({
    isPro: false,
    status: "inactive",
    subscriptionRequired: true,
    productsUnavailable: true,
    monthlyPackage: null,
    yearlyPackage: null,
    monthlyProduct: null,
    yearlyProduct: null,
    purchase: vi.fn(async () => false),
    restore: vi.fn(async () => false),
    refresh: vi.fn(async () => undefined),
  }),
}));

afterEach(() => {
  cleanup();
});

function renderFunnel() {
  return render(
    <MemoryRouter initialEntries={["/app/trial"]}>
      <Routes>
        <Route path="/app/trial" element={<TrialIntro />} />
        <Route path="/app/trial/reminder" element={<TrialReminder />} />
        <Route path="/app/paywall" element={<Paywall />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("free trial funnel", () => {
  it("walks from the free-trial pitch to the reminder and then the two plans", async () => {
    renderFunnel();
    expect(screen.getByText("RatioAi wants you to try it for free")).toBeInTheDocument();
    expect(screen.queryByText(/continue to ratioai/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Try now" }));
    expect(
      await screen.findByText("We'll remind you before your free trial ends"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByText("Choose your plan")).toBeInTheDocument();
    expect(screen.getByText("Yearly")).toBeInTheDocument();
    expect(screen.getByText("Monthly")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start free trial" })).toBeInTheDocument();
    expect(screen.queryByText(/continue to ratioai/i)).not.toBeInTheDocument();
  });
});
