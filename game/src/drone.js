// The salvage drone the player pilots: a small craft with a gold collector
// ring, a thruster glow and a shield bubble when protected. It steers with
// velocity toward the keys and glides toward the pointer when the mouse
// is in charge, and it remembers its own trail for the renderer's motion
// streaks.

import { DRONE, FIELD_WIDTH, FIELD_HEIGHT } from './config.js';

export function makeDrone() {
  return {
    x: FIELD_WIDTH / 2,
    y: FIELD_HEIGHT - 90,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2,
    trail: [],
    shield: false,
    magnetSeconds: 0,
    doublePulses: 0,
    invulnerableSeconds: 0,
    pulseCooldown: 0,
    thrust: 0,
  };
}

export function resetDrone(drone) {
  drone.x = FIELD_WIDTH / 2;
  drone.y = FIELD_HEIGHT - 90;
  drone.vx = 0;
  drone.vy = 0;
  drone.angle = -Math.PI / 2;
  drone.trail.length = 0;
  drone.shield = false;
  drone.magnetSeconds = 0;
  drone.doublePulses = 0;
  drone.invulnerableSeconds = 0;
  drone.pulseCooldown = 0;
  drone.thrust = 0;
}

export function steerDrone(drone, keys, dt) {
  // `keys` is the input state object (left/right/up/down booleans plus the
  // pointer position); the world hands it over already unwrapped.
  let ax = 0;
  let ay = 0;
  if (keys.left) ax -= DRONE.accel;
  if (keys.right) ax += DRONE.accel;
  if (keys.up) ay -= DRONE.accel;
  if (keys.down) ay += DRONE.accel;

  if (ax === 0 && ay === 0 && keys.pointerActive) {
    const dx = keys.pointerX - drone.x;
    const dy = keys.pointerY - drone.y;
    const distance = Math.hypot(dx, dy);
    if (distance > 4) {
      const pull = Math.min(distance * DRONE.mouseFollow, DRONE.maxSpeed);
      drone.vx += (dx / distance) * pull * DRONE.mouseFollow * dt * 0.55;
      drone.vy += (dy / distance) * pull * DRONE.mouseFollow * dt * 0.55;
    }
  }

  drone.vx += ax * dt;
  drone.vy += ay * dt;

  const damp = Math.exp(-DRONE.drag * dt);
  drone.vx *= damp;
  drone.vy *= damp;

  const speed = Math.hypot(drone.vx, drone.vy);
  if (speed > DRONE.maxSpeed) {
    drone.vx = (drone.vx / speed) * DRONE.maxSpeed;
    drone.vy = (drone.vy / speed) * DRONE.maxSpeed;
  }

  drone.x += drone.vx * dt;
  drone.y += drone.vy * dt;
  drone.x = Math.max(DRONE.radius, Math.min(FIELD_WIDTH - DRONE.radius, drone.x));
  drone.y = Math.max(DRONE.radius + 46, Math.min(FIELD_HEIGHT - DRONE.radius - 8, drone.y));

  if (speed > 40) drone.angle = Math.atan2(drone.vy, drone.vx);
  drone.thrust = Math.min(1, speed / DRONE.maxSpeed);

  drone.trail.unshift({ x: drone.x, y: drone.y });
  if (drone.trail.length > 14) drone.trail.pop();

  if (drone.invulnerableSeconds > 0) drone.invulnerableSeconds -= dt;
  if (drone.magnetSeconds > 0) drone.magnetSeconds -= dt;
  if (drone.pulseCooldown > 0) drone.pulseCooldown -= dt;
}

export function droneCanPulse(drone) {
  return drone.pulseCooldown <= 0;
}

export function droneFirePulse(drone) {
  drone.pulseCooldown = 0.45;
  const doubled = drone.doublePulses > 0;
  if (doubled) drone.doublePulses -= 1;
  return doubled;
}
