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
  assert.deepEqual(game.player, {
    x: 480,
    y: 110,
    cooldown: 0,
    aim: Math.PI / 2,
  });
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
    game.crocs.push({
      x: 480,
      y: 250,
      active: true,
      vx: 0,
      vy: 0,
      angle: 0,
      speed: 0,
    });
    game.harpoons.push({ x: 480, y: 230, vx: 0, vy: 620, active: true });
    game.step(1 / 30);
  }
  assert.equal(game.hits, 8);
  assert.equal(game.score, 1200);
  assert.equal(game.wave, 2);
  assert.equal(game.harpoons.length, 0);
  assert.equal(game.crocs.length, 0);
  assert.equal(game.drainEvents().filter((e) => e.type === "wave").length, 1);
});

test("four collisions end play with nonnegative lives and cannot award later points", () => {
  const game = new Game();
  game.start();
  game.spawnTimer = 100;
  game.streak = 5;
  game.crocs = Array.from({ length: 7 }, () => ({
    x: 480,
    y: 110,
    active: true,
    vx: 0,
    vy: -1,
    angle: -Math.PI / 2,
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

test("river travel advances only during play and resets for a new patrol", () => {
  const game = new Game();
  game.start();
  game.spawnTimer = 100;
  for (let i = 0; i < 60; i++) game.step(1 / 60);
  assert.ok(Math.abs(game.distance - 72) < 0.001);
  game.pause();
  game.step(1 / 30);
  assert.ok(Math.abs(game.distance - 72) < 0.001);
  game.start();
  assert.equal(game.distance, 0);
});

test("crocs enter from both banks and downstream, facing their committed approach", () => {
  for (const [random, entry] of [
    [0.1, "left"],
    [0.5, "right"],
    [0.9, "downstream"],
  ]) {
    const game = new Game(() => random);
    game.start();
    game.spawnTimer = 100;
    game.spawn();
    const c = game.crocs[0];
    assert.equal(c.entry, entry);
    assert.ok(c.vy < 0);
    assert.equal(Math.sign(c.vx), Math.sign(game.player.x - c.x));
    assert.equal(c.angle, Math.atan2(c.vy, c.vx));
    const startDistance = Math.hypot(c.x - game.player.x, c.y - game.player.y);
    const vx = c.vx,
      vy = c.vy;
    game.step(1 / 30);
    assert.ok(
      Math.hypot(c.x - game.player.x, c.y - game.player.y) < startDistance,
    );
    game.step(1 / 30, { right: true });
    assert.equal(c.vx, vx);
    assert.equal(c.vy, vy);
  }
});

test("dodged crocs leave the patrol without hull damage or breaking a streak", () => {
  const game = new Game();
  game.start();
  game.spawnTimer = 100;
  game.streak = 3;
  game.crocs.push({
    x: 100,
    y: -99,
    vx: 0,
    vy: -120,
    angle: -Math.PI / 2,
    active: true,
  });
  game.step(1 / 30);
  assert.equal(game.crocs.length, 0);
  assert.equal(game.lives, 4);
  assert.equal(game.streak, 3);
  assert.equal(game.drainEvents().length, 0);
});

test("swept harpoons hit rotated and moving crocs", () => {
  for (const angle of [-Math.PI / 2, -Math.PI / 4, -Math.PI * 0.8]) {
    const game = new Game();
    game.start();
    game.spawnTimer = 100;
    game.crocs.push({
      x: 480,
      y: 250,
      vx: Math.cos(angle) * 100,
      vy: Math.sin(angle) * 100,
      angle,
      active: true,
    });
    game.harpoons.push({ x: 480, y: 220, vx: 0, vy: 620, active: true });
    game.step(1 / 30);
    assert.equal(game.hits, 1);
    assert.equal(game.lives, 4);
  }
});

test("the turret can intercept approaches from every entry direction", () => {
  for (const random of [0.1, 0.5, 0.9]) {
    const game = new Game(() => random);
    game.start();
    game.spawnTimer = 100;
    game.spawn();
    for (let i = 0; i < 600 && game.hits === 0; i++)
      game.step(1 / 60, { fire: true });
    assert.equal(game.hits, 1);
    assert.equal(game.lives, 4);
  }
});
