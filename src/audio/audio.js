// Procedural soundscape (Web Audio, no samples): wind, waves, crowd, birds, crickets,
// church bells on the hour, the choir, the Harbor Days band, the Blue Lantern quartet,
// footsteps, horns, the trolley bell and fireworks. Sources are spatialised by distance
// and muffled when a wall stands between you and them.

import * as THREE from 'three';

const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12); // midi -> Hz

// Street-life sound patterns: (audio, channel, step, t0) => seconds until the next step.
const R = Math.random;
export const LIFE_SOUNDS = {
  hammer: (a, ch, i, t) => { a.hit(ch, t, { type: 'bandpass', freq: 1400 + R() * 300, q: 3, vol: 0.35, dur: 0.06 }); a.tone(ch, 180, t, 0.05, { vol: 0.06 }); return i % 7 === 6 ? 1.6 + R() * 2 : 0.38 + R() * 0.08; },
  saw: (a, ch, i, t) => { a.hit(ch, t, { type: 'bandpass', freq: 2600, q: 2, vol: 0.18, dur: 0.22 }); return i % 12 === 11 ? 2 + R() * 2 : 0.26; },
  mower: (a, ch, i, t) => { for (let k = 0; k < 4; k++) a.hit(ch, t + k * 0.06, { type: 'bandpass', freq: 3200 + R() * 400, q: 4, vol: 0.05, dur: 0.05 }); return 0.24; },
  bark: (a, ch, i, t) => { const n = 1 + (R() * 3 | 0); for (let k = 0; k < n; k++) { a.tone(ch, 520 + R() * 80, t + k * 0.28, 0.12, { type: 'sawtooth', vol: 0.16, filter: 1300, attack: 0.005, release: 0.06 }); a.hit(ch, t + k * 0.28, { type: 'bandpass', freq: 900, q: 1.5, vol: 0.12, dur: 0.1 }); } return 2.5 + R() * 5; },
  kids: (a, ch, i, t) => { const f = 700 + R() * 500; a.tone(ch, f, t, 0.18, { type: 'triangle', vol: 0.05, vibrato: true }); if (R() < 0.4) a.tone(ch, f * 1.25, t + 0.2, 0.25, { type: 'triangle', vol: 0.05, vibrato: true }); return 0.5 + R() * 1.4; },
  chatter: (a, ch, i, t) => { const f = 180 + R() * 160; a.tone(ch, f, t, 0.14, { type: 'sawtooth', vol: 0.025, filter: 900 }); return 0.16 + R() * (i % 9 === 8 ? 1.5 : 0.2); },
  radio: (a, ch, i, t) => { a.jazzStep(ch, i, t, 0.4); return 0.4; },
  piano: (a, ch, i, t) => { const sc = [60, 62, 64, 65, 67, 69, 71, 72]; a.tone(ch, NOTE(sc[(i * 3 + (i >> 2)) % 8]), t, 0.5, { vol: 0.06, decay: 0.2, sustain: 0.2 }); if (i % 4 === 0) a.tone(ch, NOTE(48 + (i >> 2) % 5), t, 0.9, { vol: 0.05, decay: 0.3, sustain: 0.2 }); return 0.32; },
  whistle: (a, ch, i, t) => { const mel = [79, 76, 79, 81, 79, 76, 74, 72]; a.tone(ch, NOTE(mel[i % 8]), t, 0.3, { vol: 0.04, vibrato: true, attack: 0.03 }); return i % 8 === 7 ? 3 + R() * 3 : 0.34; },
  bell: (a, ch, i, t) => { a.bell(ch, t, 1480, 0.05); return 1.2 + R() * 3; },
  splash: (a, ch, i, t) => { a.hit(ch, t, { type: 'lowpass', freq: 900, vol: 0.2, dur: 0.4 }); return 1 + R() * 3; },
  engine: (a, ch, i, t) => { a.tone(ch, 55 + R() * 6, t, 0.3, { type: 'sawtooth', vol: 0.05, filter: 300 }); return 0.28; },
  sweep: (a, ch, i, t) => { a.hit(ch, t, { type: 'highpass', freq: 3500, vol: 0.06, dur: 0.35 }); return 0.9 + R() * 0.3; },
  typewriter: (a, ch, i, t) => { a.hit(ch, t, { type: 'bandpass', freq: 2500, q: 4, vol: 0.12, dur: 0.03 }); if (i % 40 === 39) { a.bell(ch, t + 0.1, 2800, 0.02); return 1.2; } return 0.11 + R() * 0.1; },
  hose: (a, ch, i, t) => { a.hit(ch, t, { type: 'highpass', freq: 5000, vol: 0.04, dur: 0.5 }); return 0.45; },
  crowd: (a, ch, i, t) => { for (let k = 0; k < 3; k++) a.tone(ch, 150 + R() * 250, t + R() * 0.3, 0.15, { type: 'sawtooth', vol: 0.02, filter: 800 }); return 0.3; },
};

export class Audio {
  constructor() { this.ok = false; this.sources = new Map(); this.lastStep = 0; this.lastHour = -1; }

  start() {
    if (this.ok) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ac = new AC();
    } catch (e) { return; }
    const ac = this.ac;
    this.master = ac.createGain(); this.master.gain.value = 0.8;
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 4;
    this.master.connect(comp); comp.connect(ac.destination);
    // shared noise buffer
    const len = ac.sampleRate * 2;
    this.noise = ac.createBuffer(1, len, ac.sampleRate);
    const d = this.noise.getChannelData(0);
    let b = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; b = 0.98 * b + 0.02 * w; d[i] = w * 0.5 + b * 2.5; }
    // ambience beds
    this.wind = this.bed(400, 0.6, 'lowpass');
    this.waves = this.bed(700, 0.8, 'lowpass');
    this.crowd = this.bed(900, 1.4, 'bandpass');
    this.city = this.bed(160, 0.9, 'lowpass');
    this.ok = true;
  }

  bed(freq, q, type) {
    const ac = this.ac;
    const src = ac.createBufferSource(); src.buffer = this.noise; src.loop = true;
    const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ac.createGain(); g.gain.value = 0;
    src.connect(f); f.connect(g); g.connect(this.master); src.start();
    return { g, f };
  }

  // a positional channel: gain + pan + muffle filter
  channel() {
    const ac = this.ac;
    const g = ac.createGain(); g.gain.value = 0;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 18000;
    const pan = ac.createStereoPanner ? ac.createStereoPanner() : null;
    g.connect(lp); if (pan) { lp.connect(pan); pan.connect(this.master); } else lp.connect(this.master);
    return { g, lp, pan };
  }

  place(ch, src, listener, fwd, maxD, vol, muffled) {
    const dx = src.x - listener.x, dz = src.z - listener.z, dy = (src.y || 0) - listener.y;
    const d = Math.hypot(dx, dy, dz);
    const k = Math.max(0, 1 - d / maxD);
    const g = vol * k * k;
    const t = this.ac.currentTime;
    ch.g.gain.setTargetAtTime(g, t, 0.15);
    ch.lp.frequency.setTargetAtTime(muffled ? 700 : 16000, t, 0.2);
    if (ch.pan && d > 0.5) {
      const right = { x: -fwd.z, z: fwd.x };
      const p = (dx * right.x + dz * right.z) / d;
      ch.pan.pan.setTargetAtTime(Math.max(-0.9, Math.min(0.9, -p)), t, 0.1);
    }
    return g;
  }

  // ---------------------------------------------------------------- instruments
  tone(ch, freq, t0, dur, o = {}) {
    const ac = this.ac;
    const osc = ac.createOscillator(); osc.type = o.type || 'sine'; osc.frequency.value = freq;
    const g = ac.createGain();
    const a = o.attack ?? 0.01, r = o.release ?? 0.2, v = o.vol ?? 0.2;
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(v, t0 + a);
    if (o.decay) g.gain.setTargetAtTime(v * (o.sustain ?? 0.3), t0 + a, o.decay);
    g.gain.setValueAtTime(o.decay ? v * (o.sustain ?? 0.3) : v, t0 + Math.max(a, dur - r));
    g.gain.linearRampToValueAtTime(0, t0 + dur);
    let node = osc;
    if (o.vibrato) { const l = ac.createOscillator(); l.frequency.value = 5 + Math.random(); const lg = ac.createGain(); lg.gain.value = freq * 0.006; l.connect(lg); lg.connect(osc.frequency); l.start(t0); l.stop(t0 + dur + 0.1); }
    if (o.filter) { const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.filter; osc.connect(f); node = f; }
    node.connect(g); g.connect(ch.g);
    osc.start(t0); osc.stop(t0 + dur + 0.05);
  }
  hit(ch, t0, o = {}) {
    const ac = this.ac;
    const src = ac.createBufferSource(); src.buffer = this.noise;
    const f = ac.createBiquadFilter(); f.type = o.type || 'highpass'; f.frequency.value = o.freq || 3000; f.Q.value = o.q || 0.7;
    const g = ac.createGain(); g.gain.setValueAtTime(o.vol ?? 0.2, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + (o.dur || 0.12));
    src.connect(f); f.connect(g); g.connect(ch.g || ch);
    src.start(t0, Math.random() * 1.5); src.stop(t0 + (o.dur || 0.12) + 0.05);
  }
  bell(ch, t0, base = 220, vol = 0.35) {
    for (const [m, v, dec] of [[1, 1, 3.5], [2.0, 0.5, 2.5], [2.4, 0.35, 2], [3.0, 0.25, 1.6], [4.2, 0.18, 1.2], [0.5, 0.4, 4]]) {
      const ac = this.ac, osc = ac.createOscillator(), g = ac.createGain();
      osc.frequency.value = base * m;
      g.gain.setValueAtTime(vol * v, t0); g.gain.exponentialRampToValueAtTime(0.0005, t0 + dec);
      osc.connect(g); g.connect(ch.g); osc.start(t0); osc.stop(t0 + dec + 0.1);
    }
  }

  // ---------------------------------------------------------------- music patterns
  // hymn: 4-part chords, half notes. (A plain hymn progression in F.)
  hymnStep(ch, i, t0, beat) {
    const prog = [[53, 57, 60, 65], [53, 58, 62, 65], [48, 55, 60, 64], [53, 57, 60, 65], [50, 57, 62, 65], [46, 58, 62, 65], [48, 55, 60, 64], [53, 57, 60, 65],
      [53, 57, 60, 69], [55, 58, 62, 67], [48, 57, 60, 65], [50, 57, 62, 65], [46, 53, 62, 65], [48, 55, 60, 64], [48, 55, 58, 64], [41, 57, 60, 65]];
    const ch4 = prog[i % prog.length];
    ch4.forEach((n, k) => this.tone(ch, NOTE(n + 12 * (k === 0 ? 0 : 0)), t0, beat * 2 * 0.98, { type: 'sawtooth', attack: 0.25, release: 0.35, vol: k === 3 ? 0.07 : 0.045, vibrato: true, filter: 1400 }));
  }
  marchStep(ch, i, t0, beat) {
    // oom-pah bass + melody + snare
    const bass = [41, 48, 43, 48, 41, 48, 36, 43];
    const mel = [65, 67, 69, 70, 72, 72, 70, 69, 67, 69, 70, 67, 65, 64, 65, 0];
    this.tone(ch, NOTE(bass[i % 8] - 12), t0, beat * 0.5, { type: 'triangle', vol: 0.22, release: 0.1 });
    this.tone(ch, NOTE(bass[(i + 4) % 8] + 12), t0 + beat * 0.5, beat * 0.3, { type: 'triangle', vol: 0.07 });
    const m = mel[i % mel.length];
    if (m) this.tone(ch, NOTE(m), t0, beat * 0.9, { type: 'square', vol: 0.05, filter: 2200, attack: 0.02 });
    if (i % 2 === 1) this.hit(ch, t0, { freq: 1800, vol: 0.12, dur: 0.12 });
    if (i % 8 === 0) this.hit(ch, t0, { type: 'lowpass', freq: 150, vol: 0.35, dur: 0.25 });
  }
  jazzStep(ch, i, t0, beat) {
    const walk = [41, 45, 48, 50, 46, 50, 53, 52, 48, 52, 55, 53, 41, 43, 45, 47];
    this.tone(ch, NOTE(walk[i % walk.length] - 12), t0, beat * 0.9, { type: 'triangle', vol: 0.2, release: 0.08 });
    const swing = beat * 0.66;
    this.hit(ch, t0, { freq: 7000, vol: 0.05, dur: 0.08 });
    if (i % 2 === 1) this.hit(ch, t0 + swing, { freq: 7000, vol: 0.035, dur: 0.06 });
    if (i % 4 === 1 || i % 4 === 3) { const chord = [[57, 60, 64, 67], [58, 62, 65, 69], [55, 58, 62, 65], [53, 57, 60, 64]][Math.floor(i / 4) % 4]; chord.forEach((n) => this.tone(ch, NOTE(n), t0 + swing * 0.2, beat * 0.5, { vol: 0.035, decay: 0.15, sustain: 0.2 })); }
    if (i % 8 === 6) this.tone(ch, NOTE(72 + [0, 3, 5, 7][Math.floor(i / 8) % 4]), t0, beat * 1.4, { type: 'sawtooth', vol: 0.04, filter: 1800, vibrato: true, attack: 0.05 });
  }
  rockStep(ch, i, t0, beat) {
    const b = [40, 44, 47, 49, 50, 49, 47, 44];
    this.tone(ch, NOTE(b[i % 8]), t0, beat * 0.45, { type: 'square', vol: 0.06, filter: 900 });
    if (i % 2 === 1) this.hit(ch, t0, { freq: 1500, vol: 0.13, dur: 0.1 });
    else this.hit(ch, t0, { type: 'lowpass', freq: 120, vol: 0.28, dur: 0.18 });
    if (i % 4 === 2) [64, 68, 71].forEach((n) => this.tone(ch, NOTE(n), t0, beat * 0.3, { type: 'square', vol: 0.025, filter: 2500 }));
  }

  // ---------------------------------------------------------------- per-frame update
  update(g, dt) {
    if (!this.ok) return;
    const ac = this.ac, now = ac.currentTime;
    const cam = g.R.camera.position;
    const fwd = g.R.camera.getWorldDirection(this._f || (this._f = new THREE.Vector3()));
    const listener = { x: cam.x, y: cam.y, z: cam.z };
    const minutes = g.clock.minutes, night = g.R.common.uNight.value;
    const indoor = !!g.playerRoom;
    const aerial = g.player.mode === 'aerial';
    // beds
    const nearWater = Math.max(0, 1 - Math.max(0, cam.x - 10) / 90);
    const T = (x, v) => x.g.gain.setTargetAtTime(v, now, 0.5);
    T(this.wind, (aerial ? 0.12 : 0.03) * (indoor ? 0.3 : 1));
    T(this.waves, 0.12 * nearWater * (indoor ? 0.3 : 1));
    let crowdN = 0; for (const p of g.ctx.people.visible) if (p.state.camDist < 30 && p.state.act !== 'sleep') crowdN++;
    T(this.crowd, Math.min(0.12, crowdN * 0.004) * (indoor ? 0.4 : 1));
    T(this.city, (0.04 + (1 - night) * 0.03) * (indoor ? 0.4 : 1));
    this.crowd.f.frequency.setTargetAtTime(700 + Math.sin(now * 0.7) * 150, now, 0.3);
    // birds & crickets
    this.tick = (this.tick || 0) + dt;
    if (!indoor && this.tick > 0.2) {
      this.tick = 0;
      const ch = this.fx || (this.fx = this.channel());
      ch.g.gain.value = 1;
      if (night < 0.3 && Math.random() < 0.12) { const f = 2500 + Math.random() * 2500; for (let k = 0; k < 3; k++) this.tone(ch, f * (1 + k * 0.08), now + k * 0.09, 0.07, { vol: 0.015, attack: 0.005, release: 0.03 }); }
      if (night > 0.6 && Math.random() < 0.6) this.tone(ch, 4200 + Math.random() * 300, now, 0.05, { vol: 0.006, attack: 0.002, release: 0.02 });
      if (nearWater > 0.3 && night < 0.5 && Math.random() < 0.03) { this.tone(ch, 1200, now, 0.25, { type: 'sawtooth', vol: 0.01, filter: 2000 }); this.tone(ch, 1000, now + 0.25, 0.3, { type: 'sawtooth', vol: 0.01, filter: 2000 }); }
    }
    // footsteps
    const pl = g.player;
    if (!aerial && pl.onGround && pl.speed > 0.5) {
      const step = Math.floor(pl.walkPhase * 2 / Math.PI);
      if (step !== this.lastStep) {
        this.lastStep = step;
        const ch = this.steps || (this.steps = this.channel()); ch.g.gain.value = 1;
        this.hit(ch, now, { type: 'bandpass', freq: indoor ? 500 : 900, q: 1.2, vol: 0.09, dur: 0.07 });
      }
    }
    // music sources (scheduled a little ahead)
    const srcs = this.musicSources(g, minutes);
    for (const s of srcs) {
      let st = this.sources.get(s.id);
      if (!st) { st = { id: s.id, ch: this.channel(), next: now + 0.1, i: 0 }; this.sources.set(s.id, st); }
      st.alive = true;
      const muffled = (s.room || 0) !== (g.playerRoom || 0);
      const vol = this.place(st.ch, s, listener, fwd, s.range, s.vol, muffled);
      if (vol > 0.001) while (st.next < now + 0.25) { this[s.pattern](st.ch, st.i++, st.next, s.beat); st.next += s.beat * (s.pattern === 'hymnStep' ? 2 : 1); }
      else st.next = now + 0.1;
    }
    // street-life sources (hammering, a lawnmower, a dog, kids at play, a radio in a window…)
    // the six nearest (anything further is too faint to be worth synthesising)
    const lifeSrc = g.life ? g.life.soundSources(minutes, cam) : [];
    if (lifeSrc.length > 6) { for (const q of lifeSrc) q._d = (q.x - cam.x) ** 2 + (q.z - cam.z) ** 2; lifeSrc.sort((a, b) => a._d - b._d); lifeSrc.length = 6; }
    for (const s of lifeSrc) {
      const pat = LIFE_SOUNDS[s.kind]; if (!pat) continue;
      let st = this.sources.get(s.id);
      if (!st) { st = { id: s.id, ch: this.channel(), next: now + Math.random() * 0.5, i: 0 }; this.sources.set(s.id, st); }
      st.alive = true;
      const vol = this.place(st.ch, s, listener, fwd, s.range, s.vol, (s.room || 0) !== (g.playerRoom || 0));
      if (vol > 0.001) while (st.next < now + 0.3) { st.next += pat(this, st.ch, st.i++, st.next) || 0.5; }
      else st.next = now + 0.1;
    }
    // fade out whatever stopped this frame (once), and let long-silent channels go
    for (const [id, st] of this.sources) {
      if (st.alive) { st.fading = 0; st.alive = false; continue; }
      if (!st.fading) { st.fading = now; st.ch.g.gain.setTargetAtTime(0, now, 0.3); }
      else if (now - st.fading > 8) { try { st.ch.g.disconnect(); } catch (e) { /* already gone */ } this.sources.delete(id); }
    }
    // church bells on the hour (8 am – 9 pm), from St. Brigid's
    const hour = Math.floor(minutes / 60), mm = minutes % 60;
    if (mm < 1 && hour !== this.lastHour) {
      this.lastHour = hour;
      if (hour >= 8 && hour <= 21 && g.ctx.bellTower) {
        const ch = this.bells || (this.bells = this.channel());
        const n = hour % 12 || 12;
        this.place(ch, g.ctx.bellTower, listener, fwd, 700, 0.9, indoor);
        for (let k = 0; k < n; k++) this.bell(ch, now + 0.3 + k * 2.2, 196, 0.3);
      }
    }
    // horns & trolley bell
    if (g.traffic) {
      const c = g.traffic.nearestHonk();
      if (c && (!this.lastHonk || now - this.lastHonk > 2.5)) {
        this.lastHonk = now; const ch = this.horn || (this.horn = this.channel());
        this.place(ch, { x: c.h.x, z: c.h.z }, listener, fwd, 60, 0.6, false);
        this.tone(ch, 392, now, 0.45, { type: 'sawtooth', vol: 0.08, filter: 1500 }); this.tone(ch, 494, now, 0.45, { type: 'sawtooth', vol: 0.06, filter: 1500 });
      }
    }
  }

  // the diary: a page turning, and a pencil tick
  page() {
    if (!this.ok) return;
    const ch = this.ui || (this.ui = this.channel()); ch.g.gain.value = 1;
    const t = this.ac.currentTime;
    this.hit(ch, t, { type: 'bandpass', freq: 2600, q: 0.8, vol: 0.12, dur: 0.22 });
    this.hit(ch, t + 0.08, { type: 'bandpass', freq: 4200, q: 1.2, vol: 0.06, dur: 0.16 });
  }
  // the rubber stamp coming down on a diary card
  stamp() {
    if (!this.ok) return;
    const ch = this.ui || (this.ui = this.channel()); ch.g.gain.value = 1;
    const t = this.ac.currentTime;
    this.hit(ch, t, { type: 'lowpass', freq: 220, vol: 0.5, dur: 0.16 });
    this.hit(ch, t + 0.005, { type: 'bandpass', freq: 1400, q: 1, vol: 0.12, dur: 0.06 });
  }
  // a little glockenspiel run: longer and brighter the rarer the find
  chime(kind = 'common') {
    if (!this.ok) return;
    const ch = this.ui || (this.ui = this.channel()); ch.g.gain.value = 1;
    const t = this.ac.currentTime;
    const runs = {
      common: [79, 84], uncommon: [76, 79, 84], rare: [72, 76, 79, 84, 88], legendary: [72, 76, 79, 84, 88, 91, 96],
      clue: [62, 65, 69, 74], solved: [60, 64, 67, 72, 76, 79, 84],
    };
    const notes = runs[kind] || runs.common;
    notes.forEach((n, i) => {
      const f = 440 * Math.pow(2, (n - 69) / 12), at = t + i * (kind === 'solved' ? 0.11 : 0.075);
      this.tone(ch, f, at, 0.5, { type: 'sine', vol: 0.05, decay: 0.12, sustain: 0.15 });
      this.tone(ch, f * 2, at, 0.35, { type: 'sine', vol: 0.018, decay: 0.08, sustain: 0.1 });
    });
    if (kind === 'legendary' || kind === 'solved') this.bell(ch, t + notes.length * 0.09, 1046, 0.06);
    if (kind === 'solved') [48, 55, 60].forEach((n) => this.tone(ch, 440 * Math.pow(2, (n - 69) / 12), t + 0.02, 1.6, { type: 'sawtooth', vol: 0.03, filter: 1200, attack: 0.05, release: 0.6 }));
  }
  pencil() {
    if (!this.ok) return;
    const ch = this.ui || (this.ui = this.channel()); ch.g.gain.value = 1;
    const t = this.ac.currentTime;
    this.hit(ch, t, { type: 'bandpass', freq: 5200, q: 3, vol: 0.09, dur: 0.07 });
    this.hit(ch, t + 0.09, { type: 'bandpass', freq: 4600, q: 3, vol: 0.12, dur: 0.12 });
    this.tone(ch, 880, t + 0.25, 0.25, { type: 'sine', vol: 0.03 }); this.tone(ch, 1320, t + 0.36, 0.35, { type: 'sine', vol: 0.025 });
  }

  boom(x, y, z, g) {
    if (!this.ok) return;
    const cam = g.R.camera.position;
    const d = Math.hypot(x - cam.x, y - cam.y, z - cam.z);
    const delay = d / 340;
    const ch = this.channel();
    ch.g.gain.value = Math.min(1, 120 / (d + 40));
    const t = this.ac.currentTime + delay;
    this.hit(ch, t, { type: 'lowpass', freq: 120, vol: 0.9, dur: 1.4 });
    this.hit(ch, t + 0.05, { type: 'bandpass', freq: 600, vol: 0.2, dur: 0.6 });
    for (let k = 0; k < 8; k++) this.hit(ch, t + 0.4 + Math.random() * 0.8, { freq: 4000, vol: 0.05, dur: 0.05 });
    setTimeout(() => { try { ch.g.disconnect(); } catch (e) { /* */ } }, (delay + 3) * 1000);
  }
  trolleyBell(x, z, g) {
    if (!this.ok) return;
    const ch = this.tb || (this.tb = this.channel());
    this.place(ch, { x, z }, g.R.camera.position, g.R.camera.getWorldDirection(this._f || (this._f = new THREE.Vector3())), 90, 0.7, !!g.playerRoom);
    const t = this.ac.currentTime;
    this.bell(ch, t, 1320, 0.08); this.bell(ch, t + 0.35, 1320, 0.08);
  }

  musicSources(g, minutes) {
    const out = [];
    const ev = (id) => g.ctx.events.find((e) => e.id === id);
    const on = (e) => e && minutes >= e.start && minutes < e.end;
    const choir = ev('choir');
    if (on(choir)) out.push({ id: 'choir', x: choir.x, y: 3, z: choir.z, range: 90, vol: 0.9, pattern: 'hymnStep', beat: 0.75, room: g.ctx.choirRoom || 0 });
    const fair = ev('fair'), dance = ev('streetdance');
    if (g.ctx.bandstand && ((on(fair) && minutes >= 13 * 60 && minutes < 17 * 60 + 20) || on(dance))) out.push({ id: 'band', ...g.ctx.bandstand, range: 160, vol: 0.8, pattern: 'marchStep', beat: on(dance) ? 0.42 : 0.5, room: 0 });
    const club = ev('bluelantern');
    if (on(club) && club.x !== null) out.push({ id: 'jazz', x: club.x, y: 1, z: club.z, range: 60, vol: 0.9, pattern: 'jazzStep', beat: 0.36, room: g.ctx.clubRoom || 0 });
    const hop = ev('sockhop');
    if (on(hop) && hop.x !== null) out.push({ id: 'hop', x: hop.x, y: 1, z: hop.z, range: 80, vol: 0.8, pattern: 'rockStep', beat: 0.3, room: g.ctx.gymRoom || 0 });
    return out;
  }
}
