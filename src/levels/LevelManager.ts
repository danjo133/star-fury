import { LevelConfig } from '../types/index';
import { level1 } from './level1';
import { level2 } from './level2';
import { level3 } from './level3';
import { level4 } from './level4';
import { level5 } from './level5';
import { level6 } from './level6';
import { level7 } from './level7';
import { level8 } from './level8';
import { level9 } from './level9';
import { level10 } from './level10';

export class LevelManager {
  private levels: LevelConfig[] = [
    level1, level2, level3, level4, level5,
    level6, level7, level8, level9, level10,
  ];
  private _currentLevel = 0;

  get currentLevel(): number {
    return this._currentLevel;
  }

  get currentConfig(): LevelConfig {
    return this.levels[this._currentLevel];
  }

  get levelName(): string {
    return this.currentConfig.name;
  }

  get totalLevels(): number {
    return this.levels.length;
  }

  nextLevel(): boolean {
    this._currentLevel++;
    if (this._currentLevel >= this.levels.length) {
      return false; // No more levels, game won
    }
    return true;
  }

  setLevel(index: number): void {
    this._currentLevel = Math.max(0, Math.min(index, this.levels.length - 1));
  }

  reset(): void {
    this._currentLevel = 0;
  }

  getBossType(): 'level1' | 'level2' {
    // Alternate between the two boss types
    return this._currentLevel % 2 === 0 ? 'level1' : 'level2';
  }
}
