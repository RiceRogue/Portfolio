/* ── Smiley fields: top hero, physics bottom, margin columns ──── */
(function () {
  const SIZES = [36, 44, 52, 60, 68, 76];

  const DEFAULT_FACE = ':)';
  const EXPRESSIONS  = [
    ':D', ':D', ':D',
    ':P', ':P', ':P',
    ';)', ';)', ';)',
    ':]', ':]',
    ':3', ':3',
    ':O', ':/', ':>', ':S', ':X', '(:', ':B', '8)', 'B)', ':&',
  ];

  const PALETTES = Array.from({ length: 12 }, (_, i) => {
    const h = i * 30, h2 = (h + 25) % 360;
    return {
      bg:    `radial-gradient(circle at 35% 30%, hsl(${h},95%,72%), hsl(${h2},100%,40%))`,
      color: `hsl(${h},80%,15%)`,
      glow:  `hsla(${h},100%,62%,0.6)`,
    };
  });

  /* All interactive circles — reverse iteration = topmost layer gets hover first */
  const allCircles = [];

  /* ── Circle factory ── */
  function makeCircle(size, expr) {
    function fsize(txt) {
      return Math.min(Math.floor(size * 0.462),
                      Math.floor(size * 0.99 / (txt.length * 0.58 + 0.3)));
    }
    function makeFace(txt, cls) {
      const fs    = fsize(txt);
      const eyes  = txt.slice(0, -1);
      const mouth = txt.slice(-1);
      return `<span class="${cls}">` +
             `<span class="face-eyes"  style="font-size:${fs}px">${eyes}</span>` +
             `<span class="face-mouth" style="font-size:${fs}px">${mouth}</span>` +
             `</span>`;
    }
    const palette = PALETTES[Math.floor(Math.random() * PALETTES.length)];
    const circle  = document.createElement('div');
    circle.className = 'smiley-circle';
    circle._palette  = palette;
    circle._size     = size;
    circle.innerHTML = makeFace(DEFAULT_FACE, 'face-default') + makeFace(expr, 'face-hover');
    return circle;
  }


  /* ── Unified full-page physics field ────────────────────────────
     All balls fall from above the page, hit the floor just above
     the footer, bounce with physics, settle, fade, and respawn.
     "Margin balls" (near page edges) bypass content fade zones.
  ─────────────────────────────────────────────────────────────── */
  (function buildUnifiedField() {
    const container = document.getElementById('smiley-bg');
    if (!container) return;

    const COUNT       = 90;
    const GRAVITY     = 0.008;
    const RESTITUTION = 0.88;
    const FRICTION    = 0.995;
    const DAMPING     = 0.9999;
    const LERP        = 0.10; /* opacity lerp speed */

    /* Layout zones — updated on resize */
    let introTop = 0, introBottom = 0;
    let projTop  = 0, projBottom  = 0;
    let contentLeft = 0, contentRight = 0;
    let floorY = 0;

    function updateLayout() {
      const footer   = document.querySelector('.site-footer');
      const intro    = document.querySelector('.intro-section');
      const projects = document.querySelector('.projects-section');
      const pageYOff = window.pageYOffset;

      /* offsetTop is document-relative and scroll-independent */
      floorY = footer ? footer.offsetTop : document.body.scrollHeight - 10;

      if (intro) {
        introTop    = intro.getBoundingClientRect().top    + pageYOff - 20;
        introBottom = intro.getBoundingClientRect().bottom + pageYOff + 30;
      }
      if (projects) {
        projTop    = projects.getBoundingClientRect().top    + pageYOff - 20;
        projBottom = projects.getBoundingClientRect().bottom + pageYOff + 30;
      }

      /* Margin zone: outermost strip of the page (~5% each side min) */
      const gutter     = Math.max(window.innerWidth * 0.04, 20);
      const maxW       = 1500;
      const sidePad    = Math.max(gutter, (window.innerWidth - maxW) / 2);
      contentLeft  = sidePad + 40;
      contentRight = window.innerWidth - sidePad - 40;
    }

    /* Create balls */
    const balls = [];
    for (let i = 0; i < COUNT; i++) {
      const size   = SIZES[Math.floor(Math.random() * SIZES.length)];
      const expr   = EXPRESSIONS[Math.floor(Math.random() * EXPRESSIONS.length)];
      const radius = size / 2;

      const wrapper = document.createElement('div');
      wrapper.className = 'smiley-wrapper';
      wrapper.style.cssText = `width:${size}px;height:${size}px;opacity:0;`;

      const circle = makeCircle(size, expr);
      wrapper.appendChild(circle);
      container.appendChild(wrapper);
      allCircles.push(circle);

      /* Evenly distribute X across page width, then jitter slightly */
      const xSlot = (i + 0.5) / COUNT;
      const xJitter = (Math.random() - 0.5) * (1 / COUNT) * 1.6;
      const xPct = Math.max(3, Math.min(97, (xSlot + xJitter) * 100));
      const ball = {
        x:              xPct / 100 * (window.innerWidth || 1200),
        y:             -radius - i * (3200 / COUNT) - Math.random() * 80, /* even vertical spread */
        vx:             (Math.random() - 0.5) * 0.4,
        vy:             0,
        radius,
        wrapper,
        circle,
        settledAt:      null,
        displayOpacity: 0,
        isMargin:       false,
      };
      circle._ball = ball; /* back-ref for grab/release */
      balls.push(ball);
    }

    updateLayout();
    window.addEventListener('resize', updateLayout);
    window.addEventListener('load',   updateLayout);
    window.addEventListener('scroll', updateLayout, { passive: true });

    function loop(ts) {
      const cW = container.clientWidth || window.innerWidth;

      for (const b of balls) {
        /* Skip grabbed ball — ghost follows cursor instead */
        if (b.circle === grabbed) continue;

        /* ── Physics ── */
        b.vy += GRAVITY;
        b.vx *= DAMPING;
        b.vy *= DAMPING;
        b.x  += b.vx;
        b.y  += b.vy;

        const floor = floorY - b.radius - 14; /* rest 14px above footer border */

        if (b.y >= floor) {
          b.y   = floor;
          b.vy *= -RESTITUTION;
          b.vx *= FRICTION;
          if (Math.abs(b.vy) < 0.04) b.vy = 0;
        }

        if (b.x - b.radius < 0)  { b.x = b.radius;       b.vx *= -0.5; }
        if (b.x + b.radius > cW) { b.x = cW - b.radius;  b.vx *= -0.5; }

        /* ── Margin classification ── */
        b.isMargin = b.x < contentLeft || b.x > contentRight;

        /* ── Settle detection ── */
        const atFloor   = b.y >= floor - 0.5;
        const isSettled = atFloor && Math.abs(b.vy) < 0.01 && Math.abs(b.vx) < 0.03;
        if (isSettled) {
          if (!b.settledAt) b.settledAt = ts;
        } else if (b.settledAt && (Math.abs(b.vy) > 0.04 || Math.abs(b.vx) > 0.06)) {
          b.settledAt = null;
        }

        /* ── Target opacity ── */
        let targetOpacity = 1;

        if (b.y < 0) {
          targetOpacity = 0; /* above page top */
        } else if (b.settledAt) {
          const elapsed = ts - b.settledAt;
          if (elapsed > 1500) {
            targetOpacity = Math.max(0, 1 - (elapsed - 1500) / 2000);
            if (targetOpacity <= 0) {
              /* Respawn — spread Y over 3000px so trickle stays continuous */
              b.x              = b.radius * 2 + Math.random() * (cW - b.radius * 4);
              b.y              = -b.radius - Math.random() * 3000;
              b.vx             = (Math.random() - 0.5) * 0.6;
              b.vy             = 0;
              b.settledAt      = null;
              b.displayOpacity = 0;
              targetOpacity    = 0;
            }
          }
        } else if (!b.isMargin) {
          /* Content ball — transparent in title and gallery zones */
          if ((introTop && b.y > introTop && b.y < introBottom) ||
              (projTop  && b.y > projTop  && b.y < projBottom)) {
            targetOpacity = 0;
          }
        }

        /* ── Opacity lerp (direct for settle timing, smooth lerp otherwise) ── */
        if (b.settledAt && ts - b.settledAt > 1500) {
          b.displayOpacity = targetOpacity; /* linear fade matches elapsed time */
        } else {
          const speed = targetOpacity > b.displayOpacity ? LERP * 1.5 : LERP;
          b.displayOpacity += (targetOpacity - b.displayOpacity) * speed;
        }
        if (b.displayOpacity < 0.005) b.displayOpacity = 0;
        if (b.displayOpacity > 0.995) b.displayOpacity = 1;

        /* ── DOM ── */
        b.wrapper.style.opacity = b.displayOpacity.toFixed(3);
        b.wrapper.style.left    = (b.x - b.radius) + 'px';
        b.wrapper.style.top     = (b.y - b.radius) + 'px';
      }

      /* ── Ball–ball collisions ── */
      for (let i = 0; i < balls.length; i++) {
        for (let j = i + 1; j < balls.length; j++) {
          const a = balls[i], b = balls[j];
          if (a.y < -50 && b.y < -50) continue; /* both off-screen */
          const dx = b.x - a.x, dy = b.y - a.y;
          const dSq = dx * dx + dy * dy;
          const minD = a.radius + b.radius;
          if (dSq < minD * minD && dSq > 0.001) {
            const d  = Math.sqrt(dSq);
            const nx = dx / d, ny = dy / d;
            const ov = (minD - d) * 0.5;
            a.x -= nx * ov; a.y -= ny * ov;
            b.x += nx * ov; b.y += ny * ov;
            const dvn = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
            if (dvn > 0) {
              const imp = dvn * 0.55;
              a.vx -= imp * nx; a.vy -= imp * ny;
              b.vx += imp * nx; b.vy += imp * ny;
            }
          }
        }
      }

      requestAnimationFrame(loop);
    }

    requestAnimationFrame(loop);
  })();

  /* ── Hover helpers ── */
  let lastHovered = null;

  function applyHover(c) {
    const p = c._palette;
    c.classList.add('hovered');
    c.style.background = p.bg;
    c.style.color      = p.color;
    c.style.boxShadow  = `0 0 32px ${p.glow}, 0 0 10px ${p.glow}`;
  }

  function unhover(c) {
    if (!c) return;
    c.classList.remove('hovered');
    c.style.background = '';
    c.style.color      = '';
    c.style.boxShadow  = '';
    if (typeof gsap !== 'undefined') {
      gsap.to(c, { rotateX: 0, rotateY: 0, scale: 1, duration: 1.0,
                   ease: 'elastic.out(1, 0.38)', overwrite: true });
    }
  }

  /* ── Drag state ── */
  let grabbed     = null;
  let dragOffsetX = 0;
  let dragOffsetY = 0;
  let dragPrevX   = 0;
  let dragPrevY   = 0;
  let dragVelX    = 0;
  let dragVelY    = 0;

  function hitTest(cx, cy) {
    for (let i = allCircles.length - 1; i >= 0; i--) {
      const c = allCircles[i];
      if (c === grabbed) continue;
      /* Skip invisible balls */
      const ball = c._ball;
      if (ball && ball.displayOpacity < 0.3) continue;
      const r = c.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const dx = cx - (r.left + r.width  / 2);
      const dy = cy - (r.top  + r.height / 2);
      if (dx * dx + dy * dy <= (r.width / 2) * (r.width / 2)) return c;
    }
    return null;
  }

  function grabBall(circle, cx, cy) {
    const r = circle.getBoundingClientRect();
    const p = circle._palette;

    const ghost = document.createElement('div');
    ghost.className = 'smiley-circle smiley-drag-ghost';
    ghost.style.width      = r.width  + 'px';
    ghost.style.height     = r.height + 'px';
    ghost.style.left       = r.left   + 'px';
    ghost.style.top        = r.top    + 'px';
    ghost.style.background = p.bg;
    ghost.style.color      = p.color;
    ghost.style.boxShadow  = `0 0 32px ${p.glow}, 0 0 10px ${p.glow}`;
    /* Copy inner HTML and let CSS transitions handle the face swap naturally */
    ghost.innerHTML = circle.innerHTML;
    document.body.appendChild(ghost);
    /* Trigger face swap on next frame so CSS transition fires */
    requestAnimationFrame(() => {
      ghost.classList.add('hovered');
    });

    circle.parentElement.style.opacity = '0';
    dragOffsetX = cx - r.left;
    dragOffsetY = cy - r.top;
    dragPrevX   = cx - dragOffsetX;
    dragPrevY   = cy - dragOffsetY;
    dragVelX    = 0;
    dragVelY    = 0;
    circle._ghost = ghost;
    grabbed       = circle;
  }

  function releaseBall() {
    if (!grabbed) return;
    const c     = grabbed;
    const ghost = c._ghost;

    /* Sync physics ball to ghost position so ball continues from where released */
    if (c._ball && ghost) {
      const gr     = ghost.getBoundingClientRect();
      c._ball.x    = gr.left + gr.width  / 2;
      c._ball.y    = gr.top  + gr.height / 2 + window.pageYOffset;
      c._ball.vx   = dragVelX * 0.55; /* carry cursor momentum into physics */
      c._ball.vy   = dragVelY * 0.55;
      c._ball.settledAt      = null;
      c._ball.displayOpacity = 1;
    }

    c.parentElement.style.opacity = '';
    if (ghost) {
      ghost.classList.remove('hovered');
      setTimeout(() => ghost.remove(), 200);
    }
    c._ghost = null;
    grabbed  = null;
  }

  /* ── Global pointer events ── */
  document.addEventListener('pointerdown', e => {
    const target = hitTest(e.clientX, e.clientY);
    if (!target) return;
    e.preventDefault();
    e.stopPropagation();
    grabBall(target, e.clientX, e.clientY);
  }, { capture: true });

  document.addEventListener('pointermove', e => {
    if (grabbed && grabbed._ghost) {
      const newLeft = e.clientX - dragOffsetX;
      const newTop  = e.clientY - dragOffsetY;
      /* Smooth velocity tracking for throw-on-release */
      dragVelX = dragVelX * 0.6 + (newLeft - dragPrevX) * 0.4;
      dragVelY = dragVelY * 0.6 + (newTop  - dragPrevY) * 0.4;
      dragPrevX = newLeft;
      dragPrevY = newTop;
      grabbed._ghost.style.left = newLeft + 'px';
      grabbed._ghost.style.top  = newTop  + 'px';
      return;
    }

    const found = hitTest(e.clientX, e.clientY);
    if (found !== lastHovered) {
      unhover(lastHovered);
      lastHovered = found;
      if (found) applyHover(found);
    }
    if (found && typeof gsap !== 'undefined') {
      const r  = found.getBoundingClientRect();
      const rx =  ((e.clientY - (r.top  + r.height / 2)) / r.height) * 38;
      const ry = -((e.clientX - (r.left + r.width  / 2)) / r.width)  * 38;
      gsap.to(found, { rotateX: rx, rotateY: ry, scale: 1.2, overwrite: true, duration: 0.15 });
    }
  });

  document.addEventListener('pointerup',     () => releaseBall());
  document.addEventListener('pointercancel', () => releaseBall());
  document.addEventListener('pointerleave',  () => { releaseBall(); unhover(lastHovered); lastHovered = null; });
})();

/* ── Animated favicon ────────────────────────────────────────── */
(function () {
  const cvs = document.createElement('canvas');
  cvs.width = cvs.height = 64;
  const ctx = cvs.getContext('2d');

  const link = document.getElementById('favicon-link') ||
               document.querySelector("link[rel*='icon']");
  if (!link) return;

  /* Happy/neutral faces weighted more heavily for the favicon */
  const EXPRS = [
    ':)', ':)', ':)', ':)', ':)', /* most common — classic happy */
    ':D', ':D', ':D',            /* big smile */
    ';)', ';)',                   /* wink */
    ':]', ':]',                  /* content */
    ':3',                        /* cat smile */
    ':P', ':O', ':/', '8)', 'B)', /* occasional variety */
  ];

  function fsize(txt) {
    const s = 64;
    return Math.min(Math.floor(s * 0.462), Math.floor(s * 0.99 / (txt.length * 0.58 + 0.3)));
  }

  let frame   = 0;
  let exprIdx = 0;

  function draw() {
    const hue  = (frame * 1.2) % 360;
    const hue2 = (hue + 25) % 360;

    ctx.clearRect(0, 0, 64, 64);

    /* Circle gradient — matches site ball palette formula */
    const g = ctx.createRadialGradient(22, 19, 2, 32, 32, 32);
    g.addColorStop(0, `hsl(${hue},  95%, 72%)`);
    g.addColorStop(1, `hsl(${hue2}, 100%, 40%)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(32, 32, 31, 0, Math.PI * 2);
    ctx.fill();

    /* Text emoticon rotated 90° CW — matches site CSS rotate(90deg) */
    const expr      = EXPRS[exprIdx];
    const fs        = fsize(expr);
    const faceColor = `hsl(${hue}, 80%, 12%)`;
    ctx.save();
    ctx.translate(32, 32);
    ctx.rotate(Math.PI / 2);
    ctx.font         = `bold ${fs}px "Inter", Arial, sans-serif`;
    ctx.fillStyle    = faceColor;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(expr, 0, 0);
    ctx.restore();

    link.href = cvs.toDataURL();
    frame++;
    /* Cycle expression every 60 frames (~7.5 s at 125 ms interval) */
    if (frame % 60 === 0) exprIdx = (exprIdx + 1) % EXPRS.length;
  }

  draw();
  setInterval(draw, 125);
})();

/* ── Shared utilities ───────────────────────────────────────── */

(function () {
  const track = document.querySelector('.marquee-track');
  if (!track) return;
  Array.from(track.children).forEach(el => track.appendChild(el.cloneNode(true)));
  let x = 0;
  const speed = 1.035;
  function step() {
    x -= speed;
    const half = track.scrollWidth / 2;
    if (Math.abs(x) >= half) x = 0;
    track.style.transform = 'translateX(' + x + 'px)';
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
})();

(function () {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
  els.forEach(el => obs.observe(el));
})();

(function () {
  const overlay = document.getElementById('lightbox');
  const img     = overlay && overlay.querySelector('img');
  const close   = overlay && overlay.querySelector('.lightbox-close');
  if (!overlay || !img) return;
  document.querySelectorAll('.gallery-img-wrap img, .lightbox-trigger').forEach(el => {
    el.addEventListener('click', () => {
      img.src = el.src;
      overlay.style.top    = window.scrollY + 'px';
      overlay.style.height = window.innerHeight + 'px';
      overlay.classList.add('open');
      document.documentElement.style.overflow = 'hidden';
    });
  });
  function closeLb() {
    overlay.classList.remove('open');
    img.src = '';
    overlay.style.top = overlay.style.height = '';
    document.documentElement.style.overflow = '';
  }
  if (close) close.addEventListener('click', closeLb);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeLb(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLb(); });
})();

(function () {
  const stored = localStorage.getItem('theme');
  if (stored) document.documentElement.setAttribute('data-theme', stored);
  const btn = document.getElementById('dark-toggle');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  });
})();

/* ── Cursor trail ───────────────────────────────────────────── */
(function () {
  const TRAIL_FACES = [
    ':)', ':)', ':)', ':)', ':)',
    ':D', ':D', ':D',
    ';)', ';)',
    ':]', ':3', ':P', ':P',
    ':O', ':>', '(:', '8)', 'B)',
  ];
  const TRAIL_COLORS = [
    'hsl(0,90%,58%)',   'hsl(25,95%,55%)',  'hsl(48,100%,50%)',
    'hsl(130,70%,45%)', 'hsl(190,85%,48%)', 'hsl(220,85%,60%)',
    'hsl(270,80%,62%)', 'hsl(310,80%,58%)', 'hsl(340,85%,55%)',
  ];

  /* Minimum px moved before spawning next particle */
  const MIN_DIST = 28;
  let lastX = -9999, lastY = -9999;

  function spawnTrail(x, y) {
    const face  = TRAIL_FACES[Math.floor(Math.random() * TRAIL_FACES.length)];
    const color = TRAIL_COLORS[Math.floor(Math.random() * TRAIL_COLORS.length)];
    const size  = 13 + Math.random() * 14; /* 13–27 px */
    const drift = (Math.random() - 0.5) * 24;

    const el = document.createElement('div');
    el.textContent = face;
    el.style.cssText = [
      'position:fixed',
      `left:${x}px`,
      `top:${y}px`,
      'transform:translate(-50%,-50%) rotate(90deg)',
      `font-size:${size}px`,
      `color:${color}`,
      'pointer-events:none',
      'z-index:99999',
      'user-select:none',
      'will-change:transform,opacity',
      'transition:opacity 0.8s ease, transform 0.8s ease',
      'white-space:nowrap',
      'line-height:1',
      'font-family:monospace,sans-serif',
    ].join(';');

    document.body.appendChild(el);

    /* Kick off fade + float on next frame */
    requestAnimationFrame(() => {
      el.style.opacity = '0';
      el.style.transform = `translate(calc(-50% + ${drift}px), calc(-50% - 28px)) rotate(90deg)`;
    });

    setTimeout(() => el.remove(), 900);
  }

  document.addEventListener('mousemove', e => {
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    if (dx * dx + dy * dy < MIN_DIST * MIN_DIST) return;
    lastX = e.clientX; lastY = e.clientY;
    spawnTrail(e.clientX, e.clientY);
  });
})();

(function () {
  const btn  = document.getElementById('hamburger');
  const menu = document.getElementById('mobile-menu');
  if (!btn || !menu) return;
  btn.addEventListener('click', () => {
    btn.classList.toggle('open');
    menu.classList.toggle('open');
  });
})();
