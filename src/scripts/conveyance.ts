// Working model for SPSL Conveyance: one claim collects its signatures.
// Rules it shows: the claim moves one stage at a time, a larger amount adds a
// stage, the log only grows, and the bill has a box for each stage that signed.
import { onceVisible, pick, reduced, runner, wait } from './kit';

interface Stage {
  box?: string;
  button: string;
  log: string;
  say: string;
}

export default function init(root: HTMLElement): void {
  const next = pick<HTMLButtonElement>(root, '[data-next]');
  const tierInput = pick<HTMLInputElement>(root, '[data-tier]');
  const say = pick(root, '[data-say]');
  const log = pick(root, '[data-log]');
  const total = pick(root, '[data-total]');
  const longTrip = pick(root, '[data-long]');
  const approved = pick(root, '[data-stamp="approved"]');
  const processed = pick(root, '[data-stamp="processed"]');
  const auto = runner();

  let step = 0;
  let tier = false;

  const flow = (): Stage[] => [
    { button: 'Submit the claim', log: 'Submitted by the engineer', say: 'Submitted. The claim waits for the Team Leader.' },
    { box: 'tl', button: 'Team Leader signs', log: 'Team Leader reviewed', say: 'The Team Leader signed. The claim waits for Audit.' },
    { box: 'audit', button: 'Audit signs', log: 'Audit reviewed', say: 'Audit signed. The claim waits for the Manager.' },
    {
      box: 'mgr',
      button: 'Manager signs',
      log: 'Manager approved',
      say: tier
        ? 'The Manager signed. The amount is above the tier, so the claim waits for the Technical Head.'
        : 'The Manager signed. The claim is approved and waits for Accounts.',
    },
    ...(tier
      ? [
          {
            box: 'tier',
            button: 'Technical Head signs',
            log: 'Technical Head approved the amount tier',
            say: 'The Technical Head signed. The claim is approved and waits for Accounts.',
          },
        ]
      : []),
    {
      button: 'Accounts marks it processed',
      log: 'Accounts marked it processed',
      say: 'Accounts marked the claim processed. The bill prints with one signature box for each stage that signed.',
    },
  ];

  function render(landed?: HTMLElement): void {
    const stages = flow();
    const amount = tier ? '৳ 2,190' : '৳ 390';
    total.textContent = amount;
    longTrip.hidden = !tier;

    const signed = new Set(stages.slice(0, step).map((s) => s.box));
    root.querySelectorAll<HTMLElement>('[data-box]').forEach((box) => {
      const key = box.dataset.box!;
      box.hidden = key === 'tier' && !tier;
      box.toggleAttribute('data-signed', signed.has(key));
      pick(box, '[data-state]').textContent = signed.has(key) ? 'Signed' : 'Waiting';
    });

    const lastApproval = stages.length - 1;
    approved.hidden = step < lastApproval;
    processed.hidden = step < stages.length;
    for (const stamp of [approved, processed]) stamp.classList.toggle('is-landing', stamp === landed);

    log.replaceChildren(
      ...stages.slice(0, step).map((s, i) => {
        const li = document.createElement('li');
        li.textContent = `${i + 1}. ${s.log}. Total ${amount}`;
        if (i === step - 1) li.className = 'is-new';
        return li;
      }),
    );

    next.textContent = stages[step]?.button ?? 'Start a new claim';
    root.dataset.step = String(step);
  }

  function advance(): void {
    const stages = flow();
    if (step >= stages.length) {
      step = 0;
      render();
      say.textContent = 'A new draft claim. The engineer loads the calls of the day and submits it.';
      return;
    }
    const done = stages[step];
    step += 1;
    say.textContent = done.say;
    render(step === stages.length ? processed : step === stages.length - 1 ? approved : undefined);
  }

  next.addEventListener('click', () => {
    auto.stop();
    advance();
  });

  tierInput.addEventListener('change', () => {
    auto.stop();
    tier = tierInput.checked;
    step = 0;
    render();
    say.textContent = tier
      ? 'The total changed, so this is a new draft. Above the amount tier, one more person must sign.'
      : 'The total changed, so this is a new draft. Below the amount tier, the Manager is the last signer.';
  });

  if (reduced()) {
    // Keep the finished bill from the page, and let the visitor start again.
    step = flow().length;
    render();
    return;
  }

  render();
  say.textContent = 'A draft claim. The engineer loads the calls of the day and submits it.';
  onceVisible(root, () =>
    auto.start(async (signal) => {
      while (step < flow().length) {
        await wait(950, signal);
        advance();
      }
    }),
  );
}
