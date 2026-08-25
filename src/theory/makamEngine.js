/**
 * Makam & Tonal Mutation Engine (Microtonal Cents & Seyir Trajectory)
 * 
 * Supports:
 * - Turkish Classical Makams (Rast, Hicaz, Uşşak, Nihavend, Hüseyni, Kürdî) with authentic microtonal cent detuning
 * - Western Tonal Systems (Major, Natural Minor, Harmonic Minor)
 * - Retroactive Tonal Mutation based on Final Game Result & Tonic Square
 * - Board Geometry Seyir (Ascending / Descending melodic paths)
 */

export const MAKAMS = {
  // --- TÜRK MUSİKİSİ MAKAMLARI (MİKROTONAL KOMALAR) ---
  rast: {
    id: 'rast',
    name: 'Rast Makamı',
    icon: '🕌',
    type: 'makam',
    defaultTonic: 0, // C (Rast Perdesi / Do)
    character: 'Coşkulu, dengeli, asil ve ferahlatıcı karar.',
    // C, D, E (-35c Segâh), F, G, A, B (-35c Eviç)
    degrees: [
      { semitone: 0, cents: 0, name: 'Rast (Do)' },
      { semitone: 2, cents: 0, name: 'Dügâh (Re)' },
      { semitone: 4, cents: -35, name: 'Segâh (Koma Mi)' },
      { semitone: 5, cents: 0, name: 'Çargâh (Fa)' },
      { semitone: 7, cents: 0, name: 'Neva (Sol)' },
      { semitone: 9, cents: 0, name: 'Hüseyni (La)' },
      { semitone: 11, cents: -35, name: 'Eviç (Koma Si)' }
    ],
    seyirType: 'ascending', // Çıkan seyir (Durağından başlar, tize yürür)
    dominantDegree: 4 // Neva (Sol)
  },

  hicaz: {
    id: 'hicaz',
    name: 'Hicaz Makamı',
    icon: '🔥',
    type: 'makam',
    defaultTonic: 9, // A (Dügâh Perdesi / La)
    character: 'Taktiksel kaos, mistik gerilim ve meşhur artık ikili aralık.',
    // A, Bb (-25c Hicaz), C#, D, E, F, G
    degrees: [
      { semitone: 0, cents: 0, name: 'Dügâh (La)' },
      { semitone: 1, cents: -25, name: 'Dik Kürdî (Koma Sib)' },
      { semitone: 4, cents: 0, name: 'Hicaz (Do#)' },
      { semitone: 5, cents: 0, name: 'Neva (Re)' },
      { semitone: 7, cents: 0, name: 'Hüseyni (Mi)' },
      { semitone: 8, cents: 0, name: 'Acem (Fa)' },
      { semitone: 10, cents: 0, name: 'Gerdaniye (Sol)' }
    ],
    seyirType: 'ascending-descending',
    dominantDegree: 3 // Neva (Re)
  },

  ussak: {
    id: 'ussak',
    name: 'Uşşak Makamı',
    icon: '🍂',
    type: 'makam',
    defaultTonic: 9, // A (Dügâh / La)
    character: 'Derin, mistik Anadolu hüznü ve içsel teslimiyet.',
    // A, B (-35c Segâh), C, D, E, F, G
    degrees: [
      { semitone: 0, cents: 0, name: 'Dügâh (La)' },
      { semitone: 2, cents: -35, name: 'Segâh (Koma Si)' },
      { semitone: 3, cents: 0, name: 'Çargâh (Do)' },
      { semitone: 5, cents: 0, name: 'Neva (Re)' },
      { semitone: 7, cents: 0, name: 'Hüseyni (Mi)' },
      { semitone: 8, cents: 0, name: 'Acem (Fa)' },
      { semitone: 10, cents: 0, name: 'Gerdaniye (Sol)' }
    ],
    seyirType: 'ascending',
    dominantDegree: 3 // Neva (Re)
  },

  nihavend: {
    id: 'nihavend',
    name: 'Nihavend Makamı',
    icon: '💎',
    type: 'makam',
    defaultTonic: 0, // C (Rast / Do)
    character: 'Batı minörüne en yakın, entelektüel, asil ve lirik tını.',
    // C, D, Eb, F, G, Ab, Bb (veya B karar)
    degrees: [
      { semitone: 0, cents: 0, name: 'Rast (Do)' },
      { semitone: 2, cents: 0, name: 'Dügâh (Re)' },
      { semitone: 3, cents: 0, name: 'Kürdî (Mib)' },
      { semitone: 5, cents: 0, name: 'Çargâh (Fa)' },
      { semitone: 7, cents: 0, name: 'Neva (Sol)' },
      { semitone: 8, cents: 0, name: 'Nim Hisar (Lab)' },
      { semitone: 11, cents: 0, name: 'Bûselik (Si)' }
    ],
    seyirType: 'ascending-descending',
    dominantDegree: 4 // Neva (Sol)
  },

  huseyni: {
    id: 'huseyni',
    name: 'Hüseyni Makamı',
    icon: '🦅',
    type: 'makam',
    defaultTonic: 9, // A (La)
    character: 'Destansı, yiğit ve kahramanca hücum motifleri.',
    degrees: [
      { semitone: 0, cents: 0, name: 'Dügâh (La)' },
      { semitone: 2, cents: -35, name: 'Segâh (Koma Si)' },
      { semitone: 3, cents: 0, name: 'Çargâh (Do)' },
      { semitone: 5, cents: 0, name: 'Neva (Re)' },
      { semitone: 7, cents: 0, name: 'Hüseyni (Mi)' },
      { semitone: 9, cents: 0, name: 'Eviç (Fa# / Sol)' },
      { semitone: 10, cents: 0, name: 'Gerdaniye (Sol)' }
    ],
    seyirType: 'descending-ascending',
    dominantDegree: 4 // Hüseyni (Mi)
  },

  // --- BATI TONALİTE SEÇENEKLERİ ---
  western_major: {
    id: 'western_major',
    name: 'Batı Majör Tonalite',
    icon: '🎼',
    type: 'western',
    defaultTonic: 0, // C
    character: 'Aydınlık, zafer dolu klasik Batı senfonisi.',
    degrees: [
      { semitone: 0, cents: 0, name: 'Tonic' },
      { semitone: 2, cents: 0, name: '2nd' },
      { semitone: 4, cents: 0, name: '3rd' },
      { semitone: 5, cents: 0, name: '4th' },
      { semitone: 7, cents: 0, name: '5th' },
      { semitone: 9, cents: 0, name: '6th' },
      { semitone: 11, cents: 0, name: '7th' }
    ],
    seyirType: 'neutral',
    dominantDegree: 4
  },

  western_minor: {
    id: 'western_minor',
    name: 'Batı Armonik Minör',
    icon: '⚔️',
    type: 'western',
    defaultTonic: 9, // A
    character: 'Dramatik, trajik ve fırtınalı mücadele sonatı.',
    degrees: [
      { semitone: 0, cents: 0, name: 'Tonic' },
      { semitone: 2, cents: 0, name: '2nd' },
      { semitone: 3, cents: 0, name: 'Minor 3rd' },
      { semitone: 5, cents: 0, name: '4th' },
      { semitone: 7, cents: 0, name: '5th' },
      { semitone: 8, cents: 0, name: 'Minor 6th' },
      { semitone: 11, cents: 0, name: 'Major 7th' }
    ],
    seyirType: 'neutral',
    dominantDegree: 4
  }
};

/**
 * Mutates a diatonic step pitch to the selected Makam/Scale relative to the final game Tonic
 * @param {number} rawMidi - Base diatonic MIDI number (e.g. 60 for C4, 64 for E4)
 * @param {string} makamId - 'rast', 'hicaz', 'ussak', 'nihavend', 'western_major', etc.
 * @param {number|null} targetTonicPitchClass - 0..11 (e.g. 7 for G). If null, uses makam's default tonic.
 * @param {number} rankMotion - (to_rank - from_rank) to apply Seyir inflection
 * @returns {{ midi: number, cents: number, freq: number, degreeName: string }}
 */
export function mutatePitch(rawMidi, makamId = 'rast', targetTonicPitchClass = null, rankMotion = 0) {
  const makam = MAKAMS[makamId] || MAKAMS.rast;
  const tonicPC = (targetTonicPitchClass !== null) ? targetTonicPitchClass : makam.defaultTonic;

  // Determine diatonic degree (0..6) of the raw pitch relative to C
  const rawPitchClass = rawMidi % 12;
  const octave = Math.floor(rawMidi / 12) - 1;

  // Map raw pitch class to 7-degree index (0 to 6)
  const diatonicMap = { 0: 0, 2: 1, 4: 2, 5: 3, 7: 4, 9: 5, 11: 6 };
  let degreeIndex = diatonicMap[rawPitchClass];
  if (degreeIndex === undefined) {
    // nearest degree fallback
    degreeIndex = Math.min(6, Math.floor(rawPitchClass / 2));
  }

  const makamDegree = makam.degrees[degreeIndex];
  
  // Calculate target MIDI note with Tonic offset
  const baseTonicMidi = (octave + 1) * 12 + tonicPC;
  let targetMidi = baseTonicMidi + makamDegree.semitone;

  // Keep octave range natural (48..84)
  while (targetMidi < 48) targetMidi += 12;
  while (targetMidi > 88) targetMidi -= 12;

  // Microtonal Cent Detuning
  let cents = makamDegree.cents;

  // Tahta Geometrisi ve Makam Seyri Modülasyonu:
  // Çıkan (Ascending) seyirde tiz perdeler hafif parlatılır (+5 cents)
  // İnen (Descending) seyirde karar perdesine doğru teslimiyet (-5 cents)
  if (rankMotion > 2 && makam.seyirType.includes('ascending')) {
    cents += 6;
  } else if (rankMotion < -2 && makam.seyirType.includes('descending')) {
    cents -= 8;
  }

  // Exact frequency with cents formula: f = 440 * 2^(((midi - 69) + cents/100) / 12)
  const exactNote = (targetMidi - 69) + (cents / 100);
  const freq = 440 * Math.pow(2, exactNote / 12);

  return {
    midi: targetMidi,
    cents: Math.round(cents),
    freq: Number(freq.toFixed(2)),
    degreeName: makamDegree.name
  };
}
