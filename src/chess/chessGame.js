/**
 * Chess Game Logic & History Controller
 */

import { getSquareNote, PIECE_DURATIONS } from '../audio/noteMapping.js';

export class ChessGame {
  constructor() {
    // Chess.js instance (loaded globally from CDN or fallback)
    this.chess = typeof window.Chess === 'function' ? new window.Chess() : null;
    this.mode = 'pvp'; // 'pvp', 'ai-easy', 'ai-med', 'free-play'
    this.moveHistory = []; // list of { move, san, from, to, piece, captured, color, noteInfo, duration }
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

  /**
   * Attempts to make a move
   * @param {string} from - e.g. "e2"
   * @param {string} to - e.g. "e4"
   * @param {string} promotion - 'q', 'r', 'b', 'n' (optional)
   * @returns {object|null} move object or null if illegal
   */
  makeMove(from, to, promotion = 'q') {
    if (!this.chess) return null;

    const moveObj = this.chess.move({
      from,
      to,
      promotion
    });

    if (moveObj) {
      const noteInfo = getSquareNote(to);
      const pieceType = moveObj.piece;
      const durationInfo = PIECE_DURATIONS[pieceType] || PIECE_DURATIONS.p;

      const record = {
        san: moveObj.san,
        from: moveObj.from,
        to: moveObj.to,
        piece: pieceType,
        captured: moveObj.captured || null,
        color: moveObj.color,
        flags: moveObj.flags,
        noteInfo,
        durationInfo,
        fen: this.chess.fen()
      };

      this.moveHistory.push(record);
      return record;
    }

    return null;
  }

  getPgn() {
    if (!this.chess) return '';
    return this.chess.pgn();
  }

  /**
   * Simple Bot AI Move Selection
   */
  getBestAiMove() {
    if (!this.chess || this.chess.game_over()) return null;

    const moves = this.chess.moves({ verbose: true });
    if (moves.length === 0) return null;

    if (this.mode === 'ai-easy') {
      // Random move
      const randomIndex = Math.floor(Math.random() * moves.length);
      return moves[randomIndex];
    }

    // Medium AI: captures & checks prioritized
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
      // Prefer center squares (e4, e5, d4, d5)
      if (['e4', 'e5', 'd4', 'd5'].includes(m.to)) {
        score += 2;
      }

      // Add a tiny random variance so it doesn't play identical games
      score += Math.random() * 2;

      if (score > bestScore) {
        bestScore = score;
        bestMove = m;
      }
    }

    return bestMove;
  }
}
