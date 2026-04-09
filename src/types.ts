export type Direction = 'horizontal' | 'vertical' | 'both';

export type SortKey = 'brightness' | 'hue' | 'saturation' | 'lightness' | 'red' | 'green' | 'blue';

export type IntervalMode = 'full' | 'threshold' | 'random';

export interface Pixel {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface SortOptions {
  direction: Direction;
  key: SortKey;
  mode: IntervalMode;
  lo: number;
  hi: number;
  reverse: boolean;
  maxLen: number;
}
