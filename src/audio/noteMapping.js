/**
 * Note and Musical Scale Mapping Engine
 * 
 * Modlar (Scales):
 * 1. Diatonic (Diyatonik C Major - Varsayılan Klasik)
 * 2. Pentatonic (Majör/Minör Pentatonik - Kusursuz Lo-Fi akıcılığı, disonanssız)
 * 3. Dramatic Minor (A Aeolian / D Minor - Epik & Melankolik Savaş Hissi)
 * 4. Harmonic Minor (Klasik / Barok - Bach/Chopin draması)
 * 5. Lydian Space (Sinematik / Rüya Atmosferi)
 */

export const SCALE_MODES = {
  diatonic: {
    id: 'diatonic',
    name: 'Klasik Do-Majör (Diyatonik)',
    icon: '🎼',
    // C, D, E, F, G, A, B
    intervals: [0, 2, 4, 5, 7, 9, 11],
    namesTr: ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si'],
    namesEn: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
    baseMidi: 60 // C4
  },
  pentatonic: {
    id: 'pentatonic',
    name: 'Sihirli Pentatonik (Lo-Fi / Akıcı)',
    icon: '✨',
    // C, D, E, G, A (5 tonlu - asla uyumsuz tınlamaz)
    intervals: [0, 2, 4, 7, 9],
    namesTr: ['Do', 'Re', 'Mi', 'Sol', 'La'],
    namesEn: ['C', 'D', 'E', 'G', 'A'],
    baseMidi: 60 // C4
  },
  dramatic_minor: {
    id: 'dramatic_minor',
    name: 'Dramatik Minör (Epik Savaş)',
    icon: '⚔️',
    // A, B, C, D, E, F, G (Doğal A Minör)
    intervals: [0, 2, 3, 5, 7, 8, 10],
    namesTr: ['La', 'Si', 'Do', 'Re', 'Mi', 'Fa', 'Sol'],
    namesEn: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
    baseMidi: 57 // A3
  },
  harmonic_minor: {
    id: 'harmonic_minor',
    name: 'Barok Armonik Minör (Klasik)',
    icon: '🏛️',
    // A, B, C, D, E, F, G# (Armonik Minör)
    intervals: [0, 2, 3, 5, 7, 8, 11],
    namesTr: ['La', 'Si', 'Do', 'Re', 'Mi', 'Fa', 'Sol#'],
    namesEn: ['A', 'B', 'C', 'D', 'E', 'F', 'G#'],
    baseMidi: 57 // A3
  },
  lydian: {
    id: 'lydian',
    name: 'Sinematik Lydian (Rüya / Ambient)',
    icon: '🌌',
    // F, G, A, B, C, D, E
    intervals: [0, 2, 4, 6, 7, 9, 11],
    namesTr: ['Fa', 'Sol', 'La', 'Si', 'Do', 'Re', 'Mi'],
    namesEn: ['F', 'G', 'A', 'B', 'C', 'D', 'E'],
    baseMidi: 53 // F3
  }
};

let currentScaleMode = 'diatonic';

export function setScaleMode(modeId) {
  if (SCALE_MODES[modeId]) {
    currentScaleMode = modeId;
  }
}

export function getScaleMode() {
  return currentScaleMode;
}

/**
 * Calculates MIDI note number, note name, and solfege for a square in the current scale mode
 * Formül: Rank 1-8 başlangıç derecesi, A-H sütunu sıralı ilerleme
 * @param {string} square - e.g. "a1", "e4", "h8"
 * @param {string} modeId - optional scale mode override
 * @returns {{ midi: number, noteName: string, solfege: string, freq: number }}
 */
export function getSquareNote(square, modeId = null) {
  const mode = SCALE_MODES[modeId || currentScaleMode] || SCALE_MODES.diatonic;
  const numDegrees = mode.intervals.length;

  const fileChar = square[0].toLowerCase();
  const rankNum = parseInt(square[1], 10); // 1 to 8

  const fileIndex = fileChar.charCodeAt(0) - 'a'.charCodeAt(0); // 0 to 7
  const rankIndex = rankNum - 1; // 0 to 7

  // 1'den 8'e sıralar (ranks) başlangıç notası, A-H sütunları adım adım ilerler
  const totalStep = rankIndex + fileIndex;

  const octaveOffset = Math.floor(totalStep / numDegrees);
  const scaleDegree = totalStep % numDegrees;

  // Approximate octave number for display
  const baseOctave = Math.floor(mode.baseMidi / 12) - 1;
  const noteOctave = baseOctave + octaveOffset;

  const noteName = mode.namesEn[scaleDegree] + noteOctave;
  const solfege = mode.namesTr[scaleDegree] + noteOctave;

  // Exact semitone calculation
  const midi = mode.baseMidi + (octaveOffset * 12) + mode.intervals[scaleDegree];

  // Frequency formula
  const freq = 440 * Math.pow(2, (midi - 69) / 12);

  return {
    square,
    midi,
    noteName,
    solfege,
    freq: Number(freq.toFixed(2))
  };
}

/**
 * Duration multiplier based on piece type
 */
export const PIECE_DURATIONS = {
  q: { name: 'Vezir', label: "4/4'lük", beats: 4.0, fraction: '1/1', ratio: 1.0 },      // Whole note
  r: { name: 'Kale', label: "2/4'lük", beats: 2.0, fraction: '1/2', ratio: 0.5 },       // Half note
  b: { name: 'Fil', label: "1/4'lük", beats: 1.0, fraction: '1/4', ratio: 0.25 },       // Quarter note
  n: { name: 'At', label: "1/8'lik", beats: 0.5, fraction: '1/8', ratio: 0.125 },       // Eighth note
  p: { name: 'Piyon', label: "1/16'lık", beats: 0.25, fraction: '1/16', ratio: 0.0625 }, // Sixteenth note
  k: { name: 'Şah', label: "2/4'lük Akor", beats: 2.0, fraction: '1/2', ratio: 0.5 }    // King Majestic chord
};

/**
 * Converts BPM and piece type to exact duration in seconds
 */
export function getDurationInSeconds(pieceType, bpm = 120, quantized = false) {
  const pieceInfo = PIECE_DURATIONS[pieceType.toLowerCase()] || PIECE_DURATIONS.p;
  const beatDurationSec = 60 / bpm; // 1 beat (quarter note) in seconds

  if (quantized) {
    // Quantized mode: Piyonlar ve Atlar çok hızlı bitip kopmasın diye minimum müzikal 1/8'lik bar uzunluğuna yuvarlanır
    const adjustedBeats = Math.max(pieceInfo.beats, 0.5);
    return adjustedBeats * beatDurationSec;
  }

  return pieceInfo.beats * beatDurationSec;
}
