// Keyboard and pointer input, kept apart from the game rules so the world
// never reads the DOM directly. The game polls this each frame; the canvas
// reports pointer positions in logical field coordinates.

import { FIELD_WIDTH, FIELD_HEIGHT } from './config.js';

export function makeInput(canvas) {
  const keys = new Set();
  const state = {
    left: false,
    right: false,
    up: false,
    down: false,
    pointerX: FIELD_WIDTH / 2,
    pointerY: FIELD_HEIGHT / 2,
    pointerActive: false,
    pointerDown: false,
    clicked: false,
    actionPressed: false,
    restartPressed: false,
    mutePressed: false,
  };

  function toField(clientX, clientY) {
    // Mirror the canvas letterbox in main.js: uniform scale, centred, so a
    // click lands on the same field point it appears over.
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / FIELD_WIDTH, rect.height / FIELD_HEIGHT);
    const offsetX = (rect.width - FIELD_WIDTH * scale) / 2;
    const offsetY = (rect.height - FIELD_HEIGHT * scale) / 2;
    return { x: (clientX - rect.left - offsetX) / scale, y: (clientY - rect.top - offsetY) / scale };
  }

  function refreshDirections() {
    state.left = keys.has('ArrowLeft') || keys.has('KeyA');
    state.right = keys.has('ArrowRight') || keys.has('KeyD');
    state.up = keys.has('ArrowUp') || keys.has('KeyW');
    state.down = keys.has('ArrowDown') || keys.has('KeyS');
  }

  window.addEventListener('keydown', (event) => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    if (event.repeat) return;
    keys.add(event.code);
    refreshDirections();
    if (event.code === 'Space' || event.code === 'Enter') state.actionPressed = true;
    if (event.code === 'KeyR' || event.code === 'Enter') state.restartPressed = true;
    if (event.code === 'KeyM') state.mutePressed = true;
  });

  window.addEventListener('keyup', (event) => {
    keys.delete(event.code);
    refreshDirections();
  });

  window.addEventListener('blur', () => {
    keys.clear();
    refreshDirections();
    state.pointerActive = false;
  });

  canvas.addEventListener('pointermove', (event) => {
    const pos = toField(event.clientX, event.clientY);
    state.pointerX = pos.x;
    state.pointerY = pos.y;
    state.pointerActive = true;
  });

  canvas.addEventListener('pointerdown', (event) => {
    const pos = toField(event.clientX, event.clientY);
    state.pointerX = pos.x;
    state.pointerY = pos.y;
    state.pointerActive = true;
    state.pointerDown = true;
    state.clicked = true;
    state.actionPressed = true;
    event.preventDefault();
  });

  canvas.addEventListener('pointerup', () => {
    state.pointerDown = false;
  });

  canvas.addEventListener('pointerleave', () => {
    state.pointerDown = false;
  });

  return {
    state,
    consumeAction() {
      const value = state.actionPressed;
      state.actionPressed = false;
      return value;
    },
    consumeClick() {
      const value = state.clicked;
      state.clicked = false;
      return value;
    },
    consumeRestart() {
      const value = state.restartPressed;
      state.restartPressed = false;
      return value;
    },
    consumeMute() {
      const value = state.mutePressed;
      state.mutePressed = false;
      return value;
    },
  };
}
