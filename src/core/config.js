// Global constants shared by every system.
export const VS = 0.25;            // world voxel size in metres
export const INV_VS = 1 / VS;
export const CHUNK = 32;           // chunk edge in voxels (8 m)
export const REGION = 4;           // chunk columns per render region edge (32 m)
export const PROP_VS = 1 / 16;     // default prop voxel size in metres

export const WATER_Y = -1.5;       // harbour water level (m)
export const SIDEWALK_Y = 0.25;    // top of sidewalks / building ground floors (m)

export const START_TIME = 16 * 60 + 40; // 4:40 PM, minutes since midnight
export const DATE_LABEL = 'Saturday, September 26, 1953';
export const TOWN_NAME = 'Juniper Bay';

export const QUALITY = {
  high:   { label: 'High',   shadowSize: 4096, pixelRatio: 1.5, shadowRange: 90,  interiorRadius: 56, propRadius: 190, lights: 24, peopleRadius: 150 },
  medium: { label: 'Medium', shadowSize: 2048, pixelRatio: 1.0, shadowRange: 70,  interiorRadius: 44, propRadius: 140, lights: 16, peopleRadius: 110 },
  low:    { label: 'Low',    post: false, shadowSize: 1024, pixelRatio: 0.75, shadowRange: 55, interiorRadius: 32, propRadius: 100, lights: 8,  peopleRadius: 80 },
};
