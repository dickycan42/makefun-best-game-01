// Starfall Salvage — tuning constants and the deep-blue / gold palette.
// One place holds every number that shapes how the game feels, so balancing
// never means hunting through the simulation code.

export const FIELD_WIDTH = 960;
export const FIELD_HEIGHT = 540;

export const PALETTE = {
  skyTop: '#070d24',
  skyMid: '#0e1a44',
  skyBottom: '#16265e',
  ground: '#0a1230',
  gold: '#f5c542',
  goldBright: '#ffd76a',
  goldDim: '#a97f1e',
  cyan: '#7fe3ff',
  cyanDim: '#3d8fb0',
  hull: '#ff5d6c',
  shield: '#8ef7ff',
  magnet: '#c78bff',
  text: '#f2ead8',
  textDim: '#9fb0d8',
  panel: 'rgba(8, 14, 38, 0.82)',
  panelEdge: 'rgba(245, 197, 66, 0.55)',
};

export const DRONE = {
  radius: 16,
  accel: 2600,
  maxSpeed: 420,
  drag: 6.5,
  mouseFollow: 14,
};

export const PULSE = {
  cooldownSeconds: 0.45,
  maxRadius: 110,
  doubleRadius: 190,
  ringWidth: 5,
  expandSeconds: 0.32,
  asteroidPoints: 5,
};

export const SHARD = {
  radius: 11,
  basePoints: 10,
  fallMin: 55,
  fallMax: 95,
  swayAmplitude: 26,
  swaySpeed: 1.6,
};

export const ASTEROID = {
  radiusMin: 15,
  radiusMax: 30,
  fallMin: 70,
  fallMax: 130,
};

export const COMET = {
  radius: 26,
  points: 250,
  speed: 150,
};

export const PICKUP = {
  radius: 13,
  fallSpeed: 60,
  magnetSeconds: 8,
  doublePulses: 3,
};

export const WAVES = {
  total: 10,
  hullStart: 3,
  comboPerMultiplier: 8,
  multiplierCap: 5,
  invulnerableSeconds: 1.2,
  waveClearBonus: 100,
};

export function shardsForWave(wave) {
  return 12 + wave * 2;
}

export function asteroidChanceForWave(wave) {
  return Math.min(0.12 + wave * 0.035, 0.42);
}

export function fallSpeedForWave(wave) {
  return 1 + (wave - 1) * 0.09;
}

export function spawnGapForWave(wave) {
  return Math.max(0.46 - wave * 0.03, 0.22);
}
