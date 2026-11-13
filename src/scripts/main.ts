// Page behaviour that is not specific to one job:
// 0. the logo plays its ink film,
// 1. the hero headline's red plate follows the pointer by a few pixels,
// 2. the colour bar marks the job that is on screen,
// 3. each working model loads its script when it comes near the screen.

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

// 0. The logo film. It loads after the page, so it never delays the first
// paint. It loops while the logo is on screen. With reduced motion it plays
// one time and then rests on the still logo. The button over the logo pauses
// and plays it. A visitor who asked the browser to save data gets the still logo.
const logo = document.querySelector<HTMLElement>('[data-logo]');
const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
if (logo && !saveData) {
  const film = logo.querySelector('video')!;
  const toggle = logo.querySelector('button')!;
  let wanted = true;
  let onScreen = true;

  const sync = (): void => {
    toggle.setAttribute('aria-pressed', String(!wanted));
    if (!wanted) logo.classList.remove('is-playing');
    if (wanted && onScreen && !document.hidden) {
      film.loop = !reduced.matches;
      film.play().catch(() => {
        // The browser refused to play. The still logo stays.
        wanted = false;
        sync();
      });
    } else {
      film.pause();
    }
  };

  // The film covers the still logo only when it has frames to show.
  film.addEventListener('playing', () => logo.classList.toggle('is-playing', wanted));
  // "ended" comes only when the film does not loop: rest on the still logo.
  film.addEventListener('ended', () => {
    wanted = false;
    film.currentTime = 0;
    sync();
  });
  toggle.addEventListener('click', () => {
    wanted = !wanted;
    sync();
  });
  document.addEventListener('visibilitychange', sync);
  new IntersectionObserver((entries) => {
    onScreen = entries[entries.length - 1].isIntersecting;
    sync();
  }).observe(logo);

  const start = (): void => {
    toggle.hidden = false;
    sync();
  };
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });
}

// 1. Hero register follows the pointer (mouse and pen only).
const hero = document.querySelector<HTMLElement>('.hero__title');
if (hero && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
  let frame = 0;
  let x = 0;
  let y = 0;
  const apply = () => {
    frame = 0;
    hero.style.setProperty('--rx', `${x.toFixed(2)}px`);
    hero.style.setProperty('--ry', `${y.toFixed(2)}px`);
  };
  window.addEventListener(
    'pointermove',
    (e) => {
      if (reduced.matches || e.pointerType === 'touch') return;
      const r = hero.getBoundingClientRect();
      if (r.bottom < 0) return;
      // Up to 9 px of misregister, away from the pointer.
      x = ((r.left + r.width / 2 - e.clientX) / window.innerWidth) * 18;
      y = ((r.top + r.height / 2 - e.clientY) / window.innerHeight) * 14;
      if (!frame) frame = requestAnimationFrame(apply);
    },
    { passive: true },
  );
  document.documentElement.addEventListener('pointerleave', () => {
    hero.style.removeProperty('--rx');
    hero.style.removeProperty('--ry');
  });
}

// 2. Colour bar: mark the current job.
const patches = new Map<string, HTMLElement>();
document.querySelectorAll<HTMLElement>('[data-patch]').forEach((a) => patches.set(a.dataset.patch!, a));
if (patches.size) {
  const seen = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const patch = patches.get(entry.target.id);
        if (!patch) continue;
        if (entry.isIntersecting) patch.setAttribute('aria-current', 'true');
        else patch.removeAttribute('aria-current');
      }
    },
    { rootMargin: '-45% 0px -45% 0px' },
  );
  document.querySelectorAll('[data-job]').forEach((s) => seen.observe(s));
}

// 3. Working models load when they come near the screen.
const loaders: Record<string, () => Promise<{ default: (root: HTMLElement) => void }>> = {
  stock: () => import('./stock.ts'),
  micr: () => import('./micr.ts'),
  conveyance: () => import('./conveyance.ts'),
  ticketing: () => import('./ticketing.ts'),
  packages: () => import('./packages.ts'),
};

const near = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      near.unobserve(entry.target);
      const root = entry.target as HTMLElement;
      const load = loaders[root.dataset.demo ?? ''];
      if (!load) continue;
      load()
        .then((m) => {
          m.default(root);
          root.dataset.ready = 'true';
        })
        .catch(() => {
          // The static markup already shows the finished state, so a failed
          // script leaves a complete page.
        });
    }
  },
  { rootMargin: '600px 0px' },
);
document.querySelectorAll('[data-demo]').forEach((el) => near.observe(el));
