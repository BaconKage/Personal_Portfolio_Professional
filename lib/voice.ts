import {
  BANDS,
  analyseFrame,
  createAnalysisState,
  type AnalysisState,
} from "./voice-analysis";
import { getCoreState } from "./core-sequence";

/**
 * The microphone feeds a Web Audio analyser that is never connected to the
 * speakers or a recorder. Each animation frame turns it into a few numbers
 * that the hero scene and HUD read directly, with no per-frame React state.
 * Audio never leaves the device.
 */
export type VoiceStatus =
  "off" | "starting" | "on" | "denied" | "missing" | "unsupported" | "error";

export const voice = {
  on: false,
  level: 0,
  bands: new Array<number>(BANDS).fill(0),
  centroid: 0,
  flux: 0,
  pitch: 0,
  voiced: false,
  charge: 0,
};

let status: VoiceStatus = "off";
let stream: MediaStream | null = null;
let context: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let spectrum: Float32Array<ArrayBuffer> | null = null;
let samples: Float32Array<ArrayBuffer> | null = null;
let state: AnalysisState = createAnalysisState();
let frame = 0;
let last = 0;
let attempt = 0;
const listeners = new Set<() => void>();

export const getVoiceStatus = () => status;
export const getServerVoiceStatus = (): VoiceStatus => "off";
export function subscribeVoice(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export const voiceSupported = () =>
  typeof window !== "undefined" &&
  !!navigator.mediaDevices?.getUserMedia &&
  typeof AudioContext !== "undefined";

function set(next: VoiceStatus) {
  status = next;
  voice.on = next === "on";
  listeners.forEach((listener) => listener());
}

function loop(now: number) {
  if (!analyser || !spectrum || !samples || !context) return;
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  analyser.getFloatFrequencyData(spectrum);
  analyser.getFloatTimeDomainData(samples);
  const features = analyseFrame(
    state,
    spectrum,
    samples,
    context.sampleRate,
    dt,
  );
  Object.assign(voice, features);
  // A held note powers the core from standby; otherwise voice only colours it.
  if (getCoreState().phase !== "idle") state.charge = voice.charge = 0;
  else if (features.charge >= 1) {
    state.charge = voice.charge = 0;
    window.dispatchEvent(new Event("neural-signal"));
  }
  frame = requestAnimationFrame(loop);
}

function release() {
  cancelAnimationFrame(frame);
  stream?.getTracks().forEach((track) => track.stop());
  context?.close().catch(() => {});
  stream = null;
  context = null;
  analyser = null;
  state = createAnalysisState();
  Object.assign(voice, {
    level: 0,
    bands: state.bands,
    centroid: 0,
    flux: 0,
    pitch: 0,
    voiced: false,
    charge: 0,
  });
}

export async function startVoice() {
  if (status === "on" || status === "starting") return;
  if (!voiceSupported()) return set("unsupported");
  const token = ++attempt;
  set("starting");
  // Created inside the click so autoplay rules let it run.
  const audio = new AudioContext();
  let media: MediaStream;
  try {
    media = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
  } catch (error) {
    audio.close().catch(() => {});
    if (token !== attempt) return;
    const name = error instanceof DOMException ? error.name : "";
    set(
      name === "NotAllowedError" || name === "SecurityError"
        ? "denied"
        : name === "NotFoundError" || name === "OverconstrainedError"
          ? "missing"
          : "error",
    );
    return;
  }
  // Stopped (or restarted) while the permission prompt was open.
  // (Read through the getter: the status may have changed during the await.)
  if (token !== attempt || getVoiceStatus() !== "starting") {
    media.getTracks().forEach((track) => track.stop());
    audio.close().catch(() => {});
    return;
  }
  try {
    await audio.resume();
    const node = audio.createAnalyser();
    node.fftSize = 2048;
    node.smoothingTimeConstant = 0.45;
    audio.createMediaStreamSource(media).connect(node);
    media
      .getAudioTracks()
      .forEach((track) => track.addEventListener("ended", () => stopVoice()));
    stream = media;
    context = audio;
    analyser = node;
    spectrum = new Float32Array(node.frequencyBinCount);
    samples = new Float32Array(node.fftSize);
    state = createAnalysisState();
    voice.bands = state.bands;
    last = performance.now();
    set("on");
    frame = requestAnimationFrame(loop);
  } catch {
    media.getTracks().forEach((track) => track.stop());
    audio.close().catch(() => {});
    set("error");
  }
}

export function stopVoice(next: "off" | "error" = "off") {
  attempt++;
  if (status === "off" && !stream) return;
  release();
  set(next);
}
