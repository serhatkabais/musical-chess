/**
 * Dikey Referans Nota Matrisi & Geometri Haritası (C Major Base & King Chord Engine)
 * 
 * Deterministik Formül:
 * col (file): a=0, b=1, c=2, d=3, e=4, f=5, g=6, h=7
 * row (rank): 1..8 arası satır numarası
 * col_roots = [C4(60), D4(62), E4(64), F4(65), G4(67), A4(69), B4(71), C5(72)]
 * 
 * Dikey Geometri:
 * a Sütunu (Do): a1(C4) - a2(D4) - a3(E4) - a4(F4) - a5(G4) - a6(A4) - a7(B4) - a8(C5)
 * b Sütunu (Re): b1(D4) - b2(E4) - b3(F4) - b4(G4) - b5(A4) - b6(B4) - b7(C5) - b8(D5)
 * c Sütunu (Mi): c1(E4) - c2(F4) - c3(G4) - c4(A4) - c5(B4) - c6(C5) - c7(D5) - c8(E5)
 * d Sütunu (Fa): d1(F4) - d2(G4) - d3(A4) - d4(B4) - d5(C5) - d6(D5) - d7(E5) - d8(F5)
 * e Sütunu (Sol): e1(G4) - e2(A4) - e3(B4) - e4(C5) - e5(D5) - e6(E5) - e7(F5) - e8(G5)
 * f Sütunu (La): f1(A4) - f2(B4) - f3(C5) - f4(D5) - f5(E5) - f6(F5) - f7(G5) - f8(A5)
 * g Sütunu (Si): g1(B4) - g2(C5) - g3(D5) - g4(E5) - g5(F5) - g6(G5) - g7(A5) - g8(B5)
 * h Sütunu (Do): h1(C5) - h2(D5) - h3(E5) - h4(F5) - h5(G5) - h6(A5) - h7(B5) - h8(C6)
 */

export const DIATONIC_BASE_MIDI = [60, 62, 64, 65, 67, 69, 71, 72]; // C4, D4, E4, F4, G4, A4, B4, C5
export const DIATONIC_SEMITONES = [0, 2, 4, 5, 7, 9, 11]; // C, D, E, F, G, A, B
export const NOTE_NAMES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
export const NOTE_NAMES_TR = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si'];

export const PITCH_CLASS_NAMES = {
  0: 'C', 1: 'C#', 2: 'D', 3: 'D#', 4: 'E', 5: 'F',
  6: 'F#', 7: 'G', 8: 'G#', 9: 'A', 10: 'A#', 11: 'B'
};

export const PITCH_CLASS_NAMES_TR = {
  0: 'Do', 1: 'Do#', 2: 'Re', 3: 'Re#', 4: 'Mi', 5: 'Fa',
  6: 'Fa#', 7: 'Sol', 8: 'Sol#', 9: 'La', 10: 'La#', 11: 'Si'
};

/**
 * Calculates raw diatonic pitch for square on chessboard
 * @param {string} square e.g. "e4", "a1"
 * @returns {{ midi: number, pitchClass: number, noteName: string, solfege: string, octave: number, freq: number, fileIdx: number, rankIdx: number }}
 */
export function getSquarePitch(square) {
  const fileChar = square[0].toLowerCase();
  const rankNum = parseInt(square[1], 10); // 1 to 8

  const col = fileChar.charCodeAt(0) - 'a'.charCodeAt(0); // 0 (a) to 7 (h)
  const row = rankNum; // 1 to 8

  // Dikey Sütun Kökü + Satır Adımı
  const columnRootDiatonicStep = col;
  const totalDiatonicStep = columnRootDiatonicStep + (row - 1);

  const octaveOffset = Math.floor(totalDiatonicStep / 7);
  const scaleDegree = totalDiatonicStep % 7;

  const octave = 4 + octaveOffset;
  const noteName = NOTE_NAMES[scaleDegree] + octave;
  const solfege = NOTE_NAMES_TR[scaleDegree] + octave;

  const midi = 60 + (octaveOffset * 12) + DIATONIC_SEMITONES[scaleDegree];
  const pitchClass = midi % 12;
  const freq = 440 * Math.pow(2, (midi - 69) / 12);

  return {
    square,
    fileIdx: col,
    rankIdx: row,
    midi,
    pitchClass,
    noteName,
    solfege,
    octave,
    freq: Number(freq.toFixed(2))
  };
}

/**
 * Generates an orchestral 3-4 note Legato Pad Chord for the King based on column/file degree
 * @param {string} square - King's target square (e.g. "e1", "g1")
 * @returns {Array<{ midi: number, noteName: string, freq: number }>}
 */
export function getKingDegreeChord(square) {
  const p = getSquarePitch(square);
  const col = p.fileIdx; // 0..7

  // 1st, 3rd, 5th, 8th diatonic steps above column root
  const chordDegrees = [col, col + 2, col + 4, col + 7];
  return chordDegrees.map(deg => {
    const octOff = Math.floor(deg / 7);
    const degMod = deg % 7;
    const midi = 48 + (octOff * 12) + DIATONIC_SEMITONES[degMod]; // Low string cello/viola register
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    const name = NOTE_NAMES[degMod] + (3 + octOff);
    return { midi, noteName: name, freq: Number(freq.toFixed(2)) };
  });
}

/**
 * Generates multi-voice Clash Chord for Captures based on captured piece value
 * Piece values: Pawn=2 notes, Knight/Bishop=3-4 notes, Rook=5 notes, Queen=7-8 notes
 */
export function getCaptureClashChord(targetSquare, capturedPiece = 'p') {
  const p = getSquarePitch(targetSquare);
  const pType = (capturedPiece || 'p').toLowerCase();

  let voiceCount = 2;
  if (pType === 'n' || pType === 'b') voiceCount = 3;
  else if (pType === 'r') voiceCount = 5;
  else if (pType === 'q') voiceCount = 7;

  const notes = [];
  for (let i = 0; i < voiceCount; i++) {
    // Dense dissonant or quartal intervals around impact note
    const intervalOffset = (i % 2 === 0) ? (i * 2) : -(i * 2 - 1);
    const m = Math.max(36, Math.min(96, p.midi + intervalOffset));
    const freq = 440 * Math.pow(2, (m - 69) / 12);
    notes.push({ midi: m, freq: Number(freq.toFixed(2)) });
  }
  return notes;
}

/**
 * Extracts Pitch Class (0..11) from final square or winning checkmate square
 * @param {string} square 
 * @returns {{ pitchClass: number, name: string, nameTr: string }}
 */
export function getTonicFromSquare(square) {
  const p = getSquarePitch(square);
  return {
    pitchClass: p.pitchClass,
    name: PITCH_CLASS_NAMES[p.pitchClass],
    nameTr: PITCH_CLASS_NAMES_TR[p.pitchClass]
  };
}
