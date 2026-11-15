// Every pixel of Starfall Salvage is drawn here, in code, on one canvas:
// the night sky, the gold shards, the asteroids, the comet, the drone,
// the HUD and the three menu screens. One deep-blue and gold palette
// throughout, so the game reads at a glance even shrunk to a thumbnail.

import { FIELD_WIDTH, FIELD_HEIGHT, PALETTE, PULSE } from './config.js';
import { PHASE_GAMEOVER, PHASE_PLAYING, PHASE_TITLE, PHASE_VICTORY, comboMultiplier } from './world.js';
import { KIND_ASTEROID, KIND_COMET, KIND_PICKUP, KIND_SHARD } from './objects.js';

function drawStarfield(ctx, world) {
  const sky = ctx.createLinearGradient(0, 0, 0, FIELD_HEIGHT);
  sky.addColorStop(0, PALETTE.skyTop);
  sky.addColorStop(0.55, PALETTE.skyMid);
  sky.addColorStop(1, PALETTE.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);

  for (const star of world.stars) {
    const alpha = 0.35 + 0.65 * Math.abs(Math.sin(star.twinkle));
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#dfe8ff';
    ctx.fillRect(star.x, star.y, star.size, star.size);
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = PALETTE.ground;
  ctx.fillRect(0, FIELD_HEIGHT - 14, FIELD_WIDTH, 14);
  ctx.fillStyle = 'rgba(245, 197, 66, 0.35)';
  ctx.fillRect(0, FIELD_HEIGHT - 14, FIELD_WIDTH, 1);
}

function drawShard(ctx, shard) {
  const glow = ctx.createRadialGradient(shard.x, shard.y, 1, shard.x, shard.y, shard.radius * 2.2);
  const core = shard.hue === 'gold' ? '255, 215, 106' : '127, 227, 255';
  glow.addColorStop(0, `rgba(${core}, 0.85)`);
  glow.addColorStop(1, `rgba(${core}, 0)`);
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(shard.x, shard.y, shard.radius * 2.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(shard.x, shard.y);
  ctx.rotate(shard.phase);
  ctx.fillStyle = shard.hue === 'gold' ? PALETTE.goldBright : PALETTE.cyan;
  ctx.beginPath();
  ctx.moveTo(0, -shard.radius);
  ctx.lineTo(shard.radius * 0.45, -shard.radius * 0.45);
  ctx.lineTo(shard.radius, 0);
  ctx.lineTo(shard.radius * 0.45, shard.radius * 0.45);
  ctx.lineTo(0, shard.radius);
  ctx.lineTo(-shard.radius * 0.45, shard.radius * 0.45);
  ctx.lineTo(-shard.radius, 0);
  ctx.lineTo(-shard.radius * 0.45, -shard.radius * 0.45);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.beginPath();
  ctx.arc(-shard.radius * 0.25, -shard.radius * 0.3, shard.radius * 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawAsteroid(ctx, rock) {
  ctx.save();
  ctx.translate(rock.x, rock.y);
  ctx.rotate(rock.rotation);
  ctx.beginPath();
  rock.points.forEach((p, i) => {
    const x = Math.cos(p.angle) * p.dist;
    const y = Math.sin(p.angle) * p.dist;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = '#6d5b4a';
  ctx.fill();
  ctx.strokeStyle = '#3f342a';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
  ctx.beginPath();
  ctx.arc(-rock.radius * 0.3, -rock.radius * 0.35, rock.radius * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff8a5c';
  ctx.beginPath();
  ctx.arc(rock.radius * 0.25, rock.radius * 0.2, rock.radius * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawComet(ctx, comet) {
  for (let i = comet.trail.length - 1; i >= 0; i -= 1) {
    const p = comet.trail[i];
    const fade = 1 - i / comet.trail.length;
    ctx.globalAlpha = fade * 0.5;
    ctx.fillStyle = PALETTE.goldBright;
    ctx.beginPath();
    ctx.arc(p.x, p.y, comet.radius * 0.7 * fade + 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  const glow = ctx.createRadialGradient(comet.x, comet.y, 1, comet.x, comet.y, comet.radius * 2.4);
  glow.addColorStop(0, 'rgba(255, 215, 106, 0.9)');
  glow.addColorStop(1, 'rgba(255, 215, 106, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(comet.x, comet.y, comet.radius * 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  ctx.arc(comet.x, comet.y, comet.radius * 0.62, 0, Math.PI * 2);
  ctx.fill();
}

function drawPickup(ctx, pickup) {
  const bob = Math.sin(pickup.phase) * 2;
  const colors = { shield: '#8ef7ff', magnet: '#c78bff', double: '#ffd76a' };
  const labels = { shield: 'S', magnet: 'M', double: '2x' };
  ctx.save();
  ctx.translate(pickup.x, pickup.y + bob);
  ctx.fillStyle = 'rgba(8, 14, 38, 0.85)';
  ctx.strokeStyle = colors[pickup.pickupKind];
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, pickup.radius + 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = colors[pickup.pickupKind];
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(labels[pickup.pickupKind], 0, 1);
  ctx.restore();
}

function drawDrone(ctx, drone, time) {
  for (let i = drone.trail.length - 1; i >= 0; i -= 1) {
    const p = drone.trail[i];
    ctx.globalAlpha = (1 - i / drone.trail.length) * 0.35;
    ctx.fillStyle = PALETTE.cyan;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 7 * (1 - i / drone.trail.length) + 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  const blink = drone.invulnerableSeconds > 0 && Math.floor(time * 12) % 2 === 0;
  if (blink) ctx.globalAlpha = 0.35;

  ctx.save();
  ctx.translate(drone.x, drone.y);
  ctx.rotate(drone.angle + Math.PI / 2);

  const flame = 8 + drone.thrust * 10 + Math.sin(time * 30) * 2;
  ctx.fillStyle = 'rgba(255, 170, 60, 0.9)';
  ctx.beginPath();
  ctx.moveTo(-5, 12);
  ctx.lineTo(0, 12 + flame);
  ctx.lineTo(5, 12);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#2c3f6e';
  ctx.strokeStyle = PALETTE.gold;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.lineTo(12, 10);
  ctx.lineTo(5, 6);
  ctx.lineTo(-5, 6);
  ctx.lineTo(-12, 10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = PALETTE.cyan;
  ctx.beginPath();
  ctx.arc(0, -4, 4.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = PALETTE.goldBright;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 17, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  if (drone.shield) {
    ctx.strokeStyle = 'rgba(142, 247, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(drone.x, drone.y, 26 + Math.sin(time * 4) * 2, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawPulses(ctx, pulses) {
  for (const pulse of pulses) {
    const fade = 1 - pulse.age / (PULSE.expandSeconds + 0.12);
    ctx.globalAlpha = Math.max(fade, 0);
    ctx.strokeStyle = pulse.doubled ? PALETTE.goldBright : PALETTE.cyan;
    ctx.lineWidth = PULSE.ringWidth;
    ctx.beginPath();
    ctx.arc(pulse.x, pulse.y, pulse.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = Math.max(fade * 0.25, 0);
    ctx.fillStyle = pulse.doubled ? PALETTE.gold : PALETTE.cyan;
    ctx.beginPath();
    ctx.arc(pulse.x, pulse.y, pulse.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawParticles(ctx, particles) {
  for (const p of particles) {
    ctx.globalAlpha = Math.max(p.life / p.maxLife, 0);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawHull(ctx, hull, maxHull) {
  // Hearts sit between the shard count and the power-up readout, clear of
  // the score text on the left.
  for (let i = 0; i < maxHull; i += 1) {
    const x = 668 + i * 26;
    const y = 30;
    ctx.fillStyle = i < hull ? PALETTE.hull : 'rgba(255, 93, 108, 0.25)';
    ctx.beginPath();
    ctx.moveTo(x, y + 6);
    ctx.bezierCurveTo(x - 9, y - 3, x - 5, y - 10, x, y - 4);
    ctx.bezierCurveTo(x + 5, y - 10, x + 9, y - 3, x, y + 6);
    ctx.fill();
  }
}

export function drawHud(ctx, world) {
  ctx.fillStyle = 'rgba(7, 13, 36, 0.66)';
  ctx.fillRect(0, 0, FIELD_WIDTH, 48);

  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.goldBright;
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText(`SCORE ${world.score}`, 16, 24);

  ctx.fillStyle = world.combo >= 8 ? PALETTE.goldBright : PALETTE.textDim;
  ctx.font = 'bold 16px system-ui, sans-serif';
  const mult = comboMultiplier(world.combo);
  ctx.fillText(`COMBO x${mult}  (${world.combo})`, 210, 24);

  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillText(`WAVE ${world.wave}/10`, 400, 24);
  ctx.fillText(`SHARDS ${world.shardsCaught}`, 520, 24);

  drawHull(ctx, world.hull, 3);

  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = '13px system-ui, sans-serif';
  const powers = [];
  if (world.drone.shield) powers.push('SHIELD');
  if (world.drone.magnetSeconds > 0) powers.push(`MAGNET ${Math.ceil(world.drone.magnetSeconds)}s`);
  if (world.drone.doublePulses > 0) powers.push(`2x PULSE x${world.drone.doublePulses}`);
  ctx.fillText(powers.join('   ') || 'M — sound on/off', FIELD_WIDTH - 16, 24);
  ctx.textAlign = 'left';
}

function drawBanner(ctx, text, seconds, y) {
  if (seconds <= 0 || !text) return;
  ctx.globalAlpha = Math.min(1, seconds);
  ctx.fillStyle = PALETTE.panel;
  const width = ctx.measureText(text).width + 48;
  ctx.fillRect((FIELD_WIDTH - width) / 2, y - 22, width, 44);
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.lineWidth = 1.5;
  ctx.strokeRect((FIELD_WIDTH - width) / 2, y - 22, width, 44);
  ctx.fillStyle = PALETTE.goldBright;
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, FIELD_WIDTH / 2, y + 1);
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}

function drawPanel(ctx, x, y, w, h) {
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
}

function drawCenteredLines(ctx, lines, startY, gap) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  lines.forEach((line, i) => {
    ctx.fillStyle = line.color || PALETTE.text;
    ctx.font = line.font;
    ctx.fillText(line.text, FIELD_WIDTH / 2, startY + i * gap);
  });
  ctx.textAlign = 'left';
}

function drawTitle(ctx, world) {
  drawPanel(ctx, 180, 78, 600, 384);
  // The two 58px title lines get their own wide gap: at the old shared
  // 40px gap their glyphs touched. 78px leaves clear daylight between
  // them, and the body lines below re-space to stay inside the panel.
  drawCenteredLines(ctx, [
    { text: 'STARFALL', font: 'bold 58px system-ui, sans-serif', color: PALETTE.goldBright },
    { text: 'SALVAGE', font: 'bold 58px system-ui, sans-serif', color: PALETTE.goldBright },
  ], 116, 78);
  drawCenteredLines(ctx, [
    { text: 'Catch the falling star shards. Dodge the asteroids.', font: '17px system-ui, sans-serif' },
    { text: 'Clear all 10 waves to win. A comet every 3rd wave is worth 250.', font: '17px system-ui, sans-serif' },
    { text: 'MOUSE or ARROWS / WASD — steer the drone', font: 'bold 16px system-ui, sans-serif', color: PALETTE.cyan },
    { text: 'CLICK or SPACE — fire a salvage pulse', font: 'bold 16px system-ui, sans-serif', color: PALETTE.cyan },
    { text: 'R — restart    M — sound on / off', font: '15px system-ui, sans-serif', color: PALETTE.textDim },
    { text: '★  BEST COMBO EARNS UP TO x5  ★', font: 'bold 15px system-ui, sans-serif', color: PALETTE.gold },
    { text: '— PRESS ENTER OR CLICK TO LAUNCH —', font: 'bold 18px system-ui, sans-serif', color: PALETTE.gold },
  ], 244, 33);
}

function drawEndScreen(ctx, world, victory) {
  drawPanel(ctx, 230, 110, 500, 320);
  const title = victory ? 'ALL WAVES CLEARED!' : 'DRONE DESTROYED';
  const color = victory ? PALETTE.goldBright : PALETTE.hull;
  drawCenteredLines(ctx, [
    { text: title, font: 'bold 40px system-ui, sans-serif', color },
    { text: victory ? 'The night sky is yours, salvager.' : 'The salvage run ends here.', font: '17px system-ui, sans-serif' },
    { text: `FINAL SCORE  ${world.score}`, font: 'bold 26px system-ui, sans-serif', color: PALETTE.goldBright },
    { text: `Waves cleared: ${victory ? 10 : world.wave - 1}    Shards caught: ${world.shardsCaught}`, font: '16px system-ui, sans-serif' },
    { text: `Best combo: ${world.bestCombo}    Shards missed: ${world.shardsMissed}`, font: '16px system-ui, sans-serif' },
    { text: 'PRESS R OR ENTER — OR CLICK — TO FLY AGAIN', font: 'bold 17px system-ui, sans-serif', color: PALETTE.cyan },
  ], 168, 46);
}

export function drawWorld(ctx, world) {
  ctx.save();
  if (world.shakeSeconds > 0) {
    const power = world.shakeSeconds * 14;
    ctx.translate((Math.random() - 0.5) * power, (Math.random() - 0.5) * power);
  }
  drawStarfield(ctx, world);

  for (const entity of world.entities) {
    if (!entity.alive) continue;
    if (entity.kind === KIND_SHARD) drawShard(ctx, entity);
    else if (entity.kind === KIND_ASTEROID) drawAsteroid(ctx, entity);
  }
  if (world.comet && world.comet.alive) drawComet(ctx, world.comet);
  for (const pickup of world.pickups) drawPickup(ctx, pickup);
  drawPulses(ctx, world.pulses);
  drawParticles(ctx, world.particles);

  if (world.phase !== PHASE_TITLE) drawDrone(ctx, world.drone, world.time);

  if (world.flashSeconds > 0) {
    ctx.fillStyle = `rgba(255, 215, 106, ${world.flashSeconds * 0.5})`;
    ctx.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);
  }

  if (world.phase === PHASE_PLAYING) {
    drawHud(ctx, world);
    ctx.font = 'bold 20px system-ui, sans-serif';
    drawBanner(ctx, world.waveBannerText, world.waveBannerSeconds, 92);
    ctx.font = 'bold 17px system-ui, sans-serif';
    drawBanner(ctx, world.message, world.messageSeconds, 132);
  } else if (world.phase === PHASE_TITLE) {
    drawTitle(ctx, world);
  } else if (world.phase === PHASE_VICTORY) {
    drawHud(ctx, world);
    drawEndScreen(ctx, world, true);
  } else if (world.phase === PHASE_GAMEOVER) {
    drawHud(ctx, world);
    drawEndScreen(ctx, world, false);
  }
  ctx.restore();
}
