(() => {
  const WIDTH = 960;
  const HEIGHT = 540;
  const LAYERS = {
    background: document.getElementById("canvasBg").getContext("2d"),
    enemies: document.getElementById("canvasEnemy").getContext("2d"),
    player: document.getElementById("canvasJet").getContext("2d"),
    hud: document.getElementById("canvasHud").getContext("2d"),
  };

  Object.values(LAYERS).forEach((ctx) => {
    ctx.canvas.width = WIDTH;
    ctx.canvas.height = HEIGHT;
  });

  const input = {
    left: false,
    right: false,
    fire: false,
    pause: false,
  };
  const statusText = document.getElementById("statusText");

  const colors = {
    water: ["#0f274a", "#0d1c38", "#0a152d"],
    shoreline: "#27406c",
    croc: "#4ae3b5",
    crocBelly: "#1fa36f",
    projectile: "#ff9f43",
    jet: "#d9e1ff",
    jetAccent: "#4a90e3",
    hud: "#e8f1ff",
  };

  const state = {
    running: false,
    paused: false,
    gameOver: false,
    elapsed: 0,
    spawnTimer: 0,
    spawnInterval: 1.6,
    score: 0,
    hits: 0,
    shots: 0,
    streak: 0,
    bestStreak: 0,
    hearts: 4,
    wave: 1,
    message: "Press ENTER or SPACE to begin",
    harpoons: [],
    crocs: [],
    particles: [],
  };

  const syncStatusText = () => {
    if (statusText) {
      statusText.textContent = state.message;
    }
  };

  class Player {
    constructor() {
      this.x = WIDTH / 2;
      this.y = 120;
      this.speed = 240;
      this.fireCooldown = 0;
      this.fireRate = 0.28;
    }

    update(dt) {
      const direction = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      this.x += direction * this.speed * dt;
      this.x = Math.max(60, Math.min(WIDTH - 60, this.x));

      if (this.fireCooldown > 0) this.fireCooldown -= dt;
      if (state.running && !state.paused && input.fire && this.fireCooldown <= 0) {
        spawnHarpoon(this.x, this.y + 20);
        this.fireCooldown = this.fireRate;
      }
    }

    draw(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.fillStyle = colors.jet;
      ctx.beginPath();
      ctx.moveTo(0, -18);
      ctx.quadraticCurveTo(32, 10, 0, 18);
      ctx.quadraticCurveTo(-32, 10, 0, -18);
      ctx.fill();
      ctx.fillStyle = colors.jetAccent;
      ctx.fillRect(-8, -14, 16, 28);
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fillRect(-4, -10, 8, 16);
      ctx.restore();
    }
  }

  class Harpoon {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.speed = 520;
      this.active = true;
    }

    update(dt) {
      this.y += this.speed * dt;
      if (this.y > HEIGHT + 16) this.active = false;
    }

    draw(ctx) {
      ctx.save();
      ctx.strokeStyle = colors.projectile;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y - 12);
      ctx.lineTo(this.x, this.y + 12);
      ctx.stroke();
      ctx.restore();
    }
  }

  class Croc {
    constructor() {
      const fromLeft = Math.random() > 0.5;
      this.y = 300 + Math.random() * 180;
      this.x = fromLeft ? -80 : WIDTH + 80;
      this.speed = 70 + Math.random() * (90 + state.wave * 15);
      this.direction = fromLeft ? 1 : -1;
      this.width = 90;
      this.height = 26;
      this.health = 1;
      this.active = true;
    }

    update(dt) {
      this.x += this.speed * this.direction * dt;
      if (this.x < -140 || this.x > WIDTH + 140) {
        this.active = false;
        loseHeart();
      }
    }

    draw(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.scale(this.direction, 1);
      ctx.fillStyle = colors.croc;
      ctx.beginPath();
      ctx.moveTo(-40, 0);
      ctx.quadraticCurveTo(-16, -16, 34, -8);
      ctx.quadraticCurveTo(48, -4, 46, 0);
      ctx.quadraticCurveTo(48, 4, 34, 8);
      ctx.quadraticCurveTo(-16, 16, -40, 0);
      ctx.fill();
      ctx.fillStyle = colors.crocBelly;
      ctx.fillRect(-14, -6, 32, 12);
      ctx.fillStyle = "#0b1021";
      ctx.beginPath();
      ctx.arc(18, -6, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    hit() {
      this.health -= 1;
      if (this.health <= 0) {
        this.active = false;
        popSplash(this.x, this.y, colors.croc);
        awardScore();
      }
    }
  }

  class Particle {
    constructor(x, y, color) {
      this.x = x;
      this.y = y;
      this.life = 0.7;
      this.speed = 120 + Math.random() * 140;
      this.angle = Math.random() * Math.PI * 2;
      this.color = color;
    }

    update(dt) {
      this.life -= dt;
      this.x += Math.cos(this.angle) * this.speed * dt;
      this.y += Math.sin(this.angle) * this.speed * dt;
    }

    draw(ctx) {
      ctx.save();
      ctx.globalAlpha = Math.max(this.life, 0);
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  const player = new Player();

  const spawnHarpoon = (x, y) => {
    state.harpoons.push(new Harpoon(x, y));
    state.shots += 1;
  };

  const spawnCroc = () => {
    state.crocs.push(new Croc());
  };

  const popSplash = (x, y, color) => {
    for (let i = 0; i < 18; i += 1) {
      state.particles.push(new Particle(x, y, color));
    }
  };

  const awardScore = () => {
    const combo = 1 + state.streak * 0.05;
    const waveBonus = 1 + state.wave * 0.15;
    state.score += Math.round(25 * combo * waveBonus);
    state.hits += 1;
    state.streak += 1;
    state.bestStreak = Math.max(state.bestStreak, state.streak);
    maybeAdvanceWave();
    state.message = `Streak ${state.streak}x — keep the bayou clean!`;
    syncStatusText();
  };

  const loseHeart = () => {
    state.hearts -= 1;
    state.streak = 0;
    state.message = "A croc slipped through!";
    if (state.hearts <= 0) {
      state.gameOver = true;
      state.message = `You held out for ${state.wave} waves — press R to retry`;
    }
    syncStatusText();
  };

  const maybeAdvanceWave = () => {
    const newWave = 1 + Math.floor(state.hits / 10);
    if (newWave > state.wave) {
      state.wave = newWave;
      state.spawnInterval = Math.max(0.65, 1.6 - state.wave * 0.08);
      state.message = `Wave ${state.wave}! The swamp is boiling.`;
      syncStatusText();
    }
  };

  const resetGame = () => {
    state.running = true;
    state.paused = false;
    state.gameOver = false;
    state.elapsed = 0;
    state.spawnTimer = 0;
    state.spawnInterval = 1.6;
    state.score = 0;
    state.hits = 0;
    state.shots = 0;
    state.streak = 0;
    state.bestStreak = 0;
    state.hearts = 4;
    state.wave = 1;
    state.message = "Wave 1 — keep the crocs away";
    state.harpoons = [];
    state.crocs = [];
    state.particles = [];
    syncStatusText();
  };

  const accuracy = () => {
    if (state.shots === 0) return 0;
    return Math.round((state.hits / state.shots) * 100);
  };

  const drawBackground = () => {
    const ctx = LAYERS.background;
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    gradient.addColorStop(0, colors.water[0]);
    gradient.addColorStop(0.5, colors.water[1]);
    gradient.addColorStop(1, colors.water[2]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.fillStyle = colors.shoreline;
    ctx.fillRect(0, HEIGHT - 90, WIDTH, 120);

    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 6; i += 1) {
      ctx.beginPath();
      const waveY = 120 + i * 60;
      ctx.moveTo(0, waveY);
      for (let x = 0; x <= WIDTH; x += 24) {
        const y = waveY + Math.sin((x / 40) + i) * 5;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  };

  const drawCrocs = () => {
    const ctx = LAYERS.enemies;
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    state.crocs.forEach((croc) => croc.draw(ctx));
    state.particles.forEach((p) => p.draw(ctx));
  };

  const drawPlayer = () => {
    const ctx = LAYERS.player;
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    state.harpoons.forEach((harpoon) => harpoon.draw(ctx));
    player.draw(ctx);
  };

  const drawHud = () => {
    const ctx = LAYERS.hud;
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(0, 0, WIDTH, 64);
    ctx.fillStyle = colors.hud;
    ctx.font = "16px 'Inter', 'Segoe UI', sans-serif";
    ctx.textBaseline = "top";

    ctx.fillText(`Score: ${state.score}`, 22, 18);
    ctx.fillText(`Wave: ${state.wave}`, 160, 18);
    ctx.fillText(`Accuracy: ${accuracy()}%`, 260, 18);
    ctx.fillText(`Streak: ${state.streak} (best ${state.bestStreak})`, 420, 18);

    for (let i = 0; i < state.hearts; i += 1) {
      const x = WIDTH - 26 - i * 26;
      ctx.fillStyle = colors.accent;
      ctx.beginPath();
      ctx.arc(x, 26, 10, 0, Math.PI * 2);
      ctx.arc(x + 12, 26, 10, 0, Math.PI * 2);
      ctx.moveTo(x - 6, 30);
      ctx.lineTo(x + 12, 46);
      ctx.lineTo(x + 30, 30);
      ctx.fill();
    }

    ctx.textBaseline = "middle";
    ctx.font = "22px 'Inter', 'Segoe UI', sans-serif";
    ctx.fillStyle = "rgba(232,241,255,0.9)";
    ctx.fillText(state.message, 22, HEIGHT - 30);

    if (!state.running) {
      ctx.fillStyle = "rgba(11,16,33,0.75)";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = colors.hud;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "32px 'Inter', 'Segoe UI', sans-serif";
      ctx.fillText("Croc Hunter: Tidal Revenge", WIDTH / 2, HEIGHT / 2 - 24);
      ctx.font = "18px 'Inter', 'Segoe UI', sans-serif";
      ctx.fillText("Press ENTER or SPACE to begin", WIDTH / 2, HEIGHT / 2 + 12);
      ctx.fillText("Move with A/D or arrows, fire with SPACE", WIDTH / 2, HEIGHT / 2 + 40);
    } else if (state.paused) {
      ctx.fillStyle = "rgba(11,16,33,0.65)";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = colors.hud;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "28px 'Inter', 'Segoe UI', sans-serif";
      ctx.fillText("Paused — press P to resume", WIDTH / 2, HEIGHT / 2);
    } else if (state.gameOver) {
      ctx.fillStyle = "rgba(11,16,33,0.7)";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = colors.hud;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "30px 'Inter', 'Segoe UI', sans-serif";
      ctx.fillText("The bayou is overrun!", WIDTH / 2, HEIGHT / 2 - 10);
      ctx.font = "18px 'Inter', 'Segoe UI', sans-serif";
      ctx.fillText(`Final score ${state.score} — best streak ${state.bestStreak}`, WIDTH / 2, HEIGHT / 2 + 20);
      ctx.fillText("Press R to restart", WIDTH / 2, HEIGHT / 2 + 48);
    }
  };

  const updateEntities = (dt) => {
    player.update(dt);
    state.harpoons.forEach((harpoon) => harpoon.update(dt));
    state.crocs.forEach((croc) => croc.update(dt));
    state.particles.forEach((p) => p.update(dt));

    state.harpoons = state.harpoons.filter((h) => h.active);
    state.crocs = state.crocs.filter((c) => c.active);
    state.particles = state.particles.filter((p) => p.life > 0);

    state.crocs.forEach((croc) => {
      state.harpoons.forEach((harpoon) => {
        if (!croc.active || !harpoon.active) return;
        const withinX = Math.abs(croc.x - harpoon.x) < 48;
        const withinY = Math.abs(croc.y - harpoon.y) < 24;
        if (withinX && withinY) {
          croc.hit();
          harpoon.active = false;
        }
      });
    });
  };

  const update = (dt) => {
    if (!state.running || state.paused || state.gameOver) return;

    state.elapsed += dt;
    state.spawnTimer += dt;

    const targetInterval = Math.max(0.6, state.spawnInterval - state.wave * 0.01);
    if (state.spawnTimer >= targetInterval) {
      spawnCroc();
      state.spawnTimer = 0;
    }

    updateEntities(dt);
  };

  const render = () => {
    drawCrocs();
    drawPlayer();
    drawHud();
  };

  const loop = (timestamp) => {
    if (!state.lastTime) state.lastTime = timestamp;
    const dt = Math.min((timestamp - state.lastTime) / 1000, 0.1);
    state.lastTime = timestamp;

    update(dt);
    render();
    requestAnimationFrame(loop);
  };

  const bindInput = () => {
    const isGameKey = (key) =>
      ["ArrowLeft", "ArrowRight", "a", "d", " ", "Spacebar", "Enter", "p", "r"].includes(key);

    const setKey = (key, isDown) => {
      const lowered = key.toLowerCase();
      if (key === "ArrowLeft" || lowered === "a") input.left = isDown;
      if (key === "ArrowRight" || lowered === "d") input.right = isDown;
      if (key === " " || key === "Spacebar") input.fire = isDown;
      if (lowered === "p") input.pause = isDown;
    };

    window.addEventListener("keydown", (event) => {
      if (isGameKey(event.key)) event.preventDefault();
      setKey(event.key, true);

      if (event.key === "Enter" || event.key === " ") {
        if (!state.running || state.gameOver) {
          resetGame();
        }
      }

      if (event.key.toLowerCase() === "p" && state.running && !state.gameOver) {
        state.paused = !state.paused;
        state.message = state.paused ? "Paused" : "Back in the fight";
        syncStatusText();
      }

      if (event.key.toLowerCase() === "r") {
        resetGame();
      }
    });

    window.addEventListener("keyup", (event) => {
      if (isGameKey(event.key)) event.preventDefault();
      setKey(event.key, false);
    });

    window.addEventListener("blur", () => {
      if (state.running) {
        state.paused = true;
        state.message = "Paused";
        syncStatusText();
      }
    });

    const holdButton = (id, prop) => {
      const button = document.getElementById(id);
      if (!button) return;
      const press = (e) => {
        e.preventDefault();
        input[prop] = true;
      };
      const release = (e) => {
        e.preventDefault();
        input[prop] = false;
      };
      button.addEventListener("pointerdown", press);
      button.addEventListener("pointerup", release);
      button.addEventListener("pointerleave", release);
      button.addEventListener("pointercancel", release);
    };

    holdButton("btnLeft", "left");
    holdButton("btnRight", "right");
    holdButton("btnFire", "fire");

    const pauseButton = document.getElementById("btnPause");
    if (pauseButton) {
      pauseButton.addEventListener("click", (event) => {
        event.preventDefault();
        if (!state.running || state.gameOver) {
          resetGame();
          return;
        }
        state.paused = !state.paused;
        state.message = state.paused ? "Paused" : "Back in the fight";
        syncStatusText();
      });
    }
  };

  drawBackground();
  bindInput();
  syncStatusText();
  render();
  requestAnimationFrame(loop);
})();
