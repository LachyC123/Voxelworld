// Everyone in town: identity, daily schedule and the deterministic runtime that turns
// (clock time) -> (where they are, what they're doing). Travel between schedule entries
// follows the nav graph at walking pace, so scrubbing the clock always gives a consistent town.
import { applyActivity, walkPose, activity } from './activities.js';
import { hash3 } from '../core/rng.js';
import { tm } from '../core/util.js';

const DAY = 1440;
const BRIGHT = ['#e0403a', '#3a7ae0', '#e0c040', '#4ac06a', '#e070b0', '#f09030', '#9a5ae0'];
function heldTint(name, p) {
  if (name === 'balloon') return BRIGHT[p.id % BRIGHT.length];
  if (name === 'handbag') return p.look.accent || p.look.top2 || '#6a3a2a';
  if (name === 'umbrella') return ['#1c1c20', '#2a3a5a', '#6a2a2a', '#3a4a3a'][p.id % 4];
  return p.look.top || '#8a6a4a';
}

export class Person {
  constructor(o) {
    Object.assign(this, o);
    this.schedule = [];
    this.relations = this.relations || [];
    this.lines = this.lines || [];
    this.tags = new Set(o.tags || []);
    this.ph = hash3(this.id, 7, 13) * 100;
    this.lane = (hash3(this.id, 3, 1) - 0.5) * 1.1;
    this.speed = (this.age < 13 ? 1.45 : this.age > 70 ? 0.95 : 1.25) * (0.9 + hash3(this.id, 9, 9) * 0.2);
    this.paths = new Map();
    this.state = { mode: 'hidden', x: 0, y: 0, z: 0, yaw: 0, room: 0, act: 'stand', entry: null, spot: null };
    this.greet = 0;
  }
  get name() { return this.nick ? this.nick : `${this.first} ${this.last}`; }
  get full() { return `${this.title ? this.title + ' ' : ''}${this.first} ${this.last}`; }
  // add a schedule entry: at time `t` leave for `spot` and do `act` there.
  at(t, spot, act = null, o = {}) {
    if (!spot) return this;
    this.schedule.push({ t: tm(t), spot, act: act || spot.act, lines: o.lines || null, label: o.label || null, held: o.held || null, route: null, event: o.event || null, speed: o.speed || null, costume: o.costume || null });
    return this;
  }
  // wander along a list of nav nodes (sidewalk stroll) from time t
  stroll(t, route, o = {}) {
    if (!route || route.length < 2) return this;
    this.schedule.push({ t: tm(t), spot: null, route, act: 'stroll', lines: o.lines || null, label: o.label || 'Out for a stroll', held: o.held || null, event: null });
    return this;
  }
  finalize() {
    this.schedule.sort((a, b) => a.t - b.t);
    // remove duplicate times (keep the later-added = more specific)
    const out = [];
    for (const e of this.schedule) { if (out.length && out[out.length - 1].t === e.t) out[out.length - 1] = e; else out.push(e); }
    this.schedule = out;
    this.paths.clear();
  }
  entryIndex(m) {
    const s = this.schedule;
    if (!s.length) return -1;
    let k = s.length - 1;
    for (let i = 0; i < s.length; i++) { if (s[i].t <= m) k = i; else break; }
    if (s[0].t > m) k = s.length - 1;
    return k;
  }
}

function endNode(e) { return e.route ? e.route[e.route.length - 1] : e.spot.node; }
function startNode(e) { return e.route ? e.route[0] : e.spot.node; }

export class People {
  constructor(ctx) {
    this.ctx = ctx;
    this.list = [];
    this.byName = new Map();
    this.roomOcc = new Map();
    this.visible = [];
  }
  add(o) {
    const p = new Person({ id: this.list.length, ...o });
    this.list.push(p);
    const k = `${p.first} ${p.last}`.toLowerCase(), prev = this.byName.get(k);
    if (!prev || (p.notable && !prev.notable)) this.byName.set(k, p); // a named townsperson wins over a namesake
    return p;
  }
  find(first, last) { return this.byName.get(`${first} ${last}`.toLowerCase()); }

  attachCharacters(chars) {
    this.chars = chars;
    for (const p of this.list) { p.finalize(); p.ch = chars.create(p.look); }
  }

  _path(p, k) {
    let rec = p.paths.get(k);
    if (rec !== undefined) return rec;
    const s = p.schedule, e = s[k], prev = s[(k - 1 + s.length) % s.length];
    const nav = this.ctx.nav;
    const a = endNode(prev), b = startNode(e);
    let nodes = (a === b) ? [a] : nav.path(a, b);
    if (!nodes) nodes = null;
    if (nodes && e.route) nodes = nodes.concat(e.route.slice(1));
    if (nodes && nodes.length > 1) {
      const cum = new Float32Array(nodes.length);
      for (let i = 1; i < nodes.length; i++) {
        const u = nodes[i - 1], v = nodes[i];
        cum[i] = cum[i - 1] + Math.hypot(nav.x[u] - nav.x[v], nav.y[u] - nav.y[v], nav.z[u] - nav.z[v]);
      }
      const routeStart = e.route ? cum[nodes.length - e.route.length] : null;
      rec = { nodes, cum, len: cum[nodes.length - 1], routeStart };
    } else rec = { nodes: null, len: 0 };
    p.paths.set(k, rec);
    return rec;
  }

  _alongPath(rec, d, out, p) {
    const nav = this.ctx.nav, n = rec.nodes, c = rec.cum;
    let lo = 0, hi = n.length - 1;
    while (lo < hi - 1) { const mid = (lo + hi) >> 1; if (c[mid] <= d) lo = mid; else hi = mid; }
    const u = n[lo], v = n[hi];
    const segLen = c[hi] - c[lo] || 1;
    const t = Math.min(1, Math.max(0, (d - c[lo]) / segLen));
    const dx = nav.x[v] - nav.x[u], dz = nav.z[v] - nav.z[u];
    out.x = nav.x[u] + dx * t; out.y = nav.y[u] + (nav.y[v] - nav.y[u]) * t; out.z = nav.z[u] + dz * t;
    if (Math.abs(dx) + Math.abs(dz) > 0.01) out.yaw = Math.atan2(dx, dz);
    // sidewalk lanes so crowds don't walk in single file
    const iu = nav.info[u], iv = nav.info[v];
    if (iu.kind === 'walk' && iv.kind === 'walk') {
      const L = Math.hypot(dx, dz) || 1;
      const edge = Math.min(1, (d - c[lo]) / 2, (c[hi] - d) / 2);
      const off = p.lane * Math.max(0, edge);
      out.x += (dz / L) * off; out.z += (-dx / L) * off;
    }
    out.room = (t < 0.5 ? iu.room : iv.room) || 0;
  }

  // Evaluate everyone at absolute clock minutes `abs`. realT: seconds (for animation).
  update(abs, realT, cam, radii) {
    const m = ((abs % DAY) + DAY) % DAY;
    const occ = this.roomOcc; occ.clear();
    const tv = this.tvRooms || (this.tvRooms = new Set()); tv.clear();
    const vis = this.visible; vis.length = 0;
    const [rIn, rOut] = radii;
    const st = {};
    for (const p of this.list) {
      const s = p.schedule;
      const ch = p.ch;
      if (!s.length) { if (ch) ch.pose.visible = false; continue; }
      const k = p.entryIndex(m);
      const e = s[k];
      let el = m - e.t; if (el < 0) el += DAY;
      const rec = this._path(p, k);
      const speed = (e.speed || p.speed) * 60; // metres per game minute
      const walkLen = rec.nodes ? (e.route ? rec.routeStart : rec.len) : 0;
      let mode, x, y, z, yaw, room, act = e.act;
      if (rec.nodes && el * speed < walkLen) {
        this._alongPath(rec, el * speed, st, p);
        mode = 'walk'; x = st.x; y = st.y; z = st.z; yaw = st.yaw ?? p.state.yaw; room = st.room;
        act = 'walk';
      } else if (e.route && rec.nodes) {
        // strolling along the route, back and forth
        const span = rec.len - rec.routeStart;
        let d = el * speed * 0.8 - walkLen;
        const cyc = d % (2 * span);
        const dd = cyc < span ? cyc : 2 * span - cyc;
        this._alongPath(rec, rec.routeStart + dd, st, p);
        mode = 'walk'; x = st.x; y = st.y; z = st.z; yaw = st.yaw ?? 0; if (cyc >= span) yaw += 0; room = st.room; act = 'walk';
      } else if (e.spot) {
        const sp = e.spot;
        mode = 'spot'; x = sp.x; y = sp.y; z = sp.z; yaw = sp.yaw; room = sp.room;
        if (sp.spread) { const a = hash3(p.id, sp.id, 1) * 6.283, r = Math.sqrt(hash3(p.id, sp.id, 2)) * sp.spread; x += Math.cos(a) * r; z += Math.sin(a) * r; if (sp.faceTo) yaw = Math.atan2(sp.faceTo[0] - x, sp.faceTo[1] - z); else yaw += (hash3(p.id, 5, sp.id) - 0.5) * 0.8; }
        if (act !== 'sleep') occ.set(room, (occ.get(room) || 0) + 1);
        if (act === 'watch' || (act === 'eat' && sp.tags.includes('tv'))) tv.add(room);
      } else { if (ch) ch.pose.visible = false; continue; }
      const S = p.state;
      S.mode = mode; S.x = x; S.y = y; S.z = z; S.yaw = yaw; S.room = room; S.act = act; S.entry = e; S.spot = e.spot; S.k = k; S.dist = el * speed;
      if (!ch) continue;
      // visibility
      const dx = x - cam.x, dy = y - cam.y, dz = z - cam.z;
      const d2 = dx * dx + dy * dy * 2 + dz * dz;
      const R = room ? rIn : rOut;
      if (d2 > R * R || (mode === 'spot' && S.spot && S.spot.hidden)) { ch.pose.visible = false; continue; }
      S.camDist = Math.sqrt(d2);
      vis.push(p);
    }
    // pose the visible ones
    for (const p of vis) this._pose(p, realT);
  }

  _pose(p, t) {
    const S = p.state, P = p.ch.pose, sc = p.ch.scale;
    const costume = (S.entry && S.entry.costume) || null;
    if (p.ch.costume !== costume) this.chars.setCostume(p.ch, costume);
    P.visible = true; P.room = S.room;
    const speaking = p.speakingUntil > t;
    if (S.mode === 'walk') {
      applyActivity(P, 'stand', { t, ph: p.ph, s: sc });
      walkPose(P, S.dist * 2.3 / sc, 1, sc);
      P.x = S.x; P.y = S.y; P.z = S.z; P.yaw = S.yaw;
      const held = S.entry.held || p.carry || null;
      this.chars.setHeld(p.ch, held, heldTint(held, p));
      if (held) { P.aRp = -0.25; }
      const arms = S.entry.arms;
      if (arms === 'push') { P.aLp = P.aRp = -1.0; P.aLr = P.aRr = -0.12; P.lean = 0.1; }
      else if (arms === 'carry') { P.aLp = P.aRp = -1.2; P.aLr = P.aRr = -0.3; P.lean = -0.05; }
      else if (arms === 'pull') { P.aRp = 0.35; P.aRr = 0.1; }
      else if (arms === 'arm') { P.aLp = -0.3; P.aLr = -0.45; }
    } else {
      const sp = S.spot;
      const a = applyActivity(P, S.act, { t, ph: p.ph, seat: sp.seat, s: sc, speaking });
      let x = S.x, z = S.z, yaw = S.yaw;
      const paceL = (sp && sp.pace) || a.pace;
      if (paceL) {
        // back and forth along the spot's facing (mowing, hauling crates from a truck, pacing)
        const L = paceL, c = (t * 0.9 / L + p.ph) % 2, d = c < 1 ? c : 2 - c; const fx = Math.sin(yaw), fz = Math.cos(yaw); x += fx * d * L; z += fz * d * L;
        const keep = a.base !== 'walk' ? [P.aLp, P.aLr, P.aRp, P.aRr, P.headPitch] : null;
        walkPose(P, t * 5 + p.ph, 0.8, sc);
        if (keep) [P.aLp, P.aLr, P.aRp, P.aRr, P.headPitch] = keep;
        if (c >= 1) yaw += Math.PI;
      }
      else if (a.circle) { const r = a.circle, w = (a.speed || 2) / r; const ang = t * w * 0.5 + p.ph; x += Math.cos(ang) * r; z += Math.sin(ang) * r; yaw = Math.atan2(-Math.sin(ang), Math.cos(ang)); walkPose(P, t * 7 + p.ph, 1.2, sc); P.bob += Math.max(0, Math.sin(t * 6 + p.ph)) * 0.05; }
      else if (a.base === 'walk') { walkPose(P, t * 4 + p.ph, 0.5, sc); }
      if (P.swing) { const fx = Math.sin(yaw), fz = Math.cos(yaw); x += fx * P.swing * 0.5; z += fz * P.swing * 0.5; P.bob += (1 - Math.cos(P.swing * 1.2)) * 0.25; }
      P.x = x; P.y = S.y; P.z = z; P.yaw = yaw + (P.yawOffset || 0);
      if (a.song) P.song = true;
      const held = S.entry.held || a.held || null;
      this.chars.setHeld(p.ch, held, heldTint(held, p));
      if (speaking && a.base !== 'sleep' && !a.song && P.mouth === 0) P.mouth = Math.sin(t * 13 + p.ph) > 0.1 ? 1 : 0;
    }
    // glance at the player when they pass close by
    const pp = this.playerPos;
    if (pp && !(p.greetUntil > t) && S.act !== 'sleep' && P.lie === 0) {
      const dx = pp.x - P.x, dz = pp.z - P.z, d2 = dx * dx + dz * dz;
      if (d2 < 12 && Math.abs(pp.y - P.y) < 2 && ((p.id * 7) % 10) < 7) {
        let d = Math.atan2(dx, dz) - P.yaw;
        while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
        if (Math.abs(d) < 1.9) { const k = Math.min(1, (12 - d2) / 6); P.headYaw = P.headYaw * (1 - k) + Math.max(-1.0, Math.min(1.0, d)) * k; P.headPitch = -0.05; }
      }
    }
    // look at the player when greeted
    if (p.greetUntil > t && p.greetYaw !== undefined) {
      let d = p.greetYaw - P.yaw;
      while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
      P.headYaw = Math.max(-1.1, Math.min(1.1, d));
      if (Math.abs(d) > 1.1 && S.mode !== 'walk' && (!S.spot || S.spot.pose === 'stand')) P.yaw += d - Math.sign(d) * 1.1;
      P.headPitch = -0.05;
    }
    // blinking
    const bl = (t * 0.33 + p.ph) % 1;
    P.blink = P.blinkForce ? 1 : (bl < 0.035 ? 1 : 0);
  }

  describeActivity(p) {
    const S = p.state;
    if (!S.entry) return '';
    if (S.mode === 'walk') {
      const e = S.entry;
      if (e.route) return e.label || 'Out for a stroll';
      return e.label ? `On the way — ${e.label.toLowerCase()}` : (e.spot && e.spot.building ? `Heading to ${e.spot.building.name}` : 'Walking');
    }
    return S.entry.label || activity(S.act).label || '';
  }
}
