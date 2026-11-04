import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LanguagePicker from "@/components/LanguagePicker";
import OnboardingLayout from "@/components/OnboardingLayout";
import { STORAGE_KEY, getLanguage, setLanguage } from "@/i18n";

const wrap = (ui: React.ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe("LanguagePicker", () => {
  beforeEach(() => {
    localStorage.clear();
    setLanguage("en");
  });
  afterEach(() => {
    cleanup();
    localStorage.clear();
    setLanguage("en");
  });

  it("lists the common languages and switches the UI text on selection", () => {
    wrap(<LanguagePicker variant="row" />);
    expect(screen.getByText("Language")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Change language"));
    const dialog = screen.getByRole("dialog");
    for (const name of ["English", "Español", "Français", "Deutsch", "日本語", "简体中文", "Русский"]) {
      expect(within(dialog).getByText(name)).toBeInTheDocument();
    }

    fireEvent.click(within(dialog).getByText("Español"));
    expect(getLanguage()).toBe("es");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("es");
    expect(screen.getByText("Idioma")).toBeInTheDocument();
    expect(screen.getByLabelText("Cambiar idioma")).toBeInTheDocument();
  });

  it("marks the current language", () => {
    setLanguage("de");
    wrap(<LanguagePicker variant="pill" />);
    expect(screen.getByText("Deutsch")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Sprache ändern"));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Deutsch").closest("button")).toHaveAttribute("aria-pressed", "true");
    expect(within(dialog).getByText("English").closest("button")).toHaveAttribute("aria-pressed", "false");
  });
});

describe("OnboardingLayout language picker", () => {
  beforeEach(() => setLanguage("en"));
  afterEach(() => {
    cleanup();
    setLanguage("en");
  });

  it("shows the picker only on the first onboarding step", () => {
    const first = wrap(
      <OnboardingLayout step={0} totalSteps={8}>
        <p>body</p>
      </OnboardingLayout>,
    );
    expect(screen.getByLabelText("Change language")).toBeInTheDocument();
    first.unmount();

    wrap(
      <OnboardingLayout step={1} totalSteps={8}>
        <p>body</p>
      </OnboardingLayout>,
    );
    expect(screen.queryByLabelText("Change language")).not.toBeInTheDocument();
  });
});
