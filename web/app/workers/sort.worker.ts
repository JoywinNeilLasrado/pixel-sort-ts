import { sortRows, sortColumns } from '@core/sort';
import type { SortOptions } from '@core/types';

export interface SortWorkerInput {
  buffer: ArrayBuffer;
  width: number;
  height: number;
  opts: SortOptions;
}

addEventListener('message', ({ data }: MessageEvent<SortWorkerInput>) => {
  const { buffer, width, height, opts } = data;
  const pixels = new Uint8Array(buffer);

  if (opts.direction === 'horizontal' || opts.direction === 'both') {
    sortRows(pixels, width, height, opts);
  }
  if (opts.direction === 'vertical' || opts.direction === 'both') {
    sortColumns(pixels, width, height, opts);
  }

  // Transfer the buffer back to the main thread (zero-copy)
  postMessage(buffer, { transfer: [buffer] });
});
