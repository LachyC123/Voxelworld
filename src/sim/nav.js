// Walkable navigation graph (sidewalks, crosswalks, paths, doorways, stairs, rooms).
// Nodes are points in metres; A* with a binary heap; paths cached.

class Heap {
  constructor() { this.a = []; }
  push(k, v) { const a = this.a; a.push([k, v]); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p][0] <= a[i][0]) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } }
  pop() { const a = this.a; const top = a[0]; const last = a.pop(); if (a.length) { a[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < a.length && a[l][0] < a[m][0]) m = l; if (r < a.length && a[r][0] < a[m][0]) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } } return top; }
  get size() { return this.a.length; }
}

const CELL = 8;

export class Nav {
  constructor() {
    this.x = []; this.y = []; this.z = []; this.info = []; this.adj = [];
    this.grid = new Map();
    this.cache = new Map();
  }
  get count() { return this.x.length; }
  node(x, y, z, info = {}) {
    const id = this.x.length;
    this.x.push(x); this.y.push(y); this.z.push(z); this.info.push(info); this.adj.push([]);
    const k = Math.floor(x / CELL) + ',' + Math.floor(z / CELL);
    let a = this.grid.get(k); if (!a) { a = []; this.grid.set(k, a); } a.push(id);
    return id;
  }
  link(a, b, cost = null) {
    if (a === b || a == null || b == null) return;
    if (this.adj[a].some((e) => e[0] === b)) return;
    const d = cost ?? Math.hypot(this.x[a] - this.x[b], (this.y[a] - this.y[b]) * 1.5, this.z[a] - this.z[b]);
    this.adj[a].push([b, d]); this.adj[b].push([a, d]);
  }
  // chain of links through a list of nodes
  chain(ids) { for (let i = 0; i < ids.length - 1; i++) this.link(ids[i], ids[i + 1]); }
  pos(id) { return [this.x[id], this.y[id], this.z[id]]; }
  nearest(x, y, z, filter = null, maxR = 48) {
    let best = -1, bd = Infinity;
    const r = Math.ceil(maxR / CELL);
    const cx = Math.floor(x / CELL), cz = Math.floor(z / CELL);
    for (let ring = 0; ring <= r; ring++) {
      for (let dz = -ring; dz <= ring; dz++) for (let dx = -ring; dx <= ring; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== ring) continue;
        const a = this.grid.get((cx + dx) + ',' + (cz + dz));
        if (!a) continue;
        for (const id of a) {
          if (filter && !filter(id, this.info[id])) continue;
          const d = Math.hypot(this.x[id] - x, (this.y[id] - y) * 3, this.z[id] - z);
          if (d < bd) { bd = d; best = id; }
        }
      }
      if (best >= 0 && bd < (ring) * CELL) break;
    }
    return best;
  }
  path(a, b) {
    if (a === b) return [a];
    const key = a < b ? a + ':' + b : b + ':' + a;
    let p = this.cache.get(key);
    if (p === undefined) {
      p = this._astar(a, b);
      if (this.cache.size > 20000) this.cache.clear();
      this.cache.set(key, p);
    }
    if (!p) return null;
    return p[0] === a ? p : p.slice().reverse();
  }
  _astar(a, b) {
    const n = this.x.length;
    const g = new Float64Array(n).fill(Infinity), from = new Int32Array(n).fill(-1), closed = new Uint8Array(n);
    const bx = this.x[b], by = this.y[b], bz = this.z[b];
    const h = (i) => Math.hypot(this.x[i] - bx, this.y[i] - by, this.z[i] - bz);
    const heap = new Heap();
    g[a] = 0; heap.push(h(a), a);
    let iter = 0;
    while (heap.size) {
      const [, u] = heap.pop();
      if (u === b) break;
      if (closed[u]) continue;
      closed[u] = 1;
      if (++iter > 200000) break;
      for (const [v, w] of this.adj[u]) {
        const ng = g[u] + w;
        if (ng < g[v]) { g[v] = ng; from[v] = u; heap.push(ng + h(v), v); }
      }
    }
    if (from[b] < 0) return null;
    const out = [b];
    let c = b;
    while (c !== a) { c = from[c]; out.push(c); if (out.length > 100000) return null; }
    out.reverse();
    return out;
  }
  // connected components (for diagnostics / snapping)
  components() {
    const n = this.x.length, comp = new Int32Array(n).fill(-1);
    let k = 0;
    for (let i = 0; i < n; i++) {
      if (comp[i] >= 0) continue;
      const st = [i]; comp[i] = k;
      while (st.length) { const u = st.pop(); for (const [v] of this.adj[u]) if (comp[v] < 0) { comp[v] = k; st.push(v); } }
      k++;
    }
    return { comp, count: k };
  }
}
