// src/audio/sid-worklet-processor.ts
var VOICE_OFFSET = 7;
var ATTACK_RATES = [2, 8, 16, 24, 38, 56, 68, 80, 100, 250, 500, 800, 1e3, 3e3, 5e3, 8e3];
var DR_RATES = [6, 24, 48, 72, 114, 168, 204, 240, 300, 750, 1500, 2400, 3e3, 9e3, 15e3, 24e3];
var ATTACK = 0;
var DECAY = 1;
var SUSTAIN = 2;
var RELEASE = 3;
var SIDVoiceState = class {
  // Oscillator
  freq = 0;
  // 16-bit frequency register
  pulseWidth = 2048;
  // 12-bit pulse width (0-4095)
  waveform = 0;
  // bit flags: noise=8, pulse=4, saw=2, tri=1
  control = 0;
  // control register (gate, sync, ring, test, waveform)
  // Phase accumulator (24-bit on real SID, we use 24-bit for accuracy)
  phase = 0;
  // Noise LFSR (23-bit)
  lfsr = 8388600;
  noiseOutput = 0;
  // ADSR envelope
  adsrState = RELEASE;
  adsrCounter = 0;
  envelope = 0;
  // 0-255
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
};
var SIDChipEmulator = class {
  voices = [];
  sampleRate;
  clockRate = 985248;
  // PAL C64 clock (985248 Hz), NTSC would be 1022727
  cyclesPerSample;
  cycleAccumulator = 0;
  // Filter state
  filterFreq = 0;
  // 11-bit filter frequency
  filterRes = 0;
  // 4-bit resonance
  filterMode = 0;
  // LP/BP/HP/3off flags
  filterVoiceMask = 0;
  // which voices routed through filter
  volume = 15;
  // 4-bit master volume
  // Filter internal state (emulated as 2-pole state variable filter)
  filterLp = 0;
  filterBp = 0;
  filterHp = 0;
  constructor(sampleRate2) {
    this.sampleRate = sampleRate2;
    this.cyclesPerSample = this.clockRate / sampleRate2;
    for (let i = 0; i < 3; i++) {
      this.voices.push(new SIDVoiceState());
    }
  }
  writeRegister(reg, value) {
    if (reg < 0 || reg > 24) return;
    if (reg < 21) {
      const voiceIdx = Math.floor(reg / VOICE_OFFSET);
      const voiceReg = reg % VOICE_OFFSET;
      const voice = this.voices[voiceIdx];
      if (!voice) return;
      switch (voiceReg) {
        case 0:
          voice.freq = voice.freq & 65280 | value & 255;
          break;
        case 1:
          voice.freq = voice.freq & 255 | (value & 255) << 8;
          break;
        case 2:
          voice.pulseWidth = voice.pulseWidth & 3840 | value & 255;
          break;
        case 3:
          voice.pulseWidth = voice.pulseWidth & 255 | (value & 15) << 8;
          break;
        case 4:
          voice.control = value;
          voice.waveform = value >> 4 & 15;
          voice.prevGate = voice.gate;
          voice.gate = (value & 1) !== 0;
          if (voice.gate && !voice.prevGate) {
            voice.adsrState = ATTACK;
            voice.rateCounter = 0;
          } else if (!voice.gate && voice.prevGate) {
            voice.adsrState = RELEASE;
          }
          if (value & 8) {
            voice.phase = 0;
          }
          break;
        case 5:
          voice.attackRate = value >> 4 & 15;
          voice.decayRate = value & 15;
          break;
        case 6:
          voice.sustainLevel = (value >> 4 & 15) * 17;
          voice.releaseRate = value & 15;
          break;
      }
    } else {
      switch (reg) {
        case 21:
          this.filterFreq = this.filterFreq & 2040 | value & 7;
          break;
        case 22:
          this.filterFreq = this.filterFreq & 7 | (value & 255) << 3;
          break;
        case 23:
          this.filterRes = value >> 4 & 15;
          this.filterVoiceMask = value & 15;
          break;
        case 24:
          this.filterMode = value >> 4 & 15;
          this.volume = value & 15;
          break;
      }
    }
  }
  generateSample() {
    this.cycleAccumulator += this.cyclesPerSample;
    const cycles = Math.floor(this.cycleAccumulator);
    this.cycleAccumulator -= cycles;
    for (let c = 0; c < cycles; c++) {
      this.clockOneCycle();
    }
    let filtered = 0;
    let direct = 0;
    for (let i = 0; i < 3; i++) {
      const voice = this.voices[i];
      if (i === 2 && this.filterMode & 8) continue;
      const voiceOut = (voice.output - 128) / 128;
      if (this.filterVoiceMask & 1 << i) {
        filtered += voiceOut;
      } else {
        direct += voiceOut;
      }
    }
    const cutoff = this.calculateFilterCutoff();
    const resonance = 1 - this.filterRes / 17 * 0.85;
    this.filterHp = filtered - this.filterBp * resonance - this.filterLp;
    this.filterBp += cutoff * this.filterHp;
    this.filterLp += cutoff * this.filterBp;
    this.filterBp = Math.max(-1, Math.min(1, this.filterBp));
    this.filterLp = Math.max(-1, Math.min(1, this.filterLp));
    let filterOut = 0;
    if (this.filterMode & 1) filterOut += this.filterLp;
    if (this.filterMode & 2) filterOut += this.filterBp;
    if (this.filterMode & 4) filterOut += this.filterHp;
    if ((this.filterMode & 7) === 0) filterOut = filtered;
    const output = (filterOut + direct) * (this.volume / 15);
    return Math.max(-1, Math.min(1, output * 0.7));
  }
  clockOneCycle() {
    for (let i = 0; i < 3; i++) {
      const voice = this.voices[i];
      if (!(voice.control & 8)) {
        voice.phase = voice.phase + voice.freq & 16777215;
      }
      if (voice.phase & 524288 && !(voice.phase - voice.freq & 524288 & 16777215)) {
        const bit0 = (voice.lfsr >> 22 ^ voice.lfsr >> 17) & 1;
        voice.lfsr = (voice.lfsr << 1 | bit0) & 8388607;
        voice.noiseOutput = voice.lfsr >> 15 & 128 | voice.lfsr >> 12 & 64 | voice.lfsr >> 9 & 32 | voice.lfsr >> 6 & 16 | voice.lfsr >> 4 & 8 | voice.lfsr >> 2 & 4 | voice.lfsr >> 1 & 2 | voice.lfsr & 1;
      }
      let waveOut = 0;
      const phase12 = voice.phase >> 12 & 4095;
      if (voice.waveform & 8) {
        waveOut = voice.noiseOutput;
      } else {
        let tri = 0, saw = 0, pulse = 0;
        if (voice.waveform & 1) {
          let triPhase = phase12;
          if (voice.control & 4) {
            const prevVoice = this.voices[(i + 2) % 3];
            if (prevVoice.phase & 8388608) {
              triPhase ^= 4095;
            }
          }
          tri = triPhase & 2048 ? (triPhase ^ 4095) << 1 & 4094 : triPhase << 1 & 4094;
          tri = tri >> 4 & 255;
        }
        if (voice.waveform & 2) {
          saw = phase12 >> 4 & 255;
        }
        if (voice.waveform & 4) {
          pulse = phase12 >= voice.pulseWidth ? 255 : 0;
        }
        if (voice.waveform === 1) waveOut = tri;
        else if (voice.waveform === 2) waveOut = saw;
        else if (voice.waveform === 4) waveOut = pulse;
        else if (voice.waveform === 3) waveOut = tri & saw;
        else if (voice.waveform === 5) waveOut = tri & pulse;
        else if (voice.waveform === 6) waveOut = saw & pulse;
        else if (voice.waveform === 7) waveOut = tri & saw & pulse;
        else waveOut = 0;
      }
      this.clockEnvelope(voice);
      voice.output = waveOut * voice.envelope >> 8;
    }
  }
  clockEnvelope(voice) {
    voice.rateCounter++;
    let ratePeriod;
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
        return;
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
  calculateFilterCutoff() {
    const fc = this.filterFreq;
    const freq = 30 + fc / 2047 * (12e3 - 30);
    return 2 * Math.sin(Math.PI * freq / this.sampleRate);
  }
  reset() {
    for (const voice of this.voices) {
      voice.freq = 0;
      voice.pulseWidth = 2048;
      voice.waveform = 0;
      voice.control = 0;
      voice.phase = 0;
      voice.lfsr = 8388600;
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
};
var SIDWorkletProcessor = class extends AudioWorkletProcessor {
  sid;
  registerQueue = [];
  constructor() {
    super();
    this.sid = new SIDChipEmulator(sampleRate);
    this.port.onmessage = (event) => {
      const data = event.data;
      if (data.type === "write") {
        this.registerQueue.push({ reg: data.reg, value: data.value });
      } else if (data.type === "writeBatch") {
        for (const write of data.writes) {
          this.registerQueue.push(write);
        }
      } else if (data.type === "reset") {
        this.sid.reset();
        this.registerQueue = [];
      }
    };
  }
  process(_inputs, outputs, _parameters) {
    while (this.registerQueue.length > 0) {
      const { reg, value } = this.registerQueue.shift();
      this.sid.writeRegister(reg, value);
    }
    const output = outputs[0];
    if (!output || !output[0]) return true;
    const channel = output[0];
    for (let i = 0; i < channel.length; i++) {
      channel[i] = this.sid.generateSample();
    }
    for (let ch = 1; ch < output.length; ch++) {
      output[ch].set(channel);
    }
    return true;
  }
};
registerProcessor("sid-worklet-processor", SIDWorkletProcessor);
