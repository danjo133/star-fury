type SoundType = 'shoot' | 'explosion' | 'powerup' | 'hit' | 'boss_hit' | 'menu_select' | 'level_clear';

export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicOscillators: OscillatorNode[] = [];
  private musicPlaying = false;

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
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.2, now + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.05 + 0.1);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now + i * 0.05);
      osc.stop(now + i * 0.05 + 0.1);
    });
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

  startMusic(): void {
    if (this.musicPlaying) return;
    const ctx = this.ensureContext();
    this.musicPlaying = true;

    // Simple bass line loop
    const bassNotes = [65, 65, 82, 82, 55, 55, 73, 73]; // C2, C2, E2, E2, A1, A1, D2, D2
    const beatDuration = 0.25;
    const loopDuration = bassNotes.length * beatDuration;

    const createLoop = () => {
      if (!this.musicPlaying) return;
      const now = ctx.currentTime;

      bassNotes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.15, now + i * beatDuration);
        gain.gain.setValueAtTime(0.0, now + i * beatDuration + beatDuration * 0.8);
        osc.connect(gain);
        gain.connect(this.musicGain!);
        osc.start(now + i * beatDuration);
        osc.stop(now + (i + 1) * beatDuration);
        this.musicOscillators.push(osc);
      });

      // Simple melody on top
      const melodyNotes = [262, 0, 330, 0, 392, 0, 330, 262];
      melodyNotes.forEach((freq, i) => {
        if (freq === 0) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.08, now + i * beatDuration);
        gain.gain.exponentialRampToValueAtTime(0.01, now + i * beatDuration + beatDuration * 0.7);
        osc.connect(gain);
        gain.connect(this.musicGain!);
        osc.start(now + i * beatDuration);
        osc.stop(now + (i + 1) * beatDuration);
        this.musicOscillators.push(osc);
      });

      setTimeout(createLoop, loopDuration * 1000);
    };

    createLoop();
  }

  stopMusic(): void {
    this.musicPlaying = false;
    this.musicOscillators.forEach((osc) => {
      try { osc.stop(); } catch (_) { /* already stopped */ }
    });
    this.musicOscillators = [];
  }

  setMasterVolume(volume: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = volume;
    }
  }
}
