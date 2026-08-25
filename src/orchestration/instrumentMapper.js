/**
 * Orchestration & Timbre Mapping Engine
 * 
 * Supports:
 * 1. Western Symphonic Orchestra
 * 2. Turkish Classical Makam Ensemble (Geleneksel Türk Sazları Heyeti)
 */

export const ORCHESTRATION_SETS = {
  symphonic: {
    id: 'symphonic',
    name: 'Batı Senfoni Orkestrası',
    icon: '🎻',
    instruments: {
      p: { name: 'Violin Pizzicato', code: 'pizzicato', midiProgram: 45, channel: 0 },
      n: { name: 'Clarinet & Flute', code: 'woodwind', midiProgram: 71, channel: 1 },
      b: { name: 'Violins Legato', code: 'strings_legato', midiProgram: 40, channel: 2 },
      r: { name: 'Cello & French Horn', code: 'cello_horn', midiProgram: 42, channel: 3 },
      q: { name: 'Full Strings & Brass', code: 'brass_strings', midiProgram: 48, channel: 4 },
      k: { name: 'Contrabass & Low Strings', code: 'contrabass', midiProgram: 43, channel: 5 },
      capture: { name: 'Brass + Cymbals Accent', code: 'brass_hit', midiProgram: 61, channel: 6 },
      check: { name: 'Timpani + Strings Sforzando', code: 'timpani', midiProgram: 47, channel: 7 },
      mate: { name: 'Full Orchestra Tutti', code: 'orchestra_hit', midiProgram: 55, channel: 8 }
    }
  },

  makam_ensemble: {
    id: 'makam_ensemble',
    name: 'Türk Musikisi Saz Heyeti',
    icon: '🪕',
    instruments: {
      p: { name: 'Kanun / Ud Mızrap (Pizz)', code: 'kanun_pizz', midiProgram: 24, channel: 0 },
      n: { name: 'Ney (Nefesli)', code: 'ney', midiProgram: 73, channel: 1 },
      b: { name: 'Yaylı Tanbur & Kanun', code: 'tanbur_kanun', midiProgram: 15, channel: 2 },
      r: { name: 'Klasik Kemençe & Viyolonsel', code: 'kemence_cello', midiProgram: 110, channel: 3 },
      q: { name: 'Klasik Kemençe, Ud & Yaylılar', code: 'makam_strings', midiProgram: 48, channel: 4 },
      k: { name: 'Derin Ud & Pes Tanbur', code: 'deep_ud', midiProgram: 25, channel: 5 },
      capture: { name: 'Bendir & Zil Darbesi', code: 'bendir_zil', midiProgram: 115, channel: 6 },
      check: { name: 'Kudüm & Ney Aksanı', code: 'kudum_accent', midiProgram: 116, channel: 7 },
      mate: { name: 'Tüm Saz Heyeti Karar Akoru', code: 'makam_tutti', midiProgram: 55, channel: 8 }
    }
  }
};

/**
 * Resolves instrument timbre based on move context and ensemble mode
 * @param {string} piece 
 * @param {boolean} isCapture 
 * @param {boolean} isCheck 
 * @param {boolean} isMate 
 * @param {string} ensembleId - 'symphonic' or 'makam_ensemble'
 * @returns {object} Instrument definition
 */
export function getInstrumentForMove(piece, isCapture = false, isCheck = false, isMate = false, ensembleId = 'symphonic') {
  const set = ORCHESTRATION_SETS[ensembleId] || ORCHESTRATION_SETS.symphonic;

  if (isMate) return set.instruments.mate;
  if (isCheck && isCapture) return set.instruments.capture;
  if (isCheck) return set.instruments.check;
  if (isCapture) return set.instruments.capture;

  const p = (piece || 'p').toLowerCase();
  return set.instruments[p] || set.instruments.p;
}
