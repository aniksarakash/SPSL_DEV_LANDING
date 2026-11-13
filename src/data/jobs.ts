// The five jobs on the proof sheet. The hero index, the colour-bar navigation
// and the sections all read from this list, so a status changes in one place.
export interface JobSummary {
  id: string;
  name: string;
  short: string;
  line: string;
  status: string;
}

export const PROOF_DATE = '14 November 2026';
export const PROOF_DATE_ISO = '2026-11-14';

export const jobs: JobSummary[] = [
  {
    id: 'stock',
    name: 'SPSL Stock',
    short: 'Stock',
    line: 'Every toner cartridge accounted for, from the central warehouse to the desk that uses it.',
    status: 'Built. Preparing go-live.',
  },
  {
    id: 'cheques',
    name: 'MICR cheque printing',
    short: 'Cheques',
    line: 'A legacy cheque printing program, taken over and being made safe to change.',
    status: 'In progress. Not yet on a real printer.',
  },
  {
    id: 'conveyance',
    name: 'SPSL Conveyance',
    short: 'Claims',
    line: 'Travel and food allowance claims for field engineers, signed stage by stage.',
    status: 'Built.',
  },
  {
    id: 'ticketing',
    name: 'SPSL Ticketing',
    short: 'Tickets',
    line: 'The field service platform, from a customer complaint to a signed-off job. Its interface is being redesigned.',
    status: 'Upgrade in progress.',
  },
  {
    id: 'packages',
    name: 'Package Studio',
    short: 'Packages',
    line: 'Any printer driver in, a signed and silent installer out, in a browser.',
    status: 'Version 3.8.1.',
  },
];
