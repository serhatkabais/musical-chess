/**
 * Quantum Event Pool & Composition Engine
 * 
 * Core Data Structure: MoveEvent
 * Decouples musical time from chess mechanics and applies retroactive tonal/makam mutation.
 */

import { getSquarePitch, getTonicFromSquare } from '../theory/squarePitchMapper.js';
import { mutatePitch } from '../theory/makamEngine.js';
import { generateMoveMotif } from '../rhythm/motifEngine.js';
import { scaleMotifToMeter } from '../rhythm/meterAdapter.js';
import { calculateDynamics } from '../dynamics/tensionEngine.js';
import { getInstrumentForMove } from '../orchestration/instrumentMapper.js';

export class QuantumEventPool {
  constructor() {
    this.events = [];
    this.finalTonic = null;
    this.gameResult = null; // '1-0', '0-1', '1/2-1/2', '*'
  }

  /**
   * Builds the raw Quantum Event Pool from move history and board analysis
   * @param {Array<object>} rawMoves 
   * @param {string} result 
   */
  buildFromGame(rawMoves, result = '*') {
    this.events = [];
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

      // Calculate path & distance
      const fromFile = from.charCodeAt(0) - 'a'.charCodeAt(0);
      const fromRank = parseInt(from[1], 10);
      const toFile = to.charCodeAt(0) - 'a'.charCodeAt(0);
      const toRank = parseInt(to[1], 10);

      const dFile = Math.abs(toFile - fromFile);
      const dRank = Math.abs(toRank - fromRank);
      const distance = Math.max(dFile, dRank) || 1;

      // Retreat detection (moving backwards towards home rank)
      const isRetreat = side === 'w' ? (toRank < fromRank) : (toRank > fromRank);

      // Raw Diatonic Pitches
      const sourcePitch = getSquarePitch(from);
      const targetPitch = getSquarePitch(to);

      // Generate Path Squares
      const path = this.computePath(from, to, distance);
      const pathPitches = path.map(sq => getSquarePitch(sq));

      // Tactical Flags
      const tacticalFlags = [];
      if (isCapture) tacticalFlags.push('capture');
      if (isCheck) tacticalFlags.push('check');
      if (isMate) tacticalFlags.push('mate');
      if (isCastling) tacticalFlags.push('castling');
      if (isRetreat) tacticalFlags.push('retreat');

      // Motif & Rhythms
      const motif = generateMoveMotif({
        piece,
        distance,
        isCapture,
        isCheck,
        isMate,
        isCastling,
        isRetreat
      });

      // Dynamics & Tension
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

      const event = {
        plyIndex,
        moveNumber,
        side,
        piece,
        fromSquare: from,
        toSquare: to,
        san: m.san || '',
        path,
        distance,
        isCapture,
        capturedPiece: m.captured || null,
        isCheck,
        isMate,
        isCastling,
        promotion: m.promotion || null,
        tacticalFlags,
        sourcePitch,
        targetPitch,
        pathPitches,
        relativeRhythms: motif.relativeRhythms,
        articulation: motif.articulation,
        accentIndices: motif.accentIndices,
        velocity: dynamics.finalVelocity,
        velocityCurve: dynamics.velocityCurve,
        boardTension: dynamics.tension,
        dynamicMark: dynamics.dynamicMark,
        rankMotion: (toRank - fromRank)
      };

      this.events.push(event);
    });

    // Determine Final Tonic from the last / checkmating square
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
   * Renders the event pool into fully mutated, timed, and orchestrated sound instructions
   * @param {object} options - { makamId, meterId, bpm, ensembleId, useRetroactiveTonic }
   * @returns {Array<object>} Rendered events ready for audio synthesis and MIDI export
   */
  renderComposition(options = {}) {
    const {
      makamId = 'rast',
      meterId = '4/4',
      bpm = 120,
      ensembleId = 'symphonic',
      useRetroactiveTonic = true
    } = options;

    const targetTonicPC = useRetroactiveTonic && this.finalTonic ? this.finalTonic.pitchClass : null;

    return this.events.map((ev) => {
      // 1. Mutate Target Pitch into selected Makam / Tonal system with Microtonal Cents
      const mutatedTarget = mutatePitch(ev.targetPitch.midi, makamId, targetTonicPC, ev.rankMotion);

      // Mutate path pitches for sliding glissando
      const mutatedPath = ev.pathPitches.map((p) => mutatePitch(p.midi, makamId, targetTonicPC, ev.rankMotion));

      // 2. Scale relative motif rhythms to the chosen Meter container
      const timing = scaleMotifToMeter(ev.relativeRhythms, meterId, bpm);

      // 3. Resolve Timbre / Instrument mapping
      const instrument = getInstrumentForMove(ev.piece, ev.isCapture, ev.isCheck, ev.isMate, ensembleId);

      return {
        ...ev,
        mutatedTarget,
        mutatedPath,
        timing,
        instrument,
        makamId,
        meterId,
        bpm,
        ensembleId,
        appliedTonic: this.finalTonic
      };
    });
  }
}

export const quantumEventPool = new QuantumEventPool();
