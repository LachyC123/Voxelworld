// Per-frame side of street life: shows timed props during their windows, carries follow-props
// along with their people, runs scene hooks (animals), answers "what am I looking at?" for the
// crosshair caption, and lists the ambient sound sources that are live right now.
import { MFLAG } from '../../world/materials.js';
import { VS } from '../../core/config.js';

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
    for (const fn of L.updaters) { try { fn(rt); } catch (e) { if (!this._warned) { this._warned = true; console.warn('life hook failed', e); } } }
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
    if (!best) return null;
    if (!this.clear(cam, best)) return null;
    return best;
  }

  // dynamic interactables live right now
  interactables(m) { return this.L.interact.filter((it) => inWin(m, it.t0, it.t1) && (!it.when || it.when(m))); }
}
