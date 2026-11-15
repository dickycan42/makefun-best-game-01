// Everything that falls out of the night sky: gold star shards to catch,
// grey asteroids to dodge or blast, the rare bonus comet, and the three
// pickups (shield, magnet, double pulse). Each entity is a plain record;
// the spawner decides what appears and when, the world moves them.

import {
  ASTEROID,
  COMET,
  FIELD_WIDTH,
  PICKUP,
  SHARD,
  asteroidChanceForWave,
  fallSpeedForWave,
} from './config.js';
import { range } from './random.js';

export const KIND_SHARD = 'shard';
export const KIND_ASTEROID = 'asteroid';
export const KIND_COMET = 'comet';
export const KIND_PICKUP = 'pickup';

export function makeShard(random, wave, yStart = -20) {
  const speed = range(random, SHARD.fallMin, SHARD.fallMax) * fallSpeedForWave(wave);
  return {
    kind: KIND_SHARD,
    x: range(random, 24, FIELD_WIDTH - 24),
    y: yStart,
    vx: 0,
    vy: speed,
    radius: SHARD.radius,
    phase: random() * Math.PI * 2,
    spin: range(random, 0.6, 1.8),
    sway: range(random, 8, SHARD.swayAmplitude),
    hue: random() < 0.75 ? 'gold' : 'cyan',
    alive: true,
    collected: false,
  };
}

export function makeAsteroid(random, wave, yStart = -30) {
  const radius = range(random, ASTEROID.radiusMin, ASTEROID.radiusMax);
  const speed = range(random, ASTEROID.fallMin, ASTEROID.fallMax) * fallSpeedForWave(wave);
  const points = [];
  const corners = 7 + Math.floor(random() * 3);
  for (let i = 0; i < corners; i += 1) {
    const angle = (i / corners) * Math.PI * 2;
    points.push({ angle, dist: radius * range(random, 0.72, 1.05) });
  }
  return {
    kind: KIND_ASTEROID,
    x: range(random, 40, FIELD_WIDTH - 40),
    y: yStart,
    vx: range(random, -14, 14),
    vy: speed,
    radius,
    points,
    spin: range(random, -0.9, 0.9),
    rotation: random() * Math.PI * 2,
    alive: true,
  };
}

export function makeComet(random, fromLeft) {
  return {
    kind: KIND_COMET,
    x: fromLeft ? -60 : FIELD_WIDTH + 60,
    y: range(random, 70, 220),
    vx: (fromLeft ? 1 : -1) * COMET.speed,
    vy: 0,
    radius: COMET.radius,
    alive: true,
    trail: [],
  };
}

export function makePickup(random, x, y, kind) {
  return {
    kind: KIND_PICKUP,
    pickupKind: kind,
    x,
    y,
    vx: 0,
    vy: PICKUP.fallSpeed,
    radius: PICKUP.radius,
    phase: random() * Math.PI * 2,
    alive: true,
  };
}

const PICKUP_KINDS = ['shield', 'magnet', 'double'];

/** Decide what the next spawn is: mostly a shard, sometimes an asteroid. */
export function nextSpawn(random, wave) {
  if (random() < asteroidChanceForWave(wave)) return KIND_ASTEROID;
  return KIND_SHARD;
}

export function randomPickupKind(random) {
  return PICKUP_KINDS[Math.floor(random() * PICKUP_KINDS.length)];
}

export function moveEntity(entity, dt, time) {
  if (entity.kind === KIND_SHARD) {
    entity.phase += entity.spin * dt;
    entity.x += Math.sin(time * SHARD.swaySpeed + entity.phase) * entity.sway * dt;
    entity.y += entity.vy * dt;
  } else if (entity.kind === KIND_ASTEROID) {
    entity.rotation += entity.spin * dt;
    entity.x += entity.vx * dt;
    entity.y += entity.vy * dt;
  } else if (entity.kind === KIND_COMET) {
    entity.x += entity.vx * dt;
    entity.trail.unshift({ x: entity.x, y: entity.y });
    if (entity.trail.length > 22) entity.trail.pop();
  } else if (entity.kind === KIND_PICKUP) {
    entity.phase += dt * 3;
    entity.y += entity.vy * dt;
  }
}

export function entityOffScreen(entity) {
  if (entity.kind === KIND_COMET) {
    return entity.vx > 0 ? entity.x > FIELD_WIDTH + 80 : entity.x < -80;
  }
  return entity.y > 580 || entity.x < -80 || entity.x > FIELD_WIDTH + 80;
}
