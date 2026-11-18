import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import TrialIntro from "@/pages/app/TrialIntro";
import TrialReminder from "@/pages/app/TrialReminder";
import Paywall from "@/pages/app/Paywall";

const store = vi.hoisted(() => ({
  monthlyProduct: null as { priceString: string } | null,
  yearlyProduct: null as {
    priceString: string;
    pricePerMonthString: string;
    introPrice: { price: number; periodUnit: string; periodNumberOfUnits: number; cycles: number };
  } | null,
}));

vi.mock("@/hooks/useSubscription", () => ({
  useSubscription: () => ({
    isPro: false,
    status: "inactive",
    subscriptionRequired: true,
    productsUnavailable: store.yearlyProduct == null,
    monthlyPackage: null,
    yearlyPackage: null,
    monthlyProduct: store.monthlyProduct,
    yearlyProduct: store.yearlyProduct,
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

    fireEvent.click(screen.getByRole("button", { name: "Try Now" }));
    expect(
      await screen.findByText("We'll remind you before your free trial ends"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(
      await screen.findByRole("heading", { name: /start your 3-day free trial to continue/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Yearly")).toBeInTheDocument();
    expect(screen.getByText("Monthly")).toBeInTheDocument();
    expect(screen.getByText("3 DAYS FREE")).toBeInTheDocument();
    expect(screen.getByText("No Payment Due Now")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start My 3-Day Free Trial" })).toBeInTheDocument();
    expect(screen.queryByText(/continue to ratioai/i)).not.toBeInTheDocument();
  });

  it("shows the App Store price strings for the account's country", () => {
    store.monthlyProduct = { priceString: "12,99 €" };
    store.yearlyProduct = {
      priceString: "39,99 €",
      pricePerMonthString: "3,33 €",
      introPrice: { price: 0, periodUnit: "DAY", periodNumberOfUnits: 3, cycles: 1 },
    };
    render(
      <MemoryRouter initialEntries={["/app/trial"]}>
        <Routes>
          <Route path="/app/trial" element={<TrialIntro />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText("Just 39,99 € per year (3,33 €/mo)")).toBeInTheDocument();
    cleanup();

    render(
      <MemoryRouter initialEntries={["/app/paywall"]}>
        <Routes>
          <Route path="/app/paywall" element={<Paywall />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText(/12,99 €/)).toBeInTheDocument();
    expect(screen.getByText("39,99 €")).toBeInTheDocument();
    expect(screen.getByText(/3 days free, then 39,99 € per year/)).toBeInTheDocument();
    store.monthlyProduct = null;
    store.yearlyProduct = null;
  });
});
