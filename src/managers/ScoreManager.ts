import { CHAIN_MAX_MULTIPLIER, CHAIN_TIMEOUT } from '../utils/constants';

export class ScoreManager {
  private _score = 0;
  private _hiScore = 0;
  private _multiplier = 1;
  private _chain = 0;
  private lastKillTime = 0;

  constructor() {
    this._hiScore = this.loadHiScore();
  }

  get score(): number {
    return this._score;
  }

  get hiScore(): number {
    return this._hiScore;
  }

  get multiplier(): number {
    return this._multiplier;
  }

  get chain(): number {
    return this._chain;
  }

  addKill(basePoints: number): number {
    const now = performance.now();
    if (now - this.lastKillTime < CHAIN_TIMEOUT) {
      this._chain++;
      this._multiplier = Math.min(this._chain, CHAIN_MAX_MULTIPLIER);
    } else {
      this._chain = 1;
      this._multiplier = 1;
    }
    this.lastKillTime = now;

    const points = basePoints * this._multiplier;
    this._score += points;

    if (this._score > this._hiScore) {
      this._hiScore = this._score;
    }

    return points;
  }

  reset(): void {
    this.saveHiScore();
    this._score = 0;
    this._multiplier = 1;
    this._chain = 0;
    this.lastKillTime = 0;
  }

  private loadHiScore(): number {
    try {
      const saved = localStorage.getItem('starfury_hiscore');
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  }

  saveHiScore(): void {
    try {
      localStorage.setItem('starfury_hiscore', String(this._hiScore));
    } catch {
      // localStorage unavailable
    }
  }
}
