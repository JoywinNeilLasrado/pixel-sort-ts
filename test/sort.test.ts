import { expect } from 'chai';
import { sortRows, sortColumns } from '../src/sort';
import type { SortOptions } from '../src/types';

/** Build a flat RGBA Uint8Array from [r,g,b,a] tuples */
function makeBuffer(...pixels: [number, number, number, number][]): Uint8Array {
  const buf = new Uint8Array(pixels.length * 4);
  for (let i = 0; i < pixels.length; i++) {
    buf[i * 4] = pixels[i][0];
    buf[i * 4 + 1] = pixels[i][1];
    buf[i * 4 + 2] = pixels[i][2];
    buf[i * 4 + 3] = pixels[i][3];
  }
  return buf;
}

/** Extract the R value of pixel at index i */
function r(buf: Uint8Array, i: number): number {
  return buf[i * 4];
}

const FULL: SortOptions = {
  direction: 'horizontal',
  key: 'brightness',
  mode: 'full',
  lo: 0,
  hi: 1,
  reverse: false,
  maxLen: 100,
};

// ─── sortRows ────────────────────────────────────────────────────────────────

describe('sort: sortRows()', () => {
  it('sorts a single row ascending by brightness', () => {
    // 1 row × 3 cols: white, black, grey → should become black, grey, white
    const buf = makeBuffer([255, 255, 255, 255], [0, 0, 0, 255], [128, 128, 128, 255]);
    sortRows(buf, 3, 1, FULL);
    expect(r(buf, 0)).to.equal(0); // darkest first
    expect(r(buf, 2)).to.equal(255); // brightest last
  });

  it('sorts descending when reverse = true', () => {
    const buf = makeBuffer([0, 0, 0, 255], [255, 255, 255, 255], [128, 128, 128, 255]);
    sortRows(buf, 3, 1, { ...FULL, reverse: true });
    expect(r(buf, 0)).to.equal(255); // brightest first
    expect(r(buf, 2)).to.equal(0); // darkest last
  });

  it('sorts each row independently', () => {
    // 2 rows × 2 cols: row 0 = [white, black], row 1 = [black, white]
    const buf = makeBuffer(
      [255, 255, 255, 255],
      [0, 0, 0, 255], // row 0
      [0, 0, 0, 255],
      [255, 255, 255, 255], // row 1
    );
    sortRows(buf, 2, 2, FULL);
    // Both rows should be sorted [black, white]
    expect(r(buf, 0)).to.equal(0); // row 0 pixel 0
    expect(r(buf, 1)).to.equal(255); // row 0 pixel 1
    expect(r(buf, 2)).to.equal(0); // row 1 pixel 0
    expect(r(buf, 3)).to.equal(255); // row 1 pixel 1
  });

  it('does not move pixels outside the threshold range', () => {
    // threshold [0.25, 0.8]: black pixels are below range and act as boundaries
    // single mid pixel is in range but forms an interval of length 1 — nothing to sort
    const buf = makeBuffer([0, 0, 0, 255], [128, 128, 128, 255], [0, 0, 0, 255]);
    const original = Array.from(buf);
    sortRows(buf, 3, 1, { ...FULL, mode: 'threshold', lo: 0.25, hi: 0.8 });
    expect(Array.from(buf)).to.deep.equal(original);
  });

  it('preserves alpha channel values', () => {
    const buf = makeBuffer([255, 255, 255, 200], [0, 0, 0, 100]);
    sortRows(buf, 2, 1, FULL);
    // After sort: [black (α=100), white (α=200)]
    expect(buf[3]).to.equal(100); // alpha of first pixel
    expect(buf[7]).to.equal(200); // alpha of second pixel
  });
});

// ─── sortColumns ─────────────────────────────────────────────────────────────

describe('sort: sortRows() — random mode', () => {
  it('sorts pixels within random intervals without gaps or loss', () => {
    const buf = makeBuffer(
      [200, 200, 200, 255],
      [50, 50, 50, 255],
      [150, 150, 150, 255],
      [100, 100, 100, 255],
      [250, 250, 250, 255],
      [10, 10, 10, 255],
    );
    const before = Array.from(buf)
      .filter((_, i) => i % 4 === 0)
      .sort((a, b) => a - b);
    sortRows(buf, 6, 1, { ...FULL, mode: 'random', maxLen: 3 });
    const after = Array.from(buf)
      .filter((_, i) => i % 4 === 0)
      .sort((a, b) => a - b);
    // All pixels still present, just reordered
    expect(after).to.deep.equal(before);
  });
});

describe('sort: sortColumns()', () => {
  it('sorts a single column ascending by brightness', () => {
    // 3 rows × 1 col: white, black, grey → black, grey, white
    const buf = makeBuffer([255, 255, 255, 255], [0, 0, 0, 255], [128, 128, 128, 255]);
    sortColumns(buf, 1, 3, { ...FULL, direction: 'vertical' });
    expect(r(buf, 0)).to.equal(0); // darkest at top
    expect(r(buf, 2)).to.equal(255); // brightest at bottom
  });

  it('sorts each column independently', () => {
    // 2 rows × 2 cols
    // col 0: [white, black] → [black, white]
    // col 1: [black, white] → [black, white]
    const buf = makeBuffer(
      [255, 255, 255, 255],
      [0, 0, 0, 255], // row 0
      [0, 0, 0, 255],
      [255, 255, 255, 255], // row 1
    );
    sortColumns(buf, 2, 2, { ...FULL, direction: 'vertical' });
    expect(r(buf, 0)).to.equal(0); // col 0, row 0 = black
    expect(r(buf, 2)).to.equal(255); // col 0, row 1 = white
    expect(r(buf, 1)).to.equal(0); // col 1, row 0 = black
    expect(r(buf, 3)).to.equal(255); // col 1, row 1 = white
  });
});
