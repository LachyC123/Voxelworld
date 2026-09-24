// Everyday routines that fill the gaps between the big events: Saturday errands and shopping runs,
// the barber, visits and sidewalk chats, gangs of kids, families walking to the fair, couples out
// after supper, confession at St. Brigid's, and out-of-town visitors up for Harbor Days.
// See docs/LIFE.md. Helpers live in routines_lib.js, words in routines_data.js.
import { RW } from './routines_lib.js';
import * as town from './routines_town.js';
import { visitors } from './routines_visitors.js';

export function run(L) {
  const W = new RW(L);
  town.setupTown(W);
  // each pass gets its own random stream, so changing one doesn't reshuffle the others
  const step = (name, fn) => { const t0 = Date.now(); W.rng = L.rng.fork(name); try { fn(W); } catch (e) { console.error('routines: ' + name + ' failed', e); } W.timing = W.timing || {}; W.timing[name] = Date.now() - t0; };
  step('visitors', visitors);
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
  L.ctx.life.routines = { count: W.count, timing: W.timing };
}
