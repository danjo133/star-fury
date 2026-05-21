/**
 * SID File Player
 * Runs a 6502 CPU executing the SID tune's player routine at the correct rate (50Hz PAL),
 * capturing register writes and forwarding them to the SID emulator AudioWorklet.
 */

import { CPU6502 } from './CPU6502';
import { parseSIDFile, type SIDFileInfo } from './SIDFile';

export class SIDFilePlayer {
  private ctx: AudioContext;
  private workletNode: AudioWorkletNode | null = null;
  private cpu: CPU6502;
  private sidInfo: SIDFileInfo | null = null;
  private playTimerId: number | null = null;
  private _playing = false;
  private _ready = false;
  private destination: AudioNode;
  private gainNode: GainNode;

  // PAL: 985248 cycles / 50 frames = 19705 cycles per frame
  private readonly CYCLES_PER_FRAME = 19705;
  private readonly FRAME_RATE = 50; // PAL 50Hz

  constructor(ctx: AudioContext, destination: AudioNode) {
    this.ctx = ctx;
    this.destination = destination;
    this.cpu = new CPU6502();
    this.gainNode = ctx.createGain();
    this.gainNode.gain.value = 0.8;
    this.gainNode.connect(destination);
  }

  async init(): Promise<void> {
    if (this._ready) return;

    const base = import.meta.env.BASE_URL ?? '/';
    await this.ctx.audioWorklet.addModule(`${base}sid-worklet-processor.js`);

    this.workletNode = new AudioWorkletNode(this.ctx, 'sid-worklet-processor', {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [1],
    });

    this.workletNode.connect(this.gainNode);
    this._ready = true;
  }

  get ready(): boolean {
    return this._ready;
  }

  get playing(): boolean {
    return this._playing;
  }

  get info(): SIDFileInfo | null {
    return this.sidInfo;
  }

  /** Load a .sid file from an ArrayBuffer */
  loadSID(buffer: ArrayBuffer, subtune = 0): void {
    this.stop();
    this.sidInfo = parseSIDFile(buffer);

    // Reset CPU and load the SID data into memory
    this.cpu.reset();
    this.cpu.memory.fill(0);

    // Load program data at the specified address
    const loadAddr = this.sidInfo.loadAddress;
    for (let i = 0; i < this.sidInfo.data.length; i++) {
      this.cpu.memory[loadAddr + i] = this.sidInfo.data[i];
    }

    // Set up basic C64 memory environment
    // Kernal vectors that SID tunes might read
    this.cpu.memory[0x0001] = 0x37; // Default memory config
    this.cpu.memory[0x00DC04] = 0; // CIA timer (some tunes read this)
    this.cpu.memory[0x00DC05] = 0;

    // Set up IRQ/NMI vectors to point to an RTS
    this.cpu.memory[0xEA31] = 0x60; // RTS at common IRQ handler location
    this.cpu.memory[0xEA81] = 0x60; // RTS
    this.cpu.memory[0xFF48] = 0x60; // RTS

    // Wire up SID register writes to the worklet
    this.cpu.onSIDWrite = (reg: number, value: number) => {
      if (this.workletNode) {
        this.workletNode.port.postMessage({ type: 'write', reg, value });
      }
    };

    // Reset the SID chip
    if (this.workletNode) {
      this.workletNode.port.postMessage({ type: 'reset' });
    }

    // Call the init routine with subtune in A register
    const song = subtune || (this.sidInfo.startSong - 1);
    this.cpu.a = song & 0xFF;
    this.cpu.jsr(this.sidInfo.initAddress);

    console.log(`Loaded: "${this.sidInfo.title}" by ${this.sidInfo.author} (${this.sidInfo.songs} subtunes)`);
  }

  /** Load a .sid file from a URL */
  async loadURL(url: string, subtune = 0): Promise<void> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch SID file: ${response.status} ${response.statusText}`);
    }
    const buffer = await response.arrayBuffer();
    this.loadSID(buffer, subtune);
  }

  play(): void {
    if (!this.sidInfo || !this._ready || this._playing) return;
    this._playing = true;

    // Run the play routine at 50Hz (PAL frame rate)
    // Use setInterval at ~20ms (50Hz) and run the CPU for one frame's worth of cycles
    this.playTimerId = window.setInterval(() => {
      this.playFrame();
    }, 1000 / this.FRAME_RATE);
  }

  stop(): void {
    this._playing = false;
    if (this.playTimerId !== null) {
      clearInterval(this.playTimerId);
      this.playTimerId = null;
    }
    // Silence the SID
    if (this.workletNode) {
      this.workletNode.port.postMessage({ type: 'reset' });
    }
  }

  private playFrame(): void {
    if (!this.sidInfo || !this._playing) return;

    // Call the play routine
    if (this.sidInfo.playAddress !== 0) {
      this.cpu.jsr(this.sidInfo.playAddress, this.CYCLES_PER_FRAME);
    } else {
      // playAddress = 0 means the tune uses IRQ-driven playback
      // Run the CPU for one frame
      this.cpu.run(this.CYCLES_PER_FRAME);
    }
  }

  destroy(): void {
    this.stop();
    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }
    this.gainNode.disconnect();
    this._ready = false;
  }
}
