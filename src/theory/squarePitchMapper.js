/**
 * Square to Pitch Mapping Engine (Diatonic Model & Pitch Classes)
 * 
 * Model:
 * row = rank(square)  (1..8)
 * col = file(square)  (0..7)
 * row_start = [C4, D4, E4, F4, G4, A4, B4, C5][row - 1]
 * return diatonic_step(row_start, col)
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
 * @returns {{ midi: number, pitchClass: number, noteName: string, solfege: string, octave: number, freq: number }}
 */
export function getSquarePitch(square) {
  const fileChar = square[0].toLowerCase();
  const rankNum = parseInt(square[1], 10); // 1 to 8

  const col = fileChar.charCodeAt(0) - 'a'.charCodeAt(0); // 0 (a) to 7 (h)
  const row = rankNum; // 1 to 8

  // row_start = [C4, D4, E4, F4, G4, A4, B4, C5][row - 1]
  const rowStartDiatonicStep = (row - 1);
  const totalDiatonicStep = rowStartDiatonicStep + col;

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
    midi,
    pitchClass,
    noteName,
    solfege,
    octave,
    freq: Number(freq.toFixed(2))
  };
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
