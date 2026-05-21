/**
 * Pattern-based music sequencer for the SID synth
 * Plays tracker-style patterns with per-voice note data, effects, and song arrangement
 */

import { SIDSynth, SID_ADSR, noteToFreq, type ADSRConfig } from './SIDSynth';

export interface NoteEvent {
  note: string | null;   // Note name like 'C4', null = continue, '---' = note off
  waveform?: OscillatorType | 'pulse';
  pulseWidth?: number;
  adsr?: ADSRConfig;
  volume?: number;
  effect?: NoteEffect;
}

export interface NoteEffect {
  type: 'arpeggio' | 'portaUp' | 'portaDown' | 'vibrato' | 'filterSweep';
  param1?: number;
  param2?: number;
}

export interface Pattern {
  rows: (NoteEvent | null)[][];  // [row][voice]
  speed: number;  // ticks per row (6 = normal tempo like C64 trackers)
}

export interface Song {
  title: string;
  bpm: number;
  patterns: Pattern[];
  arrangement: number[];  // Pattern indices to play in order
  loopPoint: number;       // Which arrangement index to loop back to
}

export class SIDSequencer {
  private synth: SIDSynth;
  private song: Song | null = null;
  private playing = false;
  private intervalId: number | null = null;

  private currentArrangementIndex = 0;
  private currentRow = 0;
  private tickCounter = 0;

  // Per-voice state for effects
  private voiceFreqs: number[] = [0, 0, 0];
  private arpeggioCounters: number[] = [0, 0, 0];
  private arpeggioNotes: [number, number, number][] = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];

  constructor(synth: SIDSynth) {
    this.synth = synth;
  }

  loadSong(song: Song): void {
    this.stop();
    this.song = song;
    this.currentArrangementIndex = 0;
    this.currentRow = 0;
    this.tickCounter = 0;
  }

  play(): void {
    if (!this.song || this.playing) return;
    this.playing = true;

    // Calculate tick interval from BPM
    // Standard tracker: BPM / 2.5 = ticks per second (125 BPM = 50Hz PAL)
    const ticksPerSecond = this.song.bpm / 2.5;
    const intervalMs = 1000 / ticksPerSecond;

    this.intervalId = window.setInterval(() => this.tick(), intervalMs);
  }

  stop(): void {
    this.playing = false;
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.synth.allNotesOff();
    this.currentArrangementIndex = 0;
    this.currentRow = 0;
    this.tickCounter = 0;
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  private tick(): void {
    if (!this.song) return;

    const pattern = this.getCurrentPattern();
    if (!pattern) return;

    // Process row on tick 0
    if (this.tickCounter === 0) {
      this.processRow(pattern);
    }

    // Process effects every tick
    this.processEffects();

    // Advance tick counter
    this.tickCounter++;
    if (this.tickCounter >= pattern.speed) {
      this.tickCounter = 0;
      this.currentRow++;

      // Check if pattern is done
      if (this.currentRow >= pattern.rows.length) {
        this.currentRow = 0;
        this.currentArrangementIndex++;

        // Check if song is done
        if (this.currentArrangementIndex >= this.song.arrangement.length) {
          this.currentArrangementIndex = this.song.loopPoint;
        }
      }
    }
  }

  private getCurrentPattern(): Pattern | null {
    if (!this.song) return null;
    const patternIndex = this.song.arrangement[this.currentArrangementIndex];
    return this.song.patterns[patternIndex] ?? null;
  }

  private processRow(pattern: Pattern): void {
    const row = pattern.rows[this.currentRow];
    if (!row) return;

    for (let voiceIdx = 0; voiceIdx < 3; voiceIdx++) {
      const event = row[voiceIdx];
      if (!event) continue;

      const voice = this.synth.getVoice(voiceIdx);

      if (event.note === '---') {
        // Note off
        voice.noteOff();
      } else if (event.note) {
        // New note
        const freq = noteToFreq(event.note);
        this.voiceFreqs[voiceIdx] = freq;
        const waveform = event.waveform ?? 'pulse';
        const adsr = event.adsr ?? SID_ADSR.lead;
        const volume = event.volume ?? 0.25;
        const pw = event.pulseWidth ?? 0.5;

        voice.noteOn(freq, waveform, adsr, volume, pw);

        // Setup arpeggio if needed
        if (event.effect?.type === 'arpeggio') {
          this.arpeggioNotes[voiceIdx] = [
            0,
            event.effect.param1 ?? 4,
            event.effect.param2 ?? 7,
          ];
          this.arpeggioCounters[voiceIdx] = 0;
        }

        if (event.effect?.type === 'vibrato') {
          voice.startVibrato(event.effect.param1 ?? 5, event.effect.param2 ?? 5);
        }
      }
    }
  }

  private processEffects(): void {
    for (let voiceIdx = 0; voiceIdx < 3; voiceIdx++) {
      // Arpeggio
      if (this.arpeggioNotes[voiceIdx][1] !== 0 || this.arpeggioNotes[voiceIdx][2] !== 0) {
        const baseFreq = this.voiceFreqs[voiceIdx];
        if (baseFreq > 0) {
          const step = this.arpeggioCounters[voiceIdx] % 3;
          const semitones = this.arpeggioNotes[voiceIdx][step];
          const freq = baseFreq * Math.pow(2, semitones / 12);
          this.synth.getVoice(voiceIdx).setFrequency(freq);
          this.arpeggioCounters[voiceIdx]++;
        }
      }
    }
  }

  destroy(): void {
    this.stop();
  }
}
