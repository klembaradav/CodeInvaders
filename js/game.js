(() => {
  // Config
  const CONFIG = {
    canvasWidth: 240,   // internal pixel resolution (scaled up by CSS)
    canvasHeight: 320,
    playerSpeed: 80,    // px per second
    bulletSpeed: 180,
    invaderCols: 8,
    invaderRows: 4,
    invaderHSpacing: 20,
    invaderVSpacing: 16,
    invaderStepDown: 8,
    invaderSpeed: 20,   // horizontal speed (px/s) base
    invaderSpeedIncreasePerRowCleared: 6,
    fireCooldownMs: 220,
  };

  // Colors (pixel-art with UCP palette)
  const COLORS = {
    bg: '#0a0a0a',
    player: '#31B3F2',
    bullet: '#FBB13C',
    invader1: '#F562A5',
    invader2: '#31B3F2',
    text: '#f2f2f2',
  };

  // State
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  canvas.width = CONFIG.canvasWidth;
  canvas.height = CONFIG.canvasHeight;

  // prevent blurring
  ctx.imageSmoothingEnabled = false;

  let lastTime = 0;
  let isGameOver = false;
  let score = 0;
  const scoreEl = document.getElementById('score');

  const keys = new Set();
  let canFireAt = 0;

  const player = {
    w: 12,
    h: 8,
    x: (CONFIG.canvasWidth - 12) / 2,
    y: CONFIG.canvasHeight - 24,
  };

  /** bullets: {x,y,w,h} */
  const bullets = [];

  /** invaders: {x,y,w,h,alive} */
  let invaders = [];
  let invaderDir = 1; // 1 right, -1 left
  let invaderSpeed = CONFIG.invaderSpeed;

  function resetGame() {
    isGameOver = false;
    score = 0;
    updateScore();
    bullets.length = 0;
    invaders = [];
    invaderDir = 1;
    invaderSpeed = CONFIG.invaderSpeed;

    const startX = 20;
    const startY = 40;
    for (let row = 0; row < CONFIG.invaderRows; row++) {
      for (let col = 0; col < CONFIG.invaderCols; col++) {
        invaders.push({
          x: startX + col * CONFIG.invaderHSpacing,
          y: startY + row * CONFIG.invaderVSpacing,
          w: 10,
          h: 8,
          alive: true,
        });
      }
    }
  }

  function updateScore() {
    scoreEl.textContent = String(score);
  }

  // Input
  window.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.add('left');
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.add('right');
    if (e.code === 'Space') keys.add('shoot');
    if (e.code === 'KeyR') {
      resetGame();
    }
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.delete('left');
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.delete('right');
    if (e.code === 'Space') keys.delete('shoot');
  });

  function fireBullet() {
    const now = performance.now();
    if (now < canFireAt) return;
    canFireAt = now + CONFIG.fireCooldownMs;
    bullets.push({ x: player.x + player.w / 2 - 1, y: player.y - 4, w: 2, h: 4 });
  }

  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function update(dt) {
    if (isGameOver) return;

    // player movement
    let dx = 0;
    if (keys.has('left')) dx -= CONFIG.playerSpeed * dt;
    if (keys.has('right')) dx += CONFIG.playerSpeed * dt;
    player.x = Math.max(4, Math.min(CONFIG.canvasWidth - player.w - 4, player.x + dx));

    if (keys.has('shoot')) fireBullet();

    // bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
      bullets[i].y -= CONFIG.bulletSpeed * dt;
      if (bullets[i].y + bullets[i].h < 0) bullets.splice(i, 1);
    }

    // invaders horizontal move
    let minX = Infinity;
    let maxX = -Infinity;
    for (const inv of invaders) {
      if (!inv.alive) continue;
      inv.x += invaderDir * invaderSpeed * dt;
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
        inv.y += CONFIG.invaderStepDown;
        if (inv.y + inv.h >= player.y) {
          isGameOver = true;
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
          hit = true;
          break;
        }
      }
      if (hit) continue;
    }

    // check lose condition: invaders reach bottom
    for (const inv of invaders) {
      if (!inv.alive) continue;
      if (inv.y + inv.h >= player.y) {
        isGameOver = true;
        break;
      }
    }
  }

  function resetWave(nextSpeed) {
    bullets.length = 0;
    invaders = [];
    invaderDir = 1;
    invaderSpeed = nextSpeed ?? CONFIG.invaderSpeed;

    const startX = 20;
    const startY = 40;
    for (let row = 0; row < CONFIG.invaderRows; row++) {
      for (let col = 0; col < CONFIG.invaderCols; col++) {
        invaders.push({
          x: startX + col * CONFIG.invaderHSpacing,
          y: startY + row * CONFIG.invaderVSpacing,
          w: 10,
          h: 8,
          alive: true,
        });
      }
    }
  }

  function drawPixelRect(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
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

    // bullets
    for (const b of bullets) drawPixelRect(b.x, b.y, b.w, b.h, COLORS.bullet);

    // invaders
    for (const inv of invaders) {
      if (!inv.alive) continue;
      const color = ((Math.floor(inv.y / CONFIG.invaderVSpacing)) % 2 === 0) ? COLORS.invader1 : COLORS.invader2;
      drawInvader(inv, color);
    }

    if (isGameOver) {
      drawGameOver();
    }
  }

  function drawGameOver() {
    ctx.fillStyle = COLORS.text;
    ctx.font = '10px monospace';
    ctx.textBaseline = 'top';
    const msg = 'GAME OVER - Press R to Restart';
    const textW = ctx.measureText(msg).width;
    ctx.fillText(msg, (CONFIG.canvasWidth - textW) / 2, CONFIG.canvasHeight / 2 - 6);
  }

  function loop(ts) {
    const dt = Math.min(0.033, (ts - lastTime) / 1000);
    lastTime = ts;
    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  // init
  resetGame();
  requestAnimationFrame((t) => {
    lastTime = t;
    loop(t);
  });
})();


