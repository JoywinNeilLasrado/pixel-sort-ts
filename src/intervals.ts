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

export function buildIntervals(pixels: Pixel[], opts: IntervalOptions): Interval[] {
  const len = pixels.length;

  switch (opts.mode) {
    case 'full':
      return [[0, len]];

    case 'threshold': {
      const intervals: Interval[] = [];
      let i = 0;
      while (i < len) {
        const { r, g, b } = pixels[i];
        const bri = brightness(r, g, b);
        if (bri >= opts.lo && bri <= opts.hi) {
          const start = i;
          while (i < len) {
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
        const size = Math.floor(Math.random() * opts.maxLen) + 1;
        const end = Math.min(i + size, len);
        intervals.push([i, end]);
        i = end;
      }
      return intervals;
    }
  }
}
