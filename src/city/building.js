// Building authoring API. Wraps a Frame (local voxel coordinates, front wall at z=0
// facing the street, x to the right as seen from the street, y up from the ground
// floor slab) and registers rooms, doors, stairs, entrances, activity spots, jobs,
// homes, plaques and props with the city context.
import { Frame } from '../world/frame.js';
import { VS } from '../core/config.js';

let BID = 0;

export class Building {
  // lot: { x, z (world voxel min corner), w (frontage), d (depth), facing: 'N'|'E'|'S'|'W', y (ground voxel y, default 1) }
  constructor(ctx, o) {
    this.ctx = ctx;
    this.id = BID++;
    this.name = o.name || 'Building';
    this.kind = o.kind || 'building';
    this.address = o.address || '';
    this.lot = o.lot;
    this.lore = o.lore || null;          // short history string shown in the almanac / on entering
    this.established = o.established || null;
    this.hours = o.hours || null;        // [open, close] minutes, for shops
    this.rooms = [];
    this.roomNode = new Map();           // roomId -> nav node
    this.entrances = [];                 // {node, outside:[x,y,z]}
    this.spots = [];
    this.jobs = [];
    this.homes = [];
    this.tags = new Set(o.tags || []);
    this.frame = new Frame(ctx, o.lot.x, o.lot.y ?? 1, o.lot.z, o.lot.facing, o.lot.w, o.lot.d, { building: this });
    this.f = this.frame;
    ctx.buildings.push(this);
  }

  // world metres of a local point
  m(x, y, z) { return this.f.m(x, y, z); }

  // ---------------------------------------------------------------- rooms & navigation
  // Room box in local voxels: (x, y, z) = min corner of the AIR space (y = floor top), size sx, sy, sz.
  // o: { kind, lightMode ('auto'|'always'|'never'|'day'), lightColor [r,g,b], lightPower, ambient (sky leak 0..1), nav:[x,z] }
  room(name, x, y, z, sx, sy, sz, o = {}) {
    const id = this.f.room(x, y, z, sx, sy, sz, { name, kind: o.kind || 'room', lightMode: o.lightMode, lightColor: o.lightColor, lightPower: o.lightPower, ambient: o.ambient, building: this });
    const r = this.ctx.world.rooms[id];
    r.local = { x, y, z, sx, sy, sz };
    r.public = o.public ?? (this.kind !== 'house' && this.kind !== 'apartment');
    const nx = o.nav ? o.nav[0] : x + sx / 2, nz = o.nav ? o.nav[1] : z + sz / 2;
    const p = this.m(nx, y, nz);
    const node = this.ctx.nav.node(p[0], p[1], p[2], { room: id, building: this.id, kind: 'room' });
    this.roomNode.set(id, node);
    r.nav = node;
    return id;
  }
  roomCenter(id) { return this.roomNode.get(id); }
  // room of this building containing a world-metre point (works before the world is finalized)
  roomAtPoint(x, y, z) {
    const vx = Math.floor(x / VS), vy = Math.floor(y / VS), vz = Math.floor(z / VS);
    for (let i = this.rooms.length - 1; i >= 0; i--) {
      const r = this.ctx.world.rooms[this.rooms[i]], bx = r.box;
      if (vx >= bx[0] && vy >= bx[1] && vz >= bx[2] && vx < bx[3] && vy < bx[4] && vz < bx[5]) return r.id;
    }
    return 0;
  }
  // Extra walkable waypoint inside a room (linked to the room centre and optionally to other nodes).
  navPoint(room, x, y, z, links = []) {
    const p = this.m(x, y, z);
    const n = this.ctx.nav.node(p[0], p[1], p[2], { room, building: this.id, kind: 'point' });
    if (room && this.roomNode.has(room)) this.ctx.nav.link(n, this.roomNode.get(room));
    for (const l of links) this.ctx.nav.link(n, l);
    return n;
  }
  // Doorway between two rooms at local (x, y, z) (centre of the opening, y = floor). leaf: door prop type or false.
  door(roomA, roomB, x, y, z, o = {}) {
    const p = this.m(x, y, z);
    const n = this.ctx.nav.node(p[0], p[1], p[2], { building: this.id, kind: 'door' });
    if (roomA && this.roomNode.has(roomA)) this.ctx.nav.link(n, this.roomNode.get(roomA));
    if (roomB && this.roomNode.has(roomB)) this.ctx.nav.link(n, this.roomNode.get(roomB));
    if (o.leaf !== false && this.ctx.doors) this._leaf(x, y, z, o);
    return n;
  }
  // door leaf. axis: 'x' = door in a wall that runs along x (you walk through along z). width in voxels.
  _leaf(x, y, z, o) {
    const axis = o.axis || 'x', w = o.width || 4;
    // hinge on one side of the opening
    const hx = axis === 'x' ? x - w / 2 : x, hz = axis === 'x' ? z : z - w / 2;
    const p = this.m(hx, y, hz);
    const d = axis === 'x' ? this.f.dir(1, 0) : this.f.dir(0, 1);
    const closedYaw = Math.atan2(-d[1], d[0]);
    this.ctx.doors.add({ x: p[0], y: p[1], z: p[2], yaw: closedYaw, width: w * VS, type: o.leaf || 'door_wood', tint: o.tint, swing: o.swing ?? 1 });
  }
  // Front/back entrance: door at local (x, y, z) on the facade (z = wall layer); the street side node is placed out front.
  entrance(room, x, y, z, o = {}) {
    const inner = this.door(room, null, x, y, z + (o.inside ?? 2), { leaf: false });
    const dn = this.door(null, null, x, y, z, { leaf: o.leaf ?? 'door_wood', axis: o.axis || 'x', width: o.width || 4, tint: o.tint });
    this.ctx.nav.link(inner, dn);
    const out = this.m(o.outX ?? x, o.outY ?? y, o.outZ ?? (z - 5));
    const on = this.ctx.nav.node(out[0], out[1], out[2], { building: this.id, kind: 'outside' });
    this.ctx.nav.link(dn, on);
    this.entrances.push({ node: on, door: dn, pos: out, main: o.main ?? (this.entrances.length === 0) });
    if (!this.mainEntrance || o.main) this.mainEntrance = on;
    return on;
  }
  // Stair connection between two rooms (bottom/top positions local).
  stairs(roomA, bottom, roomB, top) {
    const a = this.navPoint(roomA, bottom[0], bottom[1], bottom[2]);
    const b = this.navPoint(roomB, top[0], top[1], top[2]);
    this.ctx.nav.link(a, b);
    return [a, b];
  }

  // ---------------------------------------------------------------- activity spots
  // pose: 'stand' | 'sit' | 'sleep' | 'kneel' | 'lie'. (x, y, z) local continuous voxel coords of the feet (y = floor).
  // rot: local quarter turns the person faces (0 = toward the street / local -z, 1 = +x, 2 = +z, 3 = -x).
  // o: { room, act, tags:[], seat: height m, group, held, lines:[], label, public }
  spot(pose, x, y, z, rot, o = {}) {
    const p = this.m(x, y, z);
    const room = o.room ?? this.roomAtPoint(p[0], p[1] + 0.3, p[2]);
    const s = this.ctx.spots.add({
      x: p[0], y: p[1], z: p[2], yaw: this.f.yaw(rot), pose, room, building: this, act: o.act || (pose === 'sit' ? 'sit' : pose === 'sleep' ? 'sleep' : 'stand'),
      tags: o.tags || [], seat: o.seat ?? (pose === 'sit' ? 0.45 : pose === 'sleep' ? 0.55 : 0), group: o.group ?? null, held: o.held ?? null, lines: o.lines || null, label: o.label || null,
      public: o.public ?? (this.kind !== 'house' && this.kind !== 'apartment'),
    });
    const node = this.ctx.nav.node(p[0], p[1], p[2], { room, building: this.id, kind: 'spot', spot: s.id });
    s.node = node;
    const rn = this.roomNode.get(room);
    if (rn !== undefined) this.ctx.nav.link(node, rn);
    else s.pendingLink = true;
    this.spots.push(s);
    return s;
  }
  // convenience: chair prop + seat spot
  seat(chairType, x, y, z, rot, o = {}) {
    if (chairType) this.f.prop(chairType, x, y, z, rot, o.propOpts || {});
    return this.spot('sit', x, y, z, rot, o);
  }
  // Workplace role. spot: a spot (or array of spots to wander between). shift: ['9:00','17:30'].
  job(role, spot, o = {}) {
    const j = { role, title: o.title || role, spots: Array.isArray(spot) ? spot : [spot], shift: o.shift || ['9:00', '17:00'], act: o.act || null, outfit: o.outfit || null, building: this, sex: o.sex || null, ageRange: o.age || null, person: null, days: o.days || null, name: o.name || null };
    this.jobs.push(j);
    this.ctx.jobs.push(j);
    return j;
  }
  // Household. o: { family (surname), beds:[spots], dine:[spots], lounge:[spots], kitchen:[spots], bath:[spots], yard:[spots], desk:[spots], porch:[spots], size }
  home(o) {
    const h = { building: this, ...o, members: [] };
    this.homes.push(h);
    this.ctx.homes.push(h);
    return h;
  }

  // ---------------------------------------------------------------- props, lights, lore
  prop(type, x, y, z, rot = 0, o = {}) { return this.f.prop(type, x, y, z, rot, o); }
  light(x, y, z, o = {}) { return this.f.light(x, y, z, o); }
  // Readable plaque / notice / framed article. text: { title, body, kind: 'plaque'|'notice'|'letter'|'photo' }
  readable(x, y, z, text, o = {}) {
    const p = this.m(x, y, z);
    this.ctx.interactables.push({ kind: 'read', x: p[0], y: p[1], z: p[2], r: o.r || 1.6, prompt: o.prompt || `Read “${text.title}”`, text, building: this, clue: o.clue || null });
  }
  // Elevator: stops = [{ y (local floor y), room, label }] at shaft position (x, z) (local, cab centre).
  // The player presses E in the cab to ride to the next floor; people use it as a vertical nav link.
  elevator(x, z, stops, o = {}) {
    const nodes = stops.map((st) => this.navPoint(st.room, x, st.y, z));
    for (let i = 0; i < nodes.length - 1; i++) this.ctx.nav.link(nodes[i], nodes[i + 1], 6);
    const pts = stops.map((st) => this.m(x, st.y, z));
    stops.forEach((st, i) => {
      const p = pts[i];
      this.ctx.interactables.push({
        kind: 'elevator', x: p[0], y: p[1] + 1, z: p[2], r: o.r || 1.4, prompt: `Ride the elevator (${st.label || 'floor ' + (i + 1)} → ${stops[(i + 1) % stops.length].label || 'floor ' + (((i + 1) % stops.length) + 1)})`,
        action: (game) => {
          const j = (i + 1) % stops.length, q = pts[j];
          game.fadeTeleport(q[0], q[1] + 0.05, q[2], game.player.yaw, `${this.name} — ${stops[j].label || 'floor ' + (j + 1)}`);
        },
      });
    });
    return nodes;
  }
  // Something you can sit on as the player
  playerSeat(x, y, z, rot, h = 0.45) {
    const p = this.m(x, y, z);
    this.ctx.interactables.push({ kind: 'sit', x: p[0], y: p[1] + h, z: p[2], r: 1.2, prompt: 'Sit down', yaw: this.f.yaw(rot) + Math.PI, seatY: p[1], standAt: p });
  }
}

export function yawFromRot(frame, rot) { return frame.yaw(rot); }
