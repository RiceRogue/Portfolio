/**
 * Hero Warp Shader — WebGL implementation
 * Inspired by paper-design/shaders Warp effect
 * Pure WebGL, no dependencies
 */
(function () {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;

  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) return;

  /* ── Vertex shader ─────────────────────────────────────── */
  const VS = `
    attribute vec2 a_position;
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  /* ── Fragment shader — falling streaks (FallingPattern port) */
  const FS = `
    precision mediump float;

    uniform float u_time;
    uniform vec2  u_resolution;
    uniform vec2  u_mouse;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    void main() {
      float t, numCols, colIdx, colFrac;
      float h1, h2, speed, phase, fallY, xOff;
      float streakW, tailLen, inStreak, headBright;
      float dotFallY, dotX, dotDist, inDot, brightness;
      float mdist, ripple, mouseGlow;
      vec2  uv, mouse;
      vec3  bgCol, streakCol, headCol, glowCol, colOut;

      uv    = gl_FragCoord.xy / u_resolution.xy;
      mouse = u_mouse;
      t     = u_time;

      /* Mouse ripple — distorts UV before streak calc */
      mdist  = length((uv - mouse) * vec2(u_resolution.x / u_resolution.y, 1.0));
      ripple = sin(mdist * 16.0 - t * 5.0) * 0.018 * exp(-mdist * 5.0);
      uv.y  += ripple;
      uv.x  += ripple * 0.4;

      /* Falling streak columns */
      numCols = 22.0;
      colIdx  = floor(uv.x * numCols);
      colFrac = fract(uv.x * numCols);

      h1    = hash(vec2(colIdx, 0.0));
      h2    = hash(vec2(colIdx, 1.0));
      speed = 0.15 + h1 * 0.25;
      phase = h2;

      /* Y position: head falls downward, wraps around */
      fallY = fract(uv.y + t * speed + phase);

      /* Streak horizontal profile — thin soft strip */
      streakW  = 0.07 + h1 * 0.05;
      xOff     = abs(colFrac - 0.5);
      inStreak = smoothstep(streakW, streakW * 0.2, xOff);

      /* Comet tail: bright head, long fade upward */
      tailLen    = 0.18 + h2 * 0.22;
      headBright = inStreak
                 * smoothstep(0.0,  0.05, fallY)
                 * (1.0 - smoothstep(0.05, 0.05 + tailLen, fallY));
      headBright = headBright * headBright; /* sharpen */

      /* Dot accent at comet head */
      dotFallY = fract(uv.y + t * speed + phase + 0.005);
      dotX     = (colFrac - 0.5) * 4.0;
      dotDist  = length(vec2(dotX, dotFallY * 10.0 - 0.12));
      inDot    = smoothstep(0.35, 0.0, dotDist);

      brightness = headBright + inDot * 0.85;

      /* Dark bg + cool blue-white streaks — readable under white text */
      bgCol    = vec3(0.05, 0.04, 0.10);
      streakCol= vec3(0.75, 0.88, 1.00);
      headCol  = vec3(1.00, 1.00, 1.00);
      glowCol  = vec3(0.35, 0.55, 1.00);

      colOut  = bgCol;
      colOut  = mix(colOut, streakCol, clamp(headBright * 1.5, 0.0, 1.0));
      colOut  = mix(colOut, headCol,   clamp(inDot * 1.2,      0.0, 1.0));

      /* Soft radial glow that pulses around the mouse */
      mouseGlow = exp(-mdist * 4.5) * (0.18 + 0.08 * sin(t * 2.0));
      colOut   += glowCol * mouseGlow;

      gl_FragColor = vec4(colOut, 1.0);
    }
  `;

  /* ── Compile helpers ───────────────────────────────────── */
  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn('Shader error:', gl.getShaderInfoLog(s));
      gl.deleteShader(s);
      return null;
    }
    return s;
  }

  const vs = compile(gl.VERTEX_SHADER, VS);
  const fs = compile(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) return;

  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.warn('Program link error:', gl.getProgramInfoLog(prog));
    return;
  }

  /* ── Full-screen quad ──────────────────────────────────── */
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1,  1, -1, -1,  1,
    -1,  1,  1, -1,  1,  1,
  ]), gl.STATIC_DRAW);

  const posLoc   = gl.getAttribLocation(prog, 'a_position');
  const timeLoc  = gl.getUniformLocation(prog, 'u_time');
  const resLoc   = gl.getUniformLocation(prog, 'u_resolution');
  const mouseLoc = gl.getUniformLocation(prog, 'u_mouse');

  /* ── Resize handling ───────────────────────────────────── */
  const hero = canvas.closest('.hero') || canvas.parentElement;
  function resize() {
    const w = hero.clientWidth;
    const h = hero.clientHeight;
    canvas.width  = Math.floor(w * Math.min(devicePixelRatio, 2));
    canvas.height = Math.floor(h * Math.min(devicePixelRatio, 2));
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  resize();
  window.addEventListener('resize', resize);

  /* ── Mouse tracking ────────────────────────────────────── */
  let mouseX = 0.5, mouseY = 0.5;
  window.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    mouseX = (e.clientX - rect.left) / rect.width;
    mouseY = 1.0 - (e.clientY - rect.top) / rect.height;
  });

  /* ── Render loop ───────────────────────────────────────── */
  let start = null;
  let raf;

  function frame(ts) {
    if (!start) start = ts;
    const t = (ts - start) / 1000;

    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
    gl.uniform1f(timeLoc, t);
    gl.uniform2f(resLoc, canvas.width, canvas.height);
    gl.uniform2f(mouseLoc, mouseX, mouseY);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    raf = requestAnimationFrame(frame);
  }

  /* Only animate when visible (IntersectionObserver) */
  if ('IntersectionObserver' in window) {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) raf = requestAnimationFrame(frame);
        else { cancelAnimationFrame(raf); start = null; }
      });
    });
    obs.observe(canvas);
  } else {
    raf = requestAnimationFrame(frame);
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
