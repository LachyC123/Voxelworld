// The little cards that drop in when you spot something from the diary (or find a clue, or crack
// a case). A queue of paper cards with a rarity ribbon, a rubber stamp that slams down, points
// that float up, a streak badge and a progress bar — plus a front page when a case is solved.
const RARITY = {
  common: { label: 'Common', pts: 10 },
  uncommon: { label: 'Uncommon', pts: 25 },
  rare: { label: 'Rare', pts: 50 },
  legendary: { label: 'Legendary', pts: 100 },
};
export const rarityPoints = (r) => (RARITY[r] || RARITY.common).pts;

export class SpotPop {
  constructor(game) {
    this.g = game;
    this.queue = [];
    this.busy = false;
    const el = this.el = document.createElement('div');
    el.id = 'spotpop';
    document.body.appendChild(el);
    const pg = this.page = document.createElement('div');
    pg.id = 'frontpage'; pg.className = 'hidden';
    pg.addEventListener('click', () => this.closePage());
    document.body.appendChild(pg);
    const nd = this.nudgeEl = document.createElement('div');
    nd.id = 'nudge'; nd.className = 'hidden';
    document.body.appendChild(nd);
  }

  // o: { kind:'spot'|'clue'|'case', title, cat, rarity, points, time, n, N, streak, teaser, caseTitle }
  show(o) { this.queue.push(o); if (!this.busy) this.next(); }
  next() {
    const o = this.queue.shift();
    if (!o) { this.busy = false; return; }
    this.busy = true;
    const el = this.el;
    const r = o.rarity || 'common';
    const card = document.createElement('div');
    card.className = `pop-card ${o.kind || 'spot'} r-${r}`;
    const pct = o.N ? Math.round(100 * o.n / o.N) : 0;
    const prevPct = o.N ? Math.round(100 * Math.max(0, o.n - 1) / o.N) : 0;
    if (o.kind === 'clue' || o.kind === 'case') {
      card.innerHTML = `
        <div class="pop-tab">${o.kind === 'case' ? 'A new mystery' : 'New lead'}</div>
        <div class="pop-cat">${o.caseTitle || ''}</div>
        <div class="pop-title">${o.title}</div>
        ${o.sub ? `<div class="pop-sub">${o.sub}</div>` : ''}
        <div class="pop-stamp clue">${o.kind === 'case' ? 'Case opened' : 'Noted'}</div>
        ${o.points ? `<div class="pop-pts">+${o.points}</div>` : ''}
        ${o.N ? `<div class="pop-bar"><i style="width:${prevPct}%"></i></div><div class="pop-count">${o.n} of ${o.N} leads${o.teaser ? ' · ' + o.teaser : ''}</div>` : ''}`;
    } else {
      card.innerHTML = `
        <div class="pop-ribbon">${(RARITY[r] || RARITY.common).label}</div>
        <div class="pop-cat">${o.cat || ''}</div>
        <div class="pop-title">${o.title}</div>
        <div class="pop-sub">spotted at ${o.time || ''}</div>
        <div class="pop-stamp">Spotted!</div>
        <div class="pop-pts">+${o.points || 10}</div>
        ${o.streak > 1 ? `<div class="pop-streak">Streak ×${o.streak}</div>` : ''}
        <div class="pop-bar"><i style="width:${prevPct}%"></i></div>
        <div class="pop-count">${o.n} of ${o.N}${o.teaser ? ' · ' + o.teaser : ''}</div>`;
    }
    el.appendChild(card);
    const a = this.g.audio;
    requestAnimationFrame(() => card.classList.add('in'));
    setTimeout(() => { card.classList.add('stamped'); a.stamp && a.stamp(); }, 380);
    setTimeout(() => { const bar = card.querySelector('.pop-bar i'); if (bar) bar.style.width = pct + '%'; a.chime && a.chime(o.kind === 'clue' || o.kind === 'case' ? 'clue' : r); }, 620);
    const stay = this.queue.length ? 2600 : 4300;
    setTimeout(() => card.classList.add('out'), stay);
    setTimeout(() => { card.remove(); this.next(); }, stay + 450);
  }

  // the Courier's front page, for a solved case
  frontPage(o) {
    const pg = this.page;
    pg.innerHTML = `<div class="fp-paper">
      <div class="fp-mast">The Juniper Bay Courier</div>
      <div class="fp-date">EXTRA · Saturday Night, September 26, 1953 · Five Cents</div>
      <div class="fp-head">${o.headline}</div>
      <div class="fp-deck">${o.deck || ''}</div>
      <div class="fp-body">${o.body || ''}</div>
      <div class="fp-stamp">Case closed</div>
      <div class="fp-foot">+${o.points || 250} · ${o.solved} of ${o.total} mysteries solved · click to put it down</div>
    </div>`;
    pg.classList.remove('hidden');
    requestAnimationFrame(() => pg.classList.add('in'));
    this.g.audio.chime && this.g.audio.chime('solved');
    setTimeout(() => { pg.classList.add('stamped'); this.g.audio.stamp && this.g.audio.stamp(); }, 900);
    this._pageT = setTimeout(() => this.closePage(), 16000);
  }
  closePage() { clearTimeout(this._pageT); this.page.classList.remove('in', 'stamped'); setTimeout(() => this.page.classList.add('hidden'), 400); }

  // "something on your list is close by…"
  nudge(text) {
    const el = this.nudgeEl;
    el.textContent = text;
    el.classList.remove('hidden');
    requestAnimationFrame(() => el.classList.add('in'));
    clearTimeout(this._nudgeT);
    this._nudgeT = setTimeout(() => { el.classList.remove('in'); setTimeout(() => el.classList.add('hidden'), 500); }, 3600);
    const btn = document.getElementById('btn-diary');
    if (btn) { btn.classList.remove('wiggle'); void btn.offsetWidth; btn.classList.add('wiggle'); }
  }
}
