'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import type { SortOptions, Direction, SortKey, IntervalMode } from '@core/types';
import { DIRECTIONS, SORT_KEYS, INTERVAL_MODES, DEFAULTS } from '@core/constants';

// Canvas toBlob only reliably supports these MIME types; everything else falls back to PNG
const CANVAS_MIME: Record<string, string> = {
  'image/jpeg': 'image/jpeg',
  'image/jpg': 'image/jpeg',
  'image/webp': 'image/webp',
};

const MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

const TOOLTIPS: Record<string, string> = {
  direction:
    'Axis to sort along. Horizontal sorts pixels within each row, vertical within each column, both does rows then columns.',
  key: 'Color property used to rank pixels within each interval before sorting.',
  mode: 'How sortable intervals are detected. full = entire row/column, threshold = brightness range, random = fixed-length segments.',
  lo: 'Lower brightness bound (0–1). Pixels below this value act as interval boundaries in threshold mode.',
  hi: 'Upper brightness bound (0–1). Pixels above this value act as interval boundaries in threshold mode.',
  maxLen: 'Maximum segment length in pixels for random mode.',
  reverse: 'Sort pixels in descending order instead of ascending.',
};

type SourceImage = { data: Uint8Array; width: number; height: number };

export default function PixelSorter() {
  const [opts, setOpts] = useState<SortOptions>(DEFAULTS);
  const [inputUrl, setInputUrl] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [mimeType, setMimeType] = useState('image/png');
  const [excludeStr, setExcludeStr] = useState('');
  const source = useRef<SourceImage | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Worker | null>(null);

  // Terminate any in-flight worker when the component unmounts
  useEffect(
    () => () => {
      workerRef.current?.terminate();
    },
    [],
  );

  const loadFile = useCallback((file: File) => {
    setOutputUrl(null);
    setFileName(file.name);
    setMimeType(CANVAS_MIME[file.type] ?? 'image/png');
    const url = URL.createObjectURL(file);
    setInputUrl(url);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      source.current = {
        data: new Uint8Array(imageData.data.buffer),
        width: canvas.width,
        height: canvas.height,
      };
    };
    img.src = url;
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) loadFile(file);
    },
    [loadFile],
  );

  const set = <K extends keyof SortOptions>(key: K, value: SortOptions[K]) =>
    setOpts(prev => ({ ...prev, [key]: value }));

  const run = useCallback(() => {
    if (!source.current) return;
    setProcessing(true);

    const { width, height } = source.current;
    const data = new Uint8Array(source.current.data); // copy — don't mutate original

    const worker = new Worker(new URL('../workers/sort.worker.ts', import.meta.url));
    workerRef.current = worker;

    worker.onmessage = ({ data: buffer }: MessageEvent<ArrayBuffer>) => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.putImageData(new ImageData(new Uint8ClampedArray(buffer), width, height), 0, 0);

      canvas.toBlob(blob => {
        if (blob) {
          if (outputUrl) URL.revokeObjectURL(outputUrl);
          setOutputUrl(URL.createObjectURL(blob));
        }
        setProcessing(false);
        worker.terminate();
        workerRef.current = null;
      }, mimeType);
    };

    worker.onerror = () => {
      setProcessing(false);
      worker.terminate();
      workerRef.current = null;
    };

    const excludeOpt = excludeStr
      .split(/[\s;]+/)
      .map(s => s.trim())
      .filter(Boolean)
      .map(s => s.split(',').map(n => parseInt(n.trim(), 10)))
      .filter(arr => arr.length === 4 && arr.every(n => !isNaN(n))) as Array<[number, number, number, number]>;

    const finalOpts = { ...opts };
    if (excludeOpt.length > 0) {
      finalOpts.exclude = excludeOpt;
    }

    // Transfer ownership of the buffer to the worker (zero-copy)
    worker.postMessage({ buffer: data.buffer, width, height, opts: finalOpts }, [data.buffer]);
  }, [opts, outputUrl, mimeType, excludeStr]);

  const download = useCallback(() => {
    if (!outputUrl) return;
    const a = document.createElement('a');
    a.href = outputUrl;
    const base = fileName.replace(/\.[^.]+$/, '');
    const ext = MIME_EXT[mimeType] ?? 'png';
    a.download = `${base}_sorted.${ext}`;
    a.click();
  }, [outputUrl, fileName, mimeType]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        padding: '20px',
        gap: '16px',
      }}
    >
      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'baseline', gap: '16px' }}>
        <span style={{ color: 'var(--accent)', fontSize: '18px', fontWeight: 'bold' }}>
          pixel-sort
        </span>
        <span style={{ color: 'var(--muted)' }}>glitch art tool</span>
      </header>

      <div style={{ display: 'flex', gap: '16px', flex: 1, minHeight: 0 }}>
        {/* Controls */}
        <aside
          style={{
            width: '220px',
            flexShrink: 0,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <Field label="direction" tooltip={TOOLTIPS.direction}>
            <select
              value={opts.direction}
              onChange={e => set('direction', e.target.value as Direction)}
            >
              {DIRECTIONS.map(d => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </Field>

          <Field label="key" tooltip={TOOLTIPS.key}>
            <select value={opts.key} onChange={e => set('key', e.target.value as SortKey)}>
              {SORT_KEYS.map(k => (
                <option key={k}>{k}</option>
              ))}
            </select>
          </Field>

          <Field label="mode" tooltip={TOOLTIPS.mode}>
            <select value={opts.mode} onChange={e => set('mode', e.target.value as IntervalMode)}>
              {INTERVAL_MODES.map(m => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </Field>

          {opts.mode === 'threshold' && (
            <>
              <Field label={`lo  ${opts.lo.toFixed(2)}`} tooltip={TOOLTIPS.lo}>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={opts.lo}
                  onChange={e => set('lo', parseFloat(e.target.value))}
                  style={{ width: '100%' }}
                />
              </Field>
              <Field label={`hi  ${opts.hi.toFixed(2)}`} tooltip={TOOLTIPS.hi}>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={opts.hi}
                  onChange={e => set('hi', parseFloat(e.target.value))}
                  style={{ width: '100%' }}
                />
              </Field>
            </>
          )}

          {opts.mode === 'random' && (
            <Field label="max-len" tooltip={TOOLTIPS.maxLen}>
              <input
                type="number"
                min={1}
                max={9999}
                value={opts.maxLen}
                onChange={e => set('maxLen', parseInt(e.target.value) || 1)}
              />
            </Field>
          )}

          <Field label="reverse" tooltip={TOOLTIPS.reverse}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={opts.reverse}
                onChange={e => set('reverse', e.target.checked)}
                style={{ accentColor: 'var(--accent)', width: '14px', height: '14px' }}
              />
              <span style={{ color: opts.reverse ? 'var(--accent)' : 'var(--muted)' }}>
                {opts.reverse ? 'on' : 'off'}
              </span>
            </label>
          </Field>

          <Field label="exclude masks" tooltip="Exclude regions formatted as x1,y1,x2,y2 separated by spaces. You can also drag on the original image to draw a rect.">
            <textarea
              value={excludeStr}
              onChange={e => setExcludeStr(e.target.value)}
              placeholder={"0,0,100,100\n200,200,300,300"}
              style={{
                width: '100%',
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                color: 'var(--text)',
                padding: '8px',
                resize: 'none',
                minHeight: '60px',
                fontFamily: 'monospace',
                fontSize: '11px',
              }}
            />
          </Field>

          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              onClick={run}
              disabled={!inputUrl || processing}
              style={{
                padding: '8px',
                background: inputUrl && !processing ? 'var(--accent)' : 'var(--border)',
                color: inputUrl && !processing ? '#000' : 'var(--muted)',
                border: 'none',
                borderRadius: 'var(--radius)',
                fontWeight: 'bold',
                transition: 'background 0.15s',
              }}
            >
              {processing ? 'processing...' : 'sort'}
            </button>

            <button
              onClick={() => setOpts(DEFAULTS)}
              style={{
                padding: '8px',
                background: 'transparent',
                color: 'var(--muted)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
              }}
            >
              reset to defaults
            </button>

            {outputUrl && (
              <button
                onClick={download}
                style={{
                  padding: '8px',
                  background: 'transparent',
                  color: 'var(--accent)',
                  border: '1px solid var(--accent)',
                  borderRadius: 'var(--radius)',
                }}
              >
                download
              </button>
            )}
          </div>
        </aside>

        {/* Preview area */}
        <div
          style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}
        >
          {!inputUrl ? (
            <div
              onDrop={handleDrop}
              onDragOver={e => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onClick={() => fileInputRef.current?.click()}
              style={{
                flex: 1,
                border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 'var(--radius)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                color: dragging ? 'var(--accent)' : 'var(--muted)',
                transition: 'border-color 0.15s, color 0.15s',
              }}
            >
              <span style={{ fontSize: '32px' }}>+</span>
              <span>drop image or click to upload</span>
              <span style={{ fontSize: '11px' }}>JPEG · PNG · WebP · BMP · GIF · TIFF</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) loadFile(f);
                }}
              />
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', gap: '16px', minHeight: 0 }}>
              <ImagePane
                label="original"
                url={inputUrl}
                onReplace={() => fileInputRef.current?.click()}
                onExclude={rect => {
                  const s = rect.join(',');
                  setExcludeStr(prev => prev ? `${prev}\n${s}` : s);
                }}
                excludeRegions={excludeStr
                  .split(/[\s;]+/)
                  .map(s => s.trim())
                  .filter(Boolean)
                  .map(s => s.split(',').map(n => parseInt(n.trim(), 10)))
                  .filter(arr => arr.length === 4 && arr.every(n => !isNaN(n))) as Array<[number, number, number, number]>}
              />
              {outputUrl && <ImagePane label="sorted" url={outputUrl} />}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) loadFile(f);
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Tooltip({ text }: { text: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <span
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      <span
        style={{
          width: '14px',
          height: '14px',
          borderRadius: '50%',
          border: '1px solid var(--muted)',
          color: 'var(--muted)',
          fontSize: '10px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'default',
          userSelect: 'none',
          flexShrink: 0,
        }}
      >
        ?
      </span>
      {visible && (
        <span
          style={{
            position: 'absolute',
            left: 'calc(100% + 8px)',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '200px',
            background: '#222',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '8px 10px',
            fontSize: '11px',
            color: 'var(--text)',
            lineHeight: '1.5',
            zIndex: 10,
            pointerEvents: 'none',
          }}
        >
          {text}
        </span>
      )}
    </span>
  );
}

function Field({
  label,
  tooltip,
  children,
}: {
  label: string;
  tooltip?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span
          style={{
            color: 'var(--muted)',
            textTransform: 'uppercase',
            fontSize: '11px',
            letterSpacing: '0.05em',
          }}
        >
          {label}
        </span>
        {tooltip && <Tooltip text={tooltip} />}
      </div>
      {children}
    </div>
  );
}

function ImagePane({
  label,
  url,
  onReplace,
  onExclude,
  excludeRegions = [],
}: {
  label: string;
  url: string;
  onReplace?: () => void;
  onExclude?: (rect: [number, number, number, number]) => void;
  excludeRegions?: Array<[number, number, number, number]>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [drawing, setDrawing] = useState<{x: number, y: number, w: number, h: number} | null>(null);
  const [startPos, setStartPos] = useState<{x: number, y: number} | null>(null);

  const getTransform = () => {
    if (!containerRef.current || !imgRef.current) return null;
    const container = containerRef.current.getBoundingClientRect();
    const img = imgRef.current;
    
    const viewRatio = container.width / container.height;
    const imgRatio = img.naturalWidth / img.naturalHeight;
    
    let drawWidth = container.width;
    let drawHeight = container.height;
    let drawX = 0;
    let drawY = 0;
    
    if (viewRatio > imgRatio) {
      drawWidth = container.height * imgRatio;
      drawX = (container.width - drawWidth) / 2;
    } else {
      drawHeight = container.width / imgRatio;
      drawY = (container.height - drawHeight) / 2;
    }

    const scaleX = img.naturalWidth / drawWidth;
    const scaleY = img.naturalHeight / drawHeight;

    return { offsetX: drawX, offsetY: drawY, scaleX, scaleY };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!onExclude || !containerRef.current || !imgRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setStartPos({ x, y });
    setDrawing({ x, y, w: 0, h: 0 });
    containerRef.current.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!startPos || !onExclude || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setDrawing({
      x: Math.min(startPos.x, x),
      y: Math.min(startPos.y, y),
      w: Math.abs(x - startPos.x),
      h: Math.abs(y - startPos.y),
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!startPos || !onExclude || !drawing || !containerRef.current) return;
    containerRef.current.releasePointerCapture(e.pointerId);
    
    setStartPos(null);
    setDrawing(null);

    const t = getTransform();
    if (!t) return;

    const x1 = Math.round((drawing.x - t.offsetX) * t.scaleX);
    const y1 = Math.round((drawing.y - t.offsetY) * t.scaleY);
    const x2 = Math.round((drawing.x + drawing.w - t.offsetX) * t.scaleX);
    const y2 = Math.round((drawing.y + drawing.h - t.offsetY) * t.scaleY);

    const nx1 = Math.max(0, Math.min(x1, imgRef.current!.naturalWidth));
    const ny1 = Math.max(0, Math.min(y1, imgRef.current!.naturalHeight));
    const nx2 = Math.max(0, Math.min(x2, imgRef.current!.naturalWidth));
    const ny2 = Math.max(0, Math.min(y2, imgRef.current!.naturalHeight));

    if (nx2 > nx1 && ny2 > ny1) {
      onExclude([nx1, ny1, nx2, ny2]);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span
          style={{
            color: 'var(--muted)',
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {label}
        </span>
        {onReplace && (
          <button
            onClick={onReplace}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--muted)',
              fontSize: '11px',
              padding: 0,
              textDecoration: 'underline',
              cursor: 'pointer',
            }}
          >
            replace
          </button>
        )}
      </div>
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          flex: 1,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          cursor: onExclude ? 'crosshair' : 'default',
        }}
      >
        <img
          ref={imgRef}
          src={url}
          alt={label}
          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block', pointerEvents: 'none' }}
        />
        {onExclude && drawing && (
          <div
            style={{
              position: 'absolute',
              left: drawing.x,
              top: drawing.y,
              width: drawing.w,
              height: drawing.h,
              border: '1px dashed var(--accent)',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              pointerEvents: 'none',
            }}
          />
        )}
        {onExclude && containerRef.current && imgRef.current && excludeRegions.map((r, i) => {
          const t = getTransform();
          if (!t) return null;
          const left = r[0] / t.scaleX + t.offsetX;
          const top = r[1] / t.scaleY + t.offsetY;
          const width = (r[2] - r[0]) / t.scaleX;
          const height = (r[3] - r[1]) / t.scaleY;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left,
                top,
                width,
                height,
                border: '1px solid rgba(255,0,0,0.5)',
                backgroundColor: 'rgba(255,0,0,0.1)',
                pointerEvents: 'none',
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
