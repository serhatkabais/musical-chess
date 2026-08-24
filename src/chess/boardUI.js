/**
 * Chessboard UI & Rendering Module
 */

import { getSquareNote } from '../audio/noteMapping.js';

// Unicode chess symbols
export const PIECE_UNICODE = {
  p: '♟',
  n: '♞',
  b: '♝',
  r: '♜',
  q: '♛',
  k: '♚',
  P: '♙',
  N: '♘',
  B: '♗',
  R: '♖',
  Q: '♕',
  K: '♔'
};

export class BoardUI {
  constructor(boardContainerEl, options = {}) {
    this.container = boardContainerEl;
    this.onSquareClick = options.onSquareClick || (() => {});
    this.onPieceDrop = options.onPieceDrop || (() => {});
    
    this.selectedSquare = null;
    this.legalMoves = [];
    this.showNoteLabels = true;
    this.draggedFromSquare = null;

    this.renderGrid();
  }

  /**
   * Initializes the 8x8 squares grid
   */
  renderGrid() {
    this.container.innerHTML = '';
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

    // Rank 8 down to Rank 1 (standard chess orientation)
    for (let r = 8; r >= 1; r--) {
      for (let f = 0; f < 8; f++) {
        const squareName = `${files[f]}${r}`;
        const isLight = (f + r) % 2 !== 0;

        const squareEl = document.createElement('div');
        squareEl.className = `square ${isLight ? 'light' : 'dark'}`;
        squareEl.dataset.square = squareName;

        // Note Label
        const noteInfo = getSquareNote(squareName);
        const labelEl = document.createElement('span');
        labelEl.className = 'sq-note-label';
        labelEl.textContent = noteInfo.noteName;
        squareEl.appendChild(labelEl);

        // Click handler
        squareEl.addEventListener('click', (e) => {
          this.onSquareClick(squareName, squareEl);
        });

        // Drag & drop handlers
        squareEl.addEventListener('dragover', (e) => e.preventDefault());
        squareEl.addEventListener('drop', (e) => {
          e.preventDefault();
          if (this.draggedFromSquare && this.draggedFromSquare !== squareName) {
            this.onPieceDrop(this.draggedFromSquare, squareName);
          }
          this.draggedFromSquare = null;
        });

        this.container.appendChild(squareEl);
      }
    }
  }

  /**
   * Updates pieces on the board based on chess.js board 2D array
   * @param {Array<Array<{ type: string, color: 'w'|'b' }|null>>} boardState 
   */
  updatePieces(boardState) {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const rankNum = 8 - r;
        const squareName = `${files[f]}${rankNum}`;
        const squareEl = this.getSquareElement(squareName);
        if (!squareEl) continue;

        // Clear existing piece element
        const existingPiece = squareEl.querySelector('.piece');
        if (existingPiece) {
          existingPiece.remove();
        }

        const piece = boardState[r][f];
        if (piece) {
          const pieceEl = document.createElement('div');
          const symbolKey = piece.color === 'w' ? piece.type.toUpperCase() : piece.type.toLowerCase();
          pieceEl.className = `piece ${piece.color === 'w' ? 'white' : 'black'}`;
          pieceEl.textContent = PIECE_UNICODE[symbolKey] || '';
          pieceEl.draggable = true;

          pieceEl.addEventListener('dragstart', (e) => {
            this.draggedFromSquare = squareName;
            e.dataTransfer.setData('text/plain', squareName);
          });

          squareEl.appendChild(pieceEl);
        }
      }
    }
  }

  getSquareElement(square) {
    return this.container.querySelector(`.square[data-square="${square}"]`);
  }

  /**
   * Highlights selected square and valid destinations
   */
  highlightLegalMoves(fromSquare, legalMoves) {
    this.clearHighlights();
    this.selectedSquare = fromSquare;
    this.legalMoves = legalMoves;

    const fromEl = this.getSquareElement(fromSquare);
    if (fromEl) fromEl.classList.add('selected');

    legalMoves.forEach(move => {
      const sqEl = this.getSquareElement(move.to);
      if (sqEl) {
        if (move.captured) {
          sqEl.classList.add('legal-capture');
        } else {
          sqEl.classList.add('legal-move');
        }
      }
    });
  }

  clearHighlights() {
    this.selectedSquare = null;
    this.legalMoves = [];
    this.container.querySelectorAll('.square').forEach(sq => {
      sq.classList.remove('selected', 'legal-move', 'legal-capture');
    });
  }

  /**
   * Set last move highlight & sound wave ripple animation
   */
  showMoveAnimation(from, to) {
    this.container.querySelectorAll('.square.last-move').forEach(sq => sq.classList.remove('last-move'));

    const fromEl = this.getSquareElement(from);
    const toEl = this.getSquareElement(to);

    if (fromEl) fromEl.classList.add('last-move');
    if (toEl) {
      toEl.classList.add('last-move', 'sound-ripple');
      setTimeout(() => {
        toEl.classList.remove('sound-ripple');
      }, 800);
    }
  }

  /**
   * Pulse a square during music playback
   */
  pulseSquare(square) {
    const el = this.getSquareElement(square);
    if (el) {
      el.classList.add('sound-ripple');
      setTimeout(() => el.classList.remove('sound-ripple'), 500);
    }
  }

  toggleNoteLabels(show) {
    this.showNoteLabels = show;
    if (show) {
      this.container.classList.remove('hide-notes');
    } else {
      this.container.classList.add('hide-notes');
    }
  }

  refreshNoteLabels() {
    this.container.querySelectorAll('.square').forEach(sqEl => {
      const squareName = sqEl.dataset.square;
      if (squareName) {
        const noteInfo = getSquareNote(squareName);
        const labelEl = sqEl.querySelector('.sq-note-label');
        if (labelEl) {
          labelEl.textContent = noteInfo.noteName;
        }
      }
    });
  }

  setTheme(themeName) {
    this.container.className = `chessboard ${themeName} ${this.showNoteLabels ? '' : 'hide-notes'}`;
  }
}
