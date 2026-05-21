// ============================================================
//  HELL GRAVITY DASH — game.js
//  Full game engine: renderer, physics, entities, particles
// ============================================================

'use strict';

// ── CONFIG ───────────────────────────────────────────────────
const CFG = {
  gravity:          0.58,
  terminalVel:      10.5,
  jumpImpulse:      6.8,
  baseSpeed:        4.2,
  speedStep:        0.10,     // added per 10 pts
  maxSpeed:         9.0,
  spawnStart:       1900,     // ms between obstacle pairs at start
  spawnMin:         1050,     // minimum spawn interval
  spawnRamp:        80,       // ms removed per 10 pts
  coinRate:         0.52,
  pupRate:          0.13,
  lavaBorderH:      28,       // pixel height of lava border at ceiling/floor
  hitboxShrink:     5,        // forgiveness: shrink hitbox by this many px
  COLORS: {
    red:    '#ff003c',
    orange: '#ff5e00',
    yellow: '#ffd700',
    cyan:   '#00f2ff',
    purple: '#e100ff',
    dark:   '#0d0614',
  }
};

// ── UTILITIES ────────────────────────────────────────────────
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const rand  = (lo, hi) => lo + Math.random() * (hi - lo);
const now   = () => performance.now();

// ── BACKGROUND LAYER ─────────────────────────────────────────
class Background {
  constructor() {
    this.scrollX = 0;
    this.crystals = [];
    this.stalactites = [];
    this._initCrystals();
    this._initStalactites();
  }

  _initCrystals() {
    for (let i = 0; i < 18; i++) {
      this.crystals.push({
        x: rand(0, 2000),
        y: rand(0.1, 0.85),     // fraction of height
        size: rand(6, 18),
        hue: rand(0, 30),       // red-orange range
        speed: rand(0.3, 0.9),
        phase: rand(0, Math.PI * 2),
      });
    }
  }

  _initStalactites() {
    // ceiling stalactites
    for (let i = 0; i < 14; i++) {
      this.stalactites.push({
        x: rand(0, 2000),
        len: rand(30, 80),
        w: rand(6, 16),
        speed: rand(0.8, 1.5),
        top: true,
      });
    }
    // floor stalagmites
    for (let i = 0; i < 10; i++) {
      this.stalactites.push({
        x: rand(0, 2000),
        len: rand(20, 55),
        w: rand(5, 14),
        speed: rand(0.8, 1.5),
        top: false,
      });
    }
  }

  update(speed, paused) {
    if (!paused) this.scrollX += speed * 0.35;
  }

  render(ctx, W, H, time) {
    // ── deep background gradient ──
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0,   '#070010');
    bg.addColorStop(0.3, '#12052a');
    bg.addColorStop(0.7, '#210818');
    bg.addColorStop(1,   '#3d0808');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // ── distant glow vents (bottom) ──
    const ventGlow = ctx.createRadialGradient(W * 0.25, H, 0, W * 0.25, H, H * 0.55);
    ventGlow.addColorStop(0, 'rgba(255,80,0,.13)');
    ventGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = ventGlow;
    ctx.fillRect(0, 0, W, H);
    const ventGlow2 = ctx.createRadialGradient(W * 0.75, H, 0, W * 0.75, H, H * 0.45);
    ventGlow2.addColorStop(0, 'rgba(255,0,60,.1)');
    ventGlow2.addColorStop(1, 'transparent');
    ctx.fillStyle = ventGlow2;
    ctx.fillRect(0, 0, W, H);

    // ── far mountain silhouettes ──
    ctx.save();
    ctx.fillStyle = 'rgba(18,5,28,.75)';
    ctx.beginPath();
    const mOff = this.scrollX * 0.08;
    for (let x = -80; x < W + 80; x += 55) {
      const mx = ((x - mOff) % (W + 160) + W + 160) % (W + 160) - 80;
      const mh = H * 0.55 + Math.sin((x + mOff) * 0.012) * H * 0.12;
      if (x === -80) ctx.moveTo(mx, H);
      ctx.lineTo(mx, mh);
    }
    ctx.lineTo(W + 80, H);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // ── mid cave shapes ──
    ctx.save();
    ctx.fillStyle = 'rgba(10,3,18,.85)';
    ctx.beginPath();
    const cOff = this.scrollX * 0.2;
    for (let x = -40; x < W + 40; x += 35) {
      const cx = ((x - cOff) % (W + 80) + W + 80) % (W + 80) - 40;
      const ch = H * 0.70 + Math.cos((x + cOff) * 0.018) * H * 0.08;
      if (x === -40) ctx.moveTo(cx, H);
      ctx.lineTo(cx, ch);
    }
    ctx.lineTo(W + 40, H);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // ── stalactites / stalagmites ──
    for (const s of this.stalactites) {
      const sx = ((s.x - this.scrollX * s.speed) % (W + 200) + W + 200) % (W + 200) - 50;
      ctx.save();
      const stGrad = s.top
        ? ctx.createLinearGradient(sx, CFG.lavaBorderH, sx, CFG.lavaBorderH + s.len)
        : ctx.createLinearGradient(sx, H - CFG.lavaBorderH - s.len, sx, H - CFG.lavaBorderH);
      stGrad.addColorStop(0, 'rgba(50,10,10,.9)');
      stGrad.addColorStop(1, 'rgba(160,20,0,.5)');
      ctx.fillStyle = stGrad;
      ctx.shadowBlur = 6;
      ctx.shadowColor = 'rgba(255,40,0,.3)';
      ctx.beginPath();
      if (s.top) {
        ctx.moveTo(sx - s.w * 0.5, CFG.lavaBorderH);
        ctx.lineTo(sx + s.w * 0.5, CFG.lavaBorderH);
        ctx.lineTo(sx, CFG.lavaBorderH + s.len);
      } else {
        ctx.moveTo(sx - s.w * 0.5, H - CFG.lavaBorderH);
        ctx.lineTo(sx + s.w * 0.5, H - CFG.lavaBorderH);
        ctx.lineTo(sx, H - CFG.lavaBorderH - s.len);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // ── glowing crystals ──
    for (const c of this.crystals) {
      const cx = ((c.x - this.scrollX * c.speed) % (W + 100) + W + 100) % (W + 100) - 50;
      const cy = CFG.lavaBorderH + (H - CFG.lavaBorderH * 2) * c.y;
      const pulse = 0.7 + 0.3 * Math.sin(time * 0.002 + c.phase);

      ctx.save();
      ctx.shadowBlur = 14 * pulse;
      ctx.shadowColor = `hsla(${c.hue},100%,60%,.8)`;
      ctx.fillStyle = `hsla(${c.hue},100%,65%,${0.55 * pulse})`;
      ctx.beginPath();
      ctx.moveTo(cx, cy - c.size);
      ctx.lineTo(cx + c.size * 0.4, cy);
      ctx.lineTo(cx, cy + c.size * 0.6);
      ctx.lineTo(cx - c.size * 0.4, cy);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // ── horizontal scan lines (atmospheric) ──
    ctx.save();
    for (let y = CFG.lavaBorderH; y < H - CFG.lavaBorderH; y += 4) {
      ctx.fillStyle = 'rgba(0,0,0,.06)';
      ctx.fillRect(0, y, W, 1);
    }
    ctx.restore();
  }

  renderLavaBorders(ctx, W, H, time) {
    const drawLava = (yBase, flip) => {
      ctx.save();
      ctx.shadowBlur = 20;
      ctx.shadowColor = CFG.COLORS.red;

      const grad = flip
        ? ctx.createLinearGradient(0, yBase - CFG.lavaBorderH, 0, yBase)
        : ctx.createLinearGradient(0, yBase, 0, yBase + CFG.lavaBorderH);
      grad.addColorStop(0, 'rgba(255,60,0,.95)');
      grad.addColorStop(0.5, 'rgba(255,20,0,.8)');
      grad.addColorStop(1, 'rgba(200,0,0,.4)');

      ctx.fillStyle = grad;
      ctx.beginPath();

      if (!flip) {
        // CEILING lava drips down
        ctx.moveTo(0, 0);
        for (let x = 0; x <= W; x += 14) {
          const wave = Math.sin(x * 0.045 + time * 0.0025) * 5 + Math.sin(x * 0.09 - time * 0.003) * 3;
          ctx.lineTo(x, CFG.lavaBorderH + wave);
        }
        ctx.lineTo(W, 0);
      } else {
        // FLOOR lava rises
        ctx.moveTo(0, H);
        for (let x = 0; x <= W; x += 14) {
          const wave = Math.sin(x * 0.04 - time * 0.0028) * 5 + Math.sin(x * 0.08 + time * 0.003) * 3;
          ctx.lineTo(x, H - CFG.lavaBorderH + wave);
        }
        ctx.lineTo(W, H);
      }
      ctx.closePath();
      ctx.fill();

      // Extra bright edge line
      ctx.strokeStyle = 'rgba(255,200,50,.5)';
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#ffaa00';
      ctx.beginPath();
      if (!flip) {
        for (let x = 0; x <= W; x += 14) {
          const wave = Math.sin(x * 0.045 + time * 0.0025) * 5 + Math.sin(x * 0.09 - time * 0.003) * 3;
          if (x === 0) ctx.moveTo(x, CFG.lavaBorderH + wave);
          else         ctx.lineTo(x, CFG.lavaBorderH + wave);
        }
      } else {
        for (let x = 0; x <= W; x += 14) {
          const wave = Math.sin(x * 0.04 - time * 0.0028) * 5 + Math.sin(x * 0.08 + time * 0.003) * 3;
          if (x === 0) ctx.moveTo(x, H - CFG.lavaBorderH + wave);
          else         ctx.lineTo(x, H - CFG.lavaBorderH + wave);
        }
      }
      ctx.stroke();
      ctx.restore();
    };

    drawLava(0,   false); // ceiling
    drawLava(H,   true);  // floor
  }
}

// ── PLAYER (The Lil' Devil) ───────────────────────────────────
class Player {
  constructor(x, y, H) {
    this.x = x;
    this.y = y;
    this.r = 19;           // collision radius
    this.vy = 0;
    this.gDir = 1;         // 1 = down, -1 = up
    this.H = H;

    // Visual state
    this.scaleX = 1; this.scaleY = 1;
    this.wingPhase = 0;
    this.tailPhase = 0;
    this.blinkTimer = 0;
    this.isBlinking = false;
    this.tilt = 0;         // body tilt from velocity
    this.dead = false;
    this.trail = [];       // motion-blur trail positions
  }

  updateH(H) { this.H = H; }

  jump() {
    this.vy = -CFG.jumpImpulse;
    this.scaleX = 0.70; this.scaleY = 1.32;
    gameAudio.playGravityFlip();
  }

  update(dt, speed, keys, W) {
    const tf = dt / 16.667;
    this.wingPhase += 0.015 * tf * (speed / CFG.baseSpeed);
    this.tailPhase += 0.009 * tf;
    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0) {
      this.isBlinking = !this.isBlinking;
      this.blinkTimer = this.isBlinking ? 120 : rand(2500, 4000);
    }

    // Physics
    const gMult = keys.down ? 2.5 : 1.0;
    this.vy += CFG.gravity * gMult * tf;
    this.vy  = clamp(this.vy, -CFG.terminalVel, CFG.terminalVel);
    this.y  += this.vy * tf;

    // Horizontal Movement (A/D or Left/Right Arrow)
    if (keys.left) {
      this.x -= 4.2 * tf;
    }
    if (keys.right) {
      this.x += 4.2 * tf;
    }
    this.x = clamp(this.x, this.r + 20, W * 0.75);

    // Body tilt based on velocity
    this.tilt = clamp(this.vy * 0.06, -0.55, 0.55);

    // Scale recover (squash & stretch)
    this.scaleX += (1 - this.scaleX) * 0.14 * tf;
    this.scaleY += (1 - this.scaleY) * 0.14 * tf;

    // Boundary snap (let Game handle death check, just clamp)
    const minY = CFG.lavaBorderH + this.r;
    const maxY = this.H - CFG.lavaBorderH - this.r;
    if (this.y < minY) { this.y = minY; if (this.vy < 0) { this.vy = 0; this.scaleX = 1.3; this.scaleY = 0.7; } }
    if (this.y > maxY) { this.y = maxY; if (this.vy > 0) { this.vy = 0; this.scaleX = 1.3; this.scaleY = 0.7; } }

    // Motion trail
    this.trail.unshift({ x: this.x, y: this.y });
    if (this.trail.length > 6) this.trail.pop();
  }

  render(ctx, powerUp, time) {
    // Motion trail
    for (let i = 1; i < this.trail.length; i++) {
      const a = (1 - i / this.trail.length) * 0.18;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.shadowBlur = 6;
      ctx.shadowColor = powerUp === 'BOOST' ? CFG.COLORS.yellow : CFG.COLORS.orange;
      ctx.fillStyle = powerUp === 'BOOST' ? CFG.COLORS.yellow : '#ff3000';
      ctx.beginPath();
      ctx.arc(this.trail[i].x, this.trail[i].y, this.r * (1 - i * 0.12), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(this.x, this.y);

    // Flip vertical when gravity is reversed
    if (this.gDir === -1) ctx.scale(1, -1);

    // Body tilt
    ctx.rotate(this.tilt);

    // Squash & stretch
    ctx.scale(this.scaleX, this.scaleY);

    // Glow based on power-up
    if (powerUp) {
      const glowColor = powerUp === 'SHIELD' ? CFG.COLORS.cyan
        : powerUp === 'MAGNET' ? CFG.COLORS.purple
        : CFG.COLORS.yellow;
      ctx.shadowBlur = 24;
      ctx.shadowColor = glowColor;
    } else {
      ctx.shadowBlur = 12;
      ctx.shadowColor = 'rgba(255,30,0,.7)';
    }

    // ── TAIL ──────────────────────────────────────────────────
    const tailWag = Math.sin(this.tailPhase) * 9;
    ctx.strokeStyle = '#cc0000';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-11, 6);
    ctx.quadraticCurveTo(-26, 14 + tailWag, -32, 3 + tailWag * 0.4);
    ctx.stroke();
    // Spade tip
    ctx.fillStyle = '#ff1a1a';
    ctx.shadowBlur = 6;
    ctx.shadowColor = '#ff0000';
    ctx.beginPath();
    ctx.moveTo(-32, 3 + tailWag * 0.4);
    ctx.lineTo(-40, -3 + tailWag * 0.4);
    ctx.lineTo(-36, 9 + tailWag * 0.4);
    ctx.closePath();
    ctx.fill();

    // ── WINGS ─────────────────────────────────────────────────
    const wingY = Math.sin(this.wingPhase) * 18;
    const wingYFast = Math.sin(this.wingPhase * 1.6) * 12;
    ctx.shadowBlur = 0;

    const drawWing = (side) => {
      const s = side; // 1 = left, -1 = right
      ctx.save();
      ctx.translate(-4 * s, -2);

      // Back membrane
      const wGrad = ctx.createLinearGradient(0, 0, -38 * s, -20 + wingY);
      wGrad.addColorStop(0, 'rgba(100,0,0,.9)');
      wGrad.addColorStop(1, 'rgba(180,0,40,.4)');
      ctx.fillStyle = wGrad;
      ctx.strokeStyle = 'rgba(0,0,0,.6)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-5 * s, 2);
      ctx.quadraticCurveTo(-22 * s, -22 + wingY, -38 * s, -8 + wingY);
      ctx.quadraticCurveTo(-28 * s,  -2 + wingY, -20 * s, -10 + wingY);
      ctx.quadraticCurveTo(-16 * s,   8 + wingY, -5 * s, 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Wing bone lines
      ctx.strokeStyle = 'rgba(0,0,0,.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-5 * s, 2);
      ctx.lineTo(-38 * s, -8 + wingY);
      ctx.moveTo(-5 * s, 2);
      ctx.lineTo(-26 * s, -15 + wingYFast);
      ctx.stroke();

      ctx.restore();
    };

    drawWing(1);  // left
    drawWing(-1); // right

    // ── BODY ──────────────────────────────────────────────────
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(255,0,30,.5)';
    const bodyGrad = ctx.createRadialGradient(-5, -6, 3, 0, 0, this.r);
    bodyGrad.addColorStop(0, '#ff6060');
    bodyGrad.addColorStop(0.5, '#dd0000');
    bodyGrad.addColorStop(1, '#7a0000');
    ctx.fillStyle = bodyGrad;
    ctx.strokeStyle = 'rgba(0,0,0,.7)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, this.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // ── BELLY highlight ──
    ctx.fillStyle = 'rgba(255,120,120,.15)';
    ctx.beginPath();
    ctx.ellipse(-3, -4, this.r * 0.55, this.r * 0.4, -0.4, 0, Math.PI * 2);
    ctx.fill();

    // ── HORNS ─────────────────────────────────────────────────
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#ffaa00';
    const drawHorn = (sx) => {
      const hGrad = ctx.createLinearGradient(4 * sx, -10, 14 * sx, -28);
      hGrad.addColorStop(0, '#ffcc00');
      hGrad.addColorStop(1, '#ff8800');
      ctx.fillStyle = hGrad;
      ctx.strokeStyle = 'rgba(0,0,0,.6)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(3 * sx, -12);
      ctx.quadraticCurveTo(10 * sx, -30, 15 * sx, -27);
      ctx.quadraticCurveTo(9 * sx, -16, 10 * sx, -11);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    };
    drawHorn(-1); drawHorn(1);

    // ── EYES ──────────────────────────────────────────────────
    ctx.shadowBlur = 0;
    const drawEye = (ex, ey, tiltSign) => {
      // Sclera
      ctx.fillStyle = '#fff5a0';
      ctx.strokeStyle = 'rgba(0,0,0,.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(ex, ey, 5.5, this.isBlinking ? 1.5 : 8, tiltSign * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Pupil
      if (!this.isBlinking) {
        ctx.fillStyle = '#1a0000';
        ctx.shadowBlur = 4;
        ctx.shadowColor = '#ff0000';
        ctx.beginPath();
        ctx.ellipse(ex + tiltSign * 1, ey + 1.5, 3, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        // Gleam
        ctx.fillStyle = 'rgba(255,255,200,.8)';
        ctx.beginPath();
        ctx.arc(ex + tiltSign * 2 - 1, ey - 2, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    drawEye(-7, -4, -1);
    drawEye( 7, -4,  1);

    // ── EYEBROWS ──────────────────────────────────────────────
    ctx.strokeStyle = '#1a0000';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-13, -13); ctx.lineTo(-2, -10);
    ctx.moveTo( 13, -13); ctx.lineTo( 2, -10);
    ctx.stroke();

    // ── SMILE / FANGS ─────────────────────────────────────────
    ctx.strokeStyle = 'rgba(0,0,0,.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(1, 5, 6, 0.2, Math.PI - 0.6);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(-2,  8); ctx.lineTo(-4, 12); ctx.lineTo(-5,  8);
    ctx.moveTo( 4,  8); ctx.lineTo( 2, 12); ctx.lineTo( 1,  8);
    ctx.closePath();
    ctx.fill();

    // ── CHEEKS (cute blush) ──
    ctx.fillStyle = 'rgba(255,80,80,.25)';
    ctx.beginPath();
    ctx.ellipse(-12, 4, 4, 2.5, 0, 0, Math.PI * 2);
    ctx.ellipse( 12, 4, 4, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── SHIELD AURA ───────────────────────────────────────────
    if (powerUp === 'SHIELD') {
      ctx.strokeStyle = CFG.COLORS.cyan;
      ctx.lineWidth = 3;
      ctx.shadowBlur = 18;
      ctx.shadowColor = CFG.COLORS.cyan;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.arc(0, 0, this.r + 11, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }
}

// ── OBSTACLE ──────────────────────────────────────────────────
class Obstacle {
  constructor(x, y, w, h, isTop) {
    this.x = x; this.y = y;
    this.w = w; this.h = h;
    this.isTop = isTop;
    this.passed = false;
    // Decorative torch flicker
    this.torchPhase = rand(0, Math.PI * 2);
    this.hasChain = Math.random() < 0.4;
    this.chainLinks = Math.floor(rand(3, 7));
  }

  update(dt, speed) {
    this.x -= speed * (dt / 16.667);
    this.torchPhase += 0.1;
  }

  isOffScreen() { return this.x + this.w < -60; }

  // Circle-rect collision (with hitbox shrink for fairness)
  hits(px, py, pr) {
    const sr = pr - CFG.hitboxShrink;
    const bx = this.x + 4;
    const bw = this.w - 8;
    const cx = clamp(px, bx, bx + bw);
    const cy = clamp(py, this.y, this.y + this.h);
    const dx = px - cx, dy = py - cy;
    return dx * dx + dy * dy < sr * sr;
  }

  render(ctx, W, H) {
    ctx.save();

    // ── Body gradient ──
    const grad = ctx.createLinearGradient(this.x, 0, this.x + this.w, 0);
    grad.addColorStop(0, '#0e0520');
    grad.addColorStop(0.4, '#1e0a30');
    grad.addColorStop(1, '#06020e');
    ctx.fillStyle = grad;
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(255,60,0,.4)';
    ctx.strokeStyle = 'rgba(180,40,0,.6)';
    ctx.lineWidth = 2;

    if (this.isTop) {
      ctx.beginPath();
      ctx.rect(this.x, 0, this.w, this.h - 22);
      ctx.fill(); ctx.stroke();
      // Spike tip
      this._drawSpikes(ctx, this.x, this.h - 22, this.w, 22, false);
      // Torch
      this._drawTorch(ctx, this.x + this.w / 2, this.h - 22);
    } else {
      ctx.beginPath();
      ctx.rect(this.x, this.y + 22, this.w, this.h - 22);
      ctx.fill(); ctx.stroke();
      this._drawSpikes(ctx, this.x, this.y, this.w, 22, true);
      this._drawTorch(ctx, this.x + this.w / 2, this.y + 22);
    }

    // ── Stone crack lines ──
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,100,0,.35)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    if (this.isTop) {
      ctx.moveTo(this.x + this.w * 0.3, 10);
      ctx.lineTo(this.x + this.w * 0.45, this.h * 0.45);
      ctx.lineTo(this.x + this.w * 0.25, this.h * 0.7);
    } else {
      ctx.moveTo(this.x + this.w * 0.7, this.y + this.h - 10);
      ctx.lineTo(this.x + this.w * 0.55, this.y + this.h * 0.55);
      ctx.lineTo(this.x + this.w * 0.75, this.y + this.h * 0.3);
    }
    ctx.stroke();

    // ── Chain decorations ──
    if (this.hasChain) {
      this._drawChain(ctx, H);
    }

    ctx.restore();
  }

  _drawSpikes(ctx, x, y, w, h, pointUp) {
    const tipDir = pointUp ? -1 : 1;
    ctx.fillStyle = '#cc2000';
    ctx.strokeStyle = 'rgba(255,80,0,.6)';
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#ff4000';

    ctx.beginPath();
    ctx.moveTo(x - 5, y);
    ctx.lineTo(x + w + 5, y);
    const spikeW = w / 3;
    for (let i = 0; i < 3; i++) {
      const sx = x + i * spikeW + spikeW / 2;
      ctx.lineTo(sx, y + h * tipDir);
    }
    ctx.lineTo(x + w + 5, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  _drawTorch(ctx, tx, ty) {
    const flicker = Math.sin(this.torchPhase) * 3;
    // Handle
    ctx.fillStyle = '#4a2800';
    ctx.beginPath();
    ctx.roundRect(tx - 3, ty - 18, 6, 16, 2);
    ctx.fill();
    // Fire glow
    ctx.shadowBlur = 20 + flicker * 2;
    ctx.shadowColor = '#ff6000';
    // Flame
    const fGrad = ctx.createRadialGradient(tx, ty - 22 + flicker, 0, tx, ty - 22 + flicker, 12);
    fGrad.addColorStop(0, '#fff8c0');
    fGrad.addColorStop(0.4, '#ff8800');
    fGrad.addColorStop(1, 'rgba(255,0,0,0)');
    ctx.fillStyle = fGrad;
    ctx.beginPath();
    ctx.ellipse(tx, ty - 22 + flicker, 6, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  _drawChain(ctx, H) {
    const cx = this.isTop ? this.x + this.w * 0.7 : this.x + this.w * 0.3;
    const startY = this.isTop ? this.h : this.y;
    const endY   = this.isTop ? H / 2 : H / 2;
    const linkH = 14;
    const totalLinks = Math.min(this.chainLinks, Math.abs(endY - startY) / linkH | 0);
    ctx.strokeStyle = 'rgba(140,80,0,.55)';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 4;
    ctx.shadowColor = 'rgba(255,100,0,.3)';
    for (let i = 0; i < totalLinks; i++) {
      const ly = startY + (this.isTop ? 1 : -1) * i * linkH;
      ctx.beginPath();
      ctx.ellipse(cx, ly + linkH / 2, 3.5, linkH / 2, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
  }
}

// ── COIN (Demonic Gold) ───────────────────────────────────────
class Coin {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.r = 11;
    this.phase = rand(0, Math.PI * 2);
  }
  update(dt, speed, px, py, magnet) {
    const tf = dt / 16.667;
    if (magnet) {
      const dx = px - this.x, dy = py - this.y;
      const d  = Math.sqrt(dx * dx + dy * dy);
      if (d < 200) {
        const pull = (10 * (1 - d / 200) + 3) * tf;
        this.x += (dx / d) * pull;
        this.y += (dy / d) * pull;
        return;
      }
    }
    this.x -= speed * tf;
  }
  hits(px, py) {
    const dx = this.x - px, dy = this.y - py;
    return dx * dx + dy * dy < (this.r + 14) * (this.r + 14);
  }
  isOffScreen() { return this.x < -30; }
  render(ctx, time) {
    const spin = Math.abs(Math.sin(time * 0.005 + this.phase));
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(spin, 1);
    ctx.shadowBlur = 14;
    ctx.shadowColor = CFG.COLORS.yellow;
    const g = ctx.createRadialGradient(-3, -3, 2, 0, 0, this.r);
    g.addColorStop(0, '#fff8a0');
    g.addColorStop(0.6, '#ffbb00');
    g.addColorStop(1, '#885000');
    ctx.fillStyle = g;
    ctx.strokeStyle = 'rgba(0,0,0,.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, this.r, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    // Skull symbol
    ctx.strokeStyle = '#775000';
    ctx.lineWidth = 1.2;
    ctx.shadowBlur = 0;
    ctx.beginPath();
    // simple pentagram lines
    ctx.moveTo(-4, -4); ctx.lineTo(4, 4);
    ctx.moveTo(4, -4);  ctx.lineTo(-4, 4);
    ctx.stroke();
    ctx.restore();
  }
}

// ── POWER-UP ──────────────────────────────────────────────────
class PowerUp {
  constructor(x, y, type) {
    this.x = x; this.y = y;
    this.type = type;
    this.r = 15;
    this.phase = rand(0, Math.PI * 2);
  }
  update(dt, speed) {
    this.x -= speed * (dt / 16.667);
    this.phase += 0.004 * (dt / 16.667);
  }
  hits(px, py) {
    const dx = this.x - px, dy = this.y - py;
    return dx * dx + dy * dy < (this.r + 14) * (this.r + 14);
  }
  isOffScreen() { return this.x < -30; }
  get color() {
    return this.type === 'SHIELD' ? CFG.COLORS.cyan
      : this.type === 'MAGNET' ? CFG.COLORS.purple
      : CFG.COLORS.yellow;
  }
  render(ctx, time) {
    const hover = Math.sin(this.phase) * 6;
    ctx.save();
    ctx.translate(this.x, this.y + hover);

    // Orbit ring
    ctx.save();
    ctx.rotate(time * 0.001);
    ctx.strokeStyle = this.color;
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.arc(0, 0, this.r + 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    ctx.shadowBlur = 18;
    ctx.shadowColor = this.color;

    // Glass bubble
    ctx.fillStyle = 'rgba(13,6,20,.75)';
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, this.r, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    // Inner icon
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 0;
    if (this.type === 'SHIELD') {
      ctx.beginPath();
      ctx.moveTo(-7, -7); ctx.lineTo(7, -7);
      ctx.lineTo(7, 1);
      ctx.quadraticCurveTo(7, 9, 0, 11);
      ctx.quadraticCurveTo(-7, 9, -7, 1);
      ctx.closePath(); ctx.fill();
    } else if (this.type === 'MAGNET') {
      ctx.beginPath();
      ctx.arc(0, -2, 6, Math.PI, 0, false);
      ctx.lineTo(6, 6); ctx.lineTo(3, 6); ctx.lineTo(3, -2);
      ctx.arc(0, -2, 3, 0, Math.PI, true);
      ctx.lineTo(-3, 6); ctx.lineTo(-6, 6);
      ctx.closePath(); ctx.fill();
    } else {
      // Fire flame
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.quadraticCurveTo(7, -3, 5, 3);
      ctx.quadraticCurveTo(6, 9, 0, 10);
      ctx.quadraticCurveTo(-6, 9, -5, 3);
      ctx.quadraticCurveTo(-7, -3, 0, -10);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
}

// ── FIREBALL (Horizontal Fire Projectile) ────────────────────
class Fireball {
  constructor(x, y, speedY = 0) {
    this.x = x;
    this.y = y;
    this.r = 11;
    this.speedX = -CFG.baseSpeed * 1.6;
    this.speedY = speedY;
    this.warningTime = 1100; // ms warning phase
    this.warningActive = true;
    this.active = false;
    this.phase = rand(0, Math.PI * 2);
  }
  update(dt, speed) {
    const tf = dt / 16.667;
    if (this.warningActive) {
      this.warningTime -= dt;
      if (this.warningTime <= 0) {
        this.warningActive = false;
        this.active = true;
        gameAudio.playFireballLaunch();
      }
      return;
    }
    // Fly left!
    this.x += this.speedX * tf;
    this.y += this.speedY * tf;
  }
  hits(px, py, pr) {
    if (!this.active) return false;
    const dx = this.x - px, dy = this.y - py;
    return dx * dx + dy * dy < (this.r + pr - 4) * (this.r + pr - 4);
  }
  isOffScreen() { return this.x < -40; }
  render(ctx, W, H, time) {
    if (this.warningActive) {
      // Flashing warning icon on the right edge of screen at fireball height
      const pulse = 0.5 + 0.5 * Math.sin(time * 0.022);
      ctx.save();
      ctx.translate(W - 25, this.y);
      ctx.shadowBlur = 15;
      ctx.shadowColor = CFG.COLORS.red;
      ctx.fillStyle = `rgba(255, 40, 0, ${0.4 + 0.6 * pulse})`;
      ctx.beginPath();
      ctx.moveTo(-10, -10); ctx.lineTo(10, 0); ctx.lineTo(-10, 10);
      ctx.closePath();
      ctx.fill();
      
      // Warning text next to it
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 13px Outfit';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText('🔥 AVISO', -16, 0);
      ctx.restore();
      return;
    }

    // Render flaming projectile
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(time * -0.015 + this.phase);

    ctx.shadowBlur = 24;
    ctx.shadowColor = CFG.COLORS.orange;

    // Inner glow
    const g = ctx.createRadialGradient(-2, -2, 2, 0, 0, this.r);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.3, '#ffdd00');
    g.addColorStop(0.7, '#ff4500');
    g.addColorStop(1, 'rgba(255,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, this.r + 4, 0, Math.PI * 2);
    ctx.fill();

    // Spiky flames
    ctx.fillStyle = '#ff2200';
    for (let i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(-4, -this.r);
      ctx.lineTo(0, -this.r - 8);
      ctx.lineTo(4, -this.r);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }
}

// ── PARTICLE ──────────────────────────────────────────────────
class Particle {
  constructor(x, y, vx, vy, size, color, friction, life, gravity = 0) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.size = size;
    this.color = color;
    this.friction = friction;
    this.life = life;
    this.gravity = gravity;
    this.age = 0;
    this.dead = false;
  }
  update(dt) {
    const tf = dt / 16.667;
    this.age += dt;
    if (this.age >= this.life) { this.dead = true; return; }
    this.vx *= Math.pow(this.friction, tf);
    this.vy *= Math.pow(this.friction, tf);
    this.vy += this.gravity * tf;
    this.x += this.vx * tf;
    this.y += this.vy * tf;
  }
  render(ctx) {
    const alpha = 1 - this.age / this.life;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowBlur = 7;
    ctx.shadowColor = this.color;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, Math.max(0, this.size * (0.5 + 0.5 * (1 - this.age / this.life))), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ── SCORE POPUP ───────────────────────────────────────────────
class ScorePopup {
  constructor(x, y, text, color) {
    this.x = x; this.y = y;
    this.text = text; this.color = color;
    this.age = 0; this.life = 900;
    this.dead = false;
  }
  update(dt) {
    this.age += dt;
    this.y -= 0.7 * (dt / 16.667);
    if (this.age >= this.life) this.dead = true;
  }
  render(ctx) {
    const a = 1 - this.age / this.life;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.font = `bold 16px 'Outfit', sans-serif`;
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 8;
    ctx.shadowColor = this.color;
    ctx.textAlign = 'center';
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}

// ════════════════════════════════════════════════════════════
//  MAIN GAME CLASS
// ════════════════════════════════════════════════════════════
class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx    = this.canvas.getContext('2d');
    this.dpr    = Math.min(window.devicePixelRatio || 1, 2);
    this.W = 0; this.H = 0;

    this.state = 'START'; // START | PLAYING | GAMEOVER
    this.score = 0;
    this.coins = 0;
    this.highScore = +localStorage.getItem('hgd_hs') || 0;
    this.isNewRecord = false;

    this.player    = null;
    this.obstacles = [];
    this.coinObjs  = [];
    this.pupObjs   = [];
    this.particles = [];
    this.popups    = [];

    this.speed     = CFG.baseSpeed;
    this.spawnT    = 0;
    this.shakeT    = 0;
    this.lastTS    = 0;
    this.bgX       = 0;

    this.activePup     = null;
    this.pupTimeLeft   = 0;
    this.pupDuration   = 6000;
    this.isMuted       = localStorage.getItem('hgd_muted') === 'true';
    this.keys          = { up: false, down: false, left: false, right: false };

    this.bg = new Background();

    // UI element refs
    this.$startScreen    = document.getElementById('start-screen');
    this.$gameOverScreen = document.getElementById('game-over-screen');
    this.$hud            = document.getElementById('hud');
    this.$scoreEl        = document.getElementById('current-score');
    this.$coinEl         = document.getElementById('coin-count');
    this.$finalScore     = document.getElementById('final-score');
    this.$finalHS        = document.getElementById('final-highscore');
    this.$finalCoins     = document.getElementById('final-coins');
    this.$startHS        = document.getElementById('start-highscore');
    this.$pupBar         = document.getElementById('powerup-bar');
    this.$pupBarWrap     = document.getElementById('powerup-bar-container');
    this.$goTitle        = document.getElementById('go-title');
    this.$goSub          = document.getElementById('go-subtitle');
    this.$newRecord      = document.getElementById('new-record-badge');
    this.$muteBtn        = document.getElementById('mute-btn');
    this.$muteIcon       = document.getElementById('mute-icon');
    this.$unmuteIcon     = document.getElementById('unmute-icon');

    this.$startHS.textContent = this.highScore;
    gameAudio.setMute(this.isMuted);
    this._updateMuteUI();

    this._bindEvents();
    this._resize();
    window.addEventListener('resize', () => this._resize());

    requestAnimationFrame(ts => this._loop(ts));
  }

  // ── Resize ────────────────────────────────────────────────
  _resize() {
    const p = this.canvas.parentElement;
    this.W = p.clientWidth;
    this.H = p.clientHeight;
    this.canvas.width  = this.W * this.dpr;
    this.canvas.height = this.H * this.dpr;
    this.ctx.scale(this.dpr, this.dpr);
    if (this.player) this.player.updateH(this.H);
  }

  // ── Event bindings ────────────────────────────────────────
  _bindEvents() {
    const triggerJump = () => {
      if (this.state === 'PLAYING') {
        this.player.jump();
        this._burst(this.player.x, this.player.y + this.player.r, '#ff5e00', 6);
      }
      else if (this.state === 'START') { this._startGame(); }
    };
    this.canvas.addEventListener('pointerdown', e => { if (e.button === 0 || e.pointerType === 'touch') triggerJump(); });
    
    window.addEventListener('keydown', e => {
      if (['Space', 'KeyW', 'ArrowUp'].includes(e.code)) {
        e.preventDefault();
        triggerJump();
      }
      if (['KeyS', 'ArrowDown'].includes(e.code)) {
        e.preventDefault();
        this.keys.down = true;
      }
      if (['KeyA', 'ArrowLeft'].includes(e.code)) {
        e.preventDefault();
        this.keys.left = true;
      }
      if (['KeyD', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
        this.keys.right = true;
      }
    });

    window.addEventListener('keyup', e => {
      if (['KeyS', 'ArrowDown'].includes(e.code)) {
        this.keys.down = false;
      }
      if (['KeyA', 'ArrowLeft'].includes(e.code)) {
        this.keys.left = false;
      }
      if (['KeyD', 'ArrowRight'].includes(e.code)) {
        this.keys.right = false;
      }
    });

    document.getElementById('play-btn').addEventListener('click', e => { e.stopPropagation(); this._startGame(); });
    document.getElementById('restart-btn').addEventListener('click', e => { e.stopPropagation(); this._startGame(); });
    this.$muteBtn.addEventListener('click', e => {
      e.stopPropagation();
      this.isMuted = !this.isMuted;
      localStorage.setItem('hgd_muted', this.isMuted);
      gameAudio.setMute(this.isMuted);
      this._updateMuteUI();
    });
  }

  _updateMuteUI() {
    this.$muteIcon.style.display   = this.isMuted ? 'block' : 'none';
    this.$unmuteIcon.style.display = this.isMuted ? 'none'  : 'block';
  }

  // ── Start Game ────────────────────────────────────────────
  _startGame() {
    gameAudio.init();
    gameAudio.resume();
    gameAudio.stopMusic();
    gameAudio.startMusic();

    this.state     = 'PLAYING';
    this.score     = 0;
    this.coins     = 0;
    this.speed     = CFG.baseSpeed;
    this.spawnT    = 0;
    this.shakeT    = 0;
    this.isNewRecord = false;
    this.obstacles = [];
    this.coinObjs  = [];
    this.pupObjs   = [];
    this.particles = [];
    this.popups    = [];
    this.activePup = null;
    this.pupTimeLeft = 0;
    this.keys      = { up: false, down: false, left: false, right: false };
    this.fireballs = [];
    this.fireballSpawnT = 0;

    this.player = new Player(80, this.H / 2, this.H);

    this.$startScreen.classList.remove('active');
    this.$gameOverScreen.classList.remove('active');
    this.$hud.classList.add('active');
    this.$pupBarWrap.style.display = 'none';
    this.$newRecord.classList.remove('visible');
    this._updateHUD();
  }

  // ── Game Over ─────────────────────────────────────────────
  _gameOver() {
    this.state = 'GAMEOVER';
    this.shakeT = 18;
    gameAudio.stopMusic();
    gameAudio.playDeath();

    // Big explosion
    for (let i = 0; i < 55; i++) {
      const a  = Math.random() * Math.PI * 2;
      const sp = rand(2, 10);
      const colors = ['#ff3000','#ff8800','#ffdd00','#ff0066'];
      this.particles.push(new Particle(
        this.player.x, this.player.y,
        Math.cos(a) * sp, Math.sin(a) * sp,
        rand(3, 7),
        colors[i % colors.length],
        0.96, rand(800, 1800), 0.05
      ));
    }

    setTimeout(() => {
      if (this.state !== 'GAMEOVER') return;
      const s = Math.floor(this.score);
      if (s > this.highScore) {
        this.highScore = s;
        localStorage.setItem('hgd_hs', s);
        this.isNewRecord = true;
        this.$newRecord.classList.add('visible');
      }
      this.$finalScore.textContent    = s;
      this.$finalHS.textContent       = this.highScore;
      this.$finalCoins.textContent    = this.coins;

      const phrases = [
        'O Inferno rejeitou você!', 'Satan deu risada!',
        'Flamejado demais!', 'Até o diabo se surpreendeu!',
        'Tente de novo, pecador!'
      ];
      this.$goSub.textContent = phrases[Math.floor(Math.random() * phrases.length)];
      this.$goTitle.textContent = s > 30 ? 'ÉPICO!' : s > 15 ? 'WASTED' : 'AZARADO!';

      this.$hud.classList.remove('active');
      this.$gameOverScreen.classList.add('active');
      this.$startHS.textContent = this.highScore;
    }, 900);
  }

  // ── HUD update ────────────────────────────────────────────
  _updateHUD() {
    this.$scoreEl.textContent = Math.floor(this.score);
    this.$coinEl.textContent  = this.coins;
    const $levelEl = document.getElementById('current-level');
    if ($levelEl) {
      $levelEl.textContent = Math.floor(this.score) + 1;
    }
  }

  // ── Power-up ──────────────────────────────────────────────
  _activatePup(type) {
    this.activePup     = type;
    this.pupTimeLeft   = this.pupDuration;
    this.$pupBarWrap.style.display = 'flex';
    this.$pupBar.style.width = '100%';
    const c = type === 'SHIELD' ? CFG.COLORS.cyan : type === 'MAGNET' ? CFG.COLORS.purple : CFG.COLORS.yellow;
    this.$pupBar.style.background  = c;
    this.$pupBar.style.boxShadow   = `0 0 10px ${c}`;
    gameAudio.playPowerUp();
  }

  _deactivatePup() {
    if (this.activePup === 'BOOST') {
      this.speed = CFG.baseSpeed + (Math.floor(this.score / 10) * CFG.speedStep);
      this.speed = Math.min(this.speed, CFG.maxSpeed);
    }
    this.activePup = null;
    this.$pupBarWrap.style.display = 'none';
  }

  // ── Spawn obstacles ───────────────────────────────────────
  _spawnPair() {
    const gap     = Math.max(130 - Math.floor(this.score / 5) * 3, 95);
    const minH    = 55;
    const maxH    = this.H / 2 - 60;
    const topH    = rand(minH, maxH);
    const botH    = this.H - topH - gap - CFG.lavaBorderH * 2;
    const x       = this.W + 70;
    const obsW    = 58;

    const top = new Obstacle(x, 0, obsW, topH + CFG.lavaBorderH, true);
    const bot = new Obstacle(x, this.H - botH - CFG.lavaBorderH, obsW, botH + CFG.lavaBorderH, false);
    this.obstacles.push(top, bot);

    // Coin in gap
    if (Math.random() < CFG.coinRate) {
      const cy = topH + CFG.lavaBorderH + gap / 2 + rand(-20, 20);
      this.coinObjs.push(new Coin(x + obsW / 2, cy));
    }

    // Power-up (slightly behind)
    if (Math.random() < CFG.pupRate) {
      const types = ['SHIELD','MAGNET','BOOST'];
      const t = types[Math.floor(Math.random() * types.length)];
      const py = topH + CFG.lavaBorderH + gap / 2 + rand(-15, 15);
      this.pupObjs.push(new PowerUp(x + obsW + 100, py, t));
    }
  }

  _spawnFireball() {
    const x = this.W + 50;
    const y = rand(CFG.lavaBorderH + 50, this.H - CFG.lavaBorderH - 50);
    this.fireballs.push(new Fireball(x, y));
  }

  // ── Particles helpers ─────────────────────────────────────
  _emitFireTrail() {
    const p = this.player;
    if (Math.random() > 0.65) return;
    const c = this.activePup === 'BOOST' ? CFG.COLORS.yellow
            : this.activePup === 'SHIELD' ? CFG.COLORS.cyan
            : this.activePup === 'MAGNET' ? CFG.COLORS.purple
            : (Math.random() < 0.5 ? '#ff4500' : '#ff8800');
    const sz = this.activePup === 'BOOST' ? rand(3, 7) : rand(1.5, 3.5);
    this.particles.push(new Particle(
      p.x - 16, p.y + rand(-8, 8),
      -this.speed * rand(0.4, 0.8) - rand(0.5, 2),
      rand(-1.2, 1.2) - p.vy * 0.08,
      sz, c, 0.978, rand(300, 600), 0
    ));
  }

  _emitLavaSparks() {
    if (Math.random() > 0.08) return;
    const fromFloor = Math.random() < 0.5;
    const x = rand(0, this.W);
    const y = fromFloor ? this.H - CFG.lavaBorderH - 4 : CFG.lavaBorderH + 4;
    const vy = fromFloor ? rand(-2, -5) : rand(2, 5);
    this.particles.push(new Particle(
      x, y, rand(-0.8, 0.8), vy,
      rand(1, 2.5), Math.random() < 0.5 ? '#ff5500' : '#ffcc00',
      0.99, rand(600, 1200), fromFloor ? 0.04 : -0.04
    ));
  }

  _burst(x, y, color, n = 12) {
    for (let i = 0; i < n; i++) {
      const a  = Math.random() * Math.PI * 2;
      const sp = rand(1, 5);
      this.particles.push(new Particle(
        x, y, Math.cos(a) * sp, Math.sin(a) * sp,
        rand(1.5, 4), color, 0.96, rand(300, 700)
      ));
    }
  }

  // ── Main loop ─────────────────────────────────────────────
  _loop(ts) {
    if (!this.lastTS) this.lastTS = ts;
    const dt = Math.min(ts - this.lastTS, 50);
    this.lastTS = ts;
    this._update(dt, ts);
    this._render(ts);
    requestAnimationFrame(t => this._loop(t));
  }

  _update(dt, ts) {
    // Screen shake decay
    if (this.shakeT > 0) { this.shakeT -= dt * 0.3; if (this.shakeT < 0) this.shakeT = 0; }

    // Always update particles and popups
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update(dt);
      if (this.particles[i].dead) this.particles.splice(i, 1);
    }
    for (let i = this.popups.length - 1; i >= 0; i--) {
      this.popups[i].update(dt);
      if (this.popups[i].dead) this.popups.splice(i, 1);
    }

    if (this.state === 'START') {
      // Animate devil floating on start screen
      if (!this.player) this.player = new Player(this.W / 2, this.H / 2, this.H);
      this.player.x = this.W / 2;
      this.player.y = this.H * 0.42 + Math.sin(ts * 0.0024) * 18;
      this.player.wingPhase = ts * 0.012;
      this.player.tailPhase = ts * 0.008;
      this._emitLavaSparks();
      this.bg.update(1.5, false);
      return;
    }

    if (this.state === 'GAMEOVER') {
      this._emitLavaSparks();
      this.bg.update(0, true);
      return;
    }

    // ── PLAYING ───────────────────────────────────────────────
    this._emitLavaSparks();

    // Progressive speed
    const targetSpeed = CFG.baseSpeed + (Math.floor(this.score / 10) * CFG.speedStep);
    if (this.activePup !== 'BOOST') {
      this.speed = Math.min(targetSpeed, CFG.maxSpeed);
    }

    // Power-up timer
    if (this.activePup) {
      this.pupTimeLeft -= dt;
      const pct = clamp(this.pupTimeLeft / this.pupDuration, 0, 1);
      this.$pupBar.style.width = (pct * 100) + '%';
      if (this.pupTimeLeft <= 0) this._deactivatePup();
    }

    this.bg.update(this.speed, false);
    this.player.update(dt, this.speed, this.keys, this.W);
    this._emitFireTrail();

    // Score time-increase removed! Points are now obstacle-crossing-based.
    this._updateHUD();

    // Spawn obstacles
    this.spawnT += dt;
    const interval = Math.max(CFG.spawnStart - Math.floor(this.score / 10) * CFG.spawnRamp, CFG.spawnMin);
    if (this.spawnT >= interval) { this.spawnT = 0; this._spawnPair(); }

    // Update & check obstacles
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.update(dt, this.speed);

      if (!obs.passed && obs.x + obs.w < this.player.x) {
        obs.passed = true;
        if (obs.isTop) {
          const oldLevel = Math.floor(this.score) + 1;
          this.score += 1.0;
          const newLevel = Math.floor(this.score) + 1;

          this._updateHUD();
          this.popups.push(new ScorePopup(this.player.x, this.player.y - 30, '+1', '#ffdd00'));

          // Level Up effects!
          if (newLevel > oldLevel) {
            gameAudio.playPowerUp();
            this.popups.push(new ScorePopup(this.W / 2, this.H / 3, `NÍVEL ${newLevel}! 🔥`, '#ff5e00'));
            this._burst(this.W / 2, this.H / 3, '#ffcc00', 20);
          }
        }
      }

      if (obs.hits(this.player.x, this.player.y, this.player.r)) {
        if (this.activePup === 'BOOST') {
          this._burst(obs.x + obs.w / 2, this.player.y, '#ff4400', 14);
          gameAudio.playBoostSmash();
          this.obstacles.splice(i, 1);
          this.shakeT = 4;
        } else if (this.activePup === 'SHIELD') {
          this._deactivatePup();
          this._burst(this.player.x, this.player.y, CFG.COLORS.cyan, 16);
          gameAudio.playShieldBreak();
          this.obstacles.splice(i, 1);
          this.shakeT = 6;
        } else {
          this._gameOver();
          return;
        }
      }
      if (obs.isOffScreen()) this.obstacles.splice(i, 1);
    }

    // Update & check fireballs (horizontal projectiles spawn after Level 20 / Score 20)
    if (this.score >= 20) {
      this.fireballSpawnT += dt;
      const fbInterval = rand(3600, 4800);
      if (this.fireballSpawnT >= fbInterval) {
        this.fireballSpawnT = 0;
        this._spawnFireball();
      }
    }

    for (let i = this.fireballs.length - 1; i >= 0; i--) {
      const fb = this.fireballs[i];
      fb.update(dt, this.speed);

      if (fb.hits(this.player.x, this.player.y, this.player.r)) {
        if (this.activePup === 'BOOST') {
          this._burst(fb.x, fb.y, '#ff8800', 12);
          this.fireballs.splice(i, 1);
          this.shakeT = 4;
        } else if (this.activePup === 'SHIELD') {
          this._deactivatePup();
          this._burst(this.player.x, this.player.y, CFG.COLORS.cyan, 16);
          gameAudio.playShieldBreak();
          this.fireballs.splice(i, 1);
          this.shakeT = 6;
        } else {
          this._gameOver();
          return;
        }
        continue;
      }
      if (fb.isOffScreen()) this.fireballs.splice(i, 1);
    }

    // Update & check coins
    for (let i = this.coinObjs.length - 1; i >= 0; i--) {
      const c = this.coinObjs[i];
      c.update(dt, this.speed, this.player.x, this.player.y, this.activePup === 'MAGNET');
      if (c.hits(this.player.x, this.player.y)) {
        this.coins++;
        this._updateHUD();
        gameAudio.playCoin();
        this._burst(c.x, c.y, CFG.COLORS.yellow, 8);
        this.popups.push(new ScorePopup(c.x, c.y, '💰', CFG.COLORS.yellow));
        this.coinObjs.splice(i, 1);
        continue;
      }
      if (c.isOffScreen()) this.coinObjs.splice(i, 1);
    }

    // Update & check power-ups
    for (let i = this.pupObjs.length - 1; i >= 0; i--) {
      const p = this.pupObjs[i];
      p.update(dt, this.speed);
      if (p.hits(this.player.x, this.player.y)) {
        this._activatePup(p.type);
        this._burst(p.x, p.y, p.color, 14);
        this.pupObjs.splice(i, 1);
        continue;
      }
      if (p.isOffScreen()) this.pupObjs.splice(i, 1);
    }

    // Wall (lava) collision
    const minY = CFG.lavaBorderH + this.player.r;
    const maxY = this.H - CFG.lavaBorderH - this.player.r;
    if (this.player.y <= minY || this.player.y >= maxY) {
      if (this.activePup === 'BOOST') {
        this.player.y = clamp(this.player.y, minY, maxY);
        this.player.vy = 0;
        this.shakeT = 3;
      } else if (this.activePup === 'SHIELD') {
        this._deactivatePup();
        this.player.y = clamp(this.player.y, minY, maxY);
        this.player.vy = 0;
        this._burst(this.player.x, this.player.y, CFG.COLORS.cyan, 12);
        gameAudio.playShieldBreak();
        this.shakeT = 6;
      } else {
        this._gameOver();
      }
    }
  }

  // ── Render ────────────────────────────────────────────────
  _render(ts) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.W, this.H);
    ctx.save();

    // Screen shake
    if (this.shakeT > 0) {
      const mag = this.shakeT * 0.4;
      ctx.translate(rand(-mag, mag), rand(-mag, mag));
    }

    // Background scene
    this.bg.render(ctx, this.W, this.H, ts);

    // Collectibles & power-ups
    for (const c  of this.coinObjs)  c.render(ctx, ts);
    for (const p  of this.pupObjs)   p.render(ctx, ts);

    // Obstacles
    for (const o  of this.obstacles) o.render(ctx, this.W, this.H);

    // Fireballs (horizontal projectiles)
    for (const fb of this.fireballs) fb.render(ctx, this.W, this.H, ts);

    // Particles (under player)
    for (const p  of this.particles) p.render(ctx);

    // Player
    if (this.player && this.state !== 'GAMEOVER') {
      this.player.render(ctx, this.activePup, ts);
    }

    // Lava borders (on top of everything)
    this.bg.renderLavaBorders(ctx, this.W, this.H, ts);

    // Score popups
    for (const pp of this.popups)    pp.render(ctx);

    ctx.restore();
  }
}

// ── Bootstrap ────────────────────────────────────────────────
window.addEventListener('load', () => {
  window.hellGD = new Game();
});
