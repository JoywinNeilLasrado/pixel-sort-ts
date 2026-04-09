import { expect } from 'chai';
import { buildIntervals } from '../src/intervals';
import type { Pixel } from '../src/types';

function px(r: number, g: number, b: number): Pixel {
  return { r, g, b, a: 255 };
}

const BASE = { lo: 0, hi: 1, maxLen: 100 };

describe('intervals: buildIntervals() — full mode', () => {
  it('returns one interval covering all pixels', () => {
    const pixels = [px(0, 0, 0), px(128, 128, 128), px(255, 255, 255)];
    expect(buildIntervals(pixels, { ...BASE, mode: 'full' })).to.deep.equal([[0, 3]]);
  });

  it('works with a single pixel', () => {
    expect(buildIntervals([px(255, 0, 0)], { ...BASE, mode: 'full' })).to.deep.equal([[0, 1]]);
  });
});

describe('intervals: buildIntervals() — threshold mode', () => {
  it('returns empty array when no pixels are in range', () => {
    // All black (brightness = 0), lo = 0.5
    const pixels = [px(0, 0, 0), px(0, 0, 0)];
    expect(
      buildIntervals(pixels, { mode: 'threshold', lo: 0.5, hi: 1, maxLen: 100 }),
    ).to.deep.equal([]);
  });

  it('groups consecutive in-range pixels into one interval', () => {
    // black | mid | mid | black  →  interval [1, 3]
    const pixels = [px(0, 0, 0), px(128, 128, 128), px(150, 150, 150), px(0, 0, 0)];
    expect(
      buildIntervals(pixels, { mode: 'threshold', lo: 0.25, hi: 0.8, maxLen: 100 }),
    ).to.deep.equal([[1, 3]]);
  });

  it('splits at out-of-range pixels', () => {
    // mid | black | mid  →  [0, 1] and [2, 3]
    const pixels = [px(180, 180, 180), px(0, 0, 0), px(180, 180, 180)];
    expect(
      buildIntervals(pixels, { mode: 'threshold', lo: 0.25, hi: 0.8, maxLen: 100 }),
    ).to.deep.equal([
      [0, 1],
      [2, 3],
    ]);
  });

  it('returns single interval when all pixels are in range', () => {
    const pixels = [px(128, 128, 128), px(150, 150, 150)];
    expect(
      buildIntervals(pixels, { mode: 'threshold', lo: 0.25, hi: 0.8, maxLen: 100 }),
    ).to.deep.equal([[0, 2]]);
  });

  it('treats pixels above hi as boundaries (bri2 > hi branch)', () => {
    // white pixels (brightness=1) exceed hi=0.8 and should act as boundaries
    const pixels = [px(128, 128, 128), px(255, 255, 255), px(128, 128, 128)];
    expect(
      buildIntervals(pixels, { mode: 'threshold', lo: 0.25, hi: 0.8, maxLen: 100 }),
    ).to.deep.equal([
      [0, 1],
      [2, 3],
    ]);
  });
});

describe('intervals: buildIntervals() — random mode', () => {
  it('covers every pixel with no gaps or overlaps', () => {
    const pixels = Array.from({ length: 10 }, () => px(128, 128, 128));
    const intervals = buildIntervals(pixels, { mode: 'random', lo: 0, hi: 1, maxLen: 3 });

    let covered = 0;
    for (const [start, end] of intervals) covered += end - start;
    expect(covered).to.equal(10);
  });

  it('never produces an interval longer than maxLen', () => {
    const pixels = Array.from({ length: 50 }, () => px(128, 128, 128));
    const intervals = buildIntervals(pixels, { mode: 'random', lo: 0, hi: 1, maxLen: 5 });

    for (const [start, end] of intervals) {
      expect(end - start).to.be.at.most(5);
    }
  });

  it('produces at least one interval for a non-empty strip', () => {
    const pixels = [px(0, 0, 0)];
    const intervals = buildIntervals(pixels, { mode: 'random', lo: 0, hi: 1, maxLen: 10 });
    expect(intervals.length).to.be.greaterThan(0);
  });
});
