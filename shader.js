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
      return Math.min(Math.floor(size * 0.42),
                      Math.floor(size * 0.9 / (txt.length * 0.58 + 0.3)));
    }
    const palette = PALETTES[Math.floor(Math.random() * PALETTES.length)];
    const circle  = document.createElement('div');
    circle.className = 'smiley-circle';
    circle._palette  = palette;
    circle._size     = size;
    circle.innerHTML =
      `<span class="face-default" style="font-size:${fsize(DEFAULT_FACE)}px">${DEFAULT_FACE}</span>` +
      `<span class="face-hover"   style="font-size:${fsize(expr)}px">${expr}</span>`;
    return circle;
  }

  /* ── CSS-animated field (hero + margin columns) ── */
  function buildCSSField(containerId, wrapperClass, count, durMin, durRange) {
    const bg = document.getElementById(containerId);
    if (!bg) return;
    for (let i = 0; i < count; i++) {
      const size  = SIZES[Math.floor(Math.random() * SIZES.length)];
      const dur   = durMin + Math.random() * durRange;
      const xPct  = 3 + Math.random() * 94;
      const delay = -(Math.random() * dur);
      const expr  = EXPRESSIONS[Math.floor(Math.random() * EXPRESSIONS.length)];

      const wrapper = document.createElement('div');
      wrapper.className = wrapperClass;
      wrapper.style.cssText =
        `left:${xPct.toFixed(1)}%;width:${size}px;height:${size}px;` +
        `--dur:${dur.toFixed(2)}s;--delay:${delay.toFixed(2)}s;`;

      const circle = makeCircle(size, expr);
      wrapper.appendChild(circle);
      bg.appendChild(wrapper);
      allCircles.push(circle);
    }
  }

  buildCSSField('smiley-bg',      'smiley-wrapper', 40, 4, 4);
  buildCSSField('smiley-margins', 'smiley-wrapper', 28, 9, 10);

  /* ── Dynamic hero mask — dims behind intro text, fades at bottom ── */
  (function applyHeroMask() {
    const hero  = document.querySelector('.hero');
    const intro = document.querySelector('.intro-section');
    const bg    = document.getElementById('smiley-bg');
    if (!hero || !intro || !bg) return;

    function update() {
      const hH = hero.offsetHeight;
      const iT = intro.offsetTop;
      const iB = iT + intro.offsetHeight;
      const p  = v => (Math.max(0, Math.min(100, v / hH * 100)).toFixed(1) + '%');
      const mask =
        'linear-gradient(to bottom,' +
        'black 0%,' +
        `black ${p(iT - 50)},` +
        `rgba(0,0,0,0.07) ${p(iT + 40)},` +
        `rgba(0,0,0,0.07) ${p(iB - 20)},` +
        `black ${p(iB + 50)},` +
        'black 83%,' +
        'transparent 100%)';
      bg.style.maskImage = bg.style.webkitMaskImage = mask;
    }

    update();
    window.addEventListener('resize', update);
  })();

  /* ── Physics bottom field ── */
  (function buildPhysicsField() {
    const container = document.getElementById('smiley-bg-bottom');
    if (!container) return;

    const COUNT       = 18;
    const GRAVITY     = 0.28;
    const RESTITUTION = 0.36;
    const FRICTION    = 0.86;
    const DAMPING     = 0.9992;

    const balls = [];

    for (let i = 0; i < COUNT; i++) {
      const size   = SIZES[Math.floor(Math.random() * SIZES.length)];
      const expr   = EXPRESSIONS[Math.floor(Math.random() * EXPRESSIONS.length)];
      const radius = size / 2;

      const wrapper = document.createElement('div');
      wrapper.className = 'smiley-wrapper-bottom';
      wrapper.style.width  = size + 'px';
      wrapper.style.height = size + 'px';

      const circle = makeCircle(size, expr);
      wrapper.appendChild(circle);
      container.appendChild(wrapper);
      allCircles.push(circle);

      balls.push({
        x: 0, y: 0,
        vx: (Math.random() - 0.5) * 3,
        vy: 0,
        radius,
        wrapper,
        circle,
        active:    false,
        spawnAt:   i * 280,
        settledAt: null,
      });
    }

    let startTime = null;

    function loop(ts) {
      if (!startTime) startTime = ts;
      const elapsed = ts - startTime;
      const cW = container.clientWidth  || window.innerWidth;
      const cH = container.clientHeight || window.innerHeight * 0.44;
      const active = [];

      for (const b of balls) {
        if (!b.active && elapsed >= b.spawnAt) {
          b.active = true;
          b.x  = b.radius + Math.random() * (cW - b.radius * 2);
          b.y  = -b.radius - Math.random() * 40;
          b.wrapper.style.opacity = '1';
        }
        if (b.active) active.push(b);
      }

      /* Physics update */
      for (const b of active) {
        b.vy += GRAVITY;
        b.vx *= DAMPING;
        b.vy *= DAMPING;
        b.x  += b.vx;
        b.y  += b.vy;

        const floor = cH - b.radius;

        /* Floor */
        if (b.y >= floor) {
          b.y   = floor;
          b.vy *= -RESTITUTION;
          b.vx *= FRICTION;
          if (Math.abs(b.vy) < 0.8) b.vy = 0;
        }

        /* Walls */
        if (b.x - b.radius < 0)  { b.x = b.radius;       b.vx *= -0.5; }
        if (b.x + b.radius > cW) { b.x = cW - b.radius;  b.vx *= -0.5; }

        /* Settle detection */
        const isSettled = b.y >= floor - 0.5 &&
                          Math.abs(b.vy) < 0.1 &&
                          Math.abs(b.vx) < 0.4;
        if (isSettled) {
          if (!b.settledAt) b.settledAt = ts;
        } else if (b.settledAt && (Math.abs(b.vy) > 0.8 || Math.abs(b.vx) > 1)) {
          b.settledAt = null;
        }

        /* Fade after 1.5s settled, then respawn */
        if (b.settledAt) {
          const elapsed2 = ts - b.settledAt;
          if (elapsed2 > 1500) {
            const fade = Math.min(1, (elapsed2 - 1500) / 2000);
            b.wrapper.style.opacity = (1 - fade).toFixed(3);
            if (fade >= 1) {
              /* Respawn from top */
              b.x = b.radius + Math.random() * (cW - b.radius * 2);
              b.y = -b.radius - Math.random() * 60;
              b.vx = (Math.random() - 0.5) * 3;
              b.vy = 0;
              b.settledAt = null;
              b.wrapper.style.opacity = '0';
              /* Brief delay before becoming visible again */
              const wRef = b.wrapper;
              setTimeout(() => { wRef.style.opacity = '1'; }, 400 + Math.random() * 400);
            }
          }
        }

        /* DOM */
        b.wrapper.style.left = (b.x - b.radius) + 'px';
        b.wrapper.style.top  = (b.y - b.radius) + 'px';
      }

      /* Ball–ball collisions */
      for (let i = 0; i < active.length; i++) {
        for (let j = i + 1; j < active.length; j++) {
          const a = active[i], b = active[j];
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

  function hitTest(cx, cy) {
    for (let i = allCircles.length - 1; i >= 0; i--) {
      const c = allCircles[i];
      const r = c.getBoundingClientRect();
      if (r.width === 0) continue;
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
    dragOffsetX    = cx - r.left;
    dragOffsetY    = cy - r.top;
    circle._ghost  = ghost;
    grabbed        = circle;
  }

  function releaseBall() {
    if (!grabbed) return;
    const c     = grabbed;
    const ghost = c._ghost;
    c.parentElement.style.opacity = '';
    if (ghost) {
      /* Fade face back to default before removing */
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
    grabBall(target, e.clientX, e.clientY);
  });

  document.addEventListener('pointermove', e => {
    if (grabbed && grabbed._ghost) {
      grabbed._ghost.style.left = (e.clientX - dragOffsetX) + 'px';
      grabbed._ghost.style.top  = (e.clientY - dragOffsetY) + 'px';
      if (typeof gsap !== 'undefined') {
        const gr = grabbed._ghost.getBoundingClientRect();
        const rx =  ((e.clientY - (gr.top  + gr.height / 2)) / gr.height) * 38;
        const ry = -((e.clientX - (gr.left + gr.width  / 2)) / gr.width)  * 38;
        gsap.to(grabbed._ghost, { rotateX: rx, rotateY: ry, overwrite: true, duration: 0.15 });
      }
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

  let frame = 0;

  function draw() {
    const hue  = (frame * 1.2) % 360;
    const hue2 = (hue + 25) % 360;
    const wink = (frame % 90) < 8;

    ctx.clearRect(0, 0, 64, 64);

    const g = ctx.createRadialGradient(22, 18, 2, 32, 32, 32);
    g.addColorStop(0, `hsl(${hue},  95%, 72%)`);
    g.addColorStop(1, `hsl(${hue2}, 100%, 40%)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(32, 32, 31, 0, Math.PI * 2);
    ctx.fill();

    const faceColor = `hsl(${hue}, 80%, 12%)`;

    ctx.fillStyle = faceColor;
    ctx.beginPath();
    ctx.arc(22, 26, 5, 0, Math.PI * 2);
    ctx.fill();

    if (wink) {
      ctx.strokeStyle = faceColor;
      ctx.lineWidth   = 3;
      ctx.lineCap     = 'round';
      ctx.beginPath();
      ctx.moveTo(37, 25); ctx.lineTo(47, 27);
      ctx.stroke();
    } else {
      ctx.fillStyle = faceColor;
      ctx.beginPath();
      ctx.arc(42, 26, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = faceColor;
    ctx.lineWidth   = 3.5;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.arc(32, 30, 13, 0.35, Math.PI - 0.35);
    ctx.stroke();

    link.href = cvs.toDataURL();
    frame++;
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

(function () {
  const btn  = document.getElementById('hamburger');
  const menu = document.getElementById('mobile-menu');
  if (!btn || !menu) return;
  btn.addEventListener('click', () => {
    btn.classList.toggle('open');
    menu.classList.toggle('open');
  });
})();
