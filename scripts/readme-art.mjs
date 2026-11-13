// Draws the animated SVG graphics of the README into docs/readme/.
//
// All text is converted to outlines of the page's own typefaces, so the
// graphics look the same on every device. Animation is CSS inside each SVG.
// The animations always play, also when the device asks for reduced motion.
//
// The script needs the "fontkit" package, which the page itself does not use:
//
//   npm install --no-save fontkit
//   node scripts/readme-art.mjs
//
// The figures in the scores and page-weight charts are written in this file.
// Change them here after a new measurement, then run the script again.
import * as fontkit from 'fontkit';
import { mkdirSync, writeFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = `${ROOT}/docs/readme`;
mkdirSync(OUT, { recursive: true });

const archivo = fontkit.openSync(`${ROOT}/node_modules/@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2`);
const serif = fontkit.openSync(`${ROOT}/node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff2`);
const cache = new Map();
const face = (wdth, wght) => {
  const key = `${wdth}/${wght}`;
  if (!cache.has(key)) cache.set(key, archivo.getVariation({ wdth, wght }));
  return cache.get(key);
};

const C = { paper: '#f7f9fa', shade: '#e9eef2', blue: '#0c52a3', red: '#f03c24', redText: '#c22e18', over: '#0b1317', rule: '#b8cbe3', white: '#ffffff' };
const round = (d) => d.replace(/-?\d*\.\d+/g, (n) => String(Math.round(Number(n) * 10) / 10));

/** Text as one outline path. Returns the path data and the width. */
function outline(font, str, size, x, y, { anchor = 'start', tracking = 0 } = {}) {
  const run = font.layout(str);
  const s = size / font.unitsPerEm;
  const advances = run.positions.map((p) => p.xAdvance * s + tracking);
  const width = advances.reduce((a, b) => a + b, 0) - tracking;
  let cx = anchor === 'middle' ? x - width / 2 : anchor === 'end' ? x - width : x;
  let d = '';
  run.glyphs.forEach((glyph, i) => {
    d += glyph.path.scale(s, -s).translate(cx, y).toSVG();
    cx += advances[i];
  });
  return { d: round(d), width };
}
const T = (font, str, size, x, y, fill, opts = {}) => {
  const o = outline(font, str, size, x, y, opts);
  return `<path d="${o.d}" fill="${fill}"${opts.attrs ? ' ' + opts.attrs : ''}/>`;
};
const W = (font, str, size, opts = {}) => outline(font, str, size, 0, 0, opts).width;

const display = face(62, 850);
const label = face(88, 650);
const body = face(100, 400);
const small = face(88, 400);
const stampFace = face(78, 750);

const REDUCED = ''; // A rule for reduced motion would go here. The owner chose that motion always plays.
const svg = (w, h, title, style, inner) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${title}">` +
  `<title>${title}</title><style>${style}${REDUCED}</style>` +
  `<defs>${[['b3', C.blue, 2.3], ['b2', C.blue, 1.7], ['b1', C.blue, 1.1], ['r1', C.red, 1.1], ['r2', C.red, 1.7], ['r3', C.red, 2.3]]
    .map(([id, ink, r]) => `<pattern id="${id}" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="${r}" fill="${ink}"/></pattern>`)
    .join('')}</defs>` +
  `<rect width="${w}" height="${h}" rx="16" fill="${C.paper}"/>${inner}</svg>`;

const crops = (w, h, m = 16, len = 12) =>
  [[m, m, 1, 1], [w - m, m, -1, 1], [m, h - m, 1, -1], [w - m, h - m, -1, -1]]
    .map(([x, y, sx, sy]) => `<path d="M${x} ${y + sy * 4}v${sy * len}M${x + sx * 4} ${y}h${sx * len}" stroke="${C.blue}" stroke-width="1.5" fill="none"/>`)
    .join('');

const colourBar = (x, y, w, h) => {
  const fills = [C.blue, 'url(#b3)', 'url(#b2)', 'url(#b1)', C.over, 'url(#r1)', 'url(#r2)', 'url(#r3)', C.red];
  const gap = 4;
  const pw = (w - gap * (fills.length - 1)) / fills.length;
  return fills.map((f, i) => `<rect x="${(x + i * (pw + gap)).toFixed(1)}" y="${y}" width="${pw.toFixed(1)}" height="${h}" fill="${f}"/>`).join('');
};

/** A rubber stamp: a rotated outline box with text. Returns the markup and its width. */
function stamp(str, size, x, y, { dot = false, cls = '' } = {}) {
  const padX = size * 0.62;
  const dotSpace = dot ? size * 0.9 : 0;
  const tw = W(stampFace, str, size);
  const w = tw + padX * 2 + dotSpace;
  const h = size * 1.75;
  const text = T(stampFace, str, size, x + padX + dotSpace, y + h / 2 + size * 0.35, C.redText);
  const pulse = dot
    ? `<circle cx="${x + padX + size * 0.22}" cy="${y + h / 2}" r="${size * 0.3}" fill="${C.red}"/>` +
      `<circle class="pulse" cx="${x + padX + size * 0.22}" cy="${y + h / 2}" r="${size * 0.3}" fill="${C.red}"/>`
    : '';
  return {
    w,
    h,
    svg: `<g transform="rotate(-2.2 ${x} ${y + h / 2})"><g class="${cls}"><rect x="${x}" y="${y}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="${size * 0.28}" fill="none" stroke="${C.redText}" stroke-width="${Math.max(2, size * 0.1).toFixed(1)}"/>${pulse}${text}</g></g>`,
  };
}

// --------------------------------------------------------------------------- banner
{
  const Wd = 1200, H = 470, X = 64;
  const dev = outline(display, 'DEVELOPMENTS', 34, X, 100, { tracking: 2.6 });
  const ruleX = X + dev.width + 26;
  const st = stamp('5 projects ongoing', 25, ruleX + 250 + 26, 66, { dot: true });
  const l1 = outline(display, 'Five jobs', 168, X - 6, 270);
  const l2 = outline(display, 'in proof.', 168, X - 6, 410);
  const headline = `${l1.d}${l2.d}`;
  const px = 690;
  const para = ['Software in development at', 'Smart Printing Solutions Ltd.', 'Five projects. All ongoing.']
    .map((line, i) => T(i === 2 ? face(100, 650) : body, line, 27, px, 196 + i * 40, i === 2 ? C.blue : C.over))
    .join('');
  const note = T(small, 'Proof sheet. Two colours on white stock.', 16, Wd - X, 44, C.blue, { anchor: 'end' });
  const mx = 1096, my = 336;
  const mark = (ink, cls) =>
    `<g class="${cls}" fill="none" stroke="${ink}" stroke-width="2.2"><circle cx="${mx}" cy="${my}" r="17"/><path d="M${mx} ${my - 34}v68M${mx - 34} ${my}h68"/></g>`;
  const style =
    `.red{mix-blend-mode:multiply;animation:reg 8s cubic-bezier(.2,.8,.2,1) infinite}` +
    `@keyframes reg{0%{transform:translate(20px,-13px)}16%,80%{transform:translate(2.5px,-1.6px)}100%{transform:translate(20px,-13px)}}` +
    `.pulse{transform-box:fill-box;transform-origin:center;animation:pulse 2.2s ease-out infinite}` +
    `@keyframes pulse{0%{opacity:.6;transform:scale(1)}70%,100%{opacity:0;transform:scale(3)}}` +
    `.mk{mix-blend-mode:multiply;transform-box:fill-box;transform-origin:center;animation:mk 8s cubic-bezier(.2,.8,.2,1) infinite}` +
    `@keyframes mk{0%{transform:translate(7px,-5px) rotate(16deg)}16%,80%{transform:none}100%{transform:translate(7px,-5px) rotate(16deg)}}`;
  const inner =
    crops(Wd, H) +
    note +
    `<path d="${dev.d}" fill="${C.blue}"/>` +
    `<rect x="${ruleX.toFixed(1)}" y="88" width="250" height="1.6" fill="${C.blue}"/>` +
    st.svg +
    `<path d="${headline}" fill="${C.blue}"/><path class="red" d="${headline}" fill="${C.red}"/>` +
    para +
    mark(C.blue, '') + mark(C.red, 'mk') +
    colourBar(px, 396, Wd - X - px, 16);
  writeFileSync(`${OUT}/banner.svg`, svg(Wd, H, 'Developments. Five jobs in proof. Software in development at Smart Printing Solutions Ltd. Five projects, all ongoing.', style, inner));
}

// --------------------------------------------------------------------------- five working models
{
  const Wd = 1200, H = 348, tileW = 212, gap = 19, x0 = 32, y0 = 30, tileH = 288;
  const E13B = {
    '0': ['.#####.', '##...##', '##...##', '##...##', '##...##', '##...##', '##...##', '##...##', '.#####.'],
    '1': ['..##...', '..##...', '..##...', '..##...', '..##...', '.####..', '.####..', '.####..', '.####..'],
    '8': ['..###..', '..#.#..', '..#.#..', '..#.#..', '#######', '##...##', '##...##', '##...##', '#######'],
    A: ['##.....', '##..##.', '##..##.', '##.....', '##.....', '##.....', '##..##.', '##..##.', '##.....'],
    C: ['....###', '....###', '....###', '.......', '#.#....', '#.#....', '#.#....', '#.#....', '#.#....'],
  };
  const micr = (text) => {
    let d = '';
    [...text].forEach((ch, i) => (E13B[ch] ?? []).forEach((row, y) => {
      let x = 0;
      while (x < 7) {
        if (row[x] !== '#') { x += 1; continue; }
        let w = 0;
        while (x + w < 7 && row[x + w] === '#') w += 1;
        d += `M${i * 9 + x} ${y}h${w}v1h${-w}z`;
        x += w;
      }
    }));
    return d;
  };
  const head = (title, sub) => T(display, title, 30, 16, 44, C.over) + T(small, sub, 13.5, 16, 64, C.blue);
  const frame = `<rect width="${tileW}" height="${tileH}" rx="10" fill="${C.white}" stroke="${C.blue}" stroke-width="1.5"/>`;

  // 1. Stock
  const stock =
    head('STOCK', 'A ledger that cannot be edited') +
    [0, 1, 2].map((i) => `<rect x="${16 + i * 17}" y="98" width="12" height="27" rx="2" fill="${C.blue}"/>`).join('') +
    `<rect class="s-empty" x="67" y="98" width="12" height="27" rx="2" fill="none" stroke="${C.blue}" stroke-width="1.5" stroke-dasharray="3 2"/>` +
    `<rect x="160" y="84" width="34" height="62" rx="3" fill="none" stroke="${C.blue}" stroke-width="1.5"/>` +
    `<rect class="s-gauge" x="162" y="86" width="30" height="58" rx="1.5" fill="${C.blue}"/>` +
    T(small, 'Store', 12, 16, 142, C.over) + T(small, 'Desk', 12, 194, 162, C.over, { anchor: 'end' }) +
    [0, 1, 2, 3].map((i) =>
      `<g${i === 3 ? ' class="s-row"' : ''}><rect x="16" y="${186 + i * 22}" width="14" height="6" fill="${C.blue}"/>` +
      `<rect x="38" y="${186 + i * 22}" width="${[104, 86, 110, 94][i]}" height="6" fill="${C.rule}"/>` +
      `<rect x="164" y="${186 + i * 22}" width="30" height="6" fill="${C.blue}"/>` +
      `<rect x="16" y="${198 + i * 22}" width="178" height="1" fill="${C.rule}"/></g>`).join('');

  // 2. Cheques
  const line = 'C0000108C A000000';
  const cheques =
    head('CHEQUES', 'A rig that counts every sheet') +
    `<rect x="19" y="87" width="180" height="96" rx="2" fill="${C.rule}"/>` +
    `<rect x="16" y="84" width="180" height="96" rx="2" fill="${C.white}" stroke="${C.blue}" stroke-width="1.5"/>` +
    `<rect x="26" y="104" width="96" height="1.2" fill="${C.rule}"/><rect x="26" y="120" width="120" height="1.2" fill="${C.rule}"/>` +
    `<rect x="146" y="98" width="40" height="22" fill="none" stroke="${C.rule}" stroke-width="1.2"/>` +
    `<path transform="translate(26 152) scale(1.04)" d="${micr(line)}" fill="${C.over}" shape-rendering="crispEdges"/>` +
    `<rect class="c-scan" x="16" y="84" width="3" height="96" fill="${C.red}"/>` +
    [0, 1, 2, 3, 4].map((i) =>
      `<rect class="c-chip c${i}" x="${16 + i * 37}" y="204" width="32" height="18" rx="2" fill="${C.white}" stroke="${C.blue}" stroke-width="1.3"/>`).join('') +
    `<g class="c-ok">${T(label, 'In order. None missing.', 14, 16, 252, C.blue)}</g>`;

  // 3. Claims
  const sigs = [
    'M6 28c8-14 14-20 18-12s-6 16-2 14 10-18 16-16-2 14 4 13 8-12 14-12-3 11 3 11 12-6 24-9 22-3 30-2',
    'M8 24c6-12 16-18 20-8 3 8-10 14-8 6s14-14 22-10-6 14 2 12 10-10 18-10 4 8 12 8 20-6 36-8',
    'M6 30 22 8l6 22 10-18 8 16c6-6 12-12 18-10s-4 10 4 10 22-8 40-10',
  ];
  const ap = stamp('Approved', 19, 22, 208, { cls: 'k-stamp' });
  const claims =
    head('CLAIMS', 'Signed stage by stage') +
    `<rect x="19" y="87" width="180" height="170" rx="2" fill="${C.rule}"/>` +
    `<rect x="16" y="84" width="180" height="170" rx="2" fill="${C.white}" stroke="${C.blue}" stroke-width="1.5"/>` +
    `<rect x="26" y="98" width="70" height="7" fill="${C.blue}"/><rect x="26" y="112" width="160" height="1.5" fill="${C.blue}"/>` +
    [0, 1].map((i) => `<rect x="26" y="${123 + i * 11}" width="${[112, 90][i]}" height="4" fill="${C.rule}"/><rect x="160" y="${123 + i * 11}" width="26" height="4" fill="${C.rule}"/>`).join('') +
    sigs.map((d, i) =>
      `<rect x="${26 + i * 55}" y="150" width="50" height="40" rx="2" fill="none" stroke="${C.rule}" stroke-width="1.2"/>` +
      `<path class="k-sig k${i}" transform="translate(${28 + i * 55} 154) scale(0.385 0.6)" d="${d}" pathLength="1" fill="none" stroke="${C.blue}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" style="stroke-width:1.8px"/>` +
      `<rect x="${30 + i * 55}" y="182" width="42" height="1" fill="${C.blue}"/>`).join('') +
    ap.svg;

  // 4. Tickets
  const tickets =
    head('TICKETS', 'The closest engineer on duty') +
    `<clipPath id="map"><rect x="16" y="84" width="180" height="170" rx="6"/></clipPath>` +
    `<rect x="16" y="84" width="180" height="170" rx="6" fill="${C.paper}" stroke="${C.rule}" stroke-width="1.5"/>` +
    `<g clip-path="url(#map)"><path d="M10 200C50 184 76 214 110 200S160 150 204 160V184C166 176 140 214 110 222S44 202 10 222Z" fill="#d4e0ef"/>` +
    `<path d="M16 126H196M16 174H196M62 84V254M140 84V254" stroke="${C.white}" stroke-width="7" fill="none"/></g>` +
    `<path class="t-route" d="M44 108L150 190" pathLength="1" stroke="${C.red}" stroke-width="3" stroke-linecap="round" fill="none"/>` +
    `<circle cx="104" cy="128" r="7" fill="${C.white}" stroke="${C.blue}" stroke-width="2.2" stroke-dasharray="3.4 2.6"/>` +
    `<circle cx="60" cy="226" r="7.5" fill="${C.blue}"/>` +
    `<rect x="143" y="183" width="14" height="14" fill="${C.over}"/>` +
    `<circle class="t-eng" cx="44" cy="108" r="7.5" fill="${C.blue}"/>`;

  // 5. Packages
  const s = 44, ox = 106, oy = 150;
  const ex = [0.866 * s, 0.5 * s], ey = [-0.866 * s, 0.5 * s];
  const P = (a, b, up = 0) => `${(ox + a * ex[0] + b * ey[0]).toFixed(1)} ${(oy + a * ex[1] + b * ey[1] - up * s).toFixed(1)}`;
  const quad = (pts, fill, extra = '') => `<path d="M${pts.join('L')}Z" fill="${fill}" stroke="${C.blue}" stroke-width="1.5" stroke-linejoin="round"${extra}/>`;
  const cell = (a, b, fill) => quad([P(a, b), P(a + 1, b), P(a + 1, b + 1), P(a, b + 1)], fill);
  const sg = stamp('Signed', 19, 118, 92, { cls: 'p-stamp' });
  const packages =
    head('PACKAGES', 'A driver folds into a package') +
    `<rect x="16" y="84" width="180" height="170" rx="6" fill="${C.shade}"/>` +
    `<g class="p-net">${cell(0, 0, 'url(#b1)')}${cell(-1, 0, C.white)}${cell(1, 0, C.white)}${cell(0, -1, C.white)}${cell(0, 1, C.white)}${cell(0, -2, C.blue)}</g>` +
    `<g class="p-box">${quad([P(0, 1), P(1, 1), P(1, 1, 1), P(0, 1, 1)], 'url(#b2)')}${quad([P(0, 1), P(1, 1), P(1, 1, 1), P(0, 1, 1)], 'none')}` +
    `${quad([P(1, 0), P(1, 1), P(1, 1, 1), P(1, 0, 1)], C.white)}${quad([P(1, 0), P(1, 1), P(1, 1, 1), P(1, 0, 1)], 'url(#b1)')}` +
    `${quad([P(0, 0, 1), P(1, 0, 1), P(1, 1, 1), P(0, 1, 1)], C.blue)}</g>` +
    sg.svg;

  const fill = 'transform-box:fill-box;';
  const style =
    // Stock: the gauge drains, then the swap refills it and the log gets a line.
    `.s-gauge{${fill}transform-origin:50% 100%;animation:sg 7s linear infinite}@keyframes sg{0%{transform:scaleY(1)}58%{transform:scaleY(.04)}62%,100%{transform:scaleY(1)}}` +
    `.s-empty,.s-row{animation:sr 7s linear infinite}@keyframes sr{0%,60%{opacity:0}64%,100%{opacity:1}}` +
    // Cheques: the rig reads across the line, and sheets arrive one by one.
    `.c-scan{animation:cs 3.5s cubic-bezier(.45,0,.55,1) infinite alternate}@keyframes cs{from{transform:translateX(0)}to{transform:translateX(177px)}}` +
    `.c-chip,.c-ok{animation:cc 7s linear infinite}` +
    [0, 1, 2, 3, 4].map((i) => `.c${i}{animation-name:cc${i}}@keyframes cc${i}{0%,${8 + i * 12}%{opacity:0}${12 + i * 12}%,100%{opacity:1}}`).join('') +
    `.c-ok{animation-name:cok}@keyframes cok{0%,70%{opacity:0}75%,100%{opacity:1}}` +
    // Claims: three signatures, then the stamp.
    `.k-sig{stroke-dasharray:1;animation:ks 7s cubic-bezier(.2,.8,.2,1) infinite}` +
    [0, 1, 2].map((i) => `.k${i}{animation-name:ks${i}}@keyframes ks${i}{0%,${6 + i * 18}%{stroke-dashoffset:1}${20 + i * 18}%,100%{stroke-dashoffset:0}}`).join('') +
    `.k-stamp,.p-stamp{${fill}transform-origin:center;animation:st 7s cubic-bezier(.2,.8,.2,1) infinite}@keyframes st{0%,66%{opacity:0;transform:scale(1.7)}72%,100%{opacity:1;transform:scale(1)}}` +
    // Tickets: the route draws, then the engineer travels along it.
    `.t-route{stroke-dasharray:1;animation:tr 7s cubic-bezier(.2,.8,.2,1) infinite}@keyframes tr{0%,8%{stroke-dashoffset:1;opacity:1}24%,62%{stroke-dashoffset:0;opacity:1}70%,100%{stroke-dashoffset:0;opacity:0}}` +
    `.t-eng{animation:te 7s cubic-bezier(.4,0,.2,1) infinite}@keyframes te{0%,26%{transform:translate(0,0)}60%,92%{transform:translate(98px,68px)}100%{transform:translate(0,0)}}` +
    // Packages: the flat sheet gives way to the folded box.
    `.p-net{animation:pn 7s cubic-bezier(.2,.8,.2,1) infinite}@keyframes pn{0%,30%{opacity:1;transform:none}44%,92%{opacity:0;transform:translateY(-10px)}100%{opacity:1;transform:none}}` +
    `.p-box{animation:pb 7s cubic-bezier(.2,.8,.2,1) infinite}@keyframes pb{0%,32%{opacity:0;transform:translateY(12px)}48%,92%{opacity:1;transform:none}100%{opacity:0;transform:translateY(12px)}}`;
  const tiles = [stock, cheques, claims, tickets, packages]
    .map((art, i) => `<g transform="translate(${x0 + i * (tileW + gap)} ${y0})">${frame}${art}</g>`)
    .join('');
  writeFileSync(`${OUT}/models.svg`, svg(Wd, H, 'The five working models: Stock, Cheques, Claims, Tickets and Packages.', style, crops(Wd, H, 12, 9) + tiles));
}

// --------------------------------------------------------------------------- scores
{
  const Wd = 1200, H = 318;
  const r = 56, circ = 2 * Math.PI * r;
  const rings = ['Performance', 'Accessibility', 'Best practices', 'SEO']
    .map((name, i) => {
      const cx = 122 + i * 168, cy = 168;
      return (
        `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${C.rule}" stroke-width="12"/>` +
        `<circle class="ring g${i}" cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${i === 3 ? C.red : C.blue}" stroke-width="12" stroke-linecap="round" stroke-dasharray="${circ.toFixed(1)}" transform="rotate(-90 ${cx} ${cy})"/>` +
        T(display, '100', 46, cx, cy + 16, C.over, { anchor: 'middle' }) +
        T(label, name, 17, cx, cy + r + 38, C.blue, { anchor: 'middle' })
      );
    })
    .join('');
  const bx = 780, bw = 356;
  const bars = [
    ['Largest paint', '1.1 s', 'limit 2.0 s', 1.1 / 2],
    ['Press to paint', '136 ms', 'limit 200 ms', 136 / 200],
    ['Layout shift', '0', 'limit 0.05', 0.012],
  ]
    .map(([name, value, limit, share], i) => {
      const y = 112 + i * 64;
      return (
        T(label, name, 17, bx, y, C.over) +
        T(display, value, 24, bx + bw, y, C.blue, { anchor: 'end' }) +
        `<rect x="${bx}" y="${y + 12}" width="${bw}" height="12" rx="6" fill="${C.rule}"/>` +
        `<rect class="bar b${i}" x="${bx}" y="${y + 12}" width="${(bw * share).toFixed(1)}" height="12" rx="6" fill="${C.blue}"/>` +
        `<rect x="${bx + bw - 2}" y="${y + 7}" width="2.5" height="22" fill="${C.red}"/>` +
        T(small, limit, 12.5, bx + bw, y + 42, C.redText, { anchor: 'end' })
      );
    })
    .join('');
  const style =
    `.ring{animation:rg 9s cubic-bezier(.2,.8,.2,1) infinite}` +
    [0, 1, 2, 3].map((i) => `.g${i}{animation-name:rg${i}}@keyframes rg${i}{0%,${2 + i * 4}%{stroke-dashoffset:${circ.toFixed(1)}}${20 + i * 4}%,94%{stroke-dashoffset:0}100%{stroke-dashoffset:${circ.toFixed(1)}}}`).join('') +
    `.bar{transform-box:fill-box;transform-origin:0 50%;animation:br 9s cubic-bezier(.2,.8,.2,1) infinite}` +
    [0, 1, 2].map((i) => `.b${i}{animation-name:br${i}}@keyframes br${i}{0%,${6 + i * 5}%{transform:scaleX(0)}${26 + i * 5}%,94%{transform:scaleX(1)}100%{transform:scaleX(0)}}`).join('');
  const inner =
    crops(Wd, H, 12, 9) +
    T(display, 'LIGHTHOUSE', 26, 44, 62, C.blue, { tracking: 2 }) +
    T(small, 'Throttled phone, on the live address', 14, 196, 61, C.over) +
    T(display, 'BUDGETS', 26, bx, 62, C.blue, { tracking: 2 }) +
    T(small, 'Measured against the limit', 14, bx + 110, 61, C.over) +
    `<rect x="730" y="40" width="1.5" height="${H - 80}" fill="${C.rule}"/>` +
    rings + bars;
  writeFileSync(`${OUT}/scores.svg`, svg(Wd, H, 'Lighthouse on a throttled phone: 100 for performance, accessibility, best practices and SEO. Largest paint 1.1 seconds against a limit of 2.0. Press to paint 136 milliseconds against a limit of 200. Layout shift 0 against a limit of 0.05.', style, inner));
}

// --------------------------------------------------------------------------- credit
{
  const Wd = 1200, H = 190, size = 46, y = 88;
  const codeFace = face(100, 800), light = face(80, 450), heavy = face(80, 850);
  const parts = [];
  let w = 0;
  const gapW = size * 0.3;
  const add = (kind, font, str) => { const width = W(font, str, size); parts.push({ kind, font, str, width }); w += width; };
  add('lt', codeFace, '<'); add('sl', codeFace, '/'); add('gt', codeFace, '>');
  w += gapW * 1.2; parts.push({ kind: 'gap', width: gapW * 1.2 });
  add('text', light, 'Built with'); w += gapW; parts.push({ kind: 'gap', width: gapW });
  const heartW = size * 0.86; parts.push({ kind: 'heart', width: heartW }); w += heartW;
  w += gapW; parts.push({ kind: 'gap', width: gapW });
  add('text', light, 'by'); w += gapW; parts.push({ kind: 'gap', width: gapW });
  add('name', heavy, 'Anik Sarker Akash');
  let x = (Wd - w) / 2;
  let line = '';
  for (const p of parts) {
    if (p.kind === 'heart') {
      const k = heartW / 24;
      line += `<g transform="translate(${x.toFixed(1)} ${(y - size * 0.72).toFixed(1)}) scale(${k.toFixed(3)})"><path class="heart" d="M12 21.2 2.6 11.9C-.2 9.1-.1 4.6 2.8 2 5.5-.4 9.6.1 12 3c2.4-2.9 6.5-3.4 9.2-1 2.9 2.6 3 7.1.2 9.9z" fill="${C.red}"/></g>`;
    } else if (p.kind !== 'gap') {
      const fillColour = p.kind === 'name' ? C.over : C.blue;
      const cls = { lt: ' class="lt"', sl: ' class="sl"', gt: ' class="gt"' }[p.kind] ?? '';
      line += `<path${cls} d="${outline(p.font, p.str, size, x, y).d}" fill="${fillColour}"/>`;
    }
    x += p.width;
  }
  const tag = `<path d="${outline(serif, 'Automate the boring. Build the rare.', 40, Wd / 2, 148, { anchor: 'middle' }).d}" fill="${C.over}"/>`;
  const box = 'transform-box:fill-box;transform-origin:center;';
  const style =
    `.lt{${box}animation:lt 4.2s cubic-bezier(.2,.8,.2,1) infinite}@keyframes lt{0%,55%,100%{transform:none}70%,85%{transform:translateX(-8px)}}` +
    `.gt{${box}animation:gt 4.2s cubic-bezier(.2,.8,.2,1) infinite}@keyframes gt{0%,55%,100%{transform:none}70%,85%{transform:translateX(8px)}}` +
    `.sl{${box}animation:sl 4.2s cubic-bezier(.2,.8,.2,1) infinite}@keyframes sl{0%,55%,100%{transform:none}70%,85%{transform:rotate(18deg)}}` +
    `.heart{${box}animation:hb 1.9s ease-in-out infinite}@keyframes hb{0%,30%,100%{scale:1}8%{scale:1.22}16%{scale:.96}23%{scale:1.14}}`;
  writeFileSync(`${OUT}/credit.svg`, svg(Wd, H, 'Built with love by Anik Sarker Akash. Automate the boring. Build the rare.', style, crops(Wd, H, 12, 9) + colourBar(64, 22, Wd - 128, 8) + line + tag));
}

// --------------------------------------------------------------------------- page weight
{
  const Wd = 1200, H = 214, X = 44, barW = Wd - X * 2, barY = 88, barH = 36;
  // Compressed size of everything the page can load, in kB, measured from dist/.
  const parts = [
    ['Fonts', 109.6, C.blue],
    ['Logo film', 88.8, C.red],
    ['Images', 27.7, C.over],
    ['HTML and CSS', 13.4, 'url(#b3)'],
    ['Scripts', 7.6, 'url(#r3)'],
  ];
  const total = parts.reduce((a, p) => a + p[1], 0);
  let x = X;
  let bar = '';
  let legend = '';
  let lx = X;
  for (const [name, kb, fill] of parts) {
    const w = (kb / total) * barW;
    bar += `<rect x="${x.toFixed(1)}" y="${barY}" width="${(w - 3).toFixed(1)}" height="${barH}" fill="${C.white}"/><rect x="${x.toFixed(1)}" y="${barY}" width="${(w - 3).toFixed(1)}" height="${barH}" fill="${fill}"/>`;
    x += w;
    const text = `${name}  ${kb.toFixed(0)} kB`;
    legend += `<rect x="${lx}" y="158" width="16" height="16" fill="${C.white}"/><rect x="${lx}" y="158" width="16" height="16" fill="${fill}"/>` + T(label, text, 17, lx + 25, 172, C.over);
    lx += 25 + W(label, text, 17) + 44;
  }
  const style = `.cover{transform-box:fill-box;transform-origin:100% 50%;animation:cv 9s cubic-bezier(.2,.8,.2,1) infinite}@keyframes cv{0%,4%{transform:scaleX(1)}26%,94%{transform:scaleX(0)}100%{transform:scaleX(1)}}`;
  const inner =
    crops(Wd, H, 12, 9) +
    T(display, 'PAGE WEIGHT', 26, X, 58, C.blue, { tracking: 2 }) +
    T(small, 'Compressed size of everything the page can load', 14, X + 168, 57, C.over) +
    T(display, `${total.toFixed(0)} kB`, 34, Wd - X, 60, C.over, { anchor: 'end' }) +
    bar +
    `<rect class="cover" x="${X}" y="${barY - 2}" width="${barW}" height="${barH + 4}" fill="${C.paper}"/>` +
    legend;
  writeFileSync(`${OUT}/weight.svg`, svg(Wd, H, `Page weight: ${total.toFixed(0)} kilobytes compressed. ` + parts.map((p) => `${p[0]} ${p[1].toFixed(0)}`).join(', ') + '.', style, inner));
}

for (const f of ['banner', 'models', 'scores', 'weight', 'credit']) console.log(f + '.svg', (statSync(`${OUT}/${f}.svg`).size / 1024).toFixed(1) + ' kB');
