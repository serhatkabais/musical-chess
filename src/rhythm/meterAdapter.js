/**
 * Meter Adapter & Measure Container Engine (Section 1 & 6B)
 * 
 * Karşılıklı İki Hamle = Tek Ölçü Düzeni (Full Move = 1 Measure)
 * - 4/4: 1 Measure = 4 beats (White: 2 beats | Black: 2 beats)
 * - 3/4: 1 Measure = 3 beats (White: 1.5 beats | Black: 1.5 beats)
 * - 5/8: 1 Measure = 2.5 beats / 5 eighths (White: 1.5 beats / 3 eighths | Black: 1.0 beat / 2 eighths)
 * - 7/8: 1 Measure = 3.5 beats / 7 eighths (White: 2.0 beats / 4 eighths | Black: 1.5 beats / 3 eighths)
 * 
 * Ölçü Kelepçesi (Measure Clamp):
 * Ölçü çizgisi (Barline) bittiğinde tüm sesler ve akorlar KESİN OLARAK KESİLİR (Note-Off).
 */

export const METERS = {
  '4/4': {
    id: '4/4',
    name: "4/4'lük Senfonik Standart",
    icon: '🎼',
    measureBeats: 4.0,
    whiteShareBeats: 2.0,
    blackShareBeats: 2.0,
    subdivisions: [1, 1, 1, 1],
    description: '1 Tam Hamle = 1 Ölçü (Beyaz: 2 Vuruş | Siyah: 2 Vuruş)',
    midiTimeSig: [0x04, 0x02, 0x18, 0x08]
  },
  '2/4': {
    id: '2/4',
    name: "2/4'lük Marş (Allegro)",
    icon: '🥁',
    measureBeats: 2.0,
    whiteShareBeats: 1.0,
    blackShareBeats: 1.0,
    subdivisions: [1, 1],
    description: 'Keskin, hızlı ve mekanik askeri yürüyüş (Beyaz: 1 Vuruş | Siyah: 1 Vuruş)',
    midiTimeSig: [0x02, 0x02, 0x18, 0x08]
  },
  '3/4': {
    id: '3/4',
    name: "3/4'lük Zarif Vals",
    icon: '💃',
    measureBeats: 3.0,
    whiteShareBeats: 1.5,
    blackShareBeats: 1.5,
    subdivisions: [1, 1, 1],
    description: 'Akıcı, danssal ve romantik 1-2-3 salınımı',
    midiTimeSig: [0x03, 0x02, 0x18, 0x08]
  },
  '5/8': {
    id: '5/8',
    name: "5/8'lik Aksak (3+2)",
    icon: '⚡',
    measureBeats: 2.5,
    whiteShareBeats: 1.5, // 3 eighth notes
    blackShareBeats: 1.0, // 2 eighth notes
    subdivisions: [1.5, 1.0],
    description: 'Aksak soru-cevap ritmi (Beyaz: 3/8 Soru | Siyah: 2/8 Cevap)',
    midiTimeSig: [0x05, 0x03, 0x18, 0x08]
  },
  '7/8_322': {
    id: '7/8_322',
    name: "7/8'lik Devr-i Hindi (3+2+2)",
    icon: '🌀',
    measureBeats: 3.5,
    whiteShareBeats: 2.0, // 4 eighth notes
    blackShareBeats: 1.5, // 3 eighth notes
    subdivisions: [1.5, 1.0, 1.0],
    description: 'Klasik Türk Aksağı (Düm-tek-tek Düm-tek Düm-tek)',
    midiTimeSig: [0x07, 0x03, 0x18, 0x08]
  },
  '7/8_223': {
    id: '7/8_223',
    name: "7/8'lik Laz Havası (2+2+3)",
    icon: '🌊',
    measureBeats: 3.5,
    whiteShareBeats: 1.5,
    blackShareBeats: 2.0,
    subdivisions: [1.0, 1.0, 1.5],
    description: 'Enerjik ve progresif Karadeniz / Balkan aksak ritmi',
    midiTimeSig: [0x07, 0x03, 0x18, 0x08]
  },
  '7/8_232': {
    id: '7/8_232',
    name: "7/8'lik Curcuna (2+3+2)",
    icon: '🎭',
    measureBeats: 3.5,
    whiteShareBeats: 1.75,
    blackShareBeats: 1.75,
    subdivisions: [1.0, 1.5, 1.0],
    description: 'Kıvrak, poliritmik ve entelektüel senkoplu ölçü',
    midiTimeSig: [0x07, 0x03, 0x18, 0x08]
  }
};

/**
 * Scales move motif into its assigned half-measure dialogue container
 * @param {Array<number>} relativeRhythms 
 * @param {string} side - 'w' or 'b'
 * @param {string} meterId 
 * @param {number} bpm 
 * @returns {{ durationsInSeconds: Array<number>, halfMeasureDurationSec: number, measureDurationSec: number, isBarlineEnd: boolean }}
 */
export function scaleMotifToDialogueContainer(relativeRhythms, side = 'w', meterId = '4/4', bpm = 120) {
  const meter = METERS[meterId] || METERS['4/4'];
  const quarterDurationSec = 60.0 / bpm;

  const measureDurationSec = meter.measureBeats * quarterDurationSec;
  const allocatedBeats = (side === 'w') ? meter.whiteShareBeats : meter.blackShareBeats;
  const halfMeasureDurationSec = allocatedBeats * quarterDurationSec;

  const relSum = relativeRhythms.reduce((acc, v) => acc + v, 0) || 1.0;

  // Distribute attack durations strictly within half-measure container
  const attackRatio = 0.85; // Leave 15% for clean articulation gap or sustain clamp
  const totalAttackTime = halfMeasureDurationSec * attackRatio;

  const durationsInSeconds = relativeRhythms.map(r => (r / relSum) * totalAttackTime);
  const isBarlineEnd = (side === 'b'); // Siyahın hamlesi ölçü çizgisinde biter!

  return {
    durationsInSeconds,
    halfMeasureDurationSec,
    measureDurationSec,
    isBarlineEnd,
    meter
  };
}
