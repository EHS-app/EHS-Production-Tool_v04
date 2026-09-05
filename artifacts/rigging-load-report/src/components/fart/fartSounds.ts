/**
 * Fart sound synthesis via the Web Audio API.
 *
 * No binary audio assets ship with the project — instead we synthesize
 * three distinct fart "voices" at runtime using oscillators and noise.
 * That keeps the feature self-contained (no asset pipeline, no licensing
 * questions) and reliably loud across browsers.
 *
 * Each variation is a parameterised noise+oscillator burst with an
 * amplitude envelope and a low-pass filter sweep — small/medium/nuclear
 * differ in duration, base frequency, modulation depth, and gain.
 *
 * The AudioContext is created lazily on the first call (not at module
 * load) because Chrome / Safari require user-gesture-initiated audio
 * contexts; the Fart button click satisfies that.
 */

export type FartIntensity = "small" | "medium" | "nuclear";

interface FartProfile {
  /** Total duration of the burst, seconds. */
  duration: number;
  /** Starting filter cutoff — higher = brighter / "wetter" sound. */
  filterStartHz: number;
  /** Ending filter cutoff — usually lower than start (sound "deflates"). */
  filterEndHz: number;
  /** Base oscillator frequency (the buzz tone underneath the noise). */
  oscFreqHz: number;
  /** Vibrato/wobble depth in Hz. */
  oscWobbleHz: number;
  /** Wobble rate in Hz. */
  oscWobbleRate: number;
  /** Peak gain (0..1). Nuclear is louder but capped to avoid clipping. */
  peakGain: number;
}

const PROFILES: Record<FartIntensity, FartProfile> = {
  small: {
    duration: 0.45,
    filterStartHz: 900,
    filterEndHz: 250,
    oscFreqHz: 140,
    oscWobbleHz: 30,
    oscWobbleRate: 14,
    peakGain: 0.35,
  },
  medium: {
    duration: 0.85,
    filterStartHz: 700,
    filterEndHz: 180,
    oscFreqHz: 95,
    oscWobbleHz: 24,
    oscWobbleRate: 9,
    peakGain: 0.45,
  },
  nuclear: {
    duration: 1.6,
    filterStartHz: 600,
    filterEndHz: 120,
    oscFreqHz: 65,
    oscWobbleHz: 38,
    oscWobbleRate: 6,
    peakGain: 0.55,
  },
};

let sharedCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (sharedCtx) {
    // Some browsers suspend the context after periods of inactivity;
    // resume() is a no-op when already running.
    if (sharedCtx.state === "suspended") {
      sharedCtx.resume().catch(() => {
        /* ignored: best-effort */
      });
    }
    return sharedCtx;
  }
  const Ctor: typeof AudioContext | undefined =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  try {
    sharedCtx = new Ctor();
    return sharedCtx;
  } catch {
    return null;
  }
}

/** Prime browser audio during any ordinary employee interaction so a later
 * team broadcast can play even though the broadcast itself is not a click. */
export function prepareFartAudio(): void {
  getCtx();
}

/**
 * Build a short brown-noise buffer (= integrated white noise → low-pass
 * spectrum) which is the closest thing to the rumbly base layer of an
 * actual fart. Buffer is one second long and we play it back at the
 * correct duration via a BufferSource with `loop = true`.
 */
function brownNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const buffer = ctx.createBuffer(1, sampleRate, sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[i] = last * 3.5;
  }
  return buffer;
}

/**
 * Pick a random intensity. Weighted slightly toward "medium" so the
 * default experience is in the middle of the comedy spectrum.
 */
export function randomIntensity(): FartIntensity {
  const r = Math.random();
  if (r < 0.35) return "small";
  if (r < 0.85) return "medium";
  return "nuclear";
}

/**
 * Play a single fart sound. Returns the chosen intensity so the caller
 * (the popup) can co-ordinate visual intensity (cloud count, shake
 * amplitude, etc.) with the audible one.
 *
 * Safe to call without a user gesture: if the audio context can't be
 * created or resumed the call is silently a no-op.
 */
export function playFart(intensity: FartIntensity = "medium"): FartIntensity {
  const ctx = getCtx();
  if (!ctx) return intensity;

  const profile = PROFILES[intensity];
  const now = ctx.currentTime;
  const end = now + profile.duration;

  // ----- Noise layer (the rumble) -----
  const noiseSrc = ctx.createBufferSource();
  noiseSrc.buffer = brownNoiseBuffer(ctx);
  noiseSrc.loop = true;

  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = "lowpass";
  noiseFilter.Q.value = 6;
  noiseFilter.frequency.setValueAtTime(profile.filterStartHz, now);
  noiseFilter.frequency.exponentialRampToValueAtTime(
    Math.max(profile.filterEndHz, 60),
    end,
  );

  // ----- Oscillator layer (the buzz / "papery" pitch) -----
  const osc = ctx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(profile.oscFreqHz, now);

  // LFO modulating the oscillator pitch for that classic warble.
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.frequency.value = profile.oscWobbleRate;
  lfoGain.gain.value = profile.oscWobbleHz;
  lfo.connect(lfoGain).connect(osc.frequency);

  // ----- Shared amplitude envelope -----
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(profile.peakGain, now + 0.04);
  // Decay shape: hold near peak for ~30% of duration, then exponential
  // ramp to silence so the tail "deflates" naturally.
  gain.gain.setValueAtTime(profile.peakGain, now + profile.duration * 0.3);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);

  noiseSrc.connect(noiseFilter).connect(gain);
  osc.connect(gain);
  gain.connect(ctx.destination);

  noiseSrc.start(now);
  osc.start(now);
  lfo.start(now);
  noiseSrc.stop(end + 0.05);
  osc.stop(end + 0.05);
  lfo.stop(end + 0.05);

  return intensity;
}
