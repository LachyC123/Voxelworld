// The plan of Juniper Bay: street grid, blocks, lots and what stands on each lot.
// Units here are METRES unless noted. North = -z, east = +x. The harbour is to the west (x < 0).
import { RNG } from '../core/rng.js';

export const AVENUES = [ // N-S streets (x centre)
  { name: 'Harbor Street', x: 54 },
  { name: 'Main Street', x: 134 },
  { name: 'Lantern Avenue', x: 214, trolley: true },
  { name: 'Elm Street', x: 294 },
  { name: 'Hillcrest Avenue', x: 374 },
];
export const STREETS = [ // E-W streets (z centre)
  { name: 'Mill Street', z: -210 },
  { name: 'Canal Street', z: -140 },
  { name: 'Grand Avenue', z: -70 },
  { name: 'Market Street', z: 0 },
  { name: 'Church Street', z: 70 },
  { name: 'Maple Street', z: 140 },
  { name: 'Orchard Street', z: 210 },
];
export const ROAD_HALF = 6;      // carriageway half width (m)
export const WALK = 4;           // sidewalk width (m)
export const GRID = { x0: 44, x1: 384, z0: -220, z1: 220 }; // outer edge of the sidewalks around the grid

// Missing road segments (Founders Square interrupts Lantern Avenue between Grand Ave and Market St)
export const GAPS = [{ avenue: 'Lantern Avenue', z0: -70, z1: 0 }];

export const SQUARE = { x0: 144, x1: 244, z0: -60, z1: -10 };       // Founders Square (plaza)
export const CITYHALL = { x0: 244, x1: 284, z0: -60, z1: -10 };

// ---------------------------------------------------------------- helpers
export function blockRect(col, row) {
  const xs = AVENUES.map((a) => a.x), zs = STREETS.map((s) => s.z);
  return { x0: xs[col] + ROAD_HALF + WALK, x1: xs[col + 1] - ROAD_HALF - WALK, z0: zs[row] + ROAD_HALF + WALK, z1: zs[row + 1] - ROAD_HALF - WALK, col, row };
}
export function streetAt(facing, lotM) {
  // which street a lot fronts on
  if (facing === 'N' || facing === 'S') {
    const z = facing === 'N' ? lotM.z0 - WALK - ROAD_HALF : lotM.z1 + WALK + ROAD_HALF;
    const s = STREETS.find((q) => Math.abs(q.z - z) < 1);
    return s ? s.name : (facing === 'S' && lotM.z1 > 215 ? 'Orchard Street' : 'Mill Street');
  }
  const x = facing === 'W' ? lotM.x0 - WALK - ROAD_HALF : lotM.x1 + WALK + ROAD_HALF;
  const a = AVENUES.find((q) => Math.abs(q.x - x) < 1);
  return a ? a.name : (facing === 'W' ? 'Hillcrest Avenue' : 'Harbor Street');
}

// Lot: metres rect + facing + spec. Converted to voxel lots for generators by the city builder.
const LOTS = [];
function lot(x0, z0, x1, z1, facing, spec) { LOTS.push({ m: { x0, z0, x1, z1 }, facing, spec }); }

// Split a side of a block into lots with the given frontages (metres). side: 'N'|'S'|'E'|'W'
function row(b, side, depth, specs, o = {}) {
  const along = side === 'N' || side === 'S';
  let pos = along ? b.x0 : b.z0;
  const end = along ? b.x1 : b.z1;
  const total = specs.reduce((s, q) => s + q.w, 0);
  const pad = o.align === 'center' ? ((end - pos) - total) / 2 : o.align === 'end' ? (end - pos) - total : 0;
  pos += pad;
  for (const q of specs) {
    const a = pos, c = pos + q.w; pos = c;
    if (q.kind === 'gap') continue;
    const d = q.d || depth;
    if (side === 'N') lot(a, b.z0, c, b.z0 + d, 'N', q);
    else if (side === 'S') lot(a, b.z1 - d, c, b.z1, 'S', q);
    else if (side === 'W') lot(b.x0, a, b.x0 + d, c, 'W', q);
    else lot(b.x1 - d, a, b.x1, c, 'E', q);
  }
}

// ---------------------------------------------------------------- the plan
const H = (w, o = {}) => ({ w, kind: 'house', ...o });
const RH = (w, o = {}) => ({ w, kind: 'rowhouse', ...o });
const SHOP = (w, shop, name, o = {}) => ({ w, kind: 'shop', shop, name, ...o });

function plan() {
  let b;
  // Row 0 ---------------------------------------------------------------
  b = blockRect(0, 0); // Harbor Canning Co.
  lot(b.x0, b.z0, b.x1, b.z1, 'W', { kind: 'cannery', name: 'Harbor Canning Co.', est: 1899 });
  b = blockRect(1, 0);
  row(b, 'N', 26, [{ w: 60, kind: 'hotel', name: 'The Whitcomb Hotel', est: 1896 }]);
  row(b, 'S', 22, [SHOP(15, 'luncheonette', 'Station Luncheonette'), SHOP(15, 'tobacco', 'Lantern Tobacco & News', { est: 1912 }), SHOP(14, 'shoes', 'Beaumont Shoes'), SHOP(16, 'travel', 'Bay Travel & Telegraph')]);
  b = blockRect(2, 0);
  row(b, 'N', 26, [{ w: 32, kind: 'newspaper', name: 'The Juniper Bay Courier', est: 1866 }, { w: 28, kind: 'garage', name: 'Mill Street Garage', est: 1921 }]);
  row(b, 'S', 22, [SHOP(14, 'hardware', 'Garrity Hardware', { est: 1904 }), SHOP(12, 'pawn', 'Ellsworth Loan & Jewelry'), SHOP(12, 'bar', 'The Signal Lamp Tavern'), SHOP(22, 'furniture', 'Tremblay Furniture')]);
  b = blockRect(3, 0);
  row(b, 'N', 24, [SHOP(10, 'grocery', 'Kowalski\'s Market', { est: 1915 }), RH(7), RH(7), RH(7), RH(7), RH(7), RH(7), RH(8)]);
  row(b, 'S', 24, [RH(8), RH(7), RH(7), RH(7), RH(7), RH(7), RH(7), SHOP(10, 'candy', 'Sweet Shoppe')]);
  // Row 1 ---------------------------------------------------------------
  b = blockRect(0, 1);
  row(b, 'W', 28, [{ w: 18, kind: 'firestation', name: 'Engine Company No. 1', est: 1903 }, { w: 16, kind: 'police', name: 'Police Headquarters' }, SHOP(16, 'tackle', 'Nets & Tackle', { est: 1911 })]);
  row(b, 'E', 30, [SHOP(16, 'bar', 'The Anchor & Chain'), SHOP(18, 'boarding', 'Mrs. Pruitt\'s Rooms'), SHOP(16, 'chandlery', 'Whitcomb Ship Chandlery', { est: 1858 })]);
  b = blockRect(1, 1);
  lot(b.x0 + 30, b.z0, b.x1, b.z1, 'E', { kind: 'tower', name: 'Juniper Trust Building', floors: 22, est: 1929, radio: true });
  lot(b.x0, b.z0 + 24, b.x0 + 30, b.z1, 'S', { kind: 'bank', name: 'First Juniper Savings Bank', est: 1871 });
  lot(b.x0, b.z0, b.x0 + 30, b.z0 + 24, 'N', { kind: 'office', name: 'Mercantile Building', floors: 8, clock: true, est: 1905 });
  b = blockRect(2, 1);
  lot(b.x0, b.z0 + 24, b.x0 + 30, b.z1, 'S', { kind: 'postoffice', name: 'United States Post Office', est: 1938 });
  lot(b.x0, b.z0, b.x0 + 30, b.z0 + 24, 'N', { kind: 'office', name: 'Beacon Building', floors: 12, est: 1926 });
  lot(b.x0 + 30, b.z0, b.x1, b.z1, 'E', { kind: 'office', name: 'Harbor Insurance Building', floors: 7, est: 1911 });
  b = blockRect(3, 1);
  lot(b.x0, b.z0, b.x1, b.z1, 'S', { kind: 'hospital', name: 'St. Luke\'s Hospital', est: 1920 });
  // Row 2 ---------------------------------------------------------------
  b = blockRect(0, 2);
  row(b, 'W', 26, [{ w: 26, kind: 'museum', name: 'Maritime Museum (Old Custom House)', est: 1859 }, SHOP(24, 'diner', 'Harbor Light Diner', { est: 1924 })]);
  row(b, 'E', 30, [SHOP(16, 'bookshop', 'Pike & Daughter Books'), SHOP(16, 'radio', 'Bay Radio & Television'), SHOP(18, 'photo', 'Lowell Photography Studio')]);
  // Founders Square & City Hall are built by the square generator
  lot(SQUARE.x0, SQUARE.z0, SQUARE.x1, SQUARE.z1, 'N', { kind: 'square', name: 'Founders Square' });
  lot(CITYHALL.x0, CITYHALL.z0, CITYHALL.x1, CITYHALL.z1, 'W', { kind: 'cityhall', name: 'City Hall', est: 1876 });
  b = blockRect(3, 2);
  row(b, 'W', 30, [{ w: 26, kind: 'library', name: 'Carnegie Library', est: 1911 }, { w: 24, kind: 'lodge', name: 'Elks Lodge No. 812' }]);
  row(b, 'E', 28, [RH(8, { style: 'brownstone' }), RH(8, { style: 'brownstone' }), RH(8, { style: 'brownstone' }), RH(8, { style: 'brownstone' }), RH(9, { style: 'brownstone' }), RH(9, { style: 'brownstone' })]);
  // Row 3 ---------------------------------------------------------------
  b = blockRect(0, 3);
  row(b, 'N', 24, [SHOP(12, 'bakery', 'Halloran & Sons Bakery', { est: 1887, family: 'Halloran' }), SHOP(10, 'butcher', 'Russo\'s Meats'), SHOP(10, 'laundry', 'Lee\'s Hand Laundry', { est: 1911, family: 'Lee' }), SHOP(14, 'tailor', 'Adler & Son, Tailors', { est: 1906, family: 'Adler' }), SHOP(14, 'fish', 'Castellano Fish Market', { est: 1894, family: 'Castellano' })]);
  row(b, 'S', 24, [RH(7), RH(7), RH(7), RH(7), RH(8, { family: 'Castellano', special: 'welcome_home' }), RH(8), RH(8), RH(8)]);
  b = blockRect(1, 3);
  row(b, 'N', 28, [{ w: 60, kind: 'department', name: 'Harlow\'s', est: 1878 }]);
  row(b, 'S', 22, [{ w: 30, kind: 'theater', name: 'The Rialto', est: 1927 }, { w: 30, kind: 'apartment', name: 'The Marlowe Apartments', floors: 4 }]);
  b = blockRect(2, 3);
  row(b, 'N', 24, [SHOP(14, 'drugstore', 'Mayhew\'s Pharmacy & Soda Fountain', { est: 1909 }), SHOP(10, 'barber', 'Freeman\'s Barber Shop', { est: 1921, family: 'Freeman' }), SHOP(12, 'dime', 'Woolcott\'s 5 & 10'), SHOP(10, 'florist', 'Bloom & Bower Florist'), SHOP(14, 'hatshop', 'Gould Millinery')]);
  row(b, 'S', 24, [{ w: 22, kind: 'club', name: 'The Blue Lantern', family: 'Freeman' }, { w: 38, kind: 'bowling', name: 'Harbor Lanes' }]);
  b = blockRect(3, 3);
  row(b, 'N', 24, [SHOP(12, 'toys', 'Draper\'s Toys'), SHOP(12, 'jeweler', 'Weiss Jewelers', { est: 1919 }), SHOP(12, 'bank_branch', 'Bayside Savings & Loan'), SHOP(12, 'dress', 'Silva Dress Shop'), SHOP(12, 'music', 'Bishop Music Co.')]);
  row(b, 'S', 24, [H(15), H(15), H(15), H(15)]);
  // Row 4 ---------------------------------------------------------------
  b = blockRect(0, 4);
  row(b, 'N', 50, [{ w: 34, kind: 'church_catholic', name: 'St. Brigid\'s Church', est: 1882 }, { w: 26, kind: 'rectory', name: 'St. Brigid\'s Rectory & Parish Hall' }]);
  b = blockRect(1, 4);
  lot(b.x0, b.z0, b.x1, b.z1, 'N', { kind: 'park', name: 'Juniper Park' });
  b = blockRect(2, 4);
  row(b, 'N', 50, [{ w: 34, kind: 'church_congregational', name: 'First Congregational Church', est: 1853 }, { w: 26, kind: 'house', name: 'The Parsonage', family: 'Ashby', big: true }]);
  b = blockRect(3, 4);
  row(b, 'N', 25, [H(15, { family: 'Halloran', special: 'tv_dinner', name: 'Halloran Residence' }), H(15), H(15, { family: 'Hatch', special: 'cat' }), H(15)]);
  row(b, 'S', 25, [H(15), H(15, { family: 'Kaminski' }), H(15), H(15)]);
  // Row 5 ---------------------------------------------------------------
  b = blockRect(0, 5);
  row(b, 'N', 25, [{ w: 18, kind: 'gasstation', name: 'Bay Esso Service' }, H(14), H(14), H(14)]);
  row(b, 'S', 25, [H(15), H(15), H(15), H(15)]);
  b = blockRect(1, 5);
  lot(b.x0, b.z0, b.x1, b.z1, 'N', { kind: 'school', name: 'Juniper Bay High School', est: 1908 });
  b = blockRect(2, 5);
  row(b, 'N', 25, [H(15, { family: 'Moreau', special: 'birthday', address: '14 Maple Street' }), H(15), H(15, { family: 'Novak', special: 'wedding_family' }), H(15)]);
  row(b, 'S', 25, [H(15), H(15), H(15), H(15)]);
  b = blockRect(3, 5);
  row(b, 'N', 25, [H(15), H(15), H(15), H(15)]);
  row(b, 'S', 25, [H(15), H(15), H(15), H(15)]);
  // Outer ring ----------------------------------------------------------
  // Union Station on the north side of Mill Street
  lot(150, -262, 278, -220, 'S', { kind: 'station', name: 'Union Station', est: 1889 });
  // Captains' houses on the east side of Hillcrest Avenue
  const hc = { x0: 384, x1: 414, z0: -200, z1: 200 };
  const hz = [[-200, -150], [-130, -80], [-60, -10], [10, 60], [80, 130], [150, 200]];
  for (const [z0, z1] of hz) {
    const n = 3, w = (z1 - z0) / n;
    for (let i = 0; i < n; i++) {
      const spec = { kind: 'house', big: true, victorian: true };
      if (z0 === -60 && i === 1) Object.assign(spec, { family: 'Whitcomb', name: 'Whitcomb House', special: 'historian' });
      if (z0 === 80 && i === 0) Object.assign(spec, { family: 'Pemberton', name: 'Pemberton House' });
      lot(hc.x0, z0 + i * w, hc.x1, z0 + (i + 1) * w, 'W', { w, ...spec });
    }
  }
  // Houses on the south side of Orchard Street
  for (let x = 150; x + 15 <= 380; x += 15.5) lot(x, 220, x + 15, 245, 'N', { kind: 'house' });
  // Waterfront sheds along the west side of Harbor Street
  const sheds = [
    [-205, -178, { kind: 'warehouse', name: 'Pier 1 Freight Shed' }],
    [-170, -146, { kind: 'warehouse', name: 'Bayside Ice & Cold Storage', est: 1912 }],
    [-130, -104, { kind: 'warehouse', name: 'Pier 2 Cargo Shed' }],
    [-96, -76, { kind: 'shop', shop: 'tackle', name: 'Harbor Nets & Tackle', est: 1911 }],
    [-56, -30, { kind: 'fishhouse', name: 'Castellano Fish Co.', est: 1894 }],
    [-22, 2, { kind: 'warehouse', name: 'Pier 3 Sheds' }],
    [12, 34, { kind: 'warehouse', name: 'Harbor Master', harbormaster: true }],
    [44, 70, { kind: 'warehouse', name: 'Bayside Boat Works', boatworks: true }],
    [82, 106, { kind: 'warehouse', name: 'Pier 5 Sheds' }],
    [118, 140, { kind: 'shop', shop: 'seafood', name: 'The Clam Shack' }],
    [152, 176, { kind: 'warehouse', name: 'Juniper Bay Yacht Club', yacht: true }],
  ];
  for (const [z0, z1, spec] of sheds) lot(20, z0, 44, z1, 'E', spec);
}
plan();

export const PLAN = LOTS;

// Harbour geometry
export const WATERFRONT = { quayX: 0, railX0: 11, railX1: 17, shedX0: 20, shedX1: 44 };
export const PIERS = [
  { name: 'Pier 1', z: -192, len: 70, w: 12, use: 'ferry' },
  { name: 'Pier 2', z: -118, len: 90, w: 16, use: 'cargo' },
  { name: 'Pier 3', z: -42, len: 60, w: 12, use: 'fishing' },
  { name: 'Pier 4', z: 22, len: 50, w: 10, use: 'fishing' },
  { name: 'Pier 5', z: 94, len: 44, w: 10, use: 'boats' },
  { name: 'Yacht Club Dock', z: 165, len: 36, w: 8, use: 'yachts' },
];
export const BEACH = { x0: -40, x1: 140, z0: 222, z1: 320, boardwalkZ: 232 };
export const LIGHTHOUSE = { x: -150, z: 300 };
export const CEMETERY = { x0: 420, x1: 470, z0: -270, z1: -210 };

export function layoutRng() { return new RNG('juniper-bay-1953'); }
