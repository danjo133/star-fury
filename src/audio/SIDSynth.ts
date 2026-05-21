/**
 * SID-style synthesizer using Web Audio API
 * Emulates the key characteristics of the MOS 6581/8580 SID chip:
 * - 3 oscillator voices with pulse (PWM), sawtooth, triangle, noise waveforms
 * - ADSR envelope per voice
 * - Shared resonant filter (lowpass/bandpass/highpass)
 * - Arpeggio and vibrato effects
 */

export interface ADSRConfig {
  attack: number;   // seconds
  decay: number;    // seconds
  sustain: number;  // 0-1 level
  release: number;  // seconds
}

export interface VoiceConfig {
  waveform: OscillatorType | 'pulse';
  pulseWidth?: number; // 0-1, only for pulse waveform
  adsr: ADSRConfig;
  filterFreq?: number;
  filterRes?: number;
  filterType?: BiquadFilterType;
}

const SID_ADSR: Record<string, ADSRConfig> = {
  short: { attack: 0.005, decay: 0.1, sustain: 0.0, release: 0.05 },
  pluck: { attack: 0.002, decay: 0.15, sustain: 0.2, release: 0.1 },
  pad: { attack: 0.05, decay: 0.3, sustain: 0.6, release: 0.3 },
  bass: { attack: 0.005, decay: 0.2, sustain: 0.4, release: 0.1 },
  lead: { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.15 },
  stab: { attack: 0.001, decay: 0.05, sustain: 0.0, release: 0.02 },
};

// C64 note frequency table (NTSC)
const NOTE_FREQS: Record<string, number> = {
  'C0': 16.35, 'C#0': 17.32, 'D0': 18.35, 'D#0': 19.45, 'E0': 20.60, 'F0': 21.83,
  'F#0': 23.12, 'G0': 24.50, 'G#0': 25.96, 'A0': 27.50, 'A#0': 29.14, 'B0': 30.87,
  'C1': 32.70, 'C#1': 34.65, 'D1': 36.71, 'D#1': 38.89, 'E1': 41.20, 'F1': 43.65,
  'F#1': 46.25, 'G1': 49.00, 'G#1': 51.91, 'A1': 55.00, 'A#1': 58.27, 'B1': 61.74,
  'C2': 65.41, 'C#2': 69.30, 'D2': 73.42, 'D#2': 77.78, 'E2': 82.41, 'F2': 87.31,
  'F#2': 92.50, 'G2': 98.00, 'G#2': 103.83, 'A2': 110.00, 'A#2': 116.54, 'B2': 123.47,
  'C3': 130.81, 'C#3': 138.59, 'D3': 146.83, 'D#3': 155.56, 'E3': 164.81, 'F3': 174.61,
  'F#3': 185.00, 'G3': 196.00, 'G#3': 207.65, 'A3': 220.00, 'A#3': 233.08, 'B3': 246.94,
  'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13, 'E4': 329.63, 'F4': 349.23,
  'F#4': 369.99, 'G4': 392.00, 'G#4': 415.30, 'A4': 440.00, 'A#4': 466.16, 'B4': 493.88,
  'C5': 523.25, 'C#5': 554.37, 'D5': 587.33, 'D#5': 622.25, 'E5': 659.25, 'F5': 698.46,
  'F#5': 739.99, 'G5': 783.99, 'G#5': 830.61, 'A5': 880.00, 'A#5': 932.33, 'B5': 987.77,
  'C6': 1046.50, 'C#6': 1108.73, 'D6': 1174.66, 'D#6': 1244.51, 'E6': 1318.51, 'F6': 1396.91,
};

export function noteToFreq(note: string): number {
  return NOTE_FREQS[note] ?? 440;
}

export class SIDVoice {
  private ctx: AudioContext;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode;
  private filterNode: BiquadFilterNode;
  private output: AudioNode;
  private _active = false;

  // For pulse wave emulation
  private pulseOsc1: OscillatorNode | null = null;
  private pulseOsc2: OscillatorNode | null = null;
  private pulseGain1: GainNode | null = null;
  private pulseGain2: GainNode | null = null;
  private pulseWidth = 0.5;

  private currentAdsr: ADSRConfig = SID_ADSR.lead;
  private vibratoLFO: OscillatorNode | null = null;
  private vibratoGain: GainNode | null = null;

  constructor(ctx: AudioContext, output: AudioNode) {
    this.ctx = ctx;
    this.output = output;

    this.gainNode = ctx.createGain();
    this.gainNode.gain.value = 0;

    this.filterNode = ctx.createBiquadFilter();
    this.filterNode.type = 'lowpass';
    this.filterNode.frequency.value = 4000;
    this.filterNode.Q.value = 2;

    this.filterNode.connect(this.gainNode);
    this.gainNode.connect(this.output);
  }

  get active(): boolean {
    return this._active;
  }

  setFilter(freq: number, res: number, type: BiquadFilterType = 'lowpass'): void {
    this.filterNode.frequency.value = freq;
    this.filterNode.Q.value = res;
    this.filterNode.type = type;
  }

  noteOn(freq: number, waveform: OscillatorType | 'pulse', adsr: ADSRConfig, volume = 0.3, pulseWidth = 0.5, time?: number): void {
    this.noteOff(time);
    this._active = true;
    this.currentAdsr = adsr;

    const t = time ?? this.ctx.currentTime;

    if (waveform === 'pulse') {
      this.startPulseWave(freq, pulseWidth, t);
    } else {
      this.oscillator = this.ctx.createOscillator();
      this.oscillator.type = waveform;
      this.oscillator.frequency.value = freq;
      this.oscillator.connect(this.filterNode);
      this.oscillator.start(t);
    }

    // ADSR envelope
    this.gainNode.gain.cancelScheduledValues(t);
    this.gainNode.gain.setValueAtTime(0, t);
    this.gainNode.gain.linearRampToValueAtTime(volume, t + adsr.attack);
    this.gainNode.gain.linearRampToValueAtTime(volume * adsr.sustain, t + adsr.attack + adsr.decay);
  }

  noteOff(time?: number): void {
    if (!this._active) return;
    this._active = false;

    const t = time ?? this.ctx.currentTime;
    this.gainNode.gain.cancelScheduledValues(t);
    this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, t);
    this.gainNode.gain.linearRampToValueAtTime(0, t + this.currentAdsr.release);

    // Stop oscillators after release
    const stopTime = now + this.currentAdsr.release + 0.01;

    if (this.oscillator) {
      this.oscillator.stop(stopTime);
      this.oscillator = null;
    }

    if (this.pulseOsc1) {
      this.pulseOsc1.stop(stopTime);
      this.pulseOsc2?.stop(stopTime);
      this.pulseOsc1 = null;
      this.pulseOsc2 = null;
    }

    this.stopVibrato();
  }

  setFrequency(freq: number): void {
    const now = this.ctx.currentTime;
    if (this.oscillator) {
      this.oscillator.frequency.setValueAtTime(freq, now);
    }
    if (this.pulseOsc1) {
      this.pulseOsc1.frequency.setValueAtTime(freq, now);
      this.pulseOsc2?.frequency.setValueAtTime(freq, now);
    }
  }

  startVibrato(rate = 5, depth = 5): void {
    if (this.vibratoLFO) return;
    const target = this.oscillator ?? this.pulseOsc1;
    if (!target) return;

    this.vibratoLFO = this.ctx.createOscillator();
    this.vibratoGain = this.ctx.createGain();
    this.vibratoLFO.frequency.value = rate;
    this.vibratoGain.gain.value = depth;
    this.vibratoLFO.connect(this.vibratoGain);
    this.vibratoGain.connect(target.frequency);
    this.vibratoLFO.start();
  }

  private stopVibrato(): void {
    if (this.vibratoLFO) {
      this.vibratoLFO.stop();
      this.vibratoLFO.disconnect();
      this.vibratoGain?.disconnect();
      this.vibratoLFO = null;
      this.vibratoGain = null;
    }
  }

  /**
   * Emulate pulse wave with variable duty cycle using two sawtooth oscillators
   * Phase-offset technique: two saws at same freq, one inverted, offset creates pulse
   */
  private startPulseWave(freq: number, width: number): void {
    this.pulseWidth = width;
    const now = this.ctx.currentTime;

    // Use a periodic wave to approximate pulse width modulation
    // Create a custom wave that mimics a pulse with the given duty cycle
    const harmonics = 32;
    const real = new Float32Array(harmonics + 1);
    const imag = new Float32Array(harmonics + 1);
    real[0] = 0;
    imag[0] = 0;

    for (let n = 1; n <= harmonics; n++) {
      // Fourier series for a pulse wave with duty cycle 'width'
      real[n] = 0;
      imag[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * width);
    }

    const wave = this.ctx.createPeriodicWave(real, imag, { disableNormalization: false });
    this.pulseOsc1 = this.ctx.createOscillator();
    this.pulseOsc1.setPeriodicWave(wave);
    this.pulseOsc1.frequency.value = freq;
    this.pulseOsc1.connect(this.filterNode);
    this.pulseOsc1.start(now);
  }

  destroy(): void {
    this.noteOff();
    this.gainNode.disconnect();
    this.filterNode.disconnect();
  }
}

export class SIDSynth {
  private ctx: AudioContext;
  private masterGain: GainNode;
  private voices: SIDVoice[] = [];
  private _volume = 0.4;

  constructor(ctx: AudioContext, destination: AudioNode) {
    this.ctx = ctx;
    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = this._volume;
    this.masterGain.connect(destination);

    // Create 3 voices (like the SID chip)
    for (let i = 0; i < 3; i++) {
      this.voices.push(new SIDVoice(ctx, this.masterGain));
    }
  }

  get voice1(): SIDVoice { return this.voices[0]; }
  get voice2(): SIDVoice { return this.voices[1]; }
  get voice3(): SIDVoice { return this.voices[2]; }

  getVoice(index: number): SIDVoice {
    return this.voices[index];
  }

  set volume(v: number) {
    this._volume = v;
    this.masterGain.gain.value = v;
  }

  get volume(): number {
    return this._volume;
  }

  allNotesOff(): void {
    for (const voice of this.voices) {
      voice.noteOff();
    }
  }

  destroy(): void {
    this.allNotesOff();
    for (const voice of this.voices) {
      voice.destroy();
    }
    this.masterGain.disconnect();
  }
}

export { SID_ADSR };
