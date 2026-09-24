// Terraced voxel hills around the town (autumn woods, pasture, rocky headlands) and the
// shoreline of the bay. Rendered with the world voxel shader; walkable via heightAt().
import * as THREE from 'three';
import { VS } from '../core/config.js';
import { MAT } from '../world/materials.js';
import { RNG, hash3 } from '../core/rng.js';

export const TOWN_BOX = { x0: -4, x1: 470, z0: -300, z1: 330 };
const EXT = { x0: -600, x1: 1300, z0: -1100, z1: 1100 };
const CELL = 4; // metres

function vnoise(x, z, s) {
  const xi = Math.floor(x / s), zi = Math.floor(z / s);
  const fx = x / s - xi, fz = z / s - zi;
  const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  const a = hash3(xi, zi, s), b = hash3(xi + 1, zi, s), c = hash3(xi, zi + 1, s), d = hash3(xi + 1, zi + 1, s);
  return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1;
}
function fbm(x, z) { return vnoise(x, z, 260) * 0.55 + vnoise(x, z, 110) * 0.3 + vnoise(x, z, 43) * 0.15; }

export function shoreX(z) {
  if (z < -330) return -4 - (-330 - z) * 0.85 + vnoise(z, 7, 60) * 12;
  if (z > 360) return -4 - (z - 360) * 0.9 + vnoise(z, 9, 60) * 12;
  return -4;
}

// raw terrain height in metres (NaN-free). Inside the town box returns -20 (the voxel world owns it).
export function terrainHeight(x, z) {
  if (x > TOWN_BOX.x0 && x < TOWN_BOX.x1 && z > TOWN_BOX.z0 && z < TOWN_BOX.z1) return -20;
  const sx = shoreX(z);
  if (x < sx) {
    // under water: slope down from the shore
    return Math.max(-9, -1.8 - (sx - x) * 0.06);
  }
  const dx = Math.max(TOWN_BOX.x0 - x, 0, x - TOWN_BOX.x1), dz = Math.max(TOWN_BOX.z0 - z, 0, z - TOWN_BOX.z1);
  let d = Math.hypot(dx, dz);
  const dShore = x - sx;
  d = Math.min(d, dShore * 1.4 + (x < 0 ? 0 : 9999));
  const n = fbm(x, z);
  let h = Math.pow(Math.min(1, d / 420), 1.25) * (46 + 34 * n) + Math.min(1, d / 50) * (vnoise(x, z, 28) * 3 + 1.5);
  // gentle coastal land near the shore
  if (dShore < 30) h = Math.min(h, dShore * 0.12 + 0.2);
  // road out of town along Grand Avenue, and the rail line east
  if (x > TOWN_BOX.x1 - 2 && z > -86 && z < -54) { const road = (x - TOWN_BOX.x1) * 0.04; const k = Math.min(1, Math.max(0, (Math.abs(z + 70) - 8) / 8)); h = road + (h - road) * k; }
  if (x > 100 && z > -262 && z < -226 && z < TOWN_BOX.z0 + 80) { const k = Math.min(1, Math.max(0, (Math.abs(z + 244) - 10) / 8)); h = h * k; }
  return Math.max(0, h);
}

function matFor(x, z, h, slope) {
  if (h < 0.5) return MAT.sand;
  if (x > TOWN_BOX.x1 - 2 && Math.abs(z + 70) < 7.5 && h < 40) return MAT.asphalt;
  if (Math.abs(z + 244) < 8 && x > 100) return MAT.gravel;
  if (slope > 2.5 || h > 70) return MAT.rock;
  const n = vnoise(x, z, 37);
  if (n > 0.45) return MAT.leaf_litter;
  if (n < -0.5) return MAT.grass_dry;
  return MAT.grass;
}

export class Terrain {
  constructor(scene, material) {
    this.scene = scene; this.material = material;
    this.nx = Math.ceil((EXT.x1 - EXT.x0) / CELL); this.nz = Math.ceil((EXT.z1 - EXT.z0) / CELL);
    this.h = new Int16Array(this.nx * this.nz); // voxel units
    for (let j = 0; j < this.nz; j++) for (let i = 0; i < this.nx; i++) {
      const x = EXT.x0 + (i + 0.5) * CELL, z = EXT.z0 + (j + 0.5) * CELL;
      const hm = terrainHeight(x, z);
      this.h[i + j * this.nx] = hm < -10 ? -9999 : Math.round(hm) * 4;
    }
  }
  // height (metres) of the terrain surface at (x, z), or -99 where there is none
  heightAt(x, z) {
    const i = Math.floor((x - EXT.x0) / CELL), j = Math.floor((z - EXT.z0) / CELL);
    if (i < 0 || j < 0 || i >= this.nx || j >= this.nz) return -99;
    const v = this.h[i + j * this.nx];
    return v === -9999 ? -99 : v * VS;
  }
  build() {
    const T = 64; // cells per tile
    const group = new THREE.Group(); group.name = 'terrain';
    let tris = 0;
    const H = (i, j) => (i < 0 || j < 0 || i >= this.nx || j >= this.nz) ? -9999 : this.h[i + j * this.nx];
    const C = CELL * 4; // voxels per cell
    for (let tj = 0; tj < this.nz; tj += T) for (let ti = 0; ti < this.nx; ti += T) {
      const pos = [], dat = [], idx = [];
      const ox = Math.round(EXT.x0 * 4) + ti * C, oz = Math.round(EXT.z0 * 4) + tj * C;
      const quad = (p, mat, face, ao) => {
        const b = pos.length / 3;
        for (let k = 0; k < 4; k++) { pos.push(p[k][0] - ox, p[k][1], p[k][2] - oz); dat.push(mat, face, ao ? ao[k] : 3, 0); }
        idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
      };
      for (let j = tj; j < Math.min(this.nz, tj + T); j++) {
        // tops, merged along x
        let i = ti;
        const iEnd = Math.min(this.nx, ti + T);
        while (i < iEnd) {
          const h = H(i, j);
          if (h === -9999) { i++; continue; }
          const x = EXT.x0 + (i + 0.5) * CELL, z = EXT.z0 + (j + 0.5) * CELL;
          const slope = Math.max(Math.abs(H(i + 1, j) - h), Math.abs(H(i, j + 1) - h)) / 4;
          const m = matFor(x, z, h / 4, slope);
          let k = i + 1;
          while (k < iEnd && H(k, j) === h && matFor(EXT.x0 + (k + 0.5) * CELL, z, h / 4, Math.max(Math.abs(H(k + 1, j) - h), Math.abs(H(k, j + 1) - h)) / 4) === m) k++;
          const x0 = ox + (i - ti) * C, x1 = ox + (k - ti) * C, z0 = oz + (j - tj) * C, z1 = z0 + C;
          quad([[x0, h, z1], [x1, h, z1], [x1, h, z0], [x0, h, z0]], m, 2);
          i = k;
        }
        // sides toward +x and +z neighbours (whichever is lower gets the wall)
        for (let ii = ti; ii < iEnd; ii++) {
          const h = H(ii, j);
          if (h === -9999) continue;
          const x0 = ox + (ii - ti) * C, z0 = oz + (j - tj) * C;
          for (const [ni, nj, dir] of [[ii + 1, j, 'x'], [ii, j + 1, 'z']]) {
            let hn = H(ni, nj);
            if (hn === -9999) hn = -40;
            if (hn === h) continue;
            const lo = Math.min(h, hn), hi = Math.max(h, hn);
            const sideMat = hi - lo > 8 ? MAT.rock : MAT.dirt;
            const ao = [1, 1, 3, 3];
            if (dir === 'x') {
              const x = x0 + C;
              if (h > hn) quad([[x, lo, z0 + C], [x, lo, z0], [x, hi, z0], [x, hi, z0 + C]], sideMat, 0, ao);
              else quad([[x, lo, z0], [x, lo, z0 + C], [x, hi, z0 + C], [x, hi, z0]], sideMat, 1, ao);
            } else {
              const z = z0 + C;
              if (h > hn) quad([[x0, lo, z], [x0 + C, lo, z], [x0 + C, hi, z], [x0, hi, z]], sideMat, 4, ao);
              else quad([[x0 + C, lo, z], [x0, lo, z], [x0, hi, z], [x0 + C, hi, z]], sideMat, 5, ao);
            }
          }
        }
      }
      if (!idx.length) continue;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Int16BufferAttribute(new Int16Array(pos), 3));
      g.setAttribute('aData', new THREE.Uint8BufferAttribute(new Uint8Array(dat), 4));
      g.setAttribute('aRoom', new THREE.Uint16BufferAttribute(new Uint16Array(pos.length / 3), 1));
      g.setIndex(new THREE.Uint32BufferAttribute(new Uint32Array(idx), 1));
      g.computeBoundingSphere();
      const mesh = new THREE.Mesh(g, this.material);
      mesh.position.set(ox * VS, 0, oz * VS); mesh.scale.setScalar(VS);
      mesh.matrixAutoUpdate = false; mesh.updateMatrix();
      group.add(mesh);
      tris += idx.length / 3;
    }
    this.scene.add(group);
    this.group = group;
    return tris;
  }
  // scatter trees on the hills (props must be finalized afterwards)
  plantTrees(props) {
    const r = new RNG('forest');
    let n = 0;
    const kinds = ['tree_maple_red', 'tree_maple_orange', 'tree_elm_yellow', 'tree_oak', 'tree_birch', 'tree_pine'];
    const far = ['tree_far', 'tree_far', 'tree_far', 'pine_far'];
    const tints = ['#c23a24', '#d8742a', '#e0b030', '#9a4a24', '#6a8a3a', '#b8322a', '#d89a2a'];
    for (let z = EXT.z0 + 20; z < EXT.z1 - 20; z += 9) for (let x = EXT.x0 + 20; x < EXT.x1 - 20; x += 9) {
      const jx = x + (r.next() - 0.5) * 6, jz = z + (r.next() - 0.5) * 6;
      const h = terrainHeight(jx, jz);
      if (h < 1.2) continue;
      const dx = Math.max(TOWN_BOX.x0 - jx, 0, jx - TOWN_BOX.x1), dz = Math.max(TOWN_BOX.z0 - jz, 0, jz - TOWN_BOX.z1);
      const d = Math.hypot(dx, dz);
      if (d > 650) continue;
      const dens = vnoise(jx, jz, 70) * 0.5 + 0.35 + (h > 20 ? 0.2 : 0);
      if (r.next() > dens * (d < 300 ? 0.85 : 0.4)) continue;
      if (Math.abs(jz + 70) < 12 && jx > TOWN_BOX.x1) continue;
      if (Math.abs(jz + 244) < 12) continue;
      const hh = this.heightAt(jx, jz);
      if (hh < 0) continue;
      const nearTown = d < 160;
      if (nearTown) props.add(r.pick(kinds), jx, hh, jz, r.float(0, 6.28), { cat: 'far', scale: r.float(0.8, 1.15) });
      else props.add(r.chance(h > 35 ? 0.5 : 0.2) ? 'pine_far' : 'tree_far', jx, hh, jz, r.float(0, 6.28), { cat: 'far', scale: r.float(0.9, 1.4), tint: r.pick(tints) });
      n++;
    }
    void far;
    return n;
  }
}
