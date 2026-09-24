// Activity spots: places where a person can sit, stand, sleep, work, eat...
export class Spots {
  constructor() { this.list = []; this.byTag = new Map(); }
  add(s) {
    s.id = this.list.length;
    s.users = 0;          // number of people assigned (for allocation)
    this.list.push(s);
    for (const t of s.tags) { let a = this.byTag.get(t); if (!a) { a = []; this.byTag.set(t, a); } a.push(s); }
    return s;
  }
  tagged(tag) { return this.byTag.get(tag) || []; }
  get(id) { return this.list[id]; }
  // free public spot with tag, preferring least used
  claim(tag, rng, filter = null, max = 1) {
    const a = this.tagged(tag).filter((s) => s.users < max && (!filter || filter(s)));
    if (!a.length) return null;
    const s = a[Math.floor(rng.next() * a.length)];
    s.users++;
    return s;
  }
}
