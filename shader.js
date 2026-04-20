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

    const COUNT        = 80;
    const GRAVITY      = 0.0015;
    const RESTITUTION  = 0.85;
    const FRICTION     = 0.993;
    const DAMPING      = 0.9998; /* keep velocity longer for floatier drift */
    const LERP         = 0.10;
    const MOUSE_R      = 6;   /* px — cursor tip only; ball must be physically touched */
    const MOUSE_PUSH_R = 14;  /* px — tiny soft field just outside cursor */
    const CLICK_R      = 160;

    const _bw = ['Conversation','Connection','Craft','Chaos','Culture','Care'];
    for (let i = _bw.length - 1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); [_bw[i],_bw[j]]=[_bw[j],_bw[i]]; }
    const BUCKET_WORDS = _bw;
    const NUM_BUCKETS  = BUCKET_WORDS.length;
    const BUCKET_H     = 100;
    let   bucketDividers = []; /* x positions of inner walls */
    let nextRespawnTs    = 0;
    const bucketCounts   = new Array(NUM_BUCKETS).fill(0);

    /* Layout zones — updated on resize */
    let introTop = 0, introBottom = 0;
    let projTop  = 0, projBottom  = 0;
    let contentLeft = 0, contentRight = 0;
    let floorY = 0;

    function buildBuckets() {
      container.querySelectorAll('.plink-bkt,.plink-cnt').forEach(el => el.remove());
      bucketDividers = [];
      const W  = window.innerWidth;
      const bW = W / NUM_BUCKETS;
      BUCKET_WORDS.forEach((word, i) => {
        /* bucket wall */
        const el = document.createElement('div');
        el.className = 'plink-bkt';
        el.textContent = word;
        el.style.cssText = `left:${i*bW}px;width:${bW}px;top:${floorY - BUCKET_H}px;height:${BUCKET_H}px;${i===0 ? 'border-left-width:1.5px;' : ''}`;
        container.insertBefore(el, container.firstChild);
        /* counter */
        const cnt = document.createElement('div');
        cnt.className = 'plink-cnt';
        cnt.id = `plink-cnt-${i}`;
        cnt.textContent = '0';
        cnt.style.cssText = `left:${i*bW}px;width:${bW}px;top:${floorY - BUCKET_H - 28}px;`;
        container.insertBefore(cnt, container.firstChild);
        if (i > 0) bucketDividers.push(i * bW);
      });
    }

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

      buildBuckets();
    }

    /* ── Shape profiles (weighted) ── */
    const SHAPE_PROFILES = [
      { w: 50 },                                                                      /* circle */
      { w: 15, br: '26%' },                                                           /* squircle */
      { w: 12, br: '0', cp: 'polygon(50% 0%,100% 38%,82% 100%,18% 100%,0% 38%)' },  /* pentagon */
      { w:  8, br: '0', cp: 'polygon(50% 0%,89% 19%,99% 61%,72% 95%,28% 95%,1% 61%,11% 19%)' }, /* heptagon */
      { w:  8, br: '0', cp: 'polygon(50% 0%,100% 50%,50% 100%,0% 50%)' }, /* diamond */
      { w:  6, br: '0', cp: 'polygon(50% 2%,93% 26%,93% 74%,50% 98%,7% 74%,7% 26%)' }, /* hexagon */
      { w:  5, br: '0', cp: 'polygon(50% 0%,65% 30%,98% 35%,74% 58%,79% 91%,50% 75%,21% 91%,26% 58%,2% 35%,35% 30%)' }, /* 5-point star */
      { w:  3, br: '0', cp: 'polygon(50% 5%,85% 14%,98% 85%,83% 97%,17% 97%,2% 85%,15% 14%)' }, /* rounded triangle */
      { w:  2, br: '0', cp: 'polygon(50% 2%,70% 10%,86% 28%,93% 50%,86% 72%,70% 90%,50% 98%,30% 90%,14% 72%,7% 50%,14% 28%,30% 10%)' }, /* teardrop/egg */
    ];
    const _shapeBag = SHAPE_PROFILES.flatMap((s, i) => Array(s.w).fill(i));

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
      /* Apply shape */
      const sp = SHAPE_PROFILES[_shapeBag[Math.floor(Math.random() * _shapeBag.length)]];
      if (sp.br) circle.style.borderRadius = sp.br;
      if (sp.cp) circle.style.clipPath = sp.cp;
      wrapper.appendChild(circle);
      container.appendChild(wrapper);
      allCircles.push(circle);

      const xPct = 3 + Math.random() * 94;
      const ball = {
        x:              xPct / 100 * (window.innerWidth || 1200),
        y:             -radius - 20,
        vx:             (Math.random() - 0.5) * 0.6,
        vy:             0.55 + Math.random() * 0.35,
        radius,
        wrapper,
        circle,
        settledAt:      null,
        displayOpacity: 0,
        isMargin:       false,
        flashedAt:      null,
        countedBucket:  false,
        enteredAt:      null,
        boosted:        false,   /* true after first mouse touch — extra gravity */
        activateAt:     i * 200, /* ms — one ball released every 200ms */
      };
      circle._ball = ball;
      balls.push(ball);
    }

    updateLayout();
    window.addEventListener('resize', updateLayout);
    window.addEventListener('load',   updateLayout);
    window.addEventListener('scroll', updateLayout, { passive: true });

    function loop(ts) {
      const cW = container.clientWidth || window.innerWidth;

      for (const b of balls) {
        /* ── Activation gate — hold ball above viewport until its turn ── */
        if (b.activateAt && ts < b.activateAt) {
          b.wrapper.style.opacity = '0';
          continue;
        }

        /* ── Physics ── */
        b.vy += GRAVITY + (b.boosted ? 0.005 : 0); /* extra pull after first mouse contact */
        b.vx *= DAMPING;
        b.vy *= DAMPING;
        b.x  += b.vx;
        b.y  += b.vy;

        const floor = floorY - b.radius - 1; /* ~30% tighter gap above footer */

        if (b.y >= floor) {
          b.y   = floor;
          b.vy *= -(b.boosted ? RESTITUTION * 0.28 : RESTITUTION); /* boosted = nearly no bounce */
          b.vx *= b.boosted ? FRICTION * 0.7 : FRICTION;
          if (Math.abs(b.vy) < 0.12) b.vy = 0;
          if (Math.abs(b.vx) < 0.06) b.vx = 0;
        }

        if (b.x - b.radius < 0)  { b.x = b.radius;       b.vx *= -0.5; }
        if (b.x + b.radius > cW) { b.x = cW - b.radius;  b.vx *= -0.5; }

        /* ── Bucket wall collisions ── */
        if (b.y + b.radius > floorY - BUCKET_H) {
          for (const wx of bucketDividers) {
            const dx = b.x - wx;
            const r  = b.radius + 2;
            if (Math.abs(dx) < r) {
              b.x  = wx + (dx >= 0 ? r : -r);
              b.vx *= -RESTITUTION * 0.6;
              b.settledAt = null;
            }
          }
        }

        /* ── Margin classification ── */
        b.isMargin = b.x < contentLeft || b.x > contentRight;

        /* ── Bucket entry count ── */
        if (!b.countedBucket && b.y > floorY - BUCKET_H) {
          const bi = Math.min(NUM_BUCKETS - 1, Math.floor(b.x / (window.innerWidth / NUM_BUCKETS)));
          bucketCounts[bi]++;
          b.countedBucket = true;
          const el = document.getElementById(`plink-cnt-${bi}`);
          if (el) el.textContent = bucketCounts[bi];
        }

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
          targetOpacity = 0;
        } else {
          if (!b.enteredAt) b.enteredAt = ts; /* first frame in viewport */
        }

        if (b.enteredAt && ts - b.enteredAt < 1800) {
          targetOpacity = Math.min(1, (ts - b.enteredAt) / 1800); /* linear fade-in */
        } else if (b.settledAt) {
          const elapsed = ts - b.settledAt;
          if (elapsed > 5000) {
            targetOpacity = Math.max(0, 1 - (elapsed - 5000) / 2500);
            if (targetOpacity <= 0) {
              /* Respawn just above viewport with initial velocity */
              b.x              = b.radius * 2 + Math.random() * (cW - b.radius * 4);
              b.y              = -b.radius - 20;
              b.vx             = (Math.random() - 0.5) * 0.6;
              b.vy             = 0.55 + Math.random() * 0.35;
              b.settledAt      = null;
              nextRespawnTs    = Math.max(ts, nextRespawnTs) + 350;
              b.activateAt     = nextRespawnTs;
              b.boosted        = false;
              b.countedBucket  = false;
              b.enteredAt      = null;
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
        if (b.settledAt && ts - b.settledAt > 5000) {
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

      /* ── Mouse collision + push ── */
      const scrollY = window.pageYOffset;
      for (const b of balls) {
        if (b.displayOpacity < 0.1) continue;
        const dx = b.x - mouseDocX;
        const dy = (b.y - scrollY) - mouseDocY;
        const dSq = dx * dx + dy * dy;
        const hardR = MOUSE_R + b.radius;

        if (dSq < hardR * hardR && dSq > 0.001) {
          /* Lerpy spring push — gradual, not sudden */
          const d  = Math.sqrt(dSq);
          const nx = dx / d, ny = dy / d;
          const overlap  = hardR - d;
          /* Spring force capped per frame so fast cursor sweeps feel smooth */
          const spring = Math.min(overlap * 0.055, 0.9);
          b.vx += nx * spring + mouseVelX * 0.07;
          b.vy += ny * spring + mouseVelY * 0.07;
          if (!b.boosted) { b.vy += 2.5; b.boosted = true; } /* one-time downward kick */
          b.settledAt  = null;
          if (!b.flashedAt || ts - b.flashedAt > 600) {
            b.flashedAt = ts;
            applyHover(b.circle);
            setTimeout(() => unhover(b.circle), 700);
          }
        } else if (dSq < MOUSE_PUSH_R * MOUSE_PUSH_R) {
          const d  = Math.sqrt(dSq);
          const nx = dx / d, ny = dy / d;
          b.vx += nx * (1 - d / MOUSE_PUSH_R) * 0.1;
          b.vy += ny * (1 - d / MOUSE_PUSH_R) * 0.1;
          b.settledAt = null;
        }
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

    /* Click burst — strong radial impulse + face activation */
    window._smileyClickBurst = function(cx, cy) {
      const scrollY = window.pageYOffset;
      const now = performance.now();
      for (const b of balls) {
        if (b.displayOpacity < 0.1) continue;
        const dx = b.x - cx;
        const dy = (b.y - scrollY) - cy;
        const dSq = dx * dx + dy * dy;
        if (dSq < CLICK_R * CLICK_R && dSq > 0.001) {
          const d = Math.sqrt(dSq);
          const nx = dx / d, ny = dy / d;
          const strength = (1 - d / CLICK_R) * 1.8;
          b.vx += nx * strength;
          b.vy += ny * strength - 0.3;
          b.settledAt = null;
          if (!b.flashedAt || now - b.flashedAt > 400) {
            b.flashedAt = now;
            applyHover(b.circle);
            setTimeout(() => unhover(b.circle), 900);
          }
        }
      }
    };

    /* Expose push function for cursor trail to interact with balls */
    window._smileyPush = function(cx, cy) {
      const scrollY = window.pageYOffset;
      const now = performance.now();
      for (const b of balls) {
        if (b.displayOpacity < 0.1) continue;
        const dx = b.x - cx;
        const dy = (b.y - scrollY) - cy;
        const dSq = dx * dx + dy * dy;
        const R = b.radius + 20;
        if (dSq < R * R && dSq > 0.001) {
          const d = Math.sqrt(dSq);
          const nx = dx / d, ny = dy / d;
          b.vx += nx * 1.2;
          b.vy += ny * 1.2 - 0.4;
          b.settledAt = null;
          if (!b.flashedAt || now - b.flashedAt > 600) {
            b.flashedAt = now;
            applyHover(b.circle);
            setTimeout(() => unhover(b.circle), 700);
          }
        }
      }
    };

    requestAnimationFrame(loop);
  })();

  /* ── Hover helpers ── */
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

  /* ── Mouse position (viewport) for physics push ── */
  let mouseDocX = -9999, mouseDocY = -9999;
  let mousePrevDocX = -9999, mousePrevDocY = -9999;
  let mouseVelX = 0, mouseVelY = 0;

  /* ── Click impulse — radial burst from click point ── */
  document.addEventListener('pointerdown', e => {
    if (window._smileyClickBurst) window._smileyClickBurst(e.clientX, e.clientY);
  });

  /* ── Mouse move — track velocity ── */
  document.addEventListener('pointermove', e => {
    mouseVelX = (e.clientX - mousePrevDocX) * 0.4 + mouseVelX * 0.6;
    mouseVelY = (e.clientY - mousePrevDocY) * 0.4 + mouseVelY * 0.6;
    mousePrevDocX = mouseDocX;
    mousePrevDocY = mouseDocY;
    mouseDocX = e.clientX;
    mouseDocY = e.clientY;
  });

  document.addEventListener('pointerleave', () => {
    mouseDocX = -9999; mouseDocY = -9999;
    mouseVelX = 0; mouseVelY = 0;
  });
})();

/* ── Animated favicon ────────────────────────────────────────── */
(function () {
  const S   = 256; /* canvas size — max supported by all modern browsers */
  const C   = S / 2;
  const cvs = document.createElement('canvas');
  cvs.width = cvs.height = S;
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
    return Math.min(Math.floor(S * 0.462), Math.floor(S * 0.99 / (txt.length * 0.58 + 0.3)));
  }

  let frame   = 0;
  let exprIdx = 0;

  function draw() {
    const hue  = (frame * 1.2) % 360;
    const hue2 = (hue + 25) % 360;

    ctx.clearRect(0, 0, S, S);

    /* Circle gradient — matches site ball palette formula */
    const g = ctx.createRadialGradient(C * 0.69, C * 0.59, S * 0.03, C, C, C);
    g.addColorStop(0, `hsl(${hue},  95%, 72%)`);
    g.addColorStop(1, `hsl(${hue2}, 100%, 40%)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(C, C, C - 2, 0, Math.PI * 2);
    ctx.fill();

    /* Text emoticon rotated 90° CW — matches site CSS rotate(90deg) */
    const expr      = EXPRS[exprIdx];
    const fs        = fsize(expr);
    const faceColor = `hsl(${hue}, 80%, 12%)`;
    ctx.save();
    ctx.translate(C, C);
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

/* ── Sun cursor ─────────────────────────────────────────────── */
(function () {
  const sun = document.createElement('div');
  sun.id = 'sun-cursor';
  document.body.appendChild(sun);

  function moveSun(x, y) {
    sun.style.left = (x - 32) + 'px';
    sun.style.top  = (y - 32) + 'px';
  }

  document.addEventListener('pointermove', e => {
    moveSun(e.clientX, e.clientY);
  }, { capture: true, passive: true });

  document.addEventListener('mouseleave', () => {
    sun.style.left = '-100px';
  });

  window.addEventListener('scroll', () => {}, { passive: true }); /* keep compositing layer fresh */
  setInterval(() => {
    if (sun.style.left === '-100px' || sun.style.left === '') return;
    /* force repaint to recover from stacking context issues */
    sun.style.display = 'none';
    void sun.offsetHeight;
    sun.style.display = '';
  }, 3000);

  document.addEventListener('pointerdown', e => {
    const g = document.createElement('div');
    g.className = 'sun-click';
    g.style.left = e.clientX + 'px';
    g.style.top  = e.clientY + 'px';
    document.body.appendChild(g);
    setTimeout(() => g.remove(), 700);
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

/* ── Project card glow on hover ─────────────────────────────── */
(function () {
  document.querySelectorAll('.project-card[data-glow]').forEach(card => {
    const hex = card.getAttribute('data-glow');
    card.addEventListener('mouseenter', () => {
      card.style.background  = `linear-gradient(160deg, var(--card-bg) 20%, ${hex}28 100%)`;
      card.style.boxShadow   = `0 2px 16px ${hex}22`;
      card.style.borderColor = hex + '55';
    });
    card.addEventListener('mouseleave', () => {
      card.style.background  = '';
      card.style.boxShadow   = '';
      card.style.borderColor = '';
    });
  });
})();

/* ── Face mouse trail ────────────────────────────────────────── */
(function () {
  const FACES = [':)', ':D', ':3', ';)', ':]', ':P', '8)', ':>'];
  let lastX = -999, lastY = -999, lastT = 0;
  document.addEventListener('mousemove', e => {
    const now = performance.now();
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    if (dx * dx + dy * dy < 625 && now - lastT < 80) return;
    lastX = e.clientX; lastY = e.clientY; lastT = now;
    const el = document.createElement('div');
    el.className = 'trail-face';
    el.textContent = FACES[Math.floor(Math.random() * FACES.length)];
    el.style.left = e.clientX + 'px';
    el.style.top  = e.clientY + 'px';
    document.body.appendChild(el);
    setTimeout(() => el.parentNode && el.parentNode.removeChild(el), 750);
  }, { capture: true, passive: true });
})();
