export class InputManager {
  private keys: Map<string, boolean> = new Map();
  private justPressed: Map<string, boolean> = new Map();
  private gamepad: Gamepad | null = null;

  constructor() {
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('keyup', this.onKeyUp.bind(this));
    window.addEventListener('gamepadconnected', (e) => {
      this.gamepad = (e as GamepadEvent).gamepad;
    });
    window.addEventListener('gamepaddisconnected', () => {
      this.gamepad = null;
    });
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (!this.keys.get(e.code)) {
      this.justPressed.set(e.code, true);
    }
    this.keys.set(e.code, true);
    e.preventDefault();
  }

  private onKeyUp(e: KeyboardEvent): void {
    this.keys.set(e.code, false);
    e.preventDefault();
  }

  isHeld(key: string): boolean {
    return this.keys.get(key) === true;
  }

  isJustPressed(key: string): boolean {
    return this.justPressed.get(key) === true;
  }

  clearFrame(): void {
    this.justPressed.clear();
  }

  get up(): boolean {
    return this.isHeld('ArrowUp') || this.isHeld('KeyW') || this.getGamepadAxis(1) < -0.3;
  }

  get down(): boolean {
    return this.isHeld('ArrowDown') || this.isHeld('KeyS') || this.getGamepadAxis(1) > 0.3;
  }

  get left(): boolean {
    return this.isHeld('ArrowLeft') || this.isHeld('KeyA') || this.getGamepadAxis(0) < -0.3;
  }

  get right(): boolean {
    return this.isHeld('ArrowRight') || this.isHeld('KeyD') || this.getGamepadAxis(0) > 0.3;
  }

  get shoot(): boolean {
    return this.isHeld('Space') || this.isHeld('KeyZ') || this.getGamepadButton(0);
  }

  get confirm(): boolean {
    return this.isJustPressed('Space') || this.isJustPressed('Enter') || this.getGamepadButton(0);
  }

  private getGamepadAxis(axis: number): number {
    if (!this.gamepad) return 0;
    const gp = navigator.getGamepads()[this.gamepad.index];
    return gp?.axes[axis] ?? 0;
  }

  private getGamepadButton(button: number): boolean {
    if (!this.gamepad) return false;
    const gp = navigator.getGamepads()[this.gamepad.index];
    return gp?.buttons[button]?.pressed ?? false;
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown.bind(this));
    window.removeEventListener('keyup', this.onKeyUp.bind(this));
  }
}
