// The shared city-building context passed to every generator.
import { World } from '../world/world.js';
import { Nav } from '../sim/nav.js';
import { Spots } from '../sim/spots.js';
import { Lights } from '../render/lights.js';
import { Props } from '../props/props.js';
import { People } from '../sim/people.js';
import { Doors } from '../sim/doors.js';
import { RNG } from '../core/rng.js';
import { streetSignType } from '../props/lib/special.js';

export function createContext() {
  const ctx = {
    world: new World(),
    nav: new Nav(),
    spots: new Spots(),
    lights: new Lights(),
    doors: new Doors(),
    rng: new RNG('juniper-bay'),
    buildings: [],
    jobs: [],
    homes: [],
    interactables: [],   // {kind:'read'|'sit'|..., x,y,z, r, prompt, text}
    events: [],          // scripted scenes for the map / bubbles
    landmarks: [],       // {name, x, z, kind} for the map
    places: [],          // named areas for the location label {name, x0,z0,x1,z1}
    signals: [],
    streetSignType,
  };
  ctx.props = new Props(ctx);
  ctx.people = new People(ctx);
  return ctx;
}
