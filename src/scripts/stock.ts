// Working model for SPSL Stock.
// Rules it shows: stock changes only through movements, a desk swaps an empty
// for a new cartridge, an early swap is flagged, and the log is sealed line by
// line so an edit to a past line is found.
import { onceVisible, pick, reduced, runner, wait } from './kit';

interface Row {
  text: string;
  flag?: string;
  seal: string;
}

// A short seal for the demonstration. Each seal is made from the line's text
// and the seal of the line before it.
function sealOf(previous: string, text: string): string {
  let h = 0x811c9dc5;
  for (const ch of `${previous}|${text}`) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0').slice(0, 4);
}

export default function init(root: HTMLElement): void {
  const say = pick(root, '[data-say]');
  const ledger = pick(root, '[data-ledger]');
  const gauge = pick(root, '[data-gauge]');
  const level = pick(root, '[data-level]');
  const editButton = pick<HTMLButtonElement>(root, '[data-act="edit"]');
  const auto = runner();

  const stock = { wFull: 4, wEmpty: 0, bFull: 1, bEmpty: 0, level: 100 };
  const rows: Row[] = [];
  let edited = false;
  let fresh = '';

  const add = (text: string, flag?: string): void => {
    rows.push({ text, flag, seal: sealOf(rows.at(-1)?.seal ?? '0000', text) });
  };
  add('6 full. Received at Central warehouse');
  add('2 full. Central warehouse to Branch store');
  add('1 full. Branch store to Desk printer');

  const carts = (full: number, empty: number): string =>
    '<i class="cart"></i>'.repeat(full) + '<i class="cart cart--empty"></i>'.repeat(empty);

  function render(): void {
    for (const [key, full, empty] of [
      ['w', stock.wFull, stock.wEmpty],
      ['b', stock.bFull, stock.bEmpty],
    ] as const) {
      const shelf = pick(root, `[data-shelf="${key}"]`);
      shelf.innerHTML = carts(full, empty);
      if (fresh === key) shelf.lastElementChild?.classList.add('is-new');
      pick(root, `[data-count="${key}"]`).textContent = `${full} full, ${empty} empty`;
    }
    gauge.style.transform = `scaleY(${stock.level / 100})`;
    level.textContent = String(stock.level);

    // Long logs show the first three lines and the last three.
    const shown = rows.map((row, i) => ({ row, i }));
    const visible = shown.length > 7 ? [...shown.slice(0, 3), null, ...shown.slice(-3)] : shown;
    ledger.replaceChildren(
      ...visible.map((item) => {
        const li = document.createElement('li');
        if (!item) {
          li.innerHTML = `<span></span><span class="stk__more">${rows.length - 6} more lines</span>`;
          return li;
        }
        const { row, i } = item;
        const broken = edited && i >= 1;
        const text = edited && i === 1 ? '3 full. Central warehouse to Branch store' : row.text;
        li.className = broken ? 'is-broken' : '';
        if (i === rows.length - 1 && fresh) li.classList.add('is-new');
        li.innerHTML =
          `<span class="stk__n">${String(i + 1).padStart(2, '0')}</span>` +
          `<span class="stk__t">${text}</span>` +
          `<span class="stk__h">seal ${row.seal}</span>` +
          (row.flag ? `<span class="stk__flag">Flag: ${row.flag}</span>` : '') +
          (broken ? `<span class="stk__x">${i === 1 ? 'Edited. The seal does not match.' : 'In doubt. The chain is broken above.'}</span>` : '');
        return li;
      }),
    );
    editButton.setAttribute('aria-pressed', String(edited));
    editButton.textContent = edited ? 'Put the line back' : 'Edit a past line';
    fresh = '';
  }

  const actions = {
    print(): void {
      if (stock.level === 0) {
        say.textContent = 'The cartridge is empty. The desk can swap it for a new one.';
        return;
      }
      stock.level = Math.max(0, stock.level - 35);
      say.textContent =
        stock.level === 0
          ? 'The cartridge is empty. The desk can swap it for a new one.'
          : `The printer used toner. ${stock.level}% is left. Printing is not a stock movement, so the log does not change.`;
    },
    swap(): void {
      if (stock.bFull === 0) {
        say.textContent = 'Refused. The branch store has no full cartridge. Send one from the warehouse first.';
        return;
      }
      const early = stock.level > 0;
      add(
        '1 empty in, 1 full out. Desk printer and Branch store',
        early ? `replaced early, with ${stock.level}% left. Checked against the rated yield.` : undefined,
      );
      stock.bFull -= 1;
      stock.bEmpty += 1;
      stock.level = 100;
      fresh = 'b';
      say.textContent = early
        ? 'Swapped, and flagged. The cartridge came back before it reached its rated yield.'
        : 'Swapped. The desk gave back the empty and got a full cartridge.';
    },
    send(): void {
      if (stock.wFull === 0) {
        say.textContent = 'Refused. The central warehouse has no full cartridge.';
        return;
      }
      add('1 full. Central warehouse to Branch store');
      stock.wFull -= 1;
      stock.bFull += 1;
      fresh = 'b';
      if (stock.bEmpty > 0) {
        add(`${stock.bEmpty} empty. Branch store to Central warehouse`);
        stock.wEmpty += stock.bEmpty;
        stock.bEmpty = 0;
        say.textContent = 'One full cartridge went to the branch. The empties came back on the same trip.';
      } else {
        say.textContent = 'One full cartridge went to the branch store.';
      }
    },
    edit(): void {
      edited = !edited;
      say.innerHTML = edited
        ? 'Someone changed line 02. <span class="bad">The check finds it:</span> the seal of line 02 no longer matches, and every line after it is in doubt.'
        : 'The original line is back. Every seal matches.';
    },
  };

  root.addEventListener('click', (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>('[data-act]');
    if (!button) return;
    auto.stop();
    actions[button.dataset.act as keyof typeof actions]();
    render();
  });

  render();

  // Play the main rule once when the model comes on screen.
  if (!reduced()) {
    onceVisible(root, () =>
      auto.start(async (signal) => {
        for (const step of ['print', 'print', 'print', 'swap', 'send'] as const) {
          await wait(step === 'print' ? 650 : 1100, signal);
          actions[step]();
          render();
        }
      }),
    );
  }
}
