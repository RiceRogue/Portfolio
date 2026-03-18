/* ── Falling interactive smiley field ───────────────────────── */
(function () {
  const bg = document.getElementById('smiley-bg');
  if (!bg) return;

  const COUNT = 40;
  const SIZES = [36, 44, 52, 60, 68, 76];

  const EYES_OPEN = `
    <circle cx="34" cy="40" r="6" fill="currentColor"/>
    <circle cx="66" cy="40" r="6" fill="currentColor"/>`;
  const EYES_SQUINT = `
    <path d="M26 42 Q34 31 42 42" stroke="currentColor" stroke-width="5.5" fill="none" stroke-linecap="round"/>
    <path d="M58 42 Q66 31 74 42" stroke="currentColor" stroke-width="5.5" fill="none" stroke-linecap="round"/>`;
  const MOUTH_SMILE    = `<path d="M28 60 Q50 76 72 60" stroke="currentColor" stroke-width="5.5" fill="none" stroke-linecap="round"/>`;
  const MOUTH_BIGSMILE = `<path d="M14 57 Q50 90 86 57" stroke="currentColor" stroke-width="5.5" fill="none" stroke-linecap="round"/>
    <path d="M14 57 Q50 90 86 57 Q50 66 14 57Z" fill="currentColor" opacity="0.25"/>`;

  const circles = [];

  for (let i = 0; i < COUNT; i++) {
    const size  = SIZES[Math.floor(Math.random() * SIZES.length)];
    const dur   = 7 + Math.random() * 8;           // 7–15 s
    const xPct  = 3 + Math.random() * 94;          // fully random 3%–97%
    const delay = -(Math.random() * dur);           // random phase

    const wrapper = document.createElement('div');
    wrapper.className = 'smiley-wrapper';
    wrapper.style.cssText = `left:${xPct.toFixed(1)}%;width:${size}px;height:${size}px;--dur:${dur.toFixed(2)}s;--delay:${delay.toFixed(2)}s;`;

    const circle = document.createElement('div');
    circle.className = 'smiley-circle';
    circle.innerHTML = `
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <g class="face-smile">${EYES_OPEN}${MOUTH_SMILE}</g>
        <g class="face-bigsmile">${EYES_SQUINT}${MOUTH_BIGSMILE}</g>
      </svg>`;

    wrapper.appendChild(circle);
    bg.appendChild(wrapper);
    circles.push(circle);
  }

  /* Global hit-test — bypasses pointer-events CSS issues on animated elements */
  let lastHovered = null;

  function unhover(c) {
    if (!c) return;
    c.classList.remove('hovered');
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
      if (found) found.classList.add('hovered');
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
  const speed = 0.9;
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
