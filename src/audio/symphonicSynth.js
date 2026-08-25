/**
 * Symphonic & Makam Web Audio Synthesis Engine
 * 
 * Features:
 * - Real-time microtonal cent detuning (koma perdeleri)
 * - Continuous Legato Sustain Layer (memory drone to barline)
 * - Authentic synthetic physical modeling for Western & Turkish instruments
 * - Dynamic velocity curves and articulation filters
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

    // Active sustained voices (for continuous legato layer)
    this.activeSustainNodes = [];
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
    const length = sampleRate * 2.8; // Warm 2.8s concert hall / dome acoustic
    const impulse = this.audioCtx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const decay = Math.exp(-i / (sampleRate * 0.8));
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
   * Play a rendered MoveEvent with its attack motif + continuous sustain layer
   * @param {object} renderedEvent 
   */
  async playRenderedEvent(renderedEvent) {
    if (this.isMuted) return;
    await this.ensureAudioContext();

    const {
      mutatedTarget,
      mutatedPath,
      timing,
      instrument,
      velocity,
      velocityCurve,
      articulation,
      isCapture,
      isCheck,
      isMate
    } = renderedEvent;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    // Fade out previous sustain nodes smoothly
    this.stopActiveSustains();

    const attackDurations = timing.durationsInSeconds;
    let timeOffset = 0;

    // 1. PLAY ATTACK MOTIF NOTES
    attackDurations.forEach((dur, stepIdx) => {
      const stepPitch = (mutatedPath && mutatedPath[stepIdx]) ? mutatedPath[stepIdx] : mutatedTarget;
      const stepVel = (velocityCurve && velocityCurve[stepIdx]) ? velocityCurve[stepIdx] : velocity;

      const triggerTime = now + timeOffset;

      setTimeout(() => {
        if (!this.audioCtx) return;
        this.synthesizeInstrumentVoice({
          frequency: stepPitch.freq,
          cents: stepPitch.cents,
          duration: dur,
          velocity: stepVel / 127.0,
          instrumentCode: instrument.code,
          articulation
        });
      }, timeOffset * 1000);

      timeOffset += dur;
    });

    // 2. CONTINUOUS LEGATO SUSTAIN LAYER (Holding pitch to barline)
    const sustainStartTime = now + timeOffset;
    const sustainDuration = timing.sustainDuration;

    setTimeout(() => {
      if (!this.audioCtx) return;
      this.triggerSustainLayer(mutatedTarget.freq, mutatedTarget.cents, sustainDuration, velocity / 127.0, instrument.code);
    }, timeOffset * 1000);

    // 3. TACTICAL ACCENT EFFECTS (Timpani on check, Tutti chord on mate)
    if (isMate) {
      this.triggerMateTutti(mutatedTarget.freq, timing.totalDuration);
    } else if (isCheck) {
      this.triggerCheckAccent(mutatedTarget.freq);
    } else if (isCapture) {
      this.triggerCapturePercussion();
    }
  }

  /**
   * Continuous Legato Sustain Layer
   */
  triggerSustainLayer(freq, cents, duration, velocity, instrumentCode) {
    if (!this.audioCtx) return;
    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = instrumentCode.includes('ney') || instrumentCode.includes('woodwind') ? 'sine' : 'sawtooth';
    osc.frequency.setValueAtTime(freq, now);
    osc.detune.setValueAtTime(cents || 0, now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(freq * 2.5, 2400), now);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.dryGain);
    gain.connect(this.reverbNode);

    const sustainVol = Math.max(0.12, velocity * 0.28);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(sustainVol, now + 0.1);
    gain.gain.setValueAtTime(sustainVol, now + duration * 0.8);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.start(now);
    osc.stop(now + duration + 0.1);

    this.activeSustainNodes.push({ osc, gain });
  }

  stopActiveSustains() {
    if (!this.audioCtx) return;
    const now = this.audioCtx.currentTime;
    this.activeSustainNodes.forEach(({ gain, osc }) => {
      try {
        gain.gain.setTargetAtTime(0.0001, now, 0.04);
        setTimeout(() => osc.stop(), 50);
      } catch (e) {}
    });
    this.activeSustainNodes = [];
  }

  /**
   * Synthesize specific orchestral/makam instrument timbre
   */
  synthesizeInstrumentVoice(params) {
    const { frequency, cents, duration, velocity, instrumentCode, articulation } = params;
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    const voiceGain = ctx.createGain();
    voiceGain.connect(this.dryGain);
    voiceGain.connect(this.reverbNode);

    switch (instrumentCode) {
      // 1. VIOLIN / KANUN PIZZICATO (Pawn)
      case 'pizzicato':
      case 'kanun_pizz': {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(frequency, now);
        osc.detune.setValueAtTime(cents, now);

        const click = ctx.createOscillator();
        click.type = 'square';
        click.frequency.setValueAtTime(frequency * 5, now);
        const clickGain = ctx.createGain();
        clickGain.gain.setValueAtTime(0.3 * velocity, now);
        clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);
        click.connect(clickGain);
        clickGain.connect(voiceGain);

        osc.connect(voiceGain);

        const pizzDur = Math.min(duration, 0.35);
        voiceGain.gain.setValueAtTime(0.0001, now);
        voiceGain.gain.exponentialRampToValueAtTime(velocity * 0.95, now + 0.004);
        voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + pizzDur);

        osc.start(now);
        click.start(now);
        osc.stop(now + pizzDur + 0.05);
        click.stop(now + 0.03);
        break;
      }

      // 2. NEY / CLARINET (Knight)
      case 'ney':
      case 'woodwind': {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        osc1.type = 'sine';
        osc2.type = 'triangle';
        osc1.frequency.setValueAtTime(frequency, now);
        osc2.frequency.setValueAtTime(frequency * 2, now); // Breath harmonic
        osc1.detune.setValueAtTime(cents, now);
        osc2.detune.setValueAtTime(cents, now);

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(frequency * 1.8, now);
        filter.Q.setValueAtTime(2.0, now);

        const osc2Gain = ctx.createGain();
        osc2Gain.gain.setValueAtTime(0.18, now);

        osc1.connect(voiceGain);
        osc2.connect(osc2Gain);
        osc2Gain.connect(filter);
        filter.connect(voiceGain);

        voiceGain.gain.setValueAtTime(0.0001, now);
        voiceGain.gain.linearRampToValueAtTime(velocity * 0.8, now + 0.03);
        voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + duration + 0.1);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + duration + 0.15);
        osc2.stop(now + duration + 0.15);
        break;
      }

      // 3. VIOLINS LEGATO / TANBUR & KANUN (Bishop)
      case 'strings_legato':
      case 'tanbur_kanun': {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        osc1.type = 'sawtooth';
        osc2.type = 'triangle';
        osc1.frequency.setValueAtTime(frequency, now);
        osc2.frequency.setValueAtTime(frequency * 1.004, now); // Chorus
        osc1.detune.setValueAtTime(cents, now);
        osc2.detune.setValueAtTime(cents + 4, now);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(Math.min(frequency * 3.5, 4500), now);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(voiceGain);

        voiceGain.gain.setValueAtTime(0.0001, now);
        voiceGain.gain.linearRampToValueAtTime(velocity * 0.85, now + 0.04);
        voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + duration + 0.15);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + duration + 0.2);
        osc2.stop(now + duration + 0.2);
        break;
      }

      // 4. CELLO / FRENCH HORN (Rook)
      case 'cello_horn':
      case 'kemence_cello': {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(frequency, now);
        osc.detune.setValueAtTime(cents, now);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(Math.min(frequency * 2.2, 1800), now);

        osc.connect(filter);
        filter.connect(voiceGain);

        voiceGain.gain.setValueAtTime(0.0001, now);
        voiceGain.gain.linearRampToValueAtTime(velocity * 0.9, now + 0.05);
        voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + duration + 0.2);

        osc.start(now);
        osc.stop(now + duration + 0.25);
        break;
      }

      // 5. FULL STRINGS & BRASS / MAKAM TUTTI (Queen)
      case 'brass_strings':
      case 'makam_strings': {
        const freqs = [frequency, frequency * 1.5, frequency * 2]; // Rich royal chord
        freqs.forEach((f, idx) => {
          const o = ctx.createOscillator();
          o.type = idx === 0 ? 'sawtooth' : 'triangle';
          o.frequency.setValueAtTime(f, now);
          o.detune.setValueAtTime(cents, now);

          const g = ctx.createGain();
          g.gain.setValueAtTime(velocity * (0.6 / (idx + 1)), now);

          o.connect(g);
          g.connect(voiceGain);

          o.start(now);
          o.stop(now + duration + 0.3);
        });

        voiceGain.gain.setValueAtTime(0.0001, now);
        voiceGain.gain.linearRampToValueAtTime(1.0, now + 0.03);
        voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + duration + 0.3);
        break;
      }

      // 6. CONTRABASS & DEEP UD (King)
      case 'contrabass':
      case 'deep_ud':
      default: {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(frequency * 0.5, now); // Deep low octave
        osc.detune.setValueAtTime(cents, now);

        osc.connect(voiceGain);

        voiceGain.gain.setValueAtTime(0.0001, now);
        voiceGain.gain.linearRampToValueAtTime(velocity * 0.85, now + 0.08);
        voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + duration + 0.3);

        osc.start(now);
        osc.stop(now + duration + 0.35);
        break;
      }
    }
  }

  // TACTICAL SFX
  triggerCapturePercussion() {
    if (!this.audioCtx) return;
    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.12);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.dryGain);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  triggerCheckAccent(freq) {
    if (!this.audioCtx) return;
    const now = this.audioCtx.currentTime;
    // Dramatic Timpani sforzando Ping
    const timpani = this.audioCtx.createOscillator();
    const timpGain = this.audioCtx.createGain();

    timpani.type = 'sine';
    timpani.frequency.setValueAtTime(freq * 0.5, now);
    timpani.frequency.exponentialRampToValueAtTime(freq * 0.25, now + 0.4);

    timpGain.gain.setValueAtTime(0.7, now);
    timpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);

    timpani.connect(timpGain);
    timpGain.connect(this.dryGain);
    timpani.start(now);
    timpani.stop(now + 0.55);
  }

  triggerMateTutti(freq, totalDuration) {
    if (!this.audioCtx) return;
    const now = this.audioCtx.currentTime;
    const chordFrequencies = [freq * 0.5, freq, freq * 1.25, freq * 1.5, freq * 2];

    chordFrequencies.forEach((f, idx) => {
      setTimeout(() => {
        if (!this.audioCtx) return;
        const o = this.audioCtx.createOscillator();
        const g = this.audioCtx.createGain();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(f, this.audioCtx.currentTime);

        g.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + 2.5);

        o.connect(g);
        g.connect(this.dryGain);
        g.connect(this.reverbNode);

        o.start(this.audioCtx.currentTime);
        o.stop(this.audioCtx.currentTime + 2.6);
      }, idx * 60);
    });
  }
}

export const symphonicSynth = new SymphonicSynth();
