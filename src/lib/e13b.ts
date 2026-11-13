// Characters in the style of E-13B, the typeface of the magnetic ink line at
// the foot of a cheque. Each character is drawn on a grid 7 wide and 9 tall.
// 'A' is the transit symbol and 'C' is the on-us symbol.
// The page and the cheque working model both draw the line from this table.
const GLYPHS: Record<string, string[]> = {
  '0': ['.#####.', '##...##', '##...##', '##...##', '##...##', '##...##', '##...##', '##...##', '.#####.'],
  '1': ['..##...', '..##...', '..##...', '..##...', '..##...', '.####..', '.####..', '.####..', '.####..'],
  '2': ['.#####.', '.....#.', '.....#.', '.....#.', '.#####.', '.##....', '.##....', '.##....', '.#####.'],
  '3': ['#####..', '....#..', '....#..', '....#..', '.######', '.....##', '.....##', '.....##', '#######'],
  '4': ['##.....', '##.....', '##..##.', '##..##.', '##..##.', '#######', '....##.', '....##.', '....##.'],
  '5': ['.#####.', '.#.....', '.#.....', '.#.....', '.#####.', '....##.', '....##.', '....##.', '.#####.'],
  '6': ['.##....', '.##....', '.##....', '.##....', '.######', '.##..##', '.##..##', '.##..##', '.######'],
  '7': ['######.', '#...##.', '....##.', '....##.', '....##.', '....##.', '....##.', '....##.', '....##.'],
  '8': ['..###..', '..#.#..', '..#.#..', '..#.#..', '#######', '##...##', '##...##', '##...##', '#######'],
  '9': ['######.', '##..##.', '##..##.', '##..##.', '######.', '....##.', '....##.', '....##.', '....##.'],
  A: ['##.....', '##..##.', '##..##.', '##.....', '##.....', '##.....', '##..##.', '##..##.', '##.....'],
  C: ['....###', '....###', '....###', '.......', '#.#....', '#.#....', '#.#....', '#.#....', '#.#....'],
};

/** Width of one character cell: 7 units of character and 2 units of space. */
export const CELL = 9;
export const HEIGHT = 9;

/** SVG path data for a run of characters. A space leaves an empty cell. */
export function micrPath(text: string, x0 = 0): string {
  let d = '';
  [...text].forEach((ch, i) => {
    const rows = GLYPHS[ch];
    if (!rows) return;
    rows.forEach((row, y) => {
      let x = 0;
      while (x < 7) {
        if (row[x] !== '#') {
          x += 1;
          continue;
        }
        let w = 0;
        while (x + w < 7 && row[x + w] === '#') w += 1;
        d += `M${x0 + i * CELL + x} ${y}h${w}v1h${-w}z`;
        x += w;
      }
    });
  });
  return d;
}

/** A cheque serial as seven digits. */
export const serial7 = (n: number): string => String(n).padStart(7, '0');
