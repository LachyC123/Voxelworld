// Voxel + prop-box collision for the player and camera.
import { VS, INV_VS } from '../core/config.js';

export class Collision {
  constructor(world, props, terrain = null) {
    this.world = world; this.props = props; this.terrain = terrain;
    this.cache = new Map();
  }
  solidVoxel(vx, vy, vz) {
    const k = (vx * 73856093) ^ (vy * 19349663) ^ (vz * 83492791);
    const key = vx + ',' + vy + ',' + vz;
    void k;
    let v = this.cache.get(key);
    if (v === undefined) {
      if (this.cache.size > 200000) this.cache.clear();
      v = this.world.solidAt(vx, vy, vz) ? 1 : 0;
      if (!v && this.terrain) { const h = this.terrain.heightAt((vx + 0.5) * VS, (vz + 0.5) * VS); if (h > -50 && (vy + 0.5) * VS < h) v = 1; }
      this.cache.set(key, v);
    }
    return v === 1;
  }
  // AABB in metres
  boxHits(x0, y0, z0, x1, y1, z1) {
    const a0 = Math.floor(x0 * INV_VS), a1 = Math.floor((x1 - 1e-6) * INV_VS);
    const b0 = Math.floor(y0 * INV_VS), b1 = Math.floor((y1 - 1e-6) * INV_VS);
    const c0 = Math.floor(z0 * INV_VS), c1 = Math.floor((z1 - 1e-6) * INV_VS);
    for (let y = b0; y <= b1; y++) for (let z = c0; z <= c1; z++) for (let x = a0; x <= a1; x++) if (this.solidVoxel(x, y, z)) return true;
    if (this.props) {
      const seen = new Set();
      for (const cx of [x0, x1]) for (const cz of [z0, z1]) {
        const list = this.props.collidersNear(cx, cz);
        if (!list) continue;
        for (const b of list) {
          if (seen.has(b)) continue; seen.add(b);
          if (x1 > b[0] && x0 < b[3] && y1 > b[1] && y0 < b[4] && z1 > b[2] && z0 < b[5]) return true;
        }
      }
    }
    return false;
  }
  // highest solid surface under (x, z) starting from y downward (metres), or null
  groundBelow(x, y, z, maxDrop = 20) {
    const vx = Math.floor(x * INV_VS), vz = Math.floor(z * INV_VS);
    let vy = Math.floor(y * INV_VS);
    for (let i = 0; i < maxDrop * INV_VS; i++, vy--) if (this.solidVoxel(vx, vy, vz)) return (vy + 1) * VS;
    return null;
  }
  // march a ray; returns distance to first solid voxel or maxDist
  ray(ox, oy, oz, dx, dy, dz, maxDist, step = 0.08) {
    for (let t = 0; t < maxDist; t += step) {
      const x = ox + dx * t, y = oy + dy * t, z = oz + dz * t;
      if (this.solidVoxel(Math.floor(x * INV_VS), Math.floor(y * INV_VS), Math.floor(z * INV_VS))) return t;
    }
    return maxDist;
  }
}
