// Ground, roads, sidewalks, markings, street furniture and the sidewalk nav network.
import { MAT } from '../world/materials.js';
import { AVENUES, STREETS, ROAD_HALF, WALK, GRID, GAPS, SQUARE, CITYHALL, blockRect } from './layout.js';

const V = (m) => Math.round(m * 4); // metres -> voxels

export function roadSegments() {
  // returns list of {kind:'ave'|'st', name, x0,z0,x1,z1 (metres, carriageway rect), dir}
  const out = [];
  for (const a of AVENUES) {
    let z0 = GRID.z0, z1 = GRID.z1;
    const extN = a.name === 'Harbor Street' ? -300 : z0, extS = a.name === 'Harbor Street' ? 300 : z1;
    const gaps = GAPS.filter((g) => g.avenue === a.name);
    let cur = extN;
    for (const g of gaps) { out.push({ kind: 'ave', name: a.name, x0: a.x - ROAD_HALF, x1: a.x + ROAD_HALF, z0: cur, z1: g.z0 + ROAD_HALF, c: a.x, trolley: a.trolley }); cur = g.z1 - ROAD_HALF; }
    out.push({ kind: 'ave', name: a.name, x0: a.x - ROAD_HALF, x1: a.x + ROAD_HALF, z0: cur, z1: extS, c: a.x, trolley: a.trolley });
    void z1;
  }
  for (const s of STREETS) {
    const x1 = s.name === 'Grand Avenue' ? 720 : GRID.x1;
    out.push({ kind: 'st', name: s.name, x0: GRID.x0, x1, z0: s.z - ROAD_HALF, z1: s.z + ROAD_HALF, c: s.z });
  }
  return out;
}

export function intersections() {
  const out = [];
  for (const a of AVENUES) for (const s of STREETS) {
    const gap = GAPS.some((g) => g.avenue === a.name && s.z > g.z0 - 1 && s.z < g.z1 + 1);
    const inGap = GAPS.some((g) => g.avenue === a.name && s.z > g.z0 + 1 && s.z < g.z1 - 1);
    if (inGap) continue;
    const tN = gap && GAPS.some((g) => g.avenue === a.name && Math.abs(s.z - g.z1) < 1); // gap is north of this street
    const tS = gap && GAPS.some((g) => g.avenue === a.name && Math.abs(s.z - g.z0) < 1); // gap south
    out.push({ x: a.x, z: s.z, ave: a.name, st: s.name, north: !(tN) && s.z > GRID.z0 + 10 || a.name === 'Harbor Street', south: !(tS) && s.z < GRID.z1 - 10 || a.name === 'Harbor Street', west: a.x > GRID.x0 + 10, east: a.x < GRID.x1 - 10 || s.name === 'Grand Avenue' });
  }
  return out;
}

// sidewalk rings: rect of the sidewalk outer edge (curb) and inner edge (property line)
export function sidewalkRings() {
  const rings = [];
  for (let r = 0; r < STREETS.length - 1; r++) for (let c = 0; c < AVENUES.length - 1; c++) {
    const b = blockRect(c, r);
    if (r === 2 && (c === 1 || c === 2)) continue; // square + city hall handled as one ring
    rings.push({ x0: b.x0, z0: b.z0, x1: b.x1, z1: b.z1 });
  }
  rings.push({ x0: SQUARE.x0, z0: SQUARE.z0, x1: CITYHALL.x1, z1: CITYHALL.z1, square: true });
  return rings;
}

export function buildStreets(ctx) {
  const { world, rng } = ctx;
  const W = world;
  // ---- base ground over the whole town site
  W.box(V(-4), -8, V(-300), V(470), -1, V(330), MAT.dirt);
  W.box(V(-4), -1, V(-300), V(470), 0, V(330), MAT.grass);
  // ---- roads
  const segs = roadSegments();
  for (const s of segs) {
    W.box(V(s.x0), -1, V(s.z0), V(s.x1), 0, V(s.z1), MAT.asphalt);
  }
  // road wear: patches of older asphalt and tar seams
  for (const s of segs) {
    const len = s.kind === 'ave' ? s.z1 - s.z0 : s.x1 - s.x0;
    for (let i = 0; i < len / 9; i++) {
      const t = rng.float(0, len - 4), w = rng.int(4, 14), h = rng.int(3, 8), off = rng.float(-5, 5);
      if (s.kind === 'ave') W.box(V(s.c + off), -1, V(s.z0 + t), V(s.c + off) + h, 0, V(s.z0 + t) + w, MAT.asphalt_old);
      else W.box(V(s.x0 + t), -1, V(s.c + off), V(s.x0 + t) + w, 0, V(s.c + off) + h, MAT.asphalt_old);
    }
  }
  // ---- sidewalks (rings around blocks) with curbs
  const rings = sidewalkRings();
  for (const r of rings) {
    const x0 = V(r.x0 - WALK), x1 = V(r.x1 + WALK), z0 = V(r.z0 - WALK), z1 = V(r.z1 + WALK);
    W.box(x0, 0, z0, x1, 1, z1, MAT.sidewalk);
    // curbs
    W.box(x0, 0, z0, x1, 1, z0 + 1, MAT.curb); W.box(x0, 0, z1 - 1, x1, 1, z1, MAT.curb);
    W.box(x0, 0, z0, x0 + 1, 1, z1, MAT.curb); W.box(x1 - 1, 0, z0, x1, 1, z1, MAT.curb);
    // block interior default: grass lawn (generators overwrite)
    W.box(V(r.x0), 0, V(r.z0), V(r.x1), 1, V(r.z1), MAT.grass_lawn);
  }
  // outer sidewalks (east of Hillcrest, south of Orchard, north of Mill, west of Harbor St)
  const outer = [
    [GRID.x1 - WALK, GRID.z0, GRID.x1, GRID.z1],              // east side of Hillcrest Ave
    [GRID.x0, GRID.z1 - WALK, GRID.x1, GRID.z1],              // south side of Orchard St
    [GRID.x0, GRID.z0, GRID.x1, GRID.z0 + WALK],              // north side of Mill St
    [GRID.x0, -300, GRID.x0 + WALK, 300],                     // west side of Harbor St
    [GRID.x0 + 16, -300, GRID.x0 + 20, GRID.z0],              // east side of Harbor St, north extension
    [GRID.x0 + 16, GRID.z1, GRID.x0 + 20, 300],               // east side of Harbor St, south extension
    [GRID.x1, -80, 720, -76], [GRID.x1, -64, 720, -60],       // Grand Ave out of town
  ];
  for (const [a, b, c, d] of outer) {
    W.box(V(a), 0, V(b), V(c), 1, V(d), MAT.sidewalk);
    W.box(V(a), 0, V(b), V(c), 1, V(d), MAT.sidewalk);
  }
  // re-cut the roads where outer sidewalks overlapped carriageways
  for (const s of segs) W.box(V(s.x0), 0, V(s.z0), V(s.x1), 1, V(s.z1), 0);
  // ---- markings
  for (const s of segs) {
    if (s.kind === 'ave') {
      const c = V(s.c);
      if (s.trolley) {
        // single trolley track down the middle: two rails, gauge ~1.5 m, with cobble setts between
        W.box(c - 4, -1, V(s.z0), c + 4, 0, V(s.z1), MAT.cobble);
        W.box(c - 3, -1, V(s.z0), c - 2, 0, V(s.z1), MAT.rail_steel);
        W.box(c + 2, -1, V(s.z0), c + 3, 0, V(s.z1), MAT.rail_steel);
      } else {
        W.box(c - 1, -1, V(s.z0), c, 0, V(s.z1), MAT.road_yellow);
        W.box(c + 1, -1, V(s.z0), c + 2, 0, V(s.z1), MAT.road_yellow);
      }
    } else {
      const c = V(s.c);
      W.box(V(s.x0), -1, c - 1, V(s.x1), 0, c, MAT.road_yellow);
      W.box(V(s.x0), -1, c + 1, V(s.x1), 0, c + 2, MAT.road_yellow);
    }
  }
  const ints = intersections();
  for (const it of ints) {
    const X = V(it.x), Z = V(it.z), H = V(ROAD_HALF);
    // clear centre lines inside the intersection box
    W.box(X - H, -1, Z - H, X + H, 0, Z + H, MAT.asphalt);
    const zebra = (x0, z0, x1, z1, alongX) => {
      if (alongX) { for (let x = x0 + 1; x < x1 - 1; x += 4) W.box(x, -1, z0, x + 2, 0, z1, MAT.road_white); }
      else { for (let z = z0 + 1; z < z1 - 1; z += 4) W.box(x0, -1, z, x1, 0, z + 2, MAT.road_white); }
    };
    // crossings over the avenue (north & south of the intersection) and over the street (west & east)
    if (it.north) { zebra(X - H, Z - H - 14, X + H, Z - H - 2, true); W.box(X, -1, Z - H - 16, X + H, 0, Z - H - 15, MAT.road_white); }
    if (it.south) { zebra(X - H, Z + H + 2, X + H, Z + H + 14, true); W.box(X - H, -1, Z + H + 15, X, 0, Z + H + 16, MAT.road_white); }
    if (it.west) { zebra(X - H - 14, Z - H, X - H - 2, Z + H, false); W.box(X - H - 16, -1, Z, X - H - 15, 0, Z + H, MAT.road_white); }
    if (it.east) { zebra(X + H + 2, Z - H, X + H + 14, Z + H, false); W.box(X + H + 15, -1, Z - H, X + H + 16, 0, Z, MAT.road_white); }
    // keep the trolley track through the intersection
    const trolley = AVENUES.find((a) => a.name === it.ave && a.trolley);
    if (trolley) { W.box(X - 3, -1, Z - H - 16, X - 2, 0, Z + H + 16, MAT.rail_steel); W.box(X + 2, -1, Z - H - 16, X + 3, 0, Z + H + 16, MAT.rail_steel); }
    // manhole covers
    W.box(X + 6, -1, Z - 9, X + 9, 0, Z - 6, MAT.iron);
  }
  // storm drains at curbs, manholes along streets
  for (const s of segs) {
    const len = s.kind === 'ave' ? s.z1 - s.z0 : s.x1 - s.x0;
    for (let t = 20; t < len - 10; t += 35) {
      if (s.kind === 'ave') {
        W.box(V(s.x0), -1, V(s.z0 + t), V(s.x0) + 2, 0, V(s.z0 + t) + 4, MAT.iron);
        W.box(V(s.x1) - 2, -1, V(s.z0 + t + 12), V(s.x1), 0, V(s.z0 + t + 12) + 4, MAT.iron);
        if (!s.trolley && (t % 70) < 35) W.box(V(s.c) + 5, -1, V(s.z0 + t + 20), V(s.c) + 8, 0, V(s.z0 + t + 20) + 3, MAT.iron);
      } else {
        W.box(V(s.x0 + t), -1, V(s.z0), V(s.x0 + t) + 4, 0, V(s.z0) + 2, MAT.iron);
        W.box(V(s.x0 + t + 12), -1, V(s.z1) - 2, V(s.x0 + t + 12) + 4, 0, V(s.z1), MAT.iron);
      }
    }
  }
  buildSidewalkNav(ctx, rings, ints);
  placeStreetFurniture(ctx, rings, ints);
  return { segs, ints, rings };
}

// ---------------------------------------------------------------- sidewalk nav graph
function buildSidewalkNav(ctx, rings, ints) {
  const nav = ctx.nav;
  const corner = new Map(); // "x,z" -> node
  const key = (x, z) => Math.round(x) + ',' + Math.round(z);
  const y = 0.25;
  ctx.sidewalkNodes = [];
  const addLine = (pts, closed) => {
    const nodes = [];
    for (let i = 0; i < pts.length - (closed ? 0 : 1); i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const n = Math.max(1, Math.round(L / 7));
      for (let k = 0; k < n; k++) {
        const t = k / n;
        const x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t;
        let id;
        if (k === 0) {
          const kk = key(x, z);
          id = corner.get(kk);
          if (id === undefined) { id = nav.node(x, y, z, { kind: 'walk', room: 0 }); corner.set(kk, id); }
        } else id = nav.node(x, y, z, { kind: 'walk', room: 0 });
        nodes.push(id); ctx.sidewalkNodes.push(id);
      }
    }
    if (!closed) { const b = pts[pts.length - 1]; const kk = key(b[0], b[1]); let id = corner.get(kk); if (id === undefined) { id = nav.node(b[0], y, b[1], { kind: 'walk', room: 0 }); corner.set(kk, id); } nodes.push(id); ctx.sidewalkNodes.push(id); }
    for (let i = 0; i < nodes.length - 1; i++) nav.link(nodes[i], nodes[i + 1]);
    if (closed) nav.link(nodes[nodes.length - 1], nodes[0]);
    return nodes;
  };
  for (const r of rings) {
    const o = 2;
    addLine([[r.x0 - o, r.z0 - o], [r.x1 + o, r.z0 - o], [r.x1 + o, r.z1 + o], [r.x0 - o, r.z1 + o]], true);
  }
  // outer sidewalks as lines
  addLine([[GRID.x1 - 2, GRID.z0 + 2], [GRID.x1 - 2, GRID.z1 - 2]], false);
  addLine([[GRID.x0 + 2, GRID.z1 - 2], [GRID.x1 - 2, GRID.z1 - 2]], false);
  addLine([[GRID.x0 + 2, GRID.z0 + 2], [GRID.x1 - 2, GRID.z0 + 2]], false);
  addLine([[GRID.x0 + 2, -290], [GRID.x0 + 2, 290]], false);
  addLine([[GRID.x0 + 18, -290], [GRID.x0 + 18, GRID.z0 + 2]], false);
  addLine([[GRID.x0 + 18, GRID.z1 - 2], [GRID.x0 + 18, 290]], false);
  addLine([[GRID.x1 - 2, -78], [520, -78]], false);
  addLine([[GRID.x1 - 2, -62], [520, -62]], false);
  // weld nodes of different lines that touch
  for (const id of ctx.sidewalkNodes) {
    const [x, , z] = nav.pos(id);
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      const a = nav.grid.get((Math.floor(x / 8) + dx) + ',' + (Math.floor(z / 8) + dz));
      if (!a) continue;
      for (const o of a) if (o !== id && nav.info[o].kind === 'walk' && Math.hypot(nav.x[o] - x, nav.z[o] - z) < 2.2) nav.link(id, o);
    }
  }
  // crosswalk links between corner nodes
  const near = (x, z) => nav.nearest(x, y, z, (id, inf) => inf.kind === 'walk', 3.5);
  for (const it of ints) {
    const c = [[it.x - 8, it.z - 8], [it.x + 8, it.z - 8], [it.x + 8, it.z + 8], [it.x - 8, it.z + 8]].map(([x, z]) => near(x, z));
    const L = (a, b) => { if (a >= 0 && b >= 0) nav.link(a, b); };
    if (it.north) L(c[0], c[1]);
    if (it.south) L(c[3], c[2]);
    if (it.west) L(c[0], c[3]);
    if (it.east) L(c[1], c[2]);
  }
  ctx.crossings = ints;
}

export function linkToSidewalk(ctx, node, maxR = 26) {
  const nav = ctx.nav;
  const [x, y, z] = nav.pos(node);
  const s = nav.nearest(x, y, z, (id, inf) => inf.kind === 'walk' || inf.kind === 'path', maxR);
  if (s >= 0) nav.link(node, s);
  return s;
}

// ---------------------------------------------------------------- street furniture
function placeStreetFurniture(ctx, rings, ints) {
  const { props, rng } = ctx;
  const Y = 0.25;
  const downtown = (x, z) => x > 100 && x < 320 && z > -230 && z < 70;
  const residential = (x, z) => z > 70 || x > 300;
  for (const r of rings) {
    const sides = [
      { a: [r.x0 - WALK, r.z0 - WALK + 0.7], b: [r.x1 + WALK, r.z0 - WALK + 0.7], yaw: Math.PI, n: [0, -1] },
      { a: [r.x0 - WALK, r.z1 + WALK - 0.7], b: [r.x1 + WALK, r.z1 + WALK - 0.7], yaw: 0, n: [0, 1] },
      { a: [r.x0 - WALK + 0.7, r.z0 - WALK], b: [r.x0 - WALK + 0.7, r.z1 + WALK], yaw: -Math.PI / 2, n: [-1, 0] },
      { a: [r.x1 + WALK - 0.7, r.z0 - WALK], b: [r.x1 + WALK - 0.7, r.z1 + WALK], yaw: Math.PI / 2, n: [1, 0] },
    ];
    for (const s of sides) {
      const L = Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]);
      const dx = (s.b[0] - s.a[0]) / L, dz = (s.b[1] - s.a[1]) / L;
      // lamps
      const nl = Math.max(2, Math.round(L / 20));
      for (let i = 0; i <= nl; i++) {
        const t = 6 + (L - 12) * (i / nl);
        const x = s.a[0] + dx * t, z = s.a[1] + dz * t;
        const dt = downtown(x, z);
        props.add(dt ? 'street_lamp_double' : 'street_lamp', x, Y, z, s.yaw, {});
        // trees between lamps (not downtown's busiest blocks, and not at corners)
        if (i < nl && (residential(x, z) || rng.chance(0.35)) && !r.square) {
          const tt = t + (L - 12) / nl / 2, tx = s.a[0] + dx * tt + s.n[0] * 0.3, tz = s.a[1] + dz * tt + s.n[1] * 0.3;
          ctx.world.box(Math.round(tx * 4) - 3, 0, Math.round(tz * 4) - 3, Math.round(tx * 4) + 3, 1, Math.round(tz * 4) + 3, MAT.leaf_litter);
          ctx.world.box(Math.round(tx * 4) - 3, 0, Math.round(tz * 4) - 3, Math.round(tx * 4) + 3, 1, Math.round(tz * 4) - 2, MAT.curb);
          props.add(rng.pick(['tree_maple_red', 'tree_maple_orange', 'tree_elm_yellow', 'tree_maple_red', 'tree_oak']), tx, Y, tz, rng.float(0, 6.28), { cat: 'far', scale: rng.float(0.8, 1.05) });
        }
        // parking meters downtown
        if (dt && i < nl && rng.chance(0.7)) for (let k = 1; k < 3; k++) { const tt = t + k * 6; if (tt < L - 6) props.add('parking_meter', s.a[0] + dx * tt, Y, s.a[1] + dz * tt, s.yaw, {}); }
      }
      // hydrant near one end, trash basket & mailbox at corners
      props.add('fire_hydrant', s.a[0] + dx * 9 - s.n[0] * 0.1, Y, s.a[1] + dz * 9 - s.n[1] * 0.1, s.yaw, {});
      if (downtown(s.a[0], s.a[1]) || rng.chance(0.3)) props.add('trash_basket', s.b[0] - dx * 5, Y, s.b[1] - dz * 5, s.yaw, {});
      if (rng.chance(0.25)) props.add('mailbox_usps', s.b[0] - dx * 7, Y, s.b[1] - dz * 7, s.yaw + Math.PI / 2, {});
      if (downtown(s.a[0], s.a[1]) && rng.chance(0.35)) props.add('newspaper_box', s.a[0] + dx * 14, Y, s.a[1] + dz * 14, s.yaw, {});
      if (rng.chance(0.12)) props.add('fire_alarm_box', s.a[0] + dx * 11, Y, s.a[1] + dz * 11, s.yaw, {});
    }
  }
  // street name signs at intersections
  for (const it of ints) {
    if (ctx.streetSignType) props.add(ctx.streetSignType(short(it.st), short(it.ave)), it.x - 9.3, Y, it.z - 9.3, Math.PI / 4, {});
    if (it.x > 100 && it.x < 320 && it.z > -150 && it.z < 80 && !(it.ave === 'Harbor Street')) {
      // traffic signals on two corners (they're animated by the traffic system)
      ctx.signals = ctx.signals || [];
      ctx.signals.push({ x: it.x, z: it.z });
    }
  }
}

function short(n) { return n.replace('Street', 'St').replace('Avenue', 'Ave').toUpperCase(); }
