// What people say. Every townsperson gets a bio and 4–6 personal lines built from who they are —
// their family's heritage and the year it came, their household (by name), their job and street,
// a keepsake, what they remember at their age, an opinion, a bit of gossip, what they wrote for
// the time capsule. Notables (sim/roster.js) keep their own curated bio and lines.
// Activity pools give overheard chatter (with time-of-day remarks); greetings depend on the hour.
// All data lives in sim/lines.js. No three.js here — this runs in Node for tests.
import { RNG } from '../core/rng.js';
import {
  HERITAGE, SURNAME_HERITAGE, MAYBE_BLACK, FOUNDING_NAMES, OFFSTAGE, MEMORIES, TEEN_LINES, KID_LINES, TODDLER_LINES,
  OPINIONS, CENTENNIAL, GOSSIP, OFF_JOBS, TRADE_OF, TRADE_LINES, PLANS, GREETINGS, TIME_TALK, ACT_LINES, JOB_LINES, ROLE_ALIAS,
} from './lines.js';

const SKIN = ['#f3d6bd', '#ecc6a4', '#e2b48e', '#d4a07a', '#bf8a62', '#a06a45', '#835236', '#653e28']; // as people/appearance.js
const YEAR = 1953;

// ---------------------------------------------------------------- small helpers
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const an = (w) => (/^[aeiou]/i.test(w) && !/^(one|uni|use|eu)/i.test(w) ? 'an' : 'a');
const yr = (y) => `'${String(y).slice(2)}`;
const listNames = (a) => (a.length <= 1 ? a.join('') : a.length === 2 ? `${a[0]} and ${a[1]}` : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`);
const NUM = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const num = (n) => (n >= 0 && n < 20 ? NUM[n] : n < 100 ? TENS[Math.floor(n / 10)] + (n % 10 ? '-' + NUM[n % 10] : '') : String(n));
// tidy: "Fish Co.." → "Fish Co." (but leave ellipses alone)
const tidy = (s) => String(s).replace(/(?<!\.)\.\.(?=\s|$)/g, '.');
function fill(s, v) { return String(s).replace(/\{(\w+)\}/g, (m, k) => (v[k] !== undefined && v[k] !== null ? v[k] : m)); }
// lines tagged 'F|' / 'M|' are only for that sex
function forSex(list, sex) {
  const out = [];
  for (const l of list) {
    if (l.startsWith('F|')) { if (sex === 'F') out.push(l.slice(2)); } else if (l.startsWith('M|')) { if (sex === 'M') out.push(l.slice(2)); } else out.push(l);
  }
  return out;
}
const rnd = (r) => (typeof r === 'function' ? r : r && typeof r.next === 'function' ? () => r.next() : Math.random);

// ---------------------------------------------------------------- greetings (time of day)
export function greeting(minutes, r = Math.random) {
  const m = (((Number(minutes) || 0) % 1440) + 1440) % 1440;
  const band = GREETINGS.find(([a, b]) => m >= a && m < b) || GREETINGS[GREETINGS.length - 1];
  const pool = band[2];
  return pool[Math.floor(rnd(r)() * pool.length)];
}

// ---------------------------------------------------------------- overheard chatter
// activityLines(act) → pool of lines for that activity. When the game clock is known (passed in,
// or read from window.game), remarks about the hour's goings-on are woven in.
const merged = new Map();
function nowMinutes(minutes) {
  if (minutes !== undefined && minutes !== null && Number.isFinite(minutes)) return minutes;
  try { const g = globalThis.game; const m = g && g.clock ? g.clock.minutes : null; return Number.isFinite(m) ? m : null; } catch (e) { return null; }
}
export function activityLines(act, minutes) {
  if (!act) return null;
  const base = ACT_LINES[act] || null;
  const m0 = nowMinutes(minutes);
  if (m0 === null) return base && base.length ? base : null;
  const m = ((m0 % 1440) + 1440) % 1440;
  let key = '';
  for (let i = 0; i < TIME_TALK.length; i++) { const t = TIME_TALK[i]; if (m >= t[0] && m < t[1] && t[2].includes(act)) key += i + ','; }
  if (!key) return base && base.length ? base : null;
  const ck = act + '|' + key;
  let out = merged.get(ck);
  if (!out) {
    const extra = key.split(',').filter(Boolean).flatMap((i) => TIME_TALK[+i][3]);
    out = [];
    const b = base || [];
    // weave the hour's remarks in every third line so they come round often
    let j = 0;
    for (let i = 0; i < Math.max(b.length, extra.length * 3); i++) {
      if (i < b.length) out.push(b[i]);
      if (i % 3 === 2 || i >= b.length) { if (j < extra.length) out.push(extra[j++]); else if (i >= b.length) break; }
    }
    while (j < extra.length) out.push(extra[j++]);
    merged.set(ck, out);
  }
  return out.length ? out : null;
}

// what someone says about their work, by job role (or trade)
export function jobLines(role) {
  if (!role) return null;
  const k = String(role).toLowerCase().trim();
  return JOB_LINES[k] || JOB_LINES[ROLE_ALIAS[k]] || null;
}

// ---------------------------------------------------------------- who somebody is
function heritageKey(p, members) {
  const idx = (m) => SKIN.indexOf(m && m.look ? m.look.skin : '');
  const allDark = members.length > 0 && members.every((m) => idx(m) >= 5);
  const k = SURNAME_HERITAGE[p.last];
  if (allDark) return k === 'portuguese' ? 'capeverdean' : 'black';
  if (k) return k;
  if (MAYBE_BLACK.has(p.last) && idx(p) >= 5) return 'black';
  return 'yankee';
}

function tradeOf(bname) {
  for (const [re, k] of TRADE_OF) if (re.test(bname)) return k;
  return null;
}
function atBuilding(b) {
  const n = b.name || 'work';
  if (/Waterfront/.test(n)) return 'on the waterfront';
  if (/Gray Lady/.test(n)) return 'aboard the S.S. GRAY LADY';
  if (/^The /.test(n)) return 'at ' + n.replace(/^The /, 'the ');
  if (!/'s\b/.test(n) && /(Building|Library|Shed|Sheds|Post Office|High School|Savings Bank|Church|Harbor Master|Yacht Club|Cold Storage|Old Custom House\))$/.test(n)) return 'at the ' + n;
  return 'at ' + n;
}
const ROLE_TITLE = { 'boat hire': 'boatman', 'lunch counter': 'lunch-counter girl', 'boat man': 'boatman' };
function jobPhrase(job) {
  let t = (job.title || job.role || 'hand').trim();
  if (/^\w+ing\b/.test(t)) t = job.role || 'hand';
  t = ROLE_TITLE[t] || t;
  if (t === 'member') return `a member of ${(job.building && job.building.name) || 'the lodge'}`;
  if (/ at /.test(t)) return `${an(t)} ${t}`;
  if (/ of the /.test(t)) return `the ${t}`;
  return `${an(t)} ${t} ${atBuilding(job.building || {})}`;
}
function homePhrase(home) {
  if (!home || !home.building) return null;
  const b = home.building;
  if (home.lodger || /Pruitt's Rooms/.test(b.name)) return "a room at Mrs. Pruitt's on Main Street";
  if (b.kind === 'apartment') return `a flat in ${b.name.replace(/^The /, 'the ')}`;
  if (b.kind === 'hotel') return `a room at ${b.name.replace(/^The /, 'the ')}`;
  if (b.kind === 'shop' || home.above) return `the flat over ${b.name.replace(/^The /, 'the ')}`;
  return b.address || (b.lot && b.lot.street) || b.name;
}
// "packs sardines" → "pack sardines", "fishes" → "fish", "is a" → "am a"
function firstPerson(ph) {
  if (/^is /.test(ph)) return ph.replace(/^is /, 'am ');
  if (/^(\w+?)(sh|ch|x|ss)es\b/.test(ph)) return ph.replace(/^(\w+?)(sh|ch|x|ss)es\b/, '$1$2');
  if (/^(\w+[^aeiou])ies\b/.test(ph)) return ph.replace(/^(\w+[^aeiou])ies\b/, '$1y');
  return ph.replace(/^(\w+)s\b/, '$1');
}
function streetOf(home) { return home && home.building && home.building.lot ? home.building.lot.street || null : null; }
function gradeOf(age) { return ['kindergarten', 'first grade', 'second grade', 'third grade', 'fourth grade', 'fifth grade', 'sixth grade', 'seventh grade', 'eighth grade'][Math.max(0, Math.min(8, age - 5))]; }
function highSchoolYear(age) { return age <= 13 ? 'an eighth-grader at the Maple Street School' : age === 14 ? 'a freshman at Juniper Bay High' : age === 15 ? 'a sophomore at Juniper Bay High' : age === 16 ? 'a junior at Juniper Bay High' : 'a senior at Juniper Bay High'; }

// family relations inside the household
function kin(p, members) {
  const others = members.filter((m) => m !== p);
  const spouse = p.age >= 18 ? others.find((m) => m.age >= 18 && m.sex !== p.sex && Math.abs(m.age - p.age) <= 15) || null : null;
  const children = others.filter((m) => m.age <= p.age - 16 && m.age < 30).sort((a, b) => b.age - a.age);
  const parents = others.filter((m) => m.age >= p.age + 16);
  const siblings = others.filter((m) => !children.includes(m) && !parents.includes(m) && m !== spouse && Math.abs(m.age - p.age) < 16);
  return { spouse, children, parents, siblings };
}

// the family's story is shared by everyone in the household
function familyStory(p, H, key, fr) {
  const tpl = key === 'yankee' ? (FOUNDING_NAMES.has(p.last) ? H.came[0] : fr.pick(H.came.slice(1))) : fr.pick(H.came);
  const year = key === 'yankee' && FOUNDING_NAMES.has(p.last) ? 1853 : fr.int(H.years[0], H.years[1]);
  const place = fr.pick(H.places);
  const keepsake = fill(fr.pick(H.keepsakes), { place });
  return { tpl, year, place, keepsake };
}
function whoCame(p, story, married) {
  const born = YEAR - p.age;
  const ageThen = story.year - born;
  let who, bioWho;
  if (ageThen >= 16) { who = 'I'; bioWho = p.sex === 'F' ? 'she' : 'he'; }
  else if (ageThen >= 0) { who = 'My parents'; bioWho = p.sex === 'F' ? 'her parents' : 'his parents'; }
  else {
    const gap = born - story.year;
    const rel = gap < 25 ? 'father' : gap < 50 ? 'grandfather' : 'great-grandfather';
    who = `My ${rel}`; bioWho = `${p.sex === 'F' ? 'her' : 'his'} ${rel}`;
  }
  if (married && p.sex === 'F') { const gap = born - story.year; const rel = gap < 0 ? 'people' : gap < 25 ? 'father' : gap < 50 ? 'grandfather' : 'great-grandfather'; who = `My husband's ${rel}`; bioWho = `her husband's ${rel}`; }
  return { who, bioWho, ageThen };
}

function offstageChild(r) {
  const son = r.chance(0.5);
  const away = son ? r.pick(OFFSTAGE.away) : r.pick(OFFSTAGE.away.filter((a) => !/Army|Navy|Division|Devens/.test(a)));
  return `Our ${r.pick(son ? OFFSTAGE.male : OFFSTAGE.female)} is in ${away}. We get letters, and a telephone call at Christmas.`;
}
function notablesByLast(ctx) {
  if (!ctx) return new Map();
  if (ctx._notablesByLast) return ctx._notablesByLast;
  const m = new Map();
  const list = ctx.people && ctx.people.list ? ctx.people.list : [];
  for (const q of list) if (q.notable) { if (!m.has(q.last)) m.set(q.last, []); m.get(q.last).push(q); }
  ctx._notablesByLast = m;
  return m;
}

// ---------------------------------------------------------------- what somebody does all week
const RETIRED_FROM = ['on the cannery wharf', 'with the Boston & Juniper Bay railroad', "as a ship's carpenter at Bayside", 'teaching school', "at Harlow's", 'keeping the books at the Custom House', 'fishing out of Pier 3', 'on the Boston boat', 'at the telephone exchange', 'on the packing floor at Harbor Canning', 'with the Post Office', 'at the Savings Bank'];
// deterministic per person, so a child's "my dad packs sardines" matches Dad's own lines
function workOf(q, members) {
  const w = new RNG('work' + q.id);
  if (q.job) {
    const tk = q.job.building ? tradeOf(q.job.building.name || '') : null;
    const pool = [...(tk && TRADE_LINES[tk] ? TRADE_LINES[tk] : []), ...(jobLines(q.job.role) || []), ...(jobLines(q.job.outfit) || [])];
    return { kind: 'job', phrase: jobPhrase(q.job), third: `works ${atBuilding(q.job.building || {})}`, line: pool.length ? w.pick(pool) : null, years: Math.max(1, Math.min(q.age - 16, w.int(1, 32))) };
  }
  if (q.age < 18) return { kind: 'young', third: 'goes to school' };
  if (q.age >= 66) { const from = w.pick(RETIRED_FROM); return { kind: 'retired', from, third: `is retired — forty years ${from}` }; }
  const { spouse, children } = kin(q, members);
  if (q.sex === 'F' && (spouse || children.length) && w.chance(0.55)) return { kind: 'home', third: 'keeps house' };
  const oj = w.pick(OFF_JOBS[q.sex === 'F' ? 'f' : 'm']);
  return { kind: 'off', phrase: oj[0], third: oj[0], line: oj[1] };
}

// widows, widowers, bachelors and spinsters: a line and (sometimes) a sentence for the bio
const WAR_DEAD = { Moreau: 'René', Gould: 'Henry', Silva: 'Manuel', Beal: 'Robert' }; // husbands on the WWII honor roll at City Hall
function statusOf(p) {
  const r = new RNG('status' + p.id);
  if (p.sex === 'F') {
    if (p.age >= 60) {
      const y = r.int(1936, 1952), name = r.pick(OFFSTAGE.male);
      return r.pick([
        { line: `My ${name} passed in ${yr(y)} — his heart. ${cap(num(r.int(30, 45)))} years married, and I still set out two cups some mornings.`, bio: `Widow of ${name} ${p.last} (d. ${y}).` },
        { line: `I've been a widow since ${yr(y)}. You go on. The town doesn't let you not go on — somebody's always at the door with a casserole.`, bio: `A widow since ${y}.` },
        p.age >= 56 ? { line: 'My first husband died in the influenza in 1918, six weeks married. I married again in \'22 and buried him in \'47. I\'ve had a life, I\'ll tell you.', bio: 'Twice widowed — the first time in the influenza of 1918.' } : { line: `My ${name} passed in ${yr(y)}. I keep his pipe on the mantel. I don't know why. It smells like him.`, bio: `Widow of ${name} ${p.last}.` },
      ]);
    }
    if (p.age >= 28 && WAR_DEAD[p.last] && p.age < 50) return { line: `My husband ${WAR_DEAD[p.last]} is on the honor roll at City Hall — one of the twenty-three. I go and read his name on the first of every month. It's still there. So am I.`, bio: `War widow; her husband ${WAR_DEAD[p.last]} ${p.last} is on the World War II honor roll.` };
    if (p.age >= 28 && r.chance(0.3)) return { line: 'My husband went out with the dragger ESTHER M. in November of \'51 and she never came back. There\'s a list in gold leaf at Harbor Mutual. I don\'t go and look at it. I don\'t have to.', bio: 'Her husband was lost with the dragger ESTHER M. in November 1951.' };
    return { line: r.pick(['Just me and the cat. I like it fine. The cat likes it finer.', 'Never married. Came close twice. The second time he was a sailor, and you know how that goes.', 'Single, and I\'ll thank you not to tell my mother it\'s a centennial and I should find somebody.', 'Not married yet. My mother has opinions. My mother has nothing but opinions.']), bio: null };
  }
  if (p.age >= 60) { const y = r.int(1940, 1952), name = r.pick(OFFSTAGE.female); return r.pick([{ line: `My wife ${name} passed in ${yr(y)}. I eat at the Harbor Light most nights. Eleni knows my order.`, bio: `A widower since ${y}.` }, { line: 'I\'m a widower. I keep the house the way she had it. The neighbors think it\'s sad. It isn\'t. It\'s company.', bio: 'A widower.' }]); }
  return { line: r.pick(['Bachelor. Confirmed. My mother\'s still trying to un-confirm me.', 'Just me. I eat at the Harbor Light and sleep like a baby. There are worse lives.', 'Not married yet. There\'s a girl at the cannery office. Don\'t say anything.']), bio: null };
}

// ---------------------------------------------------------------- bios & lines
// Personal bio + lines for everyone. Notables keep their curated ones (lines: []).
export function bioFor(p, ctx) {
  if (p.notable && p.bio) return { bio: p.bio, lines: [] };
  const r = new RNG('bio' + p.id);
  const hh = p.household || null;
  const members = hh && hh.members && hh.members.length ? hh.members : [p];
  const home = p.home || null;
  const hb = home && home.building ? home.building : null;
  const key = heritageKey(p, members);
  const H = HERITAGE[key];
  const fr = new RNG('fam' + p.last + (hb ? hb.id : 'x' + p.id));
  const story = familyStory(p, H, key, fr);
  const { spouse, children, parents, siblings } = kin(p, members);
  const married = !!spouse;
  const came = whoCame(p, story, married);
  const where = homePhrase(home);
  const street = streetOf(home);
  const job = p.job || null;
  const kid = p.age < 13, teen = p.age >= 13 && p.age < 18, old = p.age >= 66;
  const lines = [];
  const bio = [];
  const him = p.sex === 'F' ? 'her' : 'his';
  const sabbath = H.church === "St. Brigid's" ? "St. Brigid's on the seventh" : key === 'jewish' ? 'the synagogue on the Salem road on Friday nights' : `Sundays at ${H.church}`;
  const work = kid || teen ? null : workOf(p, members);
  const status = !kid && !teen && !married && !p.commuter && !children.length ? statusOf(p) : null;
  const town = p.commuter ? new RNG('town' + p.id).pick(OFFSTAGE.towns) : null;
  const firsts = (a) => a.map((m) => m.first);

  // ---- bio: who they are
  const nm = `${p.first} ${p.last}`;
  if (kid) bio.push(`${nm}, ${p.age}${p.age >= 5 ? `, ${gradeOf(p.age)} at the Maple Street School` : ''}.`);
  else if (teen) bio.push(`${nm}, ${p.age}, ${highSchoolYear(p.age)}.`);
  else if (work.kind === 'job') bio.push(`${nm}, ${p.age}, ${work.phrase}.`);
  else if (work.kind === 'retired') bio.push(`${nm}, ${p.age}, retired after forty years ${work.from}.`);
  else if (work.kind === 'home') bio.push(`${nm}, ${p.age}, keeps house${where ? ` at ${where}` : ''}.`);
  else bio.push(`${nm}, ${p.age}, who ${work.phrase}.`);
  if (key === 'yankee' && FOUNDING_NAMES.has(p.last)) bio.push(`Old Yankee stock — the ${p.last}s have been here since the charter of 1853.`);
  else if (key === 'yankee') bio.push(`Yankee; ${came.bioWho} came to Juniper Bay from ${story.place} in ${story.year}.`);
  else if (key === 'black' && /since 1866/.test(story.tpl)) bio.push('The family has been in Juniper Bay since 1866.');
  else bio.push(`${H.label}; ${came.bioWho} came from ${story.place} in ${story.year}.`);
  if (p.commuter) bio.push(`Lives in ${town} and comes in to work.`);
  else if (kid || teen) {
    const ps = parents.length ? listNames(firsts(parents.slice().sort((a, b) => (a.sex === 'M' ? -1 : 1) - (b.sex === 'M' ? -1 : 1)))) : null;
    const sib = siblings.filter((m) => m.age < 18);
    bio.push(`${p.sex === 'F' ? 'Daughter' : 'Son'} of ${ps ? `${ps} ${p.last}` : `the ${p.last}s`}${where ? ` of ${where}` : ''}${sib.length === 1 ? `; ${p.sex === 'F' ? 'sister' : 'brother'} of ${sib[0].first}` : sib.length > 1 ? `; one of ${num(sib.length + 1)} children` : ''}.`);
  } else if (spouse && children.length) bio.push(`Lives${where ? ` at ${where}` : ''} with ${him} ${spouse.sex === 'F' ? 'wife' : 'husband'} ${spouse.first} and their ${children.length === 1 ? (children[0].sex === 'F' ? 'daughter' : 'son') : 'children'} ${listNames(firsts(children))}.`);
  else if (spouse) bio.push(`Lives${where ? ` at ${where}` : ''} with ${him} ${spouse.sex === 'F' ? 'wife' : 'husband'} ${spouse.first}.`);
  else if (where) bio.push(`${status && status.bio ? status.bio + ' ' : ''}Lives alone${/room|flat/.test(where) ? ' in ' : ' at '}${where}.`);
  else if (status && status.bio) bio.push(status.bio);
  bio.push(r.pick([`The family treasure is ${story.keepsake}.`, `Keeps ${story.keepsake} where the children can't reach it.`, `In the parlor: ${story.keepsake}.`, `Would save ${story.keepsake} first in a fire.`]));

  // ---- lines
  const elder = r.pick(H.elder);
  const vars = { place: story.place, year: story.year, Who: came.who, street: street || 'this street', elder };
  if (kid && p.age < 5) {
    lines.push(...r.shuffle(TODDLER_LINES.slice()).slice(0, 3));
    const mom = parents.find((m) => m.sex === 'F');
    lines.push(mom ? `That's my mommy. Her name is ${mom.first}.` : 'Fireworks go BOOM.');
    return { bio: tidy(bio.join(' ')), lines: lines.map(tidy) };
  }
  if (kid) {
    const dad = parents.find((m) => m.sex === 'M'), mom = parents.find((m) => m.sex === 'F');
    const grade = gradeOf(p.age);
    lines.push(r.pick([`I'm ${p.first}! I'm ${num(p.age)}!${p.age >= 5 ? ` I'm in ${grade === 'kindergarten' ? 'kindergarten' : 'the ' + grade}.` : ''}`, `Hi! I'm ${p.first} ${p.last}. I'm ${num(p.age)} and three-quarters. Well — and a little.`, `I'm ${p.first}. I live ${street ? 'on ' + street : 'right near here'}. Wanna see me do a cartwheel?`]));
    if (p.age === 8) lines.push("Miss Lee's my teacher. She can write on the blackboard with both hands. Well, one at a time.");
    else if (p.age === 9) lines.push("I'm in Miss Vance's room. We wrote letters for the time capsule! I asked if the Red Sox ever won the World Series. I bet they did by then.");
    else if (p.age >= 10) lines.push(`I wrote a letter for the time capsule! I asked ${r.pick(['if they have rocket ships', 'if dogs can talk yet', 'if people still eat Halloran\'s bread', 'if the lighthouse is still there', 'if they have flying cars', 'what the best television show is', 'if they still have school on Mondays, which they shouldn\'t'])}.`);
    const dw = dad ? workOf(dad, members) : null, mw = mom ? workOf(mom, members) : null;
    if (dad && mom) lines.push(`My dad ${dw.third}. My mom ${mw.kind === 'home' ? 'keeps house, which she says is the hardest job in Juniper Bay' : mw.third}. ${r.pick(['They both say I\'m going to college.', 'They met at a church supper. Ew.', 'Mom says Dad is the second-best at everything in the whole state. She won\'t say who\'s first.'])}`);
    else if (dad) lines.push(`My dad ${dw.third}. He can lift me with one arm.`);
    else if (mom) lines.push(`My mom's name is ${mom.first}. She makes the best pie on ${street || 'the street'}. Don't tell Mrs. Halloran.`);
    const sibs = siblings.filter((m) => m.age < 18);
    if (sibs.length) { const s = r.pick(sibs); const she = s.sex === 'F'; lines.push(s.age > p.age ? `My ${she ? 'sister' : 'brother'} ${s.first} is ${num(s.age)}. ${she ? 'She thinks she\'s' : 'He thinks he\'s'} the boss of me.` : `My little ${she ? 'sister' : 'brother'} ${s.first} is only ${num(s.age)}. ${she ? 'She' : 'He'} can't even whistle.`); }
    for (const l of r.shuffle(forSex(KID_LINES, p.sex))) { if (lines.length >= 5) break; lines.push(l); }
    return { bio: tidy(bio.join(' ')), lines: lines.map(tidy) };
  }
  if (teen) {
    lines.push(r.pick([`Hi. ${p.first} ${p.last}. I'm ${highSchoolYear(p.age)}.`, `${p.first}. ${cap(highSchoolYear(p.age))}. Don't ask me about algebra.`, `I'm ${p.first} ${p.last} — ${highSchoolYear(p.age)}, and not doing my homework today, it's the centennial.`]));
    const pool = r.shuffle(forSex(TEEN_LINES, p.sex));
    lines.push(pool[0], pool[1]);
    const oldCountry = key === 'yankee' || key === 'black' ? `${elder} says we've been here so long we've forgotten where we were before.` : `${elder} still says grace in the old language. I only know the amen.`;
    if (came.who !== 'I') lines.push(r.pick([`${key === 'yankee' && FOUNDING_NAMES.has(p.last) ? `The ${p.last}s were here for the charter in 1853` : `${came.who} came from ${story.place} in ${story.year}`}. ${oldCountry}`, `We've got ${story.keepsake} at home. ${elder} says it goes to whoever's the most responsible. So, not me.`]));
    lines.push(r.pick(["I wrote a letter to 2053 in Mr. Thorne's class. I asked if they still have homework. I hope they abolished it.", "I signed the Centennial Book with my whole name. In 2053 somebody will read it and wonder who I was. I'll be ancient!", pool[2]]));
    return { bio: tidy(bio.join(' ')), lines: lines.filter(Boolean).slice(0, 6).map(tidy) };
  }

  // ---- adults. 1: who I am
  if (work.kind === 'job' && p.commuter) lines.push(`${p.first} ${p.last}. I'm ${work.phrase}, but I come in from ${town}. Nice town. It hasn't got a harbor like this, though.`);
  else if (work.kind === 'job') lines.push(r.pick([`${p.first} ${p.last}. I'm ${work.phrase}. ${work.years > 1 ? `Going on ${num(work.years)} years.` : 'Just started this year.'}`, `Pleased to meet you — ${p.first} ${p.last}, ${work.phrase}${street ? `. We live over on ${street}` : ''}.`, `Name's ${p.first} ${p.last}. ${cap(work.phrase)}, six days a week, and ${sabbath}.`]));
  else if (work.kind === 'retired') lines.push(r.pick([`${p.first} ${p.last}. Retired — forty years ${work.from}. Now I supervise.`, `${p.first} ${p.last}. I was forty years ${work.from}. Now I sit on the porch and tell the young people what they're doing wrong.`]));
  else if (work.kind === 'home') lines.push(r.pick([`${p.first} ${p.last}. I keep house${where ? ` at ${where}` : ''}, which is to say I run the place.`, `${p.first} ${p.last}. Homemaker, they call it. Cook, nurse, bookkeeper, referee — they should call it that.`]));
  else lines.push(`${p.first} ${p.last}. I ${firstPerson(work.phrase)}.`.replace(/\bI am (a|an) /, "I'm $1 "));
  // 2: family
  if (spouse && children.length) {
    const kids = children.slice(0, 4);
    const kidsText = kids.length === 1 ? `${kids[0].first}, ${num(kids[0].age)}` : kids.slice(0, -1).map((k) => `${k.first}, ${num(k.age)}`).join('; ') + `; and ${kids[kids.length - 1].first}, ${num(kids[kids.length - 1].age)}`;
    const sw = workOf(spouse, members);
    const wife = spouse.sex === 'F' ? 'wife' : 'husband';
    lines.push(r.pick([
      `My ${wife} ${spouse.first} and I have ${kids.length === 1 ? 'one' : num(kids.length)}: ${kidsText}. ${kids.length === 1 ? r.pick([`${kids[0].sex === 'F' ? 'She' : 'He'} wants to stay up for the fireworks. We'll see.`, `${kids[0].sex === 'F' ? 'She\'s' : 'He\'s'} eaten a week's allowance of candy apples already.`, `I lost ${kids[0].sex === 'F' ? 'her' : 'him'} at the fair twice today. Found ${kids[0].sex === 'F' ? 'her' : 'him'} at the fire engine both times.`]) : r.pick(['Every one of them wants to stay up for the fireworks.', "The house is never quiet and I wouldn't have it any other way.", "They've eaten a week's allowance of candy apples already.", "I've lost them at the fair twice today. Found them at the fire engine both times."])}`,
      `${spouse.first} — that's my ${wife} — has ${kids.length === 1 ? kids[0].first : 'the children'} at the fair. ${kids[0].first} wants to ride on the fire engine. ${kids.length > 1 ? `${kids[1].first} wants whatever ${kids[0].first} wants.` : 'So do I, frankly.'}`,
      `My ${wife} ${spouse.first} ${sw.kind === 'home' ? 'keeps the house and the lot of us in line' : sw.third}. We've got ${kids.length === 1 ? 'one' : num(kids.length)}: ${kidsText}.`,
    ]));
  } else if (spouse) {
    const yrs = Math.max(1, Math.min(p.age, spouse.age) - r.int(19, 26));
    const sw = workOf(spouse, members);
    lines.push(r.pick([
      `${spouse.first} and I have been married ${num(yrs)} years ${r.pick(['this spring', 'come Christmas', 'this June', 'last month'])}. ${yrs > 30 ? offstageChild(r) : r.pick(['Still holding hands at the pictures.', 'We met at a church supper. Chowder. Somebody spilled it on somebody. We still argue about who.', "No children yet. We're working on the house first."])}`,
      `My ${spouse.sex === 'F' ? 'wife' : 'husband'}, ${spouse.first}, is around here somewhere. ${yrs > 25 ? `After ${num(yrs)} years you stop keeping track and just know.` : 'Probably at the pie tent.'}`,
      `My ${spouse.sex === 'F' ? 'wife' : 'husband'} ${spouse.first} ${sw.kind === 'home' ? 'keeps the house, and me' : sw.third}. ${yrs > 30 ? offstageChild(r) : 'We\'ve got a little place and a big mortgage. Bayside Savings & Loan, God bless them.'}`,
    ]));
  } else if (p.commuter) lines.push(r.pick([`${town}'s fine, but you can't see a lighthouse from my kitchen window.`, 'I drive in along the shore road every morning. Some mornings I pull over just to look at the harbor.', `Everybody in ${town} is coming up for the fireworks tonight. I told them: park on Orchard Street, and walk.`]));
  else if (status) lines.push(status.line);
  // 3: what they remember
  const inTownSince = came.ageThen >= 0 ? story.year : YEAR - p.age; // they only remember what happened here after they arrived
  const mem = MEMORIES.filter(([a, b, , y]) => p.age >= a && p.age <= b && y >= inTownSince).map((m) => m[2]);
  if (mem.length) lines.push(r.pick(mem));
  // 4: where they come from
  const cameLine = fill(story.tpl, vars);
  const withUs = came.who === 'I' ? 'came with me' : 'came over with the family';
  lines.push(r.pick([
    `${cameLine} ${r.pick([`We still have ${story.keepsake}.`, `${cap(story.keepsake)} ${withUs}. It's the whole inheritance, and it's plenty.`, `If the house burned tomorrow, the first thing out the door would be ${story.keepsake}. After the children. Probably after the children.`])}`,
    cameLine,
  ]));
  // 5: work
  if (work.line) lines.push(work.line);
  // 6: relatives, an opinion, the day, gossip, the capsule
  const extras = [];
  const rel = notablesByLast(ctx).get(p.last);
  if (rel && rel.length && !members.some((m) => m.notable)) {
    const n = r.pick(rel);
    extras.push(`${n.first} ${n.last}? ${married && p.sex === 'F' ? "My husband's" : 'My'} ${r.pick(['cousin', 'second cousin', "cousin on my father's side", 'cousin, twice removed or thereabouts'])}. ${r.pick(['We see each other at weddings and funerals, same as everybody.', "Different branch of the family. We don't talk about why.", 'Same great-grandfather, different opinions about everything.', "Every time somebody hears my name they ask if I'm related. I am, but only on holidays.", `Good egg. Don't tell ${n.sex === 'F' ? 'her' : 'him'} I said so.`])}`);
  }
  extras.push(r.pick(OPINIONS));
  const avoid = new Set([p.last, ...members.map((m) => m.last)]);
  const gossip = GOSSIP.filter((g) => !g.about.some((a) => avoid.has(a)));
  if (gossip.length) extras.push(r.pick(gossip).text);
  extras.push(r.pick(old ? PLANS.old : PLANS.adult));
  const cen = CENTENNIAL.filter((c) => !c.includes('{child}') || children.length);
  extras.push(fill(r.pick(cen), { child: children.length ? children[0].first : '' }));
  const want = r.int(5, 6);
  // keep the relative (if any) and one of opinion/gossip; the rest by chance
  const head = extras.slice(0, rel && rel.length && !members.some((m) => m.notable) ? 1 : 0);
  for (const e of [...head, ...r.shuffle(extras.slice(head.length))]) { if (lines.length >= want) break; lines.push(e); }
  let out = lines.filter(Boolean);
  const spare = [...OPINIONS, ...CENTENNIAL.filter((c) => !c.includes('{child}'))];
  while (out.length < 4) out.push(spare[(p.id + out.length) % spare.length]);
  out = out.slice(0, 6);
  return { bio: tidy(bio.join(' ')), lines: out.map(tidy) };
}

export { ACT_LINES, JOB_LINES };
