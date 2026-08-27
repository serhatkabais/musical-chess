/**
 * Orchestration & Articulation Mapping Engine (Section 3)
 * 
 * Homojen Yaylı Grubu (Full Strings Ensemble):
 * - Violins I-II, Violas, Cellos, Contrabasses
 * - Taş değişimi enstrümanı değiştirmez, tellere dokunuş tekniğini (Artikülasyonu) değiştirir:
 *   - Piyon & At: Pizzicato / Spiccato / Staccato (Ritmik Groove)
 *   - Fil, Kale, Vezir: Legato / Detache (Pürüzsüz Melodi Şeritleri)
 *   - Şah: Orkestral Gövde Derece Akoru (Legato Pad)
 *   - Taş Yeme: Çarpışma Akoru
 *   - Çatal (Fork): Fortissimo Sforzando (ffz)
 *   - Şiş (Skewer): Subito Piano (Ani Sağırlaşma)
 *   - Açmaz (Pin): Titrek Tremolo Gerilimi
 */

export const STRINGS_ENSEMBLE = {
  id: 'strings_ensemble',
  name: 'Homojen Senfonik Yaylı Grubu',
  icon: '🎻',
  sections: {
    violins_pizz: { name: 'Violins I-II Pizzicato / Spiccato', technique: 'pizzicato', register: 'treble' },
    violins_legato: { name: 'Violins I-II Legato Cantabile', technique: 'legato', register: 'treble' },
    violas_detache: { name: 'Violas Detache Marziale', technique: 'detache', register: 'alto' },
    cellos_gliss: { name: 'Cellos & Contrabasses Heavy Glide', technique: 'detache_heavy', register: 'tenor_bass' },
    full_strings_cascade: { name: 'Tüm Yaylı Grubu Şelalesi (Violins+Violas+Cellos)', technique: 'legato_crescendo', register: 'full' },
    king_body_pad: { name: 'Orkestral Yaylı Gövde Akoru (Legato Pad)', technique: 'legato_pad', register: 'body' },
    clash_hit: { name: 'Çok Sesli Çarpışma Darbesi (Martellato)', technique: 'martellato', register: 'full' },
    fork_ffz: { name: 'Tüm Yaylılar Zirve Darbesi (ffz)', technique: 'sforzando', register: 'full' },
    pin_tremolo: { name: 'Titrek Yaylı Gerilimi (Tremolo)', technique: 'tremolo', register: 'full' },
    subito_p: { name: 'Fısıltı Seviyesi Sağırlaşma (Subito Piano)', technique: 'subito_piano', register: 'soft' }
  }
};

/**
 * Returns the exact strings articulation & technique for any move
 */
export function getStringsArticulation(moveData) {
  const { piece = 'p', isCapture, isCheck, isMate, isFork, isSkewer, isPin, distance = 1 } = moveData;
  const p = piece.toLowerCase();

  if (isMate) return STRINGS_ENSEMBLE.sections.fork_ffz;
  if (isFork) return STRINGS_ENSEMBLE.sections.fork_ffz;
  if (isSkewer) return STRINGS_ENSEMBLE.sections.subito_p;
  if (isPin) return STRINGS_ENSEMBLE.sections.pin_tremolo;
  if (isCapture) return STRINGS_ENSEMBLE.sections.clash_hit;

  switch (p) {
    case 'p':
      return STRINGS_ENSEMBLE.sections.violins_pizz;
    case 'n':
      return STRINGS_ENSEMBLE.sections.violins_pizz;
    case 'b':
      return STRINGS_ENSEMBLE.sections.violins_legato;
    case 'r':
      return distance >= 4 ? STRINGS_ENSEMBLE.sections.cellos_gliss : STRINGS_ENSEMBLE.sections.violas_detache;
    case 'q':
      return STRINGS_ENSEMBLE.sections.full_strings_cascade;
    case 'k':
    default:
      return STRINGS_ENSEMBLE.sections.king_body_pad;
  }
}
