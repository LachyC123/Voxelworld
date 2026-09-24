// Street life in the neighbourhoods: yards, porches, driveways and front walks. See docs/LIFE.md.
import { tm } from '../../core/util.js';

export function run(L) {
  carWash(L);
}

// Saturday morning: the family car at the curb, a bucket, a hose, a man in shirtsleeves.
function carWash(L) {
  const houses = L.places.houses.filter((P) => P.members.some((p) => p.age >= 25 && p.age < 65));
  const picks = L.rng.shuffle(houses.slice()).slice(0, 8);
  picks.forEach((P, i) => {
    const t0 = tm('9:30') + i * 17, t1 = t0 + 70;
    const who = P.members.filter((p) => p.age >= 25 && p.age < 65 && L.idle(p, t0, t1)).sort((a, b) => (a.sex === 'M' ? 0 : 1) - (b.sex === 'M' ? 0 : 1))[0];
    if (!who) return;
    const car = L.rng.pick(['car_sedan', 'car_coupe', 'car_wagon', 'car_convertible']);
    const tint = L.rng.pick(['#2a4a7a', '#7a2a2a', '#2a5a3a', '#d8d0b8', '#1a1a1a', '#6a8aa0']);
    L.timed(car, P.curb.x, P.curb.z, P.curb.yaw, t0 - 30, t1 + 60, { tint, y: 0.02 });
    // stand beside the car on the sidewalk side, sponge going
    const at = P.at(1.2, 3.9);
    const s = L.spot(at.x, at.z, { faceTo: [P.curb.x, P.curb.z], act: 'wash' });
    L.block(who, t0, t1, s, 'wash', { label: `Washing the ${car === 'car_wagon' ? 'station wagon' : 'car'}`, lines: ['Nothing like a clean car for the parade.', 'Hand me that chamois, would you?', 'Birds. Every blessed Saturday, birds.'] });
    const b = P.at(2.2, 3.6);
    L.timed('bucket_suds', b.x, b.z, 0, t0, t1);
    L.sound(at.x, 1, at.z, t0, t1, 'hose', { range: 25, vol: 0.4 });
    L.label(P.curb.x, 0.9, P.curb.z, t0, t1, `The ${who.last}s' car, half soaped`, 2.2);
    L.scene('Car wash', P.curb.x, P.curb.z, t0, t1, 1);
  });
}
