// Working model for SPSL Ticketing: dispatch.
// A complaint goes to the closest engineer who is clocked in. The service call
// then runs through its statuses until the close is approved.
import { onceVisible, pick, reduced, runner, wait } from './kit';

// The engineer stops this far above the customer, in percent of the map height.
const STOP = 15;

interface Engineer {
  el: HTMLButtonElement;
  n: number;
  x: number;
  y: number;
  on: boolean;
}

export default function init(root: HTMLElement): void {
  const map = pick(root, '[data-map]');
  const route = pick(root, '[data-route]');
  const say = pick(root, '[data-say]');
  const steps = [...root.querySelectorAll<HTMLElement>('[data-steps] li')];
  const call = runner();

  const engineers: Engineer[] = [...root.querySelectorAll<HTMLButtonElement>('[data-eng]')].map((el) => ({
    el,
    n: Number(el.dataset.eng) + 1,
    x: Number(el.dataset.x),
    y: Number(el.dataset.y),
    on: el.getAttribute('aria-pressed') === 'true',
  }));

  function setStep(index: number): void {
    steps.forEach((li, i) => {
      if (i < index) li.dataset.s = 'done';
      else if (i === index) li.dataset.s = 'now';
      else delete li.dataset.s;
      if (i === index) li.setAttribute('aria-current', 'step');
      else li.removeAttribute('aria-current');
    });
  }

  function clearCall(): void {
    route.classList.remove('is-drawn');
    root.querySelectorAll('.is-open, .is-busy').forEach((el) => el.classList.remove('is-open', 'is-busy'));
    setStep(-1);
  }

  function label(e: Engineer): void {
    e.el.setAttribute('aria-pressed', String(e.on));
    pick(e.el, '[data-label]').textContent =
      `Engineer ${e.n}, ${e.on ? 'clocked in. Press to clock out.' : 'off duty. Press to clock in.'}`;
  }

  // Distance on screen, so "closest" is what the eye sees on any map shape.
  function distance(e: Engineer, x: number, y: number): number {
    const box = map.getBoundingClientRect();
    return Math.hypot(((e.x - x) * box.width) / 100, ((e.y - y) * box.height) / 100);
  }

  async function dispatch(site: HTMLElement, signal: AbortSignal): Promise<void> {
    const x = Number(site.dataset.x);
    const y = Number(site.dataset.y);
    const name = site.dataset.site;
    const pause = reduced() ? 250 : 700;

    clearCall();
    site.classList.add('is-open');
    setStep(0);

    const byDistance = [...engineers].sort((a, b) => distance(a, x, y) - distance(b, x, y));
    const chosen = byDistance.find((e) => e.on);
    if (!chosen) {
      say.innerHTML = `Customer ${name} logged a complaint. <span class="bad">No engineer is clocked in, so the call waits.</span> Clock an engineer in and press the customer again.`;
      return;
    }
    const skipped = byDistance.slice(0, byDistance.indexOf(chosen));
    say.textContent =
      `Customer ${name} logged a complaint. ` +
      (skipped.length
        ? `Engineer ${skipped.map((e) => e.n).join(' and ')} ${skipped.length > 1 ? 'are' : 'is'} closer but off duty. `
        : '') +
      `Engineer ${chosen.n} is the closest who is clocked in.`;

    await wait(pause, signal);
    const box = map.getBoundingClientRect();
    const dx = ((x - chosen.x) * box.width) / 100;
    const dy = ((y - chosen.y) * box.height) / 100;
    route.style.left = `${chosen.x}%`;
    route.style.top = `${chosen.y}%`;
    route.style.width = `${Math.hypot(dx, dy)}px`;
    route.style.setProperty('--angle', `${Math.atan2(dy, dx)}rad`);
    // Read a layout value so the line starts from "not drawn" before it draws.
    void map.offsetWidth;
    route.classList.add('is-drawn');
    chosen.el.classList.add('is-busy');
    setStep(1);

    await wait(pause, signal);
    setStep(2);
    await wait(pause, signal);
    setStep(3);

    // The engineer travels to the customer. Only transform is animated.
    // The engineer stops a little above the customer, so both stay in reach.
    const stopY = dy - (STOP * box.height) / 100;
    const travel = chosen.el.animate([{ transform: 'none' }, { transform: `translate3d(${dx}px, ${stopY}px, 0)` }], {
      duration: reduced() ? 1 : 900,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      fill: 'forwards',
    });
    const arrive = (): void => {
      chosen.x = x;
      chosen.y = y - STOP;
      chosen.el.style.left = `${chosen.x}%`;
      chosen.el.style.top = `${chosen.y}%`;
      travel.cancel();
    };
    signal.addEventListener('abort', arrive, { once: true });
    await travel.finished;
    signal.removeEventListener('abort', arrive);
    arrive();
    route.classList.remove('is-drawn');

    setStep(4);
    say.textContent = `Engineer ${chosen.n} is at Customer ${name} and works the job from a phone.`;
    await wait(pause * 1.4, signal);
    setStep(5);
    say.textContent = `Engineer ${chosen.n} asked to close the call. The department approves the close.`;
    await wait(pause * 1.4, signal);
    setStep(7);
    site.classList.remove('is-open');
    chosen.el.classList.remove('is-busy');
    say.textContent = `Closed and signed off. Engineer ${chosen.n} is free for the next call. Press another customer.`;
  }

  root.addEventListener('click', (event) => {
    const target = event.target as Element;
    const site = target.closest<HTMLElement>('[data-site]');
    if (site) {
      call.start((signal) => dispatch(site, signal));
      return;
    }
    const button = target.closest<HTMLButtonElement>('[data-eng]');
    if (!button) return;
    const engineer = engineers[Number(button.dataset.eng)];
    call.stop();
    clearCall();
    engineer.on = !engineer.on;
    label(engineer);
    say.textContent = `Engineer ${engineer.n} is now ${engineer.on ? 'clocked in and can get calls' : 'off duty and gets no calls'}.`;
  });

  if (!reduced()) {
    onceVisible(root, () => {
      const first = root.querySelector<HTMLElement>('[data-site="B"]');
      if (first) call.start((signal) => dispatch(first, signal));
    });
  }
}
