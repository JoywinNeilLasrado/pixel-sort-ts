import { SortKey } from './types';

export function brightness(r: number, g: number, b: number): number {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = r / 255,
    gn = g / 255,
    bn = b / 255;
  const max = Math.max(rn, gn, bn),
    min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;

  if (max === min) return { h: 0, s: 0, l };

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  switch (max) {
    case rn:
      h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
      break;
    case gn:
      h = ((bn - rn) / d + 2) / 6;
      break;
    default:
      h = ((rn - gn) / d + 4) / 6;
  }
  return { h, s, l };
}

export function getSortValue(r: number, g: number, b: number, key: SortKey): number {
  switch (key) {
    case 'brightness':
      return brightness(r, g, b);
    case 'hue':
      return rgbToHsl(r, g, b).h;
    case 'saturation':
      return rgbToHsl(r, g, b).s;
    case 'lightness':
      return rgbToHsl(r, g, b).l;
    case 'red':
      return r / 255;
    case 'green':
      return g / 255;
    case 'blue':
      return b / 255;
  }
}
