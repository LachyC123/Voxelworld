// Moving boats: the fishing fleet (out before dawn, home at six), sailboats in the bay by
// day, a tug making its rounds. Positions are functions of the clock so time-scrubbing works.
import { WATER_Y } from '../core/config.js';
import { PIERS } from '../city/layout.js';

const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);

export class Boats {
  constructor(props) {
    this.list = [];
    const pier3 = PIERS.find((p) => p.name === 'Pier 3'), pier4 = PIERS.find((p) => p.name === 'Pier 4');
    const hulls = ['#2a4a6a', '#8a2a24', '#2a5a3a', '#d8d0b8', '#3a3a5a'];
    // fishing fleet: moored alongside piers 3 & 4
    const berths = [[-18, pier3.z - pier3.w / 2 - 3.5], [-36, pier3.z - pier3.w / 2 - 3.5], [-22, pier3.z + pier3.w / 2 + 3.5], [-40, pier3.z + pier3.w / 2 + 3.5], [-24, pier4.z + pier4.w / 2 + 3.5]];
    berths.forEach((b, i) => {
      const h = props.addDynamic(i === 4 ? 'lobster_boat' : 'fishing_boat', { tint: hulls[i % hulls.length] });
      this.list.push({ kind: 'fleet', h, berth: b, i, out: 4 * 60 + 20 + i * 6, back: 5 * 60 + 35 + i * 7 });
    });
    // sailboats
    for (let i = 0; i < 3; i++) this.list.push({ kind: 'sail', h: props.addDynamic('sailboat', { tint: ['#f0ece2', '#b0302a', '#2a4a7a'][i] }), i, berth: [-12 - i * 7, 165 + 6] });
    // tug
    this.list.push({ kind: 'tug', h: props.addDynamic('tugboat', { tint: '#8a2420' }), berth: [-30, -118 + 12] });
  }

  update(minutes, t) {
    for (const b of this.list) {
      const h = b.h;
      if (h.dummy) continue;
      let x = b.berth[0], z = b.berth[1], yaw = -Math.PI / 2, moving = false;
      if (b.kind === 'fleet') {
        const outDur = 25, backDur = 30;
        if (minutes >= b.out && minutes < b.out + outDur) { const u = smooth((minutes - b.out) / outDur); x = lerp(b.berth[0], -1100, u); z = lerp(b.berth[1], b.berth[1] - 80 - b.i * 30, u); yaw = -Math.PI / 2 - 0.1; moving = true; }
        else if (minutes >= b.out + outDur && minutes < b.back) { h.visible = false; continue; }
        else if (minutes >= b.back && minutes < b.back + backDur) { const u = smooth((minutes - b.back) / backDur); x = lerp(-1100, b.berth[0], u); z = lerp(b.berth[1] - 60 + b.i * 25, b.berth[1], u); yaw = Math.PI / 2; moving = true; }
        else yaw = Math.PI / 2;
      } else if (b.kind === 'sail') {
        if (minutes > 9 * 60 + 30 + b.i * 20 && minutes < 17 * 60 + 30 - b.i * 15) {
          const a = t * 0.012 + b.i * 2.1;
          x = -320 + Math.cos(a) * (140 + b.i * 40); z = 60 + Math.sin(a) * (180 + b.i * 30);
          yaw = Math.atan2(-Math.sin(a), Math.cos(a)) + Math.PI / 2 * 0; moving = true;
          yaw = Math.atan2(-Math.sin(a) * (140 + b.i * 40), Math.cos(a) * (180 + b.i * 30));
        } else yaw = 0;
      } else if (b.kind === 'tug') {
        if (minutes > 6 * 60 && minutes < 20 * 60) {
          const a = t * 0.02;
          x = -160 + Math.cos(a) * 110; z = -40 + Math.sin(a * 1.3) * 160;
          const dx = -Math.sin(a) * 110, dz = Math.cos(a * 1.3) * 1.3 * 160;
          yaw = Math.atan2(dx, dz); moving = true;
        }
      }
      h.visible = true;
      h.x = x; h.z = z; h.yaw = yaw;
      h.y = WATER_Y - 0.35 + Math.sin(t * 1.3 + b.berth[0]) * 0.06;
      h.pitch = Math.sin(t * 0.9 + b.berth[1]) * (moving ? 0.03 : 0.015);
      h.roll = Math.sin(t * 1.1 + b.berth[0]) * (moving ? 0.05 : 0.025);
    }
  }
}
