/* ── Falling interactive smiley field ───────────────────────── */
(function () {
  const bg = document.getElementById('smiley-bg');
  if (!bg) return;

  const COLS    = 9;
  const PER_COL = 4; // smileys per column at staggered phases
  const SIZES   = [40, 50, 58, 66, 74];

  /* SVG face parts */
  const EYES_OPEN = `
    <circle cx="34" cy="40" r="6" fill="currentColor"/>
    <circle cx="66" cy="40" r="6" fill="currentColor"/>`;
  const EYES_SQUINT = `
    <path d="M26 42 Q34 31 42 42" stroke="currentColor" stroke-width="5.5" fill="none" stroke-linecap="round"/>
    <path d="M58 42 Q66 31 74 42" stroke="currentColor" stroke-width="5.5" fill="none" stroke-linecap="round"/>`;
  const MOUTH_SMILE   = `<path d="M28 60 Q50 76 72 60" stroke="currentColor" stroke-width="5.5" fill="none" stroke-linecap="round"/>`;
  const MOUTH_BIGSMILE = `<path d="M14 57 Q50 90 86 57" stroke="currentColor" stroke-width="5.5" fill="none" stroke-linecap="round"/>
    <path d="M14 57 Q50 90 86 57 Q50 66 14 57Z" fill="currentColor" opacity="0.25"/>`;

  for (let col = 0; col < COLS; col++) {
    const xPct = 4 + (col / (COLS - 1)) * 92; // 4% – 96%

    for (let i = 0; i < PER_COL; i++) {
      const size = SIZES[Math.floor(Math.random() * SIZES.length)];
      const dur  = 7 + Math.random() * 7;           // 7–14 s
      const delay = -((i / PER_COL) * dur);          // stagger phases

      const wrapper = document.createElement('div');
      wrapper.className = 'smiley-wrapper';
      wrapper.style.cssText = `
        left:${xPct}%;
        width:${size}px;
        height:${size}px;
        --dur:${dur.toFixed(2)}s;
        --delay:${delay.toFixed(2)}s;
      `;

      const circle = document.createElement('div');
      circle.className = 'smiley-circle';
      circle.innerHTML = `
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <g class="face-smile">${EYES_OPEN}${MOUTH_SMILE}</g>
          <g class="face-bigsmile">${EYES_SQUINT}${MOUTH_BIGSMILE}</g>
        </svg>`;

      wrapper.appendChild(circle);
      bg.appendChild(wrapper);

      /* GSAP 3D tilt */
      if (typeof gsap !== 'undefined') {
        circle.addEventListener('pointerenter', () => {
          circle.classList.add('hovered');
        });
        circle.addEventListener('pointermove', e => {
          const r  = circle.getBoundingClientRect();
          const rx =  ((e.clientY - (r.top  + r.height / 2)) / r.height) * 38;
          const ry = -((e.clientX - (r.left + r.width  / 2)) / r.width ) * 38;
          gsap.to(circle, { rotateX: rx, rotateY: ry, scale: 1.2, overwrite: true, duration: 0.15 });
        });
        circle.addEventListener('pointerleave', () => {
          circle.classList.remove('hovered');
          gsap.to(circle, {
            rotateX: 0, rotateY: 0, scale: 1,
            duration: 1.0, ease: 'elastic.out(1, 0.38)', overwrite: true
          });
        });
      } else {
        /* Fallback without GSAP — CSS-only hover */
        circle.addEventListener('pointerenter', () => circle.classList.add('hovered'));
        circle.addEventListener('pointerleave', () => circle.classList.remove('hovered'));
      }
    }
  }
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
