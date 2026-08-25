/**
 * Chess Game Logic & PGN Parser Controller
 */

import { getSquarePitch } from '../theory/squarePitchMapper.js';

export class ChessGame {
  constructor() {
    this.chess = typeof window.Chess === 'function' ? new window.Chess() : null;
    this.mode = 'pvp'; // 'pvp', 'ai-easy', 'ai-med', 'free-play'
    this.moveHistory = [];
    this.isAiThinking = false;
  }

  reset() {
    if (this.chess) {
      this.chess.reset();
    }
    this.moveHistory = [];
    this.isAiThinking = false;
  }

  getTurn() {
    if (!this.chess) return 'w';
    return this.chess.turn();
  }

  isGameOver() {
    if (!this.chess) return false;
    return this.chess.game_over();
  }

  inCheck() {
    if (!this.chess) return false;
    return this.chess.in_check();
  }

  inCheckmate() {
    if (!this.chess) return false;
    return this.chess.in_checkmate();
  }

  inDraw() {
    if (!this.chess) return false;
    return this.chess.in_draw();
  }

  getBoard() {
    if (!this.chess) return [];
    return this.chess.board();
  }

  getLegalMoves(square) {
    if (!this.chess) return [];
    return this.chess.moves({ square, verbose: true });
  }

  makeMove(from, to, promotion = 'q') {
    if (!this.chess) return null;

    const moveObj = this.chess.move({
      from,
      to,
      promotion
    });

    if (moveObj) {
      const pitchInfo = getSquarePitch(to);
      const record = {
        san: moveObj.san,
        from: moveObj.from,
        to: moveObj.to,
        piece: moveObj.piece,
        captured: moveObj.captured || null,
        color: moveObj.color,
        flags: moveObj.flags,
        pitchInfo,
        fen: this.chess.fen()
      };

      this.moveHistory.push(record);
      return record;
    }

    return null;
  }

  /**
   * Load game from PGN string
   * @param {string} pgnString 
   * @returns {boolean} success
   */
  loadPgn(pgnString) {
    if (!this.chess) return false;
    this.reset();

    const cleanPgn = pgnString.trim();
    const loaded = this.chess.load_pgn(cleanPgn);

    if (loaded) {
      // Reconstruct moveHistory array
      const historyVerbose = this.chess.history({ verbose: true });
      this.chess.reset();

      this.moveHistory = [];
      for (const m of historyVerbose) {
        this.makeMove(m.from, m.to, m.promotion || 'q');
      }
      return true;
    }
    return false;
  }

  getPgn() {
    if (!this.chess) return '';
    return this.chess.pgn();
  }

  getBestAiMove() {
    if (!this.chess || this.chess.game_over()) return null;

    const moves = this.chess.moves({ verbose: true });
    if (moves.length === 0) return null;

    if (this.mode === 'ai-easy') {
      const randomIndex = Math.floor(Math.random() * moves.length);
      return moves[randomIndex];
    }

    // Medium AI
    const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
    let bestScore = -9999;
    let bestMove = moves[0];

    for (const m of moves) {
      let score = 0;
      if (m.captured) {
        score += (pieceValues[m.captured] || 1) * 10;
      }
      if (m.san.includes('+')) {
        score += 5;
      }
      if (['e4', 'e5', 'd4', 'd5'].includes(m.to)) {
        score += 2;
      }
      score += Math.random() * 2;

      if (score > bestScore) {
        bestScore = score;
        bestMove = m;
      }
    }

    return bestMove;
  }
}
