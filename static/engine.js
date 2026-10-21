/* Shared deterministic simulation: browser rendering stays in game.js. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.CrocGame = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const HEIGHT = 540;
  const LEVELS = {
    casual: { speed: 0.7, interval: 1.8 },
    normal: { speed: 1, interval: 1.45 },
    hard: { speed: 1.3, interval: 1.1 },
  };
  class Game {
    constructor(random = Math.random) {
      this.random = random;
      this.width = 960;
      this.mode = "ready";
      this.difficulty = "normal";
      this.events = [];
      this.resetState();
    }
    resetState() {
      this.score = 0;
      this.hits = 0;
      this.shots = 0;
      this.streak = 0;
      this.bestStreak = 0;
      this.lives = 4;
      this.wave = 1;
      this.elapsed = 0;
      this.spawnTimer = 0.5;
      this.player = { x: this.width / 2, y: 110, cooldown: 0 };
      this.crocs = [];
      this.harpoons = [];
      this.events = [];
    }
    start(difficulty = this.difficulty) {
      this.difficulty = Object.hasOwn(LEVELS, difficulty)
        ? difficulty
        : "normal";
      this.resetState();
      this.mode = "playing";
    }
    pause() {
      if (this.mode === "playing") this.mode = "paused";
    }
    resume() {
      if (this.mode === "paused") this.mode = "playing";
    }
    resize(width) {
      if (!Number.isFinite(width) || width <= 0) return;
      const ratio = width / this.width;
      this.player.x *= ratio;
      this.crocs.forEach((c) => {
        c.x *= ratio;
      });
      this.harpoons.forEach((h) => {
        h.x *= ratio;
      });
      this.width = width;
    }
    spawn() {
      const direction = this.random() > 0.5 ? 1 : -1;
      const swift = this.wave >= 3 && this.random() < 0.3;
      this.crocs.push({
        x: direction === 1 ? -65 : this.width + 65,
        y: 245 + this.random() * 210,
        direction,
        swift,
        active: true,
        speed:
          (65 + this.random() * 45 + Math.min(this.wave - 1, 15) * 7) *
          LEVELS[this.difficulty].speed *
          (swift ? 1.45 : 1) *
          Math.min(1, this.width / 960),
        phase: this.random() * Math.PI * 2,
      });
    }
    step(dt, input = {}) {
      if (this.mode !== "playing" || !Number.isFinite(dt) || dt <= 0) return;
      dt = Math.min(dt, 1 / 30);
      this.elapsed += dt;
      this.player.x = Math.max(
        38,
        Math.min(
          this.width - 38,
          this.player.x +
            ((input.right ? 1 : 0) - (input.left ? 1 : 0)) * 340 * dt,
        ),
      );
      this.player.cooldown = Math.max(0, this.player.cooldown - dt);
      if (input.fire && this.player.cooldown <= 0) {
        this.harpoons.push({
          x: this.player.x,
          y: this.player.y + 30,
          previousY: this.player.y + 30,
          active: true,
        });
        this.player.cooldown = 0.23;
        this.shots++;
        this.events.push({ type: "fire" });
      }
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawn();
        this.spawnTimer += Math.max(
          0.45,
          LEVELS[this.difficulty].interval - (this.wave - 1) * 0.09,
        );
      }
      for (const h of this.harpoons) {
        h.previousY = h.y;
        h.y += 620 * dt;
      }
      for (const c of this.crocs) c.x += c.direction * c.speed * dt;
      // Sweep each harpoon segment so fast shots cannot skip a croc between frames.
      for (const h of this.harpoons) {
        for (const c of this.crocs) {
          if (!h.active || !c.active) continue;
          if (
            Math.abs(h.x - c.x) < 44 &&
            h.previousY <= c.y + 17 &&
            h.y >= c.y - 17
          ) {
            h.active = false;
            c.active = false;
            this.hits++;
            this.streak++;
            this.bestStreak = Math.max(this.bestStreak, this.streak);
            const points =
              (c.swift ? 150 : 100) *
              Math.min(4, 1 + Math.floor(this.streak / 5));
            this.score += points;
            this.events.push({ type: "catch", x: c.x, y: c.y, points });
            const nextWave = 1 + Math.floor(this.hits / 8);
            if (nextWave !== this.wave) {
              this.wave = nextWave;
              this.events.push({ type: "wave", wave: this.wave });
            }
          }
        }
      }
      for (const c of this.crocs) {
        if (c.active && (c.x < -90 || c.x > this.width + 90)) {
          c.active = false;
          this.lives = Math.max(0, this.lives - 1);
          this.streak = 0;
          this.events.push({ type: "escape" });
          if (this.lives === 0) {
            this.mode = "over";
            this.events.push({ type: "over" });
            break;
          }
        }
      }
      this.crocs = this.crocs.filter((c) => c.active);
      this.harpoons = this.harpoons.filter(
        (h) => h.active && h.y < HEIGHT + 20,
      );
    }
    drainEvents() {
      return this.events.splice(0);
    }
  }
  return { Game, HEIGHT, LEVELS };
});
