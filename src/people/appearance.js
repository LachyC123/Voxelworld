// Names and looks for the people of Juniper Bay, 1953.
import { HAIR_STYLES, FACE_STYLES, TORSO_STYLES, ARM_STYLES } from './atlas.js';

const hi = (arr, name) => arr.indexOf(name);
export const HAIR = Object.fromEntries(HAIR_STYLES.map((n, i) => [n, i]));
export const FACE = Object.fromEntries(FACE_STYLES.map((n, i) => [n, i]));
export const TORSO = Object.fromEntries(TORSO_STYLES.map((n, i) => [n, i]));
export const ARM = Object.fromEntries(ARM_STYLES.map((n, i) => [n, i]));
void hi;

export const NAMES = {
  male: {
    old: ['Walter', 'Harold', 'Frank', 'Albert', 'Clarence', 'Herbert', 'Ernest', 'Chester', 'Leonard', 'Arthur', 'Otto', 'Silas', 'Amos', 'Horace', 'Wendell', 'Luther', 'Emmett', 'Virgil', 'Rufus', 'Cyrus', 'Giuseppe', 'Stanisław', 'Seamus', 'Isaac', 'Elias'],
    mid: ['George', 'Joseph', 'Edward', 'Raymond', 'Charles', 'Howard', 'Roy', 'Lloyd', 'Vincent', 'Stanley', 'Eugene', 'Francis', 'Leo', 'Earl', 'Clifford', 'Russell', 'Sal', 'Tony', 'Benny', 'Marcus', 'Samuel', 'Nathaniel', 'Theodore', 'Casimir', 'Dominic', 'Patrick', 'Hank', 'Gus', 'Wilbur', 'Irving'],
    young: ['Robert', 'James', 'Richard', 'Donald', 'Jack', 'Bill', 'Tommy', 'Eddie', 'Bobby', 'Jimmy', 'Danny', 'Frankie', 'Joey', 'Ricky', 'Stevie', 'Billy', 'Ronnie', 'Larry', 'Gary', 'Dennis', 'Carl', 'Wally', 'Dale', 'Buddy', 'Mickey', 'Teddy', 'Artie', 'Louie', 'Paulie', 'Calvin'],
  },
  female: {
    old: ['Edna', 'Mildred', 'Gertrude', 'Bertha', 'Agnes', 'Ethel', 'Mabel', 'Hazel', 'Florence', 'Clara', 'Ida', 'Viola', 'Myrtle', 'Beatrice', 'Harriet', 'Lillian', 'Rosa', 'Bridget', 'Josephine', 'Opal', 'Winifred', 'Augusta', 'Pearl', 'Esther', 'Wilhelmina'],
    mid: ['Dorothy', 'Helen', 'Margaret', 'Ruth', 'Irene', 'Evelyn', 'Frances', 'Virginia', 'Marion', 'Louise', 'Eleanor', 'Alice', 'Lucille', 'Jean', 'Rita', 'Theresa', 'Vera', 'Pauline', 'Doris', 'Gloria', 'Maxine', 'Loretta', 'Stella', 'Harriet', 'Genevieve', 'Constance', 'Ada', 'Nora', 'Marguerite', 'Ruby'],
    young: ['Betty', 'Barbara', 'Patricia', 'Joan', 'Shirley', 'Carol', 'Nancy', 'Judy', 'Peggy', 'Sally', 'Susie', 'Linda', 'Donna', 'Janet', 'Connie', 'Kathy', 'Annie', 'Dottie', 'Marjorie', 'Rosemary', 'Bonnie', 'Gail', 'Sandra', 'Mary Lou', 'Beverly', 'Lorraine', 'Jeanie', 'Maggie', 'Cissy', 'Frannie'],
  },
};

export const SURNAMES = [
  'Halloran', 'Whitcomb', 'Castellano', 'Novak', 'Freeman', 'Lee', 'Adler', 'Papadakis', 'Brennan', 'Sullivan', 'Kowalski', 'Russo', 'Bianchi', 'Moreau', 'Lindqvist',
  'Olsen', 'Carver', 'Pruitt', 'Dunmore', 'Hatch', 'Ashby', 'Fairweather', 'Mercer', 'Tobin', 'Callahan', 'Duffy', 'Rourke', 'Kaminski', 'Wojcik', 'DeLuca',
  'Marchetti', 'Silva', 'Medeiros', 'Costa', 'Goldberg', 'Weiss', 'Stein', 'Chen', 'Wong', 'Jackson', 'Washington', 'Coleman', 'Porter', 'Bishop', 'Holt',
  'Pemberton', 'Garrity', 'Flanagan', 'Beaumont', 'Tremblay', 'Gagnon', 'Nguyen', 'Kaplan', 'Whitaker', 'Ellsworth', 'Barnaby', 'Crane', 'Pike', 'Fisk', 'Lowell',
  'Abbott', 'Baxter', 'Cobb', 'Draper', 'Eames', 'Finch', 'Gould', 'Hale', 'Ives', 'Judd', 'Keene', 'Lamb', 'Mayhew', 'Nash', 'Oakes', 'Peck', 'Quimby', 'Rhodes', 'Sayer', 'Thorne', 'Vance', 'Wade', 'Yates',
];

export const SKIN = ['#f3d6bd', '#ecc6a4', '#e2b48e', '#d4a07a', '#bf8a62', '#a06a45', '#835236', '#653e28'];
export const HAIR_COL = { black: '#1d1916', dark: '#34231a', brown: '#57391f', auburn: '#7a3a1c', red: '#a34a24', blonde: '#c8a45a', light: '#e0c586', gray: '#8f8a84', white: '#dcd8d0', salt: '#6f6a64' };

const SUIT = ['#2e3440', '#3a3a3e', '#4a4038', '#2a3548', '#5a4a3a', '#3c4a3c', '#55504a', '#6a5a48'];
const SHIRT = ['#e8e4d8', '#dfe6ee', '#efe6cf', '#d8e3d8', '#f0ece2', '#e4d6c8'];
const TIE = ['#8a2a2a', '#2a4a7a', '#6a4a1a', '#2a5a3a', '#7a2a5a', '#b3802a', '#4a2a2a', '#1f2f4f'];
const DRESS = ['#7fa8c9', '#d98f8f', '#9fc49a', '#e3c872', '#b596c8', '#e8a87c', '#8fb8b0', '#c8605a', '#5a7aa8', '#e6d6b8', '#a8484a', '#6a8a5a', '#f0b8c8', '#4a6a8a'];
const CASUAL = ['#7a5a3a', '#4a6a8a', '#8a3a2a', '#3a5a3a', '#b89a6a', '#6a6a70', '#9a7a4a', '#2f4f6f', '#a86a3a', '#5a4a6a'];
const TROUSER = ['#3a3a40', '#4a4038', '#2e3440', '#5a5048', '#6a5a48', '#3a4a5a', '#7a6a50', '#2a2a2e'];
const KIDS = ['#c84a3a', '#3a6ab8', '#e0b030', '#4a9a5a', '#e07a9a', '#7a5ab8', '#e8e4d8', '#3aa8b8', '#e88a3a'];

// Outfit presets by role. Returns partial look.
const OUTFITS = {
  police: (r) => ({ torso: TORSO.uniform, arm: ARM.long, top: '#1f2a44', top2: '#1a2238', bottom: '#1f2a44', shoes: '#141414', hat: 'hat_police', hatTint: '#1f2a44', hatTint2: '#d9b24a' }),
  fire: (r) => ({ torso: TORSO.uniform, arm: ARM.long, top: '#2a2d38', top2: '#2a2d38', bottom: '#2a2d38', shoes: '#141414', hat: r.chance(0.5) ? 'hat_fire' : 'hat_cap', hatTint: '#9a2620', hatTint2: '#d9b24a' }),
  mail: (r) => ({ torso: TORSO.uniform, arm: ARM.short, top: '#5d6f86', top2: '#4a5a70', bottom: '#4a5a70', shoes: '#1a1a1a', hat: 'hat_cap', hatTint: '#4a5a70', hatTint2: '#222' }),
  cook: (r) => ({ torso: TORSO.apron, arm: ARM.short, top: '#f0ece2', bottom: '#4a4a4a', hat: 'hat_chef', hatTint: '#f4f2ec' }),
  waitress: (r) => ({ torso: TORSO.apron, arm: ARM.short, top: r.pick(['#e89aa8', '#8fc4b8', '#e8c46a', '#9ab8e0']), skirt: 2, thigh: 1, shin: 1, socks: '#e8cbb0', hat: null }),
  nurse: (r) => ({ torso: TORSO.dress, arm: ARM.short, top: '#f2f0ea', skirt: 2, thigh: 1, shin: 1, socks: '#f2f0ea', shoes: '#f2f0ea', hat: 'hat_nurse', hatTint: '#f4f2ec' }),
  doctor: (r) => ({ torso: TORSO.coat, arm: ARM.long, top: '#f2f0ea', top2: '#dfe6ee', bottom: '#3a3a40' }),
  clergy: (r) => ({ torso: TORSO.clergy, arm: ARM.long, top: '#1c1c20', bottom: '#1c1c20', shoes: '#101010' }),
  choir: (r) => ({ torso: TORSO.robe, arm: ARM.long, top: '#6a1f2a', skirt: 2 }),
  sailor: (r) => ({ torso: TORSO.sailor, arm: ARM.long, top: '#23385a', top2: '#23385a', bottom: '#23385a', hat: 'hat_sailor', hatTint: '#f0ece2' }),
  fisherman: (r) => ({ torso: r.chance(0.5) ? TORSO.cardigan : TORSO.overalls, arm: ARM.long, top: r.pick(['#2a3a5a', '#6a3a2a', '#3a4a3a', '#c8a030']), top2: '#d8c8a8', accent: '#8a6a4a', bottom: '#3a3a40', shin: 3, shoes: '#2a2420', hat: r.pick(['hat_knit', 'hat_cap', 'hat_sou']), hatTint: r.pick(['#2a3a5a', '#8a2a2a', '#c8a030', '#3a3a3a']) }),
  dock: (r) => ({ torso: TORSO.overalls, arm: ARM.long, top: '#3a4a6a', top2: r.pick(['#a84a3a', '#d8c8a8', '#5a6a4a']), bottom: '#3a4a6a', shin: 3, hat: 'hat_cap', hatTint: '#4a4038' }),
  mechanic: (r) => ({ torso: TORSO.overalls, arm: ARM.long, top: '#4a5a6a', top2: '#4a5a6a', bottom: '#4a5a6a', hat: 'hat_cap', hatTint: '#6a2a2a' }),
  barber: (r) => ({ torso: TORSO.coat, arm: ARM.short, top: '#f0ece2', top2: '#f0ece2', bottom: '#3a3a40' }),
  milkman: (r) => ({ torso: TORSO.bowtie, arm: ARM.long, top: '#f2f0ea', top2: '#f2f0ea', accent: '#1a1a1a', bottom: '#f2f0ea', hat: 'hat_cap', hatTint: '#f2f0ea', hatTint2: '#1a1a1a' }),
  band: (r) => ({ torso: TORSO.uniform, arm: ARM.cuff, top: '#9a2a2a', top2: '#d9b24a', bottom: '#1f2a44', hat: 'hat_band', hatTint: '#9a2a2a', hatTint2: '#d9b24a' }),
  conductor: (r) => ({ torso: TORSO.uniform, arm: ARM.long, top: '#1f2a44', bottom: '#1f2a44', hat: 'hat_conductor', hatTint: '#1f2a44', hatTint2: '#d9b24a' }),
  shopkeeper: (r) => ({ torso: r.chance(0.5) ? TORSO.apron : TORSO.vest, arm: ARM.long, top: r.pick(SHIRT), top2: r.pick(CASUAL), accent: r.pick(TIE), bottom: r.pick(TROUSER) }),
  clerk: (r) => ({ torso: r.chance(0.6) ? TORSO.vest : TORSO.tie, arm: ARM.long, top: r.pick(SHIRT), top2: r.pick(SUIT), accent: r.pick(TIE), bottom: r.pick(TROUSER) }),
  bellhop: (r) => ({ torso: TORSO.uniform, arm: ARM.cuff, top: '#8a1f24', top2: '#d9b24a', bottom: '#1f1f24', hat: 'hat_bellhop', hatTint: '#8a1f24', hatTint2: '#d9b24a' }),
  farmer: (r) => ({ torso: TORSO.overalls, arm: ARM.long, top: '#3a5a8a', top2: r.pick(['#a84a3a', '#e8d8b8']), bottom: '#3a5a8a', shin: 3, hat: 'hat_straw', hatTint: '#d8b870' }),
  painter: (r) => ({ torso: TORSO.overalls, arm: ARM.long, top: '#e8e4d8', top2: '#e8e4d8', bottom: '#e8e4d8', hat: 'hat_cap', hatTint: '#e8e4d8' }),
  scout: (r) => ({ torso: TORSO.shirt, arm: ARM.short, top: '#7a7a4a', bottom: '#7a7a4a', thigh: 2, shin: 2, hat: 'hat_cap', hatTint: '#7a7a4a' }),
  soldier: (r) => ({ torso: TORSO.uniform, arm: ARM.long, top: '#5a5a3a', top2: '#4a4a30', bottom: '#5a5a3a', hat: 'hat_garrison', hatTint: '#5a5a3a' }),
  bride: (r) => ({ torso: TORSO.dress, arm: ARM.long, top: '#f6f2ea', skirt: 2, thigh: 1, shin: 1, socks: '#f6f2ea', shoes: '#f0ece2', hat: 'hat_veil', hatTint: '#f6f2ea' }),
  groom: (r) => ({ torso: TORSO.suit, arm: ARM.cuff, top: '#1c1c22', top2: '#f4f2ec', accent: '#1c1c22', bottom: '#1c1c22', shoes: '#0c0c0c' }),
};

// Build a look. o: { sex, age, role, wealth (0..1), formal }
export function makeLook(r, o) {
  const male = o.sex === 'M';
  const age = o.age;
  const kid = age < 13, teen = age >= 13 && age < 20;
  const skin = o.skin || r.weighted([[SKIN[0], 3], [SKIN[1], 4], [SKIN[2], 3], [SKIN[3], 2], [SKIN[4], 1.2], [SKIN[5], 1.2], [SKIN[6], 1], [SKIN[7], 0.8]]);
  let hairCol = o.hairCol || (age > 68 ? r.pick([HAIR_COL.white, HAIR_COL.gray]) : age > 52 ? r.pick([HAIR_COL.gray, HAIR_COL.salt, HAIR_COL.dark, HAIR_COL.brown]) : r.weighted([[HAIR_COL.black, 2], [HAIR_COL.dark, 3], [HAIR_COL.brown, 3], [HAIR_COL.auburn, 1], [HAIR_COL.red, 0.6], [HAIR_COL.blonde, 1.2], [HAIR_COL.light, 0.8]]));
  if (SKIN.indexOf(skin) >= 5 && age < 55 && !o.hairCol) hairCol = r.pick([HAIR_COL.black, HAIR_COL.dark]);
  const look = { skin, hair: hairCol, beard: hairCol, scale: kid ? 0.58 + age * 0.028 : teen ? 0.88 + (age - 13) * 0.016 : 1.0 };
  if (!male && !kid) look.scale *= 0.95;
  // hair style & face
  if (male) {
    look.hairStyle = age > 55 && r.chance(0.45) ? HAIR.bald : r.weighted([[HAIR.short, 4], [HAIR.part, 4], [HAIR.buzz, kid ? 3 : 1], [HAIR.curly, SKIN.indexOf(skin) >= 5 ? 3 : 0.4]]);
    look.face = kid ? r.pick([FACE.rosy, FACE.freckles, FACE.smile, FACE.plain]) : age > 60 ? r.pick([FACE.old, FACE.glasses, FACE.mustache, FACE.glassesMustache, FACE.beard]) : r.weighted([[FACE.plain, 3], [FACE.smile, 2], [FACE.mustache, 1.5], [FACE.glasses, 1.2], [FACE.glassesMustache, 0.6], [FACE.beard, 0.3]]);
  } else {
    look.hairStyle = kid ? r.pick([HAIR.bob, HAIR.long, HAIR.curly]) : age > 55 ? r.pick([HAIR.updo, HAIR.curly, HAIR.bob]) : r.weighted([[HAIR.bob, 3], [HAIR.updo, 2], [HAIR.curly, 2], [HAIR.long, 1.5]]);
    look.face = kid ? r.pick([FACE.rosy, FACE.freckles, FACE.smile]) : age > 60 ? r.pick([FACE.old, FACE.glasses, FACE.glassesLipstick]) : r.weighted([[FACE.lipstick, 3], [FACE.lashes, 2], [FACE.smile, 1], [FACE.glassesLipstick, 0.8], [FACE.freckles, 0.4]]);
    look.hairBack = look.hairStyle === HAIR.long;
    look.lips = r.pick(['#b8403a', '#a8344a', '#c05a4a', '#9a3a3a']);
  }
  // clothing
  const role = o.role;
  if (kid) {
    look.torso = male ? r.pick([TORSO.tshirt, TORSO.shirt, TORSO.sailor, TORSO.overalls]) : r.pick([TORSO.dress, TORSO.blouse, TORSO.cardigan]);
    look.arm = ARM.short; look.top = r.pick(KIDS); look.top2 = r.pick(KIDS); look.accent = r.pick(KIDS);
    look.bottom = male ? r.pick(['#4a5a7a', '#6a5a48', '#3a3a40']) : look.top;
    look.thigh = male ? 2 : 1; look.shin = 2; look.skirt = male ? 0 : 2; look.shoes = r.pick(['#3a2a20', '#1a1a1a', '#6a3a2a']);
    if (!male) look.socks = '#f4f0e8';
    if (male && r.chance(0.25)) { look.hat = 'hat_cap'; look.hatTint = r.pick(KIDS); }
  } else if (male) {
    const formal = o.formal ?? (r.chance(0.55) || age > 45);
    look.torso = formal ? r.pick([TORSO.suit, TORSO.suit, TORSO.tie, TORSO.vest]) : r.pick([TORSO.shirt, TORSO.cardigan, TORSO.tshirt, TORSO.vest, TORSO.shirt]);
    look.arm = look.torso === TORSO.suit ? ARM.cuff : (look.torso === TORSO.tshirt ? ARM.short : ARM.long);
    look.top = look.torso === TORSO.suit ? r.pick(SUIT) : r.pick(look.torso === TORSO.shirt ? SHIRT.concat(CASUAL) : CASUAL);
    look.top2 = r.pick(SHIRT); look.accent = r.pick(TIE);
    look.bottom = look.torso === TORSO.suit ? look.top : r.pick(TROUSER);
    look.thigh = 0; look.shin = 0; look.skirt = 0;
    if (formal && r.chance(0.7)) { look.hat = r.weighted([['hat_fedora', 5], ['hat_homburg', 1], ['hat_boater', 1], ['hat_trilby', 2]]); look.hatTint = r.pick(['#3a3a40', '#4a4038', '#5a5048', '#2e3440', '#6a5a48', '#7a6a58']); look.hatTint2 = '#1a1a1e'; }
    else if (r.chance(0.3)) { look.hat = r.pick(['hat_cap', 'hat_flatcap']); look.hatTint = r.pick(['#4a4038', '#5a5a5a', '#3a4a3a', '#6a5a48']); }
  } else {
    const dress = r.chance(0.72);
    look.torso = dress ? TORSO.dress : r.pick([TORSO.blouse, TORSO.cardigan, TORSO.blouse]);
    look.arm = r.pick([ARM.short, ARM.long, ARM.short]);
    look.top = dress ? r.pick(DRESS) : r.pick(SHIRT.concat(DRESS));
    look.top2 = r.pick(DRESS); look.accent = r.pick(DRESS.concat(TIE));
    look.bottom = dress ? look.top : r.pick(['#3a3a40', '#6a5a48', '#2e3440', '#8a6a5a', '#4a5a4a']);
    look.skirt = dress ? 2 : 1; look.thigh = 1; look.shin = 1; look.socks = r.pick(['#e8cbb0', '#d8b89a', '#c89a7a']);
    if (SKIN.indexOf(skin) >= 4) look.socks = skin;
    look.shoes = r.pick(['#2a2420', '#5a2a24', '#1a1a1a', '#6a4a3a', '#e8e0d0']);
    if (r.chance(o.formal ? 0.8 : 0.35)) { look.hat = r.pick(['hat_pillbox', 'hat_cloche', 'hat_sunhat', 'hat_pillbox']); look.hatTint = r.pick(DRESS.concat(['#2a2a2e', '#f0ece2'])); look.hatTint2 = r.pick(DRESS); }
  }
  if (role && OUTFITS[role]) Object.assign(look, OUTFITS[role](r));
  if (look.hat === null) delete look.hat;
  return look;
}

export function pickName(r, sex, age, surname) {
  const pool = NAMES[sex === 'M' ? 'male' : 'female'];
  const gen = age > 58 ? pool.old : age > 30 ? pool.mid : pool.young;
  const first = r.chance(0.12) ? r.pick(pool.mid) : r.pick(gen);
  return { first, last: surname || r.pick(SURNAMES) };
}
