/**
 * Rhythm Motif Engine & Tactical Priority Generator
 * 
 * Taktik Hiyerarşi:
 * capture > check > fork/pin > retreat > normal_move
 * 
 * Relative Rhythm Motoru: Mutlak zamandan bağımsız oransal ritim dilimleri üretir.
 */

export function generateMoveMotif(moveData) {
  const { piece, distance, isCapture, isCheck, isMate, isCastling, isRetreat } = moveData;
  const p = (piece || 'p').toLowerCase();

  // 1. COMPOSITE MOTIF: CAPTURE + CHECK (Dotted attack -> syncopated accent -> sustained target chord)
  if (isCapture && isCheck) {
    return {
      type: 'composite_capture_check',
      relativeRhythms: [0.75, 0.25, 1.0], // Dotted 8th + 16th + Quarter sustained
      articulation: 'marcato-legato',
      accentIndices: [0, 1]
    };
  }

  // 2. CHECK / MATE MOTIF
  if (isMate) {
    return {
      type: 'mate_tutti',
      relativeRhythms: [1.0, 1.0, 2.0], // Majestic grand finale
      articulation: 'tutti-grandioso',
      accentIndices: [0, 1, 2]
    };
  }

  if (isCheck) {
    return {
      type: 'check_accent',
      relativeRhythms: [0.5, 0.5, 1.0], // Staccato burst into sustained warning
      articulation: 'staccatissimo',
      accentIndices: [0, 2]
    };
  }

  // 3. CAPTURE MOTIF
  if (isCapture) {
    return {
      type: 'capture_burst',
      relativeRhythms: [0.25, 0.25, 0.5], // Fast attack with impact
      articulation: 'martellato',
      accentIndices: [0]
    };
  }

  // 4. CASTLING (Rok - Royal Shift)
  if (isCastling) {
    return {
      type: 'castling_duo',
      relativeRhythms: [0.5, 0.5, 1.0],
      articulation: 'legatissimo',
      accentIndices: [0]
    };
  }

  // 5. RETREAT (Geri Çekilme / Savunma)
  if (isRetreat) {
    return {
      type: 'retreat_glide',
      relativeRhythms: [0.5, 1.0], // Hesitant step back
      articulation: 'tenuto',
      accentIndices: []
    };
  }

  // 6. PIECE-SPECIFIC MOTIFS
  switch (p) {
    case 'p': // Pawn: [1/4]
      return {
        type: 'pawn_step',
        relativeRhythms: [1.0],
        articulation: 'pizzicato',
        accentIndices: []
      };

    case 'n': // Knight: [1/8, 1/16, 1/16] - Galloping trochee
      return {
        type: 'knight_gallop',
        relativeRhythms: [0.5, 0.25, 0.25],
        articulation: 'leggiero-staccato',
        accentIndices: [0]
      };

    case 'b': // Bishop: Short/Medium sliding [1/16, 1/16, 1/4]
      return {
        type: 'bishop_glide',
        relativeRhythms: distance > 3 ? [0.25, 0.25, 0.25, 0.75] : [0.25, 0.25, 1.0],
        articulation: 'legato',
        accentIndices: [0]
      };

    case 'r': // Rook: Heavy direct advance
      if (distance >= 4) {
        // Long-range sliding: [1/16 x path_length]
        const count = Math.min(distance, 6);
        const r = new Array(count).fill(1.0 / count);
        return {
          type: 'rook_long_slide',
          relativeRhythms: r,
          articulation: 'pesante',
          accentIndices: [0, count - 1]
        };
      }
      return {
        type: 'rook_march',
        relativeRhythms: [0.5, 0.5],
        articulation: 'marziale',
        accentIndices: [0]
      };

    case 'q': // Queen: Majestic royal sweep
      if (distance >= 4) {
        return {
          type: 'queen_fanfare',
          relativeRhythms: [0.25, 0.25, 0.25, 0.25, 1.0],
          articulation: 'brillante',
          accentIndices: [0, 4]
        };
      }
      return {
        type: 'queen_sweep',
        relativeRhythms: [0.5, 0.5, 1.0],
        articulation: 'espressivo',
        accentIndices: [0]
      };

    case 'k': // King: [whole]
    default:
      return {
        type: 'king_gravitas',
        relativeRhythms: [2.0],
        articulation: 'nobilmente',
        accentIndices: [0]
      };
  }
}
