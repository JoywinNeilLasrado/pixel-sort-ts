import { IntervalMode, Pixel } from './types';
import { brightness } from './color';

/** [start, end) index pairs within a pixel strip */
export type Interval = [number, number];

export interface IntervalOptions {
  mode: IntervalMode;
  lo: number;
  hi: number;
  maxLen: number;
}

export function buildIntervals(
  pixels: Pixel[],
  opts: IntervalOptions,
  isExcluded?: (idx: number) => boolean
): Interval[] {
  const len = pixels.length;

  switch (opts.mode) {
    case 'full': {
      if (!isExcluded) return [[0, len]];
      const intervals: Interval[] = [];
      let i = 0;
      while (i < len) {
        if (!isExcluded(i)) {
          const start = i;
          while (i < len && !isExcluded(i)) i++;
          intervals.push([start, i]);
        } else {
          i++;
        }
      }
      return intervals;
    }

    case 'threshold': {
      const intervals: Interval[] = [];
      let i = 0;
      while (i < len) {
        if (isExcluded && isExcluded(i)) {
          i++;
          continue;
        }
        const { r, g, b } = pixels[i];
        const bri = brightness(r, g, b);
        if (bri >= opts.lo && bri <= opts.hi) {
          const start = i;
          while (i < len) {
            if (isExcluded && isExcluded(i)) break;
            const { r: r2, g: g2, b: b2 } = pixels[i];
            const bri2 = brightness(r2, g2, b2);
            if (bri2 < opts.lo || bri2 > opts.hi) break;
            i++;
          }
          intervals.push([start, i]);
        } else {
          i++;
        }
      }
      return intervals;
    }

    case 'random': {
      const intervals: Interval[] = [];
      let i = 0;
      while (i < len) {
        if (isExcluded && isExcluded(i)) {
          i++;
          continue;
        }
        let endBound = i;
        while (endBound < len && !(isExcluded && isExcluded(endBound))) {
          endBound++;
        }
        
        let curr = i;
        while (curr < endBound) {
          const size = Math.floor(Math.random() * opts.maxLen) + 1;
          const end = Math.min(curr + size, endBound);
          intervals.push([curr, end]);
          curr = end;
        }
        i = endBound;
      }
      return intervals;
    }
  }
}
