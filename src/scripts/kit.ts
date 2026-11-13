// Small helpers that the five working models share.

/** True when the device asks for reduced motion. Read at the time of use. */
export const reduced = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** A pause that ends early, with a rejection, when the signal aborts. */
export function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true },
    );
  });
}

/**
 * Runs one sequence at a time. A new sequence, or stop(), ends the one that is
 * running. This keeps every working model interruptible.
 */
export function runner() {
  let current: AbortController | null = null;
  return {
    stop(): void {
      current?.abort();
      current = null;
    },
    start(sequence: (signal: AbortSignal) => Promise<void>): void {
      current?.abort();
      const mine = new AbortController();
      current = mine;
      sequence(mine.signal)
        .catch(() => {
          // An aborted sequence is the normal way to stop.
        })
        .finally(() => {
          if (current === mine) current = null;
        });
    },
  };
}

/** Calls fn once, when the element first crosses the middle of the screen. */
export function onceVisible(el: Element, fn: () => void): void {
  const io = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        fn();
      }
    },
    { rootMargin: '-30% 0px -30% 0px' },
  );
  io.observe(el);
}

/** Finds an element inside a working model. The markup is ours, so it exists. */
export function pick<T extends Element = HTMLElement>(root: ParentNode, selector: string): T {
  return root.querySelector<T>(selector) as T;
}
