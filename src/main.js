/**
 * Musical Chess Main Application Entry Point
 */

import { ChessGame } from './chess/chessGame.js';
import { BoardUI } from './chess/boardUI.js';
import { soundEngine } from './audio/soundEngine.js';
import { getSquareNote, PIECE_DURATIONS, setScaleMode } from './audio/noteMapping.js';
import { downloadMidiFile } from './audio/midiExporter.js';
import { setTimeSignature, getTimeSignature } from './audio/timeSignatures.js';
import { FAMOUS_GAMES } from './chess/famousGames.js';

class App {
  constructor() {
    this.game = new ChessGame();
    this.boardEl = document.getElementById('chessboard');
    this.boardUI = new BoardUI(this.boardEl, {
      onSquareClick: (sq) => this.handleSquareClick(sq),
      onPieceDrop: (from, to) => this.handlePieceDrop(from, to)
    });

    this.isPlayingSong = false;
    this.songPlaybackTimer = null;
    this.pendingPromotion = null;
    this.currentTimeSignature = '4/4';

    // Master Games State
    this.selectedFamousGame = FAMOUS_GAMES[0];
    this.masterCurrentMoveIndex = 0;
    this.isMasterPlaying = false;
    this.masterTimer = null;

    this.initUI();
    this.initMasterGamesUI();
    this.updateGameState();
  }

  initUI() {
    // 1. Controls & Header
    document.getElementById('btn-new-game').addEventListener('click', () => this.startNewGame());
    
    const btnSound = document.getElementById('btn-toggle-sound');
    btnSound.addEventListener('click', () => {
      const isMuted = soundEngine.toggleMute();
      btnSound.classList.toggle('active', !isMuted);
      btnSound.querySelector('.icon').textContent = isMuted ? '🔇' : '🔊';
    });

    const btnLabels = document.getElementById('btn-toggle-labels');
    btnLabels.addEventListener('click', () => {
      const isShowing = !this.boardUI.showNoteLabels;
      this.boardUI.toggleNoteLabels(isShowing);
      btnLabels.classList.toggle('active', isShowing);
    });

    // 2. Müzikal Skala / Gam Seçici
    const selectScale = document.getElementById('select-scale-mode');
    if (selectScale) {
      selectScale.addEventListener('change', (e) => {
        setScaleMode(e.target.value);
        this.boardUI.refreshNoteLabels();
      });
    }

    // 3. Armoni, Düet ve Ritm Ayarları
    const checkAccompaniment = document.getElementById('check-accompaniment');
    if (checkAccompaniment) {
      checkAccompaniment.addEventListener('change', (e) => {
        soundEngine.setAccompaniment(e.target.checked);
      });
    }

    const checkQuantized = document.getElementById('check-quantized');
    if (checkQuantized) {
      checkQuantized.addEventListener('change', (e) => {
        soundEngine.setQuantizedFlow(e.target.checked);
      });
    }

    const checkDuet = document.getElementById('check-duet');
    const duetGroup = document.getElementById('duet-instruments-group');
    const singleGroup = document.getElementById('single-instrument-group');
    const selectWhiteInst = document.getElementById('select-white-inst');
    const selectBlackInst = document.getElementById('select-black-inst');

    const updateDuet = () => {
      const isDuet = checkDuet ? checkDuet.checked : true;
      if (duetGroup) duetGroup.classList.toggle('hidden', !isDuet);
      if (singleGroup) singleGroup.classList.toggle('hidden', isDuet);
      soundEngine.setDuetMode(
        isDuet,
        selectWhiteInst ? selectWhiteInst.value : 'piano',
        selectBlackInst ? selectBlackInst.value : 'electric-piano'
      );
    };

    if (checkDuet) checkDuet.addEventListener('change', updateDuet);
    if (selectWhiteInst) selectWhiteInst.addEventListener('change', updateDuet);
    if (selectBlackInst) selectBlackInst.addEventListener('change', updateDuet);

    const selectInst = document.getElementById('select-instrument');
    if (selectInst) {
      selectInst.addEventListener('change', (e) => soundEngine.setInstrument(e.target.value));
    }

    const inputTempo = document.getElementById('input-tempo');
    const bpmVal = document.getElementById('bpm-val');
    inputTempo.addEventListener('input', (e) => {
      const bpm = parseInt(e.target.value, 10);
      bpmVal.textContent = bpm;
      soundEngine.setTempo(bpm);
    });

    const inputVol = document.getElementById('input-volume');
    const volVal = document.getElementById('vol-val');
    inputVol.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      volVal.textContent = `${val}%`;
      soundEngine.setVolume(val / 100);
    });

    const inputReverb = document.getElementById('input-reverb');
    const reverbVal = document.getElementById('reverb-val');
    inputReverb.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      reverbVal.textContent = `${val}%`;
      soundEngine.setReverbLevel(val / 100);
    });

    // 3. Game Mode & Theme
    const selectMode = document.getElementById('select-mode');
    selectMode.addEventListener('change', (e) => {
      this.game.mode = e.target.value;
      this.startNewGame();
    });

    const selectTheme = document.getElementById('select-theme');
    selectTheme.addEventListener('change', (e) => {
      this.boardUI.setTheme(e.target.value);
    });

    const selectMidiOut = document.getElementById('select-midi-out');
    selectMidiOut.addEventListener('change', (e) => {
      soundEngine.setMidiOutput(e.target.value);
    });

    // 4. Zaman Ölçüsü Seçici (Time Signature)
    const selectTimeSig = document.getElementById('select-time-signature');
    if (selectTimeSig) {
      selectTimeSig.addEventListener('change', (e) => {
        this.currentTimeSignature = e.target.value;
        setTimeSignature(e.target.value);
        soundEngine.setTimeSignature(e.target.value);
      });
    }

    // 5. Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        const tabId = btn.dataset.tab;
        const content = document.getElementById(tabId);
        if (content) content.classList.add('active');
      });
    });

    // 6. Playback & Export Buttons
    document.getElementById('btn-play-song').addEventListener('click', () => this.playSong());
    document.getElementById('btn-stop-song').addEventListener('click', () => this.stopSong());

    // Multi-version MIDI export buttons (2/4, 3/4, 4/4)
    document.querySelectorAll('.btn-export-version').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = btn.dataset.target;
        const sig = btn.dataset.sig || '4/4';
        
        if (target === 'master') {
          this.exportMasterGameMidi(sig);
        } else {
          if (this.game.moveHistory.length === 0) {
            alert('Henüz hamle yapılmadı! Lütfen tahtada birkaç hamle oynayın.');
            return;
          }
          downloadMidiFile(this.game.moveHistory, soundEngine.tempo, sig, 'my_chess_composition');
        }
      });
    });

    // 7. Promotion Modal
    document.querySelectorAll('.choice-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const piece = btn.dataset.piece;
        this.completePromotion(piece);
      });
    });
  }

  startNewGame() {
    this.stopSong();
    this.game.reset();
    this.boardUI.clearHighlights();
    this.updateGameState();
    this.updateTimeline();
    this.setAlert('');
  }

  handleSquareClick(square) {
    if (this.isPlayingSong) return;

    // Free Play Mode: Simply play note of the square with a default quarter note
    if (this.game.mode === 'free-play') {
      soundEngine.playMoveNote(square, 'b');
      this.boardUI.pulseSquare(square);
      const note = getSquareNote(square);
      this.updateNowPlaying(note.noteName, square, 'Serbest Nota (1/4\'lük)', 0.5);
      return;
    }

    if (this.game.isAiThinking) return;

    // If a square is already selected
    if (this.boardUI.selectedSquare) {
      const from = this.boardUI.selectedSquare;
      const to = square;

      if (from === to) {
        this.boardUI.clearHighlights();
        return;
      }

      // Check if it's a legal move
      const isLegal = this.boardUI.legalMoves.some(m => m.to === to);
      if (isLegal) {
        this.attemptMove(from, to);
        return;
      }
    }

    // Try selecting pieces of the current turn
    const legalMoves = this.game.getLegalMoves(square);
    if (legalMoves.length > 0) {
      this.boardUI.highlightLegalMoves(square, legalMoves);
      // Play brief preview note for square
      const note = getSquareNote(square);
      soundEngine.playMoveNote(square, 'p');
      this.updateNowPlaying(note.noteName, square, 'Kare Seçildi', 0.2);
    } else {
      this.boardUI.clearHighlights();
    }
  }

  handlePieceDrop(from, to) {
    if (this.isPlayingSong || this.game.isAiThinking || this.game.mode === 'free-play') return;
    this.attemptMove(from, to);
  }

  attemptMove(from, to) {
    // Check for pawn promotion (white pawn reaching rank 8 or black pawn reaching rank 1)
    const pieceOnFrom = this.getPieceAtSquare(from);
    if (pieceOnFrom && pieceOnFrom.type === 'p') {
      if ((pieceOnFrom.color === 'w' && to.endsWith('8')) || (pieceOnFrom.color === 'b' && to.endsWith('1'))) {
        this.pendingPromotion = { from, to };
        document.getElementById('promotion-modal').classList.remove('hidden');
        return;
      }
    }

    this.executeMove(from, to, 'q');
  }

  completePromotion(pieceType) {
    document.getElementById('promotion-modal').classList.add('hidden');
    if (this.pendingPromotion) {
      const { from, to } = this.pendingPromotion;
      this.pendingPromotion = null;
      this.executeMove(from, to, pieceType);
    }
  }

  getPieceAtSquare(square) {
    const file = square.charCodeAt(0) - 'a'.charCodeAt(0);
    const rank = 8 - parseInt(square[1], 10);
    const board = this.game.getBoard();
    return board[rank] ? board[rank][file] : null;
  }

  executeMove(from, to, promotion = 'q') {
    const moveResult = this.game.makeMove(from, to, promotion);

    if (moveResult) {
      this.boardUI.clearHighlights();
      this.boardUI.showMoveAnimation(from, to);

      // Play Sound
      const isCapture = Boolean(moveResult.captured);
      soundEngine.playMoveNote(to, moveResult.piece, isCapture, moveResult.color);

      // Update Now Playing HUD
      const note = moveResult.noteInfo;
      const dur = moveResult.durationInfo;
      const pieceName = dur.name;
      const pieceLabel = dur.label;
      this.updateNowPlaying(
        note.noteName,
        `Hamle: ${moveResult.san} (${to.toUpperCase()})`,
        `${pieceName} - ${pieceLabel} (${note.solfege})`,
        dur.beats * (60 / soundEngine.tempo)
      );

      this.updateGameState();
      this.updateTimeline();

      // Check / Mate sounds
      if (this.game.inCheckmate()) {
        soundEngine.playAlertSound('mate');
        this.setAlert('ŞAH MAT! Oyun Bitti.', true);
        return;
      } else if (this.game.inCheck()) {
        soundEngine.playAlertSound('check');
        this.setAlert('ŞAH!', true);
      } else {
        this.setAlert('');
      }

      // If AI mode and it's Black's turn, trigger bot move
      if ((this.game.mode === 'ai-easy' || this.game.mode === 'ai-med') && this.game.getTurn() === 'b' && !this.game.isGameOver()) {
        this.triggerAiMove();
      }
    } else {
      this.boardUI.clearHighlights();
    }
  }

  triggerAiMove() {
    this.game.isAiThinking = true;
    document.getElementById('turn-text').textContent = 'Sıra: Yapay Zeka Düşünüyor...';

    setTimeout(() => {
      const bestMove = this.game.getBestAiMove();
      this.game.isAiThinking = false;

      if (bestMove) {
        this.executeMove(bestMove.from, bestMove.to, bestMove.promotion || 'q');
      }
    }, 600);
  }

  updateGameState() {
    this.boardUI.updatePieces(this.game.getBoard());

    const turn = this.game.getTurn();
    const turnDot = document.getElementById('turn-dot');
    const turnText = document.getElementById('turn-text');

    if (turn === 'w') {
      turnDot.className = 'turn-dot white';
      turnText.textContent = 'Sıra: Beyaz';
    } else {
      turnDot.className = 'turn-dot black';
      turnText.textContent = 'Sıra: Siyah';
    }

    if (this.game.isGameOver()) {
      if (this.game.inCheckmate()) {
        turnText.textContent = `Mat! Kazanan: ${turn === 'w' ? 'Siyah' : 'Beyaz'}`;
      } else if (this.game.inDraw()) {
        turnText.textContent = 'Berabere (Pat / Yetersiz Materyal)';
      }
    }

    // PGN Update
    const pgnEl = document.getElementById('pgn-display');
    const pgn = this.game.getPgn();
    pgnEl.textContent = pgn || 'Oyun başladığında hamleler burada listelenir.';
  }

  updateTimeline() {
    const timelineEl = document.getElementById('moves-timeline');
    const badgeEl = document.getElementById('move-count-badge');
    const history = this.game.moveHistory;

    badgeEl.textContent = `${history.length} Nota`;

    if (history.length === 0) {
      timelineEl.innerHTML = '<div class="empty-timeline">Henüz hamle yapılmadı. Taş oynattıkça notalar buraya dizilecek!</div>';
      return;
    }

    timelineEl.innerHTML = '';
    history.forEach((m, idx) => {
      const chip = document.createElement('div');
      chip.className = 'timeline-note-chip';
      chip.dataset.index = idx;
      chip.innerHTML = `
        <span class="chip-note">${m.noteInfo.noteName}</span>
        <span class="chip-move">${m.san}</span>
        <span class="chip-dur">${m.durationInfo.label}</span>
      `;
      chip.addEventListener('click', () => {
        soundEngine.playMoveNote(m.to, m.piece);
        this.boardUI.pulseSquare(m.to);
      });
      timelineEl.appendChild(chip);
    });

    timelineEl.scrollTop = timelineEl.scrollHeight;
  }

  updateNowPlaying(noteName, title, sub, durationSec) {
    document.getElementById('np-note').textContent = noteName;
    document.getElementById('np-title').textContent = title;
    document.getElementById('np-sub').textContent = sub;

    const waveEl = document.getElementById('np-wave');
    waveEl.classList.add('active');
    setTimeout(() => {
      waveEl.classList.remove('active');
    }, Math.max(durationSec * 1000, 400));
  }

  setAlert(text, isCheck = false) {
    const alertEl = document.getElementById('game-alert');
    alertEl.textContent = text;
    alertEl.className = isCheck ? 'game-alert check' : 'game-alert';
  }

  /**
   * Melodic Playback of the whole game sequence
   */
  async playSong() {
    const history = this.game.moveHistory;
    if (history.length === 0) {
      alert('Bestelenecek hamle yok! Lütfen önce birkaç hamle yapın.');
      return;
    }

    this.isPlayingSong = true;
    document.getElementById('btn-play-song').disabled = true;
    document.getElementById('btn-stop-song').disabled = false;

    let index = 0;

    const playNext = () => {
      if (!this.isPlayingSong || index >= history.length) {
        this.stopSong();
        return;
      }

      const move = history[index];
      const durSec = PIECE_DURATIONS[move.piece] ? PIECE_DURATIONS[move.piece].beats * (60 / soundEngine.tempo) : 0.5;

      // Pulse square & play note
      soundEngine.playMoveNote(move.to, move.piece, Boolean(move.captured), move.color);
      this.boardUI.pulseSquare(move.to);

      // Highlight timeline chip
      document.querySelectorAll('.timeline-note-chip').forEach(c => c.classList.remove('playing'));
      const activeChip = document.querySelector(`.timeline-note-chip[data-index="${index}"]`);
      if (activeChip) {
        activeChip.classList.add('playing');
        activeChip.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }

      this.updateNowPlaying(
        move.noteInfo.noteName,
        `Replay: ${move.san} (${move.to.toUpperCase()})`,
        `${move.durationInfo.name} - ${move.durationInfo.label}`,
        durSec
      );

      index++;
      this.songPlaybackTimer = setTimeout(playNext, durSec * 1000);
    };

    playNext();
  }

  stopSong() {
    this.isPlayingSong = false;
    if (this.songPlaybackTimer) {
      clearTimeout(this.songPlaybackTimer);
      this.songPlaybackTimer = null;
    }
    document.getElementById('btn-play-song').disabled = false;
    document.getElementById('btn-stop-song').disabled = true;
    document.querySelectorAll('.timeline-note-chip').forEach(c => c.classList.remove('playing'));
  }

  // ==========================================
  // MASTER GAMES (USTA MAÇLARI) CONTROLLER
  // ==========================================
  initMasterGamesUI() {
    const selectEl = document.getElementById('select-famous-game');
    if (!selectEl) return;

    selectEl.innerHTML = '';
    FAMOUS_GAMES.forEach((g) => {
      const opt = document.createElement('option');
      opt.value = g.id;
      opt.textContent = `🏆 ${g.title} (${g.year})`;
      selectEl.appendChild(opt);
    });

    selectEl.addEventListener('change', (e) => {
      const match = FAMOUS_GAMES.find(g => g.id === e.target.value);
      if (match) {
        this.loadFamousGame(match);
      }
    });

    // Master buttons
    document.getElementById('btn-master-play').addEventListener('click', () => this.toggleMasterPlay());
    document.getElementById('btn-master-prev').addEventListener('click', () => this.stepMasterMove(-1));
    document.getElementById('btn-master-next').addEventListener('click', () => this.stepMasterMove(1));
    document.getElementById('btn-master-reset').addEventListener('click', () => this.resetMasterGame());
    
    const slider = document.getElementById('master-progress-slider');
    slider.addEventListener('input', (e) => {
      const targetIndex = parseInt(e.target.value, 10);
      this.seekMasterMove(targetIndex);
    });

    document.getElementById('btn-master-export-midi').addEventListener('click', () => {
      if (!this.selectedFamousGame) return;
      this.exportMasterGameMidi();
    });

    // Load initial game
    this.loadFamousGame(this.selectedFamousGame);
  }

  loadFamousGame(game) {
    this.stopMasterPlay();
    this.selectedFamousGame = game;
    this.masterCurrentMoveIndex = 0;

    // Update Info Card
    document.getElementById('match-title').textContent = game.title;
    document.getElementById('match-meta').textContent = `${game.white} vs. ${game.black} (${game.year}, ${game.event})`;
    document.getElementById('match-opening').textContent = `Açılış: ${game.opening}`;
    document.getElementById('match-desc').textContent = game.description;

    document.getElementById('master-total-moves').textContent = game.moves.length;
    document.getElementById('master-move-num').textContent = '0';

    const slider = document.getElementById('master-progress-slider');
    slider.max = game.moves.length;
    slider.value = 0;

    this.resetMasterGame();
  }

  resetMasterGame() {
    this.stopMasterPlay();
    this.masterCurrentMoveIndex = 0;
    this.game.reset();
    this.boardUI.clearHighlights();
    this.updateGameState();
    this.updateTimeline();
    this.updateMasterProgressUI();
  }

  updateMasterProgressUI() {
    document.getElementById('master-move-num').textContent = this.masterCurrentMoveIndex;
    const slider = document.getElementById('master-progress-slider');
    if (slider) slider.value = this.masterCurrentMoveIndex;
  }

  toggleMasterPlay() {
    if (this.isMasterPlaying) {
      this.stopMasterPlay();
    } else {
      this.startMasterPlay();
    }
  }

  startMasterPlay() {
    if (!this.selectedFamousGame) return;
    this.isMasterPlaying = true;

    const playBtn = document.getElementById('btn-master-play');
    playBtn.innerHTML = '<span class="icon">⏸</span> Duraklat';
    document.getElementById('master-status-badge').textContent = 'Çalıyor...';

    const playNext = () => {
      if (!this.isMasterPlaying) return;

      if (this.masterCurrentMoveIndex >= this.selectedFamousGame.moves.length) {
        this.stopMasterPlay();
        document.getElementById('master-status-badge').textContent = 'Tamamlandı';
        return;
      }

      const playedMove = this.stepMasterMove(1);
      const piece = playedMove ? playedMove.piece : 'p';
      const durSec = PIECE_DURATIONS[piece] ? PIECE_DURATIONS[piece].beats * (60 / soundEngine.tempo) : 0.4;

      this.masterTimer = setTimeout(playNext, Math.max(durSec * 1000, 300));
    };

    playNext();
  }

  stopMasterPlay() {
    this.isMasterPlaying = false;
    if (this.masterTimer) {
      clearTimeout(this.masterTimer);
      this.masterTimer = null;
    }
    const playBtn = document.getElementById('btn-master-play');
    if (playBtn) playBtn.innerHTML = '<span class="icon">▶</span> Otomatik Oynat';
    const badge = document.getElementById('master-status-badge');
    if (badge) badge.textContent = 'Duraklatıldı';
  }

  stepMasterMove(direction) {
    const moves = this.selectedFamousGame.moves;

    if (direction === 1) {
      if (this.masterCurrentMoveIndex < moves.length) {
        const nextMove = moves[this.masterCurrentMoveIndex];
        const res = this.game.makeMove(nextMove.from, nextMove.to, nextMove.promotion || 'q');
        
        if (res) {
          this.boardUI.showMoveAnimation(nextMove.from, nextMove.to);
          soundEngine.playMoveNote(nextMove.to, res.piece, Boolean(res.captured), res.color);

          const note = res.noteInfo;
          const dur = res.durationInfo;
          this.updateNowPlaying(
            note.noteName,
            `Usta Hamlesi: ${res.san} (${nextMove.to.toUpperCase()})`,
            `${dur.name} - ${dur.label} (${note.solfege})`,
            dur.beats * (60 / soundEngine.tempo)
          );

          this.masterCurrentMoveIndex++;
          this.updateGameState();
          this.updateTimeline();
          this.updateMasterProgressUI();
          return res;
        }
      }
    } else if (direction === -1) {
      if (this.masterCurrentMoveIndex > 0) {
        this.seekMasterMove(this.masterCurrentMoveIndex - 1);
      }
    }
    return null;
  }

  seekMasterMove(targetIndex) {
    this.stopMasterPlay();
    const moves = this.selectedFamousGame.moves;
    const boundedIndex = Math.max(0, Math.min(targetIndex, moves.length));

    this.game.reset();
    for (let i = 0; i < boundedIndex; i++) {
      const m = moves[i];
      this.game.makeMove(m.from, m.to, m.promotion || 'q');
    }

    this.masterCurrentMoveIndex = boundedIndex;
    this.boardUI.clearHighlights();

    if (boundedIndex > 0) {
      const last = moves[boundedIndex - 1];
      this.boardUI.showMoveAnimation(last.from, last.to);
      const lastRecord = this.game.moveHistory[this.game.moveHistory.length - 1];
      if (lastRecord) {
        soundEngine.playMoveNote(last.to, lastRecord.piece, Boolean(lastRecord.captured), lastRecord.color);
        this.updateNowPlaying(
          lastRecord.noteInfo.noteName,
          `Usta Hamlesi: ${lastRecord.san}`,
          `${lastRecord.durationInfo.name} - ${lastRecord.durationInfo.label}`,
          0.3
        );
      }
    }

    this.updateGameState();
    this.updateTimeline();
    this.updateMasterProgressUI();
  }

  exportMasterGameMidi(timeSigId = '4/4') {
    // Generate full move history for this famous game
    const tempGame = new ChessGame();
    const moves = this.selectedFamousGame.moves;
    for (const m of moves) {
      tempGame.makeMove(m.from, m.to, m.promotion || 'q');
    }
    downloadMidiFile(tempGame.moveHistory, soundEngine.tempo, timeSigId, `${this.selectedFamousGame.id}_melody`);
  }
}

// Start app on DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});

