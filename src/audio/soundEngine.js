/**
 * Web Audio API Synthesizer & Web MIDI Output Engine
 * Enhanced with:
 * - Harmonic Accompaniment & Bass Drone
 * - Capture Arpeggio Chords
 * - White & Black Duet Instruments
 * - Quantized Musical Flow
 */

import { getSquareNote, getDurationInSeconds, PIECE_DURATIONS, getScaleMode } from './noteMapping.js';

class SoundEngine {
  constructor() {
    this.audioCtx = null;
    this.masterGain = null;
    this.reverbNode = null;
    this.dryGain = null;
    this.wetGain = null;
    
    this.instrument = 'piano';
    this.whiteInstrument = 'piano';
    this.blackInstrument = 'electric-piano';
    
    this.tempo = 120;
    this.volume = 0.8;
    this.reverbLevel = 0.4;
    this.isMuted = false;

    // Advanced musical features toggles
    this.isDuetMode = true;             // Beyaz & Siyah farklı enstrümanlar
    this.isAccompanimentEnabled = true; // Otomatik bas ve akor eşliği
    this.isQuantizedFlow = true;        // Akıcı ritmik zamanlama
    this.timeSignature = '4/4';         // '2/4', '3/4', '4/4'

    // MIDI Access
    this.midiAccess = null;
    this.selectedMidiOutput = null;
    this.midiOutputs = [];

    this.initMidi();
  }

  setTimeSignature(sig) {
    if (['2/4', '3/4', '4/4'].includes(sig)) {
      this.timeSignature = sig;
    }
  }

  /**
   * Initializes or resumes AudioContext on user gesture
   */
  async ensureAudioContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContextClass();

      // Master Gain
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);

      // Reverb / Effects
      this.createReverbGraph();

      this.masterGain.connect(this.audioCtx.destination);
    }

    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }
  }

  /**
   * Creates an algorithmic impulse response reverb with smooth decay
   */
  createReverbGraph() {
    const sampleRate = this.audioCtx.sampleRate;
    const length = sampleRate * 2.5; // 2.5 seconds lush impulse
    const impulse = this.audioCtx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const decay = Math.exp(-i / (sampleRate * 0.7));
      left[i] = (Math.random() * 2 - 1) * decay;
      right[i] = (Math.random() * 2 - 1) * decay;
    }

    this.reverbNode = this.audioCtx.createConvolver();
    this.reverbNode.buffer = impulse;

    this.dryGain = this.audioCtx.createGain();
    this.wetGain = this.audioCtx.createGain();

    this.dryGain.gain.setValueAtTime(1 - this.reverbLevel, this.audioCtx.currentTime);
    this.wetGain.gain.setValueAtTime(this.reverbLevel, this.audioCtx.currentTime);

    this.reverbNode.connect(this.wetGain);
    this.dryGain.connect(this.masterGain);
    this.wetGain.connect(this.masterGain);
  }

  setReverbLevel(level) {
    this.reverbLevel = level;
    if (this.dryGain && this.wetGain && this.audioCtx) {
      const now = this.audioCtx.currentTime;
      this.dryGain.gain.setTargetAtTime(1 - level, now, 0.05);
      this.wetGain.gain.setTargetAtTime(level, now, 0.05);
    }
  }

  setVolume(vol) {
    this.volume = vol;
    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : vol, this.audioCtx.currentTime, 0.05);
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    this.setVolume(this.volume);
    return this.isMuted;
  }

  setTempo(bpm) {
    this.tempo = bpm;
  }

  setInstrument(inst) {
    this.instrument = inst;
  }

  setDuetMode(enabled, whiteInst = 'piano', blackInst = 'electric-piano') {
    this.isDuetMode = enabled;
    this.whiteInstrument = whiteInst;
    this.blackInstrument = blackInst;
  }

  setAccompaniment(enabled) {
    this.isAccompanimentEnabled = enabled;
  }

  setQuantizedFlow(enabled) {
    this.isQuantizedFlow = enabled;
  }

  /**
   * Play a note based on chess move
   * @param {string} square - e.g. "e4"
   * @param {string} pieceType - 'p', 'n', 'b', 'r', 'q', 'k'
   * @param {boolean} isCapture - if true, plays rich capture chord
   * @param {string} color - 'w' (White) or 'b' (Black)
   */
  async playMoveNote(square, pieceType = 'p', isCapture = false, color = 'w') {
    if (this.isMuted) return;
    await this.ensureAudioContext();

    const noteInfo = getSquareNote(square);
    const duration = getDurationInSeconds(pieceType, this.tempo, this.isQuantizedFlow);

    // Determine active instrument timbre for this move
    let activeInst = this.instrument;
    if (this.isDuetMode) {
      activeInst = (color === 'b') ? this.blackInstrument : this.whiteInstrument;
    }

    // 1. Taş Yeme Akoru (Capture Chord)
    if (isCapture) {
      this.playCaptureChord(noteInfo.midi, duration, activeInst);
    } 
    // 2. Şah Hamlesi (King Majestic Triad Chord)
    else if (pieceType.toLowerCase() === 'k') {
      this.playKingChord(noteInfo.midi, duration, activeInst);
    } 
    // 3. Normal Tekil Nota
    else {
      this.triggerVoice(noteInfo.freq, duration, 0.85, activeInst);
      this.sendMidiNote(noteInfo.midi, duration);
    }

    // 4. Otomatik Akor & Bas Eşliği (Harmonic Accompaniment)
    if (this.isAccompanimentEnabled) {
      this.playHarmonicAccompaniment(noteInfo.midi, duration, color);
    }

    return { noteInfo, duration };
  }

  /**
   * Taş alma esnasında tınlayan parlak arpejli akor
   */
  playCaptureChord(rootMidi, duration, instrument) {
    // Kök + Majör/Minör 3'lü + 5'li + Oktav Süslemesi
    const chordMidis = [rootMidi, rootMidi + 4, rootMidi + 7, rootMidi + 12];

    chordMidis.forEach((midi, idx) => {
      const freq = 440 * Math.pow(2, (midi - 69) / 12);
      // Hafif arpej gecikmesi (strum effect)
      setTimeout(() => {
        if (this.audioCtx) {
          this.triggerVoice(freq, duration * (1 + idx * 0.15), 0.75 - (idx * 0.1), instrument);
          this.sendMidiNote(midi, duration);
        }
      }, idx * 45);
    });
  }

  /**
   * Şah Hamlesi Majör Akoru
   */
  playKingChord(rootMidi, duration, instrument) {
    const chordMidis = [rootMidi - 12, rootMidi, rootMidi + 4, rootMidi + 7];
    chordMidis.forEach((midi, idx) => {
      const freq = 440 * Math.pow(2, (midi - 69) / 12);
      this.triggerVoice(freq, duration * 1.2, 0.7, instrument);
      this.sendMidiNote(midi, duration);
    });
  }

  /**
   * Arka plan otomatik bas ve armonik atmosfer (Bass & Chords Rhythm Patterns)
   * 2/4 (March): 1=Bass, 2=Chord
   * 3/4 (Waltz): 1=Bass (Boom), 2=Chord (Tsch), 3=Chord (Tsch)
   * 4/4 (Classical): 1=Bass, 2=Chord, 3=Bass, 4=Chord
   */
  playHarmonicAccompaniment(midiNote, duration, color) {
    if (!this.audioCtx) return;

    const rootMidi = Math.max(36, (midiNote % 12) + 36); // Deep bass C2-B2
    const thirdMidi = rootMidi + 16; // Mid-range harmony
    const fifthMidi = rootMidi + 19;

    const beatSec = 60 / this.tempo;
    const now = this.audioCtx.currentTime;

    // 1. Root Bass on Beat 1
    const bassFreq = 440 * Math.pow(2, (rootMidi - 69) / 12);
    this.triggerSubBass(bassFreq, beatSec * 0.85);

    // 2. Chords pattern based on Time Signature
    if (this.timeSignature === '3/4') {
      // Vals / Waltz: Beat 2 and Beat 3 warm piano/strings chords
      setTimeout(() => {
        if (this.audioCtx) this.triggerSoftChord([thirdMidi, fifthMidi], beatSec * 0.7);
      }, beatSec * 1000);

      setTimeout(() => {
        if (this.audioCtx) this.triggerSoftChord([thirdMidi, fifthMidi + 12], beatSec * 0.7);
      }, beatSec * 2000);
    } else if (this.timeSignature === '2/4') {
      // March / Polka: Beat 2 crisp chord
      setTimeout(() => {
        if (this.audioCtx) this.triggerSoftChord([thirdMidi, fifthMidi], beatSec * 0.6);
      }, beatSec * 1000);
    } else {
      // 4/4 Classical: Beat 2 and Beat 4 chords, Beat 3 bass
      setTimeout(() => {
        if (this.audioCtx) this.triggerSoftChord([thirdMidi, fifthMidi], beatSec * 0.7);
      }, beatSec * 1000);

      setTimeout(() => {
        if (this.audioCtx) this.triggerSubBass(bassFreq * 1.5, beatSec * 0.8); // 5th in bass
      }, beatSec * 2000);

      setTimeout(() => {
        if (this.audioCtx) this.triggerSoftChord([thirdMidi, fifthMidi + 12], beatSec * 0.7);
      }, beatSec * 3000);
    }
  }

  triggerSubBass(frequency, duration) {
    if (!this.audioCtx) return;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    const now = this.audioCtx.currentTime;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(frequency, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(this.dryGain);
    gain.connect(this.reverbNode);

    osc.start(now);
    osc.stop(now + duration + 0.05);
  }

  triggerSoftChord(midiNotes, duration) {
    if (!this.audioCtx) return;
    midiNotes.forEach(m => {
      const f = 440 * Math.pow(2, (m - 69) / 12);
      this.triggerVoice(f, duration, 0.4, 'strings');
    });
  }

  /**
   * Dramatik Şah / Mat efektleri
   */
  async playAlertSound(type = 'check') {
    if (this.isMuted) return;
    await this.ensureAudioContext();

    if (type === 'check') {
      // Dramatik gerilim arpeji
      const checkNotes = [69, 72, 75, 78]; // A Minor Diminished tension
      checkNotes.forEach((m, idx) => {
        setTimeout(() => {
          const f = 440 * Math.pow(2, (m - 69) / 12);
          this.triggerVoice(f, 0.4, 0.7, 'strings');
        }, idx * 60);
      });
    } else if (type === 'mate') {
      // Görkemli zafer akoru
      const mateNotes = [60, 64, 67, 72, 76, 79]; // C Major Triumph
      mateNotes.forEach((m, idx) => {
        setTimeout(() => {
          const f = 440 * Math.pow(2, (m - 69) / 12);
          this.triggerVoice(f, 1.8, 0.85, 'piano');
        }, idx * 120);
      });
    }
  }

  /**
   * Synthesize single voice
   */
  triggerVoice(frequency, duration, velocity = 0.8, customInst = null) {
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    const inst = customInst || this.instrument;

    const voiceGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    voiceGain.connect(this.dryGain);
    voiceGain.connect(this.reverbNode);

    switch (inst) {
      case 'piano': {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        osc1.type = 'triangle';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(frequency, now);
        osc2.frequency.setValueAtTime(frequency * 2, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(Math.min(frequency * 4, 8000), now);
        filter.frequency.exponentialRampToValueAtTime(frequency * 1.5, now + duration);

        const osc2Gain = ctx.createGain();
        osc2Gain.gain.setValueAtTime(0.25, now);

        osc1.connect(filter);
        osc2.connect(osc2Gain);
        osc2Gain.connect(filter);
        filter.connect(voiceGain);

        const attack = 0.008;
        const decay = duration * 0.4;
        const peak = velocity * 0.9;
        voiceGain.gain.setValueAtTime(0.0001, now);
        voiceGain.gain.exponentialRampToValueAtTime(peak, now + attack);
        voiceGain.gain.exponentialRampToValueAtTime(peak * 0.45, now + attack + decay);
        voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + duration + 0.2);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + duration + 0.25);
        osc2.stop(now + duration + 0.25);
        break;
      }

      case 'electric-piano': {
        const carrier = ctx.createOscillator();
        const modulator = ctx.createOscillator();
        const modGain = ctx.createGain();

        carrier.type = 'sine';
        carrier.frequency.setValueAtTime(frequency, now);

        modulator.type = 'sine';
        modulator.frequency.setValueAtTime(frequency * 3.5, now);

        modGain.gain.setValueAtTime(frequency * 1.2, now);
        modGain.gain.exponentialRampToValueAtTime(1, now + duration * 0.5);

        modulator.connect(modGain);
        modGain.connect(carrier.frequency);
        carrier.connect(voiceGain);

        voiceGain.gain.setValueAtTime(0.0001, now);
        voiceGain.gain.exponentialRampToValueAtTime(velocity * 0.85, now + 0.01);
        voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + duration + 0.3);

        carrier.start(now);
        modulator.start(now);
        carrier.stop(now + duration + 0.35);
        modulator.stop(now + duration + 0.35);
        break;
      }

      case 'marimba': {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(frequency, now);

        const click = ctx.createOscillator();
        click.type = 'square';
        click.frequency.setValueAtTime(frequency * 6, now);
        const clickGain = ctx.createGain();
        clickGain.gain.setValueAtTime(0.2, now);
        clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);
        click.connect(clickGain);
        clickGain.connect(voiceGain);

        osc.connect(voiceGain);

        const marimbaDur = Math.min(duration, 0.45);
        voiceGain.gain.setValueAtTime(0.0001, now);
        voiceGain.gain.exponentialRampToValueAtTime(velocity, now + 0.003);
        voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + marimbaDur + 0.1);

        osc.start(now);
        click.start(now);
        osc.stop(now + marimbaDur + 0.15);
        click.stop(now + 0.03);
        break;
      }

      case 'strings': {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        osc1.type = 'sawtooth';
        osc2.type = 'sawtooth';
        osc1.frequency.setValueAtTime(frequency, now);
        osc2.frequency.setValueAtTime(frequency * 1.003, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(Math.min(frequency * 3, 4000), now);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(voiceGain);

        const attackTime = Math.min(0.08, duration * 0.2);
        voiceGain.gain.setValueAtTime(0.0001, now);
        voiceGain.gain.linearRampToValueAtTime(velocity * 0.7, now + attackTime);
        voiceGain.gain.setValueAtTime(velocity * 0.65, now + duration * 0.7);
        voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + duration + 0.4);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + duration + 0.45);
        osc2.stop(now + duration + 0.45);
        break;
      }

      case 'synthwave': {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(frequency, now);

        filter.type = 'lowpass';
        filter.Q.setValueAtTime(5, now);
        filter.frequency.setValueAtTime(frequency * 7, now);
        filter.frequency.exponentialRampToValueAtTime(frequency * 1.2, now + duration);

        osc.connect(filter);
        filter.connect(voiceGain);

        voiceGain.gain.setValueAtTime(0.0001, now);
        voiceGain.gain.exponentialRampToValueAtTime(velocity * 0.8, now + 0.01);
        voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + duration + 0.1);

        osc.start(now);
        osc.stop(now + duration + 0.15);
        break;
      }

      case 'organ': {
        const freqs = [frequency, frequency * 2, frequency * 3];
        const gains = [0.5, 0.3, 0.2];

        freqs.forEach((f, idx) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = 'sine';
          o.frequency.setValueAtTime(f, now);
          g.gain.setValueAtTime(gains[idx] * velocity, now);

          o.connect(g);
          g.connect(voiceGain);

          o.start(now);
          o.stop(now + duration + 0.1);
        });

        voiceGain.gain.setValueAtTime(0.0001, now);
        voiceGain.gain.linearRampToValueAtTime(1.0, now + 0.02);
        voiceGain.gain.setValueAtTime(1.0, now + duration);
        voiceGain.gain.linearRampToValueAtTime(0.0001, now + duration + 0.1);
        break;
      }

      case '8bit':
      default: {
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(frequency, now);

        osc.connect(voiceGain);

        voiceGain.gain.setValueAtTime(0.0001, now);
        voiceGain.gain.setValueAtTime(velocity * 0.6, now + 0.001);
        voiceGain.gain.setValueAtTime(velocity * 0.6, now + duration * 0.8);
        voiceGain.gain.setValueAtTime(0.0001, now + duration);

        osc.start(now);
        osc.stop(now + duration + 0.02);
        break;
      }
    }
  }

  /**
   * Web MIDI Initializer & Device detection
   */
  async initMidi() {
    if (navigator.requestMIDIAccess) {
      try {
        this.midiAccess = await navigator.requestMIDIAccess();
        this.updateMidiOutputs();
        this.midiAccess.onstatechange = () => this.updateMidiOutputs();
      } catch (err) {
        console.warn('Web MIDI Access not granted / not supported:', err);
      }
    }
  }

  updateMidiOutputs() {
    if (!this.midiAccess) return;
    this.midiOutputs = [];
    for (const output of this.midiAccess.outputs.values()) {
      this.midiOutputs.push(output);
    }

    const selectEl = document.getElementById('select-midi-out');
    if (selectEl) {
      selectEl.innerHTML = '<option value="">(Web Audio Synth Aktif)</option>';
      this.midiOutputs.forEach((out, i) => {
        const opt = document.createElement('option');
        opt.value = out.id;
        opt.textContent = `🎹 ${out.name || 'MIDI Device ' + (i + 1)}`;
        selectEl.appendChild(opt);
      });
    }
  }

  setMidiOutput(id) {
    if (!this.midiAccess) return;
    this.selectedMidiOutput = this.midiOutputs.find(out => out.id === id) || null;
  }

  sendMidiNote(midiNote, durationSec, velocity = 100) {
    if (!this.selectedMidiOutput) return;

    try {
      const NOTE_ON = 0x90;
      const NOTE_OFF = 0x80;
      this.selectedMidiOutput.send([NOTE_ON, midiNote, velocity]);

      setTimeout(() => {
        if (this.selectedMidiOutput) {
          this.selectedMidiOutput.send([NOTE_OFF, midiNote, 0]);
        }
      }, durationSec * 1000);
    } catch (e) {
      console.warn('Error sending MIDI message:', e);
    }
  }
}

export const soundEngine = new SoundEngine();
