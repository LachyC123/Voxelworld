// Fills the homes and jobs of Juniper Bay with people and plans each person's Saturday.
import { RNG } from '../core/rng.js';
import { makeLook, pickName, SURNAMES } from '../people/appearance.js';
import { HOUSEHOLDS, NOTABLES } from './roster.js';
import { bioFor } from './dialogue.js';
import { tm } from '../core/util.js';

const T = tm;

export function populate(ctx) {
  const rng = new RNG('population');
  const people = ctx.people;
  const homes = ctx.homes.slice();
  const usedSurnames = new Set();
  const claimed = new Set();
  // ------------------------------------------------ helper to create a person
  const make = (o, home) => {
    const r = rng.fork(o.first + o.last + (o.age || 0));
    const sex = o.sex || (r.chance(0.5) ? 'M' : 'F');
    const age = o.age ?? r.int(20, 70);
    const nm = o.first ? { first: o.first, last: o.last } : pickName(r, sex, age, o.last);
    const look = { ...makeLook(r, { sex, age, role: o.outfit || o.role, formal: o.formal }), ...(o.look || {}) };
    const p = people.add({ first: nm.first, last: nm.last, nick: o.nick || null, title: o.title || null, age, sex, look, role: o.role || null, home: home || null, bio: o.bio || null, lines: o.lines || [], tags: o.tags || [], notable: !!o.bio, job: null, household: null });
    return p;
  };
  // ------------------------------------------------ named households from the roster
  const findHome = (sel) => {
    if (!sel) return null;
    return homes.find((h) => !claimed.has(h) && ((sel.special && h.special === sel.special) || (sel.name && h.building.name === sel.name) || (sel.family && h.family === sel.family)));
  };
  const households = [];
  for (const hh of HOUSEHOLDS) {
    let home = findHome(hh.home) || homes.find((h) => !claimed.has(h) && h.building.kind === 'house' && (h.beds || []).length >= hh.members.length);
    if (!home) continue;
    claimed.add(home);
    home.building.name = hh.homeName || (home.building.name.match(/^\d/) ? `${hh.surname} Residence` : home.building.name);
    const members = hh.members.map((m) => make({ ...m, last: m.last || hh.surname }, home));
    usedSurnames.add(hh.surname);
    households.push({ home, members, surname: hh.surname, named: true });
  }
  // ------------------------------------------------ notables: grouped into households by surname
  const notablePeople = new Map();
  const groups = new Map();
  for (const n of NOTABLES) { const k = n.own ? n.first + n.last : n.last; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(n); }
  for (const [, grp] of groups) {
    let home = null;
    for (const n of grp) if (n.home) home = home || findHome(n.home);
    if (!home) home = homes.find((h) => !claimed.has(h) && !h.special && (h.beds || []).length >= grp.length && (grp.length > 1 ? h.building.kind === 'house' : true));
    if (home) claimed.add(home);
    const members = grp.map((n) => { const p = make(n, home); notablePeople.set(n, p); return p; });
    if (home) {
      if (home.building.name.match(/^\d/)) home.building.name = `${grp[0].last} Residence`;
      households.push({ home, members, surname: grp[0].last, named: true });
    }
  }
  // ------------------------------------------------ everyone else
  for (const home of homes) {
    if (claimed.has(home)) continue;
    claimed.add(home);
    const beds = (home.beds || []).length;
    if (!beds) continue;
    const r = rng.fork('hh' + home.building.id);
    let surname = home.family || r.pick(SURNAMES);
    let tries = 0; while (usedSurnames.has(surname) && tries++ < 8 && !home.family) surname = r.pick(SURNAMES);
    usedSurnames.add(surname);
    const type = r.weighted([['family', 6], ['couple', 2], ['elderly', 2], ['single', 1], ['widow', 1]]);
    const members = [];
    const skinPick = r.chance(0.1) ? r.pick(['#a06a45', '#835236', '#653e28']) : null;
    const base = { last: surname, look: skinPick ? { skin: skinPick } : undefined };
    if (type === 'family' || type === 'couple') {
      const a = r.int(26, 50);
      members.push(make({ ...base, sex: 'M', age: a + r.int(0, 4), role: null }, home));
      members.push(make({ ...base, sex: 'F', age: a, role: null }, home));
      if (type === 'family') { const k = Math.min(beds, r.int(1, 4)); for (let i = 0; i < k; i++) members.push(make({ ...base, age: r.int(1, Math.min(17, a - 18)) }, home)); }
    } else if (type === 'elderly') {
      const a = r.int(62, 80);
      members.push(make({ ...base, sex: 'M', age: a + r.int(0, 4) }, home));
      members.push(make({ ...base, sex: 'F', age: a }, home));
    } else if (type === 'single') members.push(make({ ...base, age: r.int(22, 45) }, home));
    else members.push(make({ ...base, sex: 'F', age: r.int(60, 84) }, home));
    households.push({ home, members, surname });
  }
  for (const h of households) for (const m of h.members) m.household = h;
  // ------------------------------------------------ jobs
  const jobs = ctx.jobs.slice();
  const byBuilding = (name) => jobs.filter((j) => !j.person && j.building.name === name);
  for (const n of NOTABLES) {
    const p = notablePeople.get(n);
    if (!p || !n.job) continue;
    const c = byBuilding(n.job.building);
    const job = c.find((j) => j.role === n.job.role) || c[0] || null;
    if (job) { job.person = p; p.job = job; }
  }
  // assign named household members their jobs
  for (const h of households) for (const m of h.members) {
    const spec = HOUSEHOLDS.flatMap((hh) => hh.members).find((q) => q.first === m.first && (q.last || h.surname) === m.last);
    if (spec && spec.job) {
      const c = byBuilding(spec.job.building);
      const j = c.find((q) => q.role === spec.job.role) || c[0];
      if (j) { j.person = m; m.job = j; }
    }
  }
  // fill remaining jobs with working-age adults (men mostly, some women) who aren't busy
  const adults = households.flatMap((h) => h.members).filter((m) => !m.job && m.age >= 18 && m.age <= 66 && !m.notableBusy);
  rng.shuffle(adults);
  const open = jobs.filter((j) => !j.person);
  for (const j of open) {
    let idx = adults.findIndex((a) => (j.sex ? a.sex === j.sex : (a.sex === 'M' || rng.chance(0.35))) && !(a.household && a.household.named));
    if (idx < 0) continue;
    const a = adults.splice(idx, 1)[0];
    j.person = a; a.job = j;
  }
  // any job still open gets a commuter who lives out of town (arrives by train / road)
  const station = ctx.spots.tagged('arrive')[0] || null;
  for (const j of jobs) {
    if (j.person) continue;
    const r = rng.fork('commuter' + j.building.name + j.role);
    const p = make({ age: r.int(20, 58), role: j.outfit || null, sex: j.sex || (r.chance(0.7) ? 'M' : 'F') }, null);
    p.commuter = true; j.person = p; p.job = j;
  }
  // outfits for jobs
  for (const p of people.list) if (p.job && p.job.outfit) Object.assign(p.look, makeLook(rng.fork('o' + p.id), { sex: p.sex, age: p.age, role: p.job.outfit }), p.look.skin ? { skin: p.look.skin, hair: p.look.hair } : {});
  // ------------------------------------------------ bios & schedules
  ctx.households = households;
  for (const p of people.list) {
    const b = bioFor(p, ctx);
    if (!p.bio) p.bio = b.bio;
    p.lines = [...(p.lines || []), ...b.lines];
  }
  for (const h of households) planHousehold(ctx, h, rng.fork('plan' + h.home.building.id));
  for (const p of people.list) if (!p.household) planLoner(ctx, p, rng.fork('loner' + p.id), station);
}

// ---------------------------------------------------------------- schedule planning
function pickSpot(ctx, tag, r, filter = null) {
  const a = ctx.spots.tagged(tag).filter((s) => (!filter || filter(s)));
  if (!a.length) return null;
  // prefer less used
  a.sort((x, y) => x.users - y.users);
  const top = a.slice(0, Math.max(1, Math.ceil(a.length * 0.4)));
  const s = r.pick(top);
  s.users++;
  return s;
}
function nearestTagged(ctx, tag, x, z, filter) {
  let best = null, bd = Infinity;
  for (const s of ctx.spots.tagged(tag)) { if (filter && !filter(s)) continue; const d = Math.hypot(s.x - x, s.z - z); if (d < bd) { bd = d; best = s; } }
  return best;
}
function workShift(p, j, r) {
  let [a, b] = j.shift.map(T);
  if (j.days === 'weekday') { a = null; } // Saturday off
  if (a === null) return null;
  const jitter = r.int(-10, 5);
  return [a - 25 + jitter, b + r.int(0, 10)];
}

export function planHousehold(ctx, h, r) {
  const home = h.home;
  const bedSpots = (home.beds || []).slice();
  const dine = (home.dine || []).slice();
  const lounge = (home.lounge || []).slice();
  const kit = home.kitchen || [];
  const yard = home.yard || [];
  const porch = home.porch || [];
  const members = h.members.slice().sort((a, b) => b.age - a.age);
  // beds: adults share the double bed, kids single beds
  members.forEach((m, i) => { m.bed = bedSpots[i % Math.max(1, bedSpots.length)] || null; m.seat = dine[i % Math.max(1, dine.length)] || lounge[i % Math.max(1, lounge.length)] || null; m.lounge = lounge[i % Math.max(1, lounge.length)] || m.seat; });
  const cookSpot = kit.find((s) => s.act === 'cook') || kit[0] || null;
  const washSpot = kit.find((s) => s.act === 'wash') || kit[0] || null;
  const dinner = T('18:00') + r.int(-20, 25);
  const supperTV = home.special === 'tv_dinner';
  for (const m of members) {
    const pr = r.fork(m.first);
    const kid = m.age < 13, teen = m.age >= 13 && m.age < 18, old = m.age >= 66;
    const wake = kid ? T('7:15') + pr.int(0, 60) : old ? T('6:15') + pr.int(0, 50) : T('6:30') + pr.int(-20, 50);
    const bed = kid ? T('20:00') + pr.int(0, 60) : teen ? T('22:30') + pr.int(0, 50) : old ? T('21:15') + pr.int(0, 60) : T('22:15') + pr.int(0, 70);
    if (m.bed) m.at(0, m.bed, 'sleep', { label: 'Asleep' });
    // breakfast
    const bf = wake + 12;
    if (m === members[members.length > 1 && members[1].sex === 'F' ? 1 : 0] && cookSpot && !m.job) m.at(wake + 2, cookSpot, 'cook', { label: 'Making breakfast' });
    else if (m.bed) m.at(wake, m.bed.building ? (pr.chance(0.5) && home.bath && home.bath[0] ? home.bath[0] : m.bed) : m.bed, pr.chance(0.5) ? 'stand' : 'sit', { label: 'Getting up' });
    if (m.seat) m.at(bf + 8, m.seat, 'eat', { label: 'Breakfast' });
    const shift = m.job ? workShift(m, m.job, pr) : null;
    if (shift) {
      // work day
      const js = m.job.spots;
      m.at(shift[0], js[0], m.job.act || js[0].act, { label: `Working — ${m.job.title} at ${m.job.building.name}` });
      if (js.length > 1) for (let t = shift[0] + 50; t < shift[1] - 30; t += 45 + pr.int(0, 30)) m.at(t, js[Math.floor(pr.next() * js.length)], null, { label: `Working — ${m.job.title} at ${m.job.building.name}` });
      // lunch break for long shifts
      if (shift[1] - shift[0] > 420) {
        const lunch = pickSpot(ctx, 'eat_out', pr) || null;
        if (lunch && pr.chance(0.5)) { m.at(T('12:05') + pr.int(0, 40), lunch, 'eat', { label: 'Lunch' }); m.at(T('12:50') + pr.int(0, 30), js[0], m.job.act || js[0].act, { label: `Back at work — ${m.job.building.name}` }); }
      }
      afterWork(ctx, m, shift[1], dinner, bed, pr, { lounge: m.lounge, porch, yard, home });
    } else if (kid) {
      // play in the yard or the park in the morning, fair in the afternoon
      const play = yard.length && pr.chance(0.6) ? pr.pick(yard) : pickSpot(ctx, 'play', pr);
      if (play) m.at(T('9:00') + pr.int(0, 60), play, play.act === 'swing' ? 'swing' : pr.pick(['play', 'play_ball', 'jump_rope', 'play']), { label: 'Playing' });
      if (m.seat) m.at(T('12:10') + pr.int(0, 20), m.seat, 'eat', { label: 'Lunch at home' });
      const fair = pickSpot(ctx, 'fair_kids', pr) || pickSpot(ctx, 'fair', pr);
      if (fair) m.at(T('13:10') + pr.int(0, 90), fair, pr.pick(['play', 'cheer', 'stand', 'play_ball']), { label: 'At the Harbor Days fair' });
      const park = pickSpot(ctx, 'play', pr);
      if (park) m.at(T('16:00') + pr.int(0, 40), park, pr.pick(['play', 'swing', 'play_ball']), { label: 'Playing in the park' });
    } else if (teen) {
      const soda = pickSpot(ctx, 'soda', pr) || pickSpot(ctx, 'eat_out', pr);
      if (m.seat) m.at(T('9:30'), m.seat, pr.pick(['read', 'eat', 'talk_sit']), {});
      const chore = yard.length ? pr.pick(yard) : null;
      if (chore) m.at(T('10:30') + pr.int(0, 30), chore, pr.pick(['rake', 'water_plants', 'sweep']), { label: 'Doing chores' });
      if (soda) m.at(T('13:30') + pr.int(0, 60), soda, 'drink', { label: 'At the soda fountain' });
      const fair = pickSpot(ctx, 'fair', pr);
      if (fair) m.at(T('15:30') + pr.int(0, 40), fair, pr.pick(['talk', 'stand', 'laugh']), { label: 'At the Harbor Days fair' });
    } else {
      // homemaker / retiree / day off
      const chores = [];
      if (washSpot) chores.push([washSpot, 'wash', 'Doing the dishes']);
      if (yard.length) chores.push([pr.pick(yard), pr.pick(['laundry', 'rake', 'water_plants', 'garden']), 'Out in the yard']);
      if (porch.length && old) chores.push([porch[0], porch[0].act, 'Sitting on the porch']);
      if (m.lounge) chores.push([m.lounge, pr.pick(['read', 'knit', 'sew', 'doze']), 'Resting']);
      let t = bf + 45;
      for (const [s, act, label] of pr.shuffle(chores).slice(0, 2)) { m.at(t, s, act, { label }); t += 50 + pr.int(0, 40); }
      // errand downtown
      const shop = pickSpot(ctx, 'browse', pr) || pickSpot(ctx, 'shop', pr);
      if (shop) { m.at(T('10:15') + pr.int(0, 70), shop, 'browse', { label: `Shopping at ${shop.building ? shop.building.name : 'the shops'}`, held: pr.chance(0.4) ? 'handbag' : null }); }
      if (m.seat) m.at(T('12:15') + pr.int(0, 30), m.seat, 'eat', { label: 'Lunch' });
      const fair = pickSpot(ctx, 'fair', pr);
      if (fair) m.at(T('13:30') + pr.int(0, 80), fair, pr.pick(['talk', 'stand', 'browse', 'listen']), { label: 'At the Harbor Days fair' });
      if (old) { const bench = pickSpot(ctx, 'bench', pr); if (bench) m.at(T('15:30') + pr.int(0, 40), bench, pr.pick(['feed_birds', 'sit', 'read', 'chess']), { label: 'In Juniper Park' }); }
      afterWork(ctx, m, T('16:45') + pr.int(0, 30), dinner, bed, pr, { lounge: m.lounge, porch, yard, home, cook: m.sex === 'F' && !m.job ? cookSpot : null });
    }
    // supper together
    if (supperTV && m.lounge) m.at(dinner, m.lounge, 'eat', { label: 'Supper in front of the television' });
    else if (m.seat) m.at(dinner, m.seat, 'eat', { label: 'Supper with the family' });
    // evening
    const eve = dinner + 45 + pr.int(0, 15);
    const evening = supperTV ? 'watch' : pr.pick(['watch', 'read', 'knit', 'talk_sit', 'doze', 'cards']);
    if (m.lounge) m.at(eve, m.lounge, home.special === 'tv_dinner' || evening !== 'watch' ? (supperTV ? 'watch' : evening) : 'read', { label: supperTV ? 'Watching television' : 'Evening at home' });
    if (!kid && !old && pr.chance(0.28)) {
      const out = pickSpot(ctx, pr.pick(['dance', 'fair', 'bar', 'bowling', 'theater', 'fireworks']), pr);
      if (out) { m.at(eve + 30 + pr.int(0, 40), out, out.act, { label: out.label || `Out — ${out.building ? out.building.name : 'on the town'}` }); }
    }
    if (m.bed) m.at(bed, m.bed, 'sleep', { label: 'Asleep' });
  }
}

function afterWork(ctx, m, t, dinner, bed, pr, o) {
  if (o.cook) { m.at(dinner - 50, o.cook, 'cook', { label: 'Cooking supper' }); return; }
  if (t > dinner - 20) return;
  if (o.porch && o.porch.length && pr.chance(0.5)) m.at(t + 10, o.porch[0], o.porch[0].act, { label: 'On the porch' });
  else if (o.lounge) m.at(t + 10, o.lounge, pr.pick(['read', 'doze', 'watch']), { label: 'Home from work' });
}

// people without a household (notables living alone, commuters, visitors)
function outOfTown(ctx) {
  if (ctx._oot) return ctx._oot;
  const node = ctx.nav.nearest(518, 0.25, -72, (id, inf) => inf.kind === 'walk', 40);
  const [x, y, z] = node >= 0 ? ctx.nav.pos(node) : [518, 0.25, -72];
  const s = ctx.spots.add({ x, y, z, yaw: -Math.PI / 2, pose: 'stand', room: 0, building: null, act: 'stand', tags: ['out_of_town'], seat: 0, group: null, held: null, lines: null, label: 'Out of town', public: false });
  s.node = node; s.hidden = true;
  ctx._oot = s;
  return s;
}

function planLoner(ctx, p, r, station) {
  const home = p.commuter ? outOfTown(ctx) : (p.homeSpot || ctx.spots.tagged('bench')[0] || station);
  if (!home) return;
  p.at(0, home, 'stand', { label: p.commuter ? 'At home, out of town' : 'Resting' });
  const shift = p.job ? workShift(p, p.job, r) : null;
  if (shift) {
    p.at(shift[0] - (p.commuter ? 15 : 0), p.job.spots[0], p.job.act || p.job.spots[0].act, { label: `Working — ${p.job.title} at ${p.job.building.name}` });
    const js = p.job.spots;
    if (js.length > 1) for (let t = shift[0] + 45; t < shift[1] - 30; t += 50 + r.int(0, 30)) p.at(t, js[Math.floor(r.next() * js.length)], null, { label: `Working — ${p.job.title} at ${p.job.building.name}` });
    const out = r.chance(0.4) ? (ctx.spots.tagged('eat_out')[r.int(0, Math.max(0, ctx.spots.tagged('eat_out').length - 1))] || null) : null;
    if (out) p.at(shift[1] + 10, out, 'eat', { label: 'Supper out' });
    p.at(shift[1] + (out ? 70 : 10), home, 'stand', { label: 'Heading home' });
  } else {
    const fair = ctx.spots.tagged('fair')[r.int(0, Math.max(0, ctx.spots.tagged('fair').length - 1))];
    if (fair) { p.at(T('11:00') + r.int(0, 120), fair, 'stand', { label: 'At the fair' }); p.at(T('19:00') + r.int(0, 60), home, 'stand', {}); }
  }
}
