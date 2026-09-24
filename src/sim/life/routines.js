// Everyday routines that fill the gaps between the big events: Saturday errands and shopping runs,
// the barber, visits and sidewalk chats, gangs of kids, families walking to the fair, couples out
// after supper, confession at St. Brigid's, and out-of-town visitors up for Harbor Days.
// See docs/LIFE.md. Helpers live in routines_lib.js, words in routines_data.js.
import { RW } from './routines_lib.js';
import * as town from './routines_town.js';
import { visitors } from './routines_visitors.js';

export function run(L) {
  const W = new RW(L);
  // diagnostics: how many townsfolk the earlier modules left idle, hour by hour
  const idleBefore = {};
  for (let h = 8; h <= 21; h++) idleBefore[h] = L.ctx.people.list.filter((p) => L.idle(p, h * 60, h * 60 + 30)).length;
  town.setupTown(W);
  // each pass gets its own random stream, so changing one doesn't reshuffle the others
  const step = (name, fn) => { const t0 = Date.now(); W.rng = L.rng.fork(name); try { fn(W); } catch (e) { console.error('routines: ' + name + ' failed', e); } W.timing = W.timing || {}; W.timing[name] = Date.now() - t0; };
  step('visitors', visitors);
  step('mass', town.morningMass);
  step('confession', town.confession);
  step('casseroles', town.casseroles);
  step('beauty', town.beautyKitchens);
  step('families', town.families);
  step('kids', town.kidGangs);
  step('teens', town.teens);
  step('oldmen', town.oldMen);
  step('couples', town.couples);
  step('chats', town.chats);
  step('corners', town.cornerMen);
  step('fireworks', town.earlyFireworks);
  step('filler', town.filler);
  step('kidfiller', town.kidFiller);
  step('diary', diary);
  L.ctx.life.routines = { count: W.count, timing: W.timing, idleBefore };
}

// the Spotter's Diary: a few of the day's routines worth going out of your way to see
function diary(W) {
  const L = W.L, d = W.diary;
  if (!L.spottable) return;
  const street = (s) => (s ? s.replace(/ (Street|Avenue)$/, '') : null);
  const hm = (m) => { const h = Math.floor(m / 60) % 12 || 12, mm = Math.floor(m % 60); return mm ? `${h}:${String(mm).padStart(2, '0')}` : `${h}`; };
  if (d.scouts) L.spottable({ id: 'r_scouts', cat: 'Only at certain times', what: 'Troop 14 of Worcester, marching two by two', hint: 'Off the 7:15 train — the lighthouse, the museum, the fair', person: d.scouts.person, t0: '7:15', t1: '22:19', range: 30 });
  if (d.couple) L.spottable({ id: 'r_arm_in_arm', cat: 'Only at certain times', what: 'A couple out walking arm in arm after supper', hint: `The ${d.couple.last}s, from ${street(d.couple.street) || 'up the hill'}, about ${hm(d.couple.t0)}`, person: d.couple.person, label: d.couple.label, t0: d.couple.t0, t1: d.couple.t1, range: 25 });
  if (d.confession) L.spottable({ id: 'r_confession', cat: 'Only at certain times', what: "The line for Saturday confession", hint: "St. Brigid's, half past three to five — whisper", x: d.confession.x, y: d.confession.y, z: d.confession.z, r: 3, range: 16, t0: '15:30', t1: '17:05' });
  if (d.gang) L.spottable({ id: 'r_gang', cat: 'Townsfolk', what: 'A gang of kids on the move', hint: `Saturday morning — ${d.gang.names.slice(0, 2).join(' and ')} and friends, from ${street(d.gang.street) || 'up the hill'}`, person: d.gang.person, t0: d.gang.t0, t1: d.gang.t1, range: 30 });
  if (d.camera) L.spottable({ id: 'r_snapshot', cat: 'Around town', what: 'A visitor from Providence taking a snapshot', hint: 'A camera-club man, off the 7:15 — mostly by the water', person: d.camera.person, t0: '7:15', t1: '19:44', range: 25 });
  if (d.church) L.spottable({ id: 'r_church_ladies', cat: 'Only at certain times', what: 'A minister counting his church ladies', hint: 'Off the 9:52 from Providence; home on the 4:52', person: d.church.person, t0: '9:52', t1: '17:06', range: 25 });
  if (d.beauty) L.spottable({ id: 'r_kitchen_set', cat: 'Townsfolk', what: 'A shampoo and set at the kitchen table', hint: `Saturday morning on ${street(d.beauty.street) || 'a side street'} — peek in`, person: d.beauty.person, t0: d.beauty.t0, t1: d.beauty.t1, range: 12 });
  if (d.pie) L.spottable({ id: 'r_doorstep_pie', cat: 'Around town', what: 'A pie left on a doorstep', hint: "Somebody's at St. Luke's having a baby — the neighbours know", x: d.pie.x, y: d.pie.y, z: d.pie.z, r: 0.8, range: 12, t0: d.pie.t0, t1: '23:59' });
}
