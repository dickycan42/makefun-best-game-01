// Starfall Salvage — entry point. Wires the canvas, the input, the sound
// bank and the world together, runs the frame loop at the display's pace,
// and switches between the title, play, victory and game-over phases.
// A ?shot= name in the address stages a deterministic screenshot state
// instead of starting live play.

import { FIELD_WIDTH, FIELD_HEIGHT } from './config.js';
import { makeInput } from './input.js';
import { drawWorld } from './render.js';
import { makeSoundBank } from './sound.js';
import { randomSeed } from './random.js';
import { stageShot, shotNameFromUrl } from './shots.js';
import {
  PHASE_GAMEOVER,
  PHASE_PLAYING,
  PHASE_TITLE,
  PHASE_VICTORY,
  makeWorld,
  startGame,
  stepWorld,
} from './world.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusLine = document.getElementById('status');
const sound = makeSoundBank();
const input = makeInput(canvas);

let scale = 1;
let offsetX = 0;
let offsetY = 0;

function fitCanvas() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  // Uniform scale, centred: the field never stretches, whatever the
  // window's shape; the leftover edges stay the night-sky colour.
  scale = Math.min(width / FIELD_WIDTH, height / FIELD_HEIGHT);
  offsetX = (width - FIELD_WIDTH * scale) / 2;
  offsetY = (height - FIELD_HEIGHT * scale) / 2;
  ctx.setTransform(ratio * scale, 0, 0, ratio * scale, ratio * offsetX, ratio * offsetY);
}

window.addEventListener('resize', fitCanvas);
fitCanvas();

const params = new URLSearchParams(window.location.search);
const hasShot = params.has('shot');
const { shot, seed } = shotNameFromUrl(window.location.href);
const world = makeWorld(hasShot ? seed : randomSeed());

// A read-only handle for automated play-testing (screenshots, input
// drills); it changes nothing about how the game plays.
window.__starfall = { world, phase: () => phase };

let phase = PHASE_TITLE;
if (hasShot) {
  // A staged screenshot state: render exactly one frame and stop. The
  // live loop would keep the world moving and the shot would depend on
  // when the browser happened to capture it.
  phase = stageShot(shot, world);
  world.phase = phase;
  drawWorld(ctx, world);
  statusLine.textContent = describePhaseText(phase);
} else {
  world.phase = PHASE_TITLE;
  requestAnimationFrame(frame);
}

function describePhaseText(currentPhase) {
  if (currentPhase === PHASE_TITLE) return 'Starfall Salvage. Title screen. Press Enter or click to launch.';
  if (currentPhase === PHASE_PLAYING) return `Playing. Score ${world.score}, wave ${world.wave} of 10, hull ${world.hull}.`;
  if (currentPhase === PHASE_VICTORY) return `Victory. Final score ${world.score}. Press R to fly again.`;
  return `Game over. Final score ${world.score}. Press R to fly again.`;
}

let lastTime = performance.now();
let announced = '';

function frame(now) {
  const dt = Math.min((now - lastTime) / 1000, 1 / 20);
  lastTime = now;

  if (input.consumeMute()) {
    const muted = sound.toggleMuted();
    world.message = muted ? 'SOUND OFF' : 'SOUND ON';
    world.messageSeconds = 1.2;
  }

  if (phase === PHASE_TITLE) {
    stepWorld(world, dt, null, null);
    if (input.consumeAction() || input.consumeClick()) {
      sound.unlock();
      sound.click();
      startGame(world);
      phase = PHASE_PLAYING;
    }
  } else if (phase === PHASE_PLAYING) {
    stepWorld(world, dt, input, sound);
    if (world.phase === PHASE_VICTORY) phase = PHASE_VICTORY;
    else if (world.phase === PHASE_GAMEOVER) phase = PHASE_GAMEOVER;
  } else if (phase === PHASE_VICTORY || phase === PHASE_GAMEOVER) {
    stepWorld(world, dt, null, null);
    if (input.consumeRestart() || input.consumeClick()) {
      sound.unlock();
      sound.click();
      world.seed = randomSeed();
      startGame(world);
      phase = PHASE_PLAYING;
    }
  }

  input.consumeAction();
  input.consumeRestart();
  input.consumeClick();

  ctx.clearRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);
  drawWorld(ctx, world);

  const text = describePhaseText(phase);
  if (text !== announced) {
    announced = text;
    statusLine.textContent = text;
  }
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
