/**
 * Real SID Emulator — High-level wrapper around the AudioWorklet-based SID chip emulator.
 * Provides the same interface as SIDSynth (noteOn/noteOff/getVoice etc.)
 * so the sequencer can drive either engine.
 */

import { type ADSRConfig, noteToFreq } from './SIDSynth';

// SID clock frequency (PAL)
const SID_CLOCK = 985248;

// Map frequency in Hz to SID register value (16-bit)
function freqToSIDReg(freq: number): number {
  // SID formula: F = (Fout * 16777216) / clock
  return Math.round((freq * 16777216) / SID_CLOCK) & 0xFFFF;
}

// Map ADSR seconds to SID register nibble values
function attackToReg(seconds: number): number {
  // SID attack times: 2ms, 8ms, 16ms, 24ms, 38ms, 56ms, 68ms, 80ms, 100ms, 250ms, 500ms, 800ms, 1s, 3s, 5s, 8s
  const times = [0.002, 0.008, 0.016, 0.024, 0.038, 0.056, 0.068, 0.080, 0.100, 0.250, 0.500, 0.800, 1.0, 3.0, 5.0, 8.0];
  let best = 0;
  let bestDiff = Math.abs(seconds - times[0]);
  for (let i = 1; i < 16; i++) {
    const diff = Math.abs(seconds - times[i]);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = i;
    }
  }
  return best;
}

function decayReleaseToReg(seconds: number): number {
  // SID decay/release times: 6ms, 24ms, 48ms, 72ms, 114ms, 168ms, 204ms, 240ms, 300ms, 750ms, 1.5s, 2.4s, 3s, 9s, 15s, 24s
  const times = [0.006, 0.024, 0.048, 0.072, 0.114, 0.168, 0.204, 0.240, 0.300, 0.750, 1.5, 2.4, 3.0, 9.0, 15.0, 24.0];
  let best = 0;
  let bestDiff = Math.abs(seconds - times[0]);
  for (let i = 1; i < 16; i++) {
    const diff = Math.abs(seconds - times[i]);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = i;
    }
  }
  return best;
}

// Map waveform name to SID waveform bits
function waveformToBits(waveform: OscillatorType | 'pulse'): number {
  switch (waveform) {
    case 'triangle': return 0x10; // bit 4
    case 'sawtooth': return 0x20; // bit 5
    case 'pulse':    return 0x40; // bit 6
    case 'square':   return 0x40; // square = pulse at 50%
    case 'sine':     return 0x10; // approximate sine as triangle
    default:         return 0x40; // default to pulse
  }
}

/** Per-voice state for the emulator wrapper */
class SIDEmulatorVoice {
  private emulator: SIDEmulator;
  private voiceIndex: number;
  private _active = false;
  private currentAdsr: ADSRConfig = { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.15 };

  constructor(emulator: SIDEmulator, voiceIndex: number) {
    this.emulator = emulator;
    this.voiceIndex = voiceIndex;
  }

  get active(): boolean {
    return this._active;
  }

  setFilter(freq: number, res: number, _type: BiquadFilterType = 'lowpass'): void {
    // Map frequency (30-12000) to SID filter register (0-2047)
    const fcReg = Math.round(((freq - 30) / (12000 - 30)) * 2047);
    const fcClamped = Math.max(0, Math.min(2047, fcReg));
    // Map resonance (0-20ish) to SID 4-bit value
    const resReg = Math.round(Math.min(15, res));

    this.emulator.writeRegister(0x15, fcClamped & 0x07);
    this.emulator.writeRegister(0x16, (fcClamped >> 3) & 0xFF);
    // Set resonance and route this voice through filter
    this.emulator.writeRegister(0x17, (resReg << 4) | (1 << this.voiceIndex));
    // Enable lowpass filter mode
    this.emulator.writeRegister(0x18, 0x10 | 15); // LP + full volume
  }

  noteOn(freq: number, waveform: OscillatorType | 'pulse', adsr: ADSRConfig, _volume = 0.3, pulseWidth = 0.5, _time?: number): void {
    this.noteOff();
    this._active = true;
    this.currentAdsr = adsr;

    const base = this.voiceIndex * 7;
    const freqReg = freqToSIDReg(freq);
    const pwReg = Math.round(pulseWidth * 4095) & 0xFFF;
    const waveformBits = waveformToBits(waveform);
    const attackReg = attackToReg(adsr.attack);
    const decayReg = decayReleaseToReg(adsr.decay);
    const sustainReg = Math.round(adsr.sustain * 15) & 0x0F;
    const releaseReg = decayReleaseToReg(adsr.release);

    // Write frequency
    this.emulator.writeRegister(base + 0, freqReg & 0xFF);
    this.emulator.writeRegister(base + 1, (freqReg >> 8) & 0xFF);

    // Write pulse width
    this.emulator.writeRegister(base + 2, pwReg & 0xFF);
    this.emulator.writeRegister(base + 3, (pwReg >> 8) & 0x0F);

    // Write ADSR
    this.emulator.writeRegister(base + 5, (attackReg << 4) | decayReg);
    this.emulator.writeRegister(base + 6, (sustainReg << 4) | releaseReg);

    // Write control register (waveform + gate on)
    this.emulator.writeRegister(base + 4, waveformBits | 0x01);
  }

  noteOff(_time?: number): void {
    if (!this._active) return;
    this._active = false;

    const base = this.voiceIndex * 7;
    // Gate off — keep waveform bits but clear gate
    // Read back current control to preserve waveform selection
    // (We can't read from the worklet, so we gate off with 0x00 — the waveform
    // doesn't matter once gate is off, only the release envelope runs)
    this.emulator.writeRegister(base + 4, 0x00);
  }

  setFrequency(freq: number): void {
    const base = this.voiceIndex * 7;
    const freqReg = freqToSIDReg(freq);
    this.emulator.writeRegister(base + 0, freqReg & 0xFF);
    this.emulator.writeRegister(base + 1, (freqReg >> 8) & 0xFF);
  }

  startVibrato(_rate = 5, _depth = 5): void {
    // Vibrato not directly supported in register-level emulation
    // Would need main-thread modulation — skip for now
  }

  destroy(): void {
    this.noteOff();
  }
}

export class SIDEmulator {
  private ctx: AudioContext;
  private workletNode: AudioWorkletNode | null = null;
  private voices: SIDEmulatorVoice[] = [];
  private _volume = 0.4;
  private _ready = false;
  private pendingWrites: Array<{ reg: number; value: number }> = [];
  private destination: AudioNode;

  constructor(ctx: AudioContext, destination: AudioNode) {
    this.ctx = ctx;
    this.destination = destination;

    for (let i = 0; i < 3; i++) {
      this.voices.push(new SIDEmulatorVoice(this, i));
    }
  }

  async init(): Promise<void> {
    if (this._ready) return;

    // Load the AudioWorklet module from public folder
    const base = import.meta.env.BASE_URL ?? '/';
    await this.ctx.audioWorklet.addModule(`${base}sid-worklet-processor.js`);

    this.workletNode = new AudioWorkletNode(this.ctx, 'sid-worklet-processor', {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [1],
    });

    // Connect with volume control
    const gainNode = this.ctx.createGain();
    gainNode.gain.value = this._volume;
    this.workletNode.connect(gainNode);
    gainNode.connect(this.destination);

    this._ready = true;

    // Flush any pending writes
    if (this.pendingWrites.length > 0) {
      this.workletNode.port.postMessage({
        type: 'writeBatch',
        writes: this.pendingWrites,
      });
      this.pendingWrites = [];
    }

    // Set default: full volume, lowpass filter enabled
    this.writeRegister(0x18, 0x1F); // LP mode + volume 15
  }

  get ready(): boolean {
    return this._ready;
  }

  writeRegister(reg: number, value: number): void {
    if (this.workletNode) {
      this.workletNode.port.postMessage({ type: 'write', reg, value });
    } else {
      this.pendingWrites.push({ reg, value });
    }
  }

  get voice1(): SIDEmulatorVoice { return this.voices[0]; }
  get voice2(): SIDEmulatorVoice { return this.voices[1]; }
  get voice3(): SIDEmulatorVoice { return this.voices[2]; }

  getVoice(index: number): SIDEmulatorVoice {
    return this.voices[index];
  }

  get currentTime(): number {
    return this.ctx.currentTime;
  }

  set volume(v: number) {
    this._volume = v;
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
    if (this.workletNode) {
      this.workletNode.port.postMessage({ type: 'reset' });
      this.workletNode.disconnect();
      this.workletNode = null;
    }
    this._ready = false;
  }
}
