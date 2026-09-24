// Decides which rooms have their lamps on: occupied rooms at dusk, shops in business hours,
// some households still up late, TVs flickering blue in parlours.
import { hash3 } from '../core/rng.js';

export class RoomLights {
  constructor(world, tex) {
    this.world = world; this.tex = tex;
    this.level = new Float32Array(world.rooms.length);
    this.acc = 0; this.first = true;
  }
  update(dt, minutes, night, people, time) {
    this.acc += dt;
    const rooms = this.world.rooms;
    const occ = people.roomOcc;
    const tvRooms = people.tvRooms || new Set();
    const full = this.acc > 0.25 || this.first;
    if (!full && !tvRooms.size) return;
    const step = Math.min(1, this.acc * 1.5);
    if (full) this.acc = 0;
    const late = minutes > 23 * 60 || minutes < 5 * 60;
    for (let i = 1; i < rooms.length; i++) {
      const r = rooms[i];
      let target = 0;
      const b = r.building;
      const h = hash3(i, 17, 3);
      const open = b && b.hours && minutes >= b.hours[0] && minutes < b.hours[1];
      switch (r.lightMode) {
        case 'always': target = open || !b || !b.hours ? 1 : (night > 0.3 && h < 0.25 ? 0.5 : 0); break;
        case 'never': target = 0; break;
        case 'night': target = night > 0.25 ? 1 : 0; break;
        case 'day': target = open ? 1 : 0; break;
        default: {
          const o = occ.get(i) || 0;
          if (open) target = 1;
          else if (o > 0) target = night > 0.12 ? 1 : (h < 0.3 ? 0.75 : 0);
          else if (night > 0.35 && !late && h < 0.16) target = 0.8; // somebody left the hall light on
          else if (late && h < 0.04) target = 0.6;
        }
      }
      if (this.first) this.level[i] = target;
      else this.level[i] += (target - this.level[i]) * step;
      r.lit = this.level[i];
      const k = r.lit * (r.lightPower ?? 1);
      const c = r.lightColor;
      let rr = c[0] * k, gg = c[1] * k, bb = c[2] * k;
      if (tvRooms.has(i)) {
        const f = 0.55 + 0.3 * Math.sin(time * 11 + i) * Math.sin(time * 3.7 + i * 2) + 0.15 * Math.sin(time * 29);
        const tvk = night > 0.2 ? 0.55 : 0.25;
        rr = rr * 0.5 + 0.28 * f * tvk; gg = gg * 0.5 + 0.36 * f * tvk; bb = bb * 0.5 + 0.55 * f * tvk;
      }
      this.tex.set(i, rr * 0.55, gg * 0.55, bb * 0.55);
    }
    this.first = false;
    this.tex.flush();
  }
}
