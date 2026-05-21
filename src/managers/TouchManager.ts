import { GAME_WIDTH, GAME_HEIGHT } from '../utils/constants';

interface TouchState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  shoot: boolean;
  confirm: boolean;
}

interface ActiveTouch {
  id: number;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  isJoystick: boolean;
}

export class TouchManager {
  private state: TouchState = {
    up: false,
    down: false,
    left: false,
    right: false,
    shoot: false,
    confirm: false,
  };

  private confirmTriggered = false;
  private activeTouches: Map<number, ActiveTouch> = new Map();
  private canvas: HTMLCanvasElement | null = null;

  // Virtual joystick config
  private readonly JOYSTICK_DEAD_ZONE = 15;
  private readonly JOYSTICK_MAX_RADIUS = 60;

  // Controls canvas (separate element for portrait, overlay for landscape)
  private controlsCanvas: HTMLCanvasElement | null = null;
  private controlsCtx: CanvasRenderingContext2D | null = null;
  private joystickCenter: { x: number; y: number } | null = null;
  private joystickPos: { x: number; y: number } | null = null;

  private _isMobile = false;
  private isPortrait = false;

  get isMobile(): boolean {
    return this._isMobile;
  }

  constructor() {
    this._isMobile = this.detectMobile();
  }

  private detectMobile(): boolean {
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
    );
  }

  attach(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;

    if (!this._isMobile) return;

    // Create controls canvas
    this.controlsCanvas = document.createElement('canvas');
    this.controlsCanvas.style.display = 'block';
    this.controlsCanvas.style.zIndex = '10';
    document.body.appendChild(this.controlsCanvas);
    this.controlsCtx = this.controlsCanvas.getContext('2d');

    this.handleResize();

    // Touch events go on the controls canvas (portrait) or game canvas (landscape)
    this.controlsCanvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
    this.controlsCanvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
    this.controlsCanvas.addEventListener('touchend', this.onTouchEnd, { passive: false });
    this.controlsCanvas.addEventListener('touchcancel', this.onTouchEnd, { passive: false });

    // Also listen on the game canvas for landscape overlay mode
    canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
    canvas.addEventListener('touchend', this.onTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', this.onTouchEnd, { passive: false });

    window.addEventListener('resize', this.handleResize);
    this.drawControls();
  }

  private handleResize = (): void => {
    if (!this.controlsCanvas || !this.canvas) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    this.isPortrait = vh > vw;

    if (this.isPortrait) {
      // Portrait: controls area goes below the game canvas
      const gameRect = this.canvas.getBoundingClientRect();
      const controlsHeight = vh - gameRect.bottom;
      const controlsWidth = vw;

      this.controlsCanvas.width = controlsWidth * (window.devicePixelRatio || 1);
      this.controlsCanvas.height = Math.max(controlsHeight, 160) * (window.devicePixelRatio || 1);
      this.controlsCanvas.style.width = `${controlsWidth}px`;
      this.controlsCanvas.style.height = `${Math.max(controlsHeight, 160)}px`;
      this.controlsCanvas.style.position = 'relative';
      this.controlsCanvas.style.pointerEvents = 'auto';

      if (this.controlsCtx) {
        this.controlsCtx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);
      }
    } else {
      // Landscape: overlay on game canvas
      const gameRect = this.canvas.getBoundingClientRect();
      this.controlsCanvas.width = gameRect.width * (window.devicePixelRatio || 1);
      this.controlsCanvas.height = gameRect.height * (window.devicePixelRatio || 1);
      this.controlsCanvas.style.width = `${gameRect.width}px`;
      this.controlsCanvas.style.height = `${gameRect.height}px`;
      this.controlsCanvas.style.position = 'absolute';
      this.controlsCanvas.style.left = `${gameRect.left}px`;
      this.controlsCanvas.style.top = `${gameRect.top}px`;
      this.controlsCanvas.style.pointerEvents = 'none'; // let touches pass through to game canvas

      if (this.controlsCtx) {
        this.controlsCtx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);
      }
    }

    this.drawControls();
  };

  private getTouchTarget(): HTMLCanvasElement {
    // In portrait mode, touches come from the controls canvas
    // In landscape, touches come from the game canvas
    return this.isPortrait ? this.controlsCanvas! : this.canvas!;
  }

  private onTouchStart = (e: TouchEvent): void => {
    e.preventDefault();
    const target = this.isPortrait ? this.controlsCanvas! : this.canvas!;
    const rect = target.getBoundingClientRect();

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;

      // Ignore touches on wrong target
      if (this.isPortrait && e.currentTarget !== this.controlsCanvas) {
        // In portrait, taps on game canvas = confirm only
        this.confirmTriggered = true;
        continue;
      }
      if (!this.isPortrait && e.currentTarget !== this.canvas) continue;

      const halfWidth = rect.width / 2;
      const isJoystick = x < halfWidth;

      this.activeTouches.set(touch.identifier, {
        id: touch.identifier,
        startX: x,
        startY: y,
        currentX: x,
        currentY: y,
        isJoystick,
      });

      if (isJoystick) {
        this.joystickCenter = { x, y };
        this.joystickPos = { x, y };
      } else {
        this.state.shoot = true;
        this.confirmTriggered = true;
      }
    }

    this.updateDirectionFromJoystick();
    this.drawControls();
  };

  private onTouchMove = (e: TouchEvent): void => {
    e.preventDefault();
    const target = this.isPortrait ? this.controlsCanvas! : this.canvas!;
    const rect = target.getBoundingClientRect();

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const active = this.activeTouches.get(touch.identifier);
      if (!active) continue;

      active.currentX = touch.clientX - rect.left;
      active.currentY = touch.clientY - rect.top;

      if (active.isJoystick) {
        const dx = active.currentX - active.startX;
        const dy = active.currentY - active.startY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > this.JOYSTICK_MAX_RADIUS) {
          const angle = Math.atan2(dy, dx);
          this.joystickPos = {
            x: active.startX + Math.cos(angle) * this.JOYSTICK_MAX_RADIUS,
            y: active.startY + Math.sin(angle) * this.JOYSTICK_MAX_RADIUS,
          };
        } else {
          this.joystickPos = { x: active.currentX, y: active.currentY };
        }
      }
    }

    this.updateDirectionFromJoystick();
    this.drawControls();
  };

  private onTouchEnd = (e: TouchEvent): void => {
    e.preventDefault();

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const active = this.activeTouches.get(touch.identifier);
      if (!active) continue;

      if (active.isJoystick) {
        this.joystickCenter = null;
        this.joystickPos = null;
      } else {
        this.state.shoot = false;
      }

      this.activeTouches.delete(touch.identifier);
    }

    this.updateDirectionFromJoystick();
    this.drawControls();
  };

  private updateDirectionFromJoystick(): void {
    let joystickTouch: ActiveTouch | null = null;
    for (const touch of this.activeTouches.values()) {
      if (touch.isJoystick) {
        joystickTouch = touch;
        break;
      }
    }

    if (!joystickTouch) {
      this.state.up = false;
      this.state.down = false;
      this.state.left = false;
      this.state.right = false;
      return;
    }

    const dx = joystickTouch.currentX - joystickTouch.startX;
    const dy = joystickTouch.currentY - joystickTouch.startY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < this.JOYSTICK_DEAD_ZONE) {
      this.state.up = false;
      this.state.down = false;
      this.state.left = false;
      this.state.right = false;
      return;
    }

    const nx = dx / dist;
    const ny = dy / dist;

    this.state.left = nx < -0.4;
    this.state.right = nx > 0.4;
    this.state.up = ny < -0.4;
    this.state.down = ny > 0.4;
  }

  private drawControls(): void {
    if (!this.controlsCtx || !this.controlsCanvas) return;
    const ctx = this.controlsCtx;
    const dpr = window.devicePixelRatio || 1;
    const w = this.controlsCanvas.width / dpr;
    const h = this.controlsCanvas.height / dpr;

    ctx.clearRect(0, 0, w, h);

    if (this.isPortrait) {
      // Portrait mode: draw a proper control panel
      // Subtle top border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(w, 0);
      ctx.stroke();
    }

    // Joystick
    const joyX = w * 0.22;
    const joyY = h * 0.5;

    if (!this.joystickCenter) {
      // Default position indicator
      ctx.beginPath();
      ctx.arc(joyX, joyY, this.JOYSTICK_MAX_RADIUS, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(joyX, joyY, 14, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fill();
    }

    // Active joystick
    if (this.joystickCenter && this.joystickPos) {
      ctx.beginPath();
      ctx.arc(this.joystickCenter.x, this.joystickCenter.y, this.JOYSTICK_MAX_RADIUS, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0, 200, 255, 0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(this.joystickPos.x, this.joystickPos.y, 22, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 200, 255, 0.4)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 200, 255, 0.7)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Fire button
    const fireX = w * 0.8;
    const fireY = h * 0.5;
    const fireRadius = this.isPortrait ? 40 : 35;

    ctx.beginPath();
    ctx.arc(fireX, fireY, fireRadius, 0, Math.PI * 2);
    if (this.state.shoot) {
      ctx.fillStyle = 'rgba(255, 80, 80, 0.4)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 80, 80, 0.8)';
    } else {
      ctx.fillStyle = 'rgba(255, 80, 80, 0.15)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 80, 80, 0.4)';
    }
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = this.state.shoot ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.5)';
    ctx.font = `bold ${this.isPortrait ? 16 : 14}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('FIRE', fireX, fireY);
  }

  get up(): boolean {
    return this.state.up;
  }

  get down(): boolean {
    return this.state.down;
  }

  get left(): boolean {
    return this.state.left;
  }

  get right(): boolean {
    return this.state.right;
  }

  get shoot(): boolean {
    return this.state.shoot;
  }

  get confirm(): boolean {
    const val = this.confirmTriggered;
    this.confirmTriggered = false;
    return val;
  }

  clearFrame(): void {
    // confirm is consumed on read, nothing else to clear per frame
  }

  destroy(): void {
    if (this.controlsCanvas) {
      this.controlsCanvas.removeEventListener('touchstart', this.onTouchStart);
      this.controlsCanvas.removeEventListener('touchmove', this.onTouchMove);
      this.controlsCanvas.removeEventListener('touchend', this.onTouchEnd);
      this.controlsCanvas.removeEventListener('touchcancel', this.onTouchEnd);
      this.controlsCanvas.remove();
    }
    if (this.canvas) {
      this.canvas.removeEventListener('touchstart', this.onTouchStart);
      this.canvas.removeEventListener('touchmove', this.onTouchMove);
      this.canvas.removeEventListener('touchend', this.onTouchEnd);
      this.canvas.removeEventListener('touchcancel', this.onTouchEnd);
    }
    window.removeEventListener('resize', this.handleResize);
  }
}
