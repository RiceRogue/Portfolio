/* ── Falling interactive smiley field ───────────────────────── */
(function () {
  const bg = document.getElementById('smiley-bg');
  if (!bg) return;

  const COUNT = 40;
  const SIZES = [36, 44, 52, 60, 68, 76];

  /* ── Default face: upright :) ─── */
  const EN = `<circle cx="34" cy="34" r="6" fill="currentColor"/><circle cx="66" cy="34" r="6" fill="currentColor"/>`;
  const DEFAULT_FACE = EN + `<path d="M28 60 Q50 76 72 60" stroke="currentColor" stroke-width="5.5" fill="none" stroke-linecap="round"/>`;

  /* ── Hover expressions ─── */
  const EXPRESSIONS = [
    /* :D  — open wide mouth, taller D */
    EN + `<path d="M14 58 Q50 98 86 58 Q50 40 14 58 Z" fill="currentColor"/>`,

    /* >< — X eyes + grin */
    `<path d="M22 24 L42 44 M42 24 L22 44" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>
     <path d="M56 24 L76 44 M76 24 L56 44" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>
     <path d="M28 62 Q50 78 72 62" stroke="currentColor" stroke-width="5.5" fill="none" stroke-linecap="round"/>`,

    /* ^_^ — arch eyes + big smile */
    `<path d="M22 38 Q31 24 40 38" stroke="currentColor" stroke-width="5.5" fill="none" stroke-linecap="round"/>
     <path d="M58 38 Q67 24 76 38" stroke="currentColor" stroke-width="5.5" fill="none" stroke-linecap="round"/>
     <path d="M14 58 Q50 98 86 58 Q50 40 14 58 Z" fill="currentColor"/>`,

    /* O_O — wide eyes + o mouth (surprised) */
    `<circle cx="34" cy="34" r="12" fill="currentColor"/>
     <circle cx="66" cy="34" r="12" fill="currentColor"/>
     <ellipse cx="50" cy="70" rx="10" ry="9" fill="currentColor"/>`,

    /* >:) — angry brows + smirk */
    `<path d="M20 24 L42 32" stroke="currentColor" stroke-width="4.5" stroke-linecap="round"/>
     <path d="M56 32 L78 24" stroke="currentColor" stroke-width="4.5" stroke-linecap="round"/>
     ${EN}
     <path d="M30 62 Q55 76 72 60" stroke="currentColor" stroke-width="5.5" fill="none" stroke-linecap="round"/>`,

    /* :P — tongue out */
    EN +
    `<path d="M28 60 Q50 74 72 60" stroke="currentColor" stroke-width="5.5" fill="none" stroke-linecap="round"/>
     <path d="M40 68 Q50 90 60 68 Q56 82 44 82 Z" fill="currentColor"/>`,

    /* uwu — U eyes + w mouth */
    `<path d="M22 36 Q31 50 40 36" stroke="currentColor" stroke-width="5.5" fill="none" stroke-linecap="round"/>
     <path d="M58 36 Q67 50 76 36" stroke="currentColor" stroke-width="5.5" fill="none" stroke-linecap="round"/>
     <path d="M30 64 Q38 76 46 64 Q54 76 62 64 Q70 76 78 64" stroke="currentColor" stroke-width="4.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,

    /* -_- — deadpan line eyes + flat mouth */
    `<path d="M20 36 L44 36" stroke="currentColor" stroke-width="5.5" stroke-linecap="round"/>
     <path d="M54 36 L78 36" stroke="currentColor" stroke-width="5.5" stroke-linecap="round"/>
     <path d="M28 66 L72 66" stroke="currentColor" stroke-width="5.5" stroke-linecap="round"/>`,
  ];

  /* ── Full-spectrum HSL palette (12 hues) ─── */
  const PALETTES = Array.from({ length: 12 }, (_, i) => {
    const h = i * 30, h2 = (h + 25) % 360;
    return {
      bg:   `radial-gradient(circle at 35% 30%, hsl(${h},95%,72%), hsl(${h2},100%,40%))`,
      color: `hsl(${h},80%,15%)`,
      glow:  `hsla(${h},100%,62%,0.6)`,
    };
  });

  const circles = [];

  for (let i = 0; i < COUNT; i++) {
    const size    = SIZES[Math.floor(Math.random() * SIZES.length)];
    const dur     = 7 + Math.random() * 8;
    const xPct    = 3 + Math.random() * 94;
    const delay   = -(Math.random() * dur);
    const palette = PALETTES[Math.floor(Math.random() * PALETTES.length)];
    const expr    = EXPRESSIONS[Math.floor(Math.random() * EXPRESSIONS.length)];

    const wrapper = document.createElement('div');
    wrapper.className = 'smiley-wrapper';
    wrapper.style.cssText = `left:${xPct.toFixed(1)}%;width:${size}px;height:${size}px;--dur:${dur.toFixed(2)}s;--delay:${delay.toFixed(2)}s;`;

    const circle = document.createElement('div');
    circle.className = 'smiley-circle';
    circle._palette = palette;
    circle.innerHTML = `
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <g class="face-default">${DEFAULT_FACE}</g>
        <g class="face-hover">${expr}</g>
      </svg>`;

    wrapper.appendChild(circle);
    bg.appendChild(wrapper);
    circles.push(circle);
  }

  /* ── Global hit-test hover ─── */
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
      gsap.to(c, { rotateX: 0, rotateY: 0, scale: 1, duration: 1.0, ease: 'elastic.out(1, 0.38)', overwrite: true });
    }
  }

  document.addEventListener('pointermove', e => {
    let found = null;
    for (const c of circles) {
      const r  = c.getBoundingClientRect();
      if (r.width === 0) continue;
      const dx = e.clientX - (r.left + r.width  / 2);
      const dy = e.clientY - (r.top  + r.height / 2);
      if (dx * dx + dy * dy <= (r.width / 2) * (r.width / 2)) { found = c; break; }
    }
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

  document.addEventListener('pointerleave', () => { unhover(lastHovered); lastHovered = null; });
})();

/* ── Shared utilities ───────────────────────────────────────── */

/* Infinite marquee — JS pixel scroll, no CSS animation reset */
(function () {
  const track = document.querySelector('.marquee-track');
  if (!track) return;
  /* Clone children so wrap point is invisible */
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

/* Scroll reveal */
(function () {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
  els.forEach(el => obs.observe(el));
})();

/* Lightbox */
(function () {
  const overlay = document.getElementById('lightbox');
  const img = overlay && overlay.querySelector('img');
  const close = overlay && overlay.querySelector('.lightbox-close');
  if (!overlay || !img) return;

  document.querySelectorAll('.gallery-img-wrap img, .lightbox-trigger').forEach(el => {
    el.addEventListener('click', () => {
      img.src = el.src;
      /* Pin overlay to current viewport position so it opens right here */
      overlay.style.top    = window.scrollY + 'px';
      overlay.style.height = window.innerHeight + 'px';
      overlay.classList.add('open');
      document.documentElement.style.overflow = 'hidden';
    });
  });

  function closeLb() {
    overlay.classList.remove('open');
    img.src = '';
    overlay.style.top    = '';
    overlay.style.height = '';
    document.documentElement.style.overflow = '';
  }
  if (close) close.addEventListener('click', closeLb);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeLb(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLb(); });
})();

/* Dark mode toggle */
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

/* Mobile hamburger */
(function () {
  const btn  = document.getElementById('hamburger');
  const menu = document.getElementById('mobile-menu');
  if (!btn || !menu) return;
  btn.addEventListener('click', () => {
    btn.classList.toggle('open');
    menu.classList.toggle('open');
  });
})();
