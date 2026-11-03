import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const ai = vi.hoisted(() => ({
  describeMealText: vi.fn(),
  transcribeMealAudio: vi.fn(),
}));
const voice = vi.hoisted(() => ({
  startRecording: vi.fn(),
  isSupported: { value: true },
}));

vi.mock("@/lib/mealAiClient", () => ai);
vi.mock("@/lib/voiceRecorder", () => ({
  startRecording: voice.startRecording,
  isVoiceRecordingSupported: () => voice.isSupported.value,
  blobToBase64: async () => "QUJD",
}));

import Describe from "@/pages/app/Describe";

const renderPage = () =>
  render(
    <MemoryRouter>
      <Describe />
    </MemoryRouter>,
  );

describe("Describe voice input", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    voice.isSupported.value = true;
    voice.startRecording.mockResolvedValue({
      stop: async () => ({ blob: new Blob(["x"]), mimeType: "audio/mp4", durationMs: 3000 }),
      cancel: vi.fn(),
    });
    ai.transcribeMealAudio.mockResolvedValue("two eggs and toast");
    ai.describeMealText.mockResolvedValue({
      title: "Eggs & Toast",
      icon: "",
      items: [{ name: "Eggs", portion: "2", calories: 150, protein: 12, carbs: 1, fat: 10, confidence: 80 }],
      hiddenIngredient: null,
      notes: "Estimated",
    });
  });

  it("records, transcribes, fills the box and estimates automatically", async () => {
    renderPage();
    fireEvent.click(screen.getByLabelText("Describe your meal by voice"));
    const stop = await screen.findByLabelText("Stop recording and estimate");
    fireEvent.click(stop);

    await waitFor(() => expect(ai.describeMealText).toHaveBeenCalledWith("two eggs and toast"));
    expect(ai.transcribeMealAudio).toHaveBeenCalledWith("QUJD", "audio/mp4");
    expect(await screen.findByText("Eggs & Toast")).toBeInTheDocument();
    expect(screen.getByDisplayValue("two eggs and toast")).toBeInTheDocument();
  });

  it("appends speech to what was already typed", async () => {
    renderPage();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "a banana" } });
    fireEvent.click(screen.getByLabelText("Describe your meal by voice"));
    fireEvent.click(await screen.findByLabelText("Stop recording and estimate"));
    await waitFor(() => expect(ai.describeMealText).toHaveBeenCalledWith("a banana, two eggs and toast"));
  });

  it("does not estimate when nothing was heard", async () => {
    ai.transcribeMealAudio.mockResolvedValue("");
    renderPage();
    fireEvent.click(screen.getByLabelText("Describe your meal by voice"));
    fireEvent.click(await screen.findByLabelText("Stop recording and estimate"));
    await waitFor(() => expect(ai.transcribeMealAudio).toHaveBeenCalled());
    expect(ai.describeMealText).not.toHaveBeenCalled();
    expect(await screen.findByLabelText("Describe your meal by voice")).toBeEnabled();
  });

  it("recovers when the microphone is blocked", async () => {
    voice.startRecording.mockRejectedValue(new Error("Microphone access is off."));
    renderPage();
    fireEvent.click(screen.getByLabelText("Describe your meal by voice"));
    await waitFor(() => expect(voice.startRecording).toHaveBeenCalled());
    expect(await screen.findByLabelText("Describe your meal by voice")).toBeEnabled();
    expect(ai.transcribeMealAudio).not.toHaveBeenCalled();
  });
});
