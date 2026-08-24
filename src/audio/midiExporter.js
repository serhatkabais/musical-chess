/**
 * Standard MIDI File (.mid) Binary Exporter
 * Generates Type 0 MIDI binary from sequence of chess moves.
 * Supports 2/4, 3/4, 4/4 Time Signature Versions.
 */

import { PIECE_DURATIONS } from './noteMapping.js';
import { TIME_SIGNATURES } from './timeSignatures.js';

// Helper: writes variable-length quantity (VLQ) into byte array
function writeVLQ(value) {
  const bytes = [];
  let v = value & 0x7F;
  while ((value >>= 7)) {
    v <<= 8;
    v |= ((value & 0x7F) | 0x80);
  }
  while (true) {
    bytes.push(v & 0xFF);
    if (v & 0x80) v >>= 8;
    else break;
  }
  return bytes;
}

// Helper: convert string to ASCII byte array
function stringToBytes(str) {
  return str.split('').map(c => c.charCodeAt(0));
}

// Helper: write 32-bit big endian integer
function numToBytes32(num) {
  return [(num >> 24) & 0xFF, (num >> 16) & 0xFF, (num >> 8) & 0xFF, num & 0xFF];
}

// Helper: write 16-bit big endian integer
function numToBytes16(num) {
  return [(num >> 8) & 0xFF, num & 0xFF];
}

/**
 * Creates a .mid File Blob from move history
 * @param {Array<{ move: string, piece: string, noteInfo: { midi: number, noteName: string } }>} moveHistory
 * @param {number} bpm - Beats per minute (e.g. 120)
 * @param {string} timeSigId - '2/4', '3/4', '4/4'
 * @returns {Blob}
 */
export function generateMidiFile(moveHistory, bpm = 120, timeSigId = '4/4') {
  const timeSig = TIME_SIGNATURES[timeSigId] || TIME_SIGNATURES['4/4'];
  const TICKS_PER_BEAT = 480; // 1 Quarter note = 480 ticks
  const usPerQuarter = Math.round(60000000 / bpm);

  const trackEvents = [];

  // 1. Time Signature Event (Delta 0, FF 58 04 [nn dd cc bb])
  trackEvents.push(...writeVLQ(0), 0xFF, 0x58, 0x04, ...timeSig.midiBytes);

  // 2. Set Tempo: (Delta 0, FF 51 03 [3-byte microseconds])
  trackEvents.push(
    ...writeVLQ(0),
    0xFF, 0x51, 0x03,
    (usPerQuarter >> 16) & 0xFF,
    (usPerQuarter >> 8) & 0xFF,
    usPerQuarter & 0xFF
  );

  // 3. Track Name: "Musical Chess Composition ({timeSigId})"
  const trackName = `Musical Chess Composition (${timeSigId} Version)`;
  trackEvents.push(
    ...writeVLQ(0),
    0xFF, 0x03, trackName.length,
    ...stringToBytes(trackName)
  );

  // 4. Note Events for each chess move
  for (const moveData of moveHistory) {
    if (!moveData.noteInfo) continue;

    const midiNote = moveData.noteInfo.midi;
    const pieceType = (moveData.piece || 'p').toLowerCase();
    
    // Scale duration slightly based on 3/4 waltz vs 2/4 march rhythm
    let baseBeats = PIECE_DURATIONS[pieceType] ? PIECE_DURATIONS[pieceType].beats : 0.25;
    if (timeSigId === '3/4') {
      // In 3/4 waltz, round whole notes (4) to waltz bar (3 beats)
      if (baseBeats === 4.0) baseBeats = 3.0;
    } else if (timeSigId === '2/4') {
      // In 2/4 march, round whole notes to 2 beats
      if (baseBeats === 4.0) baseBeats = 2.0;
    }

    const durationTicks = Math.round(baseBeats * TICKS_PER_BEAT);

    // Note On (Channel 0, Note, Velocity 90)
    trackEvents.push(...writeVLQ(0), 0x90, midiNote, 90);

    // Note Off after duration ticks
    trackEvents.push(...writeVLQ(durationTicks), 0x80, midiNote, 0);
  }

  // 5. End of Track Meta Event (Delta 0, FF 2F 00)
  trackEvents.push(...writeVLQ(0), 0xFF, 0x2F, 0x00);

  // Header Chunk (MThd)
  const headerBytes = [
    ...stringToBytes('MThd'),
    ...numToBytes32(6),
    ...numToBytes16(0),
    ...numToBytes16(1),
    ...numToBytes16(TICKS_PER_BEAT)
  ];

  // Track Chunk (MTrk)
  const trackBytes = [
    ...stringToBytes('MTrk'),
    ...numToBytes32(trackEvents.length),
    ...trackEvents
  ];

  const fullMidiBytes = new Uint8Array([...headerBytes, ...trackBytes]);
  return new Blob([fullMidiBytes], { type: 'audio/midi' });
}

/**
 * Trigger browser file download of MIDI
 */
export function downloadMidiFile(moveHistory, bpm = 120, timeSigId = '4/4', baseFilename = 'musical_chess_song') {
  const cleanSig = timeSigId.replace('/', '-');
  const filename = `${baseFilename}_${cleanSig}.mid`;
  const blob = generateMidiFile(moveHistory, bpm, timeSigId);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
