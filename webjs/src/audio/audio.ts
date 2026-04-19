/**
 * AudioEngine — all Web Audio API logic for the game.
 *
 * SRP: this module manages audio context lifecycle, theme scheduling, and
 * sound effects.  It has zero dependency on game state or the DOM beyond the
 * AudioContext constructor — it is completely self-contained.
 *
 * Usage:
 *   const audio = createAudioEngine();
 *   audio.ensureAudio();   // call after first user gesture
 *   audio.playAttackSound();
 */

export interface AudioEngine {
  ensureAudio(): void;
  pauseTheme(): void;
  playAttackSound(): void;
  playHitSound(): void;
  playDeathSound(): void;
}

export function createAudioEngine(): AudioEngine {
  let audioContext: AudioContext | null = null;
  let themeStarted = false;
  let themeIntervalId: ReturnType<typeof setInterval> | null = null;
  let masterGain: GainNode | null = null;
  let ambientNoiseNode: AudioBufferSourceNode | null = null;

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  function ensureAudio(): void {
    if (!audioContext) {
      const AudioCtor = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtor) return;
      audioContext = new AudioCtor() as AudioContext;
      masterGain = audioContext.createGain();
      masterGain.gain.value = 0.34;
      masterGain.connect(audioContext.destination);
    }
    if (audioContext.state === "suspended") {
      audioContext.resume().catch(() => {});
    }
    if (!themeStarted) {
      startTheme();
    }
  }

  function pauseTheme(): void {
    if (audioContext && audioContext.state === "running") {
      audioContext.suspend().catch(() => {});
    }
  }

  function startTheme(): void {
    if (!audioContext || themeStarted) return;
    themeStarted = true;
    startAmbientBed();
    scheduleThemePhrase();
    themeIntervalId = setInterval(scheduleThemePhrase, 6800);
  }

  // -------------------------------------------------------------------------
  // Theme scheduling
  // -------------------------------------------------------------------------

  function scheduleThemePhrase(): void {
    if (!audioContext) return;
    const now = audioContext.currentTime + 0.05;

    for (const note of [
      { t: 0.0, f: 110.0, d: 4.8, g: 0.010 },
      { t: 2.8, f: 103.83, d: 4.7, g: 0.009 }
    ]) {
      playDreadPad(note.f, now + note.t, note.d, note.g);
    }

    playGhostBell(277.18, now + 3.6, 1.9, 0.0022);
    playSubRumble(55.0, now + 2.1, 1.5, 0.008);
  }

  function startAmbientBed(): void {
    if (!audioContext || ambientNoiseNode) return;

    const buffer = audioContext.createBuffer(1, audioContext.sampleRate * 2, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.35;
    }

    ambientNoiseNode = audioContext.createBufferSource();
    ambientNoiseNode.buffer = buffer;
    ambientNoiseNode.loop = true;

    const lowpass = audioContext.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 180;

    const bandpass = audioContext.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.frequency.value = 90;
    bandpass.Q.value = 0.4;

    const ambientGain = audioContext.createGain();
    ambientGain.gain.value = 0.004;

    ambientNoiseNode.connect(lowpass);
    lowpass.connect(bandpass);
    bandpass.connect(ambientGain);
    ambientGain.connect(masterGain!);
    ambientNoiseNode.start();
  }

  // -------------------------------------------------------------------------
  // Sound effects
  // -------------------------------------------------------------------------

  function playAttackSound(): void {
    if (!audioContext) return;
    const now = audioContext.currentTime;
    playFilteredNoiseBurst(now, 0.08, 0.028, 2200, "highpass");
    playBladeTone(640, now, 0.09, 0.03);
    playBladeTone(980, now + 0.01, 0.06, 0.018);
  }

  function playHitSound(): void {
    if (!audioContext) return;
    const now = audioContext.currentTime;
    playFilteredNoiseBurst(now, 0.12, 0.035, 480, "bandpass");
    playBassTone(110, now, 0.12, 0.03);
    playBladeTone(180, now + 0.03, 0.12, 0.022);
  }

  function playDeathSound(): void {
    if (!audioContext) return;
    const now = audioContext.currentTime;
    playFilteredNoiseBurst(now, 0.25, 0.03, 260, "lowpass");
    playPadTone(220, now, 0.45, 0.022);
    playPadTone(164.81, now + 0.18, 0.55, 0.026);
    playBassTone(123.47, now + 0.34, 0.75, 0.03);
    playBellTone(92.5, now + 0.5, 0.9, 0.012);
  }

  // -------------------------------------------------------------------------
  // Low-level synth helpers (private)
  // -------------------------------------------------------------------------

  function playTone(frequency: number, startTime: number, duration: number, gainValue: number, type: OscillatorType): void {
    if (!audioContext) return;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, startTime);
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(gainValue, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    osc.connect(gain);
    gain.connect(masterGain!);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  }

  function playDreadPad(frequency: number, startTime: number, duration: number, gainValue: number): void {
    if (!audioContext) return;
    const oscA = audioContext.createOscillator();
    const oscB = audioContext.createOscillator();
    const oscC = audioContext.createOscillator();
    const filter = audioContext.createBiquadFilter();
    const gain = audioContext.createGain();

    oscA.type = "triangle"; oscB.type = "sine"; oscC.type = "sawtooth";
    oscA.frequency.setValueAtTime(frequency, startTime);
    oscB.frequency.setValueAtTime(frequency * 0.5, startTime);
    oscC.frequency.setValueAtTime(frequency * 1.006, startTime);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(620, startTime);
    filter.Q.value = 1.1;

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(gainValue, startTime + 1.2);
    gain.gain.exponentialRampToValueAtTime(gainValue * 0.5, startTime + duration * 0.7);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    oscA.connect(filter); oscB.connect(filter); oscC.connect(filter);
    filter.connect(gain); gain.connect(masterGain!);
    oscA.start(startTime); oscB.start(startTime); oscC.start(startTime);
    oscA.stop(startTime + duration + 0.1);
    oscB.stop(startTime + duration + 0.1);
    oscC.stop(startTime + duration + 0.1);
  }

  function playPadTone(frequency: number, startTime: number, duration: number, gainValue: number): void {
    if (!audioContext) return;
    const oscA = audioContext.createOscillator();
    const oscB = audioContext.createOscillator();
    const filter = audioContext.createBiquadFilter();
    const gain = audioContext.createGain();

    oscA.type = "triangle"; oscB.type = "sine";
    oscA.frequency.setValueAtTime(frequency, startTime);
    oscB.frequency.setValueAtTime(frequency * 1.003, startTime);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1200, startTime);
    filter.Q.value = 0.8;

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(gainValue, startTime + 0.25);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    oscA.connect(filter); oscB.connect(filter);
    filter.connect(gain); gain.connect(masterGain!);
    oscA.start(startTime); oscB.start(startTime);
    oscA.stop(startTime + duration + 0.1); oscB.stop(startTime + duration + 0.1);
  }

  function playBassTone(frequency: number, startTime: number, duration: number, gainValue: number): void {
    if (!audioContext) return;
    const osc = audioContext.createOscillator();
    const filter = audioContext.createBiquadFilter();
    const gain = audioContext.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(frequency, startTime);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(280, startTime);
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(gainValue, startTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(filter); filter.connect(gain); gain.connect(masterGain!);
    osc.start(startTime); osc.stop(startTime + duration + 0.05);
  }

  function playSubRumble(frequency: number, startTime: number, duration: number, gainValue: number): void {
    if (!audioContext) return;
    const osc = audioContext.createOscillator();
    const lfo = audioContext.createOscillator();
    const lfoGain = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();
    const gain = audioContext.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(frequency, startTime);
    lfo.type = "sine";
    lfo.frequency.setValueAtTime(4.2, startTime);
    lfoGain.gain.value = 3.5;
    lfo.connect(lfoGain); lfoGain.connect(osc.frequency);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(140, startTime);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(gainValue, startTime + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(filter); filter.connect(gain); gain.connect(masterGain!);
    osc.start(startTime); lfo.start(startTime);
    osc.stop(startTime + duration + 0.05); lfo.stop(startTime + duration + 0.05);
  }

  function playBellTone(frequency: number, startTime: number, duration: number, gainValue: number): void {
    if (!audioContext) return;
    const oscA = audioContext.createOscillator();
    const oscB = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscA.type = "sine"; oscB.type = "triangle";
    oscA.frequency.setValueAtTime(frequency, startTime);
    oscB.frequency.setValueAtTime(frequency * 2.01, startTime);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(gainValue, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    oscA.connect(gain); oscB.connect(gain); gain.connect(masterGain!);
    oscA.start(startTime); oscB.start(startTime);
    oscA.stop(startTime + duration + 0.05); oscB.stop(startTime + duration + 0.05);
  }

  function playGhostBell(frequency: number, startTime: number, duration: number, gainValue: number): void {
    if (!audioContext) return;
    const oscA = audioContext.createOscillator();
    const oscB = audioContext.createOscillator();
    const filter = audioContext.createBiquadFilter();
    const gain = audioContext.createGain();

    oscA.type = "sine"; oscB.type = "triangle";
    oscA.frequency.setValueAtTime(frequency, startTime);
    oscB.frequency.setValueAtTime(frequency * 2.7, startTime);

    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1400, startTime);
    filter.Q.value = 1.8;

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(gainValue, startTime + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    oscA.connect(filter); oscB.connect(filter);
    filter.connect(gain); gain.connect(masterGain!);
    oscA.start(startTime); oscB.start(startTime);
    oscA.stop(startTime + duration + 0.05); oscB.stop(startTime + duration + 0.05);
  }

  function playBladeTone(frequency: number, startTime: number, duration: number, gainValue: number): void {
    if (!audioContext) return;
    const osc = audioContext.createOscillator();
    const filter = audioContext.createBiquadFilter();
    const gain = audioContext.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(frequency, startTime);
    osc.frequency.exponentialRampToValueAtTime(frequency * 0.62, startTime + duration);
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1800, startTime);
    filter.Q.value = 2.5;

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(gainValue, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(filter); filter.connect(gain); gain.connect(masterGain!);
    osc.start(startTime); osc.stop(startTime + duration + 0.03);
  }

  function playFilteredNoiseBurst(
    startTime: number,
    duration: number,
    gainValue: number,
    frequency: number,
    filterType: BiquadFilterType
  ): void {
    if (!audioContext) return;
    const bufferSize = Math.max(1, Math.floor(audioContext.sampleRate * duration));
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }

    const source = audioContext.createBufferSource();
    const filter = audioContext.createBiquadFilter();
    const gain = audioContext.createGain();

    source.buffer = buffer;
    filter.type = filterType;
    filter.frequency.setValueAtTime(frequency, startTime);
    filter.Q.value = 1.4;

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(gainValue, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    source.connect(filter); filter.connect(gain); gain.connect(masterGain!);
    source.start(startTime);
  }

  // suppress unused-variable TS lint for playTone (kept for future use)
  void playTone;

  return { ensureAudio, pauseTheme, playAttackSound, playHitSound, playDeathSound };
}
