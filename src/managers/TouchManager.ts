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
  private readonly JOYSTICK_DEAD_ZONE = 15; // pixels before registering movement
  private readonly JOYSTICK_MAX_RADIUS = 60;

  // For drawing overlay
  private overlayCanvas: HTMLCanvasElement | null = null;
  private overlayCtx: CanvasRenderingContext2D | null = null;
  private joystickCenter: { x: number; y: number } | null = null;
  private joystickPos: { x: number; y: number } | null = null;

  private _isMobile = false;

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

    // Create overlay canvas for touch controls rendering
    this.overlayCanvas = document.createElement('canvas');
    this.overlayCanvas.style.position = 'absolute';
    this.overlayCanvas.style.top = '0';
    this.overlayCanvas.style.left = '0';
    this.overlayCanvas.style.pointerEvents = 'none';
    this.overlayCanvas.style.zIndex = '10';
    document.body.appendChild(this.overlayCanvas);
    this.overlayCtx = this.overlayCanvas.getContext('2d');

    this.resizeOverlay();

    canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
    canvas.addEventListener('touchend', this.onTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', this.onTouchEnd, { passive: false });

    window.addEventListener('resize', this.resizeOverlay);

    // Auto-fire on mobile (shoot is always on while touching right side)
    this.drawOverlay();
  }

  private resizeOverlay = (): void => {
    if (!this.overlayCanvas || !this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    this.overlayCanvas.width = rect.width;
    this.overlayCanvas.height = rect.height;
    this.overlayCanvas.style.width = `${rect.width}px`;
    this.overlayCanvas.style.height = `${rect.height}px`;
    this.overlayCanvas.style.left = `${rect.left}px`;
    this.overlayCanvas.style.top = `${rect.top}px`;
    this.drawOverlay();
  };

  private onTouchStart = (e: TouchEvent): void => {
    e.preventDefault();
    const rect = this.canvas!.getBoundingClientRect();

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
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
        // Right side = shoot + confirm
        this.state.shoot = true;
        this.confirmTriggered = true;
      }
    }

    this.updateDirectionFromJoystick();
    this.drawOverlay();
  };

  private onTouchMove = (e: TouchEvent): void => {
    e.preventDefault();

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const active = this.activeTouches.get(touch.identifier);
      if (!active) continue;

      const rect = this.canvas!.getBoundingClientRect();
      active.currentX = touch.clientX - rect.left;
      active.currentY = touch.clientY - rect.top;

      if (active.isJoystick) {
        // Clamp joystick position within max radius
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
    this.drawOverlay();
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
    this.drawOverlay();
  };

  private updateDirectionFromJoystick(): void {
    // Find active joystick touch
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

    // Normalize and apply thresholds
    const nx = dx / dist;
    const ny = dy / dist;

    this.state.left = nx < -0.4;
    this.state.right = nx > 0.4;
    this.state.up = ny < -0.4;
    this.state.down = ny > 0.4;
  }

  private drawOverlay(): void {
    if (!this.overlayCtx || !this.overlayCanvas) return;
    const ctx = this.overlayCtx;
    const w = this.overlayCanvas.width;
    const h = this.overlayCanvas.height;

    ctx.clearRect(0, 0, w, h);

    // Draw joystick zone hint (only when no active joystick)
    if (!this.joystickCenter) {
      ctx.beginPath();
      ctx.arc(w * 0.2, h * 0.7, this.JOYSTICK_MAX_RADIUS, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(w * 0.2, h * 0.7, 12, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fill();
    }

    // Draw active joystick
    if (this.joystickCenter && this.joystickPos) {
      // Outer ring
      ctx.beginPath();
      ctx.arc(this.joystickCenter.x, this.joystickCenter.y, this.JOYSTICK_MAX_RADIUS, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0, 200, 255, 0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Inner knob
      ctx.beginPath();
      ctx.arc(this.joystickPos.x, this.joystickPos.y, 20, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 200, 255, 0.4)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 200, 255, 0.7)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Draw fire button hint (right side)
    const fireX = w * 0.82;
    const fireY = h * 0.7;
    const fireRadius = 35;

    ctx.beginPath();
    ctx.arc(fireX, fireY, fireRadius, 0, Math.PI * 2);
    if (this.state.shoot) {
      ctx.fillStyle = 'rgba(255, 80, 80, 0.4)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 80, 80, 0.8)';
    } else {
      ctx.fillStyle = 'rgba(255, 80, 80, 0.1)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 80, 80, 0.3)';
    }
    ctx.lineWidth = 2;
    ctx.stroke();

    // Fire label
    ctx.fillStyle = this.state.shoot ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.4)';
    ctx.font = 'bold 14px monospace';
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
    if (this.canvas) {
      this.canvas.removeEventListener('touchstart', this.onTouchStart);
      this.canvas.removeEventListener('touchmove', this.onTouchMove);
      this.canvas.removeEventListener('touchend', this.onTouchEnd);
      this.canvas.removeEventListener('touchcancel', this.onTouchEnd);
    }
    if (this.overlayCanvas) {
      this.overlayCanvas.remove();
    }
    window.removeEventListener('resize', this.resizeOverlay);
  }
}
