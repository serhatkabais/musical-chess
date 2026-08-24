import { TIME_SIGNATURES } from './src/audio/timeSignatures.js';
import { generateMidiFile } from './src/audio/midiExporter.js';
import { FAMOUS_GAMES } from './src/chess/famousGames.js';
import { getSquareNote } from './src/audio/noteMapping.js';

console.log("=== 2/4, 3/4 VE 4/4 ZAMAN ÖLÇÜLERİ VE MIDI TESTİ ===");

const immortal = FAMOUS_GAMES[0];
const sampleHistory = immortal.moves.slice(0, 10).map(m => ({
  move: m.san,
  piece: 'p',
  noteInfo: getSquareNote(m.to)
}));

for (const [key, sig] of Object.entries(TIME_SIGNATURES)) {
  console.log(`\n[Test: ${sig.name}]`);
  console.log(`- Ölçü / Bar Başına Vuruş: ${sig.beatsPerMeasure}`);
  console.log(`- Ritim Kalıbı: ${sig.pattern.join(' -> ')}`);
  
  const blob = generateMidiFile(sampleHistory, 120, key);
  console.log(`- MIDI Blob Üretildi: Boyut = ${blob.size} bytes`);
}

console.log("\n=== TÜM ZAMAN ÖLÇÜLERİ BAŞARIYLA TEST EDİLDİ ===");
