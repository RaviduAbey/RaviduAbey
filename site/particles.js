/* Particle portrait
   The hero photo is sampled into a grid of particles, coloured from its
   brightness in the site's red. They gather into the portrait once the
   page is ready, scatter away from the pointer, and spring back. */

(() => {
  const fig = document.querySelector('[data-lens]');
  const img = fig && fig.querySelector('[data-portrait]');
  if (!fig || !img) return;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;
  canvas.className = 'portrait__particles';
  canvas.setAttribute('aria-hidden', 'true');
  fig.appendChild(canvas);

  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const BUCKETS = 24;

  // brightness -> colour: deep red, signal red, then a warm highlight
  const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const DEEP = [74, 6, 10], RED = [232, 22, 30], HOT = [255, 92, 72], LIGHT = [255, 214, 196];
  const palette = Array.from({ length: BUCKETS }, (_, i) => {
    const t = i / (BUCKETS - 1);
    const c = t < 0.55 ? mix(DEEP, RED, t / 0.55) : t < 0.85 ? mix(RED, HOT, (t - 0.55) / 0.3) : mix(HOT, LIGHT, (t - 0.85) / 0.15);
    return `rgb(${c[0]},${c[1]},${c[2]})`;
  });

  let W = 0, H = 0, dpr = 1, n = 0, size = 3;
  let x, y, hx, hy, vx, vy, delay, sz, starts = [];
  let raf = 0, t0 = 0, built = false;
  const mouse = { x: -9999, y: -9999, on: false, r: 120 };

  const parsePos = () => {
    const p = getComputedStyle(img).objectPosition.split(' ');
    const f = (s, d) => (s && s.endsWith('%') ? parseFloat(s) / 100 : d);
    return [f(p[0], 0.5), f(p[1], 0.12)];
  };

  function build() {
    const r = fig.getBoundingClientRect();
    W = Math.round(r.width); H = Math.round(r.height);
    if (!W || !H || !img.naturalWidth) return false;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';

    // where the photo sits under object-fit: cover
    const [px, py] = parsePos();
    const s = Math.max(W / img.naturalWidth, H / img.naturalHeight);
    const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
    const ox = (W - dw) * px, oy = (H - dh) * py;

    const step = W < 600 ? 5 : W < 900 ? 5 : 6;
    size = step * 0.92;
    const cols = Math.ceil(W / step), rows = Math.ceil(H / step);
    const off = document.createElement('canvas');
    off.width = cols; off.height = rows;
    const o = off.getContext('2d', { willReadFrequently: true });
    o.drawImage(img, ox / step, oy / step, dw / step, dh / step);
    const data = o.getImageData(0, 0, cols, rows).data;

    const pts = [];
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const k = (j * cols + i) * 4;
        let l = (0.299 * data[k] + 0.587 * data[k + 1] + 0.114 * data[k + 2]) / 255;
        l = Math.min(1, Math.max(0, (l - 0.07) * 1.55));
        if (l < 0.06) continue;
        pts.push([i * step + step / 2, j * step + step / 2, Math.min(BUCKETS - 1, Math.floor(l * BUCKETS)), l]);
      }
    }
    pts.sort((a, b) => a[2] - b[2]);
    n = pts.length;
    x = new Float32Array(n); y = new Float32Array(n);
    hx = new Float32Array(n); hy = new Float32Array(n);
    vx = new Float32Array(n); vy = new Float32Array(n);
    delay = new Float32Array(n); sz = new Float32Array(n);
    starts = new Array(BUCKETS + 1).fill(0);
    for (let i = 0; i < n; i++) {
      const p = pts[i];
      hx[i] = p[0]; hy[i] = p[1];
      sz[i] = size * (0.45 + p[3] * 0.6);
      starts[p[2] + 1]++;
      if (reduce || built) { x[i] = hx[i]; y[i] = hy[i]; }
      else {
        // a loose cloud drifting in from the right and below
        const a = Math.random() * Math.PI * 2, d = 0.35 + Math.random() * 0.9;
        x[i] = W * 0.62 + Math.cos(a) * W * d;
        y[i] = H * 0.55 + Math.sin(a) * H * d * 0.7;
        delay[i] = (hy[i] / H) * 0.55 + Math.random() * 0.55;
      }
    }
    for (let b = 1; b <= BUCKETS; b++) starts[b] += starts[b - 1];
    mouse.r = Math.max(64, Math.min(120, W * 0.11));
    return true;
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    for (let b = 0; b < BUCKETS; b++) {
      const a = starts[b], e = starts[b + 1];
      if (a === e) continue;
      ctx.fillStyle = palette[b];
      for (let i = a; i < e; i++) ctx.fillRect(x[i] - sz[i] / 2, y[i] - sz[i] / 2, sz[i], sz[i]);
    }
  }

  function tick(now) {
    const t = (now - t0) / 1000;
    let moving = false;
    const R = mouse.r, R2 = R * R;
    for (let i = 0; i < n; i++) {
      const k = t > delay[i] ? 0.055 : 0.0025;
      let ax = (hx[i] - x[i]) * k, ay = (hy[i] - y[i]) * k;
      if (mouse.on) {
        const dx = x[i] - mouse.x, dy = y[i] - mouse.y, d2 = dx * dx + dy * dy;
        if (d2 < R2 && d2 > 0.01) {
          const d = Math.sqrt(d2), f = (1 - d / R) * (1 - d / R) * 4.2;
          ax += (dx / d) * f - (dy / d) * f * 0.18;
          ay += (dy / d) * f + (dx / d) * f * 0.18;
        }
      }
      vx[i] = (vx[i] + ax) * 0.84;
      vy[i] = (vy[i] + ay) * 0.84;
      x[i] += vx[i]; y[i] += vy[i];
      if (!moving && (Math.abs(vx[i]) > 0.03 || Math.abs(vy[i]) > 0.03 || Math.abs(hx[i] - x[i]) > 0.4 || Math.abs(hy[i] - y[i]) > 0.4)) moving = true;
    }
    draw();
    if (moving || mouse.on || t < 1.4) raf = requestAnimationFrame(tick);
    else raf = 0;
  }

  const wake = () => { if (!raf && !reduce) raf = requestAnimationFrame(tick); };

  function start() {
    if (!build()) return;
    fig.classList.add('has-particles');
    if (reduce) { draw(); built = true; return; }
    t0 = performance.now();
    built = true;
    raf = requestAnimationFrame(tick);
  }

  // wait for the photo and for the intro to finish
  const whenReady = () => {
    if (root.classList.contains('is-ready')) start();
    else requestAnimationFrame(whenReady);
  };
  if (img.complete && img.naturalWidth) whenReady();
  else img.addEventListener('load', whenReady, { once: true });

  // the pointer pushes particles away
  const aim = (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.on = true;
    wake();
  };
  fig.addEventListener('pointermove', aim);
  fig.addEventListener('pointerdown', aim);
  fig.addEventListener('pointerleave', () => { mouse.on = false; wake(); });
  fig.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') { mouse.on = false; wake(); } });
  fig.addEventListener('pointercancel', () => { mouse.on = false; wake(); });

  // rebuild on resize, keeping the settled portrait
  let rt = 0, lastW = 0;
  addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      const w = fig.getBoundingClientRect().width;
      if (!built || Math.abs(w - lastW) < 2) return;
      lastW = w;
      cancelAnimationFrame(raf); raf = 0;
      if (build()) draw();
    }, 180);
  });
  lastW = fig.getBoundingClientRect().width;

  // pause work when the hero is off screen
  new IntersectionObserver(([en]) => {
    if (!en.isIntersecting && raf) { cancelAnimationFrame(raf); raf = 0; }
    else if (en.isIntersecting && built) wake();
  }).observe(fig);
})();
