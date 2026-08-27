/**
 * Quantum Event Pool Engine (Section 1, 2, 4, 5, 6)
 * 
 * Karşılıklı İki Hamle = Tek Ölçü (Full Move = 1 Measure)
 * Deterministik Dikey Referans Matrisi & Geriye Dönük Kuantum Mutasyon
 */

import { getSquarePitch, getTonicFromSquare, getKingDegreeChord, getCaptureClashChord } from '../theory/squarePitchMapper.js';
import { mutatePitch } from '../theory/makamEngine.js';
import { generateMoveMotif } from '../rhythm/motifEngine.js';
import { scaleMotifToDialogueContainer } from '../rhythm/meterAdapter.js';
import { calculateDynamics } from '../dynamics/tensionEngine.js';
import { getStringsArticulation } from '../orchestration/instrumentMapper.js';

export class QuantumEventPool {
  constructor() {
    this.events = [];
    this.measures = [];
    this.finalTonic = null;
    this.gameResult = null;
  }

  /**
   * Builds the Quantum Event Pool from move history with tactical detection
   */
  buildFromGame(rawMoves, result = '*') {
    this.events = [];
    this.measures = [];
    this.gameResult = result;

    const totalPlies = rawMoves.length;

    rawMoves.forEach((m, idx) => {
      const plyIndex = idx;
      const moveNumber = Math.floor(idx / 2) + 1;
      const side = (idx % 2 === 0) ? 'w' : 'b';

      const from = m.from || 'e2';
      const to = m.to || 'e4';
      const piece = (m.piece || 'p').toLowerCase();
      const isCapture = Boolean(m.captured);
      const isCheck = Boolean(m.san && m.san.includes('+'));
      const isMate = Boolean(m.san && m.san.includes('#'));
      const isCastling = Boolean(m.san && (m.san.startsWith('O-O') || m.san.startsWith('0-0')));

      // Distance
      const fromFile = from.charCodeAt(0) - 'a'.charCodeAt(0);
      const fromRank = parseInt(from[1], 10);
      const toFile = to.charCodeAt(0) - 'a'.charCodeAt(0);
      const toRank = parseInt(to[1], 10);

      const dFile = Math.abs(toFile - fromFile);
      const dRank = Math.abs(toRank - fromRank);
      const distance = Math.max(dFile, dRank) || 1;

      // Tactical Detection: Fork, Skewer, Pin
      const isFork = (piece === 'n' && isCheck && isCapture) || (m.san && m.san.includes('x') && distance >= 2 && isCheck);
      const isSkewer = (['q', 'r', 'b'].includes(piece) && isCheck && distance >= 4);
      const isPin = (m.flags && m.flags.includes('p')) || false;

      // Pitches
      const sourcePitch = getSquarePitch(from);
      const targetPitch = getSquarePitch(to);

      // Path for glissando / sliding
      const path = this.computePath(from, to, distance);
      const pathPitches = path.map(sq => getSquarePitch(sq));

      // King Pad Chord or Capture Clash Chord
      let kingChord = null;
      if (piece === 'k') {
        kingChord = getKingDegreeChord(to);
      }

      let captureClashChord = null;
      if (isCapture) {
        captureClashChord = getCaptureClashChord(to, m.captured);
      }

      // Motif Generation (Section 4 & 5)
      const motif = generateMoveMotif({
        piece,
        distance,
        isCapture,
        capturedPiece: m.captured,
        isCheck,
        isMate,
        isCastling,
        isFork,
        isSkewer,
        isPin
      });

      // Dynamics (Section 5 & 7)
      const dynamics = calculateDynamics({
        piece,
        distance,
        isCapture,
        isCheck,
        isMate,
        plyIndex,
        totalPlies,
        capturedPiece: m.captured
      });

      const articulationInfo = getStringsArticulation({
        piece,
        isCapture,
        isCheck,
        isMate,
        isFork,
        isSkewer,
        isPin,
        distance
      });

      const event = {
        plyIndex,
        moveNumber,
        side,
        piece,
        fromSquare: from,
        toSquare: to,
        san: m.san || '',
        distance,
        isCapture,
        capturedPiece: m.captured || null,
        isCheck,
        isMate,
        isCastling,
        isFork,
        isSkewer,
        isPin,
        sourcePitch,
        targetPitch,
        pathPitches,
        kingChord,
        captureClashChord,
        relativeRhythms: motif.relativeRhythms,
        motifType: motif.type,
        effect: motif.effect,
        articulation: articulationInfo.technique,
        articulationName: articulationInfo.name,
        velocity: dynamics.finalVelocity,
        velocityCurve: dynamics.velocityCurve,
        boardTension: dynamics.tension,
        dynamicMark: dynamics.dynamicMark,
        rankMotion: (toRank - fromRank)
      };

      this.events.push(event);
    });

    // Final Tonic Extraction
    if (this.events.length > 0) {
      const finalEvent = this.events[this.events.length - 1];
      this.finalTonic = getTonicFromSquare(finalEvent.toSquare);
    } else {
      this.finalTonic = { pitchClass: 0, name: 'C', nameTr: 'Do' };
    }

    return this.events;
  }

  computePath(from, to, distance) {
    const f1 = from.charCodeAt(0) - 'a'.charCodeAt(0);
    const r1 = parseInt(from[1], 10);
    const f2 = to.charCodeAt(0) - 'a'.charCodeAt(0);
    const r2 = parseInt(to[1], 10);

    const path = [];
    for (let step = 1; step <= distance; step++) {
      const curF = Math.round(f1 + ((f2 - f1) * (step / distance)));
      const curR = Math.round(r1 + ((r2 - r1) * (step / distance)));
      const sq = `${String.fromCharCode('a'.charCodeAt(0) + curF)}${curR}`;
      path.push(sq);
    }
    return path;
  }

  /**
   * Renders the event pool into Full Move = 1 Measure containers with Retroactive Mutation
   */
  renderComposition(options = {}) {
    const {
      makamId = 'rast',
      meterId = '4/4',
      bpm = 120,
      useRetroactiveTonic = true
    } = options;

    const targetTonicPC = useRetroactiveTonic && this.finalTonic ? this.finalTonic.pitchClass : null;

    const renderedEvents = this.events.map((ev) => {
      // 1. Tonal / Makam Mutation with Cents
      const mutatedTarget = mutatePitch(ev.targetPitch.midi, makamId, targetTonicPC, ev.rankMotion);
      const mutatedPath = ev.pathPitches.map(p => mutatePitch(p.midi, makamId, targetTonicPC, ev.rankMotion));

      let mutatedKingChord = null;
      if (ev.kingChord) {
        mutatedKingChord = ev.kingChord.map(k => mutatePitch(k.midi, makamId, targetTonicPC, 0));
      }

      let mutatedCaptureChord = null;
      if (ev.captureClashChord) {
        mutatedCaptureChord = ev.captureClashChord.map(c => mutatePitch(c.midi, makamId, targetTonicPC, 0));
      }

      // 2. Scale into Half-Measure Dialogue Container (Section 1)
      const timing = scaleMotifToDialogueContainer(ev.relativeRhythms, ev.side, meterId, bpm);

      return {
        ...ev,
        mutatedTarget,
        mutatedPath,
        mutatedKingChord,
        mutatedCaptureChord,
        timing,
        makamId,
        meterId,
        bpm,
        appliedTonic: this.finalTonic
      };
    });

    // Group into Measure Blocks (1 Full Move = 1 Measure)
    this.measures = [];
    for (let i = 0; i < renderedEvents.length; i += 2) {
      const whiteEv = renderedEvents[i];
      const blackEv = renderedEvents[i + 1] || null;
      this.measures.push({
        measureNumber: Math.floor(i / 2) + 1,
        whiteEvent: whiteEv,
        blackEvent: blackEv,
        totalMeasureDurationSec: whiteEv.timing.measureDurationSec
      });
    }

    return renderedEvents;
  }
}

export const quantumEventPool = new QuantumEventPool();
