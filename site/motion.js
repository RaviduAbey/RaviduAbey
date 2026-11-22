/* Scroll motion for the approach and about sections.
   1. Approach: a pinned scene. Words flip up, unblur and decode from
      scrambled data into the real text while rows of data drift behind.
   2. About: the headline slides in from both sides, paragraphs wipe in,
      the line above the facts draws, and the facts roll like an odometer. */

(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return; // everything already reads correctly at rest
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const GLYPHS = '0123456789$%#&@ABCDEFKXZ/<>=+';

  /* ---------- 1. the decode scene ---------- */
  const scene = $('[data-decode-scene]');
  const paras = scene ? $$('[data-decode]', scene).map((p) => {
    const text = p.textContent.replace(/\s+/g, ' ').trim();
    const holder = document.createElement('span');
    holder.setAttribute('aria-hidden', 'true');
    while (p.firstChild) holder.appendChild(p.firstChild);
    p.appendChild(holder);
    const sr = document.createElement('span');
    sr.className = 'sr'; sr.textContent = text;
    p.appendChild(sr);
    const words = [];
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const s = document.createElement('span');
            s.className = 'dw'; s.textContent = part;
            frag.appendChild(s);
            words.push({ el: s, text: part, t: -1, last: 0 });
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    walk(holder);
    return { p, words };
  }) : [];
  const rows = scene ? $$('.drow', scene) : [];
  if (scene) scene.classList.add('is-armed');

  let lastY = scrollY, vel = 0, now = 0;
  function sceneFx() {
    const r = scene.getBoundingClientRect();
    const travel = r.height - innerHeight;
    const p = clamp(-r.top / Math.max(1, travel));
    rows.forEach((row, i) => {
      const dir = i % 2 ? 1 : -1;
      const x = dir * (p - 0.5) * 70 - (i % 2 ? 35 : 0);
      row.style.transform = `translate3d(${x.toFixed(2)}vw,0,0) skewX(${clamp(-vel * 0.25, -14, 14).toFixed(2)}deg)`;
    });
    paras.forEach(({ p: el, words }) => {
      if (!el.offsetParent) return; // the other side of the switch
      const N = words.length;
      words.forEach((w, i) => {
        const start = 0.04 + (i / N) * 0.7;
        const t = clamp((p - start) / 0.12);
        const e = easeOut(t);
        if (t !== w.t) {
          w.t = t;
          w.el.style.opacity = (0.07 + 0.93 * e).toFixed(3);
          w.el.style.transform = t >= 1 ? '' : `translateY(${((1 - e) * 0.5).toFixed(3)}em) rotateX(${((1 - e) * 85).toFixed(1)}deg)`;
          w.el.style.filter = t >= 1 ? '' : `blur(${((1 - e) * 7).toFixed(2)}px)`;
          w.el.classList.toggle('is-live', t > 0 && t < 1);
        }
        // decode: scrambled data resolving left to right
        if (t > 0 && t < 1) {
          if (now - w.last > 55) {
            w.last = now;
            const keep = Math.floor(t * w.text.length);
            let s = w.text.slice(0, keep);
            for (let k = keep; k < w.text.length; k++) s += /[\w$]/.test(w.text[k]) ? GLYPHS[(Math.random() * GLYPHS.length) | 0] : w.text[k];
            w.el.textContent = s;
          }
        } else if (w.el.textContent !== w.text) w.el.textContent = w.text;
      });
    });
  }

  /* ---------- 2. about: headline, paragraphs, line ---------- */
  const about = $('#about');
  const aboutH = $('#about-title');
  const hWords = [];
  if (aboutH) {
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const s = document.createElement('span'); s.className = 'sw'; s.textContent = part;
            frag.appendChild(s); hWords.push({ el: s, accent: false });
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName === 'EM') {
          const s = document.createElement('span'); s.className = 'sw';
          n.replaceWith(s); s.appendChild(n); hWords.push({ el: s, accent: true });
        }
      });
    };
    walk(aboutH);
  }
  const aboutParas = about ? $$('.about__body p', about) : [];
  const facts = $('[data-facts]');

  function aboutFx() {
    const vh = innerHeight;
    const r = about.getBoundingClientRect();
    const a = clamp((vh - r.top) / (vh * 0.8));
    hWords.forEach((w, i) => {
      const delay = w.accent ? 0.42 : i * 0.13;
      const t = easeOut(clamp((a - delay) / 0.5));
      const dir = i % 2 ? 1 : -1;
      const pop = w.accent ? 1 + Math.sin(t * Math.PI) * 0.12 : 1;
      w.el.style.transform = t >= 1 ? '' : `translateX(${((1 - t) * dir * 42).toFixed(2)}vw) skewX(${((1 - t) * dir * -20).toFixed(1)}deg) scale(${pop.toFixed(3)})`;
      w.el.style.opacity = (0.15 + 0.85 * t).toFixed(3);
    });
    aboutParas.forEach((p, i) => {
      const pr = p.getBoundingClientRect();
      const b = easeOut(clamp((vh * 0.96 - pr.top) / (vh * 0.42) - i * 0.08));
      p.style.clipPath = b >= 1 ? '' : `inset(-10% ${((1 - b) * 100).toFixed(2)}% -10% 0)`;
      p.style.transform = b >= 1 ? '' : `translateX(${((1 - b) * -28).toFixed(1)}px)`;
    });
    if (facts) {
      const fr = facts.getBoundingClientRect();
      facts.style.setProperty('--line', easeOut(clamp((vh * 0.92 - fr.top) / (vh * 0.4))).toFixed(3));
    }
  }

  /* ---------- 3. the facts roll like an odometer ---------- */
  $$('[data-odo]').forEach((el) => {
    const txt = el.textContent.trim();
    el.setAttribute('aria-label', txt);
    el.setAttribute('role', 'text');
    el.textContent = '';
    el.classList.add('odo');
    let d = 0;
    [...txt].forEach((ch) => {
      const cell = document.createElement('span');
      cell.setAttribute('aria-hidden', 'true');
      if (/\d/.test(ch)) {
        cell.className = 'odo__d';
        const col = document.createElement('span');
        col.className = 'odo__col';
        col.style.setProperty('--to', 20 + Number(ch)); // two full spins, then the digit
        col.style.setProperty('--i', d++);
        for (let k = 0; k < 30; k++) { const n = document.createElement('span'); n.textContent = String(k % 10); col.appendChild(n); }
        cell.appendChild(col);
      } else {
        cell.className = 'odo__s';
        cell.textContent = ch;
      }
      el.appendChild(cell);
    });
  });
  if (facts) {
    facts.classList.add('odo-ready');
    new IntersectionObserver((entries, io) => {
      entries.forEach((en) => { if (en.isIntersecting) { facts.classList.add('is-rolled'); io.disconnect(); } });
    }, { threshold: 0.4 }).observe(facts);
  }

  /* ---------- one loop while either section is on screen ---------- */
  const watched = [scene, about].filter(Boolean);
  const visible = new Set();
  let raf = 0;
  const loop = (ts) => {
    now = ts;
    const y = scrollY;
    vel += ((y - lastY) - vel) * 0.25;
    lastY = y;
    if (scene && visible.has(scene)) sceneFx();
    if (about && visible.has(about)) aboutFx();
    raf = visible.size ? requestAnimationFrame(loop) : 0;
  };
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => (en.isIntersecting ? visible.add(en.target) : visible.delete(en.target)));
    if (visible.size && !raf) { lastY = scrollY; raf = requestAnimationFrame(loop); }
  }, { rootMargin: '20% 0px' });
  watched.forEach((el) => io.observe(el));
  // set the resting frame straight away
  if (scene) sceneFx();
  if (about) aboutFx();
})();
