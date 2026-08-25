/**
 * Dynamics & Board Tension Engine (Velocity & Global Crescendo/Decrescendo)
 * 
 * Formula:
 * velocity = base_piece_velocity + distance_pressure + tactical_pressure + board_tension + endgame_modifier
 */

export const PIECE_BASE_VELOCITIES = {
  p: 65,  // Pawn: delicate
  n: 78,  // Knight: agile
  b: 80,  // Bishop: focused
  r: 88,  // Rook: solid
  q: 98,  // Queen: powerful
  k: 72   // King: deep noble
};

/**
 * Calculates board tension (0.0 to 1.0) and move velocity curve
 * @param {object} moveContext 
 * @returns {{ finalVelocity: number, tension: number, velocityCurve: Array<number>, dynamicMark: string }}
 */
export function calculateDynamics(moveContext) {
  const {
    piece = 'p',
    distance = 1,
    isCapture = false,
    isCheck = false,
    isMate = false,
    plyIndex = 0,
    totalPlies = 60,
    capturedPiece = null
  } = moveContext;

  const p = piece.toLowerCase();
  const baseVel = PIECE_BASE_VELOCITIES[p] || 70;

  // 1. Distance Pressure (Further moves generate acceleration pressure)
  const distancePressure = Math.min(18, (distance - 1) * 3.5);

  // 2. Tactical Pressure
  let tacticalPressure = 0;
  if (isCapture) tacticalPressure += 15;
  if (capturedPiece && ['q', 'r'].includes(capturedPiece.toLowerCase())) tacticalPressure += 10;
  if (isCheck) tacticalPressure += 20;
  if (isMate) tacticalPressure += 30;

  // 3. Board Tension (0.0 to 1.0) based on Game Phase & Tactics
  const gamePhase = Math.min(1.0, plyIndex / Math.max(1, totalPlies));
  // Middle game (0.3 to 0.7) has peak tension
  const phaseTension = Math.sin(gamePhase * Math.PI) * 0.4;
  const tacticTension = (isCapture ? 0.3 : 0) + (isCheck ? 0.3 : 0) + (isMate ? 0.4 : 0);
  const boardTension = Math.min(1.0, Math.max(0.1, phaseTension + tacticTension));

  // 4. Endgame Modifier (Endgame either reduces to intimate p/mp or explodes to ff on mate)
  let endgameModifier = 0;
  if (gamePhase > 0.8) {
    endgameModifier = isMate ? 15 : -8; // Intimate quietness before final storm
  }

  // 5. Final Velocity (Clamped 30 to 127)
  const rawVel = baseVel + distancePressure + tacticalPressure + (boardTension * 20) + endgameModifier;
  const finalVelocity = Math.min(127, Math.max(35, Math.round(rawVel)));

  // 6. Velocity Curve across path (for sliding pieces with distance >= 4: pp -> p -> mp -> mf -> f -> ff)
  const velocityCurve = [];
  if (distance >= 4) {
    const startVel = Math.max(30, finalVelocity - 25);
    for (let i = 0; i < distance; i++) {
      const stepVel = startVel + ((finalVelocity - startVel) * (i / (distance - 1)));
      velocityCurve.push(Math.round(stepVel));
    }
  } else {
    velocityCurve.push(finalVelocity);
  }

  // Dynamic Italian Mark (pp, p, mp, mf, f, ff, fff)
  let dynamicMark = 'mf';
  if (finalVelocity < 45) dynamicMark = 'pp';
  else if (finalVelocity < 60) dynamicMark = 'p';
  else if (finalVelocity < 75) dynamicMark = 'mp';
  else if (finalVelocity < 90) dynamicMark = 'mf';
  else if (finalVelocity < 110) dynamicMark = 'f';
  else if (finalVelocity < 122) dynamicMark = 'ff';
  else dynamicMark = 'fff';

  return {
    finalVelocity,
    tension: Number(boardTension.toFixed(2)),
    velocityCurve,
    dynamicMark
  };
}
