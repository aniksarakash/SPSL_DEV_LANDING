// Working model for Package Studio: a flat sheet of driver and settings folds
// into one signed package. The fold is done with CSS transforms. This script
// sets the state and walks through the build steps.
import { onceVisible, pick, reduced, runner, wait } from './kit';

type Format = 'msi' | 'exe' | 'pkg';

const OUT: Record<Format, { lid: string; file: string; text: string }> = {
  msi: { lid: 'MSI', file: 'office-printer.msi', text: 'It is ready for Intune, GPO or SCCM.' },
  exe: { lid: 'EXE', file: 'office-printer.exe', text: 'It is ready for Intune, GPO or SCCM.' },
  pkg: { lid: 'PKG', file: 'office-printer.pkg', text: 'It was built on Windows and is ready for an MDM tool.' },
};

export default function init(root: HTMLElement): void {
  const say = pick(root, '[data-say]');
  const lid = pick(root, '[data-lid]');
  const seal = pick(root, '.pkg__seal');
  const buildButton = pick<HTMLButtonElement>(root, '[data-build]');
  const steps = [...root.querySelectorAll<HTMLElement>('[data-steps] li')];
  const build = runner();

  const format = (): Format =>
    (root.querySelector<HTMLInputElement>('input[name="pkg-format"]:checked')?.value as Format) ?? 'msi';

  function setStep(index: number): void {
    steps.forEach((li, i) => {
      if (i < index) li.dataset.s = 'done';
      else if (i === index) li.dataset.s = 'now';
      else delete li.dataset.s;
      if (i === index) li.setAttribute('aria-current', 'step');
      else li.removeAttribute('aria-current');
    });
  }

  function flat(): void {
    root.dataset.fold = '0';
    root.removeAttribute('data-sealed');
    seal.classList.remove('is-landing');
    lid.textContent = OUT[format()].lid;
    setStep(-1);
  }

  async function run(signal: AbortSignal): Promise<void> {
    const out = OUT[format()];
    const pause = reduced() ? 200 : 620;
    flat();
    buildButton.textContent = 'Build it again';

    setStep(0);
    say.textContent = 'Analyse: the builder reads the vendor driver and finds the models in it.';
    await wait(pause, signal);

    setStep(1);
    say.textContent = 'Configure: connection, queue, defaults and driver settings go on the sheet.';
    await wait(pause, signal);

    setStep(2);
    root.dataset.fold = '1';
    say.textContent = `Build: the sheet folds into one ${out.lid} package.`;
    await wait(reduced() ? pause : 1050, signal);

    setStep(3);
    root.setAttribute('data-sealed', '');
    seal.classList.add('is-landing');
    say.textContent = 'Sign: the package gets its signature.';
    await wait(pause, signal);

    setStep(4);
    say.textContent = 'Verify: the builder checks the signature.';
    await wait(pause, signal);

    setStep(5);
    say.innerHTML = `<strong>${out.file}</strong> is signed and verified. It installs with no questions. ${out.text}`;
  }

  buildButton.addEventListener('click', () => build.start(run));
  root.addEventListener('change', (event) => {
    if ((event.target as HTMLInputElement).name !== 'pkg-format') return;
    build.stop();
    flat();
    buildButton.textContent = 'Build the package';
    say.textContent = `The sheet is flat again, with the ${OUT[format()].lid} format chosen. Build the package.`;
  });

  if (reduced()) return;
  flat();
  say.textContent = 'A vendor driver is on the sheet. Choose a format and build the package.';
  onceVisible(root, () => build.start(run));
}
