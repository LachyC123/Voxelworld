// Secrets of Juniper Bay: hidden storylines the player uncovers by exploring. Each case is a set of
// clues; clues are found by reading something, looking at something, going somewhere (at the right
// time), overhearing somebody, or asking the right person. See docs/SECRETS.md.
//   world(S)   — runs while the town is being built (before the voxel world is sealed): hidden
//                rooms, documents, props, secret doors, clue places.
//   life(L, S) — runs with the street-life modules: who does what, when (the night drop on the pier).
import * as syndicate from './syndicate.js';
import * as stadium from './stadium.js';
import * as mysteries from './mysteries.js';
import { tm } from '../core/util.js';

const MODULES = [['syndicate', syndicate], ['stadium', stadium], ['mysteries', mysteries]];

export class SecretsWorld {
  constructor(ctx) {
    this.ctx = ctx;
    this.cases = [];      // { id, title, teaser, clues:[{id, text, hint, key}], headline, deck, body, points, order }
    this.triggers = [];   // { clue, kind, … } — see trigger()
    this.doors = [];
  }
  // ---------------------------------------------------------------- cases
  // def: { id, title, teaser (shown before it's solved), clues: [{ id, text (what the diary notes once
  //   found), hint (pencil hint once the case is open), key (needed to solve; default true) }],
  //   headline, deck, body (the Courier's front page when solved), points }
  case(def) {
    const c = { points: 250, order: this.cases.length, ...def, clues: def.clues.map((q) => ({ key: true, ...q })) };
    this.cases.push(c);
    return c;
  }
  clue(caseId, clueId) { return `${caseId}/${clueId}`; }
  building(name) { return this.ctx.buildings.find((b) => b.name === name) || this.ctx.buildings.find((b) => b.name.includes(name)) || null; }

  // ---------------------------------------------------------------- clue places
  // a document in a building (local frame coords), readable with E; reading it finds the clue
  readable(b, x, y, z, text, clue, o = {}) { b.readable(x, y, z, text, { ...o, clue }); }
  // the same at world metres
  readableAt(x, y, z, text, clue, o = {}) { this.ctx.interactables.push({ kind: 'read', x, y, z, r: o.r || 1.6, prompt: o.prompt || `Read “${text.title}”`, text, clue }); }
  // kinds:
  //   'see'      — look at (x, y, z) from within `range` (default 20 m), within `r` of the crosshair, not through walls
  //   'near'     — be within `r` of (x, z) (and in `room`, if given) for `secs` seconds
  //   'enter'    — step into `room` (a room id)
  //   'overhear' — be within `r` (default 7 m) of `person` for `secs` (default 6) while `when(p)` holds (or during t0–t1)
  //   'person'   — look at `person` (like 'see', following them)
  // all take optional t0/t1 ('22:30') windows and `say` (a line shown when it's found)
  trigger(o) { this.triggers.push({ r: 1.2, range: 20, secs: 1, ...o, t0: o.t0 !== undefined ? tm(o.t0) : null, t1: o.t1 !== undefined ? tm(o.t1) : null }); }
  // A hidden way in: press E at `from` to slip through to `to` (and back from `back` to `backTo`).
  // needs: a clue id that must be found first (else `locked` is shown); clue: found on first use.
  secretDoor(o) {
    const d = { prompt: 'Look closer…', promptBack: 'Go back out', locked: 'It won’t budge. Something about it isn’t right, though.', ...o };
    this.doors.push(d);
    const I = this.ctx.interactables;
    I.push({ kind: 'secret', x: d.from.x, y: d.from.y, z: d.from.z, r: d.r || 1.4, get prompt() { return d.prompt; }, action: (g) => g.secrets.useDoor(d, false) });
    if (d.back) I.push({ kind: 'secret', x: d.back.x, y: d.back.y, z: d.back.z, r: d.r || 1.4, prompt: d.promptBack, action: (g) => g.secrets.useDoor(d, true) });
    return d;
  }
  // (life phase) asking this person about things — the second E, when they tell you their story — finds the clue
  talk(person, clue) { if (person) (person.clues = person.clues || []).push(clue); }
}

export function secretsWorld(ctx) {
  const S = ctx.secrets = new SecretsWorld(ctx);
  for (const [id, m] of MODULES) { if (!m.world) continue; try { m.world(S); } catch (e) { console.error('secrets world failed:', id, e); } }
  return S;
}
export function secretsLife(L) {
  const S = L.ctx.secrets; if (!S) return;
  for (const [id, m] of MODULES) { if (!m.life) continue; try { m.life(L, S); } catch (e) { console.error('secrets life failed:', id, e); } }
}
