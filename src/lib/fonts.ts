// Font declarations for the page.
//
// The page sets one variable typeface, Archivo, at widths from 62% to 100%.
// A system font is much wider than condensed Archivo, so a plain fallback
// makes headings wrap differently until the web font arrives, and the page
// jumps. To stop the jump, the fallback is declared once for each band of
// widths, with a size-adjust that makes the system font set text as wide as
// Archivo does in that band. The ratios were measured in a browser against
// Arial (regular and bold) for the widths and weights that the page uses.

const REGULAR = 'local("Arial"), local("Roboto"), local("Helvetica Neue")';
const BOLD = 'local("Arial Bold"), local("Arial-BoldMT"), local("Roboto Bold"), local("Helvetica Neue Bold")';

// [width band, weight band, system font, size-adjust in percent]
const FALLBACKS: [string, string, string, number][] = [
  ['50% 65%', '600 900', BOLD, 70.7],
  ['50% 65%', '100 599', REGULAR, 70],
  ['65.01% 72%', '600 900', BOLD, 74.6],
  ['65.01% 72%', '100 599', REGULAR, 74],
  ['72.01% 84%', '600 900', BOLD, 83],
  ['72.01% 84%', '100 599', REGULAR, 82.5],
  ['84.01% 95%', '600 900', BOLD, 89],
  ['84.01% 95%', '100 599', REGULAR, 90],
  ['95.01% 125%', '600 900', BOLD, 98.6],
  ['95.01% 125%', '100 599', REGULAR, 98.4],
];

/** The @font-face rules, as one string for an inline style element. */
export function fontFaces(archivoUrl: string, serifUrl: string): string {
  const faces = [
    `@font-face{font-family:Archivo;src:url("${archivoUrl}") format("woff2");font-weight:100 900;font-stretch:62% 125%;font-style:normal;font-display:swap}`,
    `@font-face{font-family:"Instrument Serif";src:url("${serifUrl}") format("woff2");font-weight:400;font-style:italic;font-display:swap}`,
    `@font-face{font-family:"Instrument Serif Fallback";src:local("Times New Roman Italic"),local("Times New Roman"),local("Noto Serif Italic");font-weight:400;font-style:italic;size-adjust:85.8%}`,
    ...FALLBACKS.map(
      ([stretch, weight, src, adjust]) =>
        `@font-face{font-family:"Archivo Fallback";src:${src};font-stretch:${stretch};font-weight:${weight};font-style:normal;size-adjust:${adjust}%}`,
    ),
  ];
  return faces.join('');
}
