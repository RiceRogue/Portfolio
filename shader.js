/* ── Pop sound (Web Audio, synthesized) ─────────────────────── */
const _popAudio = (function () {
  let ctx      = null;
  let lastPop  = 0;
  let gestured = false;
  const api = { muted: false };

  function getCtx() {
    if (!gestured) return null;
    if (!ctx) {
      try { ctx = new (window.AudioContext || window['webkitAudioContext'])(); } catch (_) {}
    }
    return ctx;
  }

  function playNote(pitch) {
    try {
      const ac = getCtx();
      if (!ac || ac.state !== 'running') return;
      const t    = ac.currentTime;
      const osc  = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.type = 'sine';
      const freq = (pitch || 1) * (500 + Math.random() * 200);
      osc.frequency.setValueAtTime(freq * 1.5, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.65, t + 0.09);
      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc.start(t);
      osc.stop(t + 0.16);
    } catch (_) {}
  }

  api.pop = function (pitch) {
    if (api.muted) return;
    const now = performance.now();
    if (now - lastPop < 40) return;
    lastPop = now;
    try {
      const ac = getCtx();
      if (!ac) return;
      if (ac.state === 'suspended') {
        ac.resume().then(() => playNote(pitch));
      } else {
        playNote(pitch);
      }
    } catch (_) {}
  };

  api.unlock = function () {
    gestured = true;
    try { const ac = getCtx(); if (ac && ac.state === 'suspended') ac.resume(); } catch (_) {}
  };

  /* Unlock on every user gesture so the context stays running */
  document.addEventListener('pointerdown', api.unlock, { passive: true });
  document.addEventListener('keydown',     api.unlock, { passive: true });

  /* ── Mute button — injected next to dark-toggle ── */
  function buildMuteBtn() {
    const btn = document.createElement('button');
    btn.className   = 'mute-toggle';
    btn.id          = 'mute-toggle';
    btn.setAttribute('aria-label', 'Toggle sound');
    btn.setAttribute('data-nav-tip', 'Sound on/off');
    btn.innerHTML   =
      `<svg class="icon-sound-on" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
         <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
         <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
         <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
       </svg>
       <svg class="icon-sound-off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
         <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
         <line x1="23" y1="9" x2="17" y2="15"/>
         <line x1="17" y1="9" x2="23" y2="15"/>
       </svg>`;
    btn.addEventListener('click', () => {
      api.muted = !api.muted;
      btn.classList.toggle('muted', api.muted);
    });
    const darkToggle = document.getElementById('dark-toggle');
    if (darkToggle) {
      const grp = document.createElement('div');
      grp.className = 'controls-group';
      darkToggle.parentNode.insertBefore(grp, darkToggle);
      grp.appendChild(darkToggle);
      grp.appendChild(btn);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildMuteBtn);
  } else {
    buildMuteBtn();
  }

  return api;
})();

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
      bg:    `radial-gradient(circle at 32% 25%, rgba(255,255,255,0.44) 0%, transparent 52%), radial-gradient(circle at 32% 28%, hsl(${h},95%,82%) 0%, hsl(${h2},100%,50%) 54%, hsl(${h2},100%,26%) 100%)`,
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

    const isMobile     = window.innerWidth < 600;
    const isTablet     = window.innerWidth < 900;
    const COUNT        = isMobile ? 50 : isTablet ? 80 : 130;
    const BALL_SIZES   = isMobile ? [20, 24, 28, 32] : SIZES;
    const GRAVITY      = 0.0003;  /* near-zero — planet is the dominant attractor */
    const BALL_LIFETIME  = 14000; /* ms before forced respawn */
    const TOUCH_FADEOUT  = 4000;  /* ms after first planet touch → start fading */
    const RESTITUTION  = 0.85;
    const FRICTION     = 0.993;
    const DAMPING      = 0.9998; /* keep velocity longer for floatier drift */
    const LERP         = 0.10;
    const MOUSE_R      = 6;   /* px — cursor tip only; ball must be physically touched */
    const MOUSE_PUSH_R = 14;  /* px — tiny soft field just outside cursor */
    const CLICK_R      = 160;
    const PLANET_G     = 0.007;   /* gravitational pull per frame */

    let nextRespawnTs = 0;

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

      floorY = footer ? footer.offsetTop : document.body.scrollHeight - 10;

      if (intro) {
        introTop    = intro.getBoundingClientRect().top    + pageYOff - 20;
        introBottom = intro.getBoundingClientRect().bottom + pageYOff + 30;
      }
      if (projects) {
        projTop    = projects.getBoundingClientRect().top    + pageYOff - 20;
        projBottom = projects.getBoundingClientRect().bottom + pageYOff + 30;
      }

      const gutter  = Math.max(window.innerWidth * 0.04, 20);
      const maxW    = 1500;
      const sidePad = Math.max(gutter, (window.innerWidth - maxW) / 2);
      contentLeft  = sidePad + 40;
      contentRight = window.innerWidth - sidePad - 40;
    }

    /* ── Shape profiles (weighted) ── */
    const SHAPE_PROFILES = [
      { w: 50 },                                                                      /* circle */
      { w: 15, br: '26%' },                                                           /* squircle */
      { w: 12, br: '0', cp: 'polygon(50% 0%,100% 38%,82% 100%,18% 100%,0% 38%)' },  /* pentagon */
      { w:  8, br: '0', cp: 'polygon(50% 0%,89% 19%,99% 61%,72% 95%,28% 95%,1% 61%,11% 19%)' }, /* heptagon */
      { w:  8, br: '0', cp: 'polygon(50% 0%,100% 50%,50% 100%,0% 50%)' }, /* diamond */
      { w:  6, br: '0', cp: 'polygon(50% 2%,93% 26%,93% 74%,50% 98%,7% 74%,7% 26%)' }, /* hexagon */
      { w:  5, br: '0', cp: 'polygon(50% 0%,69% 23%,98% 35%,81% 60%,79% 91%,50% 83%,21% 91%,19% 60%,2% 35%,31% 23%)' }, /* 5-point star */
      { w:  3, br: '0', cp: 'polygon(50% 5%,85% 14%,98% 85%,83% 97%,17% 97%,2% 85%,15% 14%)' }, /* rounded triangle */
      { w:  2, br: '0', cp: 'polygon(50% 2%,70% 10%,86% 28%,93% 50%,86% 72%,70% 90%,50% 98%,30% 90%,14% 72%,7% 50%,14% 28%,30% 10%)' }, /* teardrop/egg */
    ];
    const _shapeBag = SHAPE_PROFILES.flatMap((s, i) => Array(s.w).fill(i));

    /* Create balls */
    const balls = [];
    for (let i = 0; i < COUNT; i++) {
      const size   = BALL_SIZES[Math.floor(Math.random() * BALL_SIZES.length)];
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

      const ball = {
        x:              window.innerWidth / 2,  /* spawnFromEdge sets real position */
        y:              -radius - 20,
        vx:             0,
        vy:             0,
        radius,
        wrapper,
        circle,
        settledAt:      null,
        displayOpacity: 0,
        isMargin:       false,
        flashedAt:      null,
        spawned:        false,  /* spawnFromEdge called on first activation */
        inViewport:     false,
        birthAt:        null,
        planetTouched:  0,      /* timestamp of first planet contact, 0 = never */
        onPlanet:       false,  /* currently touching planet surface */
        enteredAt:      null,
        boosted:        false,
        activateAt:     i * 200,
      };
      circle._ball = ball;
      balls.push(ball);
    }

    updateLayout();
    window.addEventListener('resize', updateLayout);
    window.addEventListener('scroll', updateLayout, { passive: true });

    /* ── Gravity planet — D3 orthographic canvas globe ── */
    const planetEl = document.createElement('div');
    planetEl.id = 'gravity-planet';

    /* Only activate the D3 globe on the main page (has .projects-grid)
       and only when d3 was loaded. Other pages keep a plain invisible div. */
    const _hasGrid = !!document.querySelector('.projects-grid');
    const _useGlobe = _hasGrid && typeof d3 !== 'undefined';

    /* Continuous hue rotation — full color wheel cycle every ~5 minutes */
    let _gwHue = 0; /* 0–360, increments each globe frame */
    let _gwR = 255, _gwG = 90, _gwB = 20; /* current land RGB, updated from hue */

    if (_useGlobe) {
      const _gc   = document.createElement('canvas');
      _gc.id = 'globe-canvas';
      planetEl.appendChild(_gc);

      const _gCtx  = _gc.getContext('2d');
      const _gProj = d3.geoOrthographic().clipAngle(90);
      const _gPath = d3.geoPath(_gProj, _gCtx);   /* reused every frame */
      const _gGrat = d3.geoGraticule()();           /* precomputed lat/lon grid */
      let   _gLand = null;
      let   _gSz   = 0;
      let   _gRot  = 0;

      /* Resize canvas + reconfigure projection */
      function _gcResize(size) {
        _gSz = size;
        const dpr = window.devicePixelRatio || 1;
        _gc.width  = size * dpr;
        _gc.height = size * dpr;
        _gc.style.width  = size + 'px';
        _gc.style.height = size + 'px';
        _gCtx.setTransform(dpr, 0, 0, dpr, 0, 0); /* crisp on HiDPI */
        _gProj.scale(size * 0.494).translate([size / 2, size / 2]);
      }

      /* Draw one frame */
      function _gcRender() {
        if (!_gSz) return;
        const ctx = _gCtx, sz = _gSz, cx = sz / 2, cy = sz / 2, r = sz * 0.494;

        ctx.clearRect(0, 0, sz, sz);

        /* Ocean — complementary hue, very dark */
        const _oRgb = _hslToRgb((_gwHue + 180) % 360, 60, 7);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgb(${_oRgb[0]},${_oRgb[1]},${_oRgb[2]})`;
        ctx.fill();

        if (_gLand) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.clip(); /* clip land + graticule to sphere boundary */

          /* Graticule — very faint, tinted with current weather color */
          ctx.beginPath();
          _gPath(_gGrat);
          ctx.strokeStyle = `rgba(${_gwR|0},${_gwG|0},${_gwB|0},0.14)`;
          ctx.lineWidth = 0.55;
          ctx.stroke();

          /* Land masses — gradient-tinted fill */
          ctx.beginPath();
          _gLand.features.forEach(f => _gPath(f));
          ctx.fillStyle = `rgba(${_gwR|0},${_gwG|0},${_gwB|0},0.70)`;
          ctx.fill();

          ctx.restore();
        }

        /* Specular highlight — top-left bright spot for sphere depth */
        const spec = ctx.createRadialGradient(
          cx - r * 0.36, cy - r * 0.33, 0,
          cx - r * 0.36, cy - r * 0.33, r * 0.54
        );
        spec.addColorStop(0, 'rgba(255,255,255,0.22)');
        spec.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = spec;
        ctx.fill();

        /* Limb darkening — edges go black */
        const limb = ctx.createRadialGradient(cx, cy, r * 0.50, cx, cy, r);
        limb.addColorStop(0,   'rgba(0,0,0,0)');
        limb.addColorStop(0.6, 'rgba(0,0,0,0.18)');
        limb.addColorStop(1,   'rgba(0,0,0,0.88)');
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = limb;
        ctx.fill();
      }

      /* HSL→RGB helper (used for hue rotation) */
      function _hslToRgb(h, s, l) {
        h /= 360; s /= 100; l /= 100;
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        const hue2 = (t) => {
          if (t < 0) t += 1; if (t > 1) t -= 1;
          if (t < 1/6) return p + (q - p) * 6 * t;
          if (t < 1/2) return q;
          if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
          return p;
        };
        return [Math.round(hue2(h+1/3)*255), Math.round(hue2(h)*255), Math.round(hue2(h-1/3)*255)];
      }

      /* Globe loop — capped at 30fps to save GPU */
      let _glastTs = 0;
      (function _globeLoop(ts) {
        requestAnimationFrame(_globeLoop);
        if (ts - _glastTs < 33) return;
        _glastTs = ts;

        /* Slow auto-spin — full rotation every ~3 minutes */
        _gRot = (_gRot + 0.04) % 360;
        _gProj.rotate([_gRot, -20, 0]);

        /* Continuous hue rotation — full cycle every ~5 minutes at 30fps */
        _gwHue = (_gwHue + 0.033) % 360;
        const rgb  = _hslToRgb(_gwHue, 85, 58);
        _gwR = rgb[0]; _gwG = rgb[1]; _gwB = rgb[2];

        _gcRender();
      })(0);

      /* Lazy-load GeoJSON land shapes (110m = low-res, fast) */
      fetch('https://raw.githubusercontent.com/martynafford/natural-earth-geojson/refs/heads/master/110m/physical/ne_110m_land.json')
        .then(r => r.json())
        .then(data => { _gLand = data; })
        .catch(() => {});

      /* Expose resize so positionPlanet can sync canvas size */
      planetEl._gcResize = _gcResize;
    }

    container.appendChild(planetEl);

    function positionPlanet() {
      const grid = document.querySelector('.projects-grid');
      if (!grid) return;
      const rect = grid.getBoundingClientRect();
      const w    = rect.width;
      const h    = rect.height;
      /* diagonal of the grid = minimum circle containing all 9 cards */
      const size = Math.round(Math.sqrt(w * w + h * h) * 0.94);
      planetEl.style.width  = size + 'px';
      planetEl.style.height = size + 'px';
      const cx = rect.left + window.pageXOffset + w / 2;
      const cy = rect.top  + window.pageYOffset + h / 2;
      planetEl.style.left = Math.round(cx - size / 2) + 'px';
      planetEl.style.top  = Math.round(cy - size / 2) + 'px';
      if (planetEl._gcResize) planetEl._gcResize(size);
    }
    positionPlanet();
    window.addEventListener('resize', positionPlanet);

    /* Spawn a ball from a random page edge, velocity aimed at planet */
    function spawnFromEdge(b, cW) {
      const side  = Math.floor(Math.random() * 4); /* 0=top 1=right 2=bottom 3=left */
      const pageH = Math.max(document.body.scrollHeight || 3000, window.innerHeight * 3);
      let sx, sy;
      switch (side) {
        case 0: sx = Math.random() * cW;     sy = -b.radius - 15;      break;
        case 1: sx = cW + b.radius + 15;     sy = Math.random() * pageH; break;
        case 2: sx = Math.random() * cW;     sy = pageH + b.radius + 15; break;
        case 3: sx = -b.radius - 15;         sy = Math.random() * pageH; break;
      }
      b.x = sx; b.y = sy;

      /* Aim toward planet center (or viewport center as fallback) */
      const pr   = planetEl.getBoundingClientRect();
      const pCX  = pr.width > 0 ? pr.left + pr.width  * 0.5       : cW * 0.5;
      const pCY  = pr.width > 0 ? pr.top  + pr.height * 0.5 + window.pageYOffset : pageH * 0.35;
      const ddx  = pCX - sx, ddy = pCY - sy;
      const dist = Math.sqrt(ddx*ddx + ddy*ddy) || 1;
      const spd  = 1.3 + Math.random() * 1.8;
      b.vx = (ddx / dist) * spd + (Math.random() - 0.5) * 0.6;
      b.vy = (ddy / dist) * spd + (Math.random() - 0.5) * 0.6;

      b.inViewport    = false;
      b.birthAt       = null;
      b.planetTouched = 0;
      b.onPlanet      = false;
      b.settledAt     = null;
      b.enteredAt     = null;
      b.boosted       = false;
      b.displayOpacity = 0;
    }

    let firstFrameTs = null;
    function loop(ts) {
      /* On the very first frame, offset all activateAt times so rain
         starts NOW regardless of how long the page took to load */
      if (firstFrameTs === null) {
        firstFrameTs = ts;
        for (const b of balls) b.activateAt = firstFrameTs + b.activateAt;
      }
      const cW = container.clientWidth || window.innerWidth;
      /* planet position in document coords (recalc each frame — CSS animates it) */
      const _pr      = planetEl.getBoundingClientRect();
      const _pX      = _pr.left + _pr.width  * 0.5;
      const _pY      = _pr.top  + _pr.height * 0.5 + window.pageYOffset;
      const _planetR = _pr.width * 0.5;

      for (const b of balls) {
        /* ── Activation gate ── */
        if (b.activateAt && ts < b.activateAt) {
          b.wrapper.style.opacity = '0';
          continue;
        }
        /* First activation — assign an edge spawn position */
        if (!b.spawned) { spawnFromEdge(b, cW); b.spawned = true; }

        /* Track planet-touch state for this frame */
        const _wasOnPlanet = b.onPlanet;
        b.onPlanet = false;

        /* ── Physics — gentle downward bias, planet dominates ── */
        b.vy += GRAVITY;

        /* ── Planet gravity + elastic bounce ── */
        if (b.displayOpacity > 0.05 || b.spawned) {
          const pdx = _pX - b.x, pdy = _pY - b.y;
          const pd  = Math.sqrt(pdx * pdx + pdy * pdy);
          const influenceR = _planetR * 1.8; /* wider influence zone */
          if (pd > 4 && pd < influenceR) {
            const t = 1 - pd / influenceR;
            const f = PLANET_G * t * t;
            b.vx += (pdx / pd) * f;
            b.vy += (pdy / pd) * f;
          }
          if (pd < _planetR + b.radius && pd > 0.5) {
            const onx = -pdx / pd, ony = -pdy / pd;
            b.x = _pX + onx * (_planetR + b.radius + 1);
            b.y = _pY + ony * (_planetR + b.radius + 1);
            const vDotN = b.vx * onx + b.vy * ony;
            if (vDotN < 0) {
              b.vx -= 2 * vDotN * onx;
              b.vy -= 2 * vDotN * ony;
              b.vx *= 0.94; b.vy *= 0.94;
            }
            b.onPlanet = true;
            if (!b.planetTouched) b.planetTouched = ts;
            b.settledAt = null;
          }
        }

        b.vx *= DAMPING;
        b.vy *= DAMPING;
        b.x  += b.vx;
        b.y  += b.vy;

        /* Soft floor + wall bounds */
        const floor = floorY - b.radius - 1;
        if (b.y >= floor) {
          b.y   = floor;
          b.vy *= -RESTITUTION * 0.7;
          b.vx *= FRICTION;
          if (Math.abs(b.vy) < 0.1) b.vy = 0;
        }
        if (b.x - b.radius < 0)  { b.x = b.radius;      b.vx *= -RESTITUTION * 0.7; }
        if (b.x + b.radius > cW) { b.x = cW - b.radius; b.vx *= -RESTITUTION * 0.7; }

        /* ── Color change on planet contact ── */
        if (b.onPlanet && !_wasOnPlanet) {
          applyHover(b.circle);
          b.flashedAt = ts;
        } else if (!b.onPlanet && _wasOnPlanet) {
          setTimeout(() => unhover(b.circle), 600);
        }

        b.isMargin = b.x < contentLeft || b.x > contentRight;

        /* ── Target opacity + lifetime ── */
        let targetOpacity = 1;

        /* Mark when ball enters visible area */
        if (!b.inViewport) {
          const sy = window.pageYOffset, vh = window.innerHeight;
          if (b.y > sy - 200 && b.y < sy + vh + 200 && b.x > -200 && b.x < cW + 200) {
            b.inViewport = true;
            b.birthAt    = ts;
          }
        }

        if (!b.inViewport) {
          targetOpacity = 0;
        } else {
          if (!b.enteredAt) b.enteredAt = ts;

          /* Fade in over 1s */
          if (ts - b.enteredAt < 1000) {
            targetOpacity = Math.min(1, (ts - b.enteredAt) / 1000);
          }

          /* Lifetime: fade 4s after first planet touch, or after 14s max */
          if (b.birthAt) {
            const alive     = ts - b.birthAt;
            const fadeAfter = b.planetTouched ? (b.planetTouched - b.birthAt + TOUCH_FADEOUT) : BALL_LIFETIME;
            if (alive > fadeAfter) {
              targetOpacity = Math.max(0, 1 - (alive - fadeAfter) / 2000);
              if (alive > fadeAfter + 2000) {
                nextRespawnTs = Math.max(ts, nextRespawnTs) + 300;
                b.activateAt  = nextRespawnTs;
                spawnFromEdge(b, cW);
                targetOpacity = 0;
              }
            }
          }

          /* Invisible in intro zone */
          if (!b.isMargin && introTop && b.y > introTop && b.y < introBottom) {
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
          if (!b.boosted) { b.vy += 2.5; b.boosted = true; }
          b.settledAt  = null;
          if (!b.flashedAt || ts - b.flashedAt > 600) {
            b.flashedAt = ts;
            _popAudio.pop(b.radius / 52);
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
        /* ── Prevent mouse from pushing balls through planet ── */
        if (b.displayOpacity > 0.05) {
          const mpdx = _pX - b.x, mpdy = _pY - b.y;
          const mpd  = Math.sqrt(mpdx * mpdx + mpdy * mpdy);
          if (mpd < _planetR + b.radius && mpd > 0.5) {
            const onx = -mpdx / mpd, ony = -mpdy / mpd;
            b.x = _pX + onx * (_planetR + b.radius + 1);
            b.y = _pY + ony * (_planetR + b.radius + 1);
            const vDotN = b.vx * onx + b.vy * ony;
            if (vDotN < 0) { b.vx -= 2*vDotN*onx; b.vy -= 2*vDotN*ony; }
          }
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

    /* Defer physics until fonts + all page resources are stable.
       On new devices Inter loads from Google Fonts and the footer
       reflows slightly when the font swaps in — this ensures floorY
       is correct before balls start falling. */
    const _domReady = new Promise(res => {
      if (document.readyState === 'complete') res();
      else window.addEventListener('load', res, { once: true });
    });
    Promise.all([_domReady, document.fonts ? document.fonts.ready : Promise.resolve()])
      .then(() => { updateLayout(); requestAnimationFrame(loop); });
  })();

  /* ── Hover helpers ── */
  function applyHover(c) {
    const p = c._palette;
    c.classList.add('hovered');
    c.style.background = p.bg;
    c.style.color      = p.color;
    c.style.boxShadow  = '';
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
  btn.setAttribute('data-nav-tip', 'Dark / Light mode');
  btn.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  });
})();

/* ── Sun cursor ─────────────────────────────────────────────── */
(function () {
  const isTouch = window.matchMedia('(pointer: coarse)').matches;
  const sun = document.createElement('div');
  sun.id = 'sun-cursor';
  document.documentElement.appendChild(sun);

  let sunEnabled = !isTouch;
  let sunVisible = false;
  window._sunEnabled = sunEnabled;

  function moveSun(x, y) {
    if (!sunEnabled) return;
    sun.style.transform = `translate(${x - 33}px, ${y - 33}px)`;
    if (!sunVisible) { sun.style.opacity = '1'; sunVisible = true; }
  }

  if (!isTouch) {
    document.addEventListener('pointermove', e => {
      if (e.pointerType === 'touch') return;
      moveSun(e.clientX, e.clientY);
    }, { capture: true, passive: true });

    document.addEventListener('mouseleave', () => {
      sun.style.opacity = '0';
      sunVisible = false;
    });
    document.addEventListener('mouseenter', () => {
      if (sunEnabled) { sun.style.opacity = '1'; sunVisible = true; }
    });
  }

  document.addEventListener('pointerdown', e => {
    if (!window._sunEnabled) return;
    const g = document.createElement('div');
    g.className = 'sun-click';
    g.style.left = e.clientX + 'px';
    g.style.top  = e.clientY + 'px';
    document.documentElement.appendChild(g);
    setTimeout(() => g.remove(), 700);
  });

  /* ── Sun toggle button in header ── */
  function buildSunToggle() {
    const btn = document.createElement('button');
    btn.className = 'sun-toggle';
    btn.id = 'sun-toggle';
    btn.setAttribute('aria-label', 'Toggle glow effect');
    btn.setAttribute('data-nav-tip', 'Cursor effects');
    btn.innerHTML =
      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
         <path d="M4 4l7.07 17 2.51-7.39L21 11.07z"/>
       </svg>`;
    if (isTouch) btn.style.display = 'none';
    btn.addEventListener('click', () => {
      sunEnabled = !sunEnabled;
      window._sunEnabled = sunEnabled;
      btn.classList.toggle('off', !sunEnabled);
      if (!sunEnabled) {
        sun.style.opacity = '0';
        sunVisible = false;
        document.querySelectorAll('.trail-face').forEach(el => el.remove());
      }
    });
    const grp = document.querySelector('.controls-group');
    if (grp) {
      grp.insertBefore(btn, grp.firstChild);
    } else {
      const darkToggle = document.getElementById('dark-toggle');
      if (darkToggle) darkToggle.insertAdjacentElement('beforebegin', btn);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildSunToggle);
  } else {
    buildSunToggle();
  }
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
  function hexToRgb(h) {
    const s = h.replace('#', '');
    const n = parseInt(s.length === 3
      ? s.split('').map(c => c + c).join('')
      : s, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function blendColor(hex) {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const bg = isDark ? 26 : 255;
    const a = 0.28;
    const [r, g, b] = hexToRgb(hex);
    const ri = Math.round(bg * (1 - a) + r * a);
    const gi = Math.round(bg * (1 - a) + g * a);
    const bi = Math.round(bg * (1 - a) + b * a);
    return `rgb(${ri},${gi},${bi})`;
  }

  document.querySelectorAll('.project-card[data-glow]').forEach(card => {
    const hex = card.getAttribute('data-glow');

    function applyColor() {
      card.style.backgroundColor = blendColor(hex);
      card.style.borderColor     = hex + '88';
    }
    function clearColor() {
      card.style.backgroundColor = '';
      card.style.borderColor     = '';
    }

    card.addEventListener('mouseenter', applyColor);
    card.addEventListener('mouseleave', clearColor);

    /* Touch equivalent */
    card.addEventListener('touchstart', applyColor, { passive: true });
    card.addEventListener('touchend',   clearColor, { passive: true });
    card.addEventListener('touchcancel',clearColor, { passive: true });
  });
})();

/* ── Face mouse trail ────────────────────────────────────────── */
(function () {
  if (window.matchMedia('(pointer: coarse)').matches) return;
  const FACES = [':)', ':D', ':3', ';)', ':]', ':P', '8)', ':>'];
  let lastX = -999, lastY = -999, lastT = 0;
  document.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') return;
    if (!window._sunEnabled) return;
    const now = performance.now();
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    if (dx * dx + dy * dy < 625 && now - lastT < 80) return;
    lastX = e.clientX; lastY = e.clientY; lastT = now;
    const el = document.createElement('div');
    el.className = 'trail-face';
    el.textContent = FACES[Math.floor(Math.random() * FACES.length)];
    el.style.left = e.clientX + 'px';
    el.style.top  = e.clientY + 'px';
    document.documentElement.appendChild(el);
    setTimeout(() => el.parentNode && el.parentNode.removeChild(el), 750);
  }, { capture: true, passive: true });
})();

/* ── Nav tooltips ────────────────────────────────────────────── */
(function () {
  const tips = {
    'href=/':                   'Home',
    'href=/about':              'About Eric',
    'href=/resume':             'View Resume',
    'linkedin.com':             'Connect on LinkedIn',
    'itch.io':                  'Games on Itch.io',
  };
  function apply() {
    document.querySelectorAll('.site-nav a, .site-header .container > a').forEach(a => {
      const href = a.getAttribute('href') || '';
      let label = null;
      if (href === '/')             label = tips['href=/'];
      else if (href === '/about')   label = tips['href=/about'];
      else if (href === '/resume')  label = tips['href=/resume'];
      else if (href.includes('linkedin.com')) label = tips['linkedin.com'];
      else if (href.includes('itch.io'))      label = tips['itch.io'];
      if (label) a.setAttribute('data-nav-tip', label);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply);
  else apply();
})();
