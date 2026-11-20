/* Ravidu Sadaruwan Abeywardana · portfolio interactions
   intro query · nav · analyst lens · lit approach · count-ups ·
   falling skill chart · sideways work · timeline · copy email · cursor */

(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* ---------- 1. intro: the query runs once per visit ---------- */
  const intro = $('[data-intro]');
  const ready = () => root.classList.add('is-ready');
  const seen = root.classList.contains('intro-seen');

  if (!intro || seen || reduce) {
    if (intro) intro.remove();
    requestAnimationFrame(ready);
  } else {
    const typed = $('[data-type]', intro);
    const count = $('[data-count]', intro);
    const text = typed.textContent;
    typed.textContent = '';
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      try { sessionStorage.setItem('ra-intro', '1'); } catch (e) {}
      intro.classList.add('is-out');
      setTimeout(ready, 250);
      setTimeout(() => intro.remove(), 1200);
    };
    const t0 = performance.now();
    const TOTAL = 2100;
    const step = (now) => {
      if (done) return;
      const t = clamp((now - t0) / TOTAL);
      typed.textContent = text.slice(0, Math.round(clamp(t / 0.55) * text.length));
      count.textContent = String(Math.round((1 - Math.pow(1 - t, 2.4)) * 100));
      if (t < 1) requestAnimationFrame(step); else setTimeout(finish, 260);
    };
    requestAnimationFrame(step);
    intro.addEventListener('click', finish);
    addEventListener('keydown', finish, { once: true });
    addEventListener('wheel', finish, { once: true, passive: true });
    addEventListener('touchstart', finish, { once: true, passive: true });
  }

  /* ---------- 2. nav ---------- */
  const nav = $('[data-nav]');
  const menu = $('[data-menu]');
  const setMenu = (open) => {
    nav.classList.toggle('is-open', open);
    menu.setAttribute('aria-expanded', String(open));
  };
  menu.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
  $$('.nav__links a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
  nav.addEventListener('focusin', () => nav.classList.remove('is-hidden'));

  /* ---------- 3. the analyst lens ---------- */
  const fig = $('[data-lens]');
  const img = $('[data-portrait]');
  const xy = $('[data-xy]');
  const tag = $('[data-tag]');
  const hint = $('.hero__hint');
  const tools = ['Power BI', 'SQL', 'SAP EWM', 'Qlik', 'Python', 'Power Query', 'WAMAS', 'n8n', 'R', 'Oracle SIM', 'Advanced Excel', 'Power Automate'];
  if (fig && img) {
    const setSrc = () => fig.style.setProperty('--src', `url("${img.currentSrc || img.src}")`);
    if (img.complete) setSrc(); else img.addEventListener('load', setSrc, { once: true });

    const RADIUS = fine ? 118 : 96;
    let tx = 58, ty = 26, x = 58, y = 26, tr = 0, r = 0, raf = 0, travelled = 0, lastPX = 0, lastPY = 0, toolIdx = 0, hideT = 0;

    const loop = () => {
      const k = reduce ? 1 : 0.18;
      x += (tx - x) * k; y += (ty - y) * k; r += (tr - r) * (reduce ? 1 : 0.16);
      fig.style.setProperty('--lx', x.toFixed(2) + '%');
      fig.style.setProperty('--ly', y.toFixed(2) + '%');
      fig.style.setProperty('--r', r.toFixed(1) + 'px');
      if (Math.abs(tx - x) > 0.05 || Math.abs(ty - y) > 0.05 || Math.abs(tr - r) > 0.3) raf = requestAnimationFrame(loop);
      else raf = 0;
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };

    const aim = (e) => {
      const b = fig.getBoundingClientRect();
      const px = clamp((e.clientX - b.left) / b.width);
      const py = clamp((e.clientY - b.top) / b.height);
      tx = px * 100; ty = py * 100; tr = RADIUS;
      travelled += Math.hypot(e.clientX - lastPX, e.clientY - lastPY);
      lastPX = e.clientX; lastPY = e.clientY;
      if (travelled > 70) { travelled = 0; toolIdx = (toolIdx + 1) % tools.length; }
      xy.textContent = `x ${px.toFixed(2)} · y ${py.toFixed(2)}`;
      tag.textContent = `Detected: ${tools[toolIdx]}`;
      fig.classList.toggle('flip-x', px > 0.58);
      fig.classList.toggle('flip-y', py > 0.72);
      fig.classList.add('is-on');
      if (hint) hint.classList.add('is-gone');
      kick();
    };
    const release = () => { tr = 0; fig.classList.remove('is-on'); kick(); };

    fig.addEventListener('pointermove', aim);
    fig.addEventListener('pointerdown', (e) => { clearTimeout(hideT); aim(e); });
    fig.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') release(); });
    fig.addEventListener('pointerup', (e) => {
      if (e.pointerType !== 'mouse') { clearTimeout(hideT); hideT = setTimeout(release, 1600); }
    });
  }

  /* ---------- 4. the approach line lights up as you read ---------- */
  const lit = $('[data-lit]');
  let words = [];
  if (lit) {
    const wrapWords = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            const s = document.createElement('span');
            s.className = 'w';
            s.textContent = part;
            frag.appendChild(s);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) wrapWords(n);
      });
    };
    lit.setAttribute('aria-label', lit.textContent.replace(/\s+/g, ' ').trim());
    wrapWords(lit);
    words = $$('.w', lit);
    words.forEach((w) => w.setAttribute('aria-hidden', 'true'));
    if (reduce) words.forEach((w) => w.classList.add('is-lit'));
  }

  /* ---------- 5. count-ups ---------- */
  const fmt = (v, el) => {
    const d = Number(el.dataset.decimals || 0);
    let s = d ? v.toFixed(d) : Math.round(v).toLocaleString('en-AU');
    return (el.dataset.prefix || '') + s + (el.dataset.suffix || '');
  };
  const countUp = (el) => {
    const to = Number(el.dataset.countTo);
    if (reduce) { el.textContent = fmt(to, el); return; }
    const t0 = performance.now();
    const D = 1500;
    const tick = (now) => {
      const t = clamp((now - t0) / D);
      el.textContent = fmt(to * (1 - Math.pow(1 - t, 3)), el);
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  /* ---------- 6. the skill chart: tools fall into bars ---------- */
  const chart = $('[data-chart]');
  if (chart) {
    $$('.chart__col', chart).forEach((col, c) => {
      $$('li', col).forEach((li, i) => {
        li.style.setProperty('--d', (c * 0.12 + i * 0.09).toFixed(2) + 's');
        li.style.setProperty('--rot', ((i % 2 ? 1 : -1) * (6 + ((i * 7 + c * 3) % 9))) + 'deg');
      });
    });
  }

  /* ---------- case visuals: documents and people ---------- */
  const docs = $('[data-docs]');
  const people = $('[data-people]');
  if (docs) for (let i = 0; i < 20; i++) { const s = document.createElement('span'); s.style.setProperty('--d', (i * 0.04) + 's'); docs.appendChild(s); }
  if (people) for (let i = 0; i < 7; i++) { const s = document.createElement('span'); s.style.setProperty('--d', (0.85 + i * 0.07) + 's'); people.appendChild(s); }

  /* ---------- reveal-once observer ---------- */
  const once = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const el = en.target;
      if (el.matches('[data-count-to]')) countUp(el);
      else if (el.matches('[data-chart]')) el.classList.add('is-live');
      else el.classList.add('is-in');
      once.unobserve(el);
    });
  }, { threshold: 0.3 });
  $$('[data-count-to]').forEach((el) => once.observe(el));
  if (chart) once.observe(chart);

  /* ---------- 7. sideways work ---------- */
  const work = $('[data-hscroll]');
  const track = $('[data-hs-track]');
  const idx = $('[data-hs-index]');
  const cases = $$('.case');
  const wide = matchMedia('(min-width: 1024px)');
  let hsDist = 0;
  const hsOn = () => wide.matches && !reduce;
  const layoutHS = () => {
    if (!work) return;
    if (hsOn()) {
      work.setAttribute('data-ready', '');
      track.style.removeProperty('--hs-x');
      hsDist = Math.max(0, track.scrollWidth - innerWidth);
      work.style.setProperty('--hs-h', (hsDist + innerHeight) + 'px');
    } else {
      work.removeAttribute('data-ready');
      work.style.removeProperty('--hs-h');
      hsDist = 0;
    }
  };
  layoutHS();
  addEventListener('resize', () => { layoutHS(); onScroll(); });
  wide.addEventListener('change', () => { layoutHS(); onScroll(); });
  if (!hsOn()) cases.forEach((c) => once.observe(c));

  /* ---------- 8. timeline ---------- */
  const tl = $('[data-timeline]');
  const tlItems = tl ? $$('li', tl) : [];

  /* ---------- one scroll loop ---------- */
  let lastY = scrollY, ticking = false;
  function onScroll() {
    ticking = false;
    const vh = innerHeight;
    const y = scrollY;

    // nav hides on the way down, returns on the way up
    if (!nav.classList.contains('is-open')) nav.classList.toggle('is-hidden', y > 240 && y > lastY + 4);
    if (y < lastY - 4 || y < 240) nav.classList.remove('is-hidden');
    lastY = y;

    if (words.length && !reduce) {
      const b = lit.getBoundingClientRect();
      const p = clamp((vh * 0.82 - b.top) / (b.height + vh * 0.3));
      const n = Math.round(p * words.length);
      words.forEach((w, i) => w.classList.toggle('is-lit', i < n));
    }

    if (work && hsOn()) {
      const b = work.getBoundingClientRect();
      const p = clamp(-b.top / Math.max(1, hsDist));
      track.style.setProperty('--hs-x', (-p * hsDist).toFixed(1) + 'px');
      if (idx) idx.textContent = String(Math.min(cases.length, Math.floor(p * cases.length * 0.999) + 1)).padStart(2, '0');
      if (b.top < vh * 0.6) cases.forEach((c) => { if (c.getBoundingClientRect().left < innerWidth * 0.9) c.classList.add('is-in'); });
    }

    if (tl) {
      const b = tl.getBoundingClientRect();
      tl.style.setProperty('--p', clamp((vh * 0.62 - b.top) / b.height).toFixed(3));
      tlItems.forEach((li) => li.classList.toggle('is-past', li.getBoundingClientRect().top + 48 < vh * 0.62));
    }
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* ---------- 9. copy email ---------- */
  const copyBtn = $('[data-copy]');
  if (copyBtn) {
    const label = $('[data-copy-label]', copyBtn);
    copyBtn.addEventListener('click', async () => {
      const v = copyBtn.dataset.copy;
      let ok = false;
      try { await navigator.clipboard.writeText(v); ok = true; } catch (e) {
        const ta = document.createElement('textarea');
        ta.value = v; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        try { ok = document.execCommand('copy'); } catch (e2) {}
        ta.remove();
      }
      label.textContent = ok ? 'Copied' : 'Press Ctrl+C';
      setTimeout(() => { label.textContent = 'Copy email'; }, 2000);
    });
  }

  /* ---------- 10. cursor ring ---------- */
  const cur = $('.cursor');
  if (cur && fine && !reduce) {
    let cx = -100, cy = -100, kx = -100, ky = -100, run = false;
    const follow = () => {
      kx += (cx - kx) * 0.2; ky += (cy - ky) * 0.2;
      cur.style.transform = `translate3d(${kx}px, ${ky}px, 0)`;
      if (Math.abs(cx - kx) > 0.1 || Math.abs(cy - ky) > 0.1) requestAnimationFrame(follow); else run = false;
    };
    addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      cx = e.clientX; cy = e.clientY;
      cur.classList.add('is-on');
      const t = e.target;
      cur.classList.toggle('is-link', !!t.closest('a, button'));
      cur.classList.toggle('is-lens', !!t.closest('[data-lens]'));
      if (!run) { run = true; requestAnimationFrame(follow); }
    }, { passive: true });
    document.addEventListener('pointerleave', () => cur.classList.remove('is-on'));
  } else if (cur) cur.remove();

  /* ---------- year ---------- */
  const yEl = $('[data-year]');
  if (yEl) yEl.textContent = String(new Date().getFullYear());
})();
