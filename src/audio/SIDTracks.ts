/**
 * SID-style music tracks for STAR FURY
 * Composed in the style of classic C64 shooters (Delta, Armalyte, R-Type)
 * 
 * Voice 1: Lead melody (pulse wave with PWM)
 * Voice 2: Bass line (sawtooth/pulse)  
 * Voice 3: Arpeggios / chords / percussion
 */

import { SID_ADSR, type ADSRConfig } from './SIDSynth';
import type { Song, Pattern, NoteEvent } from './SIDSequencer';

// Helper to create note events concisely
function n(note: string | null, waveform?: OscillatorType | 'pulse', adsr?: ADSRConfig, volume?: number, pw?: number): NoteEvent {
  return { note, waveform, adsr, volume, pulseWidth: pw };
}

function nArp(note: string, semitone1: number, semitone2: number, waveform: OscillatorType | 'pulse' = 'pulse', volume = 0.2): NoteEvent {
  return {
    note,
    waveform,
    adsr: SID_ADSR.short,
    volume,
    pulseWidth: 0.25,
    effect: { type: 'arpeggio', param1: semitone1, param2: semitone2 },
  };
}

// ============================================================
// TRACK 1: Main Game Theme - "Delta Force"
// Inspired by Rob Hubbard's Delta - E minor, fast arpeggios,
// driving octave bass, iconic staccato pulse lead
// ============================================================

const gameThemePattern0: Pattern = {
  speed: 4,
  rows: [
    // Intro - E minor with half-time bass
    [n('B4', 'pulse', SID_ADSR.stab, 0.25, 0.25), n('E2', 'sawtooth', SID_ADSR.bass, 0.3), nArp('E3', 3, 7)],
    [n('---'), null, null],
    [n('E5', 'pulse', SID_ADSR.stab, 0.25, 0.3), null, null],
    [n('---'), null, null],
    [n('B4', 'pulse', SID_ADSR.stab, 0.25, 0.35), n('E2', 'sawtooth', SID_ADSR.bass, 0.3), nArp('E3', 3, 7)],
    [n('---'), null, null],
    [n('G4', 'pulse', SID_ADSR.stab, 0.22, 0.4), null, null],
    [n('---'), null, null],
    // Am section
    [n('A4', 'pulse', SID_ADSR.stab, 0.25, 0.25), n('A2', 'sawtooth', SID_ADSR.bass, 0.3), nArp('A3', 3, 7)],
    [n('---'), null, null],
    [n('C5', 'pulse', SID_ADSR.stab, 0.25, 0.3), null, null],
    [n('---'), null, null],
    [n('E5', 'pulse', SID_ADSR.stab, 0.25, 0.35), n('A2', 'sawtooth', SID_ADSR.bass, 0.3), nArp('A3', 3, 7)],
    [n('---'), null, null],
    [n('C5', 'pulse', SID_ADSR.stab, 0.22, 0.4), null, null],
    [n('---'), null, null],
    // G major
    [n('D5', 'pulse', SID_ADSR.stab, 0.25, 0.25), n('G2', 'sawtooth', SID_ADSR.bass, 0.3), nArp('G3', 4, 7)],
    [n('---'), null, null],
    [n('B4', 'pulse', SID_ADSR.stab, 0.25, 0.3), null, null],
    [n('---'), null, null],
    // D major -> back to Em
    [n('F#5', 'pulse', SID_ADSR.lead, 0.28, 0.3), n('D2', 'sawtooth', SID_ADSR.bass, 0.3), nArp('D3', 4, 7)],
    [null, null, null],
    [n('D5', 'pulse', SID_ADSR.stab, 0.22, 0.35), null, null],
    [n('---'), null, null],
    // Resolve Em
    [n('E5', 'pulse', SID_ADSR.lead, 0.3, 0.25), n('E2', 'sawtooth', SID_ADSR.bass, 0.3), nArp('E3', 3, 7)],
    [null, null, null],
    [n('B4', 'pulse', SID_ADSR.stab, 0.22, 0.3), n('B2', 'sawtooth', SID_ADSR.bass, 0.3), null],
    [n('---'), null, null],
    [n('G4', 'pulse', SID_ADSR.stab, 0.22, 0.35), n('E2', 'sawtooth', SID_ADSR.bass, 0.3), nArp('E3', 3, 7)],
    [n('---'), null, null],
    [n('F#4', 'pulse', SID_ADSR.stab, 0.2, 0.4), n('B2', 'sawtooth', SID_ADSR.bass, 0.3), null],
    [n('---'), null, null],
  ],
};

// Pattern 1: Lead melody (the iconic Delta-style melodic section)
const gameThemePattern1: Pattern = {
  speed: 4,
  rows: [
    // Em melody - soaring lead
    [n('E5', 'pulse', SID_ADSR.lead, 0.3, 0.2), n('E2', 'sawtooth', SID_ADSR.bass, 0.3), nArp('E3', 3, 7)],
    [null, null, null],
    [n('D5', 'pulse', SID_ADSR.lead, 0.28, 0.25), null, null],
    [null, null, null],
    [n('B4', 'pulse', SID_ADSR.lead, 0.28, 0.3), n('B2', 'sawtooth', SID_ADSR.bass, 0.3), nArp('B3', 3, 7)],
    [null, null, null],
    [n('A4', 'pulse', SID_ADSR.stab, 0.22, 0.35), null, null],
    [n('B4', 'pulse', SID_ADSR.stab, 0.22, 0.35), null, null],
    // C major section
    [n('C5', 'pulse', SID_ADSR.lead, 0.3, 0.2), n('C2', 'sawtooth', SID_ADSR.bass, 0.3), nArp('C3', 4, 7)],
    [null, null, null],
    [n('E5', 'pulse', SID_ADSR.lead, 0.28, 0.25), null, null],
    [null, null, null],
    [n('G5', 'pulse', SID_ADSR.lead, 0.3, 0.3), n('G2', 'sawtooth', SID_ADSR.bass, 0.3), nArp('G3', 4, 7)],
    [null, null, null],
    [n('F#5', 'pulse', SID_ADSR.stab, 0.22, 0.35), n('D2', 'sawtooth', SID_ADSR.bass, 0.3), null],
    [n('E5', 'pulse', SID_ADSR.stab, 0.22, 0.35), null, null],
    // Descending run
    [n('D5', 'pulse', SID_ADSR.stab, 0.25, 0.25), n('A2', 'sawtooth', SID_ADSR.bass, 0.3), nArp('A3', 3, 7)],
    [n('C5', 'pulse', SID_ADSR.stab, 0.22, 0.3), null, null],
    [n('B4', 'pulse', SID_ADSR.stab, 0.22, 0.35), null, null],
    [n('A4', 'pulse', SID_ADSR.stab, 0.22, 0.4), null, null],
    [n('G4', 'pulse', SID_ADSR.stab, 0.22, 0.25), n('E2', 'sawtooth', SID_ADSR.bass, 0.3), nArp('E3', 3, 7)],
    [n('F#4', 'pulse', SID_ADSR.stab, 0.22, 0.3), null, null],
    [n('E4', 'pulse', SID_ADSR.stab, 0.22, 0.35), null, null],
    [n('D4', 'pulse', SID_ADSR.stab, 0.22, 0.4), null, null],
    // Ascending flourish -> resolve
    [n('E4', 'pulse', SID_ADSR.stab, 0.22, 0.2), n('B2', 'sawtooth', SID_ADSR.bass, 0.3), nArp('B3', 4, 7)],
    [n('F#4', 'pulse', SID_ADSR.stab, 0.22, 0.25), null, null],
    [n('G4', 'pulse', SID_ADSR.stab, 0.22, 0.3), null, null],
    [n('A4', 'pulse', SID_ADSR.stab, 0.22, 0.35), null, null],
    [n('B4', 'pulse', SID_ADSR.lead, 0.3, 0.25), n('E2', 'sawtooth', SID_ADSR.bass, 0.3), nArp('E3', 3, 7)],
    [null, null, null],
    [null, null, null],
    [n('---'), n('---'), null],
  ],
};

// Pattern 2: Intense section - rapid fire staccato
const gameThemePattern2: Pattern = {
  speed: 4,
  rows: [
    // Rapid octave jumps on lead — bass on downbeats only
    [n('E5', 'pulse', SID_ADSR.stab, 0.25, 0.2), n('E2', 'sawtooth', SID_ADSR.bass, 0.3), nArp('E3', 3, 7)],
    [n('E4', 'pulse', SID_ADSR.stab, 0.2, 0.25), null, null],
    [n('E5', 'pulse', SID_ADSR.stab, 0.25, 0.3), null, null],
    [n('G5', 'pulse', SID_ADSR.stab, 0.25, 0.35), null, null],
    [n('B5', 'pulse', SID_ADSR.stab, 0.25, 0.2), n('G2', 'sawtooth', SID_ADSR.bass, 0.3), nArp('G3', 4, 7)],
    [n('G5', 'pulse', SID_ADSR.stab, 0.2, 0.25), null, null],
    [n('B5', 'pulse', SID_ADSR.stab, 0.25, 0.3), null, null],
    [n('D5', 'pulse', SID_ADSR.stab, 0.22, 0.35), null, null],
    // Am riff
    [n('A5', 'pulse', SID_ADSR.stab, 0.25, 0.2), n('A2', 'sawtooth', SID_ADSR.bass, 0.3), nArp('A3', 3, 7)],
    [n('E5', 'pulse', SID_ADSR.stab, 0.2, 0.25), null, null],
    [n('A5', 'pulse', SID_ADSR.stab, 0.25, 0.3), null, null],
    [n('C5', 'pulse', SID_ADSR.stab, 0.22, 0.35), null, null],
    // D -> B (dramatic tension)
    [n('D5', 'pulse', SID_ADSR.stab, 0.25, 0.2), n('D2', 'sawtooth', SID_ADSR.bass, 0.3), nArp('D3', 4, 7)],
    [n('A4', 'pulse', SID_ADSR.stab, 0.2, 0.25), null, null],
    [n('F#5', 'pulse', SID_ADSR.stab, 0.25, 0.3), null, null],
    [n('D5', 'pulse', SID_ADSR.stab, 0.22, 0.35), null, null],
    // Resolution and turnaround
    [n('B4', 'pulse', SID_ADSR.stab, 0.25, 0.2), n('B2', 'sawtooth', SID_ADSR.bass, 0.3), nArp('B3', 4, 7)],
    [n('D#5', 'pulse', SID_ADSR.stab, 0.2, 0.25), null, null],
    [n('F#5', 'pulse', SID_ADSR.stab, 0.25, 0.3), null, null],
    [n('B5', 'pulse', SID_ADSR.stab, 0.25, 0.35), null, null],
    // Final 4 - chromatic run up to Em
    [n('C5', 'pulse', SID_ADSR.stab, 0.22, 0.2), n('C2', 'sawtooth', SID_ADSR.bass, 0.3), nArp('C3', 4, 7)],
    [n('C#5', 'pulse', SID_ADSR.stab, 0.22, 0.25), null, null],
    [n('D5', 'pulse', SID_ADSR.stab, 0.22, 0.3), n('D2', 'sawtooth', SID_ADSR.bass, 0.3), nArp('D3', 4, 7)],
    [n('D#5', 'pulse', SID_ADSR.stab, 0.22, 0.35), null, null],
    [n('E5', 'pulse', SID_ADSR.lead, 0.3, 0.2), n('E2', 'sawtooth', SID_ADSR.bass, 0.35), nArp('E3', 3, 7)],
    [null, null, null],
    [null, null, null],
    [null, null, null],
    [n('D#5', 'pulse', SID_ADSR.stab, 0.2, 0.25), n('B2', 'sawtooth', SID_ADSR.bass, 0.3), nArp('B3', 4, 7)],
    [n('B4', 'pulse', SID_ADSR.stab, 0.2, 0.3), null, null],
    [n('F#4', 'pulse', SID_ADSR.stab, 0.2, 0.35), null, null],
    [n('---'), n('---'), null],
  ],
};

// Pattern 3: Breakdown/bridge - half-time feel with sustained notes
const gameThemePattern3: Pattern = {
  speed: 4,
  rows: [
    // Sustained chords with arpeggio — bass on half notes
    [n('G5', 'pulse', SID_ADSR.lead, 0.3, 0.2), n('C2', 'sawtooth', SID_ADSR.bass, 0.3), nArp('C3', 4, 7)],
    [null, null, null],
    [null, null, null],
    [null, null, null],
    [n('F#5', 'pulse', SID_ADSR.lead, 0.28, 0.25), n('D2', 'sawtooth', SID_ADSR.bass, 0.3), nArp('D3', 4, 7)],
    [null, null, null],
    [null, null, null],
    [null, null, null],
    [n('E5', 'pulse', SID_ADSR.lead, 0.3, 0.3), n('E2', 'sawtooth', SID_ADSR.bass, 0.3), nArp('E3', 3, 7)],
    [null, null, null],
    [null, null, null],
    [null, null, null],
    [n('D5', 'pulse', SID_ADSR.lead, 0.28, 0.35), n('B2', 'sawtooth', SID_ADSR.bass, 0.3), nArp('B3', 4, 7)],
    [null, null, null],
    [n('D#5', 'pulse', SID_ADSR.stab, 0.22, 0.3), null, null],
    [n('E5', 'pulse', SID_ADSR.stab, 0.22, 0.25), null, null],
    // Second half - pickup into next section
    [n('G5', 'pulse', SID_ADSR.lead, 0.3, 0.2), n('A2', 'sawtooth', SID_ADSR.bass, 0.3), nArp('A3', 3, 7)],
    [null, null, null],
    [n('F#5', 'pulse', SID_ADSR.stab, 0.22, 0.25), null, null],
    [n('E5', 'pulse', SID_ADSR.stab, 0.22, 0.3), null, null],
    [n('D5', 'pulse', SID_ADSR.lead, 0.28, 0.2), n('G2', 'sawtooth', SID_ADSR.bass, 0.3), nArp('G3', 4, 7)],
    [null, null, null],
    [n('B4', 'pulse', SID_ADSR.stab, 0.22, 0.25), null, null],
    [n('A4', 'pulse', SID_ADSR.stab, 0.22, 0.3), null, null],
    // Build up - rapid ascending
    [n('B4', 'pulse', SID_ADSR.stab, 0.22, 0.2), n('E2', 'sawtooth', SID_ADSR.bass, 0.3), nArp('E3', 3, 7)],
    [n('C5', 'pulse', SID_ADSR.stab, 0.22, 0.25), null, null],
    [n('D5', 'pulse', SID_ADSR.stab, 0.22, 0.3), null, null],
    [n('D#5', 'pulse', SID_ADSR.stab, 0.22, 0.35), null, null],
    [n('E5', 'pulse', SID_ADSR.stab, 0.22, 0.2), n('B2', 'sawtooth', SID_ADSR.bass, 0.3), nArp('B3', 4, 7)],
    [n('F#5', 'pulse', SID_ADSR.stab, 0.22, 0.25), null, null],
    [n('G5', 'pulse', SID_ADSR.stab, 0.22, 0.3), null, null],
    [n('A5', 'pulse', SID_ADSR.stab, 0.22, 0.35), null, null],
  ],
};

export const GAME_THEME: Song = {
  title: 'Delta Force',
  bpm: 160,
  patterns: [gameThemePattern0, gameThemePattern1, gameThemePattern2, gameThemePattern3],
  arrangement: [0, 1, 0, 2, 3, 1, 2, 3],
  loopPoint: 0,
};

// ============================================================
// TRACK 2: Title Screen / Menu - "Star Fury"
// More melodic, slightly slower, builds anticipation
// ============================================================

const titlePattern0: Pattern = {
  speed: 38,
  rows: [
    // Atmospheric intro with arpeggios
    [n('E4', 'triangle', SID_ADSR.pad, 0.2), n('E2', 'sawtooth', SID_ADSR.bass, 0.25), nArp('E3', 4, 7)],
    [null, null, null],
    [null, null, null],
    [null, n('E2', 'sawtooth', SID_ADSR.bass, 0.15), null],
    [null, null, null],
    [null, null, null],
    [n('G4', 'triangle', SID_ADSR.pad, 0.2), n('G2', 'sawtooth', SID_ADSR.bass, 0.25), nArp('G3', 3, 7)],
    [null, null, null],
    [null, null, null],
    [null, n('G2', 'sawtooth', SID_ADSR.bass, 0.15), null],
    [null, null, null],
    [null, null, null],
    [n('A4', 'triangle', SID_ADSR.pad, 0.2), n('A2', 'sawtooth', SID_ADSR.bass, 0.25), nArp('A3', 3, 7)],
    [null, null, null],
    [null, null, null],
    [null, n('A2', 'sawtooth', SID_ADSR.bass, 0.15), null],
    [null, null, null],
    [null, null, null],
    [n('B4', 'triangle', SID_ADSR.pad, 0.22), n('B2', 'sawtooth', SID_ADSR.bass, 0.25), nArp('B3', 3, 7)],
    [null, null, null],
    [null, null, null],
    [null, n('E2', 'sawtooth', SID_ADSR.bass, 0.15), null],
    [null, null, null],
    [null, null, null],
    // Building...
    [n('C5', 'pulse', SID_ADSR.lead, 0.22, 0.3), n('A2', 'sawtooth', SID_ADSR.bass, 0.25), nArp('A3', 4, 7)],
    [null, null, null],
    [null, n('E2', 'sawtooth', SID_ADSR.bass, 0.15), null],
    [n('B4', 'pulse', SID_ADSR.lead, 0.2, 0.35), n('G2', 'sawtooth', SID_ADSR.bass, 0.25), nArp('G3', 4, 7)],
    [null, null, null],
    [null, n('D2', 'sawtooth', SID_ADSR.bass, 0.15), null],
    [n('A4', 'pulse', SID_ADSR.lead, 0.22, 0.4), n('F2', 'sawtooth', SID_ADSR.bass, 0.25), nArp('F3', 4, 7)],
    [null, null, null],
  ],
};

const titlePattern1: Pattern = {
  speed: 38,
  rows: [
    // Main melody comes in
    [n('E5', 'pulse', SID_ADSR.lead, 0.25, 0.3), n('A2', 'sawtooth', SID_ADSR.bass, 0.25), nArp('A3', 4, 7)],
    [null, null, null],
    [null, n('E2', 'sawtooth', SID_ADSR.bass, 0.2), null],
    [n('D5', 'pulse', SID_ADSR.lead, 0.22, 0.35), null, null],
    [null, null, null],
    [n('C5', 'pulse', SID_ADSR.lead, 0.2, 0.4), n('A2', 'sawtooth', SID_ADSR.bass, 0.2), nArp('A3', 3, 7)],
    [null, null, null],
    [n('B4', 'pulse', SID_ADSR.lead, 0.22, 0.3), n('E2', 'sawtooth', SID_ADSR.bass, 0.25), null],
    [null, null, null],
    [null, null, nArp('E3', 4, 7)],
    [n('A4', 'pulse', SID_ADSR.lead, 0.25, 0.35), n('A2', 'sawtooth', SID_ADSR.bass, 0.25), null],
    [null, null, null],
    [null, n('E2', 'sawtooth', SID_ADSR.bass, 0.2), nArp('A3', 4, 7)],
    [n('G4', 'pulse', SID_ADSR.lead, 0.22, 0.4), null, null],
    [null, null, null],
    [n('A4', 'pulse', SID_ADSR.lead, 0.25, 0.3), n('F2', 'sawtooth', SID_ADSR.bass, 0.25), nArp('F3', 4, 7)],
    [null, null, null],
    [null, n('C2', 'sawtooth', SID_ADSR.bass, 0.2), null],
    [n('B4', 'pulse', SID_ADSR.lead, 0.22, 0.35), null, null],
    [null, null, null],
    [n('C5', 'pulse', SID_ADSR.lead, 0.25, 0.3), n('G2', 'sawtooth', SID_ADSR.bass, 0.25), nArp('G3', 4, 7)],
    [null, null, null],
    [null, n('D2', 'sawtooth', SID_ADSR.bass, 0.2), null],
    [n('D5', 'pulse', SID_ADSR.lead, 0.22, 0.4), null, null],
    [null, null, null],
    [n('E5', 'pulse', SID_ADSR.lead, 0.3, 0.3), n('E2', 'sawtooth', SID_ADSR.bass, 0.3), nArp('E3', 4, 7)],
    [null, null, null],
    [null, null, null],
    [null, n('B1', 'sawtooth', SID_ADSR.bass, 0.2), null],
    [null, null, null],
    [null, null, null],
    [null, n('E2', 'sawtooth', SID_ADSR.bass, 0.25), nArp('E3', 4, 7)],
  ],
};

export const TITLE_THEME: Song = {
  title: 'Star Fury',
  bpm: 150,
  patterns: [titlePattern0, titlePattern1],
  arrangement: [0, 1, 0, 1],
  loopPoint: 0,
};

// ============================================================
// TRACK 3: Boss Battle - "Nemesis"
// Dark, intense, minor key - Hubbard-style aggressive SID
// Fast chromatic runs, heavy bass, relentless rhythm
// ============================================================

const bossPattern0: Pattern = {
  speed: 4,
  rows: [
    // Aggressive E minor staccato with hammering bass (every 2 rows)
    [n('E5', 'sawtooth', SID_ADSR.stab, 0.3), n('E2', 'sawtooth', SID_ADSR.bass, 0.4), nArp('E3', 3, 6)],
    [n('---'), null, null],
    [n('E5', 'sawtooth', SID_ADSR.stab, 0.3), n('E2', 'sawtooth', SID_ADSR.bass, 0.35), null],
    [n('D5', 'sawtooth', SID_ADSR.stab, 0.28), null, null],
    [n('C5', 'sawtooth', SID_ADSR.stab, 0.3), n('C2', 'sawtooth', SID_ADSR.bass, 0.4), nArp('C3', 3, 7)],
    [n('---'), null, null],
    [n('D5', 'sawtooth', SID_ADSR.stab, 0.28), n('C2', 'sawtooth', SID_ADSR.bass, 0.35), null],
    [n('D#5', 'sawtooth', SID_ADSR.stab, 0.28), null, null],
    [n('E5', 'sawtooth', SID_ADSR.stab, 0.3), n('A2', 'sawtooth', SID_ADSR.bass, 0.4), nArp('A3', 3, 7)],
    [n('---'), null, null],
    [n('C5', 'sawtooth', SID_ADSR.stab, 0.28), n('A2', 'sawtooth', SID_ADSR.bass, 0.35), null],
    [n('B4', 'sawtooth', SID_ADSR.stab, 0.28), null, null],
    [n('A4', 'sawtooth', SID_ADSR.stab, 0.3), n('D2', 'sawtooth', SID_ADSR.bass, 0.4), nArp('D3', 3, 6)],
    [n('---'), null, null],
    [n('G#4', 'sawtooth', SID_ADSR.stab, 0.28), n('D2', 'sawtooth', SID_ADSR.bass, 0.35), null],
    [n('A4', 'sawtooth', SID_ADSR.stab, 0.28), null, null],
    // Chromatic ascent
    [n('B4', 'pulse', SID_ADSR.lead, 0.3, 0.2), n('B2', 'sawtooth', SID_ADSR.bass, 0.4), nArp('B3', 3, 6)],
    [n('C5', 'pulse', SID_ADSR.stab, 0.25, 0.25), null, null],
    [n('C#5', 'pulse', SID_ADSR.stab, 0.25, 0.3), n('B2', 'sawtooth', SID_ADSR.bass, 0.35), null],
    [n('D5', 'pulse', SID_ADSR.stab, 0.25, 0.35), null, null],
    [n('D#5', 'pulse', SID_ADSR.stab, 0.25, 0.2), n('E2', 'sawtooth', SID_ADSR.bass, 0.4), nArp('E3', 3, 7)],
    [n('E5', 'pulse', SID_ADSR.stab, 0.25, 0.25), null, null],
    [n('F5', 'pulse', SID_ADSR.stab, 0.25, 0.3), n('E2', 'sawtooth', SID_ADSR.bass, 0.35), null],
    [n('F#5', 'pulse', SID_ADSR.stab, 0.25, 0.35), null, null],
    // Climax
    [n('G5', 'pulse', SID_ADSR.lead, 0.35, 0.2), n('G2', 'sawtooth', SID_ADSR.bass, 0.4), nArp('G3', 4, 7)],
    [null, null, null],
    [n('F#5', 'pulse', SID_ADSR.stab, 0.25, 0.25), n('G2', 'sawtooth', SID_ADSR.bass, 0.35), null],
    [n('E5', 'pulse', SID_ADSR.stab, 0.25, 0.3), null, null],
    [n('D#5', 'pulse', SID_ADSR.stab, 0.25, 0.2), n('B2', 'sawtooth', SID_ADSR.bass, 0.4), nArp('B3', 4, 7)],
    [n('B4', 'pulse', SID_ADSR.stab, 0.25, 0.25), null, null],
    [n('F#4', 'pulse', SID_ADSR.stab, 0.25, 0.3), n('B2', 'sawtooth', SID_ADSR.bass, 0.35), null],
    [n('---'), null, null],
  ],
};

const bossPattern1: Pattern = {
  speed: 4,
  rows: [
    // Wild descending runs — bass every 2 rows
    [n('B5', 'sawtooth', SID_ADSR.stab, 0.3), n('E2', 'sawtooth', SID_ADSR.bass, 0.4), nArp('E3', 3, 6)],
    [n('A5', 'sawtooth', SID_ADSR.stab, 0.28), null, null],
    [n('G5', 'sawtooth', SID_ADSR.stab, 0.28), n('E2', 'sawtooth', SID_ADSR.bass, 0.35), null],
    [n('F#5', 'sawtooth', SID_ADSR.stab, 0.28), null, null],
    [n('E5', 'sawtooth', SID_ADSR.stab, 0.28), n('C2', 'sawtooth', SID_ADSR.bass, 0.4), nArp('C3', 4, 7)],
    [n('D5', 'sawtooth', SID_ADSR.stab, 0.25), null, null],
    [n('C5', 'sawtooth', SID_ADSR.stab, 0.25), n('C2', 'sawtooth', SID_ADSR.bass, 0.35), null],
    [n('B4', 'sawtooth', SID_ADSR.stab, 0.25), null, null],
    // Power chord section
    [n('A4', 'sawtooth', SID_ADSR.lead, 0.35), n('A2', 'sawtooth', SID_ADSR.bass, 0.4), nArp('A3', 4, 7)],
    [null, null, null],
    [null, n('A2', 'sawtooth', SID_ADSR.bass, 0.35), null],
    [n('---'), null, n('---')],
    [n('G#4', 'sawtooth', SID_ADSR.lead, 0.35), n('G#2', 'sawtooth', SID_ADSR.bass, 0.4), nArp('G#3', 4, 8)],
    [null, null, null],
    [null, n('G#2', 'sawtooth', SID_ADSR.bass, 0.35), null],
    [n('---'), null, n('---')],
    // Rapid machine-gun notes
    [n('E5', 'sawtooth', SID_ADSR.stab, 0.25), n('E2', 'sawtooth', SID_ADSR.bass, 0.4), nArp('E3', 3, 6)],
    [n('E5', 'sawtooth', SID_ADSR.stab, 0.22), null, null],
    [n('E5', 'sawtooth', SID_ADSR.stab, 0.25), n('E2', 'sawtooth', SID_ADSR.bass, 0.35), null],
    [n('---'), null, null],
    [n('G5', 'sawtooth', SID_ADSR.stab, 0.25), n('G2', 'sawtooth', SID_ADSR.bass, 0.4), nArp('G3', 3, 7)],
    [n('G5', 'sawtooth', SID_ADSR.stab, 0.22), null, null],
    [n('G5', 'sawtooth', SID_ADSR.stab, 0.25), n('G2', 'sawtooth', SID_ADSR.bass, 0.35), null],
    [n('---'), null, null],
    // Final hit + silence
    [n('B5', 'sawtooth', SID_ADSR.lead, 0.35), n('B2', 'sawtooth', SID_ADSR.bass, 0.45), nArp('B3', 4, 7)],
    [null, null, null],
    [null, n('E2', 'sawtooth', SID_ADSR.bass, 0.4), null],
    [null, null, null],
    [n('---'), n('E2', 'sawtooth', SID_ADSR.bass, 0.35), nArp('E3', 3, 7)],
    [n('---'), null, null],
    [n('---'), n('E2', 'sawtooth', SID_ADSR.bass, 0.35), null],
    [n('---'), null, null],
  ],
};

export const BOSS_THEME: Song = {
  title: 'Nemesis',
  bpm: 180,
  patterns: [bossPattern0, bossPattern1],
  arrangement: [0, 1, 0, 1],
  loopPoint: 0,
};

// ============================================================
// TRACK 4: Game Over - short jingle
// ============================================================

const gameOverPattern: Pattern = {
  speed: 48,
  rows: [
    [n('E4', 'sawtooth', SID_ADSR.pad, 0.3), n('E2', 'sawtooth', SID_ADSR.bass, 0.3), nArp('E3', 3, 7)],
    [null, null, null],
    [n('D4', 'sawtooth', SID_ADSR.pad, 0.25), n('D2', 'sawtooth', SID_ADSR.bass, 0.25), nArp('D3', 3, 7)],
    [null, null, null],
    [n('C4', 'sawtooth', SID_ADSR.pad, 0.2), n('C2', 'sawtooth', SID_ADSR.bass, 0.25), nArp('C3', 3, 7)],
    [null, null, null],
    [n('B3', 'sawtooth', SID_ADSR.pad, 0.2), n('B1', 'sawtooth', SID_ADSR.bass, 0.25), nArp('B2', 3, 6)],
    [null, null, null],
    [n('A3', 'triangle', SID_ADSR.pad, 0.25), n('A1', 'sawtooth', SID_ADSR.bass, 0.3), nArp('A2', 3, 7)],
    [null, null, null],
    [null, null, null],
    [null, null, null],
    [n('---'), n('---'), n('---')],
    [null, null, null],
    [null, null, null],
    [null, null, null],
  ],
};

export const GAME_OVER_JINGLE: Song = {
  title: 'Game Over',
  bpm: 110,
  patterns: [gameOverPattern],
  arrangement: [0],
  loopPoint: 0, // Won't loop - one-shot
};
