// Pigeons on Founders Square (they scatter when you walk through them) and gulls over the harbour.
import { SQUARE, PIERS } from '../city/layout.js';
import { WATER_Y } from '../core/config.js';

export class Birds {
  constructor(props) {
    this.pigeons = [];
    const cx = (SQUARE.x0 + SQUARE.x1) / 2, cz = (SQUARE.z0 + SQUARE.z1) / 2;
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * 6.28, r = 7 + Math.random() * 14;
      const home = [cx + Math.cos(a) * r, cz + Math.sin(a) * r * 0.8];
      this.pigeons.push({ h: props.addDynamic('pigeon', {}), home, x: home[0], z: home[1], y: 0.26, state: 'ground', t: 0, ph: Math.random() * 10, yaw: Math.random() * 6.28 });
    }
    this.gulls = [];
    for (let i = 0; i < 14; i++) this.gulls.push({ h: props.addDynamic('seagull', {}), cx: -40 - Math.random() * 120, cz: -180 + Math.random() * 380, r: 12 + Math.random() * 30, y: 8 + Math.random() * 18, sp: 0.2 + Math.random() * 0.25, ph: Math.random() * 6.28 });
    // a few gulls perched on piles
    this.perched = PIERS.slice(0, 5).map((p, i) => ({ h: props.addDynamic('seagull', {}), x: -p.len + 1 + i, z: p.z + p.w / 2 + 0.2 }));
  }
  update(dt, t, player, night) {
    for (const p of this.pigeons) {
      const h = p.h; if (h.dummy) continue;
      const d = Math.hypot(player.x - p.x, player.z - p.z);
      if (p.state === 'ground') {
        if (d < 3.2 && player.y < 3) { p.state = 'fly'; p.t = 0; p.fa = Math.atan2(p.z - player.z, p.x - player.x); }
        // peck & hop
        p.ph += dt;
        if (Math.sin(p.ph * 0.7) > 0.95) { p.x += Math.sin(p.yaw) * dt * 0.8; p.z += Math.cos(p.yaw) * dt * 0.8; }
        if (Math.random() < dt * 0.3) p.yaw += (Math.random() - 0.5) * 2;
        h.x = p.x; h.y = 0.26; h.z = p.z; h.yaw = p.yaw; h.pitch = Math.max(0, Math.sin(p.ph * 6)) * 0.5; h.roll = 0;
      } else {
        p.t += dt;
        const T = p.t;
        const R = 6 + T * 2;
        p.x = p.x + Math.cos(p.fa + T * 0.8) * dt * 7; p.z = p.z + Math.sin(p.fa + T * 0.8) * dt * 7;
        const y = 0.26 + Math.min(1, T / 1.5) * 6 * (T < 6 ? 1 : Math.max(0, 1 - (T - 6) / 2));
        h.x = p.x; h.y = y; h.z = p.z; h.yaw = -(p.fa + T * 0.8) + Math.PI / 2; h.roll = Math.sin(t * 30) * 0.35; h.pitch = 0;
        void R;
        if (T > 8) { p.state = 'ground'; p.x = p.home[0] + (Math.random() - 0.5) * 6; p.z = p.home[1] + (Math.random() - 0.5) * 6; }
      }
      h.visible = night < 0.7;
    }
    for (const g of this.gulls) {
      const h = g.h; if (h.dummy) continue;
      const a = t * g.sp + g.ph;
      h.x = g.cx + Math.cos(a) * g.r; h.z = g.cz + Math.sin(a) * g.r; h.y = g.y + Math.sin(t * 0.7 + g.ph) * 1.5;
      h.yaw = -a; h.roll = -0.35 + Math.sin(t * 9 + g.ph) * 0.12; h.pitch = 0;
      h.visible = night < 0.6;
    }
    for (const g of this.perched) { if (g.h.dummy) continue; g.h.x = g.x; g.h.y = 1.2; g.h.z = g.z; g.h.yaw = Math.sin(t * 0.3 + g.x) * 1.5; }
    void WATER_Y;
  }
}
