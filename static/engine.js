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
      this.distance = 0;
      this.spawnTimer = 0.5;
      this.player = {
        x: this.width / 2,
        y: 110,
        cooldown: 0,
        aim: Math.PI / 2,
      };
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
        c.vx *= ratio;
        c.angle = Math.atan2(c.vy, c.vx);
      });
      this.harpoons.forEach((h) => {
        h.x *= ratio;
      });
      this.width = width;
    }
    spawn() {
      const entry = ["left", "right", "downstream"][
        Math.floor(this.random() * 3)
      ];
      const x =
        entry === "left"
          ? -65
          : entry === "right"
            ? this.width + 65
            : 60 + this.random() * (this.width - 120);
      const y =
        entry === "downstream" ? HEIGHT + 65 : 280 + this.random() * 210;
      // Commit to the boat's course at entry, leaving room to steer out of danger.
      const dx = this.player.x - x;
      const dy = this.player.y - y;
      const length = Math.hypot(dx, dy);
      const swift = this.wave >= 3 && this.random() < 0.3;
      const speed =
        (100 + this.random() * 30 + Math.min(this.wave - 1, 15) * 6) *
        LEVELS[this.difficulty].speed *
        (swift ? 1.4 : 1);
      this.crocs.push({
        x,
        y,
        entry,
        vx: (dx / length) * speed,
        vy: (dy / length) * speed,
        angle: Math.atan2(dy, dx),
        swift,
        active: true,
        speed,
        phase: this.random() * Math.PI * 2,
      });
    }
    step(dt, input = {}) {
      if (this.mode !== "playing" || !Number.isFinite(dt) || dt <= 0) return;
      dt = Math.min(dt, 1 / 30);
      this.elapsed += dt;
      this.distance += (72 + Math.min(this.wave - 1, 12) * 3) * dt;
      this.player.x = Math.max(
        38,
        Math.min(
          this.width - 38,
          this.player.x +
            ((input.right ? 1 : 0) - (input.left ? 1 : 0)) * 340 * dt,
        ),
      );
      this.player.cooldown = Math.max(0, this.player.cooldown - dt);
      const target = this.crocs
        .filter(
          (c) =>
            c.active &&
            c.x >= 0 &&
            c.x <= this.width &&
            c.y > this.player.y + 35 &&
            c.y <= HEIGHT,
        )
        .reduce(
          (nearest, c) =>
            !nearest ||
            Math.hypot(c.x - this.player.x, c.y - this.player.y) <
              Math.hypot(nearest.x - this.player.x, nearest.y - this.player.y)
              ? c
              : nearest,
          null,
        );
      this.player.aim = Math.PI / 2;
      if (target) {
        const travel =
          Math.hypot(target.x - this.player.x, target.y - this.player.y) / 620;
        this.player.aim = Math.atan2(
          target.y + target.vy * travel - this.player.y,
          target.x + target.vx * travel - this.player.x,
        );
      }
      if (input.fire && this.player.cooldown <= 0) {
        const vx = Math.cos(this.player.aim),
          vy = Math.sin(this.player.aim);
        this.harpoons.push({
          x: this.player.x + vx * 30,
          y: this.player.y + vy * 30,
          vx: vx * 620,
          vy: vy * 620,
          angle: this.player.aim,
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
        h.previousX = h.x;
        h.previousY = h.y;
        h.x += h.vx * dt;
        h.y += h.vy * dt;
      }
      for (const c of this.crocs) {
        c.previousX = c.x;
        c.previousY = c.y;
        c.x += c.vx * dt;
        c.y += c.vy * dt;
      }
      // Sweep relative motion in the croc's local space, including angled swimmers.
      for (const h of this.harpoons) {
        for (const c of this.crocs) {
          if (!h.active || !c.active) continue;
          const cos = Math.cos(c.angle),
            sin = Math.sin(c.angle);
          const project = (x, y) => ({
            x: (x * cos + y * sin) / 44,
            y: (-x * sin + y * cos) / 20,
          });
          const a = project(
            h.previousX - c.previousX,
            h.previousY - c.previousY,
          );
          const b = project(h.x - c.x, h.y - c.y);
          const dx = b.x - a.x,
            dy = b.y - a.y;
          const magnitude = dx * dx + dy * dy;
          const t = magnitude
            ? Math.max(0, Math.min(1, -(a.x * dx + a.y * dy) / magnitude))
            : 0;
          if ((a.x + dx * t) ** 2 + (a.y + dy * t) ** 2 <= 1) {
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
        if (
          c.active &&
          ((c.x - this.player.x) / 45) ** 2 +
            ((c.y - this.player.y) / 48) ** 2 <
            1
        ) {
          c.active = false;
          this.lives = Math.max(0, this.lives - 1);
          this.streak = 0;
          this.events.push({ type: "damage" });
          if (this.lives === 0) {
            this.mode = "over";
            this.events.push({ type: "over" });
            break;
          }
        }
        // Crocs that miss the moving boat fall behind; dodging costs no hull.
        if (
          c.x < -100 ||
          c.x > this.width + 100 ||
          c.y < -100 ||
          c.y > HEIGHT + 100
        )
          c.active = false;
      }
      this.crocs = this.crocs.filter((c) => c.active);
      this.harpoons = this.harpoons.filter(
        (h) =>
          h.active &&
          h.y < HEIGHT + 30 &&
          h.y > -30 &&
          h.x > -30 &&
          h.x < this.width + 30,
      );
    }
    drainEvents() {
      return this.events.splice(0);
    }
  }
  return { Game, HEIGHT, LEVELS };
});
