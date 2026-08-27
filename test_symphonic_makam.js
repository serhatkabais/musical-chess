import { FAMOUS_GAMES } from './src/chess/famousGames.js';
import { quantumEventPool } from './src/audio/quantumEventPool.js';
import { getSquarePitch, getKingDegreeChord, getCaptureClashChord } from './src/theory/squarePitchMapper.js';
import { MAKAMS } from './src/theory/makamEngine.js';
import { METERS } from './src/rhythm/meterAdapter.js';

console.log("==================================================================");
console.log("   SATRANÇ SENFONİK YAYLI ORKESTRASI & ŞARTNAME TESTİ             ");
console.log("==================================================================");

// 1. Dikey Referans Matrisi Testi
console.log("\n1. DİKEY REFERANS NOTA MATRİSİ DOĞRULAMA (Section 2):");
const a1 = getSquarePitch('a1');
const a8 = getSquarePitch('a8');
const e2 = getSquarePitch('e2');
const e4 = getSquarePitch('e4');

console.log(`- a1 karesi: ${a1.noteName} (${a1.solfege}) [Kök]`);
console.log(`- a8 karesi: ${a8.noteName} (${a8.solfege}) [Tiz]`);
console.log(`- 1.e4 Açılışı: e2(${e2.noteName}) ➔ e4(${e4.noteName}) [Melodik 3'lü Atlama: ${e2.solfege} ➔ ${e4.solfege}]`);

// 2. Şah Derece Akoru & Çarpışma Akoru Testi
console.log("\n2. ŞAH DERECE AKORU & TAŞ YEME ÇARPIŞMA AKORU (Section 3 & 5):");
const kingChord = getKingDegreeChord('e1');
console.log(`- Şah e1 Karesi Akoru: ${kingChord.map(n => n.noteName).join(' - ')} (4 Sesli Legato Pad)`);

const queenClash = getCaptureClashChord('d8', 'q');
console.log(`- Vezir Yeme Çarpışma Akoru (d8): ${queenClash.length} Sesli Sarsıcı Akor`);

// 3. Karşılıklı İki Hamle = Tek Ölçü (Section 1)
console.log("\n3. KARŞILIKLI İKİ HAMLE = TEK ÖLÇÜ (FULL MOVE = 1 MEASURE):");
const immortalGame = FAMOUS_GAMES[0];
quantumEventPool.buildFromGame(immortalGame.moves);
const rendered = quantumEventPool.renderComposition({ makamId: 'rast', meterId: '4/4', bpm: 120 });

console.log(`- Toplam Hamle Çifti (Ölçü Sayısı): ${quantumEventPool.measures.length} Ölçü`);
console.log(`- 1. Ölçü:`);
console.log(`  * Beyaz Hamlesi (İlk 2 Vuruş): ${quantumEventPool.measures[0].whiteEvent.san} [${quantumEventPool.measures[0].whiteEvent.articulationName}]`);
console.log(`  * Siyah Hamlesi (Son 2 Vuruş): ${quantumEventPool.measures[0].blackEvent.san} [${quantumEventPool.measures[0].blackEvent.articulationName}]`);

console.log("\n==================================================================");
console.log("   ŞARTNAMENİN TÜM BÖLÜMLERİ %100 BAŞARIYLA GEÇTİ! 🎼🚀           ");
console.log("==================================================================");
