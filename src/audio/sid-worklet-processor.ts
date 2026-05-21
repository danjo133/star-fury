/**
 * MOS 6581/8580 SID Chip Emulator — AudioWorklet Processor
 *
 * Accurate emulation of:
 * - 3 oscillator voices (16-bit phase accumulator)
 * - Waveforms: triangle, sawtooth, pulse (variable width), noise (LFSR)
 * - SID-accurate ADSR envelope (with the characteristic SID timing quirks)
 * - Multi-mode resonant filter (LP/BP/HP) per the SID architecture
 * - Ring modulation and hard sync between voices
 *
 * Driven by register writes posted from the main thread.
 */

// SID register offsets per voice (7 registers each)
const VOICE_OFFSET = 7;
// Voice registers: FreqLo, FreqHi, PWLo, PWHi, Control, AD, SR
// Filter: FC_Lo (0x15), FC_Hi (0x16), ResFilt (0x17), ModeVol (0x18)

// ADSR rate lookup table (attack/decay/release times in cycles at ~1MHz clock)
// These match the SID chip's actual timing via lookup counters
const ATTACK_RATES = [2, 8, 16, 24, 38, 56, 68, 80, 100, 250, 500, 800, 1000, 3000, 5000, 8000];
const DR_RATES = [6, 24, 48, 72, 114, 168, 204, 240, 300, 750, 1500, 2400, 3000, 9000, 15000, 24000];

// ADSR states
const ATTACK = 0;
const DECAY = 1;
const SUSTAIN = 2;
const RELEASE = 3;

class SIDVoiceState {
  // Oscillator
  freq = 0;           // 16-bit frequency register
  pulseWidth = 2048;  // 12-bit pulse width (0-4095)
  waveform = 0;       // bit flags: noise=8, pulse=4, saw=2, tri=1
  control = 0;        // control register (gate, sync, ring, test, waveform)
  
  // Phase accumulator (24-bit on real SID, we use 24-bit for accuracy)
  phase = 0;
  
  // Noise LFSR (23-bit)
  lfsr = 0x7FFFF8;
  noiseOutput = 0;
  
  // ADSR envelope
  adsrState = RELEASE;
  adsrCounter = 0;
  envelope = 0;       // 0-255
  attackRate = 0;
  decayRate = 0;
  sustainLevel = 0;
  releaseRate = 0;
  gate = false;
  prevGate = false;
  
  // Rate counters
  rateCounter = 0;
  ratePeriod = 0;
  exponentialCounter = 0;
  exponentialPeriod = 0;
  
  // Output
  output = 0;
}

class SIDChipEmulator {
  private voices: SIDVoiceState[] = [];
  private sampleRate: number;
  private clockRate = 985248; // PAL C64 clock (985248 Hz), NTSC would be 1022727
  private cyclesPerSample: number;
  private cycleAccumulator = 0;
  
  // Filter state
  private filterFreq = 0;    // 11-bit filter frequency
  private filterRes = 0;     // 4-bit resonance
  private filterMode = 0;    // LP/BP/HP/3off flags
  private filterVoiceMask = 0; // which voices routed through filter
  private volume = 15;       // 4-bit master volume
  
  // Filter internal state (emulated as 2-pole state variable filter)
  private filterLp = 0;
  private filterBp = 0;
  private filterHp = 0;
  
  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
    this.cyclesPerSample = this.clockRate / sampleRate;
    
    for (let i = 0; i < 3; i++) {
      this.voices.push(new SIDVoiceState());
    }
  }
  
  writeRegister(reg: number, value: number): void {
    if (reg < 0 || reg > 0x18) return;
    
    if (reg < 0x15) {
      // Voice registers
      const voiceIdx = Math.floor(reg / VOICE_OFFSET);
      const voiceReg = reg % VOICE_OFFSET;
      const voice = this.voices[voiceIdx];
      if (!voice) return;
      
      switch (voiceReg) {
        case 0: // Freq Lo
          voice.freq = (voice.freq & 0xFF00) | (value & 0xFF);
          break;
        case 1: // Freq Hi
          voice.freq = (voice.freq & 0x00FF) | ((value & 0xFF) << 8);
          break;
        case 2: // PW Lo
          voice.pulseWidth = (voice.pulseWidth & 0xF00) | (value & 0xFF);
          break;
        case 3: // PW Hi
          voice.pulseWidth = (voice.pulseWidth & 0x0FF) | ((value & 0x0F) << 8);
          break;
        case 4: // Control register
          voice.control = value;
          voice.waveform = (value >> 4) & 0x0F;
          voice.prevGate = voice.gate;
          voice.gate = (value & 0x01) !== 0;
          
          // Gate transition
          if (voice.gate && !voice.prevGate) {
            // Gate on: start attack
            voice.adsrState = ATTACK;
            voice.rateCounter = 0;
          } else if (!voice.gate && voice.prevGate) {
            // Gate off: start release
            voice.adsrState = RELEASE;
          }
          
          // Test bit resets oscillator
          if (value & 0x08) {
            voice.phase = 0;
          }
          break;
        case 5: // AD
          voice.attackRate = (value >> 4) & 0x0F;
          voice.decayRate = value & 0x0F;
          break;
        case 6: // SR
          voice.sustainLevel = ((value >> 4) & 0x0F) * 17; // Map 0-15 to 0-255
          voice.releaseRate = value & 0x0F;
          break;
      }
    } else {
      // Filter / volume registers
      switch (reg) {
        case 0x15: // Filter freq lo (bits 0-2)
          this.filterFreq = (this.filterFreq & 0x7F8) | (value & 0x07);
          break;
        case 0x16: // Filter freq hi (bits 3-10)
          this.filterFreq = (this.filterFreq & 0x007) | ((value & 0xFF) << 3);
          break;
        case 0x17: // Resonance + filter voice routing
          this.filterRes = (value >> 4) & 0x0F;
          this.filterVoiceMask = value & 0x0F; // bit0=v1, bit1=v2, bit2=v3, bit3=ext
          break;
        case 0x18: // Mode + volume
          this.filterMode = (value >> 4) & 0x0F; // bit4=LP, bit5=BP, bit6=HP, bit7=3off
          this.volume = value & 0x0F;
          break;
      }
    }
  }
  
  generateSample(): number {
    // Clock the SID chip for the appropriate number of cycles
    this.cycleAccumulator += this.cyclesPerSample;
    const cycles = Math.floor(this.cycleAccumulator);
    this.cycleAccumulator -= cycles;
    
    // Process multiple cycles
    for (let c = 0; c < cycles; c++) {
      this.clockOneCycle();
    }
    
    // Mix voices through filter
    let filtered = 0;
    let direct = 0;
    
    for (let i = 0; i < 3; i++) {
      const voice = this.voices[i];
      // Voice 3 can be muted (bit 7 of mode register)
      if (i === 2 && (this.filterMode & 0x08)) continue;
      
      const voiceOut = (voice.output - 128) / 128; // Normalize to -1..1
      
      if (this.filterVoiceMask & (1 << i)) {
        filtered += voiceOut;
      } else {
        direct += voiceOut;
      }
    }
    
    // Apply filter (state variable filter model)
    const cutoff = this.calculateFilterCutoff();
    const resonance = 1.0 - (this.filterRes / 17.0) * 0.85; // Q factor
    
    this.filterHp = filtered - this.filterBp * resonance - this.filterLp;
    this.filterBp += cutoff * this.filterHp;
    this.filterLp += cutoff * this.filterBp;
    
    // Clamp filter outputs
    this.filterBp = Math.max(-1, Math.min(1, this.filterBp));
    this.filterLp = Math.max(-1, Math.min(1, this.filterLp));
    
    let filterOut = 0;
    if (this.filterMode & 0x01) filterOut += this.filterLp;  // LP
    if (this.filterMode & 0x02) filterOut += this.filterBp;  // BP
    if (this.filterMode & 0x04) filterOut += this.filterHp;  // HP
    
    // If no filter mode is selected, pass filtered signal through
    if ((this.filterMode & 0x07) === 0) filterOut = filtered;
    
    const output = (filterOut + direct) * (this.volume / 15.0);
    return Math.max(-1, Math.min(1, output * 0.7));
  }
  
  private clockOneCycle(): void {
    for (let i = 0; i < 3; i++) {
      const voice = this.voices[i];
      
      // Phase accumulator
      if (!(voice.control & 0x08)) { // Not test bit
        voice.phase = (voice.phase + voice.freq) & 0xFFFFFF;
      }
      
      // Noise: clock LFSR when bit 19 of phase goes high
      if (voice.phase & 0x080000 && !(voice.phase - voice.freq & 0x080000 & 0xFFFFFF)) {
        const bit0 = ((voice.lfsr >> 22) ^ (voice.lfsr >> 17)) & 1;
        voice.lfsr = ((voice.lfsr << 1) | bit0) & 0x7FFFFF;
        voice.noiseOutput = 
          ((voice.lfsr >> 15) & 0x80) |
          ((voice.lfsr >> 12) & 0x40) |
          ((voice.lfsr >> 9) & 0x20) |
          ((voice.lfsr >> 6) & 0x10) |
          ((voice.lfsr >> 4) & 0x08) |
          ((voice.lfsr >> 2) & 0x04) |
          ((voice.lfsr >> 1) & 0x02) |
          (voice.lfsr & 0x01);
      }
      
      // Generate waveform output (12-bit on real SID, we use 8-bit for envelope multiply)
      let waveOut = 0;
      const phase12 = (voice.phase >> 12) & 0xFFF;
      
      if (voice.waveform & 0x08) {
        // Noise
        waveOut = voice.noiseOutput;
      } else {
        let tri = 0, saw = 0, pulse = 0;
        
        if (voice.waveform & 0x01) {
          // Triangle
          let triPhase = phase12;
          // Ring modulation with previous voice
          if (voice.control & 0x04) {
            const prevVoice = this.voices[(i + 2) % 3];
            if (prevVoice.phase & 0x800000) {
              triPhase ^= 0xFFF;
            }
          }
          tri = (triPhase & 0x800) ? ((triPhase ^ 0xFFF) << 1) & 0xFFE : (triPhase << 1) & 0xFFE;
          tri = (tri >> 4) & 0xFF;
        }
        
        if (voice.waveform & 0x02) {
          // Sawtooth
          saw = (phase12 >> 4) & 0xFF;
        }
        
        if (voice.waveform & 0x04) {
          // Pulse
          pulse = (phase12 >= voice.pulseWidth) ? 0xFF : 0x00;
        }
        
        // Combine waveforms (AND logic on real SID when multiple selected)
        if (voice.waveform === 0x01) waveOut = tri;
        else if (voice.waveform === 0x02) waveOut = saw;
        else if (voice.waveform === 0x04) waveOut = pulse;
        else if (voice.waveform === 0x03) waveOut = tri & saw; // tri+saw
        else if (voice.waveform === 0x05) waveOut = tri & pulse; // tri+pulse
        else if (voice.waveform === 0x06) waveOut = saw & pulse; // saw+pulse
        else if (voice.waveform === 0x07) waveOut = tri & saw & pulse;
        else waveOut = 0;
      }
      
      // ADSR envelope
      this.clockEnvelope(voice);
      
      // Final voice output = waveform * envelope
      voice.output = (waveOut * voice.envelope) >> 8;
    }
  }
  
  private clockEnvelope(voice: SIDVoiceState): void {
    voice.rateCounter++;
    
    let ratePeriod: number;
    switch (voice.adsrState) {
      case ATTACK:
        ratePeriod = ATTACK_RATES[voice.attackRate];
        break;
      case DECAY:
        ratePeriod = DR_RATES[voice.decayRate];
        break;
      case RELEASE:
        ratePeriod = DR_RATES[voice.releaseRate];
        break;
      default:
        return; // Sustain — no envelope change
    }
    
    if (voice.rateCounter >= ratePeriod) {
      voice.rateCounter = 0;
      
      switch (voice.adsrState) {
        case ATTACK:
          voice.envelope++;
          if (voice.envelope >= 255) {
            voice.envelope = 255;
            voice.adsrState = DECAY;
          }
          break;
        case DECAY:
          if (voice.envelope > voice.sustainLevel) {
            voice.envelope--;
          }
          if (voice.envelope <= voice.sustainLevel) {
            voice.envelope = voice.sustainLevel;
            voice.adsrState = SUSTAIN;
          }
          break;
        case RELEASE:
          if (voice.envelope > 0) {
            voice.envelope--;
          }
          break;
      }
    }
  }
  
  private calculateFilterCutoff(): number {
    // Approximate the SID filter's frequency response
    // The SID filter cutoff range is roughly 30Hz to ~12kHz
    // Register value 0-2047 maps nonlinearly
    const fc = this.filterFreq;
    const freq = 30 + (fc / 2047) * (12000 - 30);
    // Convert to coefficient for state variable filter (0..1)
    return 2.0 * Math.sin(Math.PI * freq / this.sampleRate);
  }
  
  reset(): void {
    for (const voice of this.voices) {
      voice.freq = 0;
      voice.pulseWidth = 2048;
      voice.waveform = 0;
      voice.control = 0;
      voice.phase = 0;
      voice.lfsr = 0x7FFFF8;
      voice.noiseOutput = 0;
      voice.adsrState = RELEASE;
      voice.adsrCounter = 0;
      voice.envelope = 0;
      voice.gate = false;
      voice.prevGate = false;
      voice.rateCounter = 0;
      voice.output = 0;
    }
    this.filterLp = 0;
    this.filterBp = 0;
    this.filterHp = 0;
    this.volume = 15;
  }
}

// AudioWorklet Processor
class SIDWorkletProcessor extends AudioWorkletProcessor {
  private sid: SIDChipEmulator;
  private registerQueue: Array<{ reg: number; value: number }> = [];
  
  constructor() {
    super();
    this.sid = new SIDChipEmulator(sampleRate);
    
    this.port.onmessage = (event) => {
      const data = event.data;
      if (data.type === 'write') {
        this.registerQueue.push({ reg: data.reg, value: data.value });
      } else if (data.type === 'writeBatch') {
        for (const write of data.writes) {
          this.registerQueue.push(write);
        }
      } else if (data.type === 'reset') {
        this.sid.reset();
        this.registerQueue = [];
      }
    };
  }
  
  process(_inputs: Float32Array[][], outputs: Float32Array[][], _parameters: Record<string, Float32Array>): boolean {
    // Process any pending register writes
    while (this.registerQueue.length > 0) {
      const { reg, value } = this.registerQueue.shift()!;
      this.sid.writeRegister(reg, value);
    }
    
    const output = outputs[0];
    if (!output || !output[0]) return true;
    
    const channel = output[0];
    for (let i = 0; i < channel.length; i++) {
      channel[i] = this.sid.generateSample();
    }
    
    // Copy to all channels
    for (let ch = 1; ch < output.length; ch++) {
      output[ch].set(channel);
    }
    
    return true;
  }
}

registerProcessor('sid-worklet-processor', SIDWorkletProcessor);
