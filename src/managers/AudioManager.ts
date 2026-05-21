import { SIDSynth } from '../audio/SIDSynth';
import { SIDEmulator } from '../audio/SIDEmulator';
import { SIDSequencer } from '../audio/SIDSequencer';
import { SIDFilePlayer } from '../audio/SIDFilePlayer';
import { GAME_THEME, GAME_THEMES, TITLE_THEME, BOSS_THEME, GAME_OVER_JINGLE } from '../audio/SIDTracks';
import type { Song } from '../audio/SIDSequencer';

type SoundType = 'shoot' | 'explosion' | 'powerup' | 'hit' | 'boss_hit' | 'menu_select' | 'level_clear';
type MusicTrack = 'game' | 'title' | 'boss' | 'gameover';
export type SynthEngine = 'webaudio' | 'sidemulator';

export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicPlaying = false;
  private gameThemeIndex = 0;

  // SID music system
  private sidSynth: SIDSynth | null = null;
  private sidEmulator: SIDEmulator | null = null;
  private sidSequencer: SIDSequencer | null = null;
  private sidFilePlayer: SIDFilePlayer | null = null;
  private currentTrack: MusicTrack | null = null;
  private _activeEngine: SynthEngine = 'webaudio';
  private _playingSIDFile = false;

  // SFX deduplication: prevent same sound playing multiple times per frame
  private playedThisFrame: Set<SoundType> = new Set();

  constructor() {}

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.5;
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.3;
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.6;
      this.sfxGain.connect(this.masterGain);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  play(sound: SoundType): void {
    // Deduplicate: only play each sound type once per frame
    if (this.playedThisFrame.has(sound)) return;
    this.playedThisFrame.add(sound);

    const ctx = this.ensureContext();
    const now = ctx.currentTime;

    switch (sound) {
      case 'shoot':
        this.playShoot(ctx, now);
        break;
      case 'explosion':
        this.playExplosion(ctx, now);
        break;
      case 'powerup':
        this.playPowerup(ctx, now);
        break;
      case 'hit':
        this.playHit(ctx, now);
        break;
      case 'boss_hit':
        this.playBossHit(ctx, now);
        break;
      case 'menu_select':
        this.playMenuSelect(ctx, now);
        break;
      case 'level_clear':
        this.playLevelClear(ctx, now);
        break;
    }
  }

  private playShoot(ctx: AudioContext, now: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.05);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
    osc.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  private playExplosion(ctx: AudioContext, now: number): void {
    const bufferSize = ctx.sampleRate * 0.3;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, now);
    filter.frequency.exponentialRampToValueAtTime(100, now + 0.3);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain!);
    source.start(now);
  }

  private playPowerup(ctx: AudioContext, now: number): void {
    // Quick rising sweep — doesn't clash with music notes
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(1600, now + 0.15);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    osc.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  private playHit(ctx: AudioContext, now: number): void {
    const bufferSize = ctx.sampleRate * 0.05;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
    source.connect(gain);
    gain.connect(this.sfxGain!);
    source.start(now);
  }

  private playBossHit(ctx: AudioContext, now: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.2);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    osc.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  private playMenuSelect(ctx: AudioContext, now: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.setValueAtTime(660, now + 0.05);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  private playLevelClear(ctx: AudioContext, now: number): void {
    const notes = [523, 659, 784, 1047, 1319];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.3, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.3);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.3);
    });
  }

  private ensureSIDSynth(): void {
    const ctx = this.ensureContext();
    if (!this.sidSynth) {
      this.sidSynth = new SIDSynth(ctx, this.musicGain!);
    }
    if (!this.sidEmulator) {
      this.sidEmulator = new SIDEmulator(ctx, this.musicGain!);
    }
    if (!this.sidSequencer) {
      const engine = this._activeEngine === 'sidemulator' ? this.sidEmulator : this.sidSynth;
      this.sidSequencer = new SIDSequencer(engine);
    }
  }

  /** Toggle between Web Audio synth and real SID emulator */
  async toggleEngine(): Promise<SynthEngine> {
    this.ensureContext();
    this.ensureSIDSynth();

    if (this._activeEngine === 'webaudio') {
      // Switch to SID emulator
      if (!this.sidEmulator!.ready) {
        await this.sidEmulator!.init();
      }
      this._activeEngine = 'sidemulator';
      this.sidSequencer!.setSynth(this.sidEmulator!);
    } else {
      // Switch back to Web Audio synth
      this._activeEngine = 'webaudio';
      this.sidSequencer!.setSynth(this.sidSynth!);
    }

    return this._activeEngine;
  }

  get activeEngine(): SynthEngine {
    return this._activeEngine;
  }

  private getTrackSong(track: MusicTrack): Song {
    switch (track) {
      case 'game': return GAME_THEMES[this.gameThemeIndex];
      case 'title': return TITLE_THEME;
      case 'boss': return BOSS_THEME;
      case 'gameover': return GAME_OVER_JINGLE;
    }
  }

  /** Advance to the next game theme and start playing it. Returns the theme title. */
  nextGameTrack(): string {
    this.gameThemeIndex = (this.gameThemeIndex + 1) % GAME_THEMES.length;
    this.stopMusic();
    this.startMusic('game');
    return GAME_THEMES[this.gameThemeIndex].title;
  }

  get currentGameThemeTitle(): string {
    return GAME_THEMES[this.gameThemeIndex].title;
  }

  startMusic(track: MusicTrack = 'game'): void {
    if (this.musicPlaying && this.currentTrack === track) return;

    this.stopMusic();
    this.ensureContext();
    this.ensureSIDSynth();
    this.musicPlaying = true;
    this.currentTrack = track;

    const song = this.getTrackSong(track);
    this.sidSequencer!.loadSong(song);
    this.sidSequencer!.play();
  }

  stopMusic(): void {
    this.musicPlaying = false;
    this.currentTrack = null;
    if (this.sidSequencer) {
      this.sidSequencer.stop();
    }
  }

  /** Must be called every frame — only handles SFX deduplication reset */
  update(_dt: number): void {
    this.playedThisFrame.clear();
  }

  setMasterVolume(volume: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = volume;
    }
  }

  setMusicVolume(volume: number): void {
    if (this.musicGain) {
      this.musicGain.gain.value = volume;
    }
  }

  /** Play a .sid file from a URL (stops current music) */
  async playSIDFile(url: string, subtune = 0): Promise<void> {
    const ctx = this.ensureContext();
    this.stopMusic();
    this.stopSIDFile();

    if (!this.sidFilePlayer) {
      this.sidFilePlayer = new SIDFilePlayer(ctx, this.musicGain!);
    }
    if (!this.sidFilePlayer.ready) {
      await this.sidFilePlayer.init();
    }

    await this.sidFilePlayer.loadURL(url, subtune);
    this.sidFilePlayer.play();
    this._playingSIDFile = true;
  }

  stopSIDFile(): void {
    if (this.sidFilePlayer) {
      this.sidFilePlayer.stop();
    }
    this._playingSIDFile = false;
  }

  get playingSIDFile(): boolean {
    return this._playingSIDFile;
  }

  destroy(): void {
    this.stopMusic();
    this.stopSIDFile();
    if (this.sidSynth) {
      this.sidSynth.destroy();
      this.sidSynth = null;
    }
    if (this.sidEmulator) {
      this.sidEmulator.destroy();
      this.sidEmulator = null;
    }
    if (this.sidSequencer) {
      this.sidSequencer.destroy();
      this.sidSequencer = null;
    }
    if (this.sidFilePlayer) {
      this.sidFilePlayer.destroy();
      this.sidFilePlayer = null;
    }
  }
}
