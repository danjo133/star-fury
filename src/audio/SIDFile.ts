/**
 * PSID/RSID File Format Parser
 * Parses .sid files from the High Voltage SID Collection (HVSC)
 * Format spec: https://www.hvsc.c64.org/download/C64Music/DOCUMENTS/SID_file_format.txt
 */

export interface SIDFileInfo {
  format: 'PSID' | 'RSID';
  version: number;
  dataOffset: number;
  loadAddress: number;
  initAddress: number;
  playAddress: number;
  songs: number;
  startSong: number;
  speed: number;         // Bit field: 0 = 50Hz (VBI), 1 = CIA timer
  title: string;
  author: string;
  released: string;
  flags: number;
  data: Uint8Array;      // The raw C64 program data
}

export function parseSIDFile(buffer: ArrayBuffer): SIDFileInfo {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  // Magic ID
  const magic = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  if (magic !== 'PSID' && magic !== 'RSID') {
    throw new Error(`Invalid SID file magic: "${magic}"`);
  }

  const version = view.getUint16(4);
  const dataOffset = view.getUint16(6);
  let loadAddress = view.getUint16(8);
  const initAddress = view.getUint16(10);
  const playAddress = view.getUint16(12);
  const songs = view.getUint16(14);
  const startSong = view.getUint16(16);
  const speed = view.getUint32(18);

  // Text fields (32 bytes each, null-terminated)
  const title = readString(bytes, 0x16, 32);
  const author = readString(bytes, 0x36, 32);
  const released = readString(bytes, 0x56, 32);

  let flags = 0;
  if (version >= 2) {
    flags = view.getUint16(0x76);
  }

  // Data starts at dataOffset
  let data = bytes.slice(dataOffset);

  // If loadAddress is 0, it's stored in the first 2 bytes of data (little-endian)
  if (loadAddress === 0) {
    loadAddress = data[0] | (data[1] << 8);
    data = data.slice(2);
  }

  return {
    format: magic as 'PSID' | 'RSID',
    version,
    dataOffset,
    loadAddress,
    initAddress,
    playAddress,
    songs,
    startSong,
    speed,
    title,
    author,
    released,
    flags,
    data,
  };
}

function readString(bytes: Uint8Array, offset: number, maxLen: number): string {
  let str = '';
  for (let i = 0; i < maxLen; i++) {
    const ch = bytes[offset + i];
    if (ch === 0) break;
    str += String.fromCharCode(ch);
  }
  return str;
}
