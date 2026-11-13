// Working model for the cheque printing job: the test rig.
// A synthetic book of eight sheets goes to a simulated printer. The rig reads
// the serial of each sheet and compares it with the job. The visitor can put a
// fault in the job to see that the rig reports it.
import { CELL, micrPath, serial7 } from '../lib/e13b';
import { onceVisible, pick, reduced, runner, wait } from './kit';

type Fault = 'none' | 'duplicate' | 'missing' | 'order';

const FIRST = 101;
const COUNT = 8;

function sheetsFor(fault: Fault): number[] {
  const book = Array.from({ length: COUNT }, (_, i) => FIRST + i);
  if (fault === 'duplicate') book.splice(4, 0, book[3]);
  if (fault === 'missing') book.splice(3, 1);
  if (fault === 'order') [book[2], book[3]] = [book[3], book[2]];
  return book.slice(0, COUNT);
}

const REPORT: Record<Exclude<Fault, 'none'>, string> = {
  duplicate: 'a sheet came twice',
  missing: 'a sheet is missing',
  order: 'the sheets are out of order',
};

export default function init(root: HTMLElement): void {
  const leaf = pick(root, '[data-leaf]');
  const serial = pick<SVGPathElement>(root, '[data-serial]');
  const micr = pick<SVGElement>(root, '[data-micr]');
  const leafNo = pick(root, '[data-leafno]');
  const tray = pick(root, '[data-tray]');
  const say = pick(root, '[data-say]');
  const runButton = pick<HTMLButtonElement>(root, '[data-run]');
  const job = runner();

  const fault = (): Fault =>
    (root.querySelector<HTMLInputElement>('input[name="chq-fault"]:checked')?.value as Fault) ?? 'none';

  function show(n: number): void {
    const text = serial7(n);
    serial.setAttribute('d', micrPath(text, CELL));
    micr.setAttribute('aria-label', `Magnetic ink character line. Serial ${text}.`);
    leafNo.textContent = text;
  }

  async function run(signal: AbortSignal): Promise<void> {
    const kind = fault();
    const sheets = sheetsFor(kind);
    tray.replaceChildren();
    say.textContent = 'The program sends the job to the simulated printer.';
    runButton.textContent = 'Run the job again';

    for (let i = 0; i < sheets.length; i += 1) {
      await wait(reduced() ? 90 : 300, signal);
      const got = sheets[i];
      const expected = FIRST + i;
      show(got);
      if (!reduced()) {
        leaf.animate(
          [
            { transform: 'translate3d(0, -18%, 0) rotate(-1.2deg)', opacity: 0 },
            { transform: 'none', opacity: 1 },
          ],
          { duration: 230, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
        );
      }
      const chip = document.createElement('li');
      chip.className = 'chq__chip is-new';
      chip.textContent = serial7(got);
      tray.append(chip);

      if (got !== expected) {
        chip.classList.add('is-bad');
        chip.insertAdjacentHTML('beforeend', '<span class="vh"> does not match the job</span>');
        say.innerHTML =
          `Sheet ${i + 1} reads ${serial7(got)}. The job expects ${serial7(expected)}. ` +
          `<span class="bad">Rig report: ${REPORT[kind as Exclude<Fault, 'none'>]}.</span>`;
        return;
      }
    }
    say.textContent = `${COUNT} sheets expected. ${COUNT} received, in order. Rig report: no differences.`;
  }

  runButton.addEventListener('click', () => job.start(run));
  root.addEventListener('change', (event) => {
    if ((event.target as HTMLInputElement).name === 'chq-fault') job.start(run);
  });

  if (!reduced()) onceVisible(root, () => job.start(run));
}
