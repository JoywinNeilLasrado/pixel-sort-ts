import { Pixel, SortKey, SortOptions } from './types';
import { getSortValue } from './color';
import { buildIntervals, Interval } from './intervals';

function sortSegment(pixels: Pixel[], interval: Interval, key: SortKey, reverse: boolean): void {
  const [start, end] = interval;
  const segment = pixels.slice(start, end);

  segment.sort((a, b) => {
    const va = getSortValue(a.r, a.g, a.b, key);
    const vb = getSortValue(b.r, b.g, b.b, key);
    return reverse ? vb - va : va - vb;
  });

  for (let i = 0; i < segment.length; i++) {
    pixels[start + i] = segment[i];
  }
}

function sortStrip(pixels: Pixel[], opts: SortOptions): Pixel[] {
  const result = [...pixels];
  const intervals = buildIntervals(result, opts);

  for (const interval of intervals) {
    if (interval[1] - interval[0] > 1) {
      sortSegment(result, interval, opts.key, opts.reverse);
    }
  }

  return result;
}

export function sortRows(data: Uint8Array, width: number, height: number, opts: SortOptions): void {
  for (let y = 0; y < height; y++) {
    const pixels = readRow(data, y, width);
    const sorted = sortStrip(pixels, opts);
    writeRow(data, y, width, sorted);
  }
}

export function sortColumns(
  data: Uint8Array,
  width: number,
  height: number,
  opts: SortOptions,
): void {
  for (let x = 0; x < width; x++) {
    const pixels = readCol(data, x, width, height);
    const sorted = sortStrip(pixels, opts);
    writeCol(data, x, width, sorted);
  }
}

// ─── Buffer helpers (kept local to avoid circular deps) ──────────────────────

function readRow(data: Uint8Array, y: number, width: number): Pixel[] {
  const pixels: Pixel[] = [];
  for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4;
    pixels.push({ r: data[i], g: data[i + 1], b: data[i + 2], a: data[i + 3] });
  }
  return pixels;
}

function writeRow(data: Uint8Array, y: number, width: number, pixels: Pixel[]): void {
  for (let x = 0; x < pixels.length; x++) {
    const i = (y * width + x) * 4;
    const p = pixels[x];
    data[i] = p.r;
    data[i + 1] = p.g;
    data[i + 2] = p.b;
    data[i + 3] = p.a;
  }
}

function readCol(data: Uint8Array, x: number, width: number, height: number): Pixel[] {
  const pixels: Pixel[] = [];
  for (let y = 0; y < height; y++) {
    const i = (y * width + x) * 4;
    pixels.push({ r: data[i], g: data[i + 1], b: data[i + 2], a: data[i + 3] });
  }
  return pixels;
}

function writeCol(data: Uint8Array, x: number, width: number, pixels: Pixel[]): void {
  for (let y = 0; y < pixels.length; y++) {
    const i = (y * width + x) * 4;
    const p = pixels[y];
    data[i] = p.r;
    data[i + 1] = p.g;
    data[i + 2] = p.b;
    data[i + 3] = p.a;
  }
}
