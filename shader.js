/* ── Falling interactive smiley field ───────────────────────── */
(function () {
  const bg = document.getElementById('smiley-bg');
  if (!bg) return;

  const COUNT = 40;
  const SIZES = [36, 44, 52, 60, 68, 76];

  /* Faces rotated 90° — eyes stacked left like ":" in ":)" / ":D" */
  const EYES = `
    <circle cx="30" cy="30" r="6" fill="currentColor"/>
    <circle cx="30" cy="70" r="6" fill="currentColor"/>`;
  /* ")" — stroke arc on the right */
  const MOUTH_SMILE    = `<path d="M56 28 Q84 50 56 72" stroke="currentColor" stroke-width="5.5" fill="none" stroke-linecap="round"/>`;
  /* "D" — filled half-circle on the right, closed with straight spine */
  const MOUTH_BIGSMILE = `<path d="M56 22 Q95 50 56 78 Z" fill="currentColor"/>`;

  /* Hover colour palettes — one randomly assigned per smiley */
  const PALETTES = [
    { bg: 'radial-gradient(circle at 35% 30%, #ffe566, #ff8800)', color: '#7a4000', glow: 'rgba(255,160,0,0.55)' },
    { bg: 'radial-gradient(circle at 35% 30%, #ff88bb, #d01858)', color: '#5a001a', glow: 'rgba(255,40,120,0.5)'  },
    { bg: 'radial-gradient(circle at 35% 30%, #c090ff, #5520e0)', color: '#250070', glow: 'rgba(130,60,255,0.5)'  },
    { bg: 'radial-gradient(circle at 35% 30%, #70ffaa, #10b048)', color: '#054020', glow: 'rgba(20,190,80,0.45)'  },
    { bg: 'radial-gradient(circle at 35% 30%, #60d8ff, #0858d8)', color: '#032460', glow: 'rgba(20,120,255,0.5)'  },
    { bg: 'radial-gradient(circle at 35% 30%, #ffaa66, #e04010)', color: '#5a1200', glow: 'rgba(255,100,30,0.5)'  },
  ];

  const circles = [];

  for (let i = 0; i < COUNT; i++) {
    const size    = SIZES[Math.floor(Math.random() * SIZES.length)];
    const dur     = 7 + Math.random() * 8;
    const xPct    = 3 + Math.random() * 94;
    const delay   = -(Math.random() * dur);
    const palette = PALETTES[Math.floor(Math.random() * PALETTES.length)];

    const wrapper = document.createElement('div');
    wrapper.className = 'smiley-wrapper';
    wrapper.style.cssText = `left:${xPct.toFixed(1)}%;width:${size}px;height:${size}px;--dur:${dur.toFixed(2)}s;--delay:${delay.toFixed(2)}s;`;

    const circle = document.createElement('div');
    circle.className = 'smiley-circle';
    circle._palette = palette;
    circle.innerHTML = `
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <g class="face-smile">${EYES}${MOUTH_SMILE}</g>
        <g class="face-bigsmile">${EYES}${MOUTH_BIGSMILE}</g>
      </svg>`;

    wrapper.appendChild(circle);
    bg.appendChild(wrapper);
    circles.push(circle);
  }

  /* Global hit-test — bypasses pointer-events CSS on animated elements */
  let lastHovered = null;

  function applyHover(c) {
    const p = c._palette;
    c.classList.add('hovered');
    c.style.background = p.bg;
    c.style.color      = p.color;
    c.style.boxShadow  = `0 0 30px ${p.glow}, 0 0 10px ${p.glow}`;
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
