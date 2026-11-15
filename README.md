# Starfall Salvage

A 2D canvas arcade game for the make.fun best-game-01 competition. Pilot a
small salvage drone through a night sky full of falling star shards: catch
the shards, dodge the asteroids, and clear all ten waves to win.

## How to play

- **Steer** — mouse, arrow keys, or WASD.
- **Salvage pulse** — click or Space. A short-range pulse that collects
  nearby shards and blasts small asteroids. A comet crossed by a pulse is
  worth 250 points.
- **Combo** — catching shards without missing one builds a combo that
  multiplies the score, up to x5. A missed shard or an asteroid hit resets
  it.
- **Hull** — the drone has 3 hull points, shown as hearts. An asteroid hit
  costs one; at zero hull the run ends.
- **Pickups** — a shield absorbs one hit, a magnet pulls nearby shards to
  the drone for 8 seconds, and a double pulse makes the next three pulses
  wide.
- **Waves** — every third wave a large comet crosses the sky. Difficulty
  rises wave by wave: more shards, faster asteroids, tighter timing.
- **Restart** — R, Enter, or click on the end screen. M toggles sound.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. No build step, no
network requests, no external assets: all art is drawn in code on the
canvas and all sounds are synthesized with the Web Audio API.

## Deterministic screenshots

The page takes a `?shot=` query parameter that stages a fixed scene from
a seed, so screenshots are reproducible:

- `?shot=title&seed=7` — title screen
- `?shot=play&seed=7` — mid-play, HUD visible
- `?shot=victory&seed=7` — victory screen after clearing wave 10
- `?shot=gameover&seed=7` — game-over screen

See `shots.json` for the exact queries used for the screenshots in
`screenshots/`.

## Layout

- `game/index.html` — the page; `game/src/main.js` boots the game.
- `game/src/config.js` — palette and tuning numbers.
- `game/src/random.js` — seeded random generator.
- `game/src/sound.js` — synthesized sound effects (Web Audio API).
- `game/src/input.js` — keyboard and pointer input.
- `game/src/drone.js` — the player drone: steering and pulse firing.
- `game/src/objects.js` — shards, asteroids, the comet, and pickups.
- `game/src/world.js` — game state, waves, scoring, collisions.
- `game/src/render.js` — all canvas drawing.
- `game/src/shots.js` — deterministic screenshot states and autopilot.
- `main.ts` — the entry program: copies `game/` and `screenshots/` to
  the output directory and writes `dossier.json`.
- `serve.ts` — a tiny static server for local play.
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged.

## License

MIT — see `LICENSE`.
