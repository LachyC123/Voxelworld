// Speech bubbles over nearby townsfolk: event scripts, conversations, songs, activity chatter
// and replies when the player tips their hat.
import * as THREE from 'three';
import { activityLines } from '../sim/dialogue.js';
import { hash3 } from '../core/rng.js';

const MAX = 6;

export class Bubbles {
  constructor(el, camera) {
    this.el = el; this.camera = camera;
    this.pool = [];
    for (let i = 0; i < MAX + 2; i++) {
      const d = document.createElement('div'); d.className = 'bubble'; d.style.opacity = 0; d.style.display = 'none';
      el.appendChild(d); this.pool.push({ el: d, p: null });
    }
    this.v = new THREE.Vector3();
    this.convoState = new Map();
  }

  // Force a line (e.g. greeting reply) for a few seconds.
  say(p, text, t, dur = 4.5, kind = '') { p.forced = { text, until: t + dur, kind }; p.speakingUntil = t + Math.min(dur, 2.5); }

  lineFor(p, t, minutes) {
    if (p.forced && p.forced.until > t) return { text: p.forced.text, kind: p.forced.kind };
    const S = p.state;
    if (!S || S.act === 'sleep' || S.act === 'doze') return null;
    // conversations (shared turn-taking)
    if (p.convos) for (const c of p.convos) {
      if (minutes < c.t0 || minutes >= c.t1) continue;
      let st = this.convoState.get(c);
      if (!st) { st = { i: 0, next: t + 1.5 + hash3(c.t0, 3, 3) * 2 }; this.convoState.set(c, st); }
      if (t > st.next) { st.i = (st.i + 1) % c.script.length; st.next = t + (c.song ? 4.5 : 3.8); }
      const [who, text] = c.script[st.i];
      const speaker = c.people[who % c.people.length];
      if (speaker === p) { p.speakingUntil = t + 0.5; return { text, kind: c.song ? 'song' : '' }; }
      if (c.song && p.state.act === 'sing') return null;
      return null;
    }
    // event lines
    if (p.eventLines) for (const e of p.eventLines) {
      if (minutes < e.t0 || minutes >= e.t1) continue;
      return this.timed(p, t, e.lines, e.song ? 'song' : '', 5.5);
    }
    // entry lines, then activity chatter (only now and then)
    const lines = (S.entry && S.entry.lines) || activityLines(S.mode === 'walk' ? null : S.act);
    if (!lines || !lines.length) return null;
    return this.timed(p, t, lines, '', 11 + hash3(p.id, 1, 1) * 10);
  }
  timed(p, t, lines, kind, period) {
    const phase = (t + p.ph * 7) % period;
    const show = kind === 'song' ? 4.5 : 3.6;
    if (phase > show) return null;
    const idx = Math.floor((t + p.ph * 7) / period) % lines.length;
    p.speakingUntil = t + 0.4;
    return { text: lines[idx], kind };
  }

  update(people, player, t, minutes, playerRoom) {
    const cam = this.camera.position;
    const cand = [];
    for (const p of people.visible) {
      const S = p.state;
      if (S.camDist > 16) continue;
      if ((S.room || 0) !== (playerRoom || 0) && S.camDist > 7) continue;
      const line = this.lineFor(p, t, minutes);
      if (!line) continue;
      cand.push([S.camDist, p, line]);
    }
    cand.sort((a, b) => a[0] - b[0]);
    const n = Math.min(MAX, cand.length);
    const W = window.innerWidth, H = window.innerHeight;
    let used = 0;
    for (let i = 0; i < n; i++) {
      const [d, p, line] = cand[i];
      const P = p.ch.pose;
      const head = p.ch.scale * (P.lie ? 0.6 : (1.9 + (P.bob || 0)));
      this.v.set(P.x, P.y + head + 0.1, P.z).project(this.camera);
      if (this.v.z > 1 || this.v.z < -1 || Math.abs(this.v.x) > 1.1 || Math.abs(this.v.y) > 1.1) continue;
      const b = this.pool[used++];
      const who = (p.nick || p.first).toUpperCase();
      const html = `<span class="who">${who}</span>${escape(line.text)}`;
      if (b.html !== html) { b.el.innerHTML = html; b.html = html; }
      b.el.className = 'bubble' + (line.kind ? ' ' + line.kind : '') + (line.text.length > 60 ? ' wide' : '');
      b.el.style.display = 'block';
      b.el.style.left = ((this.v.x + 1) / 2 * W) + 'px';
      b.el.style.top = ((1 - this.v.y) / 2 * H) + 'px';
      b.el.style.opacity = String(Math.max(0.25, Math.min(1, 1.4 - d / 14)));
      b.el.style.zIndex = String(100 - Math.round(d));
    }
    for (let i = used; i < this.pool.length; i++) { const b = this.pool[i]; if (b.el.style.display !== 'none') { b.el.style.display = 'none'; b.html = ''; } }
  }
}

function escape(s) { return String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }
