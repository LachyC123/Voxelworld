// The day's happenings. run(ctx, ev, E) returns false if the place isn't built.
// Times are for Saturday, September 26, 1953. See sim/events.js for the EventKit API.

const adult = (p) => p.age >= 18;
const BAND = { hat: 'hat_band', hatTint: '#9a2a2a', hatTint2: '#d9b24a', torso: 7, arm: 2, top: '#9a2a2a', top2: '#d9b24a', bottom: '#1f2a44' };
const ROBE = { torso: 10, arm: 0, top: '#5a1f2a', hat: null, skirt: 2, bottom: '#5a1f2a' };
const notKid = (p) => p.age >= 13;

export const EVENT_DEFS = [
  {
    id: 'bakery', title: 'Ovens fired at Halloran & Sons', place: 'Halloran & Sons Bakery', start: '4:30', end: '7:00', icon: '🍞',
    blurb: '400 centennial loaves, each stamped with the town seal.',
    run(ctx, ev, E) { return !!E.building(ev.place); },
  },
  {
    id: 'fleet', title: 'The fishing fleet comes in', place: 'Castellano Fish Co.', start: '6:00', end: '8:30', icon: '⚓',
    blurb: 'Haddock, mackerel and a few lobsters. Gulls everywhere.',
    run(ctx, ev, E) {
      const b = E.building(ev.place); if (!b) return false;
      const work = E.spots(b, 'dock_work').concat(E.tagged('dock_work'));
      if (!work.length) return true;
      E.crowd(6, '5:50', '8:30', work, (p, i) => (i % 2 ? 'carry' : 'counter'), { filter: (p) => p.sex === 'M' && p.age > 18 && p.age < 60, label: 'Unloading the catch' });
      return true;
    },
  },
  {
    id: 'fair', title: 'Harbor Days Centennial Fair', place: 'Founders Square', start: '10:00', end: '19:00', icon: '🎪',
    blurb: 'Stalls, pies, ring toss, candy apples, the Harbor Days Band — and half the town.',
    run(ctx, ev, E) {
      const stalls = E.tagged('stall_keeper');
      stalls.forEach((s, i) => { const [p] = E.recruit(1, '9:40', '19:10', adult); E.block(p, '9:40', '19:10', s, 'counter', { label: 'Minding a fair stall', lines: ['Candy apples! Five cents!', 'Try your luck — three rings for a dime!', 'Centennial pennants, get your pennants!', 'Pie by the slice! Irene Halloran\'s apple — it\'s gone quick!', 'Step right up!'].slice(i % 3, i % 3 + 3) }); });
      const band = E.tagged('band');
      if (band.length) {
        const acts = ['trumpet', 'trombone', 'tuba', 'clarinet', 'drum', 'trumpet', 'clarinet', 'trombone'];
        E.recruit(band.length, '13:00', '17:20', (p) => p.age > 14 && p.age < 70).forEach((p, i) => E.block(p, '13:00', '17:20', band[i], acts[i % acts.length], { label: 'Playing with the Harbor Days Band', costume: BAND }));
      }
      return true;
    },
  },
  {
    id: 'cat', title: 'Engine Co. No. 1 vs. Admiral the cat', place: 'Hatch Residence', start: '11:00', end: '11:45', icon: '🐈',
    blurb: 'Mrs. Hatch\'s cat is up the maple again. The firemen have brought the ladder.',
    run(ctx, ev, E) {
      const hh = E.household('cat'); if (!hh) return false;
      ev.place = hh.home.building.name;
      const tree = E.spots(hh.home.building, 'cat_tree');
      const yard = tree.length ? tree : hh.home.yard || [];
      const mrs = hh.members[0];
      if (yard.length) E.block(mrs, '10:50', '11:50', yard[0], 'wave', { lines: ['Admiral! Come down, you silly thing!', 'He\'s done this four times since Easter.', 'Oh, be careful with him, he bites.'] });
      const watchers = E.recruit(6, '11:00', '11:45', (p) => p.age < 14 || p.age > 60);
      const spots = E.spots(hh.home.building, 'watch_cat');
      watchers.forEach((p) => E.block(p, '11:02', '11:45', spots.length ? E.rng.pick(spots) : yard[0], 'cheer', { label: 'Watching the cat rescue' }));
      return true;
    },
  },
  {
    id: 'wedding', title: 'Wedding of Helen Novak & Robert Brennan', place: 'St. Brigid\'s Church', start: '14:00', end: '15:00', icon: '💒',
    blurb: 'Father Garrity officiating. The bride\'s mother sewed every one of the 212 seed pearls.',
    run(ctx, ev, E) {
      const church = E.building(ev.place); if (!church) return false;
      const pews = E.spots(church, 'pew'), couple = E.spots(church, 'altar_couple'), priest = E.spots(church, 'altar_priest');
      const bride = E.person('Helen', 'Novak'), groom = E.person('Robert', 'Brennan'), father = E.person('Francis', 'Garrity');
      if (couple.length >= 2) { E.block(bride, '13:50', '15:05', couple[0], 'stand', { held: 'bouquet', lines: ['I do.', 'I will.'] }); E.block(groom, '13:45', '15:05', couple[1], 'stand', { lines: ['I do.', 'With this ring...'] }); }
      if (priest.length) E.block(father, '13:30', '15:10', priest[0], 'speech', { lines: ['Dearly beloved, we are gathered here today...', 'Do you, Helen, take Robert...', 'What God has joined together, let no man put asunder.', 'You may kiss the bride.'] });
      const fam = ['Novak', 'Brennan'];
      const guests = E.recruit(pews.length ? Math.min(pews.length, 60) : 0, '13:40', '15:00', notKid, (p) => fam.includes(p.last));
      guests.forEach((p, i) => E.block(p, '13:35', '15:00', pews[i], 'listen_sit', { label: 'At the Novak–Brennan wedding' }));
      // reception at the parish hall
      const hall = E.building('St. Brigid\'s Rectory & Parish Hall');
      if (hall) {
        const tables = E.spots(hall, 'reception'), dance = E.spots(hall, 'reception_dance');
        const all = [bride, groom, ...guests].filter(Boolean);
        all.forEach((p, i) => { const s = tables[i % Math.max(1, tables.length)]; if (s) E.block(p, '15:20', '18:30', s, i % 3 ? 'eat' : 'talk_sit', { label: 'At the wedding reception' }); });
        if (dance.length) all.slice(0, dance.length).forEach((p, i) => E.block(p, '17:00', '18:30', dance[i], 'dance', { label: 'Dancing at the reception' }));
      }
      return true;
    },
  },
  {
    id: 'birthday', title: 'Susie Moreau\'s 7th birthday party', place: 'Moreau Residence — 14 Maple Street', start: '14:00', end: '17:00', icon: '🎂',
    blurb: 'Musical chairs at 2:30, cake at 3:30, and nobody cries. That\'s the plan.',
    run(ctx, ev, E) {
      const hh = E.household('birthday'); if (!hh) return false;
      const b = hh.home.building; ev.place = b.name;
      const party = E.spots(b, 'party'), yard = E.spots(b, 'party_yard'), cake = E.spots(b, 'cake');
      const susie = hh.members.find((m) => m.first === 'Susie');
      const kids = E.recruit(9, '14:00', '17:00', (p) => p.age >= 5 && p.age <= 9 && p !== susie);
      const all = [susie, ...kids];
      // 2:00 arrive & play in the yard, 3:30 cake at the table
      all.forEach((k, i) => {
        const costume = { hat: 'hat_party', hatTint: ['#e05a8a', '#5a8ae0', '#e0c040', '#6ac06a'][i % 4], hatTint2: '#f0ece2' };
        if (yard.length) E.block(k, '14:00', '15:25', yard[i % yard.length], ['play', 'play_ball', 'jump_rope', 'play'][i % 4], { label: 'At Susie\'s birthday party', lines: ['Happy birthday, Susie!', 'Tag! You\'re it!', 'Is it cake time yet?'], costume });
        if (party.length) E.block(k, '15:25', '17:00', party[i % party.length], i === 0 ? 'blow_candles' : 'clap_sit', { label: 'Birthday cake!', costume });
      });
      E.convo(all, '15:25', '15:45', [[0, '♪ Happy birthday to you... ♪'], [1, '♪ Happy birthday to you... ♪'], [2, '♪ Happy birthday, dear Susie... ♪'], [3, '♪ Happy birthday to youuu! ♪'], [0, 'I made a wish!'], [4, 'What\'d you wish for?'], [0, 'I can\'t tell or it won\'t come true!']], true);
      const [henri, claire] = hh.members;
      if (cake.length) E.block(claire, '15:20', '16:00', cake[0], 'stand', { held: 'cake_knife', lines: ['Who wants a corner piece?', 'Paul, get down from there!'] });
      if (party.length) E.block(henri, '14:00', '17:00', yard[0] || party[0], 'photograph', { lines: ['Everybody say cheese!', 'Hold still — one more!'] });
      return true;
    },
  },
  {
    id: 'choir', title: 'Choir practice for the Centennial service', place: 'First Congregational Church', start: '16:00', end: '17:30', icon: '🎵',
    blurb: 'Mr. Pruitt at the organ, Ruth Freeman on the solo. "Now Thank We All Our God."',
    run(ctx, ev, E) {
      const church = E.building(ev.place); if (!church) return false;
      const risers = E.spots(church, 'choir'), dir = E.spots(church, 'choir_director')[0], organ = E.spots(church, 'organ')[0];
      if (!risers.length) return false;
      const ruth = E.person('Ruth', 'Freeman'), pruitt = E.person('Leonard', 'Pruitt');
      const singers = [ruth, ...E.recruit(risers.length - 1, '15:50', '17:30', (p) => p.age >= 16 && p.age <= 78 && p !== ruth)].filter(Boolean);
      singers.forEach((p, i) => E.block(p, '15:55', '17:30', risers[i], 'sing', { label: 'Choir practice', costume: ROBE }));
      if (organ && pruitt) E.block(pruitt, '15:45', '17:40', organ, 'organ', { label: 'At the organ' });
      if (dir) { const [d] = E.recruit(1, '15:50', '17:35', (p) => p.age > 35 && p.sex === 'F'); if (d) E.block(d, '15:50', '17:35', dir, 'conduct', { label: 'Directing the choir', lines: ['Altos, you\'re dragging!', 'From the top, please.', 'Beautiful — Ruth, hold that note.', 'Breathe at the comma, not before.'] }); }
      const verses = [
        '♪ Now thank we all our God, with heart and hands and voices ♪',
        '♪ Who wondrous things hath done, in whom his world rejoices ♪',
        '♪ Who, from our mothers\' arms, hath blessed us on our way ♪',
        '♪ With countless gifts of love, and still is ours today ♪',
        '♪ Shall we gather at the river, where bright angel feet have trod ♪',
        '♪ Blest be the tie that binds our hearts in Christian love ♪',
      ];
      E.convo(singers, '16:00', '17:30', verses.map((v, i) => [i % singers.length, v]), true);
      const listeners = E.spots(church, 'pew');
      E.crowd(5, '16:10', '17:15', listeners.slice(0, 20), 'listen_sit', { filter: (p) => p.age > 50, label: 'Listening to the choir' });
      return true;
    },
  },
  {
    id: 'speech', title: 'Mayor Pemberton\'s Centennial Address & the Time Capsule', place: 'Founders Square', start: '17:30', end: '18:05', icon: '🎙',
    blurb: 'Eleven pages, cut to six. Miss Augusta Whitcomb seals the capsule, to be opened in 2053.',
    run(ctx, ev, E) {
      const pod = E.tagged('podium')[0]; if (!pod) return false;
      const mayor = E.person('Walter', 'Pemberton'), aug = E.person('Augusta', 'Whitcomb');
      E.block(mayor, '17:15', '18:10', pod, 'speech', { label: 'Giving the Centennial address', lines: [
        'Fellow citizens of Juniper Bay!', 'One hundred years ago, Captain Elias Whitcomb anchored in this cove...', 'Two hundred and twelve souls. Eleven houses. A salt house and a chapel.',
        'We have weathered the Great Gale, the Great Fire, the hurricane of \'38...', 'We remember the eleven of the MARY ELLEN, and every son and daughter who did not come home.', 'And into this capsule we place our letters to the people of 2053.', 'May they find us steadfast — in fair weather and foul!'] });
      const guests = E.tagged('stage_guest');
      if (guests.length && aug) E.block(aug, '17:10', '18:10', guests[0], 'stand', { lines: ['Be kind to us, 2053.', 'My great-grandfather would have wept.'] });
      const others = [E.person('Eleanor', 'Pemberton'), E.person('Theodore', 'Ashby'), E.person('Francis', 'Garrity')].filter(Boolean);
      others.forEach((p, i) => { if (guests[i + 1]) E.block(p, '17:15', '18:10', guests[i + 1], 'listen', {}); });
      const crowd = E.tagged('crowd_speech');
      E.crowd(Math.min(140, crowd.length * 3), '17:20', '18:05', crowd, (p, i) => (i % 5 === 0 ? 'clap' : 'listen'), { label: 'Listening to the Mayor', stagger: 12 });
      return true;
    },
  },
  {
    id: 'tvdinner', title: 'Supper in front of the television', place: 'Halloran Residence', start: '18:00', end: '19:30', icon: '📺',
    blurb: 'The Hallorans\' new 21-inch Admiral. Grandma Bridget disapproves loudly.',
    run(ctx, ev, E) {
      const hh = E.household('tv_dinner'); if (!hh) return false;
      ev.place = hh.home.building.name;
      E.convo(hh.members, '18:00', '19:30', [
        [1, 'Tommy, napkin.'], [3, 'Can we watch "The Lone Ranger" after?'], [4, 'In my day we said grace at the table. At a TABLE.'], [0, 'Ma, it\'s the centennial. Let the kids have it.'],
        [2, 'Pass the peas? Please?'], [1, 'Pat, the antenna — it\'s snowing again.'], [0, 'Hold your horses...'], [3, 'Hi-yo, Silver!'], [4, 'Humph.'], [2, 'Can I be excused? The sock hop—'], [1, 'Dishes first.'],
      ]);
      return true;
    },
  },
  {
    id: 'welcomehome', title: 'Welcome-home supper for Sal Castellano Jr.', place: 'Castellano Residence', start: '18:30', end: '21:00', icon: '🇺🇸',
    blurb: 'Home from Korea. Rosa has been cooking for three days.',
    run(ctx, ev, E) {
      const hh = E.household('welcome_home'); if (!hh) return false;
      ev.place = hh.home.building.name;
      const seats = hh.home.dine || [];
      const extra = E.recruit(Math.max(0, seats.length - hh.members.length), '18:30', '21:00', (p) => p.last === 'Castellano' || p.age > 40);
      const father = E.person('Francis', 'Garrity');
      const guests = [...hh.members, ...extra, father].filter(Boolean);
      guests.forEach((p, i) => { const s = seats[i % Math.max(1, seats.length)]; if (s) E.block(p, '18:30', '21:00', s, i % 2 ? 'eat' : 'talk_sit', { label: 'Welcome-home supper' }); });
      E.convo(guests, '18:30', '21:00', [[1, 'Mangia, mangia! You\'re skin and bones!'], [0, 'A toast! To my son, home safe.'], [2, 'Ma, I\'ve had three plates.'], [4, 'Bello...'], [3, 'Tell them about Pusan, Sal.'], [2, '...Maybe later. Pass the bread?'], [0, 'Salute!']]);
      return true;
    },
  },
  {
    id: 'baby', title: 'The Kaminski baby is on the way', place: 'St. Luke\'s Hospital', start: '13:00', end: '19:40', icon: '👶',
    blurb: 'Stan Kaminski has been pacing the waiting room since one. Baby expected any minute. (Any minute since one.)',
    run(ctx, ev, E) {
      const hosp = E.building(ev.place); if (!hosp) return false;
      const stan = E.person('Stan', 'Kaminski'), carol = E.person('Carol', 'Kaminski');
      const wait = E.spots(hosp, 'waiting')[0], bed = E.spots(hosp, 'maternity')[0], nursery = E.spots(hosp, 'nursery_window')[0];
      if (bed && carol) E.block(carol, '0:00', '23:59', bed, 'sleep', { label: 'In the maternity ward', noResume: true });
      if (wait && stan) E.block(stan, '12:40', '19:15', wait, 'pace', { label: 'Pacing the waiting room', lines: ['Any news? Any news yet?', 'Seven hours. Is that normal? That can\'t be normal.', 'I\'ve smoked a pipe I don\'t own.', 'Nurse? Nurse!'] });
      if (nursery && stan) E.block(stan, '19:15', '21:00', nursery, 'wave', { label: 'Meeting his daughter', lines: ['It\'s a girl! It\'s a girl! Seven pounds, two ounces!', 'We\'re calling her Rose. Rose Kaminski!', 'Look at her. Just look at her.'] });
      return true;
    },
  },
  {
    id: 'matinee', title: '"Roman Holiday" matinee', place: 'The Rialto', start: '14:00', end: '16:00', icon: '🎬',
    blurb: 'Audrey Hepburn, Gregory Peck. Twenty-five cents.',
    run(ctx, ev, E) {
      const b = E.building(ev.place); if (!b) return false;
      const seats = E.spots(b, 'theater');
      E.crowd(Math.min(seats.length, 40), '13:50', '16:00', seats, 'watch', { label: 'At the pictures — "Roman Holiday"', stagger: 8 });
      return true;
    },
  },
  {
    id: 'evening_show', title: '"Shane" — evening show', place: 'The Rialto', start: '19:30', end: '21:30', icon: '🎬',
    blurb: 'Alan Ladd. "Shane! Come back!"',
    run(ctx, ev, E) {
      const b = E.building(ev.place); if (!b) return false;
      const seats = E.spots(b, 'theater');
      E.crowd(Math.min(seats.length, 50), '19:20', '21:30', seats, 'watch', { label: 'At the pictures — "Shane"', stagger: 8, filter: notKid });
      return true;
    },
  },
  {
    id: 'sockhop', title: 'Centennial Sock Hop', place: 'Juniper Bay High School', start: '19:30', end: '22:30', icon: '💃',
    blurb: 'Shoes off in the gym. Records courtesy of Bishop Music Co.',
    run(ctx, ev, E) {
      const b = E.building(ev.place); if (!b) return false;
      const floor = E.spots(b, 'sockhop');
      E.crowd(Math.min(40, floor.length * 2), '19:30', '22:30', floor, (p, i) => (i % 4 === 3 ? 'talk' : 'dance_jitterbug'), { filter: (p) => p.age >= 14 && p.age <= 19, prefer: (p) => p.first === 'Peggy', label: 'At the Sock Hop' });
      return true;
    },
  },
  {
    id: 'streetdance', title: 'Street dance on Founders Square', place: 'Founders Square', start: '20:00', end: '22:30', icon: '🎶',
    blurb: 'The Harbor Days Band plays under the bunting and the new lamps.',
    run(ctx, ev, E) {
      const floor = E.tagged('dance'); if (!floor.length) return false;
      E.crowd(Math.min(80, floor.length * 2), '20:00', '22:30', floor, (p, i) => (i % 5 === 4 ? 'clap' : 'dance'), { filter: (p) => p.age >= 16, stagger: 20, label: 'Dancing on the square' });
      const band = E.tagged('band');
      const acts = ['trumpet', 'trombone', 'tuba', 'clarinet', 'drum', 'trumpet', 'clarinet', 'trombone'];
      E.recruit(band.length, '19:50', '22:40', (p) => p.age > 16 && p.age < 70).forEach((p, i) => E.block(p, '19:50', '22:40', band[i], acts[i % acts.length], { label: 'Playing for the street dance', costume: BAND }));
      return true;
    },
  },
  {
    id: 'fireworks', title: 'Centennial fireworks over the harbor', place: 'The waterfront', start: '21:00', end: '21:25', icon: '🎆',
    blurb: 'Best seen from the quay, the piers, or the beach.',
    run(ctx, ev, E) {
      const spots = E.tagged('fireworks'); if (!spots.length) return false;
      E.crowd(Math.min(160, spots.length * 3), '20:40', '21:35', spots, (p, i) => (i % 3 === 0 ? 'cheer' : 'look'), { stagger: 15, label: 'Watching the fireworks' });
      ev.x = 10; ev.z = 20;
      return true;
    },
  },
  {
    id: 'bluelantern', title: 'Earl Freeman Quartet — late set', place: 'The Blue Lantern', start: '21:00', end: '23:59', icon: '🎷',
    blurb: 'Piano, bass, drums, and a tenor sax from Providence.',
    run(ctx, ev, E) {
      const b = E.building(ev.place); if (!b) return false;
      const band = E.spots(b, 'club_band'), seats = E.spots(b, 'club');
      const earl = E.person('Earl', 'Freeman');
      const acts = ['piano', 'bass', 'drum_sit', 'trumpet'];
      band.forEach((s, i) => { const p = i === 0 && earl ? earl : E.recruit(1, '20:50', '23:59', (q) => q.age > 21 && q.age < 60)[0]; E.block(p, '20:50', '23:59', s, s.act || acts[i % 4], { label: 'Playing the late set' }); });
      E.crowd(Math.min(seats.length, 26), '21:00', '23:59', seats, (p, i) => (i % 3 ? 'drink' : 'talk_sit'), { filter: adult, stagger: 30, label: 'At the Blue Lantern' });
      return true;
    },
  },
  {
    id: 'presses', title: 'Presses roll for the Sunday Centennial edition', place: 'The Juniper Bay Courier', start: '21:30', end: '23:59', icon: '📰',
    blurb: '48 pages. Headline: CENTURY BY THE SEA.',
    run(ctx, ev, E) {
      const b = E.building(ev.place); if (!b) return false;
      const work = E.spots(b, 'press');
      E.crowd(work.length, '21:15', '23:59', work, (p, i) => (i % 2 ? 'wrench' : 'counter'), { filter: (p) => p.sex === 'M' && p.age > 18 && p.age < 60, label: 'Running the presses' });
      return true;
    },
  },
];
