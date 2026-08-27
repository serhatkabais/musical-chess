/**
 * Symphonic Strings & Makam Chess Composition Engine - Main Controller
 * (Complies fully with TEKNİK TASARIM MANİFESTOSU VE SİSTEM ŞARTNAMESİ)
 */

import { ChessGame } from './chess/chessGame.js';
import { BoardUI } from './chess/boardUI.js';
import { FAMOUS_GAMES } from './chess/famousGames.js';
import { quantumEventPool } from './audio/quantumEventPool.js';
import { symphonicSynth } from './audio/symphonicSynth.js';
import { downloadMidi, downloadMusicXml } from './audio/midiMusicXmlExporter.js';
import { MAKAMS } from './theory/makamEngine.js';

class App {
  constructor() {
    this.game = new ChessGame();
    this.boardEl = document.getElementById('chessboard');
    this.boardUI = new BoardUI(this.boardEl, {
      onSquareClick: (sq) => this.handleSquareClick(sq),
      onPieceDrop: (from, to) => this.handlePieceDrop(from, to)
    });

    // Composition Settings
    this.currentMakamId = 'rast';
    this.currentMeterId = '4/4';
    this.useRetroactiveTonic = true;
    this.bpm = 120;

    // Playback state
    this.isPlayingSong = false;
    this.songPlaybackTimer = null;
    this.pendingPromotion = null;

    // Master Games state
    this.selectedFamousGame = FAMOUS_GAMES[0];
    this.masterCurrentMoveIndex = 0;
    this.isMasterPlaying = false;
    this.masterTimer = null;

    this.initUI();
    this.initMasterGamesUI();
    this.updateGameState();
    this.updateCompositionTonicUI();
  }

  initUI() {
    // 1. Audio & Label Toggle
    const btnSound = document.getElementById('btn-toggle-sound');
    btnSound.addEventListener('click', () => {
      const isMuted = symphonicSynth.toggleMute();
      btnSound.classList.toggle('active', !isMuted);
      btnSound.innerHTML = `<span class="icon">${isMuted ? '🔇' : '🔊'}</span>`;
    });

    const btnLabels = document.getElementById('btn-toggle-labels');
    btnLabels.addEventListener('click', () => {
      const isShowing = !this.boardUI.showNoteLabels;
      this.boardUI.toggleNoteLabels(isShowing);
      btnLabels.classList.toggle('active', isShowing);
    });

    document.getElementById('btn-new-game').addEventListener('click', () => {
      this.startNewGame();
    });

    // 2. Makam & Tonalite Selector
    const selectMakam = document.getElementById('select-makam-mode');
    if (selectMakam) {
      selectMakam.addEventListener('change', (e) => {
        this.currentMakamId = e.target.value;
        this.updateCompositionTonicUI();
      });
    }

    // 3. Meter Adapter / Zaman Ölçüsü Selector
    const selectMeter = document.getElementById('select-time-signature');
    if (selectMeter) {
      selectMeter.addEventListener('change', (e) => {
        this.currentMeterId = e.target.value;
      });
    }

    // 4. Retroactive Tonic Toggle
    const checkRetro = document.getElementById('check-retroactive-mutation');
    if (checkRetro) {
      checkRetro.addEventListener('change', (e) => {
        this.useRetroactiveTonic = e.target.checked;
        this.updateCompositionTonicUI();
      });
    }

    // 5. Sliders (Tempo, Volume, Reverb)
    const inputTempo = document.getElementById('input-tempo');
    const bpmVal = document.getElementById('bpm-val');
    inputTempo.addEventListener('input', (e) => {
      this.bpm = parseInt(e.target.value, 10);
      bpmVal.textContent = this.bpm;
    });

    const inputVol = document.getElementById('input-volume');
    const volVal = document.getElementById('vol-val');
    inputVol.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      volVal.textContent = `${val}%`;
      symphonicSynth.setVolume(val / 100);
    });

    const inputReverb = document.getElementById('input-reverb');
    const reverbVal = document.getElementById('reverb-val');
    inputReverb.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      reverbVal.textContent = `${val}%`;
      symphonicSynth.setReverbLevel(val / 100);
    });

    // 6. Mode & Theme
    const selectMode = document.getElementById('select-mode');
    selectMode.addEventListener('change', (e) => {
      this.game.mode = e.target.value;
      this.startNewGame();
    });

    const selectTheme = document.getElementById('select-theme');
    selectTheme.addEventListener('change', (e) => {
      this.boardUI.setTheme(e.target.value);
    });

    // 7. Tabs
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

    // 8. Playback & Export Buttons
    document.getElementById('btn-play-song').addEventListener('click', () => this.playSong());
    document.getElementById('btn-stop-song').addEventListener('click', () => this.stopSong());

    document.querySelectorAll('.btn-export-version').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.target;
        const meterId = btn.dataset.sig || this.currentMeterId;
        if (target === 'master') {
          this.exportMasterMidi(meterId);
        } else {
          this.exportGameMidi(meterId);
        }
      });
    });

    const btnXmlMaster = document.getElementById('btn-export-xml-master');
    if (btnXmlMaster) {
      btnXmlMaster.addEventListener('click', () => this.exportMasterMusicXml());
    }

    const btnXmlGame = document.getElementById('btn-export-xml-game');
    if (btnXmlGame) {
      btnXmlGame.addEventListener('click', () => this.exportGameMusicXml());
    }

    // 9. Custom PGN Loader
    const btnLoadPgn = document.getElementById('btn-load-custom-pgn');
    const inputPgn = document.getElementById('input-custom-pgn');
    if (btnLoadPgn && inputPgn) {
      btnLoadPgn.addEventListener('click', () => {
        const text = inputPgn.value;
        if (!text.trim()) {
          alert('Lütfen geçerli bir PGN metni yapıştırın.');
          return;
        }
        const success = this.game.loadPgn(text);
        if (success) {
          this.updateGameState();
          this.updateTimeline();
          this.updateCompositionTonicUI();
          this.setAlert('PGN Başarıyla Yüklendi ve Senfoniye Dönüştürüldü! 🎼');
          document.querySelector('.tab-btn[data-tab="tab-history"]').click();
        } else {
          alert('PGN formatı okunamadı. Lütfen standart PGN hamle formatını kontrol edin.');
        }
      });
    }

    // 10. Promotion Modal
    document.querySelectorAll('.choice-btn').forEach(btn => {
      btn.addEventListener('click', () => {
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
    this.updateCompositionTonicUI();
    this.setAlert('');
  }

  handleSquareClick(square) {
    if (this.isPlayingSong) return;

    if (this.game.mode === 'free-play') {
      quantumEventPool.buildFromGame([{ from: square, to: square, piece: 'q', san: square }]);
      const rendered = quantumEventPool.renderComposition({
        makamId: this.currentMakamId,
        meterId: this.currentMeterId,
        bpm: this.bpm,
        useRetroactiveTonic: false
      });
      if (rendered[0]) {
        symphonicSynth.playRenderedEvent(rendered[0]);
        this.boardUI.pulseSquare(square);
        this.updateNowPlaying(rendered[0]);
      }
      return;
    }

    if (this.boardUI.selectedSquare === null) {
      const piece = this.getPieceOnSquare(square);
      if (!piece) return;
      if (piece.color !== this.game.getTurn()) return;

      const legalMoves = this.game.getLegalMoves(square);
      if (legalMoves.length > 0) {
        this.boardUI.highlightLegalMoves(square, legalMoves);
      }
    } else {
      const from = this.boardUI.selectedSquare;
      const to = square;

      if (from === to) {
        this.boardUI.clearHighlights();
        return;
      }

      const isLegal = this.boardUI.legalMoves.some(m => m.to === to);
      if (isLegal) {
        if (this.isPromotionMove(from, to)) {
          this.pendingPromotion = { from, to };
          this.showPromotionModal();
        } else {
          this.executePlayerMove(from, to, 'q');
        }
      } else {
        const piece = this.getPieceOnSquare(square);
        if (piece && piece.color === this.game.getTurn()) {
          const legalMoves = this.game.getLegalMoves(square);
          this.boardUI.highlightLegalMoves(square, legalMoves);
        } else {
          this.boardUI.clearHighlights();
        }
      }
    }
  }

  handlePieceDrop(from, to) {
    if (this.isPlayingSong || this.game.mode === 'free-play') return;

    const legalMoves = this.game.getLegalMoves(from);
    const isLegal = legalMoves.some(m => m.to === to);

    if (isLegal) {
      if (this.isPromotionMove(from, to)) {
        this.pendingPromotion = { from, to };
        this.showPromotionModal();
      } else {
        this.executePlayerMove(from, to, 'q');
      }
    } else {
      this.boardUI.updatePieces(this.game.getBoard());
    }
  }

  isPromotionMove(from, to) {
    const piece = this.getPieceOnSquare(from);
    if (!piece || piece.type !== 'p') return false;
    const toRank = to[1];
    return (piece.color === 'w' && toRank === '8') || (piece.color === 'b' && toRank === '1');
  }

  showPromotionModal() {
    document.getElementById('promotion-modal').classList.remove('hidden');
  }

  hidePromotionModal() {
    document.getElementById('promotion-modal').classList.add('hidden');
  }

  completePromotion(pieceType) {
    if (this.pendingPromotion) {
      const { from, to } = this.pendingPromotion;
      this.executePlayerMove(from, to, pieceType);
      this.pendingPromotion = null;
    }
    this.hidePromotionModal();
  }

  executePlayerMove(from, to, promotion = 'q') {
    const record = this.game.makeMove(from, to, promotion);
    if (!record) return;

    this.boardUI.clearHighlights();
    this.boardUI.showMoveAnimation(from, to);
    this.updateGameState();
    this.updateTimeline();

    // Render Event in Quantum Pool & Synthesize
    quantumEventPool.buildFromGame(this.game.moveHistory);
    const renderedList = quantumEventPool.renderComposition({
      makamId: this.currentMakamId,
      meterId: this.currentMeterId,
      bpm: this.bpm,
      useRetroactiveTonic: this.useRetroactiveTonic
    });

    const lastRendered = renderedList[renderedList.length - 1];
    if (lastRendered) {
      symphonicSynth.playRenderedEvent(lastRendered);
      this.updateNowPlaying(lastRendered);
    }
    this.updateCompositionTonicUI();

    // Trigger AI Move if mode is AI
    if (!this.game.isGameOver() && this.game.mode.startsWith('ai-') && this.game.getTurn() === 'b') {
      this.executeAiTurn();
    }
  }

  executeAiTurn() {
    this.setAlert('Yapay Zeka düşünüyor...');
    setTimeout(() => {
      const bestMove = this.game.getBestAiMove();
      if (bestMove) {
        const record = this.game.makeMove(bestMove.from, bestMove.to, bestMove.promotion || 'q');
        if (record) {
          this.boardUI.showMoveAnimation(bestMove.from, bestMove.to);
          this.updateGameState();
          this.updateTimeline();

          quantumEventPool.buildFromGame(this.game.moveHistory);
          const renderedList = quantumEventPool.renderComposition({
            makamId: this.currentMakamId,
            meterId: this.currentMeterId,
            bpm: this.bpm,
            useRetroactiveTonic: this.useRetroactiveTonic
          });

          const lastRendered = renderedList[renderedList.length - 1];
          if (lastRendered) {
            symphonicSynth.playRenderedEvent(lastRendered);
            this.updateNowPlaying(lastRendered);
          }
          this.updateCompositionTonicUI();
        }
      }
      this.setAlert('');
    }, 450);
  }

  getPieceOnSquare(square) {
    if (!this.game.chess) return null;
    return this.game.chess.get(square);
  }

  updateGameState() {
    this.boardUI.updatePieces(this.game.getBoard());

    const turn = this.game.getTurn();
    const turnDot = document.getElementById('turn-dot');
    const turnText = document.getElementById('turn-text');

    turnDot.className = `turn-dot ${turn === 'w' ? 'white' : 'black'}`;
    turnText.textContent = `Sıra: ${turn === 'w' ? 'Beyaz' : 'Siyah'}`;

    const alertEl = document.getElementById('game-alert');
    if (this.game.inCheckmate()) {
      alertEl.textContent = 'ŞAH MAT! Oyun Bitti 👑';
      alertEl.className = 'game-alert check';
    } else if (this.game.inDraw()) {
      alertEl.textContent = 'BERABERE 🤝';
      alertEl.className = 'game-alert';
    } else if (this.game.inCheck()) {
      alertEl.textContent = 'ŞAH ÇEKİLDİ! ⚠️';
      alertEl.className = 'game-alert check';
    } else {
      alertEl.textContent = '';
      alertEl.className = 'game-alert';
    }

    const pgnEl = document.getElementById('pgn-display');
    if (pgnEl) {
      pgnEl.textContent = this.game.getPgn() || 'Henüz hamle yapılmadı.';
    }

    const badgeEl = document.getElementById('move-count-badge');
    if (badgeEl) {
      badgeEl.textContent = `${this.game.moveHistory.length} Nota`;
    }
  }

  updateCompositionTonicUI() {
    const tonicValEl = document.getElementById('tonic-val');
    if (!tonicValEl) return;

    if (quantumEventPool.finalTonic && this.useRetroactiveTonic) {
      tonicValEl.textContent = `${quantumEventPool.finalTonic.nameTr} (${quantumEventPool.finalTonic.name})`;
    } else {
      const makam = MAKAMS[this.currentMakamId] || MAKAMS.rast;
      tonicValEl.textContent = makam.name;
    }
  }

  updateNowPlaying(renderedEvent) {
    const noteEl = document.getElementById('current-note-display');
    const moveEl = document.getElementById('current-move-display');
    const durEl = document.getElementById('current-duration-display');
    const tensionEl = document.getElementById('tension-val');
    const waveEl = document.getElementById('audio-wave');

    if (noteEl) {
      const centsStr = renderedEvent.mutatedTarget.cents !== 0 ? ` (${renderedEvent.mutatedTarget.cents > 0 ? '+' : ''}${renderedEvent.mutatedTarget.cents}c)` : '';
      noteEl.textContent = `${renderedEvent.targetPitch.noteName}${centsStr}`;
    }

    if (moveEl) {
      moveEl.textContent = `Hamle: ${renderedEvent.san || renderedEvent.toSquare} [${renderedEvent.articulationName}]`;
    }

    if (durEl) {
      const sideName = renderedEvent.side === 'w' ? 'Beyaz (Ölçü 1. Yarısı)' : 'Siyah (Ölçü 2. Yarısı)';
      durEl.textContent = `${sideName} • ${renderedEvent.mutatedTarget.degreeName}`;
    }

    if (tensionEl) {
      tensionEl.textContent = `T: ${renderedEvent.boardTension} (${renderedEvent.dynamicMark})`;
    }

    if (waveEl) {
      waveEl.classList.add('active');
      setTimeout(() => waveEl.classList.remove('active'), 800);
    }
  }

  updateTimeline() {
    const container = document.getElementById('moves-timeline');
    if (!container) return;

    if (this.game.moveHistory.length === 0) {
      container.innerHTML = '<div class="empty-timeline">Henüz hamle yapılmadı. Taş oynattıkça senfonik notalar buraya dizilecek!</div>';
      return;
    }

    container.innerHTML = '';
    this.game.moveHistory.forEach((rec, idx) => {
      const chip = document.createElement('div');
      chip.className = 'timeline-note-chip';
      chip.innerHTML = `
        <span class="chip-note">${rec.pitchInfo.noteName}</span>
        <span class="chip-move">${idx + 1}. ${rec.san}</span>
        <span class="chip-dur">${rec.piece.toUpperCase()}</span>
      `;
      chip.addEventListener('click', () => {
        quantumEventPool.buildFromGame(this.game.moveHistory.slice(0, idx + 1));
        const rendered = quantumEventPool.renderComposition({
          makamId: this.currentMakamId,
          meterId: this.currentMeterId,
          bpm: this.bpm,
          useRetroactiveTonic: this.useRetroactiveTonic
        });
        const ev = rendered[rendered.length - 1];
        if (ev) {
          symphonicSynth.playRenderedEvent(ev);
          this.boardUI.pulseSquare(rec.to);
          this.updateNowPlaying(ev);
        }
      });
      container.appendChild(chip);
    });
  }

  setAlert(text) {
    const alertEl = document.getElementById('game-alert');
    if (alertEl) alertEl.textContent = text;
  }

  // --- PLAYBACK FULL MEASURE DIALOGUE ---
  playSong() {
    if (this.game.moveHistory.length === 0) {
      alert('Henüz hamle yapılmadı! Lütfen tahtada birkaç hamle oynayın veya bir usta maçı seçin.');
      return;
    }

    this.isPlayingSong = true;
    document.getElementById('btn-play-song').disabled = true;
    document.getElementById('btn-stop-song').disabled = false;

    quantumEventPool.buildFromGame(this.game.moveHistory);
    const renderedEvents = quantumEventPool.renderComposition({
      makamId: this.currentMakamId,
      meterId: this.currentMeterId,
      bpm: this.bpm,
      useRetroactiveTonic: this.useRetroactiveTonic
    });

    let currentStep = 0;

    const playNext = () => {
      if (!this.isPlayingSong || currentStep >= renderedEvents.length) {
        this.stopSong();
        return;
      }

      const ev = renderedEvents[currentStep];
      this.boardUI.pulseSquare(ev.toSquare);
      this.boardUI.showMoveAnimation(ev.fromSquare, ev.toSquare);
      symphonicSynth.playRenderedEvent(ev);
      this.updateNowPlaying(ev);

      const chips = document.querySelectorAll('.timeline-note-chip');
      chips.forEach((c, idx) => c.classList.toggle('playing', idx === currentStep));

      const durationMs = ev.timing.halfMeasureDurationSec * 1000;
      currentStep++;
      this.songPlaybackTimer = setTimeout(playNext, Math.max(200, durationMs));
    };

    playNext();
  }

  stopSong() {
    this.isPlayingSong = false;
    if (this.songPlaybackTimer) {
      clearTimeout(this.songPlaybackTimer);
      this.songPlaybackTimer = null;
    }
    symphonicSynth.stopActiveSustains();
    const btnPlay = document.getElementById('btn-play-song');
    const btnStop = document.getElementById('btn-stop-song');
    if (btnPlay) btnPlay.disabled = false;
    if (btnStop) btnStop.disabled = true;

    document.querySelectorAll('.timeline-note-chip').forEach(c => c.classList.remove('playing'));
  }

  // --- MASTER GAMES CONTROLLER ---
  initMasterGamesUI() {
    const selectGames = document.getElementById('select-famous-game');
    if (!selectGames) return;

    selectGames.innerHTML = '';
    FAMOUS_GAMES.forEach((g) => {
      const opt = document.createElement('option');
      opt.value = g.id;
      opt.textContent = `${g.title} (${g.white} vs ${g.black}, ${g.year})`;
      selectGames.appendChild(opt);
    });

    selectGames.addEventListener('change', (e) => {
      const found = FAMOUS_GAMES.find(g => g.id === e.target.value);
      if (found) {
        this.loadFamousGame(found);
      }
    });

    document.getElementById('btn-master-prev').addEventListener('click', () => this.stepMasterMove(-1));
    document.getElementById('btn-master-next').addEventListener('click', () => this.stepMasterMove(1));
    document.getElementById('btn-master-play').addEventListener('click', () => this.toggleMasterPlay());
    document.getElementById('btn-master-reset').addEventListener('click', () => this.resetMasterGame());

    const slider = document.getElementById('master-progress-slider');
    slider.addEventListener('input', (e) => {
      this.seekMasterMove(parseInt(e.target.value, 10));
    });

    this.loadFamousGame(FAMOUS_GAMES[0]);
  }

  loadFamousGame(gameObj) {
    this.stopMasterPlayback();
    this.selectedFamousGame = gameObj;
    this.masterCurrentMoveIndex = 0;

    document.getElementById('match-title').textContent = gameObj.title;
    document.getElementById('match-meta').textContent = `${gameObj.white} vs. ${gameObj.black} (${gameObj.year}, ${gameObj.event})`;
    document.getElementById('match-opening').textContent = `Açılış: ${gameObj.opening}`;
    document.getElementById('match-desc').textContent = gameObj.description;

    this.game.reset();
    this.boardUI.clearHighlights();
    this.updateGameState();
    this.updateTimeline();
    this.updateMasterProgressUI();
  }

  updateMasterProgressUI() {
    const total = this.selectedFamousGame.moves.length;
    const current = this.masterCurrentMoveIndex;

    const numEl = document.getElementById('master-move-num');
    const totalEl = document.getElementById('master-total-moves');
    const slider = document.getElementById('master-progress-slider');
    const badge = document.getElementById('master-status-badge');

    if (numEl) numEl.textContent = current;
    if (totalEl) totalEl.textContent = total;
    if (slider) {
      slider.max = total;
      slider.value = current;
    }
    if (badge) {
      badge.textContent = this.isMasterPlaying ? 'Senfoni Çalıyor 🎵' : (current === total ? 'Beste Tamamlandı' : 'Hazır');
    }
  }

  toggleMasterPlay() {
    if (this.isMasterPlaying) {
      this.stopMasterPlayback();
    } else {
      this.startMasterPlayback();
    }
  }

  startMasterPlayback() {
    if (this.masterCurrentMoveIndex >= this.selectedFamousGame.moves.length) {
      this.resetMasterGame();
    }

    this.isMasterPlaying = true;
    const btn = document.getElementById('btn-master-play');
    if (btn) btn.innerHTML = '<span class="icon">⏸</span> Duraklat';
    this.updateMasterProgressUI();

    const playLoop = () => {
      if (!this.isMasterPlaying || this.masterCurrentMoveIndex >= this.selectedFamousGame.moves.length) {
        this.stopMasterPlayback();
        return;
      }

      this.stepMasterMove(1);
      const speed = Math.max(250, (60000 / this.bpm) * 1.2);
      this.masterTimer = setTimeout(playLoop, speed);
    };

    playLoop();
  }

  stopMasterPlayback() {
    this.isMasterPlaying = false;
    if (this.masterTimer) {
      clearTimeout(this.masterTimer);
      this.masterTimer = null;
    }
    symphonicSynth.stopActiveSustains();
    const btn = document.getElementById('btn-master-play');
    if (btn) btn.innerHTML = '<span class="icon">▶</span> Otomatik Oynat';
    this.updateMasterProgressUI();
  }

  resetMasterGame() {
    this.stopMasterPlayback();
    this.masterCurrentMoveIndex = 0;
    this.game.reset();
    this.boardUI.clearHighlights();
    this.updateGameState();
    this.updateTimeline();
    this.updateMasterProgressUI();
  }

  stepMasterMove(delta) {
    const total = this.selectedFamousGame.moves.length;
    const targetIndex = Math.min(total, Math.max(0, this.masterCurrentMoveIndex + delta));
    this.seekMasterMove(targetIndex);
  }

  seekMasterMove(targetIndex) {
    this.game.reset();
    const moves = this.selectedFamousGame.moves;

    for (let i = 0; i < targetIndex; i++) {
      const m = moves[i];
      this.game.makeMove(m.from, m.to, m.promotion || 'q');
    }

    this.masterCurrentMoveIndex = targetIndex;

    if (targetIndex > 0) {
      const last = moves[targetIndex - 1];
      this.boardUI.showMoveAnimation(last.from, last.to);

      quantumEventPool.buildFromGame(this.game.moveHistory);
      const renderedList = quantumEventPool.renderComposition({
        makamId: this.currentMakamId,
        meterId: this.currentMeterId,
        bpm: this.bpm,
        useRetroactiveTonic: this.useRetroactiveTonic
      });

      const lastRendered = renderedList[renderedList.length - 1];
      if (lastRendered) {
        symphonicSynth.playRenderedEvent(lastRendered);
        this.updateNowPlaying(lastRendered);
      }
    }

    this.updateGameState();
    this.updateTimeline();
    this.updateMasterProgressUI();
    this.updateCompositionTonicUI();
  }

  // --- EXPORT CONTROLLERS ---
  exportGameMidi(meterId = '4/4') {
    if (this.game.moveHistory.length === 0) {
      alert('Henüz hamle yapılmadı! Lütfen tahtada birkaç hamle oynayın.');
      return;
    }
    quantumEventPool.buildFromGame(this.game.moveHistory);
    const rendered = quantumEventPool.renderComposition({
      makamId: this.currentMakamId,
      meterId: meterId,
      bpm: this.bpm,
      useRetroactiveTonic: this.useRetroactiveTonic
    });
    downloadMidi(rendered, { bpm: this.bpm, meterId, title: 'My Chess Composition' }, `my_chess_${meterId.replace('/', '-')}.mid`);
  }

  exportMasterMidi(meterId = '4/4') {
    const tempGame = new ChessGame();
    for (const m of this.selectedFamousGame.moves) {
      tempGame.makeMove(m.from, m.to, m.promotion || 'q');
    }
    quantumEventPool.buildFromGame(tempGame.moveHistory);
    const rendered = quantumEventPool.renderComposition({
      makamId: this.currentMakamId,
      meterId: meterId,
      bpm: this.bpm,
      useRetroactiveTonic: this.useRetroactiveTonic
    });
    downloadMidi(rendered, { bpm: this.bpm, meterId, title: this.selectedFamousGame.title }, `${this.selectedFamousGame.id}_${meterId.replace('/', '-')}.mid`);
  }

  exportGameMusicXml() {
    if (this.game.moveHistory.length === 0) {
      alert('Henüz hamle yapılmadı! Lütfen tahtada birkaç hamle oynayın.');
      return;
    }
    quantumEventPool.buildFromGame(this.game.moveHistory);
    const rendered = quantumEventPool.renderComposition({
      makamId: this.currentMakamId,
      meterId: this.currentMeterId,
      bpm: this.bpm,
      useRetroactiveTonic: this.useRetroactiveTonic
    });
    downloadMusicXml(rendered, { title: 'My Chess Score', composer: 'Musical Chess' }, 'my_chess_score.xml');
  }

  exportMasterMusicXml() {
    const tempGame = new ChessGame();
    for (const m of this.selectedFamousGame.moves) {
      tempGame.makeMove(m.from, m.to, m.promotion || 'q');
    }
    quantumEventPool.buildFromGame(tempGame.moveHistory);
    const rendered = quantumEventPool.renderComposition({
      makamId: this.currentMakamId,
      meterId: this.currentMeterId,
      bpm: this.bpm,
      useRetroactiveTonic: this.useRetroactiveTonic
    });
    downloadMusicXml(rendered, { title: this.selectedFamousGame.title, composer: `${this.selectedFamousGame.white} vs ${this.selectedFamousGame.black}` }, `${this.selectedFamousGame.id}_score.xml`);
  }
}

// Start application
window.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
