// Swinging doors that open when someone walks up to them.
export class Doors {
  constructor() { this.list = []; }
  // o: {x,y,z (hinge, metres), yaw (closed orientation of the leaf's +z face), width (m), type, tint, swing (+1/-1)}
  add(o) { this.list.push({ ...o, open: 0, target: 0, h: null, holdUntil: 0 }); }
  attach(props) {
    this.props = props;
    for (const d of this.list) { d.h = props.addDynamic(d.type || 'door_wood', { tint: d.tint || '#6a4a30' }); d.h.visible = false; }
    this.cells = new Map();
    for (const d of this.list) { const k = Math.floor(d.x / 16) + ',' + Math.floor(d.z / 16); let a = this.cells.get(k); if (!a) { a = []; this.cells.set(k, a); } a.push(d); }
  }
  update(dt, cam, movers, t) {
    const R = 40;
    for (const d of this.list) d.h.visible = false;
    const c0 = Math.floor((cam.x - R) / 16), c1 = Math.floor((cam.x + R) / 16), e0 = Math.floor((cam.z - R) / 16), e1 = Math.floor((cam.z + R) / 16);
    for (let cz = e0; cz <= e1; cz++) for (let cx = c0; cx <= c1; cx++) {
      const a = this.cells.get(cx + ',' + cz); if (!a) continue;
      for (const d of a) {
        // door centre (half a width from the hinge along the closed leaf direction)
        const mx = d.x + Math.cos(d.yaw) * d.width / 2, mz = d.z - Math.sin(d.yaw) * d.width / 2;
        let near = false;
        for (const m of movers) { const dx = m.x - mx, dz = m.z - mz, dy = m.y - d.y; if (dx * dx + dz * dz < 2.6 && Math.abs(dy) < 1.6) { near = true; break; } }
        if (near) d.holdUntil = t + 1.2;
        d.target = t < d.holdUntil ? 1 : 0;
        const sp = dt * 3.2;
        d.open += Math.max(-sp, Math.min(sp, d.target - d.open));
        const h = d.h;
        h.visible = true; h.x = d.x; h.y = d.y; h.z = d.z;
        h.yaw = d.yaw + d.open * (Math.PI / 2) * 0.92 * (d.swing || 1);
        h.scale = d.width / 1.0;
      }
    }
  }
}
