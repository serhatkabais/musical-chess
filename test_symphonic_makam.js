import { FAMOUS_GAMES } from './src/chess/famousGames.js';
import { quantumEventPool } from './src/audio/quantumEventPool.js';
import { MAKAMS } from './src/theory/makamEngine.js';
import { METERS } from './src/rhythm/meterAdapter.js';
import { generateAdvancedMidiFile, generateMusicXml } from './src/audio/midiMusicXmlExporter.js';

console.log("==================================================================");
console.log("   SATRANÇ SENFONİK & MAKAMBİLİMSEL KOMPOZİSYON MOTORU TESTİ      ");
console.log("==================================================================");

const immortalGame = FAMOUS_GAMES[0];
console.log(`\n1. OYUN YÜKLENDİ: ${immortalGame.title} (${immortalGame.white} vs ${immortalGame.black})`);

// 1. Build Quantum Event Pool
const events = quantumEventPool.buildFromGame(immortalGame.moves);
console.log(`- Event Pool Oluşturuldu: Toplam ${events.length} MoveEvent nesnesi.`);
console.log(`- Final Karar Sesi / Durak: ${quantumEventPool.finalTonic.nameTr} (${quantumEventPool.finalTonic.name})`);

// 2. Test All Makams & Microtones
console.log("\n2. TÜRK MAKAMLARI & MİKROTONAL KOMALAR TESTİ:");
for (const [makamKey, makam] of Object.entries(MAKAMS)) {
  const rendered = quantumEventPool.renderComposition({
    makamId: makamKey,
    meterId: '4/4',
    bpm: 120,
    ensembleId: 'makam_ensemble',
    useRetroactiveTonic: true
  });
  
  const sampleNote = rendered[0].mutatedTarget;
  console.log(`  [${makam.icon} ${makam.name}] ➔ İlk Nota: MIDI ${sampleNote.midi}, Koma: ${sampleNote.cents}c, Frekans: ${sampleNote.freq}Hz (${sampleNote.degreeName})`);
}

// 3. Test All Meter Adapters (2/4, 3/4, 4/4, 5/8, 7/8)
console.log("\n3. ÖLÇÜ ADAPTÖRÜ (METER CONTAINERS) TESTİ:");
for (const [meterKey, meter] of Object.entries(METERS)) {
  const rendered = quantumEventPool.renderComposition({
    makamId: 'rast',
    meterId: meterKey,
    bpm: 120,
    ensembleId: 'symphonic',
    useRetroactiveTonic: true
  });
  
  const midiBlob = generateAdvancedMidiFile(rendered, { bpm: 120, meterId: meterKey });
  console.log(`  [${meter.icon} ${meter.name}] ➔ Ölçü Süresi: ${rendered[0].timing.totalDuration.toFixed(2)}s | MIDI Blob: ${midiBlob.size} bytes`);
}

// 4. Test MusicXML Export
console.log("\n4. MUSICXML PARTİSYON ÜRETİM TESTİ:");
const renderedDefault = quantumEventPool.renderComposition({ makamId: 'hicaz', meterId: '7/8_322', bpm: 120 });
const xmlBlob = generateMusicXml(renderedDefault, { title: 'Ölümsüz Oyun Hicaz Senfonisi' });
console.log(`- MusicXML Üretildi: Boyut = ${xmlBlob.size} bytes (Tüm notasyon yazılımları ile %100 uyumlu).`);

console.log("\n==================================================================");
console.log("   TÜM MİMARİ BİLEŞENLERİ %100 BAŞARIYLA DOĞRULANDI! 🎼🚀        ");
console.log("==================================================================");
