(() => {
  "use strict";
  const { Game, HEIGHT } = window.CrocGame;
  const game = new Game();
  const $ = (id) => document.getElementById(id);
  const canvas = $("game");
  const ctx = canvas.getContext("2d");
  const scenery = document.createElement("canvas");
  const bg = scenery.getContext("2d");
  const keys = new Set();
  const pointers = new Map();
  const particles = [];
  const labels = [];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let best = 0;
  let sound = false;
  let audio;
  let toastTime = 0;
  let flash = 0;
  let lastTime = 0;
  let accumulator = 0;
  const storageKey = () => `croc-hunter.best.${game.difficulty}`;
  const readBest = () => {
    try {
      best = Math.max(
        0,
        Math.min(999999999, Number(localStorage.getItem(storageKey())) || 0),
      );
    } catch {
      best = 0;
    }
  };
  const saveBest = () => {
    if (game.score <= best) return;
    best = game.score;
    try {
      localStorage.setItem(storageKey(), String(best));
    } catch {
      /* Storage is optional. */
    }
  };
  const clearInput = () => {
    keys.clear();
    pointers.clear();
  };
  const input = () => ({
    left:
      keys.has("ArrowLeft") ||
      keys.has("KeyA") ||
      [...pointers.values()].includes("left"),
    right:
      keys.has("ArrowRight") ||
      keys.has("KeyD") ||
      [...pointers.values()].includes("right"),
    fire: keys.has("Space") || [...pointers.values()].includes("fire"),
  });
  function tone(frequency, duration, type = "sine", volume = 0.035) {
    if (!sound || !audio || audio.state !== "running") return;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, audio.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      frequency * 0.5,
      audio.currentTime + duration,
    );
    gain.gain.setValueAtTime(volume, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + duration);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  }
  function toast(message) {
    $("toast").textContent = message;
    toastTime = 2.2;
  }
  function syncStats() {
    $("score").textContent = String(game.score).padStart(5, "0");
    $("best").textContent = String(best).padStart(5, "0");
    $("wave").textContent = String(game.wave).padStart(2, "0");
    $("lives").textContent =
      "● ".repeat(game.lives) + "○ ".repeat(4 - game.lives);
    $("lives").setAttribute("aria-label", `${game.lives} lives remaining`);
  }
  function showOverlay() {
    const paused = game.mode === "paused";
    const over = game.mode === "over";
    $("overlay").hidden = game.mode === "playing";
    $("pause").disabled = !["playing", "paused"].includes(game.mode);
    $("pause").textContent = paused ? "Resume" : "Pause";
    $("difficultyLabel").hidden = paused;
    if (paused || over) {
      $("badge").textContent = paused
        ? "A MOMENT OF STILL WATER"
        : "THAT’S A WRAP, CAPTAIN";
      $("overlayTitle").textContent = paused
        ? "On a river break."
        : "Patrol complete.";
      $("overlayCopy").textContent = paused
        ? "Your boat is safe. Pick up right where you left off."
        : `${game.score.toLocaleString()} points · Wave ${game.wave} · ${game.hits} catches · Best streak ${game.bestStreak}`;
      $("start").textContent = paused ? "Resume patrol ↗" : "Try again ↗";
      $("startHint").textContent = paused
        ? "OR PRESS P / ENTER"
        : "OR PRESS ENTER / R";
      $("status").textContent = paused
        ? "Patrol paused. Take your time."
        : "Patrol complete. There’s always another round.";
      $("start").focus({ preventScroll: true });
    }
  }
  function start() {
    clearInput();
    if (game.mode === "paused") game.resume();
    else {
      game.start($("difficulty").value);
      readBest();
      particles.length = 0;
      labels.length = 0;
      flash = 0;
      toast("Wave 1 · Welcome to the bayou");
    }
    accumulator = 0;
    $("status").textContent =
      "Patrol in progress. Catch crocs before they escape.";
    showOverlay();
    syncStats();
    $("playfield").focus({ preventScroll: true });
    document
      .querySelector(".arcade")
      .scrollIntoView({ block: "start", behavior: "instant" });
    if (audio?.state === "suspended") audio.resume().catch(() => {});
  }
  function pause() {
    if (game.mode !== "playing") return;
    game.pause();
    clearInput();
    showOverlay();
  }
  function togglePause() {
    if (game.mode === "paused") start();
    else pause();
  }

  // Seeded scenery avoids a flickering landscape and needs no downloaded assets.
  function makeScenery() {
    const w = game.width;
    scenery.width = w;
    scenery.height = HEIGHT;
    let seed = 41;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const gradient = bg.createLinearGradient(0, 0, 0, HEIGHT);
    gradient.addColorStop(0, "#315c49");
    gradient.addColorStop(0.48, "#234f43");
    gradient.addColorStop(1, "#163b35");
    bg.fillStyle = gradient;
    bg.fillRect(0, 0, w, HEIGHT);
    // Dark reed banks frame the play area; the open central channel stays readable.
    for (const side of [0, 1]) {
      bg.fillStyle = "#203e2d";
      bg.beginPath();
      bg.moveTo(side ? w : 0, 0);
      for (let y = 0; y <= HEIGHT; y += 20) {
        bg.lineTo(side ? w - 20 - random() * 18 : 20 + random() * 18, y);
      }
      bg.lineTo(side ? w : 0, HEIGHT);
      bg.fill();
      for (let i = 0; i < 100; i++) {
        const x = side ? w - random() * 35 : random() * 35;
        const y = random() * HEIGHT;
        bg.strokeStyle = ["#476344", "#65764b", "#304d36"][i % 3];
        bg.lineWidth = 1.5;
        bg.beginPath();
        bg.moveTo(x, y);
        bg.lineTo(x + random() * 14 - 7, y - 10 - random() * 23);
        bg.stroke();
      }
    }
    for (let i = 0; i < 26; i++) {
      const side = random() > 0.5;
      const x = side ? w - 25 - random() * 75 : 25 + random() * 75;
      const y = 40 + random() * 490;
      const radius = 5 + random() * 11;
      bg.fillStyle = "#0c2e2b55";
      bg.beginPath();
      bg.ellipse(x + 4, y + 3, radius + 4, radius * 0.6, 0, 0, Math.PI * 2);
      bg.fill();
      bg.fillStyle = ["#657e47", "#4e703f", "#789254"][i % 3];
      bg.beginPath();
      bg.moveTo(x, y);
      bg.ellipse(x, y, radius, radius * 0.6, -0.3, 0.25, Math.PI * 2 - 0.12);
      bg.closePath();
      bg.fill();
    }
    for (let i = 0; i < 100; i++) {
      const x = random() * w;
      const y = random() * HEIGHT;
      bg.strokeStyle = "#a1c39b0c";
      bg.beginPath();
      bg.moveTo(x, y);
      bg.lineTo(x + 10 + random() * 35, y);
      bg.stroke();
    }
  }
  function resize() {
    const bounds = $("playfield").getBoundingClientRect();
    // Hidden tabs and capture/layout transitions can briefly report zero size.
    if (bounds.width <= 0 || bounds.height <= 0) return;
    const width = Math.max(
      480,
      Math.round((HEIGHT * bounds.width) / bounds.height),
    );
    game.resize(width);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(HEIGHT * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    makeScenery();
    draw();
  }
  function ellipse(context, x, y, rx, ry, fill) {
    context.fillStyle = fill;
    context.beginPath();
    context.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    context.fill();
  }
  function drawCroc(c, time) {
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.scale(c.direction, 1);
    const wiggle = reducedMotion.matches ? 0 : Math.sin(time * 6 + c.phase) * 4;
    ctx.strokeStyle = "#a9cd9a26";
    ctx.lineWidth = 1;
    for (const offset of [-20, 20]) {
      ctx.beginPath();
      ctx.ellipse(-8, offset, 47, 5, 0, 0.2, Math.PI - 0.2);
      ctx.stroke();
    }
    ellipse(ctx, 0, 5, 51, 13, "#092d2a55");
    ctx.fillStyle = c.swift ? "#b5a45e" : "#85a45d";
    ctx.beginPath();
    ctx.moveTo(-23, -9);
    ctx.quadraticCurveTo(-42, -11, -65, wiggle);
    ctx.quadraticCurveTo(-38, 9, -24, 9);
    ctx.closePath();
    ctx.fill();
    for (const x of [-20, 15]) {
      ctx.fillStyle = "#617d47";
      ctx.beginPath();
      ctx.moveTo(x - 4, -8);
      ctx.lineTo(x - 11, -20);
      ctx.lineTo(x + 6, -15);
      ctx.lineTo(x + 9, 0);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x - 4, 8);
      ctx.lineTo(x - 11, 20);
      ctx.lineTo(x + 6, 15);
      ctx.lineTo(x + 9, 0);
      ctx.fill();
    }
    ellipse(ctx, -4, 0, 34, 13, c.swift ? "#b5a45e" : "#85a45d");
    ctx.fillStyle = c.swift ? "#c6b870" : "#9ebc70";
    ctx.beginPath();
    ctx.moveTo(12, -10);
    ctx.lineTo(42, -8);
    ctx.quadraticCurveTo(54, 0, 42, 8);
    ctx.lineTo(12, 10);
    ctx.fill();
    ctx.strokeStyle = "#416544";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(28, 3);
    ctx.lineTo(48, 3);
    ctx.stroke();
    for (let x = -25; x <= 8; x += 9) {
      ctx.fillStyle = "#4e7041";
      ctx.beginPath();
      ctx.moveTo(x, -4);
      ctx.lineTo(x + 5, 0);
      ctx.lineTo(x, 4);
      ctx.closePath();
      ctx.fill();
    }
    ellipse(ctx, 24, -8, 5, 4, "#d2dca2");
    ellipse(ctx, 25, -8, 2, 2, "#162f25");
    ellipse(ctx, 24, 8, 4, 3, "#b7cc85");
    ellipse(ctx, 25, 8, 1.7, 1.7, "#162f25");
    ctx.restore();
  }
  function drawBoat(time) {
    const { x, y } = game.player;
    ctx.save();
    ctx.translate(
      x,
      y + (reducedMotion.matches ? 0 : Math.sin(time * 3) * 1.6),
    );
    ctx.strokeStyle = "#d6e4c637";
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.ellipse(0, -26 - i * 10, 13 + i * 4, 4, 0, Math.PI, Math.PI * 2);
      ctx.stroke();
    }
    ellipse(ctx, 5, 5, 24, 43, "#082d2c66");
    ctx.fillStyle = "#d4c79f";
    ctx.beginPath();
    ctx.moveTo(-19, -32);
    ctx.lineTo(19, -32);
    ctx.quadraticCurveTo(27, 20, 0, 43);
    ctx.quadraticCurveTo(-27, 20, -19, -32);
    ctx.fill();
    ctx.fillStyle = "#725f3e";
    ctx.beginPath();
    ctx.moveTo(-13, -23);
    ctx.lineTo(13, -23);
    ctx.lineTo(11, 16);
    ctx.lineTo(0, 30);
    ctx.lineTo(-11, 16);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#b4a17c";
    ctx.fillRect(-15, -15, 30, 6);
    ctx.fillRect(-12, 9, 24, 6);
    ctx.fillStyle = "#263f32";
    ctx.fillRect(-7, -39, 14, 14);
    ellipse(ctx, 0, -1, 10, 9, "#e5a75b");
    ellipse(ctx, 0, -5, 13, 6, "#e4d4a7");
    ellipse(ctx, 0, -7, 8, 6, "#b7a675");
    ctx.fillStyle = "#34483c";
    ctx.fillRect(-3, 13, 6, 27);
    ctx.fillStyle = "#e9e2c5";
    ctx.fillRect(-2, 34, 4, 9);
    ctx.restore();
  }
  function draw() {
    const time = reducedMotion.matches ? 0 : game.elapsed;
    ctx.clearRect(0, 0, game.width, HEIGHT);
    ctx.drawImage(scenery, 0, 0);
    ctx.strokeStyle = "#a5c8af13";
    ctx.lineWidth = 1;
    for (let row = 0; row < 12; row++) {
      const y = row * 47 + 12;
      for (let col = 0; col < game.width / 130; col++) {
        const x = col * 130 + Math.sin(row) * 28;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(
          x + 27,
          y + Math.sin(time * 1.4 + row) * 4,
          x + 55,
          y,
        );
        ctx.stroke();
      }
    }
    if (game.mode === "ready") {
      [
        { x: game.width * 0.16, y: 340, direction: 1, phase: 0 },
        { x: game.width * 0.83, y: 210, direction: -1, phase: 2 },
        { x: game.width * 0.81, y: 450, direction: 1, phase: 1 },
      ].forEach((c) => drawCroc(c, time));
    }
    game.crocs.forEach((c) => drawCroc(c, time));
    drawBoat(time);
    for (const h of game.harpoons) {
      ctx.strokeStyle = "#f0d491";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(h.x, h.y - 20);
      ctx.lineTo(h.x, h.y + 8);
      ctx.moveTo(h.x - 5, h.y + 2);
      ctx.lineTo(h.x, h.y + 9);
      ctx.lineTo(h.x + 5, h.y + 2);
      ctx.stroke();
    }
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life * 1.5);
      ellipse(ctx, p.x, p.y, p.size, p.size, p.color);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = "center";
    ctx.font = "bold 18px monospace";
    for (const label of labels) {
      ctx.globalAlpha = Math.min(1, label.life);
      ctx.fillStyle = "#e3eeae";
      ctx.fillText(`+${label.points}`, label.x, label.y);
    }
    ctx.globalAlpha = 1;
    if (flash > 0 && !reducedMotion.matches) {
      ctx.fillStyle = `rgba(228,130,85,${flash * 0.2})`;
      ctx.fillRect(0, 0, game.width, HEIGHT);
    }
  }
  function effects(dt) {
    for (const event of game.drainEvents()) {
      if (event.type === "fire") tone(330, 0.07, "triangle", 0.018);
      if (event.type === "catch") {
        tone(700, 0.14);
        labels.push({ ...event, life: 1.1 });
        if (!reducedMotion.matches)
          for (let i = 0; i < 12; i++) {
            const angle = Math.random() * Math.PI * 2;
            particles.push({
              x: event.x,
              y: event.y,
              vx: Math.cos(angle) * 80,
              vy: Math.sin(angle) * 80,
              life: 0.6,
              size: 1 + Math.random() * 3,
              color: i % 2 ? "#a4c992" : "#e5e3ad",
            });
          }
        saveBest();
        $("status").textContent =
          `${game.streak} catch streak · ${Math.min(4, 1 + Math.floor(game.streak / 5))}× score multiplier`;
      }
      if (event.type === "wave") {
        toast(
          `Wave ${event.wave} · ${event.wave === 3 ? "Watch for fast golden crocs!" : "The river is picking up"}`,
        );
        tone(900, 0.3);
      }
      if (event.type === "escape") {
        flash = 0.6;
        tone(130, 0.24, "sawtooth", 0.025);
        toast("Croc escaped · Hull damaged");
      }
      if (event.type === "over") {
        saveBest();
        clearInput();
        $("toast").textContent = "";
        showOverlay();
      }
      syncStats();
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
    for (let i = labels.length - 1; i >= 0; i--) {
      labels[i].life -= dt;
      labels[i].y -= 25 * dt;
      if (labels[i].life <= 0) labels.splice(i, 1);
    }
    flash = Math.max(0, flash - dt);
    toastTime -= dt;
    if (toastTime <= 0) $("toast").textContent = "";
  }
  function frame(timestamp) {
    const dt = lastTime ? Math.min((timestamp - lastTime) / 1000, 0.1) : 0;
    lastTime = timestamp;
    if (game.mode === "playing") {
      accumulator += dt;
      while (accumulator >= 1 / 60) {
        game.step(1 / 60, input());
        effects(1 / 60);
        accumulator -= 1 / 60;
        if (game.mode !== "playing") {
          accumulator = 0;
          break;
        }
      }
    }
    draw();
    requestAnimationFrame(frame);
  }
  const gameKeys = [
    "ArrowLeft",
    "ArrowRight",
    "KeyA",
    "KeyD",
    "Space",
    "KeyP",
    "Enter",
    "KeyR",
    "Escape",
  ];
  window.addEventListener("keydown", (event) => {
    if (
      !gameKeys.includes(event.code) ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey
    )
      return;
    // Keep native keyboard activation and select navigation intact.
    if (event.target.closest?.("select, input, textarea")) return;
    if (
      event.target.closest?.("button, a") &&
      ["Space", "Enter"].includes(event.code)
    )
      return;
    event.preventDefault();
    if (event.repeat) return;
    if (event.code === "KeyP" || event.code === "Escape") {
      togglePause();
      return;
    }
    if (event.code === "Enter" && game.mode !== "playing") {
      start();
      return;
    }
    if (event.code === "KeyR" && game.mode === "over") {
      start();
      return;
    }
    if (event.code === "Space" && ["ready", "over"].includes(game.mode))
      start();
    if (game.mode === "playing") keys.add(event.code);
  });
  window.addEventListener("keyup", (event) => keys.delete(event.code));
  window.addEventListener("blur", () => {
    clearInput();
    pause();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      clearInput();
      pause();
    }
  });
  for (const action of ["left", "right", "fire"]) {
    const button = $(action);
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      if (game.mode !== "playing") return;
      button.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId, action);
    });
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
      button.addEventListener(type, (event) =>
        pointers.delete(event.pointerId),
      );
    button.addEventListener("contextmenu", (event) => event.preventDefault());
  }
  $("start").addEventListener("click", start);
  $("pause").addEventListener("click", togglePause);
  $("difficulty").addEventListener("change", () => {
    game.difficulty = $("difficulty").value;
    readBest();
    syncStats();
  });
  $("sound").addEventListener("click", async () => {
    try {
      if (!audio) {
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (!Audio) throw new Error("unavailable");
        audio = new Audio();
      }
      await audio.resume();
      sound = !sound;
      $("sound").textContent = sound ? "Sound on" : "Sound off";
      $("sound").setAttribute("aria-pressed", String(sound));
      if (game.mode === "playing")
        $("playfield").focus({ preventScroll: true });
      if (sound) tone(600, 0.12);
    } catch {
      $("status").textContent =
        "Sound is unavailable in this browser. You can still play.";
    }
  });
  if (!document.fullscreenEnabled) $("fullscreen").hidden = true;
  $("fullscreen").addEventListener("click", async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.querySelector(".arcade").requestFullscreen();
      if (game.mode === "playing")
        $("playfield").focus({ preventScroll: true });
    } catch {
      $("status").textContent =
        "Full screen is unavailable. Your patrol can continue here.";
    }
  });
  document.addEventListener("fullscreenchange", () => {
    $("fullscreen").textContent = document.fullscreenElement
      ? "Exit full screen"
      : "Full screen";
  });
  new ResizeObserver(resize).observe($("playfield"));
  readBest();
  syncStats();
  resize();
  requestAnimationFrame(frame);
})();
