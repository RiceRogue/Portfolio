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

  /* ── Fragment shader ───────────────────────────────────── */
  const FS = `
    precision mediump float;

    uniform float u_time;
    uniform vec2  u_resolution;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }

    float fbm(vec2 p) {
      float v = 0.0;
      float a = 0.5;
      v += a * noise(p); p = p * 2.1 + vec2(1.7, 9.2); a *= 0.5;
      v += a * noise(p); p = p * 2.1 + vec2(8.3, 2.8); a *= 0.5;
      v += a * noise(p); p = p * 2.1 + vec2(3.1, 6.4); a *= 0.5;
      v += a * noise(p);
      return v;
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution.xy;
      float t = u_time * 0.15;
      float f = fbm(uv * 1.8 + t * 0.2);
      float g = fbm(uv * 1.8 + vec2(5.2, 1.3) - t * 0.15);
      float h = fbm(uv * 2.4 + vec2(f, g) * 2.0);
      vec3 col = mix(
        mix(vec3(0.60, 0.78, 0.98), vec3(0.98, 0.60, 0.72), f),
        mix(vec3(0.60, 0.95, 0.80), vec3(0.90, 0.70, 0.98), g),
        h
      );
      float vign = 1.0 - 0.2 * length(uv * 2.0 - 1.0);
      gl_FragColor = vec4(col * vign, 1.0);
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

  const posLoc  = gl.getAttribLocation(prog, 'a_position');
  const timeLoc = gl.getUniformLocation(prog, 'u_time');
  const resLoc  = gl.getUniformLocation(prog, 'u_resolution');

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

  let savedScroll = 0;

  document.querySelectorAll('.gallery-img-wrap img, .lightbox-trigger').forEach(el => {
    el.addEventListener('click', () => {
      savedScroll = window.scrollY;
      img.src = el.src;
      overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
      document.body.style.top = '-' + savedScroll + 'px';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    });
  });

  function closeLb() {
    overlay.classList.remove('open');
    img.src = '';
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
    document.body.style.top = '';
    window.scrollTo(0, savedScroll);
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
