// The Spotter's Diary: a model-village "things to spot" list. Each item names something you can
// find somewhere in Juniper Bay (a prop, a person doing something, a building, a happening at a
// certain hour). Looking at it properly for a moment (in view, near enough, not behind a wall)
// ticks it off. Items whose thing doesn't exist in this build of the town are left off the list.
import { hash3 } from '../core/rng.js';
import { activity } from './activities.js';

const S = (types) => ({ props: types });

// what: shown in the diary. hint: pencilled underneath ({near} = the nearest building to it).
// find: { props:[type or /regex/], dyn:[type…] (moving props), person:(p, S, e) => bool,
//         building:/regex/, point:{x,y,z,r}, label:/regex/ }, when:(m, night) => bool, range (m)
export const HUNT = [
  // ---------------------------------------------------------------- around town
  { id: 'barber_pole', cat: 'Around town', what: "A barber's pole, striped red and white", hint: 'Market Street — near {near}', find: S(['barber_pole']) },
  { id: 'street_clock', cat: 'Around town', what: 'The big street clock on its iron post', hint: 'Outside a jeweller who likes to be punctual', find: S(['street_clock']) },
  { id: 'phone_booth', cat: 'Around town', what: 'A telephone booth', hint: 'Try downtown, near {near}', find: S(['phone_booth']) },
  { id: 'gumball', cat: 'Around town', what: 'A gumball machine (a penny a go)', hint: 'Somewhere sweet — {near}', find: S(['gumball_machine']), range: 12 },
  { id: 'vault', cat: 'Around town', what: "A bank vault's great round door", hint: 'Where the money sleeps — {near}', find: S(['bank_vault_door']), range: 16 },
  { id: 'presses', cat: 'Around town', what: 'The Courier\'s printing presses', hint: '{near}, Mill Street', find: S(['printing_press']), range: 18 },
  { id: 'jukebox', cat: 'Around town', what: 'A jukebox', hint: 'Where the teenagers go for a malted', find: S(['jukebox']), range: 12 },
  { id: 'pinball', cat: 'Around town', what: 'A pinball machine', hint: 'Somewhere a little disreputable — {near}', find: S(['pinball_machine']), range: 12 },
  { id: 'departures', cat: 'Around town', what: 'The departures board at Union Station', hint: 'Top of Lantern Avenue', find: S(['departure_board']), range: 22 },
  { id: 'pumper', cat: 'Around town', what: '"Old Faithful", the 1890s steam pumper', hint: 'Engine Company No. 1 — peek into the bays', find: S(['steam_pumper']), range: 18 },
  { id: 'jail', cat: 'Around town', what: 'A jail cell (empty, for now)', hint: 'Police Headquarters, Harbor Street', find: S(['jail_cot']), range: 12 },
  { id: 'wanted', cat: 'Around town', what: 'A WANTED poster', hint: 'Where the desk sergeant sits', find: S(['wanted_board']), range: 10 },
  { id: 'organ', cat: 'Around town', what: 'Church organ pipes', hint: 'Look up, in a church', find: S(['organ_pipes']), range: 30 },
  { id: 'font', cat: 'Around town', what: 'A baptismal font', hint: 'Just inside a church door', find: S(['baptismal_font']), range: 12 },
  { id: 'capsule', cat: 'Around town', what: 'The Centennial time capsule', hint: 'On the City Hall steps — to be opened in 2053', find: S(['time_capsule']), range: 20 },
  { id: 'poster', cat: 'Around town', what: 'A poster for "Shane"', hint: 'Showing tonight — {near}', find: S(['movie_poster']), range: 14 },
  { id: 'bowling', cat: 'Around town', what: 'Ten pins, all standing', hint: '{near}, Maple Street', find: S(['bowling_pins']), range: 22 },
  { id: 'motorcycle', cat: 'Around town', what: 'A motorcycle', hint: 'Parked near {near}', find: S(['motorcycle']), range: 18 },
  { id: 'squirrel', cat: 'Around town', what: 'A squirrel', hint: 'Juniper Park — mind the oaks', find: { props: ['squirrel'], dyn: [/squirrel/] }, range: 16 },
  { id: 'grave', cat: 'Around town', what: 'The grave of Capt. Elias Whitcomb, who founded the town', hint: 'The Old Burying Ground, up by the railway', find: S([/^hb_grave:elias$/]), range: 12 },
  { id: 'hotel_desk', cat: 'Around town', what: 'The front desk of the Whitcomb Hotel (ring the bell!)', hint: 'Mill Street', find: S(['hotel_desk']), range: 12 },
  { id: 'onair', cat: 'Around town', what: 'An ON AIR sign', hint: 'Station WJBY broadcasts from somewhere downtown', find: S(['on_air_sign']), range: 16 },
  // ---------------------------------------------------------------- down by the water
  { id: 'memorial', cat: 'Down by the water', what: 'The MARY ELLEN memorial — eleven names', hint: 'On the quay, facing the harbour', find: S(['hb_mary_ellen_plaque']), range: 14 },
  { id: 'highwater', cat: 'Down by the water', what: 'The 1938 hurricane high-water mark', hint: 'Harbor Street remembers how high the sea came', find: S([/HIGH WATER/]), range: 14 },
  { id: 'lighthouse', cat: 'Down by the water', what: 'Whitcomb Point Light', hint: 'South, past the beach, at the end of the causeway', find: { building: /Whitcomb Point Light/ }, range: 260 },
  { id: 'freighter', cat: 'Down by the water', what: 'The freighter S.S. Gray Lady, unloading newsprint', hint: 'Tied up at Pier 2', find: { building: /Gray Lady/ }, range: 200 },
  { id: 'figurehead', cat: 'Down by the water', what: "A ship's figurehead", hint: 'The Maritime Museum (the Old Custom House)', find: S(['figurehead']), range: 14 },
  { id: 'helmet', cat: 'Down by the water', what: 'A brass diving helmet', hint: 'The Maritime Museum', find: S(['diving_helmet']), range: 10 },
  { id: 'lobster_trap', cat: 'Down by the water', what: 'A lobster trap', hint: 'Along the quay', find: S(['lobster_trap', 'lobster_trap_stack']), range: 14 },
  { id: 'tug', cat: 'Down by the water', what: 'A tugboat', hint: 'Out in the harbour', find: { props: ['tugboat'], dyn: ['tugboat'] }, range: 160 },
  { id: 'playland', cat: 'Down by the water', what: 'The Ferris wheel at Playland', hint: 'The pier by Juniper Beach', find: { building: /Playland/ }, range: 220 },
  { id: 'ice', cat: 'Down by the water', what: 'Blocks of ice', hint: 'Somebody keeps the fish cold', find: S(['hb_ice_blocks']), range: 14 },
  // ---------------------------------------------------------------- townsfolk
  { id: 'doze', cat: 'Townsfolk', what: 'Somebody nodding off in a chair', hint: 'Grandpas, mostly, after lunch', find: { person: (p, s) => s.act === 'doze' }, range: 18 },
  { id: 'under_car', cat: 'Townsfolk', what: 'A pair of legs sticking out from under a car', hint: 'Garages and driveways', find: { person: (p, s) => s.act === 'under_car' }, range: 18 },
  { id: 'fishing', cat: 'Townsfolk', what: 'Somebody fishing', hint: 'The piers', find: { person: (p, s) => s.act === 'fish' || s.act === 'fish_sit' }, range: 25 },
  { id: 'knit', cat: 'Townsfolk', what: 'Somebody knitting', hint: 'Porches and parlours', find: { person: (p, s) => s.act === 'knit' }, range: 14 },
  { id: 'swing', cat: 'Townsfolk', what: 'A child on a swing', hint: 'Parks and back yards', find: { person: (p, s) => s.act === 'swing' }, range: 25 },
  { id: 'chess', cat: 'Townsfolk', what: 'A game of chess or checkers', hint: 'Old men in the park, firemen at the station', find: { person: (p, s) => s.act === 'chess' }, range: 16 },
  { id: 'newspaper', cat: 'Townsfolk', what: 'Somebody reading the paper', hint: 'Anywhere with a bench or an armchair', find: { person: (p, s) => s.act === 'read' || s.act === 'read_stand' }, range: 16 },
  { id: 'police', cat: 'Townsfolk', what: 'A policeman', hint: 'On the beat, or at Headquarters', find: { person: (p) => p.look.hat === 'hat_police' }, range: 25 },
  { id: 'nurse', cat: 'Townsfolk', what: 'A nurse in her white cap', hint: "St. Luke's Hospital", find: { person: (p) => p.look.hat === 'hat_nurse' }, range: 18 },
  { id: 'sailor', cat: 'Townsfolk', what: 'A sailor', hint: 'On leave for Harbor Days', find: { person: (p) => p.look.hat === 'hat_sailor' }, range: 22 },
  { id: 'top_hat', cat: 'Townsfolk', what: 'A gentleman in a top hat', hint: 'There is only one in town', find: { person: (p) => p.look.hat === 'hat_top' }, range: 20 },
  { id: 'bellhop', cat: 'Townsfolk', what: 'A bellhop in his little round cap', hint: 'The Whitcomb Hotel', find: { person: (p) => p.look.hat === 'hat_bellhop' }, range: 18 },
  { id: 'chef', cat: 'Townsfolk', what: "A cook in a chef's hat", hint: 'Kitchens: the diner, the hotel, the parish hall', find: { person: (p) => p.look.hat === 'hat_chef' }, range: 16 },
  { id: 'balloon', cat: 'Townsfolk', what: 'A child holding a balloon', hint: 'Balloons come from the fair', find: { person: (p, s, e) => heldBy(p, s, e) === 'balloon' }, range: 22 },
  { id: 'icecream', cat: 'Townsfolk', what: 'Somebody eating an ice-cream cone', hint: 'Hot afternoon, cold cone', find: { person: (p, s, e) => heldBy(p, s, e) === 'ice_cream_cone' }, range: 16 },
  { id: 'painter', cat: 'Townsfolk', what: 'Somebody painting — a picture or a house', hint: 'Easels by the water, ladders by the houses', find: { person: (p, s) => s.act === 'paint' }, range: 20 },
  { id: 'dance', cat: 'Townsfolk', what: 'People dancing', hint: 'Evening, in the square or the school gym', find: { person: (p, s) => s.act === 'dance' || s.act === 'dance_jitterbug' }, range: 28 },
  // ---------------------------------------------------------------- only at certain times
  { id: 'fleet', cat: 'Only at certain times', what: 'The fishing fleet unloading the catch', hint: 'Early! Castellano Fish Co., 6 to 8:30', find: { person: (p, s, e) => e && e.event === 'fleet' }, range: 30 },
  { id: 'cat', cat: 'Only at certain times', what: 'Admiral the cat up the maple — and the firemen', hint: 'Church Street, about eleven', find: { person: (p, s, e) => e && e.event === 'cat' }, range: 30 },
  { id: 'bride', cat: 'Only at certain times', what: 'The bride and groom', hint: "St. Brigid's, two o'clock", find: { person: (p, s, e) => e && e.event === 'wedding' && s.spot && s.spot.tags.includes('altar_couple') }, range: 30 },
  { id: 'candles', cat: 'Only at certain times', what: 'Susie Moreau\'s birthday cake', hint: '14 Maple Street, afternoon', find: { person: (p, s, e) => e && e.event === 'birthday' }, range: 20 },
  { id: 'band', cat: 'Only at certain times', what: 'The Harbor Days band playing', hint: 'Founders Square, 1 to 5:20', find: { person: (p, s, e) => e && e.event === 'fair' && ['trumpet', 'trombone', 'tuba', 'clarinet', 'drum'].includes(s.act) }, range: 40 },
  { id: 'choir', cat: 'Only at certain times', what: 'The choir at practice', hint: 'First Congregational, 4 to 5:30', find: { person: (p, s, e) => e && e.event === 'choir' }, range: 30 },
  { id: 'speech', cat: 'Only at certain times', what: 'The Mayor making his speech', hint: 'City Hall steps, half past five', find: { person: (p, s) => s.act === 'speech' || (s.spot && s.spot.tags.includes('podium')) }, range: 45 },
  { id: 'tv', cat: 'Only at certain times', what: 'A family eating supper in front of the television', hint: 'The Hallorans, Church Street, six o\'clock', find: { person: (p, s, e) => e && e.event === 'tvdinner' }, range: 20 },
  { id: 'babies', cat: 'Only at certain times', what: 'A brand-new baby behind the nursery glass', hint: "St. Luke's — somebody's having one today", find: S(['bassinet', 'incubator']), range: 12 },
  { id: 'train', cat: 'Only at certain times', what: 'The steam train standing in the station', hint: 'Trains at 7:15, 9:52, 12:40, 4:52, 7:30 and 10:05', find: { dyn: ['locomotive'] }, range: 90 },
  { id: 'trolley', cat: 'Only at certain times', what: 'The Lantern Avenue trolley', hint: 'Listen for the bell', find: { dyn: ['streetcar'] }, range: 60 },
  { id: 'jazz', cat: 'Only at certain times', what: 'The quartet playing at the Blue Lantern', hint: 'Late — after nine', find: { person: (p, s, e) => e && e.event === 'bluelantern' && s.spot && s.spot.tags.includes('club_band') }, range: 22 },
  { id: 'fireworks', cat: 'Only at certain times', what: 'Fireworks over the harbour', hint: 'Nine o\'clock tonight — face the water', find: { point: { x: -120, y: 70, z: 10, r: 90 } }, when: (m) => m >= 1260 && m < 1285, range: 600 },
  { id: 'beam', cat: 'Only at certain times', what: 'The lighthouse beam sweeping the dark', hint: 'Once it\'s properly dark', find: { building: /Whitcomb Point Light/ }, when: (m, night) => night > 0.7, range: 400 },
];

function heldBy(p, s, e) { return (e && e.held) || activity(s.act).held || p.carry || null; }

export class Hunt {
  constructor(game) {
    this.g = game;
    const ctx = game.ctx;
    this.items = [];
    this.spotted = new Map(); // id -> minutes
    this.gaze = new Map();
    const P = ctx.props;
    const typeMatch = (name, list) => list.some((t) => (t instanceof RegExp ? t.test(name) : t === name));
    for (const it of HUNT) {
      const f = it.find;
      const item = { ...it, pts: null, dynTypes: null };
      if (f.props) {
        const pts = [];
        const tids = new Set(P.types.filter((t) => typeMatch(t.name, f.props)).map((t) => P.typeIndex.get(t.name)));
        for (let i = 0; i < P.n; i++) if (tids.has(P.tType[i]) && P.tCat[i] !== 250) pts.push([P.tPos[i * 3], P.tPos[i * 3 + 1] + 0.5, P.tPos[i * 3 + 2]]);
        item.pts = pts;
      }
      if (f.dyn) item.dynTypes = new Set(P.types.filter((t) => typeMatch(t.name, f.dyn)).map((t) => P.typeIndex.get(t.name)));
      if (f.building) item.buildings = ctx.buildings.filter((b) => f.building.test(b.name));
      // keep only findable things
      const findable = (item.pts && item.pts.length) || (item.dynTypes && item.dynTypes.size) || (item.buildings && item.buildings.length) || f.person || f.point || f.label;
      if (!findable) continue;
      if (item.hint && item.hint.includes('{near}')) item.hint = item.hint.replace('{near}', this.nearName(item) || 'somewhere in town');
      this.items.push(item);
    }
    this.load();
    this.acc = 0;
    this.onSpot = null;
  }

  nearName(item) {
    const p = item.pts && item.pts[0]; if (!p) return null;
    let best = null, bd = 1e9;
    for (const b of this.g.ctx.buildings) {
      if (!b.rect || /^\d/.test(b.name)) continue;
      const cx = Math.max(b.rect.x0, Math.min(p[0], b.rect.x1)), cz = Math.max(b.rect.z0, Math.min(p[2], b.rect.z1));
      const d = Math.hypot(cx - p[0], cz - p[2]);
      if (d < bd) { bd = d; best = b.name; }
    }
    return best;
  }

  get total() { return this.items.length; }
  get count() { return this.items.filter((it) => this.spotted.has(it.id)).length; }

  load() {
    try { const s = JSON.parse(localStorage.getItem('juniper-bay-diary-v1') || '{}'); for (const [k, v] of Object.entries(s.spotted || {})) this.spotted.set(k, v); } catch (e) { /* private window */ }
  }
  save() {
    try { localStorage.setItem('juniper-bay-diary-v1', JSON.stringify({ spotted: Object.fromEntries(this.spotted) })); } catch (e) { /* ignore */ }
  }
  reset() { this.spotted.clear(); this.save(); }

  // is a point in view: in front, near the centre of the screen, within range, nothing solid between
  seen(cam, fwd, x, y, z, range, r = 0.9) {
    const dx = x - cam.x, dy = y - cam.y, dz = z - cam.z;
    const along = dx * fwd.x + dy * fwd.y + dz * fwd.z;
    if (along < 0.4 || along > range) return false;
    const px = dx - fwd.x * along, py = dy - fwd.y * along, pz = dz - fwd.z * along;
    if (Math.hypot(px, py, pz) > Math.max(r, 0.9 + along * 0.06)) return false;
    return along > 150 || this.g.life.clear(cam, { x, y, z });
  }

  update(dt) {
    const g = this.g;
    this.acc += dt;
    if (this.acc < 0.2) return;
    const step = this.acc; this.acc = 0;
    if (g.player.mode === 'aerial' || g.hud.overlay || (g.diary && g.diary.isUp)) return;
    const cam = g.R.camera.position, fwd = g.R.camera.getWorldDirection(this._f || (this._f = new (cam.constructor)()));
    const m = g.clock.minutes, night = g.R.common.uNight.value;
    let bHit;
    for (const it of this.items) {
      if (this.spotted.has(it.id)) continue;
      if (it.when && !it.when(m, night)) continue;
      const range = it.range || 20, f = it.find;
      let ok = false;
      if (it.pts) for (const p of it.pts) { if (Math.abs(p[0] - cam.x) > range || Math.abs(p[2] - cam.z) > range) continue; if (this.seen(cam, fwd, p[0], p[1], p[2], range)) { ok = true; break; } }
      if (!ok && it.dynTypes) for (const h of g.ctx.props.dyn) { if (!h.visible || !it.dynTypes.has(h.tid)) continue; if (this.seen(cam, fwd, h.x, h.y + 1, h.z, range, 2.5)) { ok = true; break; } }
      if (!ok && f.person) for (const p of g.ctx.people.visible) {
        const s = p.state; if (s.camDist > range) continue;
        if (!f.person(p, s, s.entry)) continue;
        const P = p.ch.pose; if (this.seen(cam, fwd, P.x, P.y + 1, P.z, range)) { ok = true; break; }
      }
      if (!ok && it.buildings) {
        if (bHit === undefined) bHit = g.life.buildingAt(cam, fwd, m, 300) || null;
        if (bHit && it.buildings.includes(bHit.building) && bHit.d <= range) ok = true;
        // or simply in view from afar (the lighthouse from the beach)
        if (!ok) for (const b of it.buildings) { const x = (b.rect.x0 + b.rect.x1) / 2, z = (b.rect.z0 + b.rect.z1) / 2; if (this.seen(cam, fwd, x, 8, z, range, Math.max(6, (b.rect.x1 - b.rect.x0) / 2))) { ok = true; break; } }
      }
      if (!ok && f.point) ok = this.seen(cam, fwd, f.point.x, f.point.y, f.point.z, range, f.point.r);
      if (!ok && f.label) for (const l of g.ctx.life.labels) { if (m < l.t0 || m >= l.t1 || !f.label.test(l.text)) continue; if (this.seen(cam, fwd, l.x, l.y, l.z, range, l.r)) { ok = true; break; } }
      const gz = ok ? (this.gaze.get(it.id) || 0) + step : Math.max(0, (this.gaze.get(it.id) || 0) - step * 0.5);
      this.gaze.set(it.id, gz);
      if (gz >= 0.6) { this.spotted.set(it.id, Math.round(m)); this.save(); if (this.onSpot) this.onSpot(it); }
    }
  }
}

// a little deterministic wobble for handwriting
export const wob = (i, k = 0) => hash3(i, k, 91) - 0.5;
