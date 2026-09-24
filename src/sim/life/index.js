// Street life: small everyday scenes all over town (yard work, deliveries, kids' games,
// window shoppers, dogs and cats, errands and strolls). Each module gets its own LifeKit.
// Order matters: scenes recruit idle people first; routines fill whatever gaps remain.
import { LifeWorld, LifeKit } from './kit.js';
import * as residential from './residential.js';
import * as downtown from './downtown.js';
import * as animals from './animals.js';
import * as routines from './routines.js';
import * as parking from './parking.js';

const MODULES = [['residential', 'Neighbourhood life', residential], ['downtown', 'Downtown & waterfront life', downtown], ['animals', 'Dogs, cats and horses', animals], ['routines', 'Errands, strolls and visitors', routines], ['parking', 'Parked cars', parking]];

export function setupLife(ctx) {
  ctx.life = new LifeWorld(ctx);
  for (const [id, title, mod] of MODULES) {
    const t0 = Date.now();
    try { mod.run(new LifeKit(ctx, id, title)); } catch (e) { console.error('street life module failed:', id, e); }
    ctx.life.timings = ctx.life.timings || {}; ctx.life.timings[id] = Date.now() - t0;
  }
  for (const p of ctx.people.list) p.schedule.sort((a, b) => a.t - b.t);
  return ctx.life;
}
