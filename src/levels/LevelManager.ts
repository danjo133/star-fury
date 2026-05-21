import { LevelConfig } from '../types/index';
import { level1 } from './level1';
import { level2 } from './level2';

export class LevelManager {
  private levels: LevelConfig[] = [level1, level2];
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

  reset(): void {
    this._currentLevel = 0;
  }

  getBossType(): 'level1' | 'level2' {
    return this._currentLevel === 0 ? 'level1' : 'level2';
  }
}
