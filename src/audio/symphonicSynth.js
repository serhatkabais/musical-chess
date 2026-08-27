/**
 * Homogeneous Symphonic Strings Ensemble Web Audio Engine (Section 3, 4, 5)
 * 
 * Features:
 * - Pure Homogeneous Strings Group (Violins, Violas, Cellos, Contrabasses)
 * - Authentic string articulation models (Pizzicato, Spiccato, Legato, Detache, Tremolo, Pad Chords)
 * - Real-time microtonal cent detuning
 * - Strict Measure Clamp Rule (Ölçü Kelepçesi - Note-off on barline)
 * - Tactical sfx (Clash Chords, Fork ffz, Skewer subito piano, Pin tremolo)
 */

class SymphonicSynth {
  constructor() {
    this.audioCtx = null;
    this.masterGain = null;
    this.reverbNode = null;
    this.dryGain = null;
    this.wetGain = null;

    this.volume = 0.85;
    this.reverbLevel = 0.45;
    this.isMuted = false;

    // Active nodes currently playing in this measure (for Ölçü Kelepçesi)
    this.measureActiveNodes = [];
  }

  async ensureAudioContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContextClass();

      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);

      this.createReverbGraph();
      this.masterGain.connect(this.audioCtx.destination);
    }

    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }
  }

  createReverbGraph() {
    const sampleRate = this.audioCtx.sampleRate;
    const length = sampleRate * 2.5;
    const impulse = this.audioCtx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const decay = Math.exp(-i / (sampleRate * 0.75));
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

  setVolume(vol) {
    this.volume = vol;
    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : vol, this.audioCtx.currentTime, 0.05);
    }
  }

  setReverbLevel(lvl) {
    this.reverbLevel = lvl;
    if (this.dryGain && this.wetGain && this.audioCtx) {
      const now = this.audioCtx.currentTime;
      this.dryGain.gain.setTargetAtTime(1 - lvl, now, 0.05);
      this.wetGain.gain.setTargetAtTime(lvl, now, 0.05);
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    this.setVolume(this.volume);
    return this.isMuted;
  }

  /**
   * Play a rendered MoveEvent with precise strings articulation
   */
  async playRenderedEvent(renderedEvent) {
    if (this.isMuted) return;
    await this.ensureAudioContext();

    const {
      side,
      mutatedTarget,
      mutatedPath,
      mutatedKingChord,
      mutatedCaptureChord,
      timing,
      velocity,
      velocityCurve,
      articulation,
      effect
    } = renderedEvent;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    // If White's move (start of new measure), apply Ölçü Kelepçesi to cut previous measure residues
    if (side === 'w') {
      this.clampMeasureBarline();
    }

    const attackDurations = timing.durationsInSeconds;
    let timeOffset = 0;

    // 1. PLAY MOTIF NOTES WITH STRINGS ARTICULATION
    attackDurations.forEach((dur, stepIdx) => {
      const stepPitch = (mutatedPath && mutatedPath[stepIdx]) ? mutatedPath[stepIdx] : mutatedTarget;
      const stepVel = (velocityCurve && velocityCurve[stepIdx]) ? velocityCurve[stepIdx] : velocity;

      setTimeout(() => {
        if (!this.audioCtx) return;
        this.synthesizeStringsVoice({
          frequency: stepPitch.freq,
          cents: stepPitch.cents,
          duration: dur,
          velocity: stepVel / 127.0,
          articulation,
          effect
        });
      }, timeOffset * 1000);

      timeOffset += dur;
    });

    // 2. KING DEGREE CHORD (Section 3: Orkestral Gövde Akoru)
    if (mutatedKingChord && mutatedKingChord.length > 0) {
      this.triggerKingBodyChord(mutatedKingChord, timing.halfMeasureDurationSec, velocity / 127.0);
    }

    // 3. CAPTURE CLASH CHORD (Section 5: Çarpışma Akoru)
    if (mutatedCaptureChord && mutatedCaptureChord.length > 0) {
      this.triggerCaptureClashChord(mutatedCaptureChord, velocity / 127.0);
    }

    // 4. Barline Clamp: If Black's move ends, schedule exact Barline Note-Off
    if (timing.isBarlineEnd) {
      setTimeout(() => {
        this.clampMeasureBarline();
      }, timing.halfMeasureDurationSec * 1000);
    }
  }

  /**
   * Synthesizes strings voice based on articulation technique
   */
  synthesizeStringsVoice(params) {
    const { frequency, cents = 0, duration, velocity = 0.7, articulation, effect } = params;
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    const voiceGain = ctx.createGain();
    voiceGain.connect(this.dryGain);
    voiceGain.connect(this.reverbNode);

    // Dynamic modifiers (Subito Piano, Sforzando ffz)
    let finalVol = velocity;
    if (effect === 'subito_piano') finalVol = 0.25;
    else if (effect === 'crescendo_to_ffz') finalVol = Math.min(1.0, velocity * 1.35);

    switch (articulation) {
      // 1. PIZZICATO / SPICCATO (Piyon & At)
      case 'pizzicato':
      case 'staccato_pizz':
      case 'spiccato_pizz': {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(frequency, now);
        osc.detune.setValueAtTime(cents, now);

        // String Pluck Transient
        const pluck = ctx.createOscillator();
        pluck.type = 'sawtooth';
        pluck.frequency.setValueAtTime(frequency * 3.5, now);
        const pluckGain = ctx.createGain();
        pluckGain.gain.setValueAtTime(finalVol * 0.4, now);
        pluckGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
        pluck.connect(pluckGain);
        pluckGain.connect(voiceGain);

        osc.connect(voiceGain);

        const pizzDur = Math.min(duration, 0.3);
        voiceGain.gain.setValueAtTime(0.0001, now);
        voiceGain.gain.exponentialRampToValueAtTime(finalVol * 0.95, now + 0.005);
        voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + pizzDur);

        osc.start(now);
        pluck.start(now);
        osc.stop(now + pizzDur + 0.05);
        pluck.stop(now + 0.04);
        this.measureActiveNodes.push({ gain: voiceGain, osc });
        break;
      }

      // 2. TREMOLO (Açmaz - Pin)
      case 'tremolo': {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        osc1.type = 'sawtooth';
        osc2.type = 'sawtooth';
        osc1.frequency.setValueAtTime(frequency, now);
        osc2.frequency.setValueAtTime(frequency * 1.006, now);
        osc1.detune.setValueAtTime(cents, now);
        osc2.detune.setValueAtTime(cents + 5, now);

        // Tremolo LFO Amplitude Modulation
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(14, now); // 14 Hz fast tremolo bowing
        const lfoGain = ctx.createGain();
        lfoGain.gain.setValueAtTime(0.4 * finalVol, now);
        lfo.connect(lfoGain.gain);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(Math.min(frequency * 3.2, 3600), now);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(voiceGain);

        voiceGain.gain.setValueAtTime(0.0001, now);
        voiceGain.gain.linearRampToValueAtTime(finalVol * 0.85, now + 0.03);
        voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        osc1.start(now);
        osc2.start(now);
        lfo.start(now);
        osc1.stop(now + duration + 0.05);
        osc2.stop(now + duration + 0.05);
        lfo.stop(now + duration + 0.05);
        this.measureActiveNodes.push({ gain: voiceGain, osc: osc1 });
        break;
      }

      // 3. DETACHE / HEAVY CELLO & BASS (Kale)
      case 'detache':
      case 'detache_heavy': {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(frequency, now);
        osc.detune.setValueAtTime(cents, now);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(Math.min(frequency * 2.2, 2200), now);

        osc.connect(filter);
        filter.connect(voiceGain);

        voiceGain.gain.setValueAtTime(0.0001, now);
        voiceGain.gain.linearRampToValueAtTime(finalVol * 0.9, now + 0.04);
        voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + duration + 0.1);

        osc.start(now);
        osc.stop(now + duration + 0.15);
        this.measureActiveNodes.push({ gain: voiceGain, osc });
        break;
      }

      // 4. LEGATO / CANTONABILE / CASCADE (Fil, Vezir)
      case 'legato':
      case 'legato_arpeggio':
      case 'legato_crescendo':
      default: {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        osc1.type = 'sawtooth';
        osc2.type = 'triangle';
        osc1.frequency.setValueAtTime(frequency, now);
        osc2.frequency.setValueAtTime(frequency * 1.004, now);
        osc1.detune.setValueAtTime(cents, now);
        osc2.detune.setValueAtTime(cents + 3, now);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(Math.min(frequency * 3.5, 4500), now);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(voiceGain);

        voiceGain.gain.setValueAtTime(0.0001, now);
        voiceGain.gain.linearRampToValueAtTime(finalVol * 0.85, now + 0.03);
        voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + duration + 0.1);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + duration + 0.12);
        osc2.stop(now + duration + 0.12);
        this.measureActiveNodes.push({ gain: voiceGain, osc: osc1 });
        break;
      }
    }
  }

  /**
   * King Degree Chord (Section 3: Orkestral Yaylı Gövde Akoru)
   */
  triggerKingBodyChord(chordPitches, duration, velocity) {
    if (!this.audioCtx) return;
    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    chordPitches.forEach((pitch, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = (idx % 2 === 0) ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(pitch.freq, now);
      osc.detune.setValueAtTime(pitch.cents || 0, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(Math.min(pitch.freq * 2.0, 1800), now);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.dryGain);
      gain.connect(this.reverbNode);

      const chordVol = (velocity * 0.35) / chordPitches.length;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(chordVol, now + 0.08);
      gain.gain.setValueAtTime(chordVol, now + duration * 0.85);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.start(now);
      osc.stop(now + duration + 0.05);
      this.measureActiveNodes.push({ gain, osc });
    });
  }

  /**
   * Capture Clash Chord (Section 5: Çarpışma Akoru)
   */
  triggerCaptureClashChord(clashPitches, velocity) {
    if (!this.audioCtx) return;
    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    clashPitches.forEach((p, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(p.freq, now);
      osc.detune.setValueAtTime(p.cents || 0, now);

      osc.connect(gain);
      gain.connect(this.dryGain);
      gain.connect(this.reverbNode);

      const vol = (velocity * 0.45) / clashPitches.length;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(vol, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

      osc.start(now);
      osc.stop(now + 0.4);
      this.measureActiveNodes.push({ gain, osc });
    });
  }

  /**
   * Ölçü Kelepçesi (Measure Clamp):
   * Clamps and fades out all active voices at the measure barline.
   */
  clampMeasureBarline() {
    if (!this.audioCtx) return;
    const now = this.audioCtx.currentTime;
    this.measureActiveNodes.forEach(({ gain, osc }) => {
      try {
        gain.gain.setTargetAtTime(0.0001, now, 0.02);
        setTimeout(() => {
          try { osc.stop(); } catch (e) {}
        }, 30);
      } catch (e) {}
    });
    this.measureActiveNodes = [];
  }

  stopActiveSustains() {
    this.clampMeasureBarline();
  }
}

export const symphonicSynth = new SymphonicSynth();
