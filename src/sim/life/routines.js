// Everyday routines that fill the gaps: strolls, errands, visits, out-of-town visitors. See docs/LIFE.md.
import { tm } from '../../core/util.js';

export function run(L) {
  strolls(L);
}

// adults with an idle hour go for a walk round the block
function strolls(L) {
  const people = L.ctx.people.list.filter((p) => p.age >= 16 && !p.commuter);
  let n = 0;
  for (const p of people) {
    if (!L.rng.chance(0.35)) continue;
    const t0 = tm('10:00') + L.rng.int(0, 8) * 45 + L.rng.int(0, 30), t1 = t0 + 20 + L.rng.int(0, 25);
    if (!L.idle(p, t0, t1)) continue;
    if (L.stroll(p, t0, t1, { label: 'Out for a walk', held: p.age > 70 && L.rng.chance(0.5) ? 'cane' : null })) n++;
  }
  L.scene('Strolls', 200, 0, '10:00', '18:00', n);
}
