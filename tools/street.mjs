// Street-activity probe (no browser): builds the town headlessly and reports, hour by hour, how many
// people are walking, outdoors at a spot, indoors or away, with a coarse outdoor head-count map
// (rows = 80 m bands north→south, columns = 80 m bands west→east), plus the street-life scene list.
// Usage: node tools/street.mjs [hours...]   e.g. node tools/street.mjs 8 10 12 14 16 18 20
const root = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
console.warn = () => {}; const log = console.log; console.log = (...a) => { if (!String(a[0]).startsWith('cleared')) log(...a); };
globalThis.document = undefined;
const errs = []; const origErr = console.error; console.error = (...a) => { errs.push(a.map(String).join(' ')); };
await import(root + '/src/props/lib/index.js');
const { buildCity } = await import(root + '/src/city/city.js');
const t0 = Date.now();
const ctx = await buildCity(() => {});
log(`built in ${Date.now() - t0} ms, ${ctx.people.list.length} people`);
const P = ctx.people; P.pathBudget = Infinity;
for (const p of P.list) p.finalize();
const hours = process.argv.slice(2).map(Number); if (!hours.length) hours.push(7, 9, 11, 13, 15, 17, 19, 21);
const acts = {};
for (const hh of hours) {
  P.update(hh * 60, 0, { x: 0, y: 0, z: 0 }, [30, 60]);
  let walk = 0, outSpot = 0, inside = 0, hidden = 0; const grid = {};
  for (const p of P.list) {
    const S = p.state;
    if (S.mode === 'hidden' || (S.spot && S.spot.hidden)) { hidden++; continue; }
    if (S.mode === 'walk') walk++; else if (!S.room) outSpot++; else inside++;
    if (S.mode === 'walk' || !S.room) { const k = Math.floor(S.x / 80) + ',' + Math.floor(S.z / 80); grid[k] = (grid[k] || 0) + 1; }
    if (!S.room && S.mode !== 'walk') acts[S.act] = (acts[S.act] || 0) + 1;
  }
  log(`${String(hh).padStart(2)}:00 walking ${walk}, outdoors at a spot ${outSpot}, inside ${inside}, away ${hidden}`);
  let s = '';
  for (let gz = -3; gz <= 3; gz++) { let row = '   '; for (let gx = -1; gx <= 5; gx++) row += String(grid[gx + ',' + gz] || 0).padStart(4); s += row + '\n'; }
  log(s);
}
log('outdoor activities', JSON.stringify(acts));
if (ctx.life) {
  const by = {}; for (const s of ctx.life.scenes) { const k = s.id + ': ' + s.title; by[k] = (by[k] || 0) + 1; }
  log('street-life scenes', JSON.stringify(by, null, 1));
  log('timed props', ctx.life.timed.length, 'follow props', ctx.life.follows.length, 'labels', ctx.life.labels.length, 'sounds', ctx.life.sounds.length, 'hooks', ctx.life.updaters.length, 'module ms', JSON.stringify(ctx.life.timings));
}
const miss = ctx.props._missing ? [...ctx.props._missing] : [];
log('missing props:', miss.join(', ') || 'none');
if (errs.length) { log('ERRORS:'); for (const e of errs.slice(0, 20)) log('  ' + e.slice(0, 400)); }
console.error = origErr;
