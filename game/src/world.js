// The world: the whole game state and the rules that move it forward.
// Title, playing, victory and game over live here; the renderer only draws
// what this module reports, and the shot stager only drives it with the
// same step function a live player uses.

import {
  COMET,
  DRONE,
  FIELD_HEIGHT,
  FIELD_WIDTH,
  PICKUP,
  PULSE,
  SHARD,
  WAVES,
  shardsForWave,
  spawnGapForWave,
} from './config.js';
import { makeDrone, resetDrone, steerDrone, droneCanPulse, droneFirePulse } from './drone.js';
import {
  KIND_ASTEROID,
  KIND_COMET,
  KIND_PICKUP,
  KIND_SHARD,
  entityOffScreen,
  makeAsteroid,
  makeComet,
  makePickup,
  makeShard,
  moveEntity,
  nextSpawn,
  randomPickupKind,
} from './objects.js';
import { makeSeededRandom } from './random.js';

export const PHASE_TITLE = 'title';
export const PHASE_PLAYING = 'playing';
export const PHASE_VICTORY = 'victory';
export const PHASE_GAMEOVER = 'gameover';

export const EVENT_NONE = 0;
export const EVENT_WAVE_CLEAR = 1;
export const EVENT_VICTORY = 2;
export const EVENT_GAMEOVER = 4;

export function makeWorld(seed) {
  const random = makeSeededRandom(seed);
  const world = {
    seed,
    random,
    phase: PHASE_TITLE,
    time: 0,
    score: 0,
    bestCombo: 0,
    combo: 0,
    wave: 1,
    hull: WAVES.hullStart,
    shardsCaught: 0,
    shardsMissed: 0,
    shardsSpawned: 0,
    shardsQuota: shardsForWave(1),
    spawnTimer: 0.6,
    waveBannerSeconds: 0,
    waveBannerText: '',
    shakeSeconds: 0,
    flashSeconds: 0,
    comet: null,
    cometTimer: 0,
    cometDoneForWave: false,
    entities: [],
    pulses: [],
    pickups: [],
    particles: [],
    drone: makeDrone(),
    message: '',
    messageSeconds: 0,
    stars: [],
  };
  for (let i = 0; i < 90; i += 1) {
    world.stars.push({
      x: random() * FIELD_WIDTH,
      y: random() * FIELD_HEIGHT,
      size: 0.6 + random() * 1.8,
      twinkle: random() * Math.PI * 2,
      speed: 0.4 + random() * 1.2,
    });
  }
  return world;
}

export function resetWorld(world, seed) {
  const fresh = makeWorld(seed === undefined ? world.seed : seed);
  Object.keys(world).forEach((key) => delete world[key]);
  Object.assign(world, fresh);
}

export function startGame(world) {
  resetWorld(world, world.seed);
  world.phase = PHASE_PLAYING;
  world.waveBannerText = 'WAVE 1 — SALVAGE THE FALLING STARS';
  world.waveBannerSeconds = 2.2;
}

export function comboMultiplier(combo) {
  return Math.min(1 + Math.floor(combo / WAVES.comboPerMultiplier), WAVES.multiplierCap);
}

export function scoreForShard(combo) {
  return SHARD.basePoints * comboMultiplier(combo);
}

function addParticles(world, x, y, count, color, speed) {
  for (let i = 0; i < count; i += 1) {
    const angle = world.random() * Math.PI * 2;
    const power = speed * (0.3 + world.random() * 0.7);
    world.particles.push({
      x,
      y,
      vx: Math.cos(angle) * power,
      vy: Math.sin(angle) * power,
      life: 0.5 + world.random() * 0.4,
      maxLife: 0.9,
      size: 1.5 + world.random() * 2.5,
      color,
    });
  }
}

function burstShard(world, shard, byPulse) {
  shard.alive = false;
  world.combo += 1;
  world.bestCombo = Math.max(world.bestCombo, world.combo);
  const points = scoreForShard(world.combo);
  world.score += points;
  world.shardsCaught += 1;
  addParticles(world, shard.x, shard.y, 10, shard.hue === 'gold' ? '#ffd76a' : '#7fe3ff', 120);
  return { points, byPulse };
}

function damageDrone(world, sound) {
  const drone = world.drone;
  if (drone.invulnerableSeconds > 0) return false;
  if (drone.shield) {
    drone.shield = false;
    drone.invulnerableSeconds = WAVES.invulnerableSeconds;
    world.message = 'SHIELD ABSORBED THE HIT';
    world.messageSeconds = 1.4;
    addParticles(world, drone.x, drone.y, 18, '#8ef7ff', 160);
    if (sound) sound.hurt();
    return false;
  }
  world.hull -= 1;
  world.combo = 0;
  drone.invulnerableSeconds = WAVES.invulnerableSeconds;
  world.shakeSeconds = 0.35;
  addParticles(world, drone.x, drone.y, 22, '#ff5d6c', 200);
  if (sound) sound.hurt();
  if (world.hull <= 0) {
    world.phase = PHASE_GAMEOVER;
    if (sound) sound.gameOver();
    return true;
  }
  return false;
}

function firePulse(world, sound) {
  const drone = world.drone;
  if (!droneCanPulse(drone)) return false;
  const doubled = droneFirePulse(drone);
  world.pulses.push({
    x: drone.x,
    y: drone.y,
    radius: 12,
    maxRadius: doubled ? PULSE.doubleRadius : PULSE.maxRadius,
    age: 0,
    doubled,
  });
  if (sound) sound.pulse();
  return true;
}

function applyPulse(world, pulse, sound) {
  const hitRadius = pulse.radius;
  for (const entity of world.entities) {
    if (!entity.alive) continue;
    const dx = entity.x - pulse.x;
    const dy = entity.y - pulse.y;
    if (Math.hypot(dx, dy) > hitRadius + entity.radius) continue;
    if (entity.kind === KIND_SHARD) {
      burstShard(world, entity, true);
      if (sound) sound.collect(world.combo);
    } else if (entity.kind === KIND_ASTEROID) {
      entity.alive = false;
      world.score += PULSE.asteroidPoints;
      addParticles(world, entity.x, entity.y, 14, '#b9c4d6', 150);
      if (sound) sound.asteroidBreak();
      if (world.random() < 0.22) {
        world.pickups.push(makePickup(world.random, entity.x, entity.y, randomPickupKind(world.random)));
      }
    }
  }
  if (world.comet && world.comet.alive) {
    const dx = world.comet.x - pulse.x;
    const dy = world.comet.y - pulse.y;
    if (Math.hypot(dx, dy) < hitRadius + world.comet.radius) {
      world.comet.alive = false;
      world.score += COMET.points;
      world.flashSeconds = 0.4;
      addParticles(world, world.comet.x, world.comet.y, 30, '#ffd76a', 260);
      world.message = `COMET SALVAGED  +${COMET.points}`;
      world.messageSeconds = 2;
      if (sound) sound.comet();
    }
  }
}

function spawnStep(world, dt) {
  if (world.shardsSpawned >= world.shardsQuota) return;
  world.spawnTimer -= dt;
  if (world.spawnTimer > 0) return;
  world.spawnTimer = spawnGapForWave(world.wave);
  const kind = nextSpawn(world.random, world.wave);
  if (kind === KIND_ASTEROID) {
    world.entities.push(makeAsteroid(world.random, world.wave));
  } else {
    world.entities.push(makeShard(world.random, world.wave));
    world.shardsSpawned += 1;
  }
}

function maybeSpawnComet(world, dt) {
  if (world.cometDoneForWave || world.comet) return;
  if (world.wave % 3 !== 0) return;
  world.cometTimer += dt;
  if (world.cometTimer < 6) return;
  world.comet = makeComet(world.random, world.random() < 0.5);
  world.cometDoneForWave = true;
  world.message = 'A COMET CROSSES THE SKY — PULSE IT!';
  world.messageSeconds = 2.4;
}

function checkWaveClear(world, sound) {
  if (world.shardsSpawned < world.shardsQuota) return EVENT_NONE;
  const left = world.entities.some((e) => e.alive && e.kind === KIND_SHARD);
  if (left) return EVENT_NONE;
  if (world.wave >= WAVES.total) {
    world.phase = PHASE_VICTORY;
    world.score += WAVES.waveClearBonus;
    if (sound) sound.victory();
    return EVENT_VICTORY;
  }
  world.wave += 1;
  world.shardsSpawned = 0;
  world.shardsQuota = shardsForWave(world.wave);
  world.spawnTimer = 0.8;
  world.cometTimer = 0;
  world.cometDoneForWave = false;
  world.score += WAVES.waveClearBonus;
  world.waveBannerText = `WAVE ${world.wave} CLEAR  +${WAVES.waveClearBonus}`;
  world.waveBannerSeconds = 2.2;
  if (sound) sound.waveClear();
  return EVENT_WAVE_CLEAR;
}

/**
 * Advance the world by `dt` seconds. `input` may be null (shot staging
 * passes a synthetic input object). Returns an event bitmask.
 */
export function stepWorld(world, dt, input, sound) {
  world.time += dt;
  for (const star of world.stars) {
    star.twinkle += dt * star.speed;
  }
  if (world.shakeSeconds > 0) world.shakeSeconds -= dt;
  if (world.flashSeconds > 0) world.flashSeconds -= dt;
  if (world.messageSeconds > 0) world.messageSeconds -= dt;
  if (world.waveBannerSeconds > 0) world.waveBannerSeconds -= dt;

  for (let i = world.particles.length - 1; i >= 0; i -= 1) {
    const p = world.particles[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.96;
    p.vy *= 0.96;
    if (p.life <= 0) world.particles.splice(i, 1);
  }

  if (world.phase !== PHASE_PLAYING) return EVENT_NONE;

  if (input && input.consumeAction && input.consumeAction()) firePulse(world, sound);
  steerDrone(world.drone, input ? input.state : { left: false, right: false, up: false, down: false, pointerActive: false }, dt);

  spawnStep(world, dt);
  maybeSpawnComet(world, dt);

  const drone = world.drone;
  const magnetOn = drone.magnetSeconds > 0;

  for (const entity of world.entities) {
    if (!entity.alive) continue;
    if (magnetOn && entity.kind === KIND_SHARD) {
      const dx = drone.x - entity.x;
      const dy = drone.y - entity.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 220 && dist > 1) {
        entity.x += (dx / dist) * 260 * dt;
        entity.y += (dy / dist) * 260 * dt;
      }
    }
    moveEntity(entity, dt, world.time);
    if (entityOffScreen(entity)) {
      entity.alive = false;
      if (entity.kind === KIND_SHARD) {
        world.shardsMissed += 1;
        world.combo = 0;
      }
      continue;
    }
    const dx = entity.x - drone.x;
    const dy = entity.y - drone.y;
    const touch = Math.hypot(dx, dy) < entity.radius + DRONE.radius - 2;
    if (!touch) continue;
    if (entity.kind === KIND_SHARD) {
      burstShard(world, entity, false);
      if (sound) sound.collect(world.combo);
    } else if (entity.kind === KIND_ASTEROID) {
      entity.alive = false;
      damageDrone(world, sound);
      if (world.phase !== PHASE_PLAYING) return EVENT_GAMEOVER;
    }
  }
  world.entities = world.entities.filter((e) => e.alive);

  if (world.comet) {
    moveEntity(world.comet, dt, world.time);
    if (entityOffScreen(world.comet)) world.comet = null;
  }

  for (let i = world.pulses.length - 1; i >= 0; i -= 1) {
    const pulse = world.pulses[i];
    pulse.age += dt;
    pulse.radius = 12 + (pulse.maxRadius - 12) * Math.min(pulse.age / PULSE.expandSeconds, 1);
    applyPulse(world, pulse, sound);
    if (pulse.age > PULSE.expandSeconds + 0.12) world.pulses.splice(i, 1);
  }

  for (let i = world.pickups.length - 1; i >= 0; i -= 1) {
    const pickup = world.pickups[i];
    moveEntity(pickup, dt, world.time);
    if (entityOffScreen(pickup)) {
      world.pickups.splice(i, 1);
      continue;
    }
    const dx = pickup.x - drone.x;
    const dy = pickup.y - drone.y;
    if (Math.hypot(dx, dy) < pickup.radius + DRONE.radius) {
      world.pickups.splice(i, 1);
      if (pickup.pickupKind === 'shield') {
        drone.shield = true;
        world.message = 'SHIELD UP — ONE HIT ABSORBED';
      } else if (pickup.pickupKind === 'magnet') {
        drone.magnetSeconds = PICKUP.magnetSeconds;
        world.message = 'MAGNET ACTIVE — SHARDS FLY TO YOU';
      } else {
        drone.doublePulses = PICKUP.doublePulses;
        world.message = 'DOUBLE PULSE — NEXT 3 PULSES ARE WIDE';
      }
      world.messageSeconds = 1.8;
      if (sound) sound.pickup(pickup.pickupKind);
    }
  }

  return checkWaveClear(world, sound);
}
