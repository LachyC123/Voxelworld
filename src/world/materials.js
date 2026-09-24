// World voxel material table. Every world voxel stores one of these ids (0 = air).
// Materials carry a base colour, a secondary colour, a procedural surface pattern
// (evaluated per-voxel / sub-voxel in the fragment shader) and flags.
import { hexToRgb } from '../core/util.js';

export const PAT = {
  NONE: 0, BRICK: 1, PLANK_X: 2, PLANK_Z: 3, CHECKER: 4, STRIPES: 5, CLAPBOARD: 6, SHINGLE: 7,
  TILE: 8, WP_STRIPE: 9, WP_DOT: 10, STONE: 11, NOISE: 12, COBBLE: 13, CARPET: 14, WATER: 15,
  PANEL: 16, GRAVEL: 17, SLAB: 18, ASPHALT: 19, PAVER: 20, LEAVES: 21, BIGCHECK: 22, METAL: 23,
  MARBLE: 24, TERRAZZO: 25,
};

// emissive modes
export const EMIT = { NONE: 0, ALWAYS: 1, NIGHT: 2, NEON: 3, TV: 4, FIRE: 5, SCREEN: 6 };

export const MAT = Object.create(null);
export const MATS = [null];
const FLAG_SOLID = 1, FLAG_TRANSPARENT = 2, FLAG_NOCOLLIDE = 4, FLAG_GLASS = 8, FLAG_WATER = 16;
export const MFLAG = { SOLID: FLAG_SOLID, TRANSPARENT: FLAG_TRANSPARENT, NOCOLLIDE: FLAG_NOCOLLIDE, GLASS: FLAG_GLASS, WATER: FLAG_WATER };

function def(name, color, o = {}) {
  const id = MATS.length;
  if (id > 254) throw new Error('too many materials');
  const m = {
    id, name,
    color: hexToRgb(color),
    color2: hexToRgb(o.c2 ?? color),
    jitter: o.j ?? 0.06,
    pattern: o.p ?? PAT.NONE,
    emissive: o.e ?? 0,
    emitMode: o.em ?? (o.e ? EMIT.ALWAYS : EMIT.NONE),
    spec: o.spec ?? 0,
    glass: !!o.glass, water: !!o.water,
    transparent: !!(o.glass || o.water),
    collide: o.collide ?? !o.water,
  };
  MATS.push(m);
  MAT[name] = id;
  return id;
}

// ---------------------------------------------------------------- ground
def('dirt', '#6b4f36', { j: 0.12, p: PAT.NOISE, c2: '#5a4230' });
def('grass', '#5f8a36', { j: 0.12, p: PAT.NOISE, c2: '#6a9038' });
def('grass_dry', '#9a9448', { j: 0.14, p: PAT.NOISE, c2: '#b0a052' });
def('grass_lawn', '#55853a', { j: 0.1, p: PAT.NOISE, c2: '#5f8e3c' });
def('asphalt', '#3b3b40', { j: 0.05, p: PAT.ASPHALT, c2: '#46464c' });
def('asphalt_old', '#47464a', { j: 0.07, p: PAT.ASPHALT, c2: '#55534f' });
def('road_white', '#e6e2d6', { j: 0.04 });
def('road_yellow', '#e0b43c', { j: 0.05 });
def('curb', '#a9a49a', { j: 0.05 });
def('sidewalk', '#bdb6a8', { j: 0.05, p: PAT.SLAB, c2: '#aaa395' });
def('sidewalk_brick', '#9e4b3a', { j: 0.12, p: PAT.PAVER, c2: '#b3624a' });
def('cobble', '#8a8479', { j: 0.14, p: PAT.COBBLE, c2: '#6d675e' });
def('gravel', '#9b9387', { j: 0.12, p: PAT.GRAVEL, c2: '#7c756b' });
def('sand', '#e0cc98', { j: 0.08, p: PAT.NOISE, c2: '#d4bd86' });
def('quay_stone', '#8f8a80', { j: 0.08, p: PAT.STONE, c2: '#77736b' });
def('dock_wood', '#8a6a48', { j: 0.1, p: PAT.PLANK_X, c2: '#6f5238' });
def('dock_wood_z', '#8a6a48', { j: 0.1, p: PAT.PLANK_Z, c2: '#6f5238' });
def('rail_steel', '#5b5550', { j: 0.03, spec: 0.5, p: PAT.METAL });
def('rail_tie', '#4e3a2a', { j: 0.1 });
def('plaza_cream', '#e2d3b0', { j: 0.05 });
def('plaza_red', '#a4432f', { j: 0.07 });
def('plaza_teal', '#2f6f6a', { j: 0.06 });
def('plaza_dark', '#5b4a3e', { j: 0.06 });
def('mulch', '#5a3b28', { j: 0.15, p: PAT.NOISE, c2: '#4a3020' });
def('flowerbed_red', '#b3342b', { j: 0.25, p: PAT.NOISE, c2: '#5a8a38' });
def('flowerbed_yellow', '#d8b030', { j: 0.25, p: PAT.NOISE, c2: '#5a8a38' });
def('flowerbed_purple', '#7b4a9a', { j: 0.25, p: PAT.NOISE, c2: '#5a8a38' });
def('hedge', '#3f6a2e', { j: 0.14, p: PAT.LEAVES, c2: '#4f7a36' });
def('water', '#3f7f95', { water: true, p: PAT.WATER, j: 0 });
def('ball_field', '#b58a5a', { j: 0.08, p: PAT.NOISE, c2: '#a47a4c' });

// ---------------------------------------------------------------- masonry & walls
def('brick_red', '#a3432f', { j: 0.07, p: PAT.BRICK, c2: '#cfc2ae' });
def('brick_dark', '#6e3024', { j: 0.07, p: PAT.BRICK, c2: '#a89c8a' });
def('brick_brown', '#7a4a33', { j: 0.07, p: PAT.BRICK, c2: '#b8ab98' });
def('brick_orange', '#b85d3a', { j: 0.07, p: PAT.BRICK, c2: '#d6c8b2' });
def('brick_yellow', '#c9a66a', { j: 0.06, p: PAT.BRICK, c2: '#e5dcc8' });
def('brick_white', '#ddd5c6', { j: 0.05, p: PAT.BRICK, c2: '#bfb6a6' });
def('brick_paint_red', '#9e2f2a', { j: 0.05, p: PAT.BRICK, c2: '#c6b8a4' });
def('limestone', '#dccfb2', { j: 0.05, p: PAT.STONE, c2: '#c7b99a' });
def('sandstone', '#d2b07e', { j: 0.05, p: PAT.STONE, c2: '#bf9c6c' });
def('granite', '#8e8b87', { j: 0.07, p: PAT.STONE, c2: '#7a7773' });
def('granite_pink', '#b39488', { j: 0.07, p: PAT.STONE, c2: '#9e7f73' });
def('stone_foundation', '#79756c', { j: 0.08, p: PAT.STONE, c2: '#66625a' });
def('terracotta', '#c77a4f', { j: 0.05, c2: '#b56a42' });
def('marble', '#ebe7df', { j: 0.03, p: PAT.MARBLE, c2: '#cfc9bf' });
def('concrete', '#b1aca2', { j: 0.05 });
def('concrete_dark', '#8a857c', { j: 0.05 });
def('stucco_cream', '#e8dab4', { j: 0.03 });
def('stucco_yellow', '#e2c26a', { j: 0.03 });
def('stucco_teal', '#3f8f86', { j: 0.03 });
def('stucco_pink', '#d9a194', { j: 0.03 });
def('stucco_white', '#ece8dc', { j: 0.03 });
def('stucco_tan', '#c9aa7c', { j: 0.03 });
def('stucco_sage', '#9fae8a', { j: 0.03 });
def('art_deco_cream', '#e4d5b5', { j: 0.03, p: PAT.STONE, c2: '#d6c6a2' });
def('art_deco_gold', '#c9a24a', { j: 0.05, spec: 0.5 });
def('terracotta_red', '#b8412f', { j: 0.05 });

// wood siding (clapboard) for houses
def('siding_white', '#e9e5da', { j: 0.03, p: PAT.CLAPBOARD });
def('siding_yellow', '#e6cf7c', { j: 0.03, p: PAT.CLAPBOARD });
def('siding_blue', '#7fa3b8', { j: 0.03, p: PAT.CLAPBOARD });
def('siding_green', '#8faa86', { j: 0.03, p: PAT.CLAPBOARD });
def('siding_red', '#a4483a', { j: 0.03, p: PAT.CLAPBOARD });
def('siding_gray', '#a9aaa4', { j: 0.03, p: PAT.CLAPBOARD });
def('siding_mint', '#bfd8c2', { j: 0.03, p: PAT.CLAPBOARD });
def('siding_pink', '#e3b7aa', { j: 0.03, p: PAT.CLAPBOARD });
def('siding_brown', '#8a6a4f', { j: 0.03, p: PAT.CLAPBOARD });
def('shingle_wall', '#a08a6a', { j: 0.08, p: PAT.SHINGLE, c2: '#8a7456' });

// ---------------------------------------------------------------- roofs
def('roof_tar', '#5d5a57', { j: 0.08, p: PAT.GRAVEL, c2: '#6c6964' });
def('roof_tar_light', '#8a867f', { j: 0.08, p: PAT.GRAVEL, c2: '#9a968e' });
def('roof_shingle_gray', '#5f6166', { j: 0.08, p: PAT.SHINGLE, c2: '#4c4e53' });
def('roof_shingle_brown', '#6e4a36', { j: 0.08, p: PAT.SHINGLE, c2: '#5a3a2a' });
def('roof_shingle_red', '#8e3a2e', { j: 0.08, p: PAT.SHINGLE, c2: '#742e24' });
def('roof_shingle_green', '#4c6a4a', { j: 0.08, p: PAT.SHINGLE, c2: '#3c563a' });
def('roof_shingle_black', '#3a3a3e', { j: 0.08, p: PAT.SHINGLE, c2: '#2c2c30' });
def('roof_copper', '#4f9a7c', { j: 0.07, p: PAT.SHINGLE, c2: '#5fae8e' });
def('roof_teal_tile', '#2f7f74', { j: 0.07, p: PAT.SHINGLE, c2: '#3d9184' });
def('roof_slate', '#4b5563', { j: 0.07, p: PAT.SHINGLE, c2: '#3d4653' });
def('roof_tile_red', '#b2503a', { j: 0.07, p: PAT.SHINGLE, c2: '#9a4230' });

// ---------------------------------------------------------------- trims & details
def('trim_white', '#efeae0', { j: 0.02 });
def('trim_cream', '#e2d6b8', { j: 0.02 });
def('trim_green', '#2f4f3a', { j: 0.03 });
def('trim_dark', '#2b2a2e', { j: 0.03 });
def('trim_brown', '#5a3d2a', { j: 0.04 });
def('trim_red', '#8e2a24', { j: 0.03 });
def('trim_blue', '#2c4a6a', { j: 0.03 });
def('trim_teal', '#2c6a66', { j: 0.03 });
def('trim_gold', '#c9a24a', { j: 0.05, spec: 0.6 });
def('trim_black', '#1c1c20', { j: 0.02 });
def('iron', '#2f3034', { j: 0.05, p: PAT.METAL, spec: 0.3 });
def('iron_green', '#2e4a3c', { j: 0.05, p: PAT.METAL, spec: 0.3 });
def('steel', '#7c7f84', { j: 0.05, p: PAT.METAL, spec: 0.5 });
def('steel_red', '#b0302a', { j: 0.05, p: PAT.METAL, spec: 0.3 });
def('steel_white', '#e0e0dc', { j: 0.04, p: PAT.METAL, spec: 0.3 });
def('crane_yellow', '#e0b030', { j: 0.05, p: PAT.METAL, spec: 0.3 });
def('ship_black', '#26272b', { j: 0.04, p: PAT.METAL });
def('ship_red', '#9a2a24', { j: 0.04, p: PAT.METAL });
def('ship_white', '#e8e6e0', { j: 0.03, p: PAT.METAL });
def('rust', '#8a4a2a', { j: 0.12, p: PAT.NOISE, c2: '#6a3a22' });
def('wood_dark', '#4a3324', { j: 0.08, p: PAT.PLANK_X, c2: '#3a281c' });
def('wood_mid', '#7a5536', { j: 0.08, p: PAT.PLANK_X, c2: '#654528' });
def('wood_light', '#b08a5c', { j: 0.08, p: PAT.PLANK_X, c2: '#9a764c' });
def('wood_pale', '#cdb48a', { j: 0.07, p: PAT.PLANK_X, c2: '#bba079' });
def('wood_gray', '#8f877b', { j: 0.1, p: PAT.PLANK_X, c2: '#7a7266' });
def('wood_post', '#5e4330', { j: 0.08 });
def('fence_white', '#ecebe4', { j: 0.03 });
def('canvas_white', '#ece6d6', { j: 0.04 });
def('canvas_tan', '#cdb38a', { j: 0.05 });

// awnings (stripes)
def('awning_red', '#b3342b', { p: PAT.STRIPES, c2: '#efe7d6', j: 0.02 });
def('awning_green', '#2f6f4a', { p: PAT.STRIPES, c2: '#efe7d6', j: 0.02 });
def('awning_blue', '#2d5a8a', { p: PAT.STRIPES, c2: '#efe7d6', j: 0.02 });
def('awning_yellow', '#d6a92e', { p: PAT.STRIPES, c2: '#f2ead6', j: 0.02 });
def('awning_teal', '#2c7a74', { p: PAT.STRIPES, c2: '#efe7d6', j: 0.02 });
def('awning_solid_red', '#a02e28', { j: 0.03 });
def('awning_solid_green', '#2d5d40', { j: 0.03 });
def('awning_solid_navy', '#233a58', { j: 0.03 });

// signs & paint
def('sign_black', '#1d1d22', { j: 0.02 });
def('sign_white', '#f1ede2', { j: 0.02 });
def('sign_cream', '#efe3c2', { j: 0.02 });
def('sign_red', '#b3302a', { j: 0.02 });
def('sign_green', '#1f5a3e', { j: 0.02 });
def('sign_navy', '#1f2f4f', { j: 0.02 });
def('sign_gold', '#d9b24a', { j: 0.03, spec: 0.5 });
def('sign_yellow', '#e8c43a', { j: 0.02 });
def('sign_teal', '#2a6f6a', { j: 0.02 });
def('sign_orange', '#d9782e', { j: 0.02 });
def('sign_blue', '#2f6aa8', { j: 0.02 });
def('sign_brown', '#6a4228', { j: 0.02 });
def('flag_red', '#b3262a', { j: 0.02 });
def('flag_white', '#f0ede6', { j: 0.02 });
def('flag_blue', '#1f3a6e', { j: 0.02 });

// lights & emissive
def('bulb_warm', '#ffe0a0', { e: 1.0, em: EMIT.NIGHT, j: 0 });
def('bulb_always', '#fff0c8', { e: 1.0, em: EMIT.ALWAYS, j: 0 });
def('lamp_glass', '#fff1c8', { e: 0.9, em: EMIT.NIGHT, j: 0 });
def('neon_red', '#ff4a3a', { e: 1.0, em: EMIT.NEON, j: 0 });
def('neon_pink', '#ff6ab0', { e: 1.0, em: EMIT.NEON, j: 0 });
def('neon_green', '#5aff8a', { e: 1.0, em: EMIT.NEON, j: 0 });
def('neon_blue', '#5ab0ff', { e: 1.0, em: EMIT.NEON, j: 0 });
def('neon_yellow', '#ffd84a', { e: 1.0, em: EMIT.NEON, j: 0 });
def('marquee_bulbs', '#ffe7a0', { e: 1.0, em: EMIT.NEON, j: 0.1, p: PAT.CHECKER, c2: '#c9a24a' });
def('fire', '#ff8a2a', { e: 1.0, em: EMIT.FIRE, j: 0.2 });
def('tv_screen', '#9fb8c8', { e: 0.8, em: EMIT.TV, j: 0 });
def('movie_screen', '#e8e4dc', { e: 0.9, em: EMIT.SCREEN, j: 0 });
def('clock_face', '#f4efe0', { e: 0.35, em: EMIT.NIGHT, j: 0 });
def('lighthouse_lamp', '#fff4c0', { e: 1.2, em: EMIT.NIGHT, j: 0 });
def('traffic_red', '#ff3020', { e: 0.9, em: EMIT.ALWAYS, j: 0 });
def('traffic_green', '#40ff80', { e: 0.9, em: EMIT.ALWAYS, j: 0 });
def('window_lit', '#ffd890', { e: 0.8, em: EMIT.NIGHT, j: 0.05 });

// glass
def('glass', '#9fc3cf', { glass: true, j: 0 });
def('glass_dark', '#5a7584', { glass: true, j: 0 });
def('glass_shop', '#bcd8de', { glass: true, j: 0 });
def('glass_stained_red', '#c0302a', { glass: true, j: 0.25 });
def('glass_stained_blue', '#2a4ab0', { glass: true, j: 0.25 });
def('glass_stained_gold', '#e0b030', { glass: true, j: 0.25 });
def('glass_stained_green', '#2a8a4a', { glass: true, j: 0.25 });
def('glass_stained_purple', '#6a2a9a', { glass: true, j: 0.25 });
def('glass_green', '#7fb8a0', { glass: true, j: 0 });

// ---------------------------------------------------------------- interiors
def('plaster_white', '#eae4d8', { j: 0.015 });
def('plaster_cream', '#e8dcc0', { j: 0.015 });
def('plaster_green', '#b9c9a8', { j: 0.015 });
def('plaster_blue', '#b0c4d4', { j: 0.015 });
def('plaster_pink', '#e4c2b8', { j: 0.015 });
def('plaster_yellow', '#eed9a0', { j: 0.015 });
def('plaster_mint', '#c6dccc', { j: 0.015 });
def('plaster_gray', '#c4c2bc', { j: 0.015 });
def('ceiling', '#f0ebe0', { j: 0.01 });
def('ceiling_tin', '#d8d2c4', { j: 0.01, p: PAT.TILE, c2: '#bcb5a6' });
def('wallpaper_rose', '#d9b2a6', { p: PAT.WP_DOT, c2: '#b8786e', j: 0.01 });
def('wallpaper_green', '#a9bf98', { p: PAT.WP_STRIPE, c2: '#93aa82', j: 0.01 });
def('wallpaper_blue', '#a8bccd', { p: PAT.WP_STRIPE, c2: '#94a9bb', j: 0.01 });
def('wallpaper_cream', '#e6d7b2', { p: PAT.WP_DOT, c2: '#c9a86a', j: 0.01 });
def('wallpaper_yellow', '#e8d08c', { p: PAT.WP_STRIPE, c2: '#d6ba70', j: 0.01 });
def('wallpaper_red', '#9a3a34', { p: PAT.WP_DOT, c2: '#c79a5a', j: 0.01 });
def('wallpaper_teal', '#6f9e98', { p: PAT.WP_DOT, c2: '#d6ccb0', j: 0.01 });
def('wood_panel', '#6e4a30', { p: PAT.PANEL, c2: '#5a3a24', j: 0.04 });
def('wood_panel_light', '#a17a50', { p: PAT.PANEL, c2: '#8a6640', j: 0.04 });
def('floor_oak', '#a57a4c', { p: PAT.PLANK_X, c2: '#8e6840', j: 0.06 });
def('floor_oak_z', '#a57a4c', { p: PAT.PLANK_Z, c2: '#8e6840', j: 0.06 });
def('floor_walnut', '#6a4630', { p: PAT.PLANK_X, c2: '#583a26', j: 0.06 });
def('floor_walnut_z', '#6a4630', { p: PAT.PLANK_Z, c2: '#583a26', j: 0.06 });
def('floor_pine', '#c49a64', { p: PAT.PLANK_X, c2: '#ae8654', j: 0.06 });
def('floor_pine_z', '#c49a64', { p: PAT.PLANK_Z, c2: '#ae8654', j: 0.06 });
def('floor_checker', '#e9e4d8', { p: PAT.CHECKER, c2: '#26262a', j: 0.02 });
def('floor_checker_red', '#e9e4d8', { p: PAT.CHECKER, c2: '#a02e28', j: 0.02 });
def('floor_checker_green', '#e9e4d8', { p: PAT.CHECKER, c2: '#2f5f48', j: 0.02 });
def('floor_bigcheck', '#e2dccd', { p: PAT.BIGCHECK, c2: '#3a3a40', j: 0.02 });
def('floor_tile_white', '#e6e3dc', { p: PAT.TILE, c2: '#c8c4bb', j: 0.02 });
def('floor_tile_blue', '#a8c0cc', { p: PAT.TILE, c2: '#8aa4b2', j: 0.02 });
def('floor_linoleum', '#b9a47a', { p: PAT.TILE, c2: '#a38e66', j: 0.04 });
def('floor_linoleum_green', '#8fa688', { p: PAT.BIGCHECK, c2: '#c9c2a8', j: 0.03 });
def('floor_terrazzo', '#d4ccbc', { p: PAT.TERRAZZO, c2: '#9c9284', j: 0.03 });
def('floor_marble', '#e8e2d6', { p: PAT.MARBLE, c2: '#c9bfae', j: 0.02 });
def('floor_concrete', '#9e998f', { j: 0.05, p: PAT.SLAB, c2: '#908b81' });
def('carpet_red', '#8e2a2a', { p: PAT.CARPET, c2: '#7a2222', j: 0.03 });
def('carpet_green', '#3f5f40', { p: PAT.CARPET, c2: '#344f36', j: 0.03 });
def('carpet_blue', '#34496e', { p: PAT.CARPET, c2: '#2b3d5c', j: 0.03 });
def('carpet_beige', '#c4ae8a', { p: PAT.CARPET, c2: '#b09a78', j: 0.03 });
def('carpet_rose', '#b67a74', { p: PAT.CARPET, c2: '#a06862', j: 0.03 });
def('carpet_gold', '#b89040', { p: PAT.CARPET, c2: '#a07a30', j: 0.03 });
def('rug_oriental', '#8e3a2e', { p: PAT.CARPET, c2: '#2c3a5a', j: 0.15 });
def('tile_kitchen', '#e8e6de', { p: PAT.TILE, c2: '#b8c4c0', j: 0.01 });
def('tile_mint', '#b6d6c4', { p: PAT.TILE, c2: '#e8ece4', j: 0.01 });
def('tile_pink', '#e7b9b4', { p: PAT.TILE, c2: '#f0e4dc', j: 0.01 });
def('tile_yellow', '#ead27a', { p: PAT.TILE, c2: '#f0ead4', j: 0.01 });
def('chalkboard', '#2f4a3a', { j: 0.03 });
def('blackboard_text', '#e8e8e0', { j: 0.05 });
def('bookshelf_books', '#8a3a2a', { p: PAT.STRIPES, c2: '#2a4a6a', j: 0.3 });
def('stage_wood', '#8a5a34', { p: PAT.PLANK_X, c2: '#744a2a', j: 0.05 });
def('velvet_red', '#8a1f24', { j: 0.03 });
def('velvet_blue', '#243a6a', { j: 0.03 });
def('gym_floor', '#c8995a', { p: PAT.PLANK_Z, c2: '#b8894a', j: 0.04 });
def('rubber_mat', '#3a3a3a', { j: 0.05 });
def('bowling_lane', '#d4b07a', { p: PAT.PLANK_Z, c2: '#c9a26a', j: 0.02, spec: 0.5 });
def('pool_felt', '#2a6a3a', { j: 0.03 });
def('bar_top', '#4a2a1c', { j: 0.03, spec: 0.5 });
def('chrome', '#c9ccd0', { j: 0.03, spec: 0.8, p: PAT.METAL });
def('counter_formica', '#d8c89a', { j: 0.02, spec: 0.3 });
def('counter_red', '#b3302a', { j: 0.02, spec: 0.3 });
def('counter_teal', '#5ab0a8', { j: 0.02, spec: 0.3 });
def('stainless', '#b4b8bc', { j: 0.03, spec: 0.7, p: PAT.METAL });
def('enamel_white', '#f0eee8', { j: 0.01, spec: 0.5 });
def('enamel_mint', '#bfe0cc', { j: 0.01, spec: 0.5 });
def('enamel_black', '#1f1f22', { j: 0.01, spec: 0.5 });
def('mirror', '#cfd9dc', { j: 0.01, spec: 1.0 });

// ---------------------------------------------------------------- nature
def('leaves_green', '#4c7a34', { j: 0.18, p: PAT.LEAVES, c2: '#6a9040' });
def('leaves_dark', '#335a2c', { j: 0.18, p: PAT.LEAVES, c2: '#446a34' });
def('leaves_orange', '#d2742a', { j: 0.2, p: PAT.LEAVES, c2: '#e89a3a' });
def('leaves_red', '#b3322a', { j: 0.2, p: PAT.LEAVES, c2: '#cf4a2e' });
def('leaves_yellow', '#dcb238', { j: 0.2, p: PAT.LEAVES, c2: '#ecc84a' });
def('leaves_maroon', '#7a2a26', { j: 0.2, p: PAT.LEAVES, c2: '#96382e' });
def('bark', '#5a4232', { j: 0.12, p: PAT.NOISE, c2: '#4a3426' });
def('bark_birch', '#e0dcd0', { j: 0.1, p: PAT.NOISE, c2: '#3a3530' });
def('pine', '#2f5238', { j: 0.14, p: PAT.LEAVES, c2: '#3a6042' });
def('rock', '#7d7a73', { j: 0.14, p: PAT.NOISE, c2: '#6a675f' });
def('snow', '#f4f4f0', { j: 0.03 });
def('pumpkin', '#e07a22', { j: 0.08 });
def('hay', '#d9b860', { j: 0.14, p: PAT.NOISE, c2: '#c4a24a' });
def('leaf_litter', '#b8642a', { j: 0.3, p: PAT.NOISE, c2: '#8a8a3a' });

export const MAT_COUNT = MATS.length;

export function matFlagsArray() {
  const a = new Uint8Array(256);
  for (let i = 1; i < MATS.length; i++) {
    const m = MATS[i];
    let f = 0;
    if (!m.transparent) f |= FLAG_SOLID;
    if (m.transparent) f |= FLAG_TRANSPARENT;
    if (!m.collide) f |= FLAG_NOCOLLIDE;
    if (m.glass) f |= FLAG_GLASS;
    if (m.water) f |= FLAG_WATER;
    a[i] = f;
  }
  return a;
}

// 256 x 4 RGBA8 texture data describing every material for the shaders.
export function materialTextureData() {
  const W = 256, H = 4;
  const d = new Uint8Array(W * H * 4);
  for (let i = 1; i < MATS.length; i++) {
    const m = MATS[i];
    let o = i * 4;
    d[o] = m.color[0]; d[o + 1] = m.color[1]; d[o + 2] = m.color[2]; d[o + 3] = Math.round(Math.min(1, m.jitter * 2) * 255);
    o = (W + i) * 4;
    d[o] = m.color2[0]; d[o + 1] = m.color2[1]; d[o + 2] = m.color2[2]; d[o + 3] = m.pattern;
    o = (W * 2 + i) * 4;
    d[o] = Math.round(Math.min(1, m.emissive / 1.5) * 255); d[o + 1] = m.emitMode; d[o + 2] = Math.round(m.spec * 255); d[o + 3] = (m.glass ? 1 : 0) | (m.water ? 2 : 0);
  }
  return { data: d, width: W, height: H };
}

export function matId(name) {
  const id = MAT[name];
  if (id === undefined) throw new Error('Unknown material: ' + name);
  return id;
}
