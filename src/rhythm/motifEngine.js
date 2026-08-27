/**
 * Rhythm Motif Engine & Tactical Generator (Section 4 & 5)
 * 
 * Taş Değerleri & Ritmik Hiyerarşi:
 * 1. Piyon (1 Puan) - Tek Kare: Taa (1/4 Dörtlük staccato)
 * 2. Piyon (1 Puan) - İki Kare (e2-e4): ta-ta (2x Sekizlik [0.5, 0.5])
 * 3. At (3 Puan) - Sıçrama: Taa-ta-ta (1 Sekizlik + 2 Onaltılık [0.5, 0.25, 0.25] / Triole)
 * 4. Fil (3 Puan) - Kısa Menzil: ta-ta-Taa (2 Onaltılık + 1 Dörtlük [0.25, 0.25, 1.0])
 * 5. Fil (3 Puan) - Uzun Menzil (≥4): ta-ta-ta-ta... (Sekizlik Arpej Zinciri)
 * 6. Kale (5 Puan) - Doğrusal: Taaam - Taaam ([1.0, 1.0]) / Yatay Glissando Koridoru
 * 7. Vezir (8 Puan) - Şelale: ta-ta-ta-ta ta-ta-ta-ta (8'li Onaltılık Zinciri + Crescendo)
 * 8. Şah - Derece Akoru (Legato Pad)
 * 
 * Taktik Durumlar:
 * - Capture: Elenen taş puanı kadar çok sesli Çarpışma Akoru
 * - Fork: 2-vuruş Crescendo + ffz (Fortissimo Sforzando)
 * - Skewer: Hat Arpeji + Subito Piano (Ani fısıltı)
 * - Pin: Tremolo Gerilimi
 */

export function generateMoveMotif(moveData) {
  const {
    piece,
    distance = 1,
    isCapture = false,
    capturedPiece = null,
    isCheck = false,
    isMate = false,
    isCastling = false,
    isFork = false,
    isSkewer = false,
    isPin = false
  } = moveData;

  const p = (piece || 'p').toLowerCase();

  // 1. TACTICAL MOTIFS & OVERRIDES (Section 5)
  if (isMate) {
    return {
      type: 'mate_tutti',
      relativeRhythms: [1.0, 1.0, 2.0],
      articulation: 'tutti-grandioso',
      accentIndices: [0, 1, 2],
      dynamicModifier: 'fff',
      effect: 'mate_chord'
    };
  }

  if (isFork) {
    return {
      type: 'fork_sforzando',
      relativeRhythms: [0.5, 0.5, 1.0],
      articulation: 'sforzando-ffz',
      accentIndices: [2],
      dynamicModifier: 'ffz',
      effect: 'crescendo_to_ffz'
    };
  }

  if (isSkewer) {
    return {
      type: 'skewer_subito_piano',
      relativeRhythms: [0.25, 0.25, 0.5, 1.0],
      articulation: 'accent-subito-piano',
      accentIndices: [0],
      dynamicModifier: 'subito_p',
      effect: 'subito_piano'
    };
  }

  if (isPin) {
    return {
      type: 'pin_tremolo',
      relativeRhythms: [0.125, 0.125, 0.125, 0.125, 0.5, 1.0],
      articulation: 'tremolo',
      accentIndices: [0],
      dynamicModifier: 'mf_tremolo',
      effect: 'tremolo'
    };
  }

  if (isCapture) {
    return {
      type: 'capture_clash',
      relativeRhythms: [0.25, 0.25, 0.5],
      articulation: 'martellato',
      accentIndices: [0],
      dynamicModifier: 'f',
      effect: 'clash_chord',
      capturedPiece
    };
  }

  if (isCastling) {
    return {
      type: 'castling_royal',
      relativeRhythms: [0.5, 0.5, 1.0],
      articulation: 'legato_pad',
      accentIndices: [0],
      dynamicModifier: 'mf'
    };
  }

  // 2. PIECE-SPECIFIC MOTIFS (Section 4)
  switch (p) {
    case 'p': // Piyon (1 Puan)
      if (distance >= 2) {
        // İlk Hamle İki Kare (e2-e4): ta-ta (2 adet Sekizlik)
        return {
          type: 'pawn_double_step',
          relativeRhythms: [0.5, 0.5],
          articulation: 'staccato',
          accentIndices: [0]
        };
      }
      // Tek Kare: Taa (1 Dörtlük staccato)
      return {
        type: 'pawn_single_step',
        relativeRhythms: [1.0],
        articulation: 'staccato_pizz',
        accentIndices: []
      };

    case 'n': // At (3 Puan) - Sıçrama: Taa-ta-ta (1 Sekizlik + 2 Onaltılık)
      return {
        type: 'knight_trochee',
        relativeRhythms: [0.5, 0.25, 0.25],
        articulation: 'spiccato_pizz',
        accentIndices: [0]
      };

    case 'b': // Fil (3 Puan)
      if (distance >= 4) {
        // Uzun Menzil (≥4 Kare): Sekizlik Arpej Zinciri (ta-ta-ta-ta...)
        const count = Math.min(distance, 6);
        return {
          type: 'bishop_arpeggio_chain',
          relativeRhythms: new Array(count).fill(0.5 / (count / 2)),
          articulation: 'legato_arpeggio',
          accentIndices: [0]
        };
      }
      // Kısa Menzil (2-3 Kare): ta-ta-Taa (2 Onaltılık + 1 Dörtlük)
      return {
        type: 'bishop_short_glide',
        relativeRhythms: [0.25, 0.25, 1.0],
        articulation: 'legato',
        accentIndices: [2]
      };

    case 'r': // Kale (5 Puan) - Taaam - Taaam (2 Ağır Dörtlük / Yatay Glissando)
      if (distance >= 4) {
        const count = Math.min(distance, 6);
        return {
          type: 'rook_glissando_corridor',
          relativeRhythms: new Array(count).fill(1.0 / count),
          articulation: 'detache_heavy',
          accentIndices: [0, count - 1]
        };
      }
      return {
        type: 'rook_heavy_march',
        relativeRhythms: [1.0, 1.0],
        articulation: 'detache_heavy',
        accentIndices: [0, 1]
      };

    case 'q': // Vezir (8 Puan) - 8'li Onaltılık Şelalesi + Crescendo
      return {
        type: 'queen_waterfall_cascade',
        relativeRhythms: [0.125, 0.125, 0.125, 0.125, 0.125, 0.125, 0.125, 0.125],
        articulation: 'legato_crescendo',
        accentIndices: [0, 7],
        dynamicModifier: 'crescendo'
      };

    case 'k': // Şah - Orkestral Derece Akoru (Legato Pad)
    default:
      return {
        type: 'king_degree_pad',
        relativeRhythms: [2.0],
        articulation: 'legato_pad_chord',
        accentIndices: [0],
        effect: 'king_pad'
      };
  }
}
