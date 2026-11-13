# Five jobs in proof

The landing page for five pieces of software that Smart Printing Solutions Ltd.
(SPSL) has in development. It says what each one does and where it stands.

## The idea

The page is a printer's proof sheet. A proof is the print that you check before
the full run, and these five projects are software that is still being checked.
The whole page is printed in two inks, the brand blue and the brand red, on
white stock. Headings are set from two plates that slide into register as you
scroll. Crop marks sit in the corners of the screen, and the colour bar at the
edge is the navigation.

Each project has a working model in place of a screenshot:

| Job | Working model |
| --- | --- |
| Stock | A small stock ledger. Each line is sealed to the line before it, so an edit to a past line is found. |
| Cheques | A test rig. A synthetic cheque book goes to a simulated printer, and the rig finds a duplicate, missing or misordered sheet. |
| Claims | One claim collects its signatures stage by stage and becomes a printed bill. |
| Tickets | A dispatch map. A complaint goes to the closest engineer who is clocked in. |
| Packages | A carton net. The driver and its settings fold into one signed package. |

All data in the working models is made up.

## Requirements

- Windows, macOS or Linux
- Node.js 22.12 or later
- npm

## Commands

Install the packages once:

```bash
npm ci
```

Work on the page with live reload:

```bash
npm run dev
```

Build the static page into `dist/`, with Brotli and gzip copies of each text file:

```bash
npm run build
```

Serve the built page on `http://localhost:4321`:

```bash
npm run serve
```

On Windows, one script builds when needed and then serves:

```powershell
.\scripts\start.ps1
```

## Hosting

The page is static. The server in `server/serve.mjs` has no dependencies. It
listens on `localhost` only, sends the pre-compressed files, gives hashed assets
a one-year cache, and sets security headers.

The page reaches the internet through a Cloudflare Tunnel, so this machine
opens no inbound ports. One script creates the tunnel and the DNS record, and
installs two services that start with Windows and recover by themselves:

```powershell
.\scripts\install-service.ps1 -Hostname <hostname>
```

The details, the steps by hand and the handling of secrets are in
[tunnel/README.md](tunnel/README.md).

## Where things are

| Path | What it holds |
| --- | --- |
| `src/data/jobs.ts` | Name, one-line description and status of each job. The hero, the navigation and the sections read from it. |
| `src/components/jobs/` | One file for each job: the working model and the notes. |
| `src/scripts/` | The behaviour of each working model. Each script loads when its model comes near the screen. |
| `src/lib/e13b.ts` | The characters of the magnetic ink line on the cheque. |
| `src/styles/global.css` | Inks, type, motion and the parts that sections share. |
| `server/serve.mjs` | The local web server. |
| `scripts/` | Build helpers and the Windows start script. |
| `tunnel/` | The Cloudflare Tunnel config template and notes. |

## To change a status

Edit `src/data/jobs.ts`, then set `PROOF_DATE` in the same file to the day of
the change. Every status on the page says "as of" that date.

## Standards

- WCAG 2.2 AA: contrast, visible focus, keyboard use, text alternatives.
- Touch targets are at least 48 px.
- When the device asks for reduced motion, the working models do not play by
  themselves and show their result at once. The meaning stays.
- No third-party requests. Fonts are served from this site.

## Author

Designed and developed by **Anik Sarker Akash**.

*Automate the boring. Build the rare.*
