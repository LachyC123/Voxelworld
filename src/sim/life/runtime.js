// Per-frame side of street life: shows timed props during their windows, carries follow-props
// along with their people, runs scene hooks (animals), answers "what am I looking at?" for the
// crosshair caption, and lists the ambient sound sources that are live right now.
import { MFLAG } from '../../world/materials.js';
import { VS } from '../../core/config.js';
import { fmtTime } from '../../core/util.js';

const inWin = (m, t0, t1) => (t0 === null || t1 === null) ? true : t0 <= t1 ? (m >= t0 && m < t1) : (m >= t0 || m < t1);

export class LifeRuntime {
  constructor(ctx) {
    this.ctx = ctx;
    this.L = ctx.life;
    this.rt = { minutes: 0, abs: 0, t: 0, dt: 0, cam: null, props: ctx.props, people: ctx.people, player: null, ctx };
    this._acc = 0;
  }

  update(g, dt) {
    const L = this.L; if (!L) return;
    const m = g.clock.minutes, cam = g.R.camera.position;
    const rt = this.rt;
    rt.minutes = m; rt.abs = g.clock.abs; rt.t = g.time; rt.dt = dt; rt.cam = cam; rt.player = g.player; rt.game = g;
    // timed props: in their window and near enough to matter
    this._acc += dt;
    if (this._acc > 0.25 || g.clock.jumped) {
      this._acc = 0;
      for (const q of L.timed) {
        const dx = q.h.x - cam.x, dz = q.h.z - cam.z;
        q.h.visible = inWin(m, q.t0, q.t1) && dx * dx + dz * dz < q.r * q.r;
      }
    }
    // follow-props ride along with their person
    for (const f of L.follows) {
      const p = f.p, P = p.ch && p.ch.pose, S = p.state;
      let show = !!(P && P.visible) && inWin(m, f.t0, f.t1);
      if (show) show = f.when === 'always' || (f.when === 'walk' ? S.mode === 'walk' : f.when === 'spot' ? S.mode === 'spot' : f.when(S, p));
      f.h.visible = show;
      if (!show) continue;
      const yaw = P.yaw, s = Math.sin(yaw), c = Math.cos(yaw);
      // person frame: forward = (sin yaw, cos yaw), right = (cos yaw, -sin yaw)
      f.h.x = P.x + s * f.fwd + c * f.side;
      f.h.z = P.z + c * f.fwd - s * f.side;
      f.h.y = P.y + f.y + (f.bob ? Math.abs(Math.sin(g.time * 5 + p.ph)) * f.bob : 0);
      f.h.yaw = yaw + f.yawOff;
      f.h.room = P.room || 0;
    }
    this.passing(g);
    for (const fn of L.updaters) { try { fn(rt); } catch (e) { if (!this._warned) { this._warned = true; console.warn('life hook failed', e); } } }
  }

  // Townsfolk passing each other on the sidewalk nod, tip a hat, and (within earshot) say so.
  passing(g) {
    this._pt = (this._pt || 0) + 1;
    if (this._pt % 6) return;
    const t = g.time, m = g.clock.minutes, pl = g.player.pos;
    const W = this.ctx.people.visible.filter((p) => p.state.mode === 'walk' && !p.state.room && p.state.camDist < 45 && !(p.nodUntil > t - 4));
    for (let i = 0; i < W.length; i++) {
      const a = W[i], A = a.state;
      if (a.nodUntil > t) continue;
      for (let j = i + 1; j < W.length; j++) {
        const b = W[j], B = b.state;
        if (b.nodUntil > t) continue;
        const dx = B.x - A.x, dz = B.z - A.z, d2 = dx * dx + dz * dz;
        if (d2 > 6.5 || d2 < 0.3) continue;
        // approaching each other (not walking together)
        const fa = [Math.sin(A.yaw), Math.cos(A.yaw)], fb = [Math.sin(B.yaw), Math.cos(B.yaw)];
        if (fa[0] * fb[0] + fa[1] * fb[1] > -0.3) continue;
        if (fa[0] * dx + fa[1] * dz < 0) continue;
        if (((a.id * 31 + b.id * 17) % 10) > 5) continue; // not everybody stops to say hello
        const now = t;
        for (const [p, q, S, Q] of [[a, b, A, B], [b, a, B, A]]) {
          p.nodUntil = now + 1.6; p.nodYaw = Math.atan2(Q.x - S.x, Q.z - S.z);
          p.nodHat = !!(p.look && p.look.hat) && p.sex === 'M' && p.age > 16;
        }
        if (Math.hypot(A.x - pl.x, A.z - pl.z) < 18 && g.bubbles) {
          const who = a.age > 12 ? a : b, other = who === a ? b : a;
          const part = m < 720 ? 'Morning' : m < 1050 ? 'Afternoon' : 'Evening';
          const name = other.age < 14 ? other.first : who.age < 18 ? `${other.sex === 'F' ? 'Mrs.' : 'Mr.'} ${other.last}` : (who.last === other.last ? other.first : ((a.id + b.id) % 3 === 0 ? other.first : `${other.sex === 'F' ? (other.age > 24 ? 'Mrs.' : 'Miss') : 'Mr.'} ${other.last}`));
          const lines = [`${part}, ${name}.`, `${part}, ${name}! Some day for it.`, `Hello there, ${name}.`, `${name}! Going to the fair?`, `${part}. Give my best to your mother.`];
          g.bubbles.say(who, lines[(a.id + b.id + Math.floor(m / 7)) % lines.length], t, 2.6);
        }
        break;
      }
    }
  }

  // live ambient sound sources for the audio engine
  soundSources(m, cam) {
    const out = [];
    for (const s of this.L.sounds) {
      if (!inWin(m, s.t0, s.t1)) continue;
      const dx = s.x - cam.x, dz = s.z - cam.z;
      if (dx * dx + dz * dz > s.range * s.range) continue;
      out.push(s);
    }
    return out;
  }

  // is the straight line from a to b clear of opaque voxels?
  clear(a, b) {
    const W = this.ctx.world;
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
    const d = Math.hypot(dx, dy, dz), n = Math.ceil(d / 0.3);
    for (let i = 2; i < n - 2; i++) {
      const t = i / n;
      const mm = W.matAt(Math.floor((a.x + dx * t) / VS), Math.floor((a.y + dy * t) / VS), Math.floor((a.z + dz * t) / VS));
      if (mm && !(W.matFlags[mm] & (MFLAG.GLASS | MFLAG.TRANSPARENT | MFLAG.NOCOLLIDE))) return false;
    }
    return true;
  }

  // what the crosshair rests on: a person (name + what they're doing) or a labelled thing
  lookAt(g, cam, fwd, maxD = 34) {
    const m = g.clock.minutes;
    let best = null, bs = Infinity;
    const consider = (x, y, z, r, obj) => {
      const dx = x - cam.x, dy = y - cam.y, dz = z - cam.z;
      const along = dx * fwd.x + dy * fwd.y + dz * fwd.z;
      if (along < 1.2 || along > maxD) return;
      const px = dx - fwd.x * along, py = dy - fwd.y * along, pz = dz - fwd.z * along;
      const off = Math.hypot(px, py, pz);
      if (off > r + along * 0.02) return;
      const score = off / (r + 0.01) + along / maxD;
      if (score < bs) { bs = score; best = { x, y, z, obj, d: along }; }
    };
    for (const p of this.ctx.people.visible) {
      const S = p.state; if (S.camDist > maxD) continue;
      const P = p.ch.pose;
      consider(P.x, P.y + (S.act === 'sleep' ? 0.5 : 1.0), P.z, 0.6, p);
    }
    for (const l of this.L.labels) if (inWin(m, l.t0, l.t1) && Math.abs(l.x - cam.x) < maxD && Math.abs(l.z - cam.z) < maxD) consider(l.x, l.y, l.z, l.r, l);
    if (best && this.clear(cam, best)) return best;
    return g.playerRoom ? null : this.buildingAt(cam, fwd, m);
  }

  // the building the crosshair rests on (first opaque voxel along the view ray), described
  buildingAt(cam, fwd, m, maxD = 90) {
    // the answer can't change while the camera holds still (only the opening hours might)
    const c = this._bc;
    if (c && c.maxD === maxD && c.m === Math.floor(m) && Math.abs(c.x - cam.x) + Math.abs(c.y - cam.y) + Math.abs(c.z - cam.z) < 0.03 && c.fx * fwd.x + c.fy * fwd.y + c.fz * fwd.z > 0.99995) return c.r;
    const r = this._buildingAt(cam, fwd, m, maxD);
    this._bc = { x: cam.x, y: cam.y, z: cam.z, fx: fwd.x, fy: fwd.y, fz: fwd.z, m: Math.floor(m), maxD, r };
    return r;
  }
  _buildingAt(cam, fwd, m, maxD) {
    const W = this.ctx.world;
    let hit = null;
    for (let d = 1; d < maxD; d += 0.35) {
      const x = cam.x + fwd.x * d, y = cam.y + fwd.y * d, z = cam.z + fwd.z * d;
      if (y < 0.3) return null;
      const mm = W.matAt(Math.floor(x / VS), Math.floor(y / VS), Math.floor(z / VS));
      if (mm && !(W.matFlags[mm] & (MFLAG.GLASS | MFLAG.TRANSPARENT | MFLAG.NOCOLLIDE))) { hit = { x, y, z, d }; break; }
    }
    if (!hit || hit.d < 2.5) return null;
    const b = this.ctx.buildings.find((q) => q.rect && hit.x >= q.rect.x0 && hit.x <= q.rect.x1 && hit.z >= q.rect.z0 && hit.z <= q.rect.z1);
    if (!b) return null;
    return { ...hit, building: b, obj: { text: this.describeBuilding(b, m) } };
  }

  describeBuilding(b, m) {
    const cache = this._bdesc || (this._bdesc = new Map());
    let base = cache.get(b);
    if (!base) {
      const hh = (this.ctx.households || []).filter((h) => h.home.building === b);
      const addr = b.address && !b.name.startsWith(b.address) ? ` · ${b.address}` : '';
      if (b.kind === 'house' && hh.length === 1) base = `<b>The ${hh[0].surname} house</b>${addr}`;
      else if (b.kind === 'rowhouse' && hh.length) base = `<b>${b.name}</b>${hh.length === 1 ? ` · the ${hh[0].surname}s` : ''}${addr}`;
      else base = `<b>${b.name}</b>${addr}${b.established ? ` · est. ${b.established}` : ''}`;
      cache.set(b, base);
    }
    if (b.hours && !(b.hours[0] === 0 && b.hours[1] >= 1440)) {
      const [o, c] = b.hours;
      const open = m >= o && m < c;
      return base + (open ? ` · open till ${fmtTime(c)}` : ` · closed${m < o ? ' — opens ' + fmtTime(o) : ''}`);
    }
    return base;
  }

  // dynamic interactables live right now
  interactables(m) { return this.L.interact.filter((it) => inWin(m, it.t0, it.t1) && (!it.when || it.when(m))); }
}
