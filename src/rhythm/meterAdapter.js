/**
 * Meter Adapter & Time Container Engine
 * Adapts relative move rhythms into selected musical meters:
 * 2/4 (March), 3/4 (Waltz), 4/4 (Symphonic), 5/8 (Aksak 3+2), 7/8 (Devr-i Hindi 3+2+2 / 2+2+3 / 2+3+2)
 */

export const METERS = {
  '2/4': {
    id: '2/4',
    name: "2/4'lük Marş",
    icon: '🥁',
    measureBeats: 2.0,
    subdivisions: [1, 1],
    description: 'Keskin, hızlı ve mekanik yürüyüş (1 - 2)',
    midiTimeSig: [0x02, 0x02, 0x18, 0x08]
  },
  '3/4': {
    id: '3/4',
    name: "3/4'lük Zarif Vals",
    icon: '💃',
    measureBeats: 3.0,
    subdivisions: [1, 1, 1],
    description: 'Akıcı, danssal ve romantik 1-2-3 salınımı',
    midiTimeSig: [0x03, 0x02, 0x18, 0x08]
  },
  '4/4': {
    id: '4/4',
    name: "4/4'lük Senfonik Standart",
    icon: '🎼',
    measureBeats: 4.0,
    subdivisions: [1, 1, 1, 1],
    description: 'Görkemli, dengeli ve zengin orkestral ölçü',
    midiTimeSig: [0x04, 0x02, 0x18, 0x08]
  },
  '5/8': {
    id: '5/8',
    name: "5/8'lik Aksak (3+2)",
    icon: '⚡',
    measureBeats: 2.5, // 5 eighth notes = 2.5 quarter beats
    subdivisions: [1.5, 1.0], // 3 eighths + 2 eighths
    description: 'Aksak, dinamik ve sürükleyici Türk ritim formu (Düm-tek-tek Düm-tek)',
    midiTimeSig: [0x05, 0x03, 0x18, 0x08]
  },
  '7/8_322': {
    id: '7/8_322',
    name: "7/8'lik Devr-i Hindi (3+2+2)",
    icon: '🌀',
    measureBeats: 3.5, // 7 eighth notes = 3.5 quarter beats
    subdivisions: [1.5, 1.0, 1.0],
    description: 'Klasik 7/8 aksak ölçüsü: Düm-tek-tek Düm-tek Düm-tek',
    midiTimeSig: [0x07, 0x03, 0x18, 0x08]
  },
  '7/8_223': {
    id: '7/8_223',
    name: "7/8'lik Laz Havası (2+2+3)",
    icon: '🌊',
    measureBeats: 3.5,
    subdivisions: [1.0, 1.0, 1.5],
    description: 'Enerjik ve progresif Karadeniz / Balkan aksak ritmi',
    midiTimeSig: [0x07, 0x03, 0x18, 0x08]
  },
  '7/8_232': {
    id: '7/8_232',
    name: "7/8'lik Curcuna (2+3+2)",
    icon: '🎭',
    measureBeats: 3.5,
    subdivisions: [1.0, 1.5, 1.0],
    description: 'Kıvrak, poliritmik ve entelektüel senkoplu ölçü',
    midiTimeSig: [0x07, 0x03, 0x18, 0x08]
  }
};

/**
 * Scales a relative rhythm array to fit cleanly inside a measure container
 * @param {Array<number>} relativeRhythms 
 * @param {string} meterId 
 * @param {number} bpm 
 * @returns {{ durationsInSeconds: Array<number>, totalDuration: number, sustainDuration: number }}
 */
export function scaleMotifToMeter(relativeRhythms, meterId = '4/4', bpm = 120) {
  const meter = METERS[meterId] || METERS['4/4'];
  const quarterDurationSec = 60.0 / bpm;

  const measureDurationSec = meter.measureBeats * quarterDurationSec;

  // Sum of relative rhythms in the motif
  const relSum = relativeRhythms.reduce((acc, v) => acc + v, 0);

  // Allocate attack durations proportionally (taking up at most 75% of measure to allow sustain tail)
  const attackRatio = Math.min(0.75, Math.max(0.3, relSum / (meter.measureBeats || 4.0)));
  const totalAttackTimeSec = measureDurationSec * attackRatio;

  const durationsInSeconds = relativeRhythms.map(r => (r / relSum) * totalAttackTimeSec);

  // Continuous Legato Layer: remaining measure time is sustained to the barline!
  const attackTotal = durationsInSeconds.reduce((a, b) => a + b, 0);
  const sustainDuration = Math.max(0.2, measureDurationSec - attackTotal);

  return {
    durationsInSeconds,
    totalDuration: measureDurationSec,
    sustainDuration,
    meter
  };
}
