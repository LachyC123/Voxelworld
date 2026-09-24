// Building generator registry. Each module exports register(GEN, SITES):
//   GEN[kind] = (ctx, lot, spec) => Building   — builds one lot
//   SITES.push({ name, order, build(ctx) })     — builds a non-lot area (harbour, beach, terrain…)
import * as fallback from './fallback.js';
import * as residential from './residential.js';
import * as commercial from './commercial.js';
import * as civic from './civic.js';
import * as downtown from './downtown.js';
import * as harbor from './harbor.js';
import * as nature from './nature.js';

export const GEN = {};
export const SITES = [];
for (const m of [fallback, residential, commercial, civic, downtown, harbor, nature]) if (m.register) m.register(GEN, SITES);
