// The deterministic screenshot states behind ?shot=title|play|victory|gameover.
// Each scene starts a fresh world from the seed in the query string and
// plays it forward with the same step function a live player uses, steered
// by a small autopilot that chases shards, keeps clear of asteroids and
// fires its pulse when the shot is lined up. The same seed always gives
// the same frame; no scene ever reads the clock or the mouse.

import { FIELD_HEIGHT, FIELD_WIDTH, WAVES, shardsForWave } from './config.js';
import { makeWorld, PHASE_GAMEOVER, PHASE_PLAYING, PHASE_TITLE, PHASE_VICTORY, resetWorld, startGame, stepWorld } from './world.js';
import { KIND_ASTEROID, KIND_SHARD } from './objects.js';

const STEP = 1 / 60;
const TITLE_SECONDS = 4;
const PLAY_SECONDS = 8;
const END_SECONDS = 900;

function syntheticInput() {
  const state = {
    left: false,
    right: false,
    up: false,
    down: false,
    pointerActive: false,
    pointerX: FIELD_WIDTH / 2,
    pointerY: FIELD_HEIGHT / 2,
  };
  let queuedPulse = false;
  return {
    state,
    queuePulse() {
      queuedPulse = true;
    },
    consumeAction() {
      const value = queuedPulse;
      queuedPulse = false;
      return value;
    },
  };
}

/** Seconds until the drone, drifting in `direction`, meets an asteroid. */
function dangerAhead(world, direction, horizon) {
  const drone = world.drone;
  const speed = 300;
  for (let t = STEP; t <= horizon; t += STEP) {
    const x = Math.max(16, Math.min(FIELD_WIDTH - 16, drone.x + direction * speed * t));
    const y = drone.y;
    for (const entity of world.entities) {
      if (!entity.alive || entity.kind !== KIND_ASTEROID) continue;
      const ey = entity.y + entity.vy * t;
      const ex = entity.x + entity.vx * t;
      if (Math.abs(ey - y) < entity.radius + 18 && Math.abs(ex - x) < entity.radius + 18) return t;
    }
  }
  return Infinity;
}

/**
 * Steer toward the lowest shard, slide away from asteroids that are about
 * to cross the drone's path, and fire when two or more shards sit inside
 * pulse range. When `caution` is true the pilot is careless instead: it
 * never dodges and never fires, so it gets caught out like a hurried
 * player and the run ends in a game over.
 */
function autopilot(world, input, caution) {
  const drone = world.drone;
  const horizon = caution ? 0.22 : 0.8;
  let target = null;
  for (const entity of world.entities) {
    if (!entity.alive || entity.kind !== KIND_SHARD) continue;
    if (target === null || entity.y > target.y) target = entity;
  }
  if (world.comet && world.comet.alive) target = world.comet;

  const centre = target === null ? FIELD_WIDTH / 2 : target.x;
  const wanted = centre > drone.x + 10 ? 1 : centre < drone.x - 10 ? -1 : 0;
  const state = input.state;
  state.left = false;
  state.right = false;
  state.up = false;
  state.down = false;

  // A careless pilot (the game-over scene) never looks for asteroids at
  // all: it chases shards in a straight line and gets caught out, as a
  // hurried player is. A careful pilot picks the safest direction.
  let bestDirection = wanted;
  if (!caution) {
    const safeWanted = dangerAhead(world, wanted, horizon);
    let bestTime = safeWanted;
    for (const direction of [0, -1, 1]) {
      const time = dangerAhead(world, direction, horizon);
      if (time > bestTime) {
        bestTime = time;
        bestDirection = direction;
      }
    }
  }
  if (bestDirection === -1) state.left = true;
  if (bestDirection === 1) state.right = true;

  const lowest = target === null ? null : target;
  if (lowest !== null) {
    const dy = lowest.y - drone.y;
    if (dy > 60) state.down = true;
    if (dy < -60) state.up = true;
  }

  if (caution) return;
  let inRange = 0;
  for (const entity of world.entities) {
    if (!entity.alive || entity.kind !== KIND_SHARD) continue;
    if (Math.hypot(entity.x - drone.x, entity.y - drone.y) < 100) inRange += 1;
  }
  if (world.comet && world.comet.alive && Math.hypot(world.comet.x - drone.x, world.comet.y - drone.y) < 110) {
    inRange += 3;
  }
  if (inRange >= 2 && drone.pulseCooldown <= 0) input.queuePulse();
}

/** Play forward until `seconds` pass or the world stops being played. */
function simulate(world, seconds, caution) {
  const input = syntheticInput();
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    if (world.phase !== PHASE_PLAYING) break;
    autopilot(world, input, caution);
    stepWorld(world, STEP, input, null);
  }
  return input;
}

/**
 * Stage one named scene on `world` and return the phase to draw.
 * victory fast-forwards to the final wave, then lets the pilot finish it
 * through the real wave-clear path; gameover plays a careless pilot until
 * the hull is gone.
 */
export function stageShot(name, world) {
  if (name === 'play') {
    resetWorld(world, world.seed);
    startGame(world);
    simulate(world, PLAY_SECONDS, false);
    return world.phase === PHASE_PLAYING ? PHASE_PLAYING : PHASE_GAMEOVER;
  }
  if (name === 'gameover') {
    resetWorld(world, world.seed);
    startGame(world);
    simulate(world, END_SECONDS, true);
    return world.phase === PHASE_GAMEOVER ? PHASE_GAMEOVER : PHASE_PLAYING;
  }
  if (name === 'victory') {
    resetWorld(world, world.seed);
    startGame(world);
    world.wave = WAVES.total;
    world.shardsSpawned = 0;
    world.shardsQuota = shardsForWave(WAVES.total);
    world.spawnTimer = 0.4;
    world.score = 2840;
    world.shardsCaught = 96;
    world.bestCombo = 21;
    simulate(world, END_SECONDS, false);
    return world.phase === PHASE_VICTORY ? PHASE_VICTORY : PHASE_GAMEOVER;
  }
  resetWorld(world, world.seed);
  world.phase = PHASE_TITLE;
  for (let i = 0; i < TITLE_SECONDS / STEP; i += 1) stepWorld(world, STEP, null, null);
  return PHASE_TITLE;
}

export function shotNameFromUrl(url) {
  const params = new URL(url, 'http://localhost').searchParams;
  const shot = params.get('shot') || 'title';
  const seed = Number.parseInt(params.get('seed') || '7', 10);
  return { shot, seed: Number.isFinite(seed) ? seed : 7 };
}
