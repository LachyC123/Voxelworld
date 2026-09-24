// Scripted happenings on Centennial Saturday. Each event finds its building/spots by name &
// tag, recruits townsfolk and blocks out their schedules for the duration, and attaches
// dialogue/song lines that the speech-bubble system plays when the player is nearby.
import { RNG } from '../core/rng.js';
import { tm, fmtTime } from '../core/util.js';
import { EVENT_DEFS } from './eventDefs.js';

export class EventKit {
  constructor(ctx, ev) { this.ctx = ctx; this.ev = ev; this.rng = new RNG('event:' + ev.id); }
  building(name) { return this.ctx.buildings.find((b) => b.name === name) || null; }
  buildingsKind(kind) { return this.ctx.buildings.filter((b) => b.kind === kind); }
  spots(building, tag) { return (building ? building.spots : this.ctx.spots.list).filter((s) => s.tags.includes(tag)); }
  tagged(tag) { return this.ctx.spots.tagged(tag); }
  person(first, last) { return this.ctx.people.find(first, last) || null; }
  household(special) { return (this.ctx.households || []).find((h) => h.home.special === special) || null; }
  // is p free during [t0, t1)?
  free(p, t0, t1) { return !(p.busy || []).some(([a, b]) => a < t1 && b > t0); }
  // pick n people matching filter who are free during the window
  recruit(n, t0, t1, filter = () => true, prefer = null) {
    t0 = tm(t0); t1 = tm(t1);
    const pool = this.ctx.people.list.filter((p) => !p.commuter && this.free(p, t0, t1) && filter(p));
    this.rng.shuffle(pool);
    if (prefer) pool.sort((a, b) => (prefer(b) ? 1 : 0) - (prefer(a) ? 1 : 0));
    return pool.slice(0, n);
  }
  // Put p at spot doing act from t0 until t1, then let them resume what they were doing.
  block(p, t0, t1, spot, act = null, o = {}) {
    if (!p || !spot) return;
    t0 = tm(t0); t1 = tm(t1);
    const s = p.schedule;
    s.sort((a, b) => a.t - b.t);
    let resume = null;
    for (const e of s) if (e.t <= t1) resume = e;
    if (!resume && s.length) resume = s[s.length - 1];
    p.schedule = s.filter((e) => !(e.t >= t0 && e.t < t1) || e.keep);
    p.at(t0, spot, act || spot.act, { label: o.label || this.ev.title, held: o.held || null, event: this.ev.id, costume: o.costume || null });
    const last = p.schedule[p.schedule.length - 1];
    if (o.keep) last.keep = true;
    if (resume && resume.t < t1 && !o.noResume) p.schedule.push({ ...resume, t: t1 });
    else if (resume && resume.t >= t1 && !o.noResume) { /* next entry already starts at/after t1 */ }
    (p.busy = p.busy || []).push([t0, t1]);
    if (o.lines) this.say(p, t0, t1, o.lines, o.song);
  }
  // dialogue for this person during a window (real-time paced when the player is near)
  say(p, t0, t1, lines, song = false) {
    (p.eventLines = p.eventLines || []).push({ t0: tm(t0), t1: tm(t1), lines, song, ev: this.ev.id });
  }
  // a shared conversation: speakers take turns with the given lines
  convo(people, t0, t1, script, song = false) {
    const c = { t0: tm(t0), t1: tm(t1), script, people, song, ev: this.ev.id };
    for (const p of people) (p.convos = p.convos || []).push(c);
    return c;
  }
  // place a crowd of people on crowd spots
  crowd(n, t0, t1, spots, act, o = {}) {
    if (!spots.length) return [];
    const ppl = this.recruit(n, t0, t1, o.filter || ((p) => p.age >= 6), o.prefer);
    ppl.forEach((p, i) => this.block(p, tm(t0) + (o.stagger ? this.rng.int(0, o.stagger) : 0), t1, spots[i % spots.length], typeof act === 'function' ? act(p, i) : act, { label: o.label, costume: typeof o.costume === 'function' ? o.costume(p, i) : o.costume }));
    return ppl;
  }
}

export function setupEvents(ctx) {
  ctx.events = [];
  for (const def of EVENT_DEFS) {
    const ev = { id: def.id, title: def.title, place: def.place, start: tm(def.start), end: tm(def.end), blurb: def.blurb || '', x: null, z: null, y: 0.3, icon: def.icon || '★' };
    const kit = new EventKit(ctx, ev);
    let ok = false;
    try { ok = def.run(ctx, ev, kit) !== false; } catch (e) { console.warn('event failed', def.id, e); ok = false; }
    if (!ok) continue;
    if (ev.x === null) {
      const b = kit.building(def.place);
      if (b && b.rect) { ev.x = (b.rect.x0 + b.rect.x1) / 2; ev.z = (b.rect.z0 + b.rect.z1) / 2; if (b.entrances[0]) { ev.x = b.entrances[0].pos[0]; ev.z = b.entrances[0].pos[2]; } }
    }
    ev.timeLabel = `${fmtTime(ev.start)}–${fmtTime(ev.end)}`;
    ctx.events.push(ev);
  }
  // re-finalize schedules touched by events
  for (const p of ctx.people.list) p.schedule.sort((a, b) => a.t - b.t);
}
