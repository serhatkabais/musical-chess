/**
 * Time Signature Definitions and Rhythm Patterns
 * Supports 2/4 (March/Allegro), 3/4 (Waltz/Romantic), 4/4 (Classical/Film Score)
 */

export const TIME_SIGNATURES = {
  '2/4': {
    id: '2/4',
    name: "2/4'lük (Marş / Allegro)",
    icon: '🥁',
    numerator: 2,
    denominator: 4,
    beatsPerMeasure: 2,
    description: 'Ritmik, tempolu ve canlı yürüyüş havası (1 - 2)',
    midiBytes: [0x02, 0x02, 0x18, 0x08], // FF 58 04 nn dd cc bb (dd=2 => 2^2=4)
    pattern: ['bass', 'chord']
  },
  '3/4': {
    id: '3/4',
    name: "3/4'lük (Zarif Vals / Romantic)",
    icon: '💃',
    numerator: 3,
    denominator: 4,
    beatsPerMeasure: 3,
    description: 'Zarif 1-2-3 vals salınımı ve romantik piyano arpejleri',
    midiBytes: [0x03, 0x02, 0x18, 0x08], // dd=2 => 2^2=4
    pattern: ['bass', 'chord', 'chord']
  },
  '4/4': {
    id: '4/4',
    name: "4/4'lük (Klasik / Film Score)",
    icon: '🎼',
    numerator: 4,
    denominator: 4,
    beatsPerMeasure: 4,
    description: 'Dengeli, zengin ve görkemli senfonik beste ölçüsü (1 - 2 - 3 - 4)',
    midiBytes: [0x04, 0x02, 0x18, 0x08], // dd=2 => 2^2=4
    pattern: ['bass', 'chord', 'bass-accent', 'chord']
  }
};

let currentTimeSignature = '4/4';

export function setTimeSignature(sig) {
  if (TIME_SIGNATURES[sig]) {
    currentTimeSignature = sig;
  }
}

export function getTimeSignature() {
  return TIME_SIGNATURES[currentTimeSignature] || TIME_SIGNATURES['4/4'];
}
