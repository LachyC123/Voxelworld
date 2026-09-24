// Chunk rasteriser + greedy mesher with per-vertex ambient occlusion and room ids.
// Runs inside workers. Pure functions over the serialized world.
import { CHUNK } from '../core/config.js';

const S = CHUNK, P = S + 2, P2 = P * P, P3 = P2 * P;
const STRIDE = 8;
const FLAG_SOLID = 1, FLAG_TRANSPARENT = 2;

let vox = new Uint8Array(P3);
let rooms = new Uint16Array(P3);
const maskKey = new Uint32Array(S * S);
const maskRoom = new Uint16Array(S * S);

class Out {
  constructor() { this.cap = 4096; this.pos = new Int16Array(this.cap * 3); this.dat = new Uint8Array(this.cap * 4); this.room = new Uint16Array(this.cap); this.idx = new Uint32Array(this.cap * 2); this.nv = 0; this.ni = 0; }
  ensure(nv, ni) {
    if (this.nv + nv > this.cap) {
      const cap = Math.max(this.cap * 2, this.nv + nv);
      const t = new Int16Array(cap * 3); t.set(this.pos); this.pos = t;
      const d = new Uint8Array(cap * 4); d.set(this.dat); this.dat = d;
      const r = new Uint16Array(cap); r.set(this.room); this.room = r;
      this.cap = cap;
    }
    if (this.ni + ni > this.idx.length) { const t = new Uint32Array(Math.max(this.idx.length * 2, this.ni + ni)); t.set(this.idx); this.idx = t; }
  }
  result() {
    if (this.ni === 0) return null;
    return { pos: this.pos.slice(0, this.nv * 3), dat: this.dat.slice(0, this.nv * 4), room: this.room.slice(0, this.nv), idx: this.idx.slice(0, this.ni) };
  }
}

export function createMesher(W) {
  const { brushes: b, modelInfo, modelData, col, roomBoxes: rb, rcol, matFlags } = W;
  const opaque = new Uint8Array(256), trans = new Uint8Array(256);
  for (let i = 0; i < 256; i++) { opaque[i] = (matFlags[i] & FLAG_SOLID) ? 1 : 0; trans[i] = (matFlags[i] & FLAG_TRANSPARENT) ? 1 : 0; }

  function colIdx(cx, cz) {
    const x = cx - col.cx0, z = cz - col.cz0;
    if (x < 0 || z < 0 || x >= col.ncx || z >= col.ncz) return -1;
    return x + z * col.ncx;
  }

  function rasterize(cx, cy, cz) {
    vox.fill(0); rooms.fill(0);
    const ci = colIdx(cx, cz);
    if (ci < 0) return false;
    const bx0 = cx * S - 1, by0 = cy * S - 1, bz0 = cz * S - 1;
    let any = false;
    for (let k = col.start[ci], e = col.start[ci + 1]; k < e; k++) {
      const o = col.list[k] * STRIDE;
      const x0 = Math.max(b[o + 1], bx0) - bx0, x1 = Math.min(b[o + 4], bx0 + P) - bx0;
      if (x0 >= x1) continue;
      const y0 = Math.max(b[o + 2], by0) - by0, y1 = Math.min(b[o + 5], by0 + P) - by0;
      if (y0 >= y1) continue;
      const z0 = Math.max(b[o + 3], bz0) - bz0, z1 = Math.min(b[o + 6], bz0 + P) - bz0;
      if (z0 >= z1) continue;
      if (b[o] === 0) {
        const m = b[o + 7];
        if (m) any = true;
        for (let y = y0; y < y1; y++) for (let z = z0; z < z1; z++) { const s = x0 + P * (z + P * y); vox.fill(m, s, s + (x1 - x0)); }
      } else {
        const mi = b[o + 7] * 4, msx = modelInfo[mi], msz = modelInfo[mi + 2], off = modelInfo[mi + 3];
        const mx0 = b[o + 1] - bx0, my0 = b[o + 2] - by0, mz0 = b[o + 3] - bz0;
        for (let y = y0; y < y1; y++) for (let z = z0; z < z1; z++) {
          const rowM = off + (x0 - mx0) + msx * ((z - mz0) + msz * (y - my0));
          const rowV = x0 + P * (z + P * y);
          for (let x = 0; x < x1 - x0; x++) {
            const v = modelData[rowM + x];
            if (v === 0) continue;
            vox[rowV + x] = v === 255 ? 0 : v;
            if (v !== 255) any = true;
          }
        }
      }
    }
    if (!any) return false;
    for (let k = rcol.start[ci], e = rcol.start[ci + 1]; k < e; k++) {
      const o = rcol.list[k] * 7;
      const x0 = Math.max(rb[o], bx0) - bx0, x1 = Math.min(rb[o + 3], bx0 + P) - bx0;
      if (x0 >= x1) continue;
      const y0 = Math.max(rb[o + 1], by0) - by0, y1 = Math.min(rb[o + 4], by0 + P) - by0;
      if (y0 >= y1) continue;
      const z0 = Math.max(rb[o + 2], bz0) - bz0, z1 = Math.min(rb[o + 5], bz0 + P) - bz0;
      if (z0 >= z1) continue;
      const id = rb[o + 6];
      for (let y = y0; y < y1; y++) for (let z = z0; z < z1; z++) { const s = x0 + P * (z + P * y); rooms.fill(id, s, s + (x1 - x0)); }
    }
    return true;
  }

  // axis order: d, u=(d+1)%3, v=(d+2)%3 ; strides x=1, y=P2, z=P
  const STR = [1, P2, P];

  function meshInto(cx, cy, cz, ox, oy, oz, outO, outG, minFaceY) {
    if (!rasterize(cx, cy, cz)) return;
    const baseX = cx * S - ox, baseY = cy * S - oy, baseZ = cz * S - oz;
    for (let d = 0; d < 3; d++) {
      const u = (d + 1) % 3, v = (d + 2) % 3;
      const sd = STR[d], su = STR[u], sv = STR[v];
      for (let dir = -1; dir <= 1; dir += 2) {
        const faceDir = d * 2 + (dir > 0 ? 0 : 1);
        const nOff = dir * sd;
        for (let i = 0; i < S; i++) {
          // skip faces far underground pointing down
          if (d === 1 && dir < 0 && (cy * S + i) <= minFaceY) continue;
          let anyFace = false;
          for (let k = 0; k < S; k++) {
            for (let j = 0; j < S; j++) {
              const p = (i + 1) * sd + (j + 1) * su + (k + 1) * sv;
              const a = vox[p];
              const m = j + k * S;
              if (a === 0) { maskKey[m] = 0; continue; }
              const q = p + nOff;
              const nb = vox[q];
              let key = 0, room = 0;
              if (opaque[a]) {
                if (opaque[nb]) { maskKey[m] = 0; continue; }
                const um = opaque[vox[q - su]], up = opaque[vox[q + su]], vm = opaque[vox[q - sv]], vp = opaque[vox[q + sv]];
                const cmm = opaque[vox[q - su - sv]], cpm = opaque[vox[q + su - sv]], cpp = opaque[vox[q + su + sv]], cmp = opaque[vox[q - su + sv]];
                const a0 = (um && vm) ? 0 : 3 - (um + vm + cmm);
                const a1 = (up && vm) ? 0 : 3 - (up + vm + cpm);
                const a2 = (up && vp) ? 0 : 3 - (up + vp + cpp);
                const a3 = (um && vp) ? 0 : 3 - (um + vp + cmp);
                key = a | (a0 << 8) | (a1 << 10) | (a2 << 12) | (a3 << 14);
                room = rooms[q];
              } else {
                // transparent: face only against air or a different transparent material
                if (opaque[nb] || nb === a) { maskKey[m] = 0; continue; }
                room = rooms[q];
                let inner = 1;
                if (room === 0) { room = rooms[p - nOff]; inner = 0; }
                key = a | (255 << 8) | (inner << 16) | (1 << 17);
              }
              maskKey[m] = key; maskRoom[m] = room; anyFace = true;
            }
          }
          if (!anyFace) continue;
          // greedy merge
          for (let k = 0; k < S; k++) {
            for (let j = 0; j < S;) {
              const m = j + k * S;
              const key = maskKey[m];
              if (key === 0) { j++; continue; }
              const room = maskRoom[m];
              let w = 1;
              while (j + w < S && maskKey[m + w] === key && maskRoom[m + w] === room) w++;
              let h = 1;
              outer: for (; k + h < S; h++) {
                const row = m + h * S;
                for (let t = 0; t < w; t++) if (maskKey[row + t] !== key || maskRoom[row + t] !== room) break outer;
              }
              for (let hh = 0; hh < h; hh++) maskKey.fill(0, m + hh * S, m + hh * S + w);
              const isGlass = (key >> 17) & 1;
              const out = isGlass ? outG : outO;
              out.ensure(4, 6);
              const mat = key & 255;
              let ao0 = 3, ao1 = 3, ao2 = 3, ao3 = 3, flags = 0;
              if (!isGlass) { ao0 = (key >> 8) & 3; ao1 = (key >> 10) & 3; ao2 = (key >> 12) & 3; ao3 = (key >> 14) & 3; }
              else flags = ((key >> 16) & 1) ? 1 : 0;
              const plane = i + (dir > 0 ? 1 : 0);
              const cu = [j, j + w, j + w, j], cvv = [k, k, k + h, k + h], aos = [ao0, ao1, ao2, ao3];
              const nv = out.nv;
              for (let c = 0; c < 4; c++) {
                const pp = [0, 0, 0];
                pp[d] = plane; pp[u] = cu[c]; pp[v] = cvv[c];
                const vi = out.nv * 3, di = out.nv * 4;
                out.pos[vi] = pp[0] + baseX; out.pos[vi + 1] = pp[1] + baseY; out.pos[vi + 2] = pp[2] + baseZ;
                out.dat[di] = mat; out.dat[di + 1] = faceDir; out.dat[di + 2] = aos[c]; out.dat[di + 3] = flags;
                out.room[out.nv] = room;
                out.nv++;
              }
              const I = out.idx; let n = out.ni;
              const diag02 = (ao0 + ao2) > (ao1 + ao3);
              if (dir > 0) {
                if (diag02) { I[n++] = nv; I[n++] = nv + 1; I[n++] = nv + 2; I[n++] = nv; I[n++] = nv + 2; I[n++] = nv + 3; }
                else { I[n++] = nv + 1; I[n++] = nv + 2; I[n++] = nv + 3; I[n++] = nv + 1; I[n++] = nv + 3; I[n++] = nv; }
              } else {
                if (diag02) { I[n++] = nv; I[n++] = nv + 2; I[n++] = nv + 1; I[n++] = nv; I[n++] = nv + 3; I[n++] = nv + 2; }
                else { I[n++] = nv + 1; I[n++] = nv + 3; I[n++] = nv + 2; I[n++] = nv + 1; I[n++] = nv; I[n++] = nv + 3; }
              }
              out.ni = n;
              j += w;
            }
          }
        }
      }
    }
  }

  // Mesh a whole render region: columns [rcx0, rcx0+n) x [rcz0, rcz0+n)
  function meshRegion(rcx0, rcz0, n, minFaceY = -40) {
    const outO = new Out(), outG = new Out();
    const ox = rcx0 * S, oy = 0, oz = rcz0 * S;
    for (let cz = rcz0; cz < rcz0 + n; cz++) for (let cx = rcx0; cx < rcx0 + n; cx++) {
      const ci = colIdx(cx, cz);
      if (ci < 0) continue;
      // need y extent: compute from brushes in this column (cheap scan)
      let yMin = 1 << 30, yMax = -(1 << 30);
      for (let k = col.start[ci], e = col.start[ci + 1]; k < e; k++) {
        const o = col.list[k] * STRIDE;
        if (b[o] === 0 && b[o + 7] === 0) continue;
        if (b[o + 2] < yMin) yMin = b[o + 2];
        if (b[o + 5] > yMax) yMax = b[o + 5];
      }
      if (yMin > yMax) continue;
      const cy0 = Math.floor((yMin - 1) / S), cy1 = Math.floor(yMax / S);
      for (let cy = cy0; cy <= cy1; cy++) meshInto(cx, cy, cz, ox, oy, oz, outO, outG, minFaceY);
    }
    return { opaque: outO.result(), glass: outG.result(), origin: [ox, oy, oz] };
  }

  return { meshRegion, rasterize };
}
