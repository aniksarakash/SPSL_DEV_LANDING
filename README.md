<div align="center">

<img src="docs/readme/logo-ink.webp" width="340" alt="Smart Printing Solutions Ltd. The logo forms out of blue ink." />

<img src="docs/readme/banner.svg" width="100%" alt="Developments. Five jobs in proof. Software in development at Smart Printing Solutions Ltd. Five projects, all ongoing." />

<p>
  <img src="https://img.shields.io/badge/status-live-0C52A3?style=for-the-badge" alt="Status: live" />
  <img src="https://img.shields.io/badge/projects-5%20ongoing-F03C24?style=for-the-badge" alt="5 projects ongoing" />
  <img src="https://img.shields.io/badge/Lighthouse-100%20%C2%B7%20100%20%C2%B7%20100%20%C2%B7%20100-0C52A3?style=for-the-badge&logo=lighthouse&logoColor=white" alt="Lighthouse: 100 in all four categories" />
  <img src="https://img.shields.io/badge/WCAG-2.2%20AA-0B1317?style=for-the-badge" alt="WCAG 2.2 AA" />
</p>

<p>
  <img src="https://img.shields.io/badge/Astro-7.4-0B1317?style=flat-square&logo=astro&logoColor=white" alt="Astro 7.4" />
  <img src="https://img.shields.io/badge/TypeScript-strict-0C52A3?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Node.js-22%2B-0C52A3?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node.js 22 or later" />
  <img src="https://img.shields.io/badge/CSS-scroll--driven%20animation-0C52A3?style=flat-square&logo=css&logoColor=white" alt="CSS scroll-driven animation" />
  <img src="https://img.shields.io/badge/Cloudflare-Tunnel-F03C24?style=flat-square&logo=cloudflare&logoColor=white" alt="Cloudflare Tunnel" />
  <img src="https://img.shields.io/badge/server%20dependencies-0-0B1317?style=flat-square" alt="Server dependencies: 0" />
  <img src="https://img.shields.io/badge/inbound%20ports-0-0B1317?style=flat-square" alt="Inbound ports: 0" />
</p>

<p>
  <a href="#the-idea">The idea</a> ·
  <a href="#the-five-jobs">The five jobs</a> ·
  <a href="#measured">Measured</a> ·
  <a href="#how-the-page-loads">How it loads</a> ·
  <a href="#how-the-page-is-served">How it is served</a> ·
  <a href="#how-it-recovers">How it recovers</a> ·
  <a href="#quick-start">Quick start</a>
</p>

</div>

---

## The idea

The page is a printer's **proof sheet**. A proof is the print that you check
before the full run, and these five projects are software that is still being
checked.

- The whole page is printed in **two inks**, the brand blue and the brand red, on white stock.
- Headings are set from **two plates** that slide into register as you scroll.
- **Crop marks** sit in the corners of the screen. The **colour bar** at the edge is the navigation.
- The logo forms out of ink, in a film that loops.
- Each project has a **working model** in place of a screenshot.

## The five jobs

<img src="docs/readme/models.svg" width="100%" alt="The five working models: Stock, Cheques, Claims, Tickets and Packages." />

| Job | What the working model shows | Status on the page |
| --- | --- | --- |
| **Stock** | A stock ledger. Each line is sealed to the line before it, so an edit to a past line is found. | ![Built. Preparing go-live.](https://img.shields.io/badge/built-preparing%20go--live-0C52A3?style=flat-square) |
| **Cheques** | A test rig. A synthetic cheque book goes to a simulated printer. The rig finds a duplicate, missing or misordered sheet. | ![In progress.](https://img.shields.io/badge/in%20progress-not%20on%20a%20real%20printer-F03C24?style=flat-square) |
| **Claims** | One claim collects its signatures stage by stage and becomes a printed bill. | ![Built.](https://img.shields.io/badge/built-0C52A3?style=flat-square) |
| **Tickets** | A dispatch map. A complaint goes to the closest engineer who is clocked in. | ![Upgrade in progress.](https://img.shields.io/badge/upgrade-in%20progress-F03C24?style=flat-square) |
| **Packages** | A carton net. The driver and its settings fold into one signed package. | ![Version 3.8.1.](https://img.shields.io/badge/version-3.8.1-0B1317?style=flat-square) |

All data in the working models is made up.

## Measured

<img src="docs/readme/scores.svg" width="100%" alt="Lighthouse on a throttled phone: 100 for performance, accessibility, best practices and SEO. Largest paint 1.1 seconds against a limit of 2.0. Press to paint 136 milliseconds against a limit of 200. Layout shift 0 against a limit of 0.05." />

<img src="docs/readme/weight.svg" width="100%" alt="Page weight: 247 kilobytes compressed. Fonts 110, logo film 89, images 28, HTML and CSS 13, scripts 8." />

| Check | Result | Limit |
| --- | --- | --- |
| Lighthouse, throttled phone | 100 in all four categories | |
| Largest Contentful Paint | 1.1 s | 2.0 s |
| Press to next paint, CPU slowed 4× | 136 ms | 200 ms |
| Cumulative Layout Shift | 0 | 0.05 |
| axe scan of the whole page | 0 violations | 0 |
| Touch targets under 48 px | none | none |

## How the page loads

Only the first screen is needed for the first paint. Everything else waits for
its turn.

```mermaid
%%{init: {"theme":"base","themeVariables":{"primaryColor":"#0C52A3","primaryTextColor":"#0B1317","primaryBorderColor":"#0B1317","lineColor":"#F03C24","secondaryColor":"#F7F9FA","tertiaryColor":"#E9EEF2","edgeLabelBackground":"#F7F9FA","clusterBkg":"#F7F9FA","clusterBorder":"#0C52A3","titleColor":"#0B1317","fontFamily":"Arial, sans-serif"}}}%%
flowchart LR
    A(["Request"]) --> B["One HTML file.<br/>Styles are inside it."]
    B --> C["One font file,<br/>loaded early"]
    C --> D{{"First paint<br/>1.1 s on a slow phone"}}
    D --> E["After the page has loaded:<br/>the logo film"]
    D --> F["When a job comes near the screen:<br/>the script of its working model"]
    D --> G["While a job is far from the screen:<br/>the browser does not lay it out"]

    classDef default fill:#0C52A3,stroke:#0B1317,color:#FFFFFF
    classDef red fill:#F03C24,stroke:#0B1317,color:#FFFFFF
    classDef paper fill:#F7F9FA,stroke:#0C52A3,color:#0B1317
    class D red
    class E,F,G paper
```

## How the page is served

The machine opens no inbound ports. `cloudflared` makes an outbound connection
to Cloudflare, and visitors come down that connection.

```mermaid
%%{init: {"theme":"base","themeVariables":{"primaryColor":"#0C52A3","primaryTextColor":"#0B1317","primaryBorderColor":"#0B1317","lineColor":"#F03C24","secondaryColor":"#F7F9FA","tertiaryColor":"#E9EEF2","edgeLabelBackground":"#F7F9FA","clusterBkg":"#F7F9FA","clusterBorder":"#0C52A3","titleColor":"#0B1317","fontFamily":"Arial, sans-serif"}}}%%
flowchart TD
    V(["Visitor"]) -- "HTTPS" --> E["Cloudflare edge"]
    E -- "tunnel, opened from inside" --> C

    subgraph M["This machine. No inbound ports."]
        C["cloudflared<br/>Windows service"] -- "HTTP on the loopback address" --> S["Local web server<br/>scheduled task"]
        S --> D[("dist/<br/>the built page")]
    end

    classDef default fill:#0C52A3,stroke:#0B1317,color:#FFFFFF
    classDef red fill:#F03C24,stroke:#0B1317,color:#FFFFFF
    classDef paper fill:#FFFFFF,stroke:#0C52A3,color:#0B1317
    class E red
    class D paper
```

The local server has no dependencies. It sends pre-compressed files, gives
hashed assets a one-year cache, sends byte ranges for the logo film, sets
security headers, and sends a visitor who came over plain HTTP to HTTPS.

## How it recovers

After a power loss or a restart, the page comes back with no sign-in.

```mermaid
%%{init: {"theme":"base","themeVariables":{"primaryColor":"#0C52A3","primaryTextColor":"#0B1317","primaryBorderColor":"#0B1317","lineColor":"#F03C24","secondaryColor":"#F7F9FA","tertiaryColor":"#E9EEF2","edgeLabelBackground":"#F7F9FA","clusterBkg":"#F7F9FA","clusterBorder":"#0C52A3","titleColor":"#0B1317","fontFamily":"Arial, sans-serif"}}}%%
flowchart TD
    P(["Power returns, or Windows restarts"]) --> W["Windows starts"]
    W --> A["Service: cloudflared<br/>automatic, delayed start"]
    W --> B["Scheduled task: local web server<br/>runs at startup"]

    A --> T{"Tunnel connected?"}
    T -- "no" --> R1["Windows restarts the service<br/>after 5 s, 5 s, then every 30 s"]
    R1 --> T

    B --> L{"Server listening?"}
    L -- "no" --> R2["The task fires again<br/>every 5 minutes"]
    R2 --> L

    T -- "yes" --> OK(["The page is live"])
    L -- "yes" --> OK

    classDef default fill:#0C52A3,stroke:#0B1317,color:#FFFFFF
    classDef red fill:#F03C24,stroke:#0B1317,color:#FFFFFF
    classDef paper fill:#F7F9FA,stroke:#0C52A3,color:#0B1317
    class OK red
    class R1,R2 paper
```

| Test | Result |
| --- | --- |
| `cloudflared` was killed | A new process started after 5.2 s. The page answered again 1.5 s later. |
| The local web server was killed | The scheduled task started it again after 71 s. The worst case is 5 minutes. |

## From an edit to the live page

```mermaid
%%{init: {"theme":"base","themeVariables":{"primaryColor":"#0C52A3","primaryTextColor":"#0B1317","primaryBorderColor":"#0B1317","lineColor":"#F03C24","secondaryColor":"#F7F9FA","tertiaryColor":"#E9EEF2","edgeLabelBackground":"#F7F9FA","clusterBkg":"#F7F9FA","clusterBorder":"#0C52A3","titleColor":"#0B1317","fontFamily":"Arial, sans-serif"}}}%%
flowchart LR
    E["Edit a file<br/>in src/"] --> B["npm run build<br/>Astro makes static<br/>HTML, CSS and scripts"]
    B --> D[("dist/<br/>with Brotli and<br/>gzip copies")]
    D --> L(["Live at once.<br/>The server reads dist/<br/>on each request."])

    classDef default fill:#0C52A3,stroke:#0B1317,color:#FFFFFF
    classDef red fill:#F03C24,stroke:#0B1317,color:#FFFFFF
    classDef paper fill:#FFFFFF,stroke:#0C52A3,color:#0B1317
    class L red
    class D paper
```

To change a status, edit `src/data/jobs.ts`, then set `PROOF_DATE` in the same
file to the day of the change. Every status on the page says "as of" that date.
The hero counts the projects from the same file.

## Quick start

You need Node.js 22.12 or later, and npm.

Install the packages once:

```bash
npm ci
```

Work on the page with live reload:

```bash
npm run dev
```

Build the static page into `dist/`:

```bash
npm run build
```

Serve the built page on `http://localhost:4321`:

```bash
npm run serve
```

Put the page on a public hostname through a Cloudflare Tunnel, with services
that start with Windows and recover by themselves:

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
| `src/lib/fonts.ts` | The typefaces, and the fallback faces that stop the page from jumping while a font loads. |
| `src/styles/global.css` | Inks, type, motion and the parts that sections share. |
| `server/serve.mjs` | The local web server. |
| `scripts/` | Build helpers, the Windows start script and the service installer. |
| `tunnel/` | The Cloudflare Tunnel config template and notes. |
| `docs/readme/` | The animated graphics of this file. Their text is drawn as outlines of the page's own typefaces. |

## Standards

- WCAG 2.2 AA: contrast, visible focus, keyboard use, text alternatives.
- Touch targets are at least 48 px.
- When the device asks for reduced motion, the working models do not play by
  themselves and show their result at once. The meaning stays.
- The logo film loops on every device. Pressing the logo pauses it and shows
  the still logo.
- Fonts, images and scripts are served from this site. The one third-party
  request is Cloudflare Web Analytics, which the Cloudflare zone adds to the
  page. It sets no cookies. To block it, remove its two hosts from the
  `Content-Security-Policy` in `server/serve.mjs`.

---

<div align="center">

<img src="docs/readme/credit.svg" width="100%" alt="Built with love by Anik Sarker Akash. Automate the boring. Build the rare." />

Designed and developed by **Anik Sarker Akash**

</div>
