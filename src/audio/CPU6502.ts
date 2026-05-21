/**
 * Minimal MOS 6502 CPU Emulator for SID playback
 * Implements all official opcodes needed to run C64 SID player routines.
 * Memory-mapped I/O at $D400-$D418 captures SID register writes.
 */

export type SIDWriteCallback = (reg: number, value: number) => void;

export class CPU6502 {
  // Registers
  a = 0;   // Accumulator
  x = 0;   // X index
  y = 0;   // Y index
  sp = 0xFF; // Stack pointer
  pc = 0;  // Program counter

  // Status flags
  flagC = false; // Carry
  flagZ = false; // Zero
  flagI = true;  // Interrupt disable
  flagD = false; // Decimal mode
  flagB = false; // Break
  flagV = false; // Overflow
  flagN = false; // Negative

  // 64K address space
  memory = new Uint8Array(65536);

  // SID register write callback
  onSIDWrite: SIDWriteCallback | null = null;

  // Cycle counter
  cycles = 0;

  reset(): void {
    this.a = 0;
    this.x = 0;
    this.y = 0;
    this.sp = 0xFF;
    this.flagC = false;
    this.flagZ = false;
    this.flagI = true;
    this.flagD = false;
    this.flagB = false;
    this.flagV = false;
    this.flagN = false;
    this.cycles = 0;
  }

  private read(addr: number): number {
    return this.memory[addr & 0xFFFF];
  }

  private write(addr: number, value: number): void {
    addr &= 0xFFFF;
    value &= 0xFF;

    // Intercept SID register writes ($D400-$D418)
    if (addr >= 0xD400 && addr <= 0xD418) {
      if (this.onSIDWrite) {
        this.onSIDWrite(addr - 0xD400, value);
      }
    }

    this.memory[addr] = value;
  }

  private read16(addr: number): number {
    return this.read(addr) | (this.read((addr + 1) & 0xFFFF) << 8);
  }

  private push(value: number): void {
    this.memory[0x0100 + this.sp] = value & 0xFF;
    this.sp = (this.sp - 1) & 0xFF;
  }

  private pull(): number {
    this.sp = (this.sp + 1) & 0xFF;
    return this.memory[0x0100 + this.sp];
  }

  private setNZ(value: number): void {
    this.flagN = (value & 0x80) !== 0;
    this.flagZ = (value & 0xFF) === 0;
  }

  private getStatus(): number {
    return (
      (this.flagC ? 0x01 : 0) |
      (this.flagZ ? 0x02 : 0) |
      (this.flagI ? 0x04 : 0) |
      (this.flagD ? 0x08 : 0) |
      (this.flagB ? 0x10 : 0) |
      0x20 | // unused, always 1
      (this.flagV ? 0x40 : 0) |
      (this.flagN ? 0x80 : 0)
    );
  }

  private setStatus(value: number): void {
    this.flagC = (value & 0x01) !== 0;
    this.flagZ = (value & 0x02) !== 0;
    this.flagI = (value & 0x04) !== 0;
    this.flagD = (value & 0x08) !== 0;
    this.flagB = (value & 0x10) !== 0;
    this.flagV = (value & 0x40) !== 0;
    this.flagN = (value & 0x80) !== 0;
  }

  // Addressing modes
  private addrImm(): number { return this.pc++; }
  private addrZP(): number { return this.read(this.pc++); }
  private addrZPX(): number { return (this.read(this.pc++) + this.x) & 0xFF; }
  private addrZPY(): number { return (this.read(this.pc++) + this.y) & 0xFF; }
  private addrAbs(): number { const lo = this.read(this.pc++); return lo | (this.read(this.pc++) << 8); }
  private addrAbsX(): number { const lo = this.read(this.pc++); return ((lo | (this.read(this.pc++) << 8)) + this.x) & 0xFFFF; }
  private addrAbsY(): number { const lo = this.read(this.pc++); return ((lo | (this.read(this.pc++) << 8)) + this.y) & 0xFFFF; }
  private addrIndX(): number {
    const zp = (this.read(this.pc++) + this.x) & 0xFF;
    return this.read(zp) | (this.read((zp + 1) & 0xFF) << 8);
  }
  private addrIndY(): number {
    const zp = this.read(this.pc++);
    return ((this.read(zp) | (this.read((zp + 1) & 0xFF) << 8)) + this.y) & 0xFFFF;
  }

  private adc(value: number): void {
    if (this.flagD) {
      // Decimal mode
      let lo = (this.a & 0x0F) + (value & 0x0F) + (this.flagC ? 1 : 0);
      let hi = (this.a >> 4) + (value >> 4);
      if (lo > 9) { lo -= 10; hi++; }
      if (hi > 9) { hi -= 10; this.flagC = true; } else { this.flagC = false; }
      const result = ((hi << 4) | (lo & 0x0F)) & 0xFF;
      this.flagZ = result === 0;
      this.flagN = (result & 0x80) !== 0;
      this.flagV = false;
      this.a = result;
    } else {
      const result = this.a + value + (this.flagC ? 1 : 0);
      this.flagC = result > 0xFF;
      this.flagV = (~(this.a ^ value) & (this.a ^ result) & 0x80) !== 0;
      this.a = result & 0xFF;
      this.setNZ(this.a);
    }
  }

  private sbc(value: number): void {
    if (this.flagD) {
      let lo = (this.a & 0x0F) - (value & 0x0F) - (this.flagC ? 0 : 1);
      let hi = (this.a >> 4) - (value >> 4);
      if (lo < 0) { lo += 10; hi--; }
      if (hi < 0) { hi += 10; this.flagC = false; } else { this.flagC = true; }
      const result = ((hi << 4) | (lo & 0x0F)) & 0xFF;
      this.flagZ = result === 0;
      this.flagN = (result & 0x80) !== 0;
      this.flagV = false;
      this.a = result;
    } else {
      const result = this.a - value - (this.flagC ? 0 : 1);
      this.flagC = result >= 0;
      this.flagV = ((this.a ^ value) & (this.a ^ result) & 0x80) !== 0;
      this.a = result & 0xFF;
      this.setNZ(this.a);
    }
  }

  private branch(condition: boolean): void {
    const offset = this.read(this.pc++);
    if (condition) {
      const rel = offset < 0x80 ? offset : offset - 256;
      this.pc = (this.pc + rel) & 0xFFFF;
      this.cycles += 1;
    }
  }

  /** Execute one instruction. Returns cycles consumed. */
  step(): number {
    const startCycles = this.cycles;
    const opcode = this.read(this.pc++);

    switch (opcode) {
      // LDA
      case 0xA9: this.a = this.read(this.addrImm()); this.setNZ(this.a); this.cycles += 2; break;
      case 0xA5: this.a = this.read(this.addrZP()); this.setNZ(this.a); this.cycles += 3; break;
      case 0xB5: this.a = this.read(this.addrZPX()); this.setNZ(this.a); this.cycles += 4; break;
      case 0xAD: this.a = this.read(this.addrAbs()); this.setNZ(this.a); this.cycles += 4; break;
      case 0xBD: this.a = this.read(this.addrAbsX()); this.setNZ(this.a); this.cycles += 4; break;
      case 0xB9: this.a = this.read(this.addrAbsY()); this.setNZ(this.a); this.cycles += 4; break;
      case 0xA1: this.a = this.read(this.addrIndX()); this.setNZ(this.a); this.cycles += 6; break;
      case 0xB1: this.a = this.read(this.addrIndY()); this.setNZ(this.a); this.cycles += 5; break;

      // LDX
      case 0xA2: this.x = this.read(this.addrImm()); this.setNZ(this.x); this.cycles += 2; break;
      case 0xA6: this.x = this.read(this.addrZP()); this.setNZ(this.x); this.cycles += 3; break;
      case 0xB6: this.x = this.read(this.addrZPY()); this.setNZ(this.x); this.cycles += 4; break;
      case 0xAE: this.x = this.read(this.addrAbs()); this.setNZ(this.x); this.cycles += 4; break;
      case 0xBE: this.x = this.read(this.addrAbsY()); this.setNZ(this.x); this.cycles += 4; break;

      // LDY
      case 0xA0: this.y = this.read(this.addrImm()); this.setNZ(this.y); this.cycles += 2; break;
      case 0xA4: this.y = this.read(this.addrZP()); this.setNZ(this.y); this.cycles += 3; break;
      case 0xB4: this.y = this.read(this.addrZPX()); this.setNZ(this.y); this.cycles += 4; break;
      case 0xAC: this.y = this.read(this.addrAbs()); this.setNZ(this.y); this.cycles += 4; break;
      case 0xBC: this.y = this.read(this.addrAbsX()); this.setNZ(this.y); this.cycles += 4; break;

      // STA
      case 0x85: this.write(this.addrZP(), this.a); this.cycles += 3; break;
      case 0x95: this.write(this.addrZPX(), this.a); this.cycles += 4; break;
      case 0x8D: this.write(this.addrAbs(), this.a); this.cycles += 4; break;
      case 0x9D: this.write(this.addrAbsX(), this.a); this.cycles += 5; break;
      case 0x99: this.write(this.addrAbsY(), this.a); this.cycles += 5; break;
      case 0x81: this.write(this.addrIndX(), this.a); this.cycles += 6; break;
      case 0x91: this.write(this.addrIndY(), this.a); this.cycles += 6; break;

      // STX
      case 0x86: this.write(this.addrZP(), this.x); this.cycles += 3; break;
      case 0x96: this.write(this.addrZPY(), this.x); this.cycles += 4; break;
      case 0x8E: this.write(this.addrAbs(), this.x); this.cycles += 4; break;

      // STY
      case 0x84: this.write(this.addrZP(), this.y); this.cycles += 3; break;
      case 0x94: this.write(this.addrZPX(), this.y); this.cycles += 4; break;
      case 0x8C: this.write(this.addrAbs(), this.y); this.cycles += 4; break;

      // ADC
      case 0x69: this.adc(this.read(this.addrImm())); this.cycles += 2; break;
      case 0x65: this.adc(this.read(this.addrZP())); this.cycles += 3; break;
      case 0x75: this.adc(this.read(this.addrZPX())); this.cycles += 4; break;
      case 0x6D: this.adc(this.read(this.addrAbs())); this.cycles += 4; break;
      case 0x7D: this.adc(this.read(this.addrAbsX())); this.cycles += 4; break;
      case 0x79: this.adc(this.read(this.addrAbsY())); this.cycles += 4; break;
      case 0x61: this.adc(this.read(this.addrIndX())); this.cycles += 6; break;
      case 0x71: this.adc(this.read(this.addrIndY())); this.cycles += 5; break;

      // SBC
      case 0xE9: this.sbc(this.read(this.addrImm())); this.cycles += 2; break;
      case 0xE5: this.sbc(this.read(this.addrZP())); this.cycles += 3; break;
      case 0xF5: this.sbc(this.read(this.addrZPX())); this.cycles += 4; break;
      case 0xED: this.sbc(this.read(this.addrAbs())); this.cycles += 4; break;
      case 0xFD: this.sbc(this.read(this.addrAbsX())); this.cycles += 4; break;
      case 0xF9: this.sbc(this.read(this.addrAbsY())); this.cycles += 4; break;
      case 0xE1: this.sbc(this.read(this.addrIndX())); this.cycles += 6; break;
      case 0xF1: this.sbc(this.read(this.addrIndY())); this.cycles += 5; break;

      // AND
      case 0x29: this.a &= this.read(this.addrImm()); this.setNZ(this.a); this.cycles += 2; break;
      case 0x25: this.a &= this.read(this.addrZP()); this.setNZ(this.a); this.cycles += 3; break;
      case 0x35: this.a &= this.read(this.addrZPX()); this.setNZ(this.a); this.cycles += 4; break;
      case 0x2D: this.a &= this.read(this.addrAbs()); this.setNZ(this.a); this.cycles += 4; break;
      case 0x3D: this.a &= this.read(this.addrAbsX()); this.setNZ(this.a); this.cycles += 4; break;
      case 0x39: this.a &= this.read(this.addrAbsY()); this.setNZ(this.a); this.cycles += 4; break;
      case 0x21: this.a &= this.read(this.addrIndX()); this.setNZ(this.a); this.cycles += 6; break;
      case 0x31: this.a &= this.read(this.addrIndY()); this.setNZ(this.a); this.cycles += 5; break;

      // ORA
      case 0x09: this.a |= this.read(this.addrImm()); this.setNZ(this.a); this.cycles += 2; break;
      case 0x05: this.a |= this.read(this.addrZP()); this.setNZ(this.a); this.cycles += 3; break;
      case 0x15: this.a |= this.read(this.addrZPX()); this.setNZ(this.a); this.cycles += 4; break;
      case 0x0D: this.a |= this.read(this.addrAbs()); this.setNZ(this.a); this.cycles += 4; break;
      case 0x1D: this.a |= this.read(this.addrAbsX()); this.setNZ(this.a); this.cycles += 4; break;
      case 0x19: this.a |= this.read(this.addrAbsY()); this.setNZ(this.a); this.cycles += 4; break;
      case 0x01: this.a |= this.read(this.addrIndX()); this.setNZ(this.a); this.cycles += 6; break;
      case 0x11: this.a |= this.read(this.addrIndY()); this.setNZ(this.a); this.cycles += 5; break;

      // EOR
      case 0x49: this.a ^= this.read(this.addrImm()); this.setNZ(this.a); this.cycles += 2; break;
      case 0x45: this.a ^= this.read(this.addrZP()); this.setNZ(this.a); this.cycles += 3; break;
      case 0x55: this.a ^= this.read(this.addrZPX()); this.setNZ(this.a); this.cycles += 4; break;
      case 0x4D: this.a ^= this.read(this.addrAbs()); this.setNZ(this.a); this.cycles += 4; break;
      case 0x5D: this.a ^= this.read(this.addrAbsX()); this.setNZ(this.a); this.cycles += 4; break;
      case 0x59: this.a ^= this.read(this.addrAbsY()); this.setNZ(this.a); this.cycles += 4; break;
      case 0x41: this.a ^= this.read(this.addrIndX()); this.setNZ(this.a); this.cycles += 6; break;
      case 0x51: this.a ^= this.read(this.addrIndY()); this.setNZ(this.a); this.cycles += 5; break;

      // CMP
      case 0xC9: { const v = this.read(this.addrImm()); this.flagC = this.a >= v; this.setNZ((this.a - v) & 0xFF); this.cycles += 2; break; }
      case 0xC5: { const v = this.read(this.addrZP()); this.flagC = this.a >= v; this.setNZ((this.a - v) & 0xFF); this.cycles += 3; break; }
      case 0xD5: { const v = this.read(this.addrZPX()); this.flagC = this.a >= v; this.setNZ((this.a - v) & 0xFF); this.cycles += 4; break; }
      case 0xCD: { const v = this.read(this.addrAbs()); this.flagC = this.a >= v; this.setNZ((this.a - v) & 0xFF); this.cycles += 4; break; }
      case 0xDD: { const v = this.read(this.addrAbsX()); this.flagC = this.a >= v; this.setNZ((this.a - v) & 0xFF); this.cycles += 4; break; }
      case 0xD9: { const v = this.read(this.addrAbsY()); this.flagC = this.a >= v; this.setNZ((this.a - v) & 0xFF); this.cycles += 4; break; }
      case 0xC1: { const v = this.read(this.addrIndX()); this.flagC = this.a >= v; this.setNZ((this.a - v) & 0xFF); this.cycles += 6; break; }
      case 0xD1: { const v = this.read(this.addrIndY()); this.flagC = this.a >= v; this.setNZ((this.a - v) & 0xFF); this.cycles += 5; break; }

      // CPX
      case 0xE0: { const v = this.read(this.addrImm()); this.flagC = this.x >= v; this.setNZ((this.x - v) & 0xFF); this.cycles += 2; break; }
      case 0xE4: { const v = this.read(this.addrZP()); this.flagC = this.x >= v; this.setNZ((this.x - v) & 0xFF); this.cycles += 3; break; }
      case 0xEC: { const v = this.read(this.addrAbs()); this.flagC = this.x >= v; this.setNZ((this.x - v) & 0xFF); this.cycles += 4; break; }

      // CPY
      case 0xC0: { const v = this.read(this.addrImm()); this.flagC = this.y >= v; this.setNZ((this.y - v) & 0xFF); this.cycles += 2; break; }
      case 0xC4: { const v = this.read(this.addrZP()); this.flagC = this.y >= v; this.setNZ((this.y - v) & 0xFF); this.cycles += 3; break; }
      case 0xCC: { const v = this.read(this.addrAbs()); this.flagC = this.y >= v; this.setNZ((this.y - v) & 0xFF); this.cycles += 4; break; }

      // INC
      case 0xE6: { const a = this.addrZP(); const v = (this.read(a) + 1) & 0xFF; this.write(a, v); this.setNZ(v); this.cycles += 5; break; }
      case 0xF6: { const a = this.addrZPX(); const v = (this.read(a) + 1) & 0xFF; this.write(a, v); this.setNZ(v); this.cycles += 6; break; }
      case 0xEE: { const a = this.addrAbs(); const v = (this.read(a) + 1) & 0xFF; this.write(a, v); this.setNZ(v); this.cycles += 6; break; }
      case 0xFE: { const a = this.addrAbsX(); const v = (this.read(a) + 1) & 0xFF; this.write(a, v); this.setNZ(v); this.cycles += 7; break; }

      // DEC
      case 0xC6: { const a = this.addrZP(); const v = (this.read(a) - 1) & 0xFF; this.write(a, v); this.setNZ(v); this.cycles += 5; break; }
      case 0xD6: { const a = this.addrZPX(); const v = (this.read(a) - 1) & 0xFF; this.write(a, v); this.setNZ(v); this.cycles += 6; break; }
      case 0xCE: { const a = this.addrAbs(); const v = (this.read(a) - 1) & 0xFF; this.write(a, v); this.setNZ(v); this.cycles += 6; break; }
      case 0xDE: { const a = this.addrAbsX(); const v = (this.read(a) - 1) & 0xFF; this.write(a, v); this.setNZ(v); this.cycles += 7; break; }

      // INX, INY, DEX, DEY
      case 0xE8: this.x = (this.x + 1) & 0xFF; this.setNZ(this.x); this.cycles += 2; break;
      case 0xC8: this.y = (this.y + 1) & 0xFF; this.setNZ(this.y); this.cycles += 2; break;
      case 0xCA: this.x = (this.x - 1) & 0xFF; this.setNZ(this.x); this.cycles += 2; break;
      case 0x88: this.y = (this.y - 1) & 0xFF; this.setNZ(this.y); this.cycles += 2; break;

      // ASL
      case 0x0A: this.flagC = (this.a & 0x80) !== 0; this.a = (this.a << 1) & 0xFF; this.setNZ(this.a); this.cycles += 2; break;
      case 0x06: { const a = this.addrZP(); let v = this.read(a); this.flagC = (v & 0x80) !== 0; v = (v << 1) & 0xFF; this.write(a, v); this.setNZ(v); this.cycles += 5; break; }
      case 0x16: { const a = this.addrZPX(); let v = this.read(a); this.flagC = (v & 0x80) !== 0; v = (v << 1) & 0xFF; this.write(a, v); this.setNZ(v); this.cycles += 6; break; }
      case 0x0E: { const a = this.addrAbs(); let v = this.read(a); this.flagC = (v & 0x80) !== 0; v = (v << 1) & 0xFF; this.write(a, v); this.setNZ(v); this.cycles += 6; break; }
      case 0x1E: { const a = this.addrAbsX(); let v = this.read(a); this.flagC = (v & 0x80) !== 0; v = (v << 1) & 0xFF; this.write(a, v); this.setNZ(v); this.cycles += 7; break; }

      // LSR
      case 0x4A: this.flagC = (this.a & 0x01) !== 0; this.a >>= 1; this.setNZ(this.a); this.cycles += 2; break;
      case 0x46: { const a = this.addrZP(); let v = this.read(a); this.flagC = (v & 0x01) !== 0; v >>= 1; this.write(a, v); this.setNZ(v); this.cycles += 5; break; }
      case 0x56: { const a = this.addrZPX(); let v = this.read(a); this.flagC = (v & 0x01) !== 0; v >>= 1; this.write(a, v); this.setNZ(v); this.cycles += 6; break; }
      case 0x4E: { const a = this.addrAbs(); let v = this.read(a); this.flagC = (v & 0x01) !== 0; v >>= 1; this.write(a, v); this.setNZ(v); this.cycles += 6; break; }
      case 0x5E: { const a = this.addrAbsX(); let v = this.read(a); this.flagC = (v & 0x01) !== 0; v >>= 1; this.write(a, v); this.setNZ(v); this.cycles += 7; break; }

      // ROL
      case 0x2A: { const c = this.flagC ? 1 : 0; this.flagC = (this.a & 0x80) !== 0; this.a = ((this.a << 1) | c) & 0xFF; this.setNZ(this.a); this.cycles += 2; break; }
      case 0x26: { const a = this.addrZP(); let v = this.read(a); const c = this.flagC ? 1 : 0; this.flagC = (v & 0x80) !== 0; v = ((v << 1) | c) & 0xFF; this.write(a, v); this.setNZ(v); this.cycles += 5; break; }
      case 0x36: { const a = this.addrZPX(); let v = this.read(a); const c = this.flagC ? 1 : 0; this.flagC = (v & 0x80) !== 0; v = ((v << 1) | c) & 0xFF; this.write(a, v); this.setNZ(v); this.cycles += 6; break; }
      case 0x2E: { const a = this.addrAbs(); let v = this.read(a); const c = this.flagC ? 1 : 0; this.flagC = (v & 0x80) !== 0; v = ((v << 1) | c) & 0xFF; this.write(a, v); this.setNZ(v); this.cycles += 6; break; }
      case 0x3E: { const a = this.addrAbsX(); let v = this.read(a); const c = this.flagC ? 1 : 0; this.flagC = (v & 0x80) !== 0; v = ((v << 1) | c) & 0xFF; this.write(a, v); this.setNZ(v); this.cycles += 7; break; }

      // ROR
      case 0x6A: { const c = this.flagC ? 0x80 : 0; this.flagC = (this.a & 0x01) !== 0; this.a = (this.a >> 1) | c; this.setNZ(this.a); this.cycles += 2; break; }
      case 0x66: { const a = this.addrZP(); let v = this.read(a); const c = this.flagC ? 0x80 : 0; this.flagC = (v & 0x01) !== 0; v = (v >> 1) | c; this.write(a, v); this.setNZ(v); this.cycles += 5; break; }
      case 0x76: { const a = this.addrZPX(); let v = this.read(a); const c = this.flagC ? 0x80 : 0; this.flagC = (v & 0x01) !== 0; v = (v >> 1) | c; this.write(a, v); this.setNZ(v); this.cycles += 6; break; }
      case 0x6E: { const a = this.addrAbs(); let v = this.read(a); const c = this.flagC ? 0x80 : 0; this.flagC = (v & 0x01) !== 0; v = (v >> 1) | c; this.write(a, v); this.setNZ(v); this.cycles += 6; break; }
      case 0x7E: { const a = this.addrAbsX(); let v = this.read(a); const c = this.flagC ? 0x80 : 0; this.flagC = (v & 0x01) !== 0; v = (v >> 1) | c; this.write(a, v); this.setNZ(v); this.cycles += 7; break; }

      // BIT
      case 0x24: { const v = this.read(this.addrZP()); this.flagN = (v & 0x80) !== 0; this.flagV = (v & 0x40) !== 0; this.flagZ = (this.a & v) === 0; this.cycles += 3; break; }
      case 0x2C: { const v = this.read(this.addrAbs()); this.flagN = (v & 0x80) !== 0; this.flagV = (v & 0x40) !== 0; this.flagZ = (this.a & v) === 0; this.cycles += 4; break; }

      // Branches
      case 0x10: this.branch(!this.flagN); this.cycles += 2; break; // BPL
      case 0x30: this.branch(this.flagN); this.cycles += 2; break;  // BMI
      case 0x50: this.branch(!this.flagV); this.cycles += 2; break; // BVC
      case 0x70: this.branch(this.flagV); this.cycles += 2; break;  // BVS
      case 0x90: this.branch(!this.flagC); this.cycles += 2; break; // BCC
      case 0xB0: this.branch(this.flagC); this.cycles += 2; break;  // BCS
      case 0xD0: this.branch(!this.flagZ); this.cycles += 2; break; // BNE
      case 0xF0: this.branch(this.flagZ); this.cycles += 2; break;  // BEQ

      // JMP
      case 0x4C: this.pc = this.addrAbs(); this.cycles += 3; break;
      case 0x6C: {
        // Indirect — with 6502 page-crossing bug
        const lo = this.read(this.pc++);
        const hi = this.read(this.pc++);
        const addr = lo | (hi << 8);
        const addrHi = (lo === 0xFF) ? (hi << 8) : (addr + 1); // Page wrap bug
        this.pc = this.read(addr) | (this.read(addrHi) << 8);
        this.cycles += 5;
        break;
      }

      // JSR / RTS
      case 0x20: {
        const target = this.addrAbs();
        this.push(((this.pc - 1) >> 8) & 0xFF);
        this.push((this.pc - 1) & 0xFF);
        this.pc = target;
        this.cycles += 6;
        break;
      }
      case 0x60: {
        const lo = this.pull();
        const hi = this.pull();
        this.pc = ((lo | (hi << 8)) + 1) & 0xFFFF;
        this.cycles += 6;
        break;
      }

      // RTI
      case 0x40: {
        this.setStatus(this.pull());
        const lo = this.pull();
        const hi = this.pull();
        this.pc = lo | (hi << 8);
        this.cycles += 6;
        break;
      }

      // Stack
      case 0x48: this.push(this.a); this.cycles += 3; break;           // PHA
      case 0x68: this.a = this.pull(); this.setNZ(this.a); this.cycles += 4; break; // PLA
      case 0x08: this.push(this.getStatus() | 0x10); this.cycles += 3; break; // PHP
      case 0x28: this.setStatus(this.pull()); this.cycles += 4; break; // PLP

      // Transfers
      case 0xAA: this.x = this.a; this.setNZ(this.x); this.cycles += 2; break; // TAX
      case 0xA8: this.y = this.a; this.setNZ(this.y); this.cycles += 2; break; // TAY
      case 0x8A: this.a = this.x; this.setNZ(this.a); this.cycles += 2; break; // TXA
      case 0x98: this.a = this.y; this.setNZ(this.a); this.cycles += 2; break; // TYA
      case 0xBA: this.x = this.sp; this.setNZ(this.x); this.cycles += 2; break; // TSX
      case 0x9A: this.sp = this.x; this.cycles += 2; break;           // TXS

      // Flags
      case 0x18: this.flagC = false; this.cycles += 2; break; // CLC
      case 0x38: this.flagC = true; this.cycles += 2; break;  // SEC
      case 0x58: this.flagI = false; this.cycles += 2; break; // CLI
      case 0x78: this.flagI = true; this.cycles += 2; break;  // SEI
      case 0xD8: this.flagD = false; this.cycles += 2; break; // CLD
      case 0xF8: this.flagD = true; this.cycles += 2; break;  // SED
      case 0xB8: this.flagV = false; this.cycles += 2; break; // CLV

      // NOP
      case 0xEA: this.cycles += 2; break;

      // BRK
      case 0x00: {
        this.pc++;
        this.push((this.pc >> 8) & 0xFF);
        this.push(this.pc & 0xFF);
        this.push(this.getStatus() | 0x10);
        this.flagI = true;
        this.pc = this.read16(0xFFFE);
        this.cycles += 7;
        break;
      }

      // Illegal/undocumented NOPs (common in SID tunes)
      case 0x1A: case 0x3A: case 0x5A: case 0x7A: case 0xDA: case 0xFA:
        this.cycles += 2; break; // 1-byte NOPs
      case 0x04: case 0x14: case 0x34: case 0x44: case 0x54: case 0x64:
      case 0x74: case 0x80: case 0x82: case 0x89: case 0xC2: case 0xD4:
      case 0xE2: case 0xF4:
        this.pc++; this.cycles += 3; break; // 2-byte NOPs
      case 0x0C: case 0x1C: case 0x3C: case 0x5C: case 0x7C: case 0xDC: case 0xFC:
        this.pc += 2; this.cycles += 4; break; // 3-byte NOPs

      // Common illegal opcodes used in SID tunes
      // LAX (LDA + TAX)
      case 0xA7: { const v = this.read(this.addrZP()); this.a = v; this.x = v; this.setNZ(v); this.cycles += 3; break; }
      case 0xB7: { const v = this.read(this.addrZPY()); this.a = v; this.x = v; this.setNZ(v); this.cycles += 4; break; }
      case 0xAF: { const v = this.read(this.addrAbs()); this.a = v; this.x = v; this.setNZ(v); this.cycles += 4; break; }
      case 0xBF: { const v = this.read(this.addrAbsY()); this.a = v; this.x = v; this.setNZ(v); this.cycles += 4; break; }
      case 0xA3: { const v = this.read(this.addrIndX()); this.a = v; this.x = v; this.setNZ(v); this.cycles += 6; break; }
      case 0xB3: { const v = this.read(this.addrIndY()); this.a = v; this.x = v; this.setNZ(v); this.cycles += 5; break; }

      // SAX (STA & STX)
      case 0x87: this.write(this.addrZP(), this.a & this.x); this.cycles += 3; break;
      case 0x97: this.write(this.addrZPY(), this.a & this.x); this.cycles += 4; break;
      case 0x8F: this.write(this.addrAbs(), this.a & this.x); this.cycles += 4; break;
      case 0x83: this.write(this.addrIndX(), this.a & this.x); this.cycles += 6; break;

      // DCP (DEC + CMP)
      case 0xC7: { const a = this.addrZP(); const v = (this.read(a) - 1) & 0xFF; this.write(a, v); this.flagC = this.a >= v; this.setNZ((this.a - v) & 0xFF); this.cycles += 5; break; }
      case 0xD7: { const a = this.addrZPX(); const v = (this.read(a) - 1) & 0xFF; this.write(a, v); this.flagC = this.a >= v; this.setNZ((this.a - v) & 0xFF); this.cycles += 6; break; }
      case 0xCF: { const a = this.addrAbs(); const v = (this.read(a) - 1) & 0xFF; this.write(a, v); this.flagC = this.a >= v; this.setNZ((this.a - v) & 0xFF); this.cycles += 6; break; }
      case 0xDF: { const a = this.addrAbsX(); const v = (this.read(a) - 1) & 0xFF; this.write(a, v); this.flagC = this.a >= v; this.setNZ((this.a - v) & 0xFF); this.cycles += 7; break; }
      case 0xDB: { const a = this.addrAbsY(); const v = (this.read(a) - 1) & 0xFF; this.write(a, v); this.flagC = this.a >= v; this.setNZ((this.a - v) & 0xFF); this.cycles += 7; break; }
      case 0xC3: { const a = this.addrIndX(); const v = (this.read(a) - 1) & 0xFF; this.write(a, v); this.flagC = this.a >= v; this.setNZ((this.a - v) & 0xFF); this.cycles += 8; break; }
      case 0xD3: { const a = this.addrIndY(); const v = (this.read(a) - 1) & 0xFF; this.write(a, v); this.flagC = this.a >= v; this.setNZ((this.a - v) & 0xFF); this.cycles += 8; break; }

      // ISC/ISB (INC + SBC)
      case 0xE7: { const a = this.addrZP(); const v = (this.read(a) + 1) & 0xFF; this.write(a, v); this.sbc(v); this.cycles += 5; break; }
      case 0xF7: { const a = this.addrZPX(); const v = (this.read(a) + 1) & 0xFF; this.write(a, v); this.sbc(v); this.cycles += 6; break; }
      case 0xEF: { const a = this.addrAbs(); const v = (this.read(a) + 1) & 0xFF; this.write(a, v); this.sbc(v); this.cycles += 6; break; }
      case 0xFF: { const a = this.addrAbsX(); const v = (this.read(a) + 1) & 0xFF; this.write(a, v); this.sbc(v); this.cycles += 7; break; }
      case 0xFB: { const a = this.addrAbsY(); const v = (this.read(a) + 1) & 0xFF; this.write(a, v); this.sbc(v); this.cycles += 7; break; }
      case 0xE3: { const a = this.addrIndX(); const v = (this.read(a) + 1) & 0xFF; this.write(a, v); this.sbc(v); this.cycles += 8; break; }
      case 0xF3: { const a = this.addrIndY(); const v = (this.read(a) + 1) & 0xFF; this.write(a, v); this.sbc(v); this.cycles += 8; break; }

      // SLO (ASL + ORA)
      case 0x07: { const a = this.addrZP(); let v = this.read(a); this.flagC = (v & 0x80) !== 0; v = (v << 1) & 0xFF; this.write(a, v); this.a |= v; this.setNZ(this.a); this.cycles += 5; break; }
      case 0x17: { const a = this.addrZPX(); let v = this.read(a); this.flagC = (v & 0x80) !== 0; v = (v << 1) & 0xFF; this.write(a, v); this.a |= v; this.setNZ(this.a); this.cycles += 6; break; }
      case 0x0F: { const a = this.addrAbs(); let v = this.read(a); this.flagC = (v & 0x80) !== 0; v = (v << 1) & 0xFF; this.write(a, v); this.a |= v; this.setNZ(this.a); this.cycles += 6; break; }
      case 0x1F: { const a = this.addrAbsX(); let v = this.read(a); this.flagC = (v & 0x80) !== 0; v = (v << 1) & 0xFF; this.write(a, v); this.a |= v; this.setNZ(this.a); this.cycles += 7; break; }
      case 0x1B: { const a = this.addrAbsY(); let v = this.read(a); this.flagC = (v & 0x80) !== 0; v = (v << 1) & 0xFF; this.write(a, v); this.a |= v; this.setNZ(this.a); this.cycles += 7; break; }
      case 0x03: { const a = this.addrIndX(); let v = this.read(a); this.flagC = (v & 0x80) !== 0; v = (v << 1) & 0xFF; this.write(a, v); this.a |= v; this.setNZ(this.a); this.cycles += 8; break; }
      case 0x13: { const a = this.addrIndY(); let v = this.read(a); this.flagC = (v & 0x80) !== 0; v = (v << 1) & 0xFF; this.write(a, v); this.a |= v; this.setNZ(this.a); this.cycles += 8; break; }

      // RLA (ROL + AND)
      case 0x27: { const a = this.addrZP(); let v = this.read(a); const c = this.flagC ? 1 : 0; this.flagC = (v & 0x80) !== 0; v = ((v << 1) | c) & 0xFF; this.write(a, v); this.a &= v; this.setNZ(this.a); this.cycles += 5; break; }
      case 0x37: { const a = this.addrZPX(); let v = this.read(a); const c = this.flagC ? 1 : 0; this.flagC = (v & 0x80) !== 0; v = ((v << 1) | c) & 0xFF; this.write(a, v); this.a &= v; this.setNZ(this.a); this.cycles += 6; break; }
      case 0x2F: { const a = this.addrAbs(); let v = this.read(a); const c = this.flagC ? 1 : 0; this.flagC = (v & 0x80) !== 0; v = ((v << 1) | c) & 0xFF; this.write(a, v); this.a &= v; this.setNZ(this.a); this.cycles += 6; break; }
      case 0x3F: { const a = this.addrAbsX(); let v = this.read(a); const c = this.flagC ? 1 : 0; this.flagC = (v & 0x80) !== 0; v = ((v << 1) | c) & 0xFF; this.write(a, v); this.a &= v; this.setNZ(this.a); this.cycles += 7; break; }
      case 0x3B: { const a = this.addrAbsY(); let v = this.read(a); const c = this.flagC ? 1 : 0; this.flagC = (v & 0x80) !== 0; v = ((v << 1) | c) & 0xFF; this.write(a, v); this.a &= v; this.setNZ(this.a); this.cycles += 7; break; }
      case 0x23: { const a = this.addrIndX(); let v = this.read(a); const c = this.flagC ? 1 : 0; this.flagC = (v & 0x80) !== 0; v = ((v << 1) | c) & 0xFF; this.write(a, v); this.a &= v; this.setNZ(this.a); this.cycles += 8; break; }
      case 0x33: { const a = this.addrIndY(); let v = this.read(a); const c = this.flagC ? 1 : 0; this.flagC = (v & 0x80) !== 0; v = ((v << 1) | c) & 0xFF; this.write(a, v); this.a &= v; this.setNZ(this.a); this.cycles += 8; break; }

      // SRE (LSR + EOR)
      case 0x47: { const a = this.addrZP(); let v = this.read(a); this.flagC = (v & 0x01) !== 0; v >>= 1; this.write(a, v); this.a ^= v; this.setNZ(this.a); this.cycles += 5; break; }
      case 0x57: { const a = this.addrZPX(); let v = this.read(a); this.flagC = (v & 0x01) !== 0; v >>= 1; this.write(a, v); this.a ^= v; this.setNZ(this.a); this.cycles += 6; break; }
      case 0x4F: { const a = this.addrAbs(); let v = this.read(a); this.flagC = (v & 0x01) !== 0; v >>= 1; this.write(a, v); this.a ^= v; this.setNZ(this.a); this.cycles += 6; break; }
      case 0x5F: { const a = this.addrAbsX(); let v = this.read(a); this.flagC = (v & 0x01) !== 0; v >>= 1; this.write(a, v); this.a ^= v; this.setNZ(this.a); this.cycles += 7; break; }
      case 0x5B: { const a = this.addrAbsY(); let v = this.read(a); this.flagC = (v & 0x01) !== 0; v >>= 1; this.write(a, v); this.a ^= v; this.setNZ(this.a); this.cycles += 7; break; }
      case 0x43: { const a = this.addrIndX(); let v = this.read(a); this.flagC = (v & 0x01) !== 0; v >>= 1; this.write(a, v); this.a ^= v; this.setNZ(this.a); this.cycles += 8; break; }
      case 0x53: { const a = this.addrIndY(); let v = this.read(a); this.flagC = (v & 0x01) !== 0; v >>= 1; this.write(a, v); this.a ^= v; this.setNZ(this.a); this.cycles += 8; break; }

      // RRA (ROR + ADC)
      case 0x67: { const a = this.addrZP(); let v = this.read(a); const c = this.flagC ? 0x80 : 0; this.flagC = (v & 0x01) !== 0; v = (v >> 1) | c; this.write(a, v); this.adc(v); this.cycles += 5; break; }
      case 0x77: { const a = this.addrZPX(); let v = this.read(a); const c = this.flagC ? 0x80 : 0; this.flagC = (v & 0x01) !== 0; v = (v >> 1) | c; this.write(a, v); this.adc(v); this.cycles += 6; break; }
      case 0x6F: { const a = this.addrAbs(); let v = this.read(a); const c = this.flagC ? 0x80 : 0; this.flagC = (v & 0x01) !== 0; v = (v >> 1) | c; this.write(a, v); this.adc(v); this.cycles += 6; break; }
      case 0x7F: { const a = this.addrAbsX(); let v = this.read(a); const c = this.flagC ? 0x80 : 0; this.flagC = (v & 0x01) !== 0; v = (v >> 1) | c; this.write(a, v); this.adc(v); this.cycles += 7; break; }
      case 0x7B: { const a = this.addrAbsY(); let v = this.read(a); const c = this.flagC ? 0x80 : 0; this.flagC = (v & 0x01) !== 0; v = (v >> 1) | c; this.write(a, v); this.adc(v); this.cycles += 7; break; }
      case 0x63: { const a = this.addrIndX(); let v = this.read(a); const c = this.flagC ? 0x80 : 0; this.flagC = (v & 0x01) !== 0; v = (v >> 1) | c; this.write(a, v); this.adc(v); this.cycles += 8; break; }
      case 0x73: { const a = this.addrIndY(); let v = this.read(a); const c = this.flagC ? 0x80 : 0; this.flagC = (v & 0x01) !== 0; v = (v >> 1) | c; this.write(a, v); this.adc(v); this.cycles += 8; break; }

      // ANC (AND + set carry from bit 7)
      case 0x0B: case 0x2B:
        this.a &= this.read(this.addrImm()); this.setNZ(this.a); this.flagC = (this.a & 0x80) !== 0; this.cycles += 2; break;

      default:
        // Unknown opcode — treat as NOP (1 byte)
        console.warn(`Unknown opcode: $${opcode.toString(16).padStart(2, '0')} at $${(this.pc - 1).toString(16).padStart(4, '0')}`);
        this.cycles += 2;
        break;
    }

    return this.cycles - startCycles;
  }

  /** Run CPU for a given number of cycles */
  run(cycleBudget: number): void {
    const target = this.cycles + cycleBudget;
    while (this.cycles < target) {
      this.step();
    }
  }

  /** Call a subroutine at the given address and run until RTS */
  jsr(addr: number, maxCycles = 200000): void {
    // Push a sentinel return address (points to an infinite loop at $FFFA)
    this.memory[0xFFFA] = 0x4C; // JMP $FFFA (infinite loop)
    this.memory[0xFFFB] = 0xFA;
    this.memory[0xFFFC] = 0xFF;

    this.push(0xFF); // high byte of $FFFA - 1 = $FFF9
    this.push(0xF9); // low byte

    this.pc = addr;
    const startCycles = this.cycles;

    while (this.pc !== 0xFFFA && (this.cycles - startCycles) < maxCycles) {
      this.step();
    }
  }
}
