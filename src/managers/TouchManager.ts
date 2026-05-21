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

  // Portrait: single controls canvas below game
  private controlsCanvas: HTMLCanvasElement | null = null;
  private controlsCtx: CanvasRenderingContext2D | null = null;

  // Landscape: left panel (joystick) and right panel (fire)
  private leftPanel: HTMLCanvasElement | null = null;
  private leftCtx: CanvasRenderingContext2D | null = null;
  private rightPanel: HTMLCanvasElement | null = null;
  private rightCtx: CanvasRenderingContext2D | null = null;

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

    // Portrait controls canvas (below game)
    this.controlsCanvas = document.createElement('canvas');
    this.controlsCanvas.style.display = 'block';
    this.controlsCanvas.style.zIndex = '10';
    this.controlsCtx = this.controlsCanvas.getContext('2d');

    // Landscape left panel (joystick)
    this.leftPanel = document.createElement('canvas');
    this.leftPanel.style.display = 'block';
    this.leftPanel.style.zIndex = '10';
    this.leftCtx = this.leftPanel.getContext('2d');

    // Landscape right panel (fire)
    this.rightPanel = document.createElement('canvas');
    this.rightPanel.style.display = 'block';
    this.rightPanel.style.zIndex = '10';
    this.rightCtx = this.rightPanel.getContext('2d');

    this.handleResize();

    // Touch events on all control surfaces
    const addTouchListeners = (el: HTMLCanvasElement) => {
      el.addEventListener('touchstart', this.onTouchStart, { passive: false });
      el.addEventListener('touchmove', this.onTouchMove, { passive: false });
      el.addEventListener('touchend', this.onTouchEnd, { passive: false });
      el.addEventListener('touchcancel', this.onTouchEnd, { passive: false });
    };

    addTouchListeners(this.controlsCanvas);
    addTouchListeners(this.leftPanel);
    addTouchListeners(this.rightPanel);

    // Taps on game canvas in portrait = confirm
    canvas.addEventListener('touchstart', this.onGameCanvasTap, { passive: false });

    window.addEventListener('resize', this.handleResize);
  }

  private handleResize = (): void => {
    if (!this.canvas) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    this.isPortrait = vh > vw;

    if (this.isPortrait) {
      this.setupPortraitLayout();
    } else {
      this.setupLandscapeLayout();
    }

    this.drawControls();
  };

  private setupPortraitLayout(): void {
    // Show portrait controls, hide landscape panels
    this.removeFromDOM(this.leftPanel);
    this.removeFromDOM(this.rightPanel);

    if (this.controlsCanvas && !this.controlsCanvas.parentNode) {
      document.body.appendChild(this.controlsCanvas);
    }

    const gameRect = this.canvas!.getBoundingClientRect();
    const vh = window.innerHeight;
    const controlsHeight = Math.max(vh - gameRect.bottom, 160);
    const controlsWidth = window.innerWidth;
    const dpr = window.devicePixelRatio || 1;

    this.controlsCanvas!.width = controlsWidth * dpr;
    this.controlsCanvas!.height = controlsHeight * dpr;
    this.controlsCanvas!.style.width = `${controlsWidth}px`;
    this.controlsCanvas!.style.height = `${controlsHeight}px`;
    this.controlsCanvas!.style.position = 'relative';

    if (this.controlsCtx) {
      this.controlsCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  private setupLandscapeLayout(): void {
    // Show landscape panels, hide portrait controls
    this.removeFromDOM(this.controlsCanvas);

    const gameRect = this.canvas!.getBoundingClientRect();
    const vh = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;

    // Panels fill the space on either side of the game canvas
    const sideWidth = Math.floor((window.innerWidth - gameRect.width) / 2);

    // Insert left panel before game canvas, right panel after
    if (this.leftPanel && !this.leftPanel.parentNode) {
      this.canvas!.parentNode!.insertBefore(this.leftPanel, this.canvas!);
    }
    if (this.rightPanel && !this.rightPanel.parentNode) {
      if (this.canvas!.nextSibling) {
        this.canvas!.parentNode!.insertBefore(this.rightPanel, this.canvas!.nextSibling);
      } else {
        this.canvas!.parentNode!.appendChild(this.rightPanel);
      }
    }

    // Size left panel
    this.leftPanel!.width = sideWidth * dpr;
    this.leftPanel!.height = vh * dpr;
    this.leftPanel!.style.width = `${sideWidth}px`;
    this.leftPanel!.style.height = `${vh}px`;

    // Size right panel
    this.rightPanel!.width = sideWidth * dpr;
    this.rightPanel!.height = vh * dpr;
    this.rightPanel!.style.width = `${sideWidth}px`;
    this.rightPanel!.style.height = `${vh}px`;

    if (this.leftCtx) {
      this.leftCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    if (this.rightCtx) {
      this.rightCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  private removeFromDOM(el: HTMLCanvasElement | null): void {
    if (el && el.parentNode) {
      el.parentNode.removeChild(el);
    }
  }

  private onGameCanvasTap = (e: TouchEvent): void => {
    e.preventDefault();
    this.confirmTriggered = true;
  };

  private onTouchStart = (e: TouchEvent): void => {
    e.preventDefault();
    const target = e.currentTarget as HTMLCanvasElement;
    const rect = target.getBoundingClientRect();

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;

      let isJoystick: boolean;

      if (this.isPortrait) {
        // Left half = joystick, right half = fire
        isJoystick = x < rect.width / 2;
      } else {
        // In landscape, left panel = joystick, right panel = fire
        isJoystick = target === this.leftPanel;
      }

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
    const target = e.currentTarget as HTMLCanvasElement;
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
    if (this.isPortrait) {
      this.drawPortraitControls();
    } else {
      this.drawLandscapeControls();
    }
  }

  private drawPortraitControls(): void {
    if (!this.controlsCtx || !this.controlsCanvas) return;
    const ctx = this.controlsCtx;
    const dpr = window.devicePixelRatio || 1;
    const w = this.controlsCanvas.width / dpr;
    const h = this.controlsCanvas.height / dpr;

    ctx.clearRect(0, 0, w, h);

    // Subtle top border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(w, 0);
    ctx.stroke();

    // Joystick (left side)
    this.drawJoystick(ctx, w * 0.22, h * 0.5);

    // Fire button (right side)
    this.drawFireButton(ctx, w * 0.8, h * 0.5, 40);
  }

  private drawLandscapeControls(): void {
    // Draw joystick on left panel
    if (this.leftCtx && this.leftPanel) {
      const dpr = window.devicePixelRatio || 1;
      const w = this.leftPanel.width / dpr;
      const h = this.leftPanel.height / dpr;
      this.leftCtx.clearRect(0, 0, w, h);
      this.drawJoystick(this.leftCtx, w * 0.5, h * 0.55);
    }

    // Draw fire button on right panel
    if (this.rightCtx && this.rightPanel) {
      const dpr = window.devicePixelRatio || 1;
      const w = this.rightPanel.width / dpr;
      const h = this.rightPanel.height / dpr;
      this.rightCtx.clearRect(0, 0, w, h);
      this.drawFireButton(this.rightCtx, w * 0.5, h * 0.55, 38);
    }
  }

  private drawJoystick(ctx: CanvasRenderingContext2D, defaultX: number, defaultY: number): void {
    if (!this.joystickCenter) {
      // Default position indicator
      ctx.beginPath();
      ctx.arc(defaultX, defaultY, this.JOYSTICK_MAX_RADIUS, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(defaultX, defaultY, 14, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fill();
    }

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
  }

  private drawFireButton(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
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
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('FIRE', x, y);
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
    const removeTouchListeners = (el: HTMLCanvasElement | null) => {
      if (!el) return;
      el.removeEventListener('touchstart', this.onTouchStart);
      el.removeEventListener('touchmove', this.onTouchMove);
      el.removeEventListener('touchend', this.onTouchEnd);
      el.removeEventListener('touchcancel', this.onTouchEnd);
    };

    removeTouchListeners(this.controlsCanvas);
    removeTouchListeners(this.leftPanel);
    removeTouchListeners(this.rightPanel);

    if (this.canvas) {
      this.canvas.removeEventListener('touchstart', this.onGameCanvasTap);
    }

    this.removeFromDOM(this.controlsCanvas);
    this.removeFromDOM(this.leftPanel);
    this.removeFromDOM(this.rightPanel);

    window.removeEventListener('resize', this.handleResize);
  }
}
