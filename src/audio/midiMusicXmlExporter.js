/**
 * Advanced Multi-Track MIDI & MusicXML Exporter
 * 
 * Supports:
 * - Microtonal Pitch Bend events for Authentic Makams
 * - Meter-adapted MIDI Track Time Signatures (2/4, 3/4, 4/4, 5/8, 7/8)
 * - MusicXML Standard 3.1 Notation Export
 */

import { METERS } from '../rhythm/meterAdapter.js';

function writeVLQ(value) {
  const bytes = [];
  let v = value & 0x7F;
  while ((value >>= 7)) {
    v <<= 8;
    v |= ((value & 0x7F) | 0x80);
  }
  while (true) {
    bytes.push(v & 0xFF);
    if (v & 0x80) v >>= 8;
    else break;
  }
  return bytes;
}

function stringToBytes(str) {
  return str.split('').map(c => c.charCodeAt(0));
}

function numToBytes32(num) {
  return [(num >> 24) & 0xFF, (num >> 16) & 0xFF, (num >> 8) & 0xFF, num & 0xFF];
}

function numToBytes16(num) {
  return [(num >> 8) & 0xFF, num & 0xFF];
}

/**
 * Generate Standard Multi-Channel MIDI file with microtonal pitch bends
 */
export function generateAdvancedMidiFile(renderedEvents, options = {}) {
  const {
    bpm = 120,
    meterId = '4/4',
    title = 'Symphonic Chess Composition'
  } = options;

  const TICKS_PER_QUARTER = 480;
  const usPerQuarter = Math.round(60000000 / bpm);
  const meter = METERS[meterId] || METERS['4/4'];

  const trackEvents = [];

  // 1. Time Signature Event (Delta 0)
  trackEvents.push(...writeVLQ(0), 0xFF, 0x58, 0x04, ...meter.midiTimeSig);

  // 2. Set Tempo
  trackEvents.push(
    ...writeVLQ(0),
    0xFF, 0x51, 0x03,
    (usPerQuarter >> 16) & 0xFF,
    (usPerQuarter >> 8) & 0xFF,
    usPerQuarter & 0xFF
  );

  // 3. Track Name
  trackEvents.push(
    ...writeVLQ(0),
    0xFF, 0x03, title.length,
    ...stringToBytes(title)
  );

  // 4. Notes & Pitch Bends
  for (const ev of renderedEvents) {
    const { mutatedTarget, mutatedPath, timing, velocity, instrument } = ev;
    const channel = (instrument && instrument.channel !== undefined) ? instrument.channel : 0;

    // Pitch Bend for microtones (Cents: -50 to +50 -> 8192 center point)
    const cents = mutatedTarget.cents || 0;
    // Standard pitch bend range = +/- 200 cents (+/- 2 semitones)
    // 8192 = 0 cents, 16383 = +200 cents, 0 = -200 cents
    const bendValue = Math.max(0, Math.min(16383, Math.round(8192 + (cents / 200) * 8192)));
    const lsb = bendValue & 0x7F;
    const msb = (bendValue >> 7) & 0x7F;

    // Send Pitch Bend (0xE0 | channel)
    trackEvents.push(...writeVLQ(0), (0xE0 | channel), lsb, msb);

    const attackDurations = timing.durationsInSeconds;
    const beatSec = 60.0 / bpm;

    attackDurations.forEach((durSec, idx) => {
      const stepPitch = (mutatedPath && mutatedPath[idx]) ? mutatedPath[idx] : mutatedTarget;
      const ticks = Math.max(12, Math.round((durSec / beatSec) * TICKS_PER_QUARTER));

      // Note On
      trackEvents.push(...writeVLQ(0), (0x90 | channel), stepPitch.midi, Math.min(127, velocity));

      // Note Off after duration ticks
      trackEvents.push(...writeVLQ(ticks), (0x80 | channel), stepPitch.midi, 0);
    });

    // Reset pitch bend at end of event
    trackEvents.push(...writeVLQ(0), (0xE0 | channel), 0x00, 0x40);
  }

  // End of Track
  trackEvents.push(...writeVLQ(0), 0xFF, 0x2F, 0x00);

  // MThd Header Chunk
  const headerBytes = [
    ...stringToBytes('MThd'),
    ...numToBytes32(6),
    ...numToBytes16(0), // Format 0
    ...numToBytes16(1), // 1 Track
    ...numToBytes16(TICKS_PER_QUARTER)
  ];

  // MTrk Chunk
  const trackBytes = [
    ...stringToBytes('MTrk'),
    ...numToBytes32(trackEvents.length),
    ...trackEvents
  ];

  const fullMidi = new Uint8Array([...headerBytes, ...trackBytes]);
  return new Blob([fullMidi], { type: 'audio/midi' });
}

/**
 * Generate MusicXML 3.1 file
 */
export function generateMusicXml(renderedEvents, options = {}) {
  const { title = 'Symphonic Chess Score', composer = 'Musical Chess AI' } = options;

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <work><work-title>${title}</work-title></work>
  <identification><creator type="composer">${composer}</creator></identification>
  <part-list>
    <score-part id="P1"><part-name>Chess Orchestration</part-name></score-part>
  </part-list>
  <part id="P1">
`;

  let measureNum = 1;
  renderedEvents.forEach((ev) => {
    const p = ev.mutatedTarget;
    const step = ['C', 'C', 'D', 'D', 'E', 'F', 'F', 'G', 'G', 'A', 'A', 'B'][p.midi % 12];
    const octave = Math.floor(p.midi / 12) - 1;

    xml += `    <measure number="${measureNum}">
      <attributes>
        <divisions>4</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <direction placement="above">
        <direction-type><words font-weight="bold">${ev.san} (${ev.piece.toUpperCase()}) - ${ev.dynamicMark}</words></direction-type>
      </direction>
      <note>
        <pitch>
          <step>${step}</step>
          <octave>${octave}</octave>
        </pitch>
        <duration>16</duration>
        <type>whole</type>
      </note>
    </measure>
`;
    measureNum++;
  });

  xml += `  </part>
</score-partwise>`;

  return new Blob([xml], { type: 'application/vnd.recordare.musicxml+xml' });
}

/**
 * Downloads MIDI file in browser
 */
export function downloadMidi(renderedEvents, options, filename = 'chess_symphonic.mid') {
  const blob = generateAdvancedMidiFile(renderedEvents, options);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Downloads MusicXML file in browser
 */
export function downloadMusicXml(renderedEvents, options, filename = 'chess_score.xml') {
  const blob = generateMusicXml(renderedEvents, options);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
