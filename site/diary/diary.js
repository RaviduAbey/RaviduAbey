/* Work diary: tap a person in the group photo (or reach their story) and
   they stay in colour while everyone else turns black and white. */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- nav menu (same behaviour as the main site) ---------- */
  const nav = $('[data-nav]');
  const menu = $('[data-menu]');
  if (nav && menu) {
    const setMenu = (open) => { nav.classList.toggle('is-open', open); menu.setAttribute('aria-expanded', String(open)); };
    menu.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
    $$('.nav__links a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
    let lastY = scrollY;
    addEventListener('scroll', () => {
      const y = scrollY;
      if (!nav.classList.contains('is-open')) nav.classList.toggle('is-hidden', y > 240 && y > lastY + 4);
      if (y < lastY - 4 || y < 240) nav.classList.remove('is-hidden');
      lastY = y;
    }, { passive: true });
  }
  const yEl = $('[data-year]');
  if (yEl) yEl.textContent = String(new Date().getFullYear());

  /* ---------- prints: tilt in once, then drift inside their frames ---------- */
  const prints = $$('.print');
  const printIO = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-in'); printIO.unobserve(en.target); } });
  }, { threshold: 0.18 });
  prints.forEach((p) => printIO.observe(p));
  if (!reduce && prints.length) {
    let ticking = false;
    const drift = () => {
      ticking = false;
      const vh = innerHeight;
      prints.forEach((p) => {
        const r = p.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        const off = (r.top + r.height / 2 - vh / 2) / vh; // -1..1 across the screen
        p.style.setProperty('--py', (off * -22).toFixed(1) + 'px');
      });
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(drift); } }, { passive: true });
    drift();
  }

  /* ---------- each chapter: one photo, its people ---------- */
  $$('.chapter').forEach(async (chapter) => {
    const team = $('[data-team]', chapter);
    const list = $('[data-people]', chapter);
    if (!team || !list) return;
    const picks = Object.fromEntries($$('[data-pick]', team).map((el) => [el.dataset.pick, el]));
    const cards = $$('[data-person]', list);
    const tag = $('[data-tag]', team);
    const ORDER = ['georgina', 'rav', 'jesse', 'niamh']; // label map ids 1..4, left to right
    const INFO = {
      rav: { name: "That's me", role: 'Rav · Inventory Leading Hand' },
    };
    cards.forEach((c) => { INFO[c.dataset.person] = { name: c.dataset.name, role: c.dataset.role }; });

    let map = null;
    try { map = await (await fetch(team.dataset.map)).json(); } catch (e) { /* taps still work from the cards */ }

    let current = null;
    const showTag = (who) => {
      if (!who || !map) { tag.classList.remove('is-on'); return; }
      const [hx, hy] = map.heads[who];
      tag.style.setProperty('--tx', (hx * 100) + '%');
      tag.style.setProperty('--ty', (Math.max(0.09, hy - 0.05) * 100) + '%');
      $('[data-tag-name]', tag).textContent = INFO[who].name;
      $('[data-tag-role]', tag).textContent = INFO[who].role;
      tag.classList.add('is-on');
    };
    const select = (who) => {
      current = who;
      team.classList.toggle('has-pick', !!who);
      list.classList.toggle('has-pick', !!who && who !== 'rav');
      Object.entries(picks).forEach(([k, el]) => { el.classList.toggle('is-on', k === who); el.classList.remove('is-peek'); });
      cards.forEach((c) => {
        const on = c.dataset.person === who;
        c.classList.toggle('is-on', on);
        $('.person__btn', c).setAttribute('aria-pressed', String(on));
      });
      if (who && map) {
        const [hx, hy] = map.heads[who];
        team.style.setProperty('--sx', (hx * 100) + '%');
        team.style.setProperty('--sy', ((hy + 0.18) * 100) + '%');
      }
      showTag(who);
    };

    // who is at this point of the photo?
    const whoAt = (e) => {
      if (!map) return null;
      const r = team.getBoundingClientRect();
      const cx = Math.floor(((e.clientX - r.left) / r.width) * map.cols);
      const cy = Math.floor(((e.clientY - r.top) / r.height) * map.rows);
      if (cx < 0 || cy < 0 || cx >= map.cols || cy >= map.rows) return null;
      // look in a small neighbourhood so near-misses on a phone still count
      for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2]]) {
        const x = cx + dx, y = cy + dy;
        if (x < 0 || y < 0 || x >= map.cols || y >= map.rows) continue;
        const v = +map.map[y * map.cols + x];
        if (v) return ORDER[v - 1];
      }
      return null;
    };

    let manualUntil = 0;
    team.addEventListener('click', (e) => {
      const who = whoAt(e);
      team.classList.add('was-used');
      manualUntil = performance.now() + 1500;
      select(who || null); // tapping someone always shows them; the background clears
      if (who && who !== 'rav') {
        const card = cards.find((c) => c.dataset.person === who);
        if (card) {
          const r = card.getBoundingClientRect();
          if (r.top < 0 || r.bottom > innerHeight) card.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
        }
      }
    });
    // hover preview on computers
    team.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const who = whoAt(e);
      team.style.cursor = who ? 'pointer' : 'default';
      if (current) return;
      Object.entries(picks).forEach(([k, el]) => el.classList.toggle('is-peek', k === who));
      team.classList.toggle('has-pick', !!who);
      showTag(who);
    });
    team.addEventListener('pointerleave', () => { if (!current) select(null); });

    // cards: click or keyboard
    cards.forEach((c) => {
      c.addEventListener('click', () => {
        manualUntil = performance.now() + 1500;
        team.classList.add('was-used');
        select(c.dataset.person);
      });
    });
    addEventListener('keydown', (e) => { if (e.key === 'Escape') select(null); });

    // reaching a story selects that person
    const centre = new IntersectionObserver((entries) => {
      if (performance.now() < manualUntil) return;
      entries.forEach((en) => { if (en.isIntersecting) select(en.target.dataset.person); });
    }, { rootMargin: '-48% 0px -48% 0px' });
    cards.forEach((c) => centre.observe(c));

    // entrances. The photo starts clipped, and a clipped element never reports
    // itself as visible, so its reveal is triggered by the chapter around it.
    const enter = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        (en.target === chapter ? team : en.target).classList.add('is-in');
        enter.unobserve(en.target);
      });
    }, { threshold: 0.12 });
    [chapter, ...cards].forEach((el) => enter.observe(el));
  });
})();
