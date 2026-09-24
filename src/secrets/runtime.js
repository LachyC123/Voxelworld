// The player's side of the Secrets: which clues have been found, checking the clue places as you
// explore, secret doors, the Casebook's state, and the pop-ups / front page when a case opens or
// closes. Progress is kept in the browser (like the Spotter's Diary).
import { fmtTime } from '../core/util.js';

const KEY = 'juniper-bay-secrets-v1';
const inWin = (m, t0, t1) => (t0 === null || t1 === null) ? true : t0 <= t1 ? (m >= t0 && m < t1) : (m >= t0 || m < t1);

export class Secrets {
  constructor(game) {
    this.g = game;
    const S = game.ctx.secrets || { cases: [], triggers: [], doors: [] };
    this.cases = S.cases.slice().sort((a, b) => a.order - b.order);
    this.byClue = new Map();
    for (const c of this.cases) for (const q of c.clues) { q.caseId = c.id; q.full = `${c.id}/${q.id}`; this.byClue.set(q.full, { c, q }); }
    this.triggers = S.triggers.filter((t) => this.byClue.has(t.clue));
    this.found = new Map();   // clue id -> minutes found
    this.solved = new Set();
    this.acc = 0;
    this.load();
  }
  load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || '{}');
      for (const [k, v] of Object.entries(s.found || {})) if (this.byClue.has(k)) this.found.set(k, v);
      for (const id of s.solved || []) this.solved.add(id);
    } catch (e) { /* private window */ }
  }
  save() { try { localStorage.setItem(KEY, JSON.stringify({ found: Object.fromEntries(this.found), solved: [...this.solved] })); } catch (e) { /* ignore */ } }
  reset() { this.found.clear(); this.solved.clear(); this.save(); }

  // ---------------------------------------------------------------- queries (for the Casebook)
  opened(c) { return c.clues.some((q) => this.found.has(q.full)); }
  isSolved(c) { return this.solved.has(c.id); }
  progress(c) { const keys = c.clues.filter((q) => q.key); return { n: keys.filter((q) => this.found.has(q.full)).length, N: keys.length }; }
  get openCount() { return this.cases.filter((c) => this.opened(c)).length; }
  get solvedCount() { return this.cases.filter((c) => this.solved.has(c.id)).length; }

  // ---------------------------------------------------------------- finding things
  find(clueId, say = null) {
    if (!clueId || this.found.has(clueId)) return false;
    const hit = this.byClue.get(clueId);
    if (!hit) return false;
    const { c, q } = hit;
    const firstOfCase = !this.opened(c);
    this.found.set(clueId, Math.round(this.g.clock.minutes));
    const H = this.g.hunt;
    if (H) { H.score = (H.score || 0) + 100; H.save(); }
    const pr = this.progress(c);
    const pop = this.g.pop;
    if (pop) {
      if (firstOfCase) pop.show({ kind: 'case', caseTitle: 'The Casebook', title: c.title, sub: c.teaser || '', points: 100, n: pr.n, N: pr.N, teaser: 'see your diary' });
      else pop.show({ kind: 'clue', caseTitle: c.title, title: q.text, sub: say || '', points: 100, n: pr.n, N: pr.N, teaser: pr.n < pr.N ? `${pr.N - pr.n} more to go` : 'that’s all of it…' });
    }
    this.g.audio && this.g.audio.pencil && this.g.audio.pencil();
    if (this.g.diary) { this.g.diary.dirty = true; this.g.diary.spottedPeek(); }
    if (pr.n >= pr.N && !this.solved.has(c.id)) {
      this.solved.add(c.id);
      if (H) { H.score = (H.score || 0) + (c.points || 250); H.save(); }
      setTimeout(() => this.g.pop && this.g.pop.frontPage({ headline: c.headline || c.title, deck: c.deck, body: c.body, points: c.points || 250, solved: this.solvedCount, total: this.cases.length }), 4800);
    }
    this.save();
    this.g.syncDiaryButton && this.g.syncDiaryButton();
    return true;
  }

  useDoor(d, back) {
    const g = this.g;
    if (!back && d.needs && !this.found.has(d.needs)) { g.hud.toast(d.locked, 4); return; }
    const to = back ? d.backTo : d.to;
    if (!to) return;
    g.fadeTeleport(to.x, to.y + 0.05, to.z, to.yaw ?? g.player.yaw, back ? null : (d.label || null));
    if (!back && d.clue) setTimeout(() => this.find(d.clue), 700);
  }

  // ---------------------------------------------------------------- clue places, checked as you go
  update(dt) {
    const g = this.g;
    this.acc += dt;
    if (this.acc < 0.25) return;
    const step = this.acc; this.acc = 0;
    if (!this.triggers.length || g.player.mode === 'aerial' || g.hud.overlay) return;
    const m = g.clock.minutes, cam = g.R.camera.position, pos = g.player.pos;
    const fwd = g.R.camera.getWorldDirection(this._f || (this._f = new (cam.constructor)()));
    for (const t of this.triggers) {
      if (this.found.has(t.clue) || !inWin(m, t.t0, t.t1)) { t._acc = 0; continue; }
      let ok = false;
      if (t.kind === 'enter') ok = (g.playerRoom || 0) === t.room;
      else if (t.kind === 'near') ok = Math.hypot(pos.x - t.x, pos.z - t.z) < t.r && Math.abs(pos.y - (t.y ?? pos.y)) < 3 && (!t.room || (g.playerRoom || 0) === t.room);
      else if (t.kind === 'see') ok = this.seen(cam, fwd, t.x, t.y, t.z, t.range, t.r);
      else if (t.kind === 'person' || t.kind === 'overhear') {
        const p = t.person, S = p && p.state;
        if (S && S.entry && p.ch && p.ch.pose.visible && (!t.when || t.when(p, S))) {
          const P = p.ch.pose;
          if (t.kind === 'person') ok = this.seen(cam, fwd, P.x, P.y + 1, P.z, t.range, 0.8);
          else ok = Math.hypot(pos.x - P.x, pos.z - P.z) < (t.r > 2 ? t.r : 7) && Math.abs(pos.y - P.y) < 2.5 && ((g.playerRoom || 0) === (P.room || 0) || !P.room);
        }
      }
      t._acc = ok ? (t._acc || 0) + step : 0;
      const need = t.kind === 'overhear' ? (t.secs > 1 ? t.secs : 6) : t.kind === 'enter' ? 0 : Math.max(0.5, t.secs || 0.5);
      if (ok && t._acc >= need) this.find(t.clue, t.say || null);
    }
  }
  seen(cam, fwd, x, y, z, range, r) {
    const dx = x - cam.x, dy = y - cam.y, dz = z - cam.z;
    const along = dx * fwd.x + dy * fwd.y + dz * fwd.z;
    if (along < 0.3 || along > range) return false;
    const px = dx - fwd.x * along, py = dy - fwd.y * along, pz = dz - fwd.z * along;
    if (Math.hypot(px, py, pz) > Math.max(r, 0.6 + along * 0.05)) return false;
    return this.g.life.clear(cam, { x, y, z });
  }

  // "found at 10:14 pm"
  when(clueId) { const m = this.found.get(clueId); return m === undefined ? '' : fmtTime(m).toLowerCase(); }
}
