export class ObjectPool<T> {
  private pool: T[] = [];
  private _active: T[] = [];

  constructor(
    private factory: () => T,
    private resetFn: (item: T) => void,
    initialSize: number
  ) {
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.factory());
    }
  }

  get(): T {
    const item = this.pool.length > 0 ? this.pool.pop()! : this.factory();
    this._active.push(item);
    return item;
  }

  release(item: T): void {
    const idx = this._active.indexOf(item);
    if (idx !== -1) {
      this._active.splice(idx, 1);
      this.resetFn(item);
      this.pool.push(item);
    }
  }

  releaseAll(): void {
    for (const item of this._active) {
      this.resetFn(item);
      this.pool.push(item);
    }
    this._active.length = 0;
  }

  get active(): T[] {
    return this._active;
  }

  get activeCount(): number {
    return this._active.length;
  }

  get availableCount(): number {
    return this.pool.length;
  }
}
