// ============================================================
//  HELL GRAVITY DASH — audio.js
//  Procedural Web Audio API synthesizer
// ============================================================

class AudioEngine {
  constructor() {
    this.ctx          = null;
    this.masterGain   = null;
    this.reverbNode   = null;
    this.isMuted      = false;
    this.musicNode    = null;
    this.isPlayingMusic = false;
    this.step         = 0;
    this.bpm          = 140;
    this._scheduleId  = null;
  }

  // ─── Init ───────────────────────────────────────────────────
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;

    try {
      this.ctx = new AC();
      
      // Master gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.28, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Simple reverb (convolver with noise impulse)
      this._buildReverb();
    } catch (e) {
      console.warn("Failed to initialize AudioContext:", e);
      this.ctx = null;
    }
  }

  _buildReverb() {
    if (!this.ctx) return;
    const dur    = 1.2;
    const decay  = 2.0;
    const sr     = this.ctx.sampleRate;
    const len    = sr * dur;
    const buf    = this.ctx.createBuffer(2, len, sr);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    this.reverbNode = this.ctx.createConvolver();
    this.reverbNode.buffer = buf;

    const revGain = this.ctx.createGain();
    revGain.gain.value = 0.15;
    this.reverbNode.connect(revGain);
    revGain.connect(this.masterGain);
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  setMute(mute) {
    this.isMuted = mute;
    if (!this.masterGain) return;
    this.masterGain.gain.setTargetAtTime(mute ? 0 : 0.28, this.ctx.currentTime, 0.05);
  }

  // ─── Generic helpers ────────────────────────────────────────
  _osc(type, freq, time, dur, gainVal, connectTo) {
    const osc  = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(gainVal, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc.connect(gain);
    gain.connect(connectTo || this.masterGain);
    osc.start(time);
    osc.stop(time + dur + 0.01);
    return { osc, gain };
  }

  _noise(dur, time, filterType, filterFreq, gainVal) {
    const sr  = this.ctx.sampleRate;
    const len = Math.ceil(sr * dur);
    const buf = this.ctx.createBuffer(1, len, sr);
    const d   = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    const src    = this.ctx.createBufferSource();
    src.buffer   = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type  = filterType;
    filter.frequency.value = filterFreq;
    const gain   = this.ctx.createGain();
    gain.gain.setValueAtTime(gainVal, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    src.start(time);
    src.stop(time + dur);
    return src;
  }

  // ─── Drum machines ──────────────────────────────────────────
  _kick(time) {
    if (!this.ctx) return;
    const osc  = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(160, time);
    osc.frequency.exponentialRampToValueAtTime(0.001, time + 0.35);
    gain.gain.setValueAtTime(1.1, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(time); osc.stop(time + 0.36);
  }

  _snare(time) {
    if (!this.ctx) return;
    this._noise(0.18, time, 'bandpass', 1200, 0.65);
    // tonal body
    const osc  = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(220, time);
    osc.frequency.exponentialRampToValueAtTime(100, time + 0.1);
    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
    osc.connect(gain); gain.connect(this.masterGain);
    osc.start(time); osc.stop(time + 0.13);
  }

  _hihat(time, open = false) {
    if (!this.ctx) return;
    this._noise(open ? 0.35 : 0.05, time, 'highpass', 8000, 0.1);
  }

  _bass(freq, time, dur) {
    if (!this.ctx) return;
    const osc    = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain   = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(140, time);
    filter.frequency.exponentialRampToValueAtTime(600, time + 0.04);
    filter.frequency.exponentialRampToValueAtTime(90, time + dur);
    gain.gain.setValueAtTime(0.65, time);
    gain.gain.linearRampToValueAtTime(0.45, time + dur * 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
    osc.connect(filter); filter.connect(gain); gain.connect(this.masterGain);
    osc.start(time); osc.stop(time + dur + 0.01);
  }

  _lead(freq, time, dur) {
    if (!this.ctx) return;
    const osc1   = this.ctx.createOscillator();
    const osc2   = this.ctx.createOscillator();
    const gain   = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    osc1.type = 'square'; osc1.frequency.value = freq;
    osc2.type = 'sawtooth'; osc2.frequency.value = freq * 1.005; // slight detune
    filter.type = 'lowpass'; filter.frequency.value = 3000;
    filter.Q.value = 4;
    gain.gain.setValueAtTime(0.12, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
    osc1.connect(filter); osc2.connect(filter);
    filter.connect(gain);
    if (this.reverbNode) gain.connect(this.reverbNode);
    gain.connect(this.masterGain);
    osc1.start(time); osc1.stop(time + dur + 0.01);
    osc2.start(time); osc2.stop(time + dur + 0.01);
  }

  // ─── SFX ────────────────────────────────────────────────────
  playGravityFlip() {
    this.init(); this.resume();
    if (!this.ctx || this.isMuted) return;
    const t  = this.ctx.currentTime;
    const osc  = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(900, t + 0.1);
    osc.frequency.exponentialRampToValueAtTime(500, t + 0.18);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(gain); gain.connect(this.masterGain);
    osc.start(t); osc.stop(t + 0.21);
  }

  playCoin() {
    this.init(); this.resume();
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    [988, 1319].forEach((freq, i) => {
      const osc  = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.22, t + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.18);
      osc.connect(gain); gain.connect(this.masterGain);
      osc.start(t + i * 0.08);
      osc.stop(t + i * 0.08 + 0.19);
    });
  }

  playPowerUp() {
    this.init(); this.resume();
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    [523, 659, 784, 1047].forEach((freq, i) => {
      const osc  = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.2, t + i * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.07 + 0.15);
      osc.connect(gain); gain.connect(this.masterGain);
      osc.start(t + i * 0.07);
      osc.stop(t + i * 0.07 + 0.16);
    });
  }

  playDeath() {
    this.init(); this.resume();
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    // Rumble
    this._osc('sawtooth', 160, t, 0.5, 0.5);
    const osc2 = this.ctx.createOscillator();
    const g2   = this.ctx.createGain();
    osc2.frequency.setValueAtTime(160, t);
    osc2.frequency.linearRampToValueAtTime(30, t + 0.5);
    g2.gain.setValueAtTime(0.5, t);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    osc2.connect(g2); g2.connect(this.masterGain);
    osc2.start(t); osc2.stop(t + 0.51);
    // Noise crash
    this._noise(0.5, t, 'lowpass', 700, 0.7);
  }

  playShieldBreak() {
    this.init(); this.resume();
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    this._osc('triangle', 1200, t, 0.08, 0.4);
    this._osc('triangle', 400, t + 0.05, 0.25, 0.3);
    this._noise(0.2, t, 'bandpass', 2000, 0.35);
  }

  playBoostSmash() {
    this.init(); this.resume();
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    this._osc('sawtooth', 300, t, 0.12, 0.5);
    this._noise(0.12, t, 'highpass', 3000, 0.4);
  }

  playFireballLaunch() {
    this.init(); this.resume();
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    this._osc('sawtooth', 260, t, 0.22, 0.25);
    this._osc('sine', 130, t, 0.35, 0.3);
    this._noise(0.35, t, 'lowpass', 350, 0.35);
  }

  // ─── Music ──────────────────────────────────────────────────
  startMusic() {
    this.init(); this.resume();
    if (this.isPlayingMusic) return;
    this.isPlayingMusic = true;
    this.step = 0;
    this._schedulerLoop();
  }

  stopMusic() {
    this.isPlayingMusic = false;
    if (this._scheduleId) { clearTimeout(this._scheduleId); this._scheduleId = null; }
  }

  _schedulerLoop() {
    if (!this.isPlayingMusic || !this.ctx) return;

    const stepDur  = 60 / this.bpm / 2; // 8th notes
    const lookAhead = 0.12;
    const now       = this.ctx.currentTime;
    const t         = now + lookAhead;

    // ── Bass line (infernal minor groove) ──
    const bassSeq = [
      82.41, 0, 82.41, 98.00,
      110.00, 0, 98.00, 123.47,
      82.41, 0, 82.41, 73.42,
      87.31, 0, 98.00, 82.41
    ];
    const bFreq = bassSeq[this.step % bassSeq.length];
    if (bFreq) this._bass(bFreq, t, stepDur * 0.88);

    // ── Lead melody ──
    const leadSeq = [
      0,      0,      659.26, 0,
      0,      0,      698.46, 0,
      0,      0,      622.25, 0,
      0,      0,      587.33, 554.37
    ];
    const lFreq = leadSeq[this.step % leadSeq.length];
    if (lFreq) this._lead(lFreq, t, stepDur * 0.85);

    // ── Drums ──
    const s = this.step % 16;
    if (s === 0 || s === 8)          this._kick(t);
    if (s === 4 || s === 12)         this._snare(t);
    if (s % 2 === 0)                 this._hihat(t, false);
    if (s === 6 || s === 14)         this._hihat(t, true);

    this.step++;
    this._scheduleId = setTimeout(() => this._schedulerLoop(), stepDur * 1000);
  }
}

const gameAudio = new AudioEngine();
