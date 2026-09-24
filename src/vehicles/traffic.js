// Street traffic: cars drive the grid on the right-hand lanes, turn at intersections,
// obey the downtown traffic signals, queue behind each other and stop for the player.
import * as THREE from 'three';
import { AVENUES, STREETS, GAPS, GRID } from '../city/layout.js';
import { RNG } from '../core/rng.js';

const LANE = 3.0;          // lane offset from the centre line (m)
const STOP = 11.5;         // stop line distance from the intersection centre
const DIRS = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] };
const LEFT = { N: 'W', W: 'S', S: 'E', E: 'N' }, RIGHT = { N: 'E', E: 'S', S: 'W', W: 'N' }, BACK = { N: 'S', S: 'N', E: 'W', W: 'E' };
const CAR_Y = 0.02;

export class Traffic {
  constructor(ctx) {
    this.ctx = ctx;
    this.rng = new RNG('traffic');
    // intersections grid
    this.nodes = new Map(); // "x,z" -> {x, z, links: {N: node|null, ...}, signal}
    const key = (x, z) => x + ',' + z;
    const xs = AVENUES.map((a) => a.x), zs = STREETS.map((s) => s.z);
    for (const x of xs) for (const z of zs) {
      const gap = GAPS.some((g) => AVENUES.find((a) => a.name === g.avenue).x === x && z > g.z0 + 1 && z < g.z1 - 1);
      if (!gap) this.nodes.set(key(x, z), { x, z, links: {}, signal: null, ave: AVENUES.find((a) => a.x === x).name, st: STREETS.find((s) => s.z === z).name });
    }
    const roadBetween = (a, b) => {
      if (a.x === b.x) { // along an avenue
        const ave = AVENUES.find((q) => q.x === a.x);
        return !GAPS.some((g) => g.avenue === ave.name && Math.min(a.z, b.z) < g.z1 - 1 && Math.max(a.z, b.z) > g.z0 + 1);
      }
      return true;
    };
    for (const n of this.nodes.values()) {
      const i = xs.indexOf(n.x), j = zs.indexOf(n.z);
      const nb = { N: j > 0 ? this.nodes.get(key(n.x, zs[j - 1])) : null, S: j < zs.length - 1 ? this.nodes.get(key(n.x, zs[j + 1])) : null, W: i > 0 ? this.nodes.get(key(xs[i - 1], n.z)) : null, E: i < xs.length - 1 ? this.nodes.get(key(xs[i + 1], n.z)) : null };
      for (const d of ['N', 'S', 'E', 'W']) n.links[d] = nb[d] && roadBetween(n, nb[d]) ? nb[d] : null;
      // exits out of town: Grand Avenue east, Harbor Street north & south
      if (n.st === 'Grand Avenue' && n.x === xs[xs.length - 1]) n.exit = 'E';
      if (n.ave === 'Harbor Street' && n.z === zs[0]) n.exit = 'N';
      if (n.ave === 'Harbor Street' && n.z === zs[zs.length - 1]) n.exit = 'S';
    }
    // traffic signals
    for (const s of ctx.signals || []) {
      const n = this.nodes.get(key(s.x, s.z));
      if (n) n.signal = { offset: this.rng.float(0, 40) };
    }
    this.cars = [];
    this.signalHeads = [];
  }

  // signal state for a heading at node n at real time t: 'G' | 'Y' | 'R'
  signalState(n, dir, t) {
    if (!n.signal) return 'G';
    const cyc = 46, c = (t + n.signal.offset) % cyc;
    const ns = dir === 'N' || dir === 'S';
    // 0-20 NS green, 20-23 NS yellow, 23-43 EW green, 43-46 EW yellow
    if (ns) return c < 20 ? 'G' : c < 23 ? 'Y' : 'R';
    return c >= 23 && c < 43 ? 'G' : c >= 43 ? 'Y' : 'R';
  }

  spawn(props, lights, count = 46) {
    const types = [['car_sedan', 10], ['car_coupe', 6], ['car_wagon', 3], ['car_convertible', 2], ['car_taxi', 4], ['truck_pickup', 4], ['truck_delivery', 3], ['car_police', 1], ['truck_milk', 1], ['bus_city', 2], ['truck_bread', 1]];
    const paint = ['#2a3a5a', '#6a2a2a', '#3a5a3a', '#d8d0b8', '#2a2a2e', '#7a8a9a', '#a8743a', '#5a8a8a', '#8a2a3a', '#c8b060', '#3a4a6a', '#e8e0d0', '#4a6a4a', '#9a4a2a'];
    const all = [...this.nodes.values()];
    for (let i = 0; i < count; i++) {
      const type = this.rng.weighted(types);
      const h = props.addDynamic(type, { tint: this.rng.pick(paint), tint2: this.rng.pick(['#e8e4d8', '#d8d0b8', '#2a2a2e']) });
      if (h.dummy) continue;
      const n = this.rng.pick(all);
      const dirs = Object.keys(n.links).filter((d) => n.links[d]);
      if (!dirs.length) continue;
      const d = this.rng.pick(dirs);
      const car = { h, type, from: n, dir: d, to: n.links[d], s: this.rng.float(0, 30), speed: 0, max: type === 'bus_city' ? 8 : this.rng.float(9, 12.5), len: type === 'bus_city' ? 10.5 : type.startsWith('truck') ? 6 : 5.2, turn: null, next: null, wait: 0, id: i, active: true, lights: null };
      car.next = this.chooseNext(car.to, d);
      this.cars.push(car);
    }
    // signal heads on the corners of signalised intersections
    this.heads = [];
    for (const n of this.nodes.values()) {
      if (!n.signal) continue;
      for (const [cx, cz, faceNS, faceEW] of [[8.6, -8.6, 0, -Math.PI / 2], [-8.6, 8.6, Math.PI, Math.PI / 2]]) {
        const pole = props.addDynamic('traffic_signal', {});
        if (pole.dummy) break;
        pole.x = n.x + cx; pole.y = 0.25; pole.z = n.z + cz; pole.yaw = faceNS;
        const a = props.addDynamic('signal_lamp', { tint: '#40ff80' }), b = props.addDynamic('signal_lamp', { tint: '#ff3020' });
        this.heads.push({ n, pole, lampNS: a, lampEW: b, faceNS, faceEW, cx, cz });
      }
    }
    // headlight pool (nearest cars at night)
    this.headlights = [];
    for (let i = 0; i < 6; i++) this.headlights.push(lights.addDynamic({ color: [1.0, 0.92, 0.7], radius: 12 }));
  }

  chooseNext(node, dir) {
    if (!node) return null;
    const opts = [];
    if (node.links[dir]) opts.push([dir, 6]);
    if (node.links[LEFT[dir]]) opts.push([LEFT[dir], 2]);
    if (node.links[RIGHT[dir]]) opts.push([RIGHT[dir], 2.5]);
    if (node.exit && node.exit === dir) opts.push(['EXIT', 3]);
    if (!opts.length) { if (node.links[BACK[dir]]) opts.push([BACK[dir], 1]); else opts.push(['EXIT', 1]); }
    return this.rng.weighted(opts);
  }

  // lane geometry: position of a car s metres along the segment from node `a` to `b` heading `dir`
  lanePos(a, b, dir, s) {
    const [dx, dz] = DIRS[dir];
    // right-hand lane offset: rotate direction by +90° (clockwise when viewed from above: (dx,dz)->(-dz,dx))
    const ox = -dz * LANE, oz = dx * LANE;
    return [a.x + dx * s + ox, a.z + dz * s + oz];
  }
  segLen(a, b) { return Math.abs(b.x - a.x) + Math.abs(b.z - a.z); }

  update(dt, t, playerPos, night, activeFrac = 1) {
    const cars = this.cars;
    // index cars per segment for following
    const seg = new Map();
    for (const c of cars) { if (!c.active) continue; const k = c.from.x + ',' + c.from.z + c.dir; let a = seg.get(k); if (!a) { a = []; seg.set(k, a); } a.push(c); }
    for (const a of seg.values()) a.sort((p, q) => q.s - p.s);
    const nActive = Math.round(cars.length * activeFrac);
    cars.forEach((c, i) => { c.active = i < nActive; c.h.visible = c.active; });
    for (const c of cars) {
      if (!c.active) continue;
      const L = this.segLen(c.from, c.to);
      let target = c.max;
      // car ahead in the same segment
      const list = seg.get(c.from.x + ',' + c.from.z + c.dir);
      const idx = list.indexOf(c);
      let gap = Infinity;
      if (idx > 0) gap = list[idx - 1].s - c.s - list[idx - 1].len;
      else {
        // first in segment: look at the stop line / next segment's tail
        const stopAt = L - STOP;
        const st = this.signalState(c.to, c.dir, t);
        if ((st === 'R' || (st === 'Y' && stopAt - c.s > 6)) && c.s < stopAt + 0.5) gap = stopAt - c.s;
        else if (c.next && c.next !== 'EXIT') {
          const nk = c.to.x + ',' + c.to.z + c.next;
          const nl = seg.get(nk);
          if (nl && nl.length) { const tail = nl[nl.length - 1]; gap = L - c.s + tail.s - tail.len - 2; }
        }
        if (c.next && c.next !== c.dir && c.next !== 'EXIT') target = Math.min(target, 5.5 + Math.max(0, (L - STOP - c.s)) * 0.4);
      }
      // the player in the road ahead
      const [px, pz] = this.lanePos(c.from, c.to, c.dir, c.s);
      const [dx, dz] = DIRS[c.dir];
      const rx = playerPos.x - px, rz = playerPos.z - pz;
      const ahead = rx * dx + rz * dz, lat = Math.abs(rx * dz - rz * dx);
      if (ahead > 0 && ahead < 9 && lat < 1.8 && playerPos.y < 2) { gap = Math.min(gap, ahead - 3); c.honk = (c.honk || 0) + dt; }
      else c.honk = 0;
      // speed control
      const brake = gap < Infinity ? Math.max(0, Math.min(target, (gap - 2.5) * 1.2)) : target;
      const want = Math.min(target, brake);
      c.speed += Math.max(-9 * dt, Math.min(3.2 * dt, want - c.speed));
      if (c.speed < 0.05 && want <= 0.1) c.speed = 0;
      // smooth turn through the intersection (quadratic Bezier between the two lanes)
      if (c.turn) {
        const T = c.turn;
        T.t = Math.min(1, T.t + c.speed * dt / T.len);
        const u = T.t, a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, q = u * u;
        const x = a * T.p0[0] + b * T.p1[0] + q * T.p2[0], z = a * T.p0[1] + b * T.p1[1] + q * T.p2[1];
        const tx = 2 * (1 - u) * (T.p1[0] - T.p0[0]) + 2 * u * (T.p2[0] - T.p1[0]), tz = 2 * (1 - u) * (T.p1[1] - T.p0[1]) + 2 * u * (T.p2[1] - T.p1[1]);
        c.h.x = x; c.h.y = CAR_Y; c.h.z = z; c.h.yaw = Math.atan2(tx, tz); c.h.pitch = 0; c.h.roll = 0;
        if (T.t >= 1) {
          c.from = c.to; c.dir = T.dir; c.to = c.from.links[T.dir]; c.s = 6; c.turn = null;
          c.next = this.chooseNext(c.to, c.dir);
        }
        continue;
      }
      c.s += c.speed * dt;
      if (c.next && c.next !== 'EXIT' && c.next !== c.dir && c.next !== BACK[c.dir] && c.s >= L - 6 && c.to.links[c.next]) {
        const p0 = this.lanePos(c.from, c.to, c.dir, L - 6), p2 = this.lanePos(c.to, c.to.links[c.next], c.next, 6);
        const p1 = (c.dir === 'N' || c.dir === 'S') ? [p0[0], p2[1]] : [p2[0], p0[1]];
        c.turn = { p0, p1, p2, t: 0, dir: c.next, len: Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) + Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) };
        continue;
      }
      // reached the end of the segment
      if (c.s >= L) {
        c.s -= L;
        const nd = c.next;
        if (nd === 'EXIT' || !nd) {
          // leave town and re-enter somewhere else
          const entries = [...this.nodes.values()].filter((n) => n.exit);
          const e = this.rng.pick(entries);
          const d = BACK[e.exit];
          c.from = e; c.dir = d; c.to = e.links[d]; c.s = 0;
          if (!c.to) { c.to = e.links[LEFT[d]] || e.links[RIGHT[d]]; c.dir = e.links[LEFT[d]] ? LEFT[d] : RIGHT[d]; }
        } else { c.from = c.to; c.dir = nd; c.to = c.from.links[nd]; }
        if (!c.to) { c.to = c.from.links[Object.keys(c.from.links).find((q) => c.from.links[q])]; c.dir = Object.keys(c.from.links).find((q) => c.from.links[q] === c.to); }
        c.next = this.chooseNext(c.to, c.dir);
      }
      // pose: interpolate a smooth turn through the intersection box near the start of the segment
      const [x, z] = this.lanePos(c.from, c.to, c.dir, c.s);
      let yaw = Math.atan2(DIRS[c.dir][0], DIRS[c.dir][1]);
      c.h.x = x; c.h.y = CAR_Y; c.h.z = z; c.h.yaw = yaw;
      c.h.pitch = 0; c.h.roll = 0;
    }
    const COL = { G: 0x40ff80, Y: 0xffc030, R: 0xff3020 };
    for (const hd of this.heads || []) {
      const ns = this.signalState(hd.n, 'N', t), ew = this.signalState(hd.n, 'E', t);
      const dd = Math.hypot(hd.n.x - playerPos.x, hd.n.z - playerPos.z) < 160;
      hd.pole.visible = dd; hd.lampNS.visible = dd; hd.lampEW.visible = dd;
      hd.lampNS.x = hd.n.x + hd.cx; hd.lampNS.y = 3.35; hd.lampNS.z = hd.n.z + hd.cz; hd.lampNS.yaw = hd.faceNS; hd.lampNS.tintA = COL[ns];
      hd.lampEW.x = hd.n.x + hd.cx; hd.lampEW.y = 3.35; hd.lampEW.z = hd.n.z + hd.cz; hd.lampEW.yaw = hd.faceEW; hd.lampEW.tintA = COL[ew];
    }
    // headlights on the nearest moving cars at night
    if (this.headlights) {
      const near = cars.filter((c) => c.active).map((c) => [Math.hypot(c.h.x - playerPos.x, c.h.z - playerPos.z), c]).sort((a, b) => a[0] - b[0]);
      this.headlights.forEach((L, i) => {
        const e = near[i];
        if (!e || night < 0.2 || e[0] > 60) { L.intensity = 0; return; }
        const c = e[1], [dx, dz] = DIRS[c.dir];
        L.x = c.h.x + dx * 5; L.y = 0.8; L.z = c.h.z + dz * 5; L.intensity = night * 0.9; L.room = 0;
      });
    }
  }
  nearestHonk() { let best = null; for (const c of this.cars) if (c.honk > 1.2 && (!best || c.honk > best.honk)) best = c; return best; }
}

// Streetcars shuttle along Lantern Avenue's two track sections, stopping at each stop.
export class Trolleys {
  constructor(props) {
    const lan = AVENUES.find((a) => a.trolley);
    this.x = lan.x;
    const zs = STREETS.map((s) => s.z);
    const gap = GAPS.find((g) => g.avenue === lan.name);
    this.lines = [
      { z0: zs[0] + 4, z1: gap.z0 - 8, stops: zs.filter((z) => z < gap.z0 - 1).map((z) => z + 12) },
      { z0: gap.z1 + 8, z1: zs[zs.length - 1] - 4, stops: zs.filter((z) => z > gap.z1 + 1).map((z) => z - 12) },
    ];
    this.cars = this.lines.map((L, i) => ({ line: L, h: props.addDynamic('streetcar', {}), phase: i * 0.37 }));
  }
  // deterministic shuttle driven by real time (seconds)
  update(t) {
    for (const c of this.cars) {
      if (c.h.dummy) continue;
      const L = c.line;
      const len = L.z1 - L.z0;
      const v = 7, dwell = 18;
      const stops = L.stops.filter((z) => z > L.z0 && z < L.z1).sort((a, b) => a - b);
      const legs = [L.z0, ...stops, L.z1];
      // one-way trip time
      let trip = 0; for (let i = 1; i < legs.length; i++) trip += (legs[i] - legs[i - 1]) / v + dwell;
      const T = (t + c.phase * trip * 2) % (trip * 2);
      const fwd = T < trip;
      let tt = fwd ? T : T - trip;
      const seq = fwd ? legs : legs.slice().reverse();
      let z = seq[0];
      for (let i = 1; i < seq.length; i++) {
        const d = Math.abs(seq[i] - seq[i - 1]) / v;
        if (tt < d) { z = seq[i - 1] + (seq[i] - seq[i - 1]) * (tt / d); break; }
        tt -= d;
        z = seq[i];
        if (tt < dwell) break;
        tt -= dwell;
      }
      c.h.x = this.x; c.h.y = 0.02; c.h.z = z; c.h.yaw = fwd ? 0 : Math.PI;
      c.moving = true;
      void len;
    }
  }
}

// Scheduled passenger trains into Union Station along the E-W main line.
export class Trains {
  constructor(props) {
    this.z = -244; this.stopX = 215;
    const cars = ['locomotive', 'coal_tender', 'passenger_car', 'passenger_car', 'passenger_car'];
    this.lens = [15, 8, 18.5, 18.5, 18.5];
    this.parts = cars.map((c) => props.addDynamic(c, { tint: '#2e4a36' }));
    // arrivals (minutes) — train sits in the station for 14 minutes then leaves east
    this.schedule = [7 * 60 + 15, 9 * 60 + 52, 12 * 60 + 40, 16 * 60 + 52, 19 * 60 + 30, 22 * 60 + 5];
  }
  update(minutes) {
    const v = 12 * 60; // metres per game minute (12 m/s)
    let x = null, facing = -1; // train arrives heading west (facing -x)
    for (const a of this.schedule) {
      const approach = 1400 / v; // minutes to come in from x=+1600
      if (minutes >= a - approach && minutes < a) { x = this.stopX + (a - minutes) * v; facing = -1; break; }
      if (minutes >= a && minutes < a + 14) { x = this.stopX; facing = -1; break; }
      if (minutes >= a + 14 && minutes < a + 14 + approach) {
        // leaves reversing east (push-pull) — simpler: the loco runs around; we just move east
        x = this.stopX + (minutes - a - 14) * v; facing = -1; break;
      }
    }
    let off = 0;
    this.parts.forEach((h, i) => {
      if (h.dummy) return;
      if (x === null) { h.visible = false; return; }
      h.visible = true;
      const L = this.lens[i];
      h.x = x + off + L / 2; h.y = 0.35; h.z = this.z; h.yaw = facing < 0 ? -Math.PI / 2 : Math.PI / 2;
      off += L + 0.6;
    });
    this.inStation = x !== null && Math.abs(x - this.stopX) < 1;
  }
}
