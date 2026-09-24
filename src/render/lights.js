// Point-light registry (street lamps, porch lights, table lamps, headlights...).
// Each frame the nearest active lights are uploaded to the shared shader uniforms.
import { MAX_LIGHTS } from './shaders.js';

const CELL = 24;

export class Lights {
  constructor() {
    this.list = [];
    this.cells = new Map();
    this.dynamic = [];
    this.max = MAX_LIGHTS;
    this._acc = 0;
  }
  // mode: 'night' (on when dark), 'always', 'room' (follows room lamp level), 'manual' (intensity field)
  add(x, y, z, o = {}) {
    const L = { x, y, z, color: o.color || [1.0, 0.78, 0.48], radius: o.radius || 8, mode: o.mode || 'night', room: o.room || 0, intensity: o.intensity ?? 1, flicker: o.flicker || 0 };
    this.list.push(L);
    if (this.cells) {
      const k = Math.floor(x / CELL) + ',' + Math.floor(z / CELL);
      let a = this.cells.get(k); if (!a) { a = []; this.cells.set(k, a); } a.push(L);
    }
    return L;
  }
  addDynamic(o = {}) { const L = { x: 0, y: -1000, z: 0, color: o.color || [1, 0.9, 0.7], radius: o.radius || 10, mode: 'manual', room: o.room || 0, intensity: 0 }; this.dynamic.push(L); return L; }

  update(common, cam, night, rooms, time, maxLights) {
    const cand = [];
    const R = 70;
    const c0 = Math.floor((cam.x - R) / CELL), c1 = Math.floor((cam.x + R) / CELL), d0 = Math.floor((cam.z - R) / CELL), d1 = Math.floor((cam.z + R) / CELL);
    const consider = (L) => {
      let k = 0;
      if (L.mode === 'night') k = night;
      else if (L.mode === 'always') k = 1;
      else if (L.mode === 'room') { const r = rooms[L.room]; k = r ? r.lit : 0; }
      else k = L.intensity;
      k *= L.intensity ?? 1;
      if (L.mode === 'manual') k = L.intensity;
      if (k < 0.02) return;
      const dx = L.x - cam.x, dy = L.y - cam.y, dz = L.z - cam.z;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz) - L.radius;
      if (d > R) return;
      cand.push([d, L, k]);
    };
    for (let cz = d0; cz <= d1; cz++) for (let cx = c0; cx <= c1; cx++) { const a = this.cells.get(cx + ',' + cz); if (a) for (const L of a) consider(L); }
    for (const L of this.dynamic) consider(L);
    cand.sort((a, b) => a[0] - b[0]);
    const n = Math.min(cand.length, maxLights, this.max);
    const P = common.uLightPos.value, C = common.uLightCol.value;
    for (let i = 0; i < n; i++) {
      const [, L, k] = cand[i];
      let f = k;
      if (L.flicker) f *= 0.85 + 0.15 * Math.sin(time * 23 + L.x) * Math.sin(time * 17 + L.z);
      P[i].set(L.x, L.y, L.z, L.radius);
      C[i].set(L.color[0] * f, L.color[1] * f, L.color[2] * f, L.room);
    }
    common.uNumLights.value = n;
  }
}
