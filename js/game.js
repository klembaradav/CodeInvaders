(() => {
  // Config
  const CONFIG = {
    canvasWidth: 360,   // internal pixel resolution (scaled up by CSS) - wider canvas
    canvasHeight: 320,
    playerSpeed: 80,    // px per second
    bulletSpeed: 180,
    invaderCols: 12, // more invaders to fill wider canvas
    invaderRows: 5,
    invaderHSpacing: 18,
    invaderVSpacing: 14,
    invaderStepDown: 10,
    invaderSpeed: 20,   // horizontal speed (px/s) base
    invaderOscillationPx: 3, // small vertical wiggle
    invaderOscillationSpeed: 4, // Hz
    invaderSpeedIncreasePerRowCleared: 6,
    fireCooldownMs: 220,
    rapidFireCooldownMs: 120,
    powerupDropChance: 0.5,
    powerupFallSpeed: 50,
    powerupDurationSec: 6,
  };

  // Colors (pixel-art with UCP palette)
  const COLORS = {
    bg: '#0a0a0a',
    player: '#31B3F2',
    bullet: '#FBB13C',
    invader1: '#F562A5',
    invader2: '#31B3F2',
    invader3: '#FBB13C', // yellow invaders
    text: '#f2f2f2',
  };

  // State
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  canvas.width = CONFIG.canvasWidth;
  canvas.height = CONFIG.canvasHeight;

  // prevent blurring
  ctx.imageSmoothingEnabled = false;

  // Fit canvas to viewport at 100% while preserving aspect ratio
  function fitCanvasToViewport() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const aspect = CONFIG.canvasWidth / CONFIG.canvasHeight;
    let cssW = vw;
    let cssH = Math.round(cssW / aspect);
    if (cssH > vh) {
      cssH = vh;
      cssW = Math.round(cssH * aspect);
    }
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
  }
  window.addEventListener('resize', fitCanvasToViewport);
  fitCanvasToViewport();

  let lastTime = 0;
  let isGameOver = false;
  let score = 0;
  const scoreEl = document.getElementById('score');
  const powerupsUi = document.getElementById('powerups-ui');

  const keys = new Set();
  let canFireAt = 0;

  // Audio context for sound effects
  let audioContext = null;
  let soundsEnabled = true;

  // Initialize audio context on first user interaction
  function initAudio() {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  // Simple 8-bit style sound generator
  function playSound(frequency, duration, type = 'square') {
    if (!audioContext || !soundsEnabled) return;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    oscillator.type = type;
    
    // Envelope for 8-bit sound
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
  }

  // Sound effects
  function playPlayerShoot() {
    playSound(800, 0.1, 'square'); // High pitch, short
  }

  function playEnemyShoot() {
    playSound(200, 0.15, 'sawtooth'); // Low pitch, slightly longer
  }

  function playEnemyKill() {
    // Descending tone for kill
    playSound(400, 0.2, 'square');
    setTimeout(() => playSound(300, 0.15, 'square'), 50);
    setTimeout(() => playSound(200, 0.1, 'square'), 100);
  }

  const player = {
    w: 12,
    h: 8,
    x: (CONFIG.canvasWidth - 12) / 2,
    y: CONFIG.canvasHeight - 50, // much higher to be closer to enemies
  };

  /** bullets: {x,y,w,h} */
  const bullets = [];
  /** enemyBullets: {x,y,w,h} */
  const enemyBullets = [];
  /** powerups: {x,y,w,h,type} type: 'rapid'|'shotgun'|'shield'|'speed' */
  const powerups = [];

  // Active timed effects
  let rapidFireUntil = 0;
  let shotgunUntil = 0;
  let shieldUntil = 0; // visual cue for shield
  let speedBoostUntil = 0;

  /** invaders: {x,y,w,h,alive} */
  let invaders = [];
  let invaderDir = 1; // 1 right, -1 left
  let invaderSpeed = CONFIG.invaderSpeed;
  let waveStartTime = 0; // for oscillation phase

  function resetGame() {
    isGameOver = false;
    score = 0;
    updateScore();
    bullets.length = 0;
    invaders = [];
    invaderDir = 1;
    invaderSpeed = CONFIG.invaderSpeed;
    waveStartTime = performance.now();
    powerups.length = 0;
    rapidFireUntil = shotgunUntil = shieldUntil = speedBoostUntil = 0;

    const startX = 16;
    const startY = 80; // much lower so they're much closer to player
    for (let row = 0; row < CONFIG.invaderRows; row++) {
      for (let col = 0; col < CONFIG.invaderCols; col++) {
        invaders.push({
          x: startX + col * CONFIG.invaderHSpacing,
          y: startY + row * CONFIG.invaderVSpacing,
          w: 10,
          h: 8,
          alive: true,
          baseY: startY + row * CONFIG.invaderVSpacing,
        });
      }
    }
  }

  function updateScore() {
    scoreEl.textContent = String(score);
  }

  function updatePowerupsUI() {
    const now = performance.now();
    const items = [];
    if (now < rapidFireUntil) items.push({ key: 'Rapid', color: COLORS.invader2, remaining: (rapidFireUntil - now) / 1000 });
    if (now < shotgunUntil) items.push({ key: 'Shotgun', color: COLORS.invader1, remaining: (shotgunUntil - now) / 1000 });
    if (now < shieldUntil) items.push({ key: 'Shield', color: COLORS.invader3, remaining: (shieldUntil - now) / 1000 });
    if (now < speedBoostUntil) items.push({ key: 'Speed', color: COLORS.bullet, remaining: (speedBoostUntil - now) / 1000 });

    powerupsUi.innerHTML = items.map(i => {
      const secs = Math.max(0, Math.ceil(i.remaining));
      return `<span class="pui-item">${i.key} ${secs}s</span>`;
    }).join('');
  }

  // Input
  window.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.add('left');
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.add('right');
    if (e.code === 'Space') keys.add('shoot');
    if (e.code === 'KeyR') {
      resetGame();
    }
    if (e.code === 'KeyM') {
      soundsEnabled = !soundsEnabled;
    }
    // Initialize audio on first key press
    initAudio();
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.delete('left');
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.delete('right');
    if (e.code === 'Space') keys.delete('shoot');
  });

  function fireBullet() {
    const now = performance.now();
    if (now < canFireAt) return;
    const cooldown = now < rapidFireUntil ? CONFIG.rapidFireCooldownMs : CONFIG.fireCooldownMs;
    canFireAt = now + cooldown;

    const cx = player.x + player.w / 2 - 1;
    if (now < shotgunUntil) {
      bullets.push({ x: cx - 4, y: player.y - 4, w: 2, h: 4 });
      bullets.push({ x: cx, y: player.y - 4, w: 2, h: 4 });
      bullets.push({ x: cx + 4, y: player.y - 4, w: 2, h: 4 });
    } else {
      bullets.push({ x: cx, y: player.y - 4, w: 2, h: 4 });
    }
    playPlayerShoot(); // Very low volume sound
  }

  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function update(dt) {
    if (isGameOver) return;

    // player movement
    let dx = 0;
    const speed = (performance.now() < speedBoostUntil) ? CONFIG.playerSpeed * 1.6 : CONFIG.playerSpeed;
    if (keys.has('left')) dx -= speed * dt;
    if (keys.has('right')) dx += speed * dt;
    player.x = Math.max(4, Math.min(CONFIG.canvasWidth - player.w - 4, player.x + dx));

    if (keys.has('shoot')) fireBullet();

    // bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
      bullets[i].y -= CONFIG.bulletSpeed * dt;
      if (bullets[i].y + bullets[i].h < 0) bullets.splice(i, 1);
    }

    // powerups falling
    for (let i = powerups.length - 1; i >= 0; i--) {
      const p = powerups[i];
      p.y += CONFIG.powerupFallSpeed * dt;
      if (p.y > CONFIG.canvasHeight) powerups.splice(i, 1);
    }

    // enemy bullets
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
      enemyBullets[i].y += (CONFIG.bulletSpeed * 0.7) * dt;
      if (enemyBullets[i].y > CONFIG.canvasHeight) enemyBullets.splice(i, 1);
    }

    // invaders horizontal move
    let minX = Infinity;
    let maxX = -Infinity;
    for (const inv of invaders) {
      if (!inv.alive) continue;
      inv.x += invaderDir * invaderSpeed * dt;
      // subtle vertical oscillation
      const t = (performance.now() - waveStartTime) / 1000;
      inv.y = inv.baseY + Math.round(Math.sin(t * CONFIG.invaderOscillationSpeed + inv.x * 0.05) * CONFIG.invaderOscillationPx);
      if (inv.x < minX) minX = inv.x;
      if (inv.x + inv.w > maxX) maxX = inv.x + inv.w;
    }
    if (minX === Infinity) {
      // all cleared: respawn, increase speed slightly
      invaderSpeed += CONFIG.invaderSpeedIncreasePerRowCleared;
      resetWave(invaderSpeed);
    }

    // bounce and step down
    if (minX < 4 || maxX > CONFIG.canvasWidth - 4) {
      invaderDir *= -1;
      for (const inv of invaders) {
        if (!inv.alive) continue;
        inv.baseY += CONFIG.invaderStepDown;
        inv.y = inv.baseY;
        // Check if invaders get too close to player (within 20px)
        if (inv.y + inv.h >= player.y - 20) {
          // Bounce back up instead of game over
          inv.baseY -= CONFIG.invaderStepDown * 2;
          inv.y = inv.baseY;
          // Increase speed when they get close
          invaderSpeed += 5;
        }
      }
    }

    // collisions: bullets vs invaders
    for (let b = bullets.length - 1; b >= 0; b--) {
      const bullet = bullets[b];
      let hit = false;
      for (const inv of invaders) {
        if (!inv.alive) continue;
        if (rectsOverlap(bullet, inv)) {
          inv.alive = false;
          bullets.splice(b, 1);
          score += 10;
          updateScore();
          playEnemyKill(); // Kill sound
          // chance to drop powerup
          if (Math.random() < CONFIG.powerupDropChance) {
            const types = ['rapid','shotgun','shield','speed'];
            const type = types[Math.floor(Math.random() * types.length)];
            powerups.push({ x: inv.x + inv.w / 2 - 3, y: inv.y + inv.h, w: 6, h: 6, type });
          }
          hit = true;
          break;
        }
      }
      if (hit) continue;
    }

    // collisions: enemy bullets vs player
    const playerRect = { x: player.x, y: player.y, w: player.w, h: player.h };
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
      if (rectsOverlap(enemyBullets[i], playerRect)) {
        if (performance.now() < shieldUntil) {
          // consume shield
          enemyBullets.splice(i, 1);
          shieldUntil = 0;
          playEnemyKill();
          continue;
        }
        isGameOver = true;
        break;
      }
    }

    // collisions: player vs powerups
    for (let i = powerups.length - 1; i >= 0; i--) {
      if (rectsOverlap(powerups[i], playerRect)) {
        applyPowerup(powerups[i].type);
        powerups.splice(i, 1);
        updatePowerupsUI();
      }
    }

    // enemy shooting: occasionally fire from random bottom-most invader per column
    maybeEnemyFire(dt);

    // check lose condition: invaders reach player
    for (const inv of invaders) {
      if (!inv.alive) continue;
      if (inv.y + inv.h >= player.y) {
        if (performance.now() < shieldUntil) {
          // consume shield and push invaders back
          shieldUntil = 0;
          for (const v of invaders) {
            if (v.alive) { v.baseY -= CONFIG.invaderStepDown * 2; v.y = v.baseY; }
          }
        } else {
          isGameOver = true;
          break;
        }
      }
    }
  }

  function resetWave(nextSpeed) {
    bullets.length = 0;
    invaders = [];
    invaderDir = 1;
    invaderSpeed = nextSpeed ?? CONFIG.invaderSpeed;
    waveStartTime = performance.now();

    const startX = 16;
    const startY = 80; // much lower so they're much closer to player
    for (let row = 0; row < CONFIG.invaderRows; row++) {
      for (let col = 0; col < CONFIG.invaderCols; col++) {
        invaders.push({
          x: startX + col * CONFIG.invaderHSpacing,
          y: startY + row * CONFIG.invaderVSpacing,
          w: 10,
          h: 8,
          alive: true,
          baseY: startY + row * CONFIG.invaderVSpacing,
        });
      }
    }
  }

  function drawPixelRect(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  function drawRoundPowerup(x, y, w, h, color) {
    const cx = Math.round(x + w/2);
    const cy = Math.round(y + h/2);
    const r = Math.round(w/2);
    
    // Glow effect
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    
    // Reset shadow
    ctx.shadowBlur = 0;

    // Plus sign to indicate power-up
    ctx.fillStyle = COLORS.text;
    // vertical line
    ctx.fillRect(cx - 1, cy - (r - 1), 2, (r - 1) * 2);
    // horizontal line
    ctx.fillRect(cx - (r - 1), cy - 1, (r - 1) * 2, 2);
  }

  function drawPlayer() {
    // simple 16x8 pixel-art ship (blocky)
    const px = Math.round(player.x);
    const py = Math.round(player.y);
    // body
    drawPixelRect(px, py + 4, 12, 3, COLORS.player);
    drawPixelRect(px + 2, py + 2, 8, 2, COLORS.player);
    drawPixelRect(px + 5, py, 2, 2, COLORS.player);
  }

  function drawInvader(inv, color) {
    const x = Math.round(inv.x);
    const y = Math.round(inv.y);
    // simple 10x8 blob
    drawPixelRect(x + 2, y, 6, 1, color);
    drawPixelRect(x + 1, y + 1, 8, 1, color);
    drawPixelRect(x, y + 2, 10, 2, color);
    drawPixelRect(x + 1, y + 4, 8, 1, color);
    drawPixelRect(x + 2, y + 5, 6, 1, color);
  }

  function render() {
    // clear
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight);

    // player
    drawPlayer();
    // shield visual
    if (performance.now() < shieldUntil) {
      ctx.strokeStyle = COLORS.invader3;
      ctx.lineWidth = 1;
      ctx.strokeRect(Math.round(player.x) - 2, Math.round(player.y) - 2, player.w + 4, player.h + 4);
    }

    // bullets
    for (const b of bullets) drawPixelRect(b.x, b.y, b.w, b.h, COLORS.bullet);
    for (const eb of enemyBullets) drawPixelRect(eb.x, eb.y, eb.w, eb.h, COLORS.invader2);

    // powerups
    for (const p of powerups) {
      const color = p.type === 'rapid' ? COLORS.invader2 : p.type === 'shotgun' ? COLORS.invader1 : p.type === 'shield' ? COLORS.invader3 : COLORS.bullet;
      drawRoundPowerup(p.x, p.y, p.w, p.h, color);
    }

    // invaders
    for (const inv of invaders) {
      if (!inv.alive) continue;
      const rowIndex = Math.floor((inv.y - 80) / CONFIG.invaderVSpacing);
      let color;
      if (rowIndex % 3 === 0) color = COLORS.invader1; // pink
      else if (rowIndex % 3 === 1) color = COLORS.invader2; // blue
      else color = COLORS.invader3; // yellow
      drawInvader(inv, color);
    }

    if (isGameOver) {
      drawGameOver();
    }
  }

  let enemyFireTimer = 0;
  function maybeEnemyFire(dt) {
    enemyFireTimer -= dt;
    if (enemyFireTimer > 0) return;
    // attempt fire every ~0.8-1.4s
    enemyFireTimer = 0.8 + Math.random() * 0.6;

    // group invaders by approximate column based on x
    const alive = invaders.filter(v => v.alive);
    if (alive.length === 0) return;
    const columns = new Map();
    for (const inv of alive) {
      const key = Math.round(inv.x / CONFIG.invaderHSpacing);
      const list = columns.get(key) || [];
      list.push(inv);
      columns.set(key, list);
    }
    // pick a random column, then bottom-most in that column
    const keys = Array.from(columns.keys());
    const pickKey = keys[Math.floor(Math.random() * keys.length)];
    const colInvs = columns.get(pickKey) || [];
    if (colInvs.length === 0) return;
    colInvs.sort((a, b) => b.y - a.y);
    const shooter = colInvs[0];
    enemyBullets.push({ x: shooter.x + shooter.w / 2 - 1, y: shooter.y + shooter.h, w: 2, h: 4 });
    playEnemyShoot(); // Enemy shooting sound
  }

  function drawGameOver() {
    ctx.fillStyle = COLORS.text;
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.textBaseline = 'top';
    const msg = 'GAME OVER - Press R to Restart';
    const textW = ctx.measureText(msg).width;
    ctx.fillText(msg, (CONFIG.canvasWidth - textW) / 2, CONFIG.canvasHeight / 2 - 6);
  }

  function applyPowerup(type) {
    const now = performance.now();
    const until = now + CONFIG.powerupDurationSec * 1000;
    if (type === 'rapid') rapidFireUntil = until;
    else if (type === 'shotgun') shotgunUntil = until;
    else if (type === 'shield') shieldUntil = until;
    else if (type === 'speed') speedBoostUntil = until;
  }

  function loop(ts) {
    const dt = Math.min(0.033, (ts - lastTime) / 1000);
    lastTime = ts;
    update(dt);
    render();
    updatePowerupsUI();
    requestAnimationFrame(loop);
  }

  // init
  resetGame();
  requestAnimationFrame((t) => {
    lastTime = t;
    loop(t);
  });
})();


