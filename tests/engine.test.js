const { test } = require("node:test");
const assert = require("node:assert/strict");
const { Game } = require("../static/engine");

test("start and retry reset the entire patrol, including player and cooldown", () => {
  const game = new Game(() => 0.5);
  game.start("hard");
  for (let i = 0; i < 100; i++) game.step(1 / 60, { right: true, fire: true });
  assert.ok(game.shots > 0);
  assert.notEqual(game.player.x, 480);
  game.start();
  assert.equal(game.difficulty, "hard");
  assert.deepEqual(game.player, { x: 480, y: 110, cooldown: 0 });
  assert.equal(game.shots, 0);
  assert.equal(game.lives, 4);
  assert.equal(game.crocs.length, 0);
  assert.equal(game.harpoons.length, 0);
});

test("pausing freezes simulation and resume restores it", () => {
  const game = new Game();
  game.start();
  game.pause();
  const before = JSON.stringify(game);
  game.step(1 / 60, { fire: true, left: true });
  assert.equal(JSON.stringify(game), before);
  game.resume();
  game.step(1 / 60, { fire: true });
  assert.equal(game.shots, 1);
});

test("harpoons score one catch each, advance waves and apply streak multipliers", () => {
  const game = new Game();
  game.start();
  game.spawnTimer = 100;
  for (let i = 0; i < 8; i++) {
    game.crocs.push({ x: 480, y: 250, active: true, direction: 1, speed: 0 });
    game.harpoons.push({ x: 480, y: 230, active: true });
    game.step(1 / 30);
  }
  assert.equal(game.hits, 8);
  assert.equal(game.score, 1200);
  assert.equal(game.wave, 2);
  assert.equal(game.harpoons.length, 0);
  assert.equal(game.crocs.length, 0);
  assert.equal(game.drainEvents().filter((e) => e.type === "wave").length, 1);
});

test("four escapes end play with nonnegative lives and cannot award later points", () => {
  const game = new Game();
  game.start();
  game.spawnTimer = 100;
  game.streak = 5;
  game.crocs = Array.from({ length: 7 }, () => ({
    x: 1060,
    y: 300,
    active: true,
    direction: 1,
    speed: 1,
  }));
  game.step(1 / 60);
  assert.equal(game.mode, "over");
  assert.equal(game.lives, 0);
  assert.equal(game.streak, 0);
  const before = JSON.stringify(game);
  game.step(1 / 60, { fire: true });
  assert.equal(JSON.stringify(game), before);
  assert.equal(game.drainEvents().filter((e) => e.type === "over").length, 1);
});

test("movement remains inside resized boards and difficulty changes travel speed", () => {
  const easy = new Game(() => 0.6);
  easy.start("casual");
  easy.spawn();
  const hard = new Game(() => 0.6);
  hard.start("hard");
  hard.spawn();
  assert.ok(hard.crocs[0].speed > easy.crocs[0].speed);
  easy.resize(540);
  assert.equal(easy.player.x, 270);
  for (let i = 0; i < 100; i++) easy.step(1 / 60, { left: true });
  assert.equal(easy.player.x, 38);
});

test("a long patrol stays bounded and reaches game over without player input", () => {
  const game = new Game(() => 0.6);
  game.start();
  for (let i = 0; i < 60 * 90; i++) game.step(1 / 60);
  assert.equal(game.mode, "over");
  assert.ok(game.crocs.length < 20);
  assert.equal(game.lives, 0);
});

test("transient zero or invalid layout dimensions cannot corrupt positions", () => {
  const game = new Game(() => 0.6);
  game.start();
  game.spawn();
  const before = JSON.stringify(game);
  for (const width of [0, -1, Infinity, NaN]) game.resize(width);
  assert.equal(JSON.stringify(game), before);
  game.resize(540);
  assert.equal(game.player.x, 270);
  assert.ok(Number.isFinite(game.crocs[0].x));
});
