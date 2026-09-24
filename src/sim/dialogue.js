// What people say. Personal bios + lines are generated for everyone; activity pools give
// overheard chatter; greetings depend on the time of day.
import { RNG } from '../core/rng.js';

export function greeting(minutes, r = Math.random) {
  const h = minutes / 60;
  const pick = (a) => a[Math.floor(r() * a.length)];
  if (h < 5) return pick(['You\'re up late.', 'Evening — or morning, I suppose.', 'Can\'t sleep either?']);
  if (h < 12) return pick(['Morning!', 'Good morning!', 'Mornin\'.', 'Fine morning, isn\'t it?', 'Top of the morning.']);
  if (h < 17) return pick(['Afternoon!', 'Good afternoon.', 'Hello there!', 'Swell day for it!', 'Afternoon — you headed to the fair?']);
  if (h < 21) return pick(['Evening!', 'Good evening.', 'Evening — lovely night.', 'Evening! Staying for the fireworks?']);
  return pick(['Evening.', 'Good night, now.', 'Late one, isn\'t it?', 'Mind how you go.']);
}

const JOB_LINES = {
  baker: ['Rye, pumpernickel, and the centennial loaf — with the seal pressed on top.', 'Get here before seven and it\'s still warm.'],
  barber: ['Next! Oh — just looking? Suit yourself.', 'Little off the sides?'],
  police: ['Move along, folks, keep the crosswalk clear.', 'Lost a glove? Try the desk at headquarters.'],
  fire: ['Engine One, finest in the county.', 'Polished that brass twice this morning. Centennial, you know.'],
  cook: ['Order up!', 'Two eggs, over easy, hash on the side.'],
  waitress: ['What\'ll it be, hon?', 'Pie\'s apple, cherry, and blueberry. Blueberry\'s the ticket.'],
  clerk: ['Can I help you find something?', 'That\'ll be forty cents.', 'We close at six on Saturdays.'],
  shopkeeper: ['Anything else for you today?', 'Fresh in this morning.'],
  nurse: ['Visiting hours end at eight.', 'Quiet, please — there are babies sleeping.'],
  doctor: ['Take two of these and call me Monday.'],
  fisherman: ['Fleet was in at six. Good haddock, better mackerel.', 'Fog\'s coming in by morning. You can smell it.'],
  dock: ['Heads up! Crate coming through.', 'Freighter\'s loading for Halifax on the tide.'],
  mail: ['Saturday delivery. Rain or shine or centennial.'],
  conductor: ['All aboard for Boston — oh, that\'s not till 5:52.'],
  bellhop: ['Right this way, sir.'],
  organist: ['Again, from the top!'],
  clergy: ['Peace be with you.'],
};

const ACT_LINES = {
  eat: ['Pass the potatoes, would you?', 'This is delicious.', 'Elbows off the table.', 'Is there any more gravy?', 'Mm. Just like my mother made.', 'Save room for pie.'],
  watch: ['Shh! It\'s coming back on.', 'Adjust the antenna — no, the other way.', 'Isn\'t that the funniest thing?', 'I love this program.', 'Who is that fella?'],
  talk: ['Did you hear about the Castellano boy? Home safe.', 'They say the Mayor\'s speech is eleven pages.', 'Helen Novak\'s dress — every pearl sewn by hand.', 'The fireworks go off at nine, over the harbor.', 'A hundred years. Can you imagine?', 'My grandfather helped raise the meetinghouse.', 'Mrs. Hatch\'s cat is up a tree again.', 'Heard the Hallorans got a television.', 'Weather\'s holding for the fireworks, knock wood.', 'My boy\'s playing trombone in the band tonight.'],
  talk_sit: ['Well, I never.', 'And then he says to me...', 'Coffee?', 'Remember the \'38 hurricane? Water up to the second step.'],
  read: ['Says here the cannery\'s hiring for the winter.', 'Listen to this: "Centennial Committee Expects Record Crowd."', 'Red Sox lost again.'],
  read_stand: ['Paper says fair weather through Sunday.'],
  cook: ['Don\'t touch that, it\'s hot!', 'Supper in twenty minutes!', 'Now where did I put the paprika?'],
  wash: ['Many hands make light work, you know.'],
  browse: ['What do you think of this one?', 'Too dear. Maybe next week.', 'Do you have it in blue?'],
  counter: ['Next, please!', 'That\'ll be thirty-five cents.', 'Anything else today?'],
  play: ['Tag, you\'re it!', 'Can\'t catch me!', 'Olly olly oxen free!', 'My turn! My turn!'],
  play_ball: ['Throw it here!', 'Over here, over here!'],
  jump_rope: ['Cinderella, dressed in yella...', 'One, two, three, four...'],
  cheer: ['Hooray!', 'Hip hip — hooray!'],
  clap: [],
  sing: [],
  knit: ['Two more rows and the scarf is done.'],
  rake: ['Every leaf in the county lands in my yard.'],
  laundry: ['Good drying weather.'],
  fish: ['Nibble... nibble... nothing.', 'You should\'ve seen the one that got away.'],
  chess: ['Check.', 'Hm. Hm. Hmm.', 'Your move, Walter.'],
  cards: ['I\'ll see your nickel and raise you a dime.', 'Read \'em and weep.'],
  drink: ['Another round?', 'To the centennial!'],
  dance: ['You\'re a swell dancer.', 'Don\'t step on my toes this time!'],
  pace: ['Any news? Any news yet?', 'What\'s taking so long?'],
  doze: [],
  sleep: [],
};

// Personal bio + lines for everyone (notables keep theirs and get these added).
export function bioFor(p, ctx) {
  const r = new RNG('bio' + p.id);
  const lines = [];
  const home = p.home ? p.home.building : null;
  const street = home ? (home.lot ? home.lot.street : '') : '';
  let bio = p.bio;
  if (!bio) {
    const parts = [];
    if (p.age < 13) parts.push(`${p.first} ${p.last}, ${p.age}.`);
    else parts.push(`${p.first} ${p.last}, ${p.age}${p.job ? `, ${p.job.title} at ${p.job.building.name}` : p.sex === 'F' && p.age > 20 ? ', homemaker' : p.age > 66 ? ', retired' : ''}.`);
    if (street) parts.push(`Lives on ${street}.`);
    bio = parts.join(' ');
  }
  if (p.age >= 13) {
    const memories = [
      p.age > 60 ? 'I was a girl — a boy, I mean, well — I was young when the trolley came in 1906. Everybody rode it for free the first day.' : null,
      p.age > 55 ? 'The \'38 hurricane put six feet of water on Harbor Street. We rowed a skiff down to the diner.' : null,
      p.age > 64 ? 'My father saw the Great Fire in 1902. Said you could read a newspaper at midnight by the glow.' : null,
      p.age > 25 && p.age < 60 ? 'V-J Day we all ended up in Founders Square. The church bells rang for an hour.' : null,
      p.age > 40 ? 'I remember when the Trust Building went up. Tallest thing on the coast. Three weeks later, the Crash.' : null,
      'A hundred years. My people came in on the train in the nineties with two trunks and a Bible.',
      'You should see the harbor when the fleet comes in at six. Best sight in New England.',
      'Miss Whitcomb says the capsule won\'t be opened until 2053. I wonder what they\'ll make of us.',
      'They painted the high-water marks on the waterfront after the hurricane. Go and look — it\'ll give you a chill.',
      'Every name on the quay stone is somebody\'s great-grandfather. The MARY ELLEN, 1867.',
    ].filter(Boolean);
    lines.push(r.pick(memories));
    if (p.job && JOB_LINES[p.job.outfit || p.role]) lines.push(r.pick(JOB_LINES[p.job.outfit || p.role]));
    if (home && home.lot) lines.push(r.pick([`I've lived on ${street} going on ${Math.max(2, Math.min(p.age - 2, r.int(3, 40)))} years.`, `We're the ${home.name.includes('Residence') ? home.name.replace(' Residence', 's') : 'folks'} on ${street}.`]));
  } else {
    lines.push(r.pick(['I\'m gonna see the fireworks!', 'Wanna play?', 'My dad says I can stay up till nine tonight!', 'I got a candy apple at the fair!', 'Didja see the fire engine?']));
  }
  return { bio, lines };
}

export function activityLines(act) { return ACT_LINES[act] || null; }
export function jobLines(role) { return JOB_LINES[role] || null; }
export { ACT_LINES, JOB_LINES };
