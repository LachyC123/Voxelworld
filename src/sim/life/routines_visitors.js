// Out-of-town visitors up for Harbor Days: families, couples, old folks, sailors on liberty, a
// church ladies' outing, a scout troop, college kids, girls from the GE plant in Lynn. They come in
// on the 9:52 and the 12:40 at Union Station, or park out along Grand Avenue and walk in; they see
// the fair, the museum, the lighthouse, the beach, the harbor, the Rialto, have lunch at the diner
// or the Clam Shack, buy souvenirs, and leave on the 4:52 or the 7:30 — or stay for the fireworks
// and take the 10:05. An evening wave drives over from the North Shore just for the fireworks.
import { T, Trip, walkMin } from './routines_lib.js';

const pick = (r, a) => a[Math.floor(r.next() * a.length)];

// ------------------------------------------------------------------ where they come from
const TOWNS = {
  Worcester: { names: ['Lemieux', 'Kelleher', 'Johansson', 'Mahoney', 'Andrikos', 'Carlson'], how: 'down from Worcester', jobs: ['a machinist at Norton Company', 'a wire drawer at Washburn & Moen', 'a clerk at Denholm\'s'], line: 'Worcester\'s got the Common. You\'ve got the whole ocean. Hardly seems fair.' },
  Lowell: { names: ['Dubois', 'Pelletier', 'Sheehan', 'Mazur', 'Georgiou', 'Farrell'], how: 'over from Lowell', jobs: ['a loom fixer at the Boott Mills', 'a bookkeeper at the Lowell Sun', 'a streetcar man'], line: 'Lowell\'s all mills and canals. The children had never seen a lighthouse.' },
  Providence: { names: ['DiMaio', 'Almeida', 'Rafferty', 'Carvalho', 'Brennan-Hale', 'Sisson'], how: 'up from Providence', jobs: ['a jewelry polisher on Chalkstone Avenue', 'a draftsman at Brown & Sharpe', 'a teacher at Hope High'], line: 'Providence has the State House. You\'ve got a lighthouse. We\'ll call it even.' },
  Boston: { names: ['Murphy', 'O\'Brien', 'Rosenthal', 'Ferraro', 'Walsh', 'Kearns'], how: 'up from Boston', jobs: ['a motorman on the Dorchester line', 'a clerk at Filene\'s', 'a fireman at Engine 21'], line: 'From Dorchester. Two streetcars and a train, and worth every nickel.' },
  Portland: { names: ['Thibodeau', 'Libby', 'Rand', 'Merrill', 'Cyr', 'Chase'], how: 'down from Portland', jobs: ['a shipfitter at Bath Iron Works', 'a sardine packer in South Portland', 'a railroad telegrapher'], line: 'Portland, Maine. We\'ve got fog. You\'ve got fog. It\'s like home, only with pie.' },
  Brockton: { names: ['Keegan', 'Ferreira', 'Lundgren', 'Gallagher', 'Petrakis'], how: 'up from Brockton', jobs: ['a cutter at the Walk-Over shoe factory', 'a stitcher at Field & Flint'], line: 'Brockton makes the shoes. We came to wear them out.' },
  Lynn: { names: ['Hurley', 'Pappas', 'Nowak', 'Healey', 'Doucette'], how: 'up from Lynn', jobs: ['a winder at the GE River Works', 'a shoe laster'], line: 'Lynn, Lynn, city of sin — you never come out the way you went in. We\'re very nice, though.' },
  'Fall River': { names: ['Sousa', 'Pacheco', 'Leclerc', 'Medina'], how: 'up from Fall River', jobs: ['a weaver at the Border City Mill', 'a baker on Columbia Street'], line: 'Fall River\'s got more mills than Juniper Bay\'s got houses. It\'s nice to breathe.' },
  Nashua: { names: ['Roy', 'Gagne', 'Wheeler', 'Ouellette'], how: 'down from Nashua', jobs: ['a tool-and-die man at the Nashua Manufacturing', 'a teller at the Indian Head Bank'], line: 'Nashua, New Hampshire. We don\'t have an ocean. We have a river that thinks it\'s one.' },
};
const SHORE = {
  Gloucester: ['Tarantino', 'Oliveira', 'Pratt'], Ipswich: ['Choate', 'Kimball', 'Dodge'], Salem: ['Kiley', 'Novello', 'Pickering'], Beverly: ['Emerson', 'Lovett', 'Rafuse'],
  Rockport: ['Tarr', 'Babson', 'Parsons'], Newburyport: ['Coffin', 'Lunt', 'Toppan'], Marblehead: ['Gerry', 'Orne', 'Swasey'],
};

// ------------------------------------------------------------------ the day's visitors
// arrive: 'train1' 9:52, 'train2' 12:40, 'car' (time), 'train3' 19:30 (evening), leave: 'T452', 'T730', 'T1005', 'car' (time)
const DAY_PARTIES = [
  // the early train: in time to see the fleet unloading and the bakery at its busiest
  { kind: 'scouts', town: 'Worcester', arrive: 'train0', leave: 'T1005' },
  { kind: 'camera', town: 'Providence', arrive: 'train0', leave: 'T730' },
  { kind: 'old', town: 'Boston', arrive: 'train0', leave: 'T452' },
  { kind: 'family', town: 'Boston', arrive: 'train0', leave: 'T730', kids: 2 },
  // the 9:52
  { kind: 'church', town: 'Providence', arrive: 'train1', leave: 'T452' },
  { kind: 'family', town: 'Lowell', arrive: 'train1', leave: 'T452', kids: 3 },
  { kind: 'family', town: 'Worcester', arrive: 'train1', leave: 'T1005', kids: 2 },
  { kind: 'couple', town: 'Boston', arrive: 'train1', leave: 'T452' },
  { kind: 'couple', town: 'Lynn', arrive: 'train1', leave: 'T730' },
  { kind: 'couple', town: 'Boston', arrive: 'train1', leave: 'T1005' },
  { kind: 'old', town: 'Lowell', arrive: 'train1', leave: 'T730' },
  { kind: 'sailors', town: 'Boston', arrive: 'train1', leave: 'T1005', n: 4 },
  { kind: 'college', town: 'Boston', arrive: 'train1', leave: 'T730', n: 4 },
  { kind: 'kin', town: 'Worcester', arrive: 'train1', leave: 'T730', kids: 1, host: 'Halloran & Sons Bakery', hostName: 'Cousin Pat at the bakery' },
  // the 12:40
  { kind: 'family', town: 'Portland', arrive: 'train2', leave: 'T452', kids: 2, bags: true },
  { kind: 'family', town: 'Boston', arrive: 'train2', leave: 'T1005', kids: 3 },
  { kind: 'family', town: 'Lynn', arrive: 'train1', leave: 'T730', kids: 2 },
  { kind: 'couple', town: 'Nashua', arrive: 'train1', leave: 'T730' },
  { kind: 'couple', town: 'Lowell', arrive: 'train2', leave: 'T1005' },
  { kind: 'old', town: 'Fall River', arrive: 'train2', leave: 'T730' },
  { kind: 'sailors', town: 'Boston', arrive: 'train1', leave: 'T1005', n: 3 },
  { kind: 'girls', town: 'Lynn', arrive: 'train2', leave: 'T1005', n: 4 },
  { kind: 'kin', town: 'Brockton', arrive: 'train2', leave: 'T730', kids: 2, host: 'Castellano Fish Market', hostName: 'Uncle Vinnie at the fish market' },
  // by car, parked out along Grand Avenue
  { kind: 'family', town: 'Worcester', arrive: 'car', at: '8:42', leave: 'car', until: '17:10', kids: 3 },
  { kind: 'old', town: 'Worcester', arrive: 'car', at: '8:50', leave: 'car', until: '15:50' },
  { kind: 'couple', town: 'Worcester', arrive: 'car', at: '8:55', leave: 'car', until: '16:15' },
  { kind: 'family', town: 'Nashua', arrive: 'car', at: '8:49', leave: 'car', until: '15:40', kids: 2 },
  { kind: 'old', town: 'Lowell', arrive: 'car', at: '8:52', leave: 'car', until: '14:30' },
  { kind: 'couple', town: 'Brockton', arrive: 'car', at: '8:47', leave: 'car', until: '17:45' },
  { kind: 'family', town: 'Providence', arrive: 'car', at: '9:35', leave: 'car', until: '21:32', kids: 2 },
  { kind: 'family', town: 'Brockton', arrive: 'car', at: '10:05', leave: 'car', until: '18:20', kids: 2 },
  { kind: 'family', town: 'Nashua', arrive: 'car', at: '10:40', leave: 'car', until: '21:36', kids: 3 },
  { kind: 'family', town: 'Fall River', arrive: 'car', at: '11:20', leave: 'car', until: '19:05', kids: 1 },
  { kind: 'family', town: 'Portland', arrive: 'car', at: '9:50', leave: 'car', until: '16:40', kids: 2 },
  { kind: 'couple', town: 'Providence', arrive: 'car', at: '10:15', leave: 'car', until: '21:38' },
  { kind: 'couple', town: 'Nashua', arrive: 'car', at: '11:00', leave: 'car', until: '18:45' },
  { kind: 'old', town: 'Portland', arrive: 'car', at: '10:30', leave: 'car', until: '17:30' },
  { kind: 'old', town: 'Brockton', arrive: 'car', at: '12:30', leave: 'car', until: '18:30' },
  { kind: 'college', town: 'Providence', arrive: 'car', at: '11:30', leave: 'car', until: '21:40', n: 4 },
  { kind: 'family', town: 'Lowell', arrive: 'car', at: '13:05', leave: 'car', until: '21:33', kids: 2 },
  { kind: 'couple', town: 'Boston', arrive: 'car', at: '13:40', leave: 'car', until: '21:35' },
];
// the evening: carloads from the North Shore for the fireworks (some of them stuck behind a truck on 1A)
const EVE_PARTIES = [
  ...['Gloucester', 'Ipswich', 'Salem', 'Beverly'].map((town, i) => ({ kind: i % 3 === 0 ? 'couple' : 'family', town, arrive: 'car', at: `${9 + Math.floor((10 + i * 17) / 60)}:${String((10 + i * 17) % 60).padStart(2, '0')}`, leave: 'car', until: '21:40', kids: 1 + (i % 3), shore: true })),
  ...['Beverly', 'Newburyport', 'Marblehead', 'Gloucester', 'Ipswich', 'Rockport', 'Salem', 'Beverly'].map((town, i) => ({ kind: i % 2 ? 'couple' : 'family', town, arrive: 'car', at: `20:${String(44 + i * 2).padStart(2, '0')}`, leave: 'car', until: '21:45', kids: 2, shore: true, late: true })),
  { kind: 'couple', town: 'Lynn', arrive: 'train3', leave: 'T1005' },
  { kind: 'couple', town: 'Boston', arrive: 'train3', leave: 'T1005' },
  { kind: 'girls', town: 'Boston', arrive: 'train3', leave: 'T1005', n: 3 },
];

const TRAIN_IN = { train0: T('7:15'), train1: T('9:52'), train2: T('12:40'), train3: T('19:30') };
const TRAIN_OUT = { T452: [T('16:52'), '4:52'], T730: [T('19:30'), '7:30'], T1005: [T('22:05'), '10:05'] };

// ------------------------------------------------------------------ building the people
function makeParty(V, spec, idx) {
  const { L } = V, r = L.rng.fork('party' + idx);
  const town = spec.town, info = TOWNS[town] || null;
  const surname = pick(r, info ? info.names : SHORE[town] || ['Smith']);
  const how = info ? info.how : `over from ${town}`;
  const people = [];
  const add = (o) => { const p = L.newPerson({ ...o, visitor: true }); p.party = spec; people.push(p); return p; };
  const trainIn = spec.arrive.startsWith('train');
  const came = trainIn ? `came ${how} on the ${{ train0: '7:15', train1: '9:52', train2: '12:40', train3: '7:30' }[spec.arrive]}` : `drove ${how}`;
  const going = spec.leave === 'car' ? (T(spec.until) > T('21:00') ? 'staying for the fireworks' : 'driving home before dark') : `going home on the ${TRAIN_OUT[spec.leave][1]}`;
  const job = () => (info ? pick(r, info.jobs) : pick(r, ['a lobsterman', 'a clerk at the five-and-ten', 'a schoolteacher', 'a mechanic']));
  const tLine = info ? info.line : `${town}'s got its own fireworks, but ours are always the same. Came to see yours.`;
  if (spec.kind === 'family' || spec.kind === 'kin') {
    const a = r.int(29, 44);
    const dad = add({ last: surname, sex: 'M', age: a + r.int(0, 4), bio: `${'{n}'} ${surname}, from ${town}, ${job()}. ${cap1(came)} with his wife and children for Harbor Days; ${going}.`, lines: [tLine, 'First Saturday off since the Fourth. I intend to enjoy it if it kills me.', 'Don\'t tell the kids, but I want to see the fireworks more than they do.'] });
    const mom = add({ last: surname, sex: 'F', age: a, bio: `${'{n}'} ${surname}, from ${town}. Packed sandwiches at six this morning and has counted the children at every corner since.`, lines: ['Don\'t let go of that balloon. We are not buying another.', 'The pie contest\'s at three. I\'m only looking. Well — I\'m mostly looking.', 'Everybody\'s so friendly here. In ' + town + ' nobody says good morning.'] });
    for (let i = 0; i < (spec.kids || 2); i++) add({ last: surname, age: r.int(4, 12), bio: `${'{n}'}, from ${town}, up for the Centennial with the family.`, lines: pick(r, [['Is that a real lighthouse? Can we go up it?', 'I want cotton candy. And a balloon. And a lobster.'], ['Dad says if we\'re good we can stay for the fireworks!', 'The train went through a tunnel and my sister screamed.'], ['I saw a fishing boat with a dog on it!', 'Are we there yet? Oh. We are there.']]) });
    if (spec.kind === 'kin') { dad.bio += ` His cousin is ${spec.hostName.replace(/ at .*/, '')}.`; }
    void mom;
  } else if (spec.kind === 'couple') {
    const young = r.chance(0.6), a = young ? r.int(21, 28) : r.int(34, 55);
    const story = young ? pick(r, ['Engaged since August. The ring came from Shreve\'s, and she\'ll show you.', 'Married in June; this is the first trip they\'ve taken that wasn\'t a honeymoon.', 'Courting. He borrowed his brother\'s DeSoto and is praying it gets them home.']) : pick(r, ['Married twenty years this October. They came here on their honeymoon in 1933.', 'Her mother was born on Canal Street; she wanted to see the town at its hundredth.']);
    add({ last: surname, sex: 'M', age: a + r.int(0, 3), bio: `${'{n}'} ${surname}, ${job()}, ${came} with his ${young ? 'girl' : 'wife'}. ${story} ${cap1(going)}.`, lines: [tLine, young ? 'I\'m going to win her a kewpie doll at the ring toss if it takes my whole pay.' : 'We came here on our honeymoon in \'33. The Clam Shack was a shack then too.'] });
    add({ last: young && r.chance(0.5) ? pick(r, info ? info.names : ['Healy']) : surname, sex: 'F', age: a, bio: `${'{n}'}, from ${town}. ${story}`, lines: [young ? 'Isn\'t it the dearest little town? I could live here. I told him so.' : 'Nothing\'s changed but the prices. And the Mayor. And the Mayor\'s hat.', 'We\'re staying for the fireworks if we can. He says we\'ll see.'] });
  } else if (spec.kind === 'old') {
    const a = r.int(68, 80);
    const born = 1953 - a - r.int(-2, 2);
    add({ last: surname, sex: 'M', age: a + r.int(0, 3), look: {}, bio: `${'{n}'} ${surname}, ${a}, ${came}. Born on Orchard Street in ${born}, moved to ${town} for work in 1901. Saw the fiftieth in 1903; means to see the hundredth.`, lines: [`Born on Orchard Street in ${born}. The house is still there. Painted green, God help it.`, 'At the fiftieth, in 1903, they fired a cannon and broke every window on Harbor Street.', tLine] });
    add({ last: surname, sex: 'F', age: a, bio: `${'{n}'} ${surname}, ${a}, from ${town}. Wanted to see her mother-in-law's grave in the Old Burying Ground, and the pie tent, in that order.`, lines: ['His mother is buried in the Old Burying Ground. We\'ll pay our respects, then the pies.', 'Slowly, dear. The lighthouse isn\'t going anywhere and neither are my knees.'] });
  } else if (spec.kind === 'sailors') {
    const ships = ['USS Macon', 'USS Worcester', 'USS Salem', 'USS Des Moines'];
    const ship = pick(r, ships);
    for (let i = 0; i < (spec.n || 3); i++) add({ sex: 'M', age: r.int(18, 23), outfit: 'sailor', bio: `${'{n}'}, seaman, ${ship}, in at the Boston Navy Yard. Forty-eight hours of liberty and a train ticket to the Centennial.`, lines: pick(r, [['Liberty till Sunday midnight. We were promised pie and girls. So far, pie.', 'You can see the whole fleet from the lighthouse, they say. Two lobster boats and a dory.'], [`${ship}, out of Boston. My ma\'s from Salem, she says hello.`, 'There\'s a street dance tonight? Nobody tell the chief.'], ['First time off the ship in six weeks. The ground keeps moving.', 'Where\'s a fella get a lobster roll around here? Clam Shack? Lead the way.']]) });
  } else if (spec.kind === 'church') {
    add({ sex: 'M', age: r.int(50, 62), outfit: 'clergy', title: 'Reverend', last: 'Ames', first: 'Howard', bio: `The Reverend Howard Ames of Grace Church, Providence, shepherding the Women's Fellowship on its annual outing. Counts them at every corner. Has lost two already, both at the pie tent.`, lines: ['Eleven, twelve — where\'s Mrs. Carvalho? At the pie tent. Of course.', 'Ladies, the 4:52. Not the 4:53. There isn\'t a 4:53.'] });
    for (let i = 0; i < 8; i++) add({ sex: 'F', age: r.int(42, 72), last: pick(r, TOWNS.Providence.names.concat(['Sisson', 'Arnold', 'Brown', 'Greene'])), bio: `${'{n}'}, of the Women's Fellowship of Grace Church, Providence, on the annual outing.`, lines: pick(r, [['We came for the pie contest. As observers. Strictly as observers.', 'Reverend Ames counts us at every corner. He\'s only lost two.'], ['Providence has a harbor too, you know. Ours smells of the gas works.', 'Tea at Harlow\'s at half past two. It\'s in the program.'], ['I bought a Centennial spoon for my sister. She collects them, God help her.', 'Such a clean little town. You could eat off the sidewalks.']]) });
  } else if (spec.kind === 'scouts') {
    add({ sex: 'M', age: r.int(34, 46), outfit: 'scout', last: 'Lindgren', first: 'Walter', title: 'Mr.', bio: 'Walter Lindgren, Scoutmaster of Troop 14, Worcester — a draftsman at Norton Company in the week. Eight boys, one day, the lighthouse and back, and nobody goes in the water.', lines: ['Two by two, gentlemen. Nobody goes in the water. Nobody.', 'We hike to the lighthouse after lunch. Canteens full!'] });
    add({ sex: 'M', age: r.int(17, 19), outfit: 'scout', last: 'Mahoney', bio: 'Assistant Scoutmaster, Troop 14, Worcester. Eagle Scout, and carrying the troop\'s lunch in a suitcase since the 7:40.', lines: ['Sixteen sandwiches and a jar of pickles. I counted twice.'] });
    for (let i = 0; i < 8; i++) add({ sex: 'M', age: r.int(11, 13), outfit: 'scout', last: pick(r, TOWNS.Worcester.names.concat(['Nolan', 'Petersen', 'Grady', 'Rousseau'])), bio: `${'{n}'}, Troop 14, Worcester. Tenderfoot, working hard on Second Class.`, lines: pick(r, [['Troop 14, Worcester! We\'re hiking to the lighthouse!', 'I\'m working on my Pioneering badge. And my Eating badge.'], ['Mr. Lindgren says we can stay for the fireworks if nobody falls in.', 'I tied a bowline. It\'s holding up Jimmy\'s pants.']]) });
  } else if (spec.kind === 'college') {
    const girls = r.chance(0.5);
    for (let i = 0; i < (spec.n || 3); i++) add({ sex: girls ? 'F' : 'M', age: r.int(19, 21), bio: `${'{n}'}, ${girls ? 'a Radcliffe girl' : 'a Harvard man'}, ${came} with ${girls ? 'her' : 'his'} friends.`, lines: girls ? ['We\'re writing a paper on the American small town. Mostly we\'re eating.', 'Is it true the whole town is burying a time capsule? How divine.'] : ['Came for the Clam Shack. The Centennial\'s a bonus.', 'Our professor says towns like this are the backbone of the Republic. He\'s never been to one.'] });
  } else if (spec.kind === 'girls') {
    for (let i = 0; i < (spec.n || 3); i++) add({ sex: 'F', age: r.int(18, 24), bio: `${'{n}'}, ${town === 'Lynn' ? 'a winder at the GE River Works in Lynn' : 'a telephone operator in Boston'}, ${came} with the girls from work for the street dance and the fireworks.`, lines: pick(r, [['We heard there\'s a street dance. And sailors. Mostly the street dance.', 'Our mothers think we\'re on the 7:30. We\'re on the 10:05.'], ['I bought a Centennial pennant for my brother. He\'s in Korea. It\'ll get there by Christmas.', 'Look at the lights on the square! Lynn never did anything like it.']]) });
  } else if (spec.kind === 'camera') {
    add({ sex: 'M', age: r.int(40, 60), last: surname, bio: `${'{n}'} ${surname}, of the Providence Camera Club, ${came}. Eleven rolls of Kodachrome and an opinion about every one of them.`, lines: ['Providence Camera Club. I\'ve shot four rolls of the lighthouse. It hasn\'t moved yet.', 'The light off the harbor at four o\'clock. You wait. You\'ll see.'] });
  }
  for (const p of people) { p.bio = (p.bio || '').replace('{n}', `${p.first}`); p.lines = p.lines || []; }
  return people;
}
const cap1 = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// ------------------------------------------------------------------ places they go
function setupPlaces(V) {
  const { W, L } = V;
  // off stage: the platform (hidden, beside the train) and the edge of town on Grand Avenue
  const arrive = L.tagged('arrive').filter((s) => s.room);
  V.platform = [];
  for (const x of [196, 207, 218]) {
    const a = arrive.slice().sort((p, q) => Math.abs(p.x - x) - Math.abs(q.x - x))[0];
    if (a) V.platform.push(L.offstage(x, a.z - 6, { room: a.room, y: a.y, link: a.node, yaw: 0, label: 'On the train' }));
    else V.platform.push(L.offstage(x, -232, {}));
  }
  V.edge = [L.offstage(519, -62, { yaw: -Math.PI / 2 }), L.offstage(519, -78, { yaw: -Math.PI / 2 })];
  V.waitRoom = L.tagged('station').filter((s) => s.room);
  // lunch and supper
  V.eat = {
    diner: W.spotsIn('Harbor Light Diner', 'eat_out'), clam: W.spotsIn('The Clam Shack', 'eat_out'), lunchette: W.spotsIn('Station Luncheonette', 'eat_out'),
    woolcott: W.spotsIn("Woolcott's 5 & 10", 'eat_out'), tea: W.spotsIn("Harlow's", 'tea_room'), hotel: W.spotsIn('The Whitcomb Hotel', 'hotel_dining'), soda: W.spotsIn("Mayhew's Pharmacy & Soda Fountain", 'soda'),
  };
  V.museum = W.spotsIn('Maritime Museum (Old Custom House)', 'museum', 'browse');
  V.exhibit = W.spotsIn('Carnegie Library', 'browse');
  V.theater = W.spotsIn('The Rialto', 'theater');
  V.playland = L.tagged('play').filter((s) => !s.room && s.building && s.building.name === 'Playland Pier');
  V.graves = [...L.tagged('mourn'), ...W.spotsIn('Old Burying Ground', 'bench')].filter((s) => !s.room);
  V.pewsCong = W.spotsIn('First Congregational Church', 'pew');
  V.souvenir = [["Woolcott's 5 & 10", 'browse', 'Buying Centennial souvenirs at Woolcott\'s', 'flag_small'], ["Harlow's", 'browse', 'Shopping at Harlow\'s', null], ['Lowell Photography Studio', 'browse', 'Buying picture postcards at Lowell\'s', null], ['Pike & Daughter Books', 'browse', 'Buying a history of the town at Pike & Daughter', 'book'], ['Lantern Tobacco & News', 'browse', 'Buying postcards at Lantern Tobacco & News', 'newspaper'], ["Draper's Toys", 'browse', 'Looking at the toys in Draper\'s', null], ['Sweet Shoppe', 'browse', 'Buying salt-water taffy at the Sweet Shoppe', null]]
    .map(([n, tag, label, held]) => ({ n, spots: W.spotsIn(n, tag), label, held, P: W.place(n) })).filter((s) => s.spots.length && s.P);
  const lh = W.place('Whitcomb Point Light');
  V.lighthouse = lh ? W.outSpot(...xyz(lh.at(1.5, 7)), { faceTo: [lh.door.x - 6, lh.door.z], act: 'look', spread: 2.2 }, 'lighthouse') : null;
  const ch = W.place('City Hall');
  V.cityhall = ch ? W.outSpot(...xyz(ch.at(-3, 3)), { faceTo: [ch.door.x, ch.door.z], act: 'look', spread: 1.8 }, 'cityhall') : null;
  // on the beach, looking out at the water
  V.beach = [[25, 262], [50, 275], [80, 285], [105, 270], [8, 290], [120, 300]].map(([x, z], i) => W.outSpot(x, z, { yaw: 0, act: 'look', spread: 2.0 }, 'beach' + i));
  V.beachGate = W.outSpot(55, 233, { yaw: 0, act: 'look', spread: 1.2 }, 'beachgate');
  // watching the Mayor from the west side of the square, the dance from its edges, the fireworks from the shore
  V.speech = [[208, -48], [208, -38], [208, -28], [212, -20], [212, -56]].map(([x, z], i) => W.outSpot(x, z, { faceTo: [253, -36], act: 'listen', spread: 2.2 }, 'vspeech' + i));
  V.dance = [[148, -14], [148, -56], [242, -58], [240, -12]].map(([x, z], i) => W.outSpot(x, z, { faceTo: [194, -35], act: 'look', spread: 2.0 }, 'vdance' + i));
  V.fireworks = [[-3, 247], [0, 262], [2, 280], [4, 298], [20, 240], [35, 238], [60, 236], [28, 200], [26, 185], [8, 135], [8, 60], [8, -20]].map(([x, z], i) => W.outSpot(x, z, { faceTo: [-150, 120], act: 'look', spread: 2.4 }, 'vfw' + i));
  V.playlandGate = W.outSpot(-25, 234, { faceTo: [-60, 234], act: 'look', spread: 1.6 }, 'playgate');
  V.market = W.gather(W.place("Harlow's"));
}
const xyz = (q) => [q.x, q.z];

// ------------------------------------------------------------------ a party's day
function planParty(V, spec, people, idx) {
  const { W } = V, r = V.L.rng.fork('day' + idx);
  const kids = people.filter((p) => p.age < 13), grown = people.filter((p) => p.age >= 13);
  const old = spec.kind === 'old', big = people.length >= 6;
  const pace = old ? 0.62 : spec.kind === 'scouts' ? 0.85 : kids.length ? 0.76 : spec.kind === 'sailors' ? 0.92 : spec.kind === 'church' ? 0.7 : 0.8;
  const speed = Math.min(...people.map((p) => p.speed)) * pace;
  const trainIn = spec.arrive.startsWith('train');
  const off = trainIn ? V.platform[idx % V.platform.length] : V.edge[idx % V.edge.length];
  const tIn = trainIn ? TRAIN_IN[spec.arrive] + 1.5 + r.next() * 3 : T(spec.at);
  const byTrain = spec.leave !== 'car';
  const deadline = byTrain ? TRAIN_OUT[spec.leave][0] + 9 : T(spec.until);
  const trip = new Trip(W, people, tIn, { from: { x: off.x, z: off.z }, speed, lag: big ? 0.022 : 0.014 });
  // before they arrive: on the train / on the road, out of sight
  const where = trainIn ? `On the train from ${spec.town}` : `Driving ${TOWNS[spec.town] ? TOWNS[spec.town].how : 'over from ' + spec.town}`;
  people.forEach((p, i) => trip.E[i].push({ t: 0, spot: off, act: 'stand', label: where }));
  if (!trainIn) V.cars.push([tIn, deadline, idx, spec]);
  const bags = spec.bags ? 'suitcase' : null;
  const heldKid = (p) => (p.age < 13 ? pick(r, ['balloon', 'cotton_candy', 'flag_small', 'balloon', null]) : null);
  const kidHeld = new Map(kids.map((k) => [k, null]));
  const cam = spec.kind === 'camera' || (spec.kind !== 'church' && spec.kind !== 'scouts' && r.chance(0.3));
  const heldOf = (p, i) => {
    if (bags && p.age >= 18 && i < 2) return 'suitcase';
    if (p.age < 13) return kidHeld.get(p);
    if (i === 0 && cam) return 'camera';
    if (spec.kind === 'scouts' && p.age >= 17 && p.age < 20) return 'suitcase';
    if (old) return p.sex === 'M' ? 'cane' : 'handbag';
    return p.sex === 'F' ? 'handbag' : null;
  };
  const V2 = { ...V, trip, people, kids, grown, spec, r, heldOf, heldKid, kidHeld, home: off, deadline, limit: deadline };
  const done = new Set();
  let n = 0;
  const tryDo = (s) => { if (SIGHTS[s] && SIGHTS[s](V2)) { done.add(s); n++; return true; } return false; };
  // the fixed points of the day: lunch, the Mayor, supper, the dance, the fireworks
  const fixed = [];
  if (tIn < T('12:40') && deadline > T('13:10')) fixed.push({ k: 'lunch', from: T('11:40') + r.int(0, 50) });
  if (deadline >= T('18:10') && tIn < T('17:00')) fixed.push({ k: 'speech', from: T('17:14') + r.int(0, 6) });
  if (deadline >= T('19:40') && tIn < T('18:30')) fixed.push({ k: 'supper', from: T('18:05') });
  if (deadline >= T('21:27') && r.chance(0.6) && tIn < T('20:10')) fixed.push({ k: 'dance', from: T('19:55') + r.int(0, 20) });
  if (deadline >= T('21:27')) fixed.push({ k: 'fireworks', from: spec.late ? 0 : T('20:25') + r.int(0, 15) });
  const order = sightOrder(spec, r);
  if (spec.kind === 'kin') tryDo('kin');
  if (tIn < T('8:30')) { tryDo('fleet'); tryDo('breakfast'); tryDo('bakery'); }
  for (let guard = 0; guard < 200; guard++) {
    const t = trip.t;
    const walkOut = walkMin(trip.pos, off, speed);
    const leaveAt = deadline - 6 - walkOut;
    if (t >= leaveAt - 4) break;
    const nf = fixed.find((f) => !f.done);
    if (nf && t >= nf.from) {
      nf.done = true;
      V2.limit = deadline;
      tryDo(nf.k);
      continue;
    }
    V2.limit = Math.min(leaveAt, nf ? nf.from : leaveAt);
    if (V2.limit - t < 8) { trip.wait(Math.max(0, V2.limit - t)); continue; }
    let did = false;
    if (n > 0 && r.chance(0.8) && V2.limit - t > 30 && wander(V2, r.int(14, 28), nf)) continue;
    for (const s of order) {
      if (s === 'fair2' ? (!done.has('fair') || done.has('fair2')) : done.has(s)) continue;
      if (tryDo(s)) { did = true; break; }
    }
    if (did) continue;
    // nothing fits before the next thing: see a bit more of the town on foot
    if (!wander(V2, Math.min(V2.limit - t - 2, r.int(15, 30)), nf)) trip.wait(Math.max(1, Math.min(10, V2.limit - t)));
  }
  // off home: the platform, or back out along Grand Avenue to the car
  const walkOut = walkMin(trip.pos, off, speed);
  if (byTrain) {
    const leaveBy = TRAIN_OUT[spec.leave][0] + 9 - walkOut;
    if (leaveBy - trip.t > 6 && V.waitRoom.length) {
      const wr = W.pickN(V.waitRoom, people.length, leaveBy - 6, leaveBy);
      trip.to(wr, 0, { label: `Waiting for the ${TRAIN_OUT[spec.leave][1]} home`, act: () => r.pick(['wait', 'read', 'doze', 'sit']), held: heldOf });
      trip.t = Math.max(trip.t, TRAIN_OUT[spec.leave][0] + 3);
    } else if (leaveBy - trip.t > 0) trip.t = leaveBy;
    trip.to(off, 0, { label: `Catching the ${TRAIN_OUT[spec.leave][1]} home to ${spec.town}`, held: heldOf, act: 'stand' });
  } else {
    trip.t = Math.max(trip.t, deadline - walkOut);
    trip.to(off, 0, { label: spec.shore ? 'Walking back to the car' : `Walking back to the car for the drive home to ${spec.town}`, held: heldOf, act: 'stand' });
  }
  if (trip.t > 1438) return 0;
  trip.t0 = 0;
  trip.commit(1440, { noResume: true });
  return n;
}

// a walk to see more of the town (always fits): named for the street it mostly follows
const AVES = [[54, 'Harbor Street'], [134, 'Main Street'], [214, 'Lantern Avenue'], [294, 'Elm Street'], [374, 'Hillcrest Avenue']];
const STS = [[-210, 'Mill Street'], [-140, 'Canal Street'], [-70, 'Grand Avenue'], [0, 'Market Street'], [70, 'Church Street'], [140, 'Maple Street'], [210, 'Orchard Street']];
const STREET_WALK = {
  'Harbor Street': ['Walking along Harbor Street past the fish houses', 'Walking down Harbor Street to look at the boats', 'Reading the high-water marks from the \'38 hurricane'],
  'Main Street': ['Walking up Main Street', 'Walking down Main Street past the bank and the Rialto'],
  'Lantern Avenue': ['Walking up Lantern Avenue under the Centennial bunting', 'Following the trolley tracks up Lantern Avenue'],
  'Elm Street': ['Walking along Elm Street under the elms', 'Walking up Elm Street'],
  'Hillcrest Avenue': ['Admiring the old captains\' houses on Hillcrest Avenue', 'Walking up Hillcrest Avenue for the view'],
  'Mill Street': ['Walking along Mill Street past the station', 'Walking along Mill Street'],
  'Canal Street': ['Walking along Canal Street', 'Walking down Canal Street looking at the shops'],
  'Grand Avenue': ['Walking down Grand Avenue', 'Walking out Grand Avenue under the maples'],
  'Market Street': ['Strolling Market Street, looking at the shops', 'Walking down Market Street in the Centennial crowds'],
  'Church Street': ['Walking up Church Street to see the steeples', 'Walking along Church Street'],
  'Maple Street': ['Walking along Maple Street past the high school', 'Walking along Maple Street, admiring the gardens'],
  'Orchard Street': ['Strolling up Orchard Street under the old apple trees', 'Walking along Orchard Street'],
  shore: ['Walking along the waterfront', 'Walking out along the shore'],
};
function mainStreet(W, route) {
  const X = W.nav.x, Z = W.nav.z, len = {};
  for (let i = 1; i < route.length; i++) {
    const dx = X[route[i]] - X[route[i - 1]], dz = Z[route[i]] - Z[route[i - 1]], mx = (X[route[i]] + X[route[i - 1]]) / 2, mz = (Z[route[i]] + Z[route[i - 1]]) / 2;
    let name = null;
    if (Math.abs(dx) > Math.abs(dz)) { for (const [z, n] of STS) if (Math.abs(mz - z) < 14) name = n; } else { for (const [x, n] of AVES) if (Math.abs(mx - x) < 14) name = n; }
    const k = name || (mx < 45 || mz > 225 ? 'shore' : null);
    if (k) len[k] = (len[k] || 0) + Math.hypot(dx, dz);
  }
  let best = null, bl = 0; for (const [k, v] of Object.entries(len)) if (v > bl) { bl = v; best = k; }
  return best;
}
const PAUSE = {
  harbor: ['Looking out at the harbor', 'Watching the gulls over the fish houses', 'Watching a lobster boat come in'],
  town: ['Looking in a shop window', 'Reading a Centennial bill on a telephone pole', 'Admiring the bunting'],
  homes: ['Admiring the old houses', 'Admiring somebody\'s dahlias', 'Stopping to rest their feet', 'Looking at a house with a For Sale sign'],
};
const START = ['Deciding where to go next', 'Studying the Harbor Days program', 'Asking a local the way'];

function wander(V, mins, nf) {
  const { W, trip, r } = V;
  if (mins < 6) return false;
  const nd = W.L.walkNode(trip.pos.x, trip.pos.z, 60);
  if (nd < 0) return false;
  const x0 = W.nav.x[nd], z0 = W.nav.z[nd];
  const s = W.nodeSpot(nd);
  const metres = mins * trip.speed * 0.8 * 60 * 0.95;
  const near = nf && nf.k === 'fireworks' ? [{ x: 30, z: 200 }, { x: 40, z: 60 }, { x: 40, z: -60 }] : nf && (nf.k === 'speech' || nf.k === 'dance') ? [{ x: 200, z: -35 }, { x: 214, z: -110 }, { x: 150, z: 20 }] : nf && nf.k === 'lunch' ? [{ x: 70, z: 0 }, { x: 150, z: -150 }, { x: 45, z: 125 }] : [];
  // mostly downtown and the waterfront, now and then up among the houses
  const sights = [{ x: 50, z: -150 }, { x: 50, z: -20 }, { x: 50, z: 120 }, { x: 134, z: -100 }, { x: 214, z: -160 }, { x: 294, z: -100 }, { x: 180, z: 4 }, { x: 270, z: 4 }, { x: 214, z: -62 }, { x: 150, z: -140 }, { x: 110, z: 4 }, { x: 340, z: 4 },
    ...(r.chance(0.3) ? [{ x: 380, z: 0 }, { x: 294, z: 150 }, { x: 214, z: 200 }, { x: 380, z: -150 }] : [])];
  // somewhere roughly a walk's length away (the next fixed point first, if there is one)
  const fit = (a) => Math.abs(Math.abs(a.x - x0) + Math.abs(a.z - z0) - metres * 0.9);
  const aims = [...near.filter((a) => Math.hypot(a.x - x0, a.z - z0) > 60), ...r.shuffle(sights.filter((a) => Math.hypot(a.x - x0, a.z - z0) > 70)).sort((a, b) => fit(a) - fit(b)).slice(0, 4)];
  let route = null;
  for (const aim of aims) {
    route = W.route(s, metres, { to: aim, jitter: 6, within: 20 });
    if (route && route.len > metres * 0.5) break;
  }
  if (!route || route.len < 40) route = W.route(s, metres, {});
  if (!route || route.len < 40) return false;
  if (!trip.last || trip.last.node !== s.node) trip.to(s, 0.4, { label: r.pick(START), act: 'look', held: V.heldOf });
  const street = mainStreet(W, route.route);
  const label = r.pick(STREET_WALK[street] || ['Seeing the town on foot', 'Walking around town', 'Seeing the sights on foot']);
  trip.stroll(route, { label, held: V.heldOf });
  const ex = route.end.x, ez = route.end.z;
  const pause = r.pick(ex < 70 ? PAUSE.harbor : ex > 110 && ex < 320 && ez > -230 && ez < 30 ? PAUSE.town : ez > 60 || ex > 330 ? PAUSE.homes : ['Stopping to get their bearings', 'Looking around']);
  const end = W.nodeSpot(route.end.node);
  trip.to(end, r.int(1, 3), { label: V.spec.kind === 'camera' ? 'Taking a picture of the street' : pause, act: (p, i) => (i === 0 && V.heldOf(p, i) === 'camera' ? 'photograph' : 'look'), held: V.heldOf });
  return true;
}

function sightOrder(spec, r) {
  const k = spec.kind;
  const base = {
    family: ['fair', 'harbour', 'beach', 'playland', 'museum', 'souvenir', 'park', 'lighthouse', 'fair2', 'market', 'cityhall'],
    kin: ['fair', 'harbour', 'beach', 'souvenir', 'playland', 'fair2', 'park'],
    couple: ['harbour', 'fair', 'market', 'lighthouse', 'museum', 'beach', 'matinee', 'souvenir', 'park', 'cityhall', 'fair2', 'playland'],
    old: ['graves', 'fair', 'museum', 'exhibit', 'park', 'harbour', 'cityhall', 'matinee', 'souvenir', 'church'],
    sailors: ['harbour', 'fair', 'playland', 'beach', 'market', 'souvenir', 'fair2', 'lighthouse', 'museum'],
    church: ['fair', 'church', 'tea', 'museum', 'market', 'souvenir', 'exhibit', 'harbour', 'fair2'],
    scouts: ['museum', 'harbour', 'lighthouse', 'beach', 'fair', 'playland', 'park', 'fair2'],
    college: ['harbour', 'fair', 'museum', 'market', 'lighthouse', 'beach', 'souvenir', 'exhibit', 'fair2'],
    girls: ['fair', 'market', 'souvenir', 'beach', 'playland', 'harbour', 'fair2'],
    camera: ['harbour', 'lighthouse', 'fair', 'beach', 'market', 'cityhall', 'museum', 'fair2'],
  }[k] || ['fair', 'harbour', 'beach'];
  // keep the flavour but shuffle within pairs
  const out = base.slice();
  for (let i = 0; i + 1 < out.length; i += 2) if (r.chance(0.45)) [out[i], out[i + 1]] = [out[i + 1], out[i]];
  return out;
}

// every sight adds its stops to V.trip and returns true, or leaves the trip alone and returns false
const hurry = (V) => V.deadline;
function fitsThen(V, spot, dwell) { return V.trip.fits(spot, dwell, null, V.limit); }
function regroup(V, spot, label = null) {
  label = label || V.r.pick(['Waiting for the others', 'Gathering the party together', 'Counting heads']); if (spot && V.people.length > 1) V.trip.to(spot, 1.2, { label, act: 'look', held: V.heldOf }); }
function perPerson(V, spots) { return (p, i) => spots[i % Math.max(1, spots.length)]; }

const SIGHTS = {
  fair(V) {
    const { W, trip, r } = V;
    if (trip.t < T('9:55') || trip.t > T('18:20')) return false;
    const stops = r.int(2, 3);
    const dwells = Array.from({ length: stops }, () => r.int(6, 11) + (V.kids.length ? 2 : 0));
    const total = dwells.reduce((a, b) => a + b, 0) + stops * 2;
    if (!fitsThen(V, W.fair[0], total)) return false;
    for (const k of V.kids) V.kidHeld.set(k, V.heldKid(k));
    const what = ['Seeing the Harbor Days fair', 'Looking over the pies in the Auxiliary tent', 'Watching the ring toss', 'Browsing the stalls on Founders Square', 'Trying their luck at the fair'];
    for (let j = 0; j < stops; j++) {
      const eta = trip.t + trip.eta(W.fair[0]);
      const kidSpots = W.pickN(W.fairKids.length ? W.fairKids : W.fair, Math.max(1, V.kids.length), eta, eta + dwells[j]);
      const adSpots = W.pickN(W.fair, V.grown.length, eta, eta + dwells[j]);
      if (!adSpots.length) break;
      const label = V.spec.kind === 'scouts' ? 'Seeing the Harbor Days fair with Troop 14' : what[j === 0 ? 0 : r.int(1, what.length - 1)];
      trip.to((p) => (p.age < 13 ? kidSpots[V.kids.indexOf(p) % kidSpots.length] : adSpots[V.grown.indexOf(p) % adSpots.length]), dwells[j], {
        label, act: (p) => (p.age < 13 ? r.pick(['play', 'cheer', 'look']) : V.spec.kind === 'camera' ? 'photograph' : r.pick(['look', 'browse', 'talk', 'laugh', 'drink_stand', 'clap'])),
        held: (p, i) => (p.age >= 13 && r.chance(0.2) ? r.pick(['popcorn_box', 'hot_dog', 'cotton_candy']) : V.heldOf(p, i)),
      });
    }
    regroup(V, squareEdgeV(V), 'Rounding up the party by the square');
    return true;
  },
  fair2(V) { return SIGHTS.fair(V); },
  market(V) {
    const { W, trip, r } = V;
    const g = V.market; if (!g || trip.t < T('9:30') || trip.t > T('19:30')) return false;
    if (!fitsThen(V, g, 14)) return false;
    trip.to(g, 1, { label: 'Stopping outside Harlow\'s', act: 'look', held: V.heldOf });
    const rt = W.route(g, r.int(260, 480), { to: { x: r.chance(0.5) ? 340 : 60, z: 2 }, jitter: 2 });
    if (!rt || !trip.stroll(rt, { label: 'Strolling Market Street, looking in the shop windows', held: V.heldOf })) return true;
    return true;
  },
  harbour(V) {
    const { W, trip, r } = V;
    const q = W.quay.length ? W.outSpot(6.2, [-95, -40, 20, 70, 110][r.int(0, 4)], { yaw: -Math.PI / 2, act: 'look', spread: 1.6, faceTo: [-40, 0] }, 'vquay') : null;
    if (!q) return false;
    const dwell = r.int(8, 16);
    if (!fitsThen(V, q, dwell + 8)) return false;
    trip.to(q, dwell, { label: V.spec.kind === 'sailors' ? 'Sizing up the fishing fleet' : 'Watching the boats in the harbor', act: (p) => (V.spec.kind === 'camera' || (p.age >= 18 && r.chance(0.15)) ? 'photograph' : r.pick(['look', 'look', 'point', 'lean'])), held: V.heldOf });
    const rt = W.route(q, r.int(150, 320), { to: { x: 10, z: q.z + (r.chance(0.5) ? 260 : -260) } });
    if (rt) trip.stroll(rt, { label: 'Walking along the waterfront', held: V.heldOf });
    return true;
  },
  lighthouse(V) {
    const { trip, r } = V;
    const s = V.lighthouse; if (!s || trip.t > T('18:00')) return false;
    const dwell = r.int(8, 14);
    if (!fitsThen(V, s, dwell)) return false;
    trip.to(s, dwell, { label: V.spec.kind === 'scouts' ? 'Hiking out to Whitcomb Point Light' : 'Walking out to see Whitcomb Point Light', act: (p, i) => (i === 0 && (V.spec.kind === 'camera' || r.chance(0.5)) ? 'photograph' : r.pick(['look', 'point', 'look'])), held: (p, i) => (i === 0 && V.spec.kind !== 'scouts' ? 'camera' : V.heldOf(p, i)) });
    return true;
  },
  beach(V) {
    const { W, trip, r } = V;
    if (trip.t > T('19:00')) return false;
    const b = r.pick(V.beach);
    const dwell = r.int(10, 18);
    if (!fitsThen(V, b, dwell + 6)) return false;
    trip.to(V.beachGate, 1, { label: 'Looking down at Juniper Beach', act: 'look', held: V.heldOf });
    const rt = W.route(V.beachGate, r.int(90, 200), { to: { x: r.chance(0.5) ? 0 : 130, z: 232 } });
    if (rt) trip.stroll(rt, { label: 'Walking along the beach promenade', held: V.heldOf });
    trip.to(b, dwell, { label: V.spec.kind === 'scouts' ? 'Skipping stones at Juniper Beach' : V.kids.length ? 'At the beach with the children' : 'Sitting on Juniper Beach', act: (p) => (p.age < 13 ? r.pick(['play', 'play_ball', 'cheer']) : r.pick(['look', 'look', 'talk'])), held: V.heldOf });
    return true;
  },
  playland(V) {
    const { W, trip, r } = V;
    if (trip.t < T('10:00') || trip.t > T('20:00')) return false;
    const dwell = r.int(12, 20);
    const kidSp = W.pickN(V.playland, Math.max(1, V.kids.length), trip.t + 5, trip.t + 35);
    if (!fitsThen(V, V.playlandGate, dwell)) return false;
    trip.to((p) => (p.age < 13 && kidSp.length ? kidSp[V.kids.indexOf(p) % kidSp.length] : V.playlandGate), dwell, { label: (p) => (p.age < 13 ? 'On the rides at Playland Pier' : 'At Playland Pier'), act: (p) => (p.age < 13 ? r.pick(['play', 'cheer']) : r.pick(['look', 'clap', 'laugh'])), held: V.heldOf });
    regroup(V, V.playlandGate);
    return true;
  },
  museum(V) {
    const { W, trip, r } = V;
    const P = W.place('Maritime Museum (Old Custom House)');
    if (!P || !V.museum.length || trip.t < T('9:55') || trip.t > T('16:50')) return false;
    const dwell = r.int(10, 15);
    const sp = W.pickN(V.museum, V.people.length, trip.t + 3, trip.t + 25);
    if (!fitsThen(V, sp[0], dwell)) return false;
    trip.to(perPerson(V, sp), dwell, { label: 'Looking at the ship models in the Maritime Museum', act: (p) => r.pick(['look', 'browse']), held: V.heldOf });
    regroup(V, W.gather(P));
    return true;
  },
  exhibit(V) {
    const { W, trip, r } = V;
    const P = W.place('Carnegie Library');
    if (!P || !V.exhibit.length || trip.t < T('9:30') || trip.t > T('16:40')) return false;
    const dwell = r.int(10, 16);
    if (!fitsThen(V, V.exhibit[0], dwell)) return false;
    trip.to(perPerson(V, W.pickN(V.exhibit, V.people.length, trip.t, trip.t + 20)), dwell, { label: 'Reading the 1853 charter at the library\'s Centennial exhibit', act: 'read_stand', held: null });
    regroup(V, W.gather(P));
    return true;
  },
  souvenir(V) {
    const { W, trip, r } = V;
    if (trip.t < T('9:30') || trip.t > T('17:40')) return false;
    const S = r.pick(V.souvenir);
    const dwell = r.int(6, 10);
    const sp = W.pickN(S.spots, V.people.length, trip.t + 3, trip.t + 20);
    if (!sp.length || !fitsThen(V, sp[0], dwell)) return false;
    trip.to(perPerson(V, sp), dwell, { label: S.label, act: 'browse', held: V.heldOf });
    if (S.held) { const h = S.held; const was = V.heldOf; V.heldOf = (p, i) => (i === V.people.length - 1 && p.age >= 13 ? h : was(p, i)); }
    regroup(V, W.gather(S.P));
    return true;
  },
  park(V) {
    const { W, trip, r } = V;
    if (!W.parkBench.length) return false;
    const dwell = r.int(10, 18);
    const kidSp = W.pickN(W.parkPlay, Math.max(1, V.kids.length), trip.t + 5, trip.t + 30), bench = W.pickN(W.parkBench.filter((s) => s.act !== 'chess'), V.grown.length, trip.t + 5, trip.t + 30);
    if (!bench.length || !fitsThen(V, bench[0], dwell)) return false;
    trip.to((p) => (p.age < 13 && kidSp.length ? kidSp[V.kids.indexOf(p) % kidSp.length] : bench[V.grown.indexOf(p) % bench.length]), dwell, { label: (p) => (p.age < 13 ? 'Playing in Juniper Park' : 'Resting their feet in Juniper Park'), act: (p) => (p.age < 13 ? r.pick(['play', 'swing', 'play_ball']) : r.pick(['sit', 'feed_birds', 'read'])), held: V.heldOf });
    regroup(V, W.outSpot(175, 131, { act: 'stand', spread: 1.3 }, 'parkgate'));
    return true;
  },
  graves(V) {
    const { W, trip, r } = V;
    if (!V.graves.length || trip.t > T('17:00')) return false;
    const dwell = r.int(15, 25);
    if (!fitsThen(V, V.graves[0], dwell)) return false;
    trip.to(perPerson(V, W.pickN(V.graves, V.people.length, trip.t, trip.t + 40)), dwell, { label: 'Looking for his mother\'s stone in the Old Burying Ground', act: (p, i) => (i ? 'pray_sit' : 'look'), held: V.heldOf });
    return true;
  },
  cityhall(V) {
    const { trip, r } = V;
    if (!V.cityhall || trip.t > T('17:00')) return false;
    const dwell = r.int(6, 10);
    if (!fitsThen(V, V.cityhall, dwell)) return false;
    trip.to(V.cityhall, dwell, { label: 'Admiring the Old Granite Lady (City Hall, 1876)', act: (p, i) => (i === 0 && r.chance(0.5) ? 'photograph' : 'look'), held: (p, i) => (i === 0 ? 'camera' : V.heldOf(p, i)) });
    return true;
  },
  church(V) {
    const { W, trip, r } = V;
    if (!V.pewsCong.length || trip.t < T('9:30') || trip.t > T('15:40')) return false;
    const P = W.place('First Congregational Church');
    const dwell = r.int(10, 16);
    if (!P || !fitsThen(V, V.pewsCong[0], dwell)) return false;
    trip.to(perPerson(V, W.pickN(V.pewsCong, V.people.length, trip.t, trip.t + 25)), dwell, { label: 'Admiring the windows at First Congregational', act: 'listen_sit', held: V.heldOf });
    regroup(V, W.gather(P));
    return true;
  },
  tea(V) {
    const { W, trip, r } = V;
    if (!V.eat.tea.length || trip.t < T('13:30') || trip.t > T('16:00')) return false;
    const dwell = r.int(25, 35);
    if (!fitsThen(V, V.eat.tea[0], dwell)) return false;
    trip.to(perPerson(V, W.pickN(V.eat.tea, V.people.length, trip.t, trip.t + 40)), dwell, { label: 'Tea at Harlow\'s — it\'s in the program', act: (p) => r.pick(['drink', 'eat', 'talk_sit']), held: null });
    regroup(V, W.gather(W.place("Harlow's")));
    return true;
  },
  matinee(V) {
    const { W, trip, r } = V;
    if (!V.theater.length || trip.t < T('13:25') || trip.t > T('13:52') || V.deadline < T('16:20')) return false;
    if (!r.chance(0.6)) return false;
    const P = W.place('The Rialto');
    const sp = W.pickN(V.theater.slice(-120), V.people.length, T('13:55'), T('16:00'));
    if (!sp.length) return false;
    trip.to(perPerson(V, sp), 0, { label: 'At the pictures — "Roman Holiday"', act: 'watch', held: null });
    trip.t = Math.max(trip.t, T('16:01'));
    regroup(V, W.gather(P), 'Blinking in the daylight outside the Rialto');
    return true;
  },
  fleet(V) {
    const { W, trip, r } = V;
    if (trip.t > T('8:25')) return false;
    const P = W.place('Castellano Fish Co.');
    const s = W.outSpot(20, P ? P.door.z : -41, { faceTo: [0, P ? P.door.z : -41], act: 'look', spread: 2 }, 'fleetwatch');
    trip.to(s, r.int(15, 25), { label: 'Watching the fishing fleet unload at Pier 3', act: (p) => (p.age < 13 ? r.pick(['point', 'look']) : r.pick(['look', 'point', 'lean'])), held: V.heldOf, lines: ['Look at the size of that halibut!', 'They\'ve been out since three. Three in the morning!'] });
    return true;
  },
  breakfast(V) {
    const { W, trip, r } = V;
    if (trip.t > T('9:15') || V.eat.diner.length < V.people.length) return false;
    const sp = W.pickN(V.eat.diner, V.people.length, trip.t, trip.t + 30);
    trip.to(perPerson(V, sp), r.int(20, 30), { label: 'Coffee and crullers at the Harbor Light Diner', act: (p) => r.pick(['eat', 'drink']), held: null });
    regroup(V, W.gather(W.place('Harbor Light Diner')));
    return true;
  },
  bakery(V) {
    const { W, trip, r } = V;
    const sp = W.spotsIn('Halloran & Sons Bakery', 'browse', 'customer');
    if (!sp.length || trip.t > T('11:30')) return false;
    trip.to(perPerson(V, W.pickN(sp, Math.min(2, V.people.length), trip.t, trip.t + 10)), r.int(5, 8), { label: 'Buying a Centennial loaf to take home', act: 'browse', held: V.heldOf });
    regroup(V, W.gather(W.place('Halloran & Sons Bakery')));
    return true;
  },
  kin(V) {
    const { W, trip, r, spec } = V;
    const P = W.place(spec.host); if (!P) return false;
    const sp = W.spotsIn(spec.host, 'browse', 'customer');
    if (!sp.length) return false;
    trip.to(perPerson(V, W.pickN(sp, V.people.length, trip.t, trip.t + 20)), r.int(12, 18), { label: `Visiting ${spec.hostName}`, act: 'talk', held: V.heldOf, lines: ['We came all the way from ' + spec.town + ' and he\'s working! On the Centennial!', 'He says come back at supper. He always says come back at supper.'] });
    regroup(V, W.gather(P));
    return true;
  },
  lunch(V) {
    const { W, trip, r } = V;
    const opts = [['clam', 'Lunch at the Clam Shack — fried clams and a lobster roll', 'The Clam Shack'], ['diner', 'Chowder and pie at the Harbor Light Diner', 'Harbor Light Diner'], ['lunchette', 'Lunch at the Station Luncheonette', 'Station Luncheonette'], ['woolcott', 'Grilled cheese at Woolcott\'s lunch counter', "Woolcott's 5 & 10"], ['hotel', 'Luncheon in the Whitcomb Hotel dining room', 'The Whitcomb Hotel']];
    const w = V.spec.kind === 'scouts' ? [opts[0]] : V.spec.kind === 'church' ? [opts[4], opts[1]] : r.shuffle(opts.slice());
    for (const [k, label, name] of w) {
      const pool = V.eat[k]; if (!pool || pool.length < V.people.length) continue;
      const dwell = r.int(22, 32);
      const sp = W.pickN(pool, V.people.length, trip.t + 3, trip.t + dwell + 8);
      if (!fitsThen(V, sp[0], dwell)) continue;
      trip.to(perPerson(V, sp), dwell, { label, act: (p) => r.pick(['eat', 'eat', 'drink', 'talk_sit']), held: null });
      regroup(V, W.gather(W.place(name)));
      return true;
    }
    return false;
  },
  supper(V) {
    const { W, trip, r } = V;
    const opts = [['clam', 'Supper at the Clam Shack', 'The Clam Shack'], ['diner', 'Supper at the Harbor Light Diner', 'Harbor Light Diner'], ['hotel', 'Supper in the Whitcomb Hotel dining room', 'The Whitcomb Hotel'], ['lunchette', 'A sandwich at the Station Luncheonette', 'Station Luncheonette']];
    for (const [k, label, name] of r.shuffle(opts.slice())) {
      const pool = V.eat[k]; if (!pool || pool.length < V.people.length) continue;
      const dwell = r.int(30, 45);
      const sp = W.pickN(pool, V.people.length, trip.t + 3, trip.t + dwell + 8);
      if (!fitsThen(V, sp[0], dwell)) continue;
      trip.to(perPerson(V, sp), dwell, { label, act: (p) => r.pick(['eat', 'eat', 'drink']), held: null });
      regroup(V, W.gather(W.place(name)));
      return true;
    }
    return false;
  },
  speech(V) {
    const { trip, r } = V;
    const s = r.pick(V.speech);
    if (!fitsThen(V, s, 20)) return false;
    trip.to(s, 0, { label: 'Waiting for the Mayor\'s Centennial address', act: 'look', held: V.heldOf });
    trip.t = Math.max(trip.t + 3, T('17:30'));
    trip.to(s, T('18:04') - trip.t, { label: 'Listening to the Mayor\'s Centennial address', act: (p) => r.pick(['listen', 'listen', 'clap']), held: V.heldOf, book: false });
    return true;
  },
  dance(V) {
    const { trip, r } = V;
    V.sawDance = true;
    const s = r.pick(V.dance);
    const dwell = r.int(15, 30);
    if (!fitsThen(V, s, dwell)) return false;
    trip.to(s, dwell, { label: 'Watching the street dance on the square', act: (p) => r.pick(['look', 'clap', 'laugh']), held: V.heldOf });
    return true;
  },
  fireworks(V) {
    const { W, trip, r } = V;
    const s = V.spec.late ? r.pick(V.fireworks.slice(6)) : r.pick(V.fireworks);
    const lastMinute = !V.spec.late && r.chance(0.55);
    if (lastMinute) {
      // stay on at the dance (or wherever they are) and hurry down to the water as the first rockets go up
      const w = trip.eta(s), leave = T('21:01') + r.int(0, 5) - w;
      const d = r.pick(V.dance);
      if (leave - trip.t > 12 && trip.t + trip.eta(d) + 8 < leave && !V.sawDance) { trip.to(d, 0, { label: 'Watching the street dance on the square', act: (p) => r.pick(['look', 'clap', 'laugh']), held: V.heldOf }); V.sawDance = true; }
      trip.t = Math.max(trip.t, T('21:01') + r.int(0, 5) - trip.eta(s));
      trip.to(s, 0.5, { label: 'Hurrying down to the water as the first rockets go up', act: 'look', held: V.heldOf, book: false });
    } else if (trip.t < T('20:50') && !V.spec.late) {
      // a walk along the shore looking for a good place, then settle in
      const q = W.outSpot(55, s.z > 150 ? 232 : s.z, { act: 'look', spread: 1.2 }, 'fwlook');
      trip.to(q, 1, { label: 'Looking for a good place to see the fireworks', act: 'look', held: V.heldOf });
      const rt = W.route(q, r.int(4, 9) * trip.speed * 0.8 * 60, { to: { x: s.x, z: s.z }, within: 12 });
      if (rt) trip.stroll(rt, { label: 'Walking the shore to find a spot for the fireworks', held: V.heldOf });
    }
    if (trip.t < T('21:00')) trip.to(s, 0, { label: 'Waiting for the fireworks', act: 'look', held: V.heldOf, book: false });
    trip.t = Math.max(trip.t, T('21:00'));
    trip.to(s, Math.max(4, T('21:26') - trip.t), { label: 'Watching the Centennial fireworks', act: (p) => r.pick(['look', 'cheer', 'look', 'clap']), held: V.heldOf, book: false });
    return true;
  },

};
function squareEdgeV(V) {
  const r = V.W.squareRect, z = V.trip.pos.z < (r.z0 + r.z1) / 2 ? r.z0 + 1.5 : r.z1 - 1.5, x = Math.max(r.x0 + 2, Math.min(r.x1 - 2, Math.round(V.trip.pos.x / 25) * 25));
  return V.W.outSpot(x, z, { act: 'look', spread: 1.4, faceTo: [(r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2] }, 'sqedge');
}

// ------------------------------------------------------------------ run
export function visitors(W) {
  const L = W.L;
  const V = { W, L, cars: [] };
  setupPlaces(V);
  let people = 0, parties = 0, sights = 0, i = 0;
  for (const spec of [...DAY_PARTIES, ...EVE_PARTIES]) {
    const ppl = makeParty(V, spec, i);
    if (!ppl.length) { i++; continue; }
    sights += planParty(V, spec, ppl, i);
    if (spec.kind === 'scouts') W.diary.scouts = { person: ppl[0] };
    if (spec.kind === 'camera') W.diary.camera = { person: ppl[0] };
    if (spec.kind === 'church') W.diary.church = { person: ppl[0] };
    people += ppl.length; parties++; i++;
  }
  // their cars, parked out along Grand Avenue toward the edge of town
  const slots = [];
  for (let x = 404; x <= 512; x += 6.4) { slots.push([x, -65.3, Math.PI / 2]); slots.push([x + 3.2, -74.7, -Math.PI / 2]); }
  const used = [];
  const palette = ['#2a3a5a', '#6a2a2a', '#2a4a3a', '#d8d0b8', '#1c1c1e', '#6a8aa0', '#8a7a5a', '#3a5a7a', '#7a3a4a', '#c8b890'];
  for (const [t0, t1, idx] of V.cars.sort((a, b) => a[0] - b[0])) {
    const k = slots.findIndex((s, j) => !used.some(([u, a, b]) => u === j && a < t1 + 6 && b > t0 - 6));
    if (k < 0) continue;
    used.push([k, t0 - 1, t1 + 4]);
    const [x, z, yaw] = slots[k];
    L.timed(['car_sedan', 'car_sedan', 'car_coupe', 'car_wagon', 'car_convertible'][idx % 5], x, z, yaw, t0 - 1.5, t1 + 4, { tint: palette[idx % palette.length], y: 0.02 });
  }
  W.tally('Visitors', people); W.tally('Visiting parties', parties); W.tally('Visitor sights', sights);
  L.scene('Harbor Days visitors off the 9:52', 213, -222, '9:52', '10:30', 0);
  L.scene('Harbor Days visitors off the 12:40', 213, -222, '12:40', '13:10', 0);
  L.scene('Visitors\' cars along Grand Avenue', 460, -70, '9:00', '21:50', V.cars.length);
  L.scene('Harbor Days visitors seeing the sights', 120, 0, '9:52', '22:19', people);
}
