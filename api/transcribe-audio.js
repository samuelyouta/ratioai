/**
 * Speech to text for meal descriptions — Vercel Node serverless function (CommonJS).
 * The app records a short voice note and posts it here as base64; the transcript
 * then goes through /api/describe-meal like typed text.
 */

const MAX_AUDIO_BYTES = 4 * 1024 * 1024;
const OPENAI_TIMEOUT_MS = 25_000;

const EXTENSIONS = {
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/aac": "aac",
  "audio/mpeg": "mp3",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/webm": "webm",
};

function extensionFor(mimeType) {
  const base = String(mimeType || "").split(";")[0].trim().toLowerCase();
  return EXTENSIONS[base] || "webm";
}

function getOpenAiKey() {
  const raw = (process.env.OPENAI_API_KEY || "").trim().replace(/^['"]|['"]$/g, "").trim();
  if (!raw) {
    throw new Error(
      "OPENAI_API_KEY is missing on the server. Add it in Vercel → Project Settings → Environment Variables, then redeploy.",
    );
  }
  return raw;
}

async function transcribe(apiKey, audio, mimeType) {
  const form = new FormData();
  const base = String(mimeType || "").split(";")[0].trim().toLowerCase() || "audio/webm";
  form.append("file", new Blob([audio], { type: base }), `meal.${extensionFor(mimeType)}`);
  form.append("model", "whisper-1");
  form.append("response_format", "verbose_json");
  form.append("temperature", "0");
  form.append("prompt", "A person describing what they ate: foods, drinks, portions, grams, cups, slices.");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);
  let response;
  try {
    response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const text = await response.text();
    console.error("OpenAI transcription error", response.status, text);
    if (response.status === 401) throw new Error("OpenAI rejected the API key. Check OPENAI_API_KEY in Vercel env vars.");
    if (response.status === 429) throw new Error("Rate limit reached, please try again in a moment.");
    if (response.status === 400) throw new Error("We couldn't read that recording. Please try again.");
    throw new Error("AI gateway error");
  }

  const data = await response.json();
  return cleanTranscript(data);
}

const SILENCE_THRESHOLD = 0.6;

/**
 * Whisper invents text ("Thanks for watching!") for silence and background noise.
 * When every segment is flagged as probably-not-speech, treat the clip as empty so
 * the app asks the user to try again instead of estimating a made-up meal.
 */
function cleanTranscript(data) {
  const text = String((data && data.text) || "").trim();
  const segments = data && Array.isArray(data.segments) ? data.segments : [];
  if (text && segments.length > 0) {
    const allSilent = segments.every((s) => Number(s && s.no_speech_prob) > SILENCE_THRESHOLD);
    if (allSilent) return "";
  }
  return text;
}

async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "authorization, content-type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const body = req.body || {};
    const encoded = typeof body.audioBase64 === "string" ? body.audioBase64 : "";
    if (!encoded) return res.status(400).json({ error: "audioBase64 required" });

    const audio = Buffer.from(encoded, "base64");
    if (audio.length === 0) return res.status(400).json({ error: "audioBase64 required" });
    if (audio.length > MAX_AUDIO_BYTES) {
      return res.status(413).json({ error: "That recording is too long. Try a shorter description." });
    }

    const text = await transcribe(getOpenAiKey(), audio, body.mimeType);
    return res.status(200).json({ text });
  } catch (e) {
    console.error("transcribe-audio error", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    const aborted = e && e.name === "AbortError";
    const status = aborted ? 504 : message.includes("missing") || message.includes("rejected") ? 503 : 500;
    return res
      .status(status)
      .json({ error: aborted ? "Transcription timed out. Please try again." : message });
  }
}

handler.config = {
  maxDuration: 30,
};

module.exports = handler;
module.exports.cleanTranscript = cleanTranscript;
