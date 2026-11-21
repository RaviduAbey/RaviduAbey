/* Particle portrait
   The hero photo is sampled into a fine grid of particles in the photo's
   own colours. They gather into the portrait once the page is ready, part
   around the pointer and spring back, and drift away as the hero scrolls
   out of view. Drawn straight into a pixel buffer so a fine grid stays smooth. */

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

  let W = 0, H = 0, n = 0, step = 3, dot = 2;
  let x, y, hx, hy, vx, vy, delay, sdx, sdy, col;
  let frame, buf;
  let raf = 0, t0 = 0, built = false, scrollP = 0;
  const mouse = { x: -9999, y: -9999, on: false, r: 110 };

  const parsePos = () => {
    const p = getComputedStyle(img).objectPosition.split(' ');
    const f = (s, d) => (s && s.endsWith('%') ? parseFloat(s) / 100 : d);
    return [f(p[0], 0.5), f(p[1], 0.12)];
  };

  function build() {
    const r = fig.getBoundingClientRect();
    W = Math.round(r.width); H = Math.round(r.height);
    if (!W || !H || !img.naturalWidth) return false;
    // one canvas pixel per CSS pixel keeps the buffer small; the grid is the texture
    canvas.width = W; canvas.height = H;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    frame = ctx.createImageData(W, H);
    buf = new Uint32Array(frame.data.buffer);

    // where the photo sits under object-fit: cover
    const [px, py] = parsePos();
    const s = Math.max(W / img.naturalWidth, H / img.naturalHeight);
    const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
    const ox = (W - dw) * px, oy = (H - dh) * py;

    step = 3; dot = 2;
    const cols = Math.floor(W / step), rows = Math.floor(H / step);
    const off = document.createElement('canvas');
    off.width = cols; off.height = rows;
    const o = off.getContext('2d', { willReadFrequently: true });
    o.imageSmoothingQuality = 'high';
    o.drawImage(img, ox / step, oy / step, dw / step, dh / step);
    const data = o.getImageData(0, 0, cols, rows).data;

    const keep = [];
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const k = (j * cols + i) * 4;
        const l = (0.299 * data[k] + 0.587 * data[k + 1] + 0.114 * data[k + 2]) / 255;
        if (l < 0.035) continue; // near-black: nothing to see, skip the work
        keep.push(i, j, k);
      }
    }
    n = keep.length / 3;
    x = new Float32Array(n); y = new Float32Array(n);
    hx = new Float32Array(n); hy = new Float32Array(n);
    vx = new Float32Array(n); vy = new Float32Array(n);
    delay = new Float32Array(n); sdx = new Float32Array(n); sdy = new Float32Array(n);
    col = new Uint32Array(n);
    const little = new Uint8Array(new Uint32Array([1]).buffer)[0] === 1;
    for (let q = 0; q < n; q++) {
      const i = keep[q * 3], j = keep[q * 3 + 1], k = keep[q * 3 + 2];
      hx[q] = i * step; hy[q] = j * step;
      // the photo's own colour, lifted a touch so it reads on the dark page
      const rr = Math.min(255, data[k] * 1.08), gg = Math.min(255, data[k + 1] * 1.08), bb = Math.min(255, data[k + 2] * 1.08);
      col[q] = little ? ((255 << 24) | (bb << 16) | (gg << 8) | rr) >>> 0 : ((rr << 24) | (gg << 16) | (bb << 8) | 255) >>> 0;
      const sa = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.3;
      const sm = (0.25 + Math.random() * 0.85) * H * 0.55;
      sdx[q] = Math.cos(sa) * sm + (hx[q] - W * 0.6) * 0.35;
      sdy[q] = Math.sin(sa) * sm;
      if (reduce || built) { x[q] = hx[q]; y[q] = hy[q]; }
      else {
        const a = Math.random() * Math.PI * 2, d = 0.35 + Math.random() * 0.9;
        x[q] = W * 0.62 + Math.cos(a) * W * d;
        y[q] = H * 0.55 + Math.sin(a) * H * d * 0.7;
        delay[q] = (hy[q] / H) * 0.55 + Math.random() * 0.55;
      }
    }
    mouse.r = Math.max(60, Math.min(110, W * 0.1));
    return true;
  }

  function draw() {
    buf.fill(0);
    const fade = 1 - scrollP * 0.8;
    const aMul = Math.round(255 * fade);
    const little = new Uint8Array(new Uint32Array([1]).buffer)[0] === 1;
    for (let q = 0; q < n; q++) {
      const px = (x[q] + 0.5) | 0, py = (y[q] + 0.5) | 0;
      if (px < 0 || py < 0 || px >= W - dot || py >= H - dot) continue;
      let c = col[q];
      if (aMul < 255) {
        // premultiplied-free alpha: just set the alpha byte
        c = little ? ((c & 0x00ffffff) | (aMul << 24)) >>> 0 : ((c & 0xffffff00) | aMul) >>> 0;
      }
      const base = py * W + px;
      buf[base] = c; buf[base + 1] = c;
      buf[base + W] = c; buf[base + W + 1] = c;
    }
    ctx.putImageData(frame, 0, 0);
  }

  function tick(now) {
    const t = (now - t0) / 1000;
    let moving = false;
    const R = mouse.r, R2 = R * R, sp = scrollP;
    for (let q = 0; q < n; q++) {
      const k = t > delay[q] ? 0.06 : 0.0025;
      const tx = hx[q] + sdx[q] * sp, ty = hy[q] + sdy[q] * sp;
      let ax = (tx - x[q]) * k, ay = (ty - y[q]) * k;
      if (mouse.on) {
        const dx = x[q] - mouse.x, dy = y[q] - mouse.y, d2 = dx * dx + dy * dy;
        if (d2 < R2 && d2 > 0.01) {
          const d = Math.sqrt(d2), f = (1 - d / R) * (1 - d / R) * 4.2;
          ax += (dx / d) * f - (dy / d) * f * 0.18;
          ay += (dy / d) * f + (dx / d) * f * 0.18;
        }
      }
      vx[q] = (vx[q] + ax) * 0.84;
      vy[q] = (vy[q] + ay) * 0.84;
      x[q] += vx[q]; y[q] += vy[q];
      if (!moving && (vx[q] > 0.03 || vx[q] < -0.03 || vy[q] > 0.03 || vy[q] < -0.03 || Math.abs(tx - x[q]) > 0.4 || Math.abs(ty - y[q]) > 0.4)) moving = true;
    }
    const keepGoing = moving || mouse.on || t < 1.4;
    if (!keepGoing) {
      // settled: snap every particle exactly onto its spot so the grid is clean
      for (let q = 0; q < n; q++) { x[q] = hx[q] + sdx[q] * sp; y[q] = hy[q] + sdy[q] * sp; vx[q] = 0; vy[q] = 0; }
    }
    draw();
    raf = keepGoing ? requestAnimationFrame(tick) : 0;
  }

  const wake = () => { if (!raf && !reduce && built) raf = requestAnimationFrame(tick); };

  function start() {
    if (!build()) return;
    fig.classList.add('has-particles');
    built = true;
    if (reduce) { draw(); return; }
    t0 = performance.now();
    raf = requestAnimationFrame(tick);
  }

  // wait for the photo and for the intro to finish
  const whenReady = () => {
    if (root.classList.contains('is-ready')) start();
    else requestAnimationFrame(whenReady);
  };
  if (img.complete && img.naturalWidth) whenReady();
  else img.addEventListener('load', whenReady, { once: true });

  // the pointer parts the particles
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

  // scrolling past the hero dissolves the portrait; scrolling back rebuilds it
  if (!reduce) {
    let st = false;
    addEventListener('scroll', () => {
      if (st) return;
      st = true;
      requestAnimationFrame(() => {
        st = false;
        if (!built) return;
        const r = fig.getBoundingClientRect();
        const raw = Math.min(1, Math.max(0, -r.top / (r.height * 0.75)));
        const eased = raw * raw * (3 - 2 * raw);
        if (Math.abs(eased - scrollP) > 0.002) { scrollP = eased; wake(); }
      });
    }, { passive: true });
  }

  // rebuild on resize, keeping the settled portrait
  let rt = 0, lastW = fig.getBoundingClientRect().width;
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

  // pause work when the hero is off screen
  new IntersectionObserver(([en]) => {
    if (!en.isIntersecting && raf) { cancelAnimationFrame(raf); raf = 0; }
    else if (en.isIntersecting && built) wake();
  }).observe(fig);
})();
