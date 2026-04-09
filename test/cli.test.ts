import { expect } from 'chai';
import { spawnSync } from 'child_process';
import { Jimp } from 'jimp';
import os from 'os';
import path from 'path';
import fs from 'fs';

const CLI = path.resolve('src/index.ts');
const FIXTURE_WIDTH = 4;
const FIXTURE_HEIGHT = 4;

async function writeTempPng(): Promise<string> {
  const filePath = path.join(os.tmpdir(), `pixel-sort-cli-test-${Date.now()}.png`);
  const img = Jimp.fromBitmap({
    data: new Uint8Array(FIXTURE_WIDTH * FIXTURE_HEIGHT * 4).fill(128),
    width: FIXTURE_WIDTH,
    height: FIXTURE_HEIGHT,
  });
  await (img as any).write(filePath);
  return filePath;
}

function cli(args: string[]): ReturnType<typeof spawnSync> {
  return spawnSync('node', ['--import', 'tsx', CLI, ...args], { encoding: 'utf8' });
}

describe('cli: CLI — invalid options', () => {
  it('exits 1 with an error message for an invalid direction', () => {
    const result = cli(['nonexistent.png', '-d', 'diagonal']);
    expect(result.status).to.equal(1);
    expect(result.stderr).to.include('Invalid direction');
  });

  it('exits 1 with an error message for an invalid key', () => {
    const result = cli(['nonexistent.png', '-k', 'purple']);
    expect(result.status).to.equal(1);
    expect(result.stderr).to.include('Invalid key');
  });

  it('exits 1 with an error message for an invalid mode', () => {
    const result = cli(['nonexistent.png', '-m', 'spiral']);
    expect(result.status).to.equal(1);
    expect(result.stderr).to.include('Invalid mode');
  });

  it('exits 1 when the input file does not exist', () => {
    const result = cli(['/nonexistent/file.png']);
    expect(result.status).to.equal(1);
    expect(result.stderr).to.include('Error reading image');
  });
});

describe('cli: CLI — valid options', () => {
  let fixturePath: string;
  const outputFiles: string[] = [];

  before(async () => {
    fixturePath = await writeTempPng();
  });
  after(() => {
    fs.unlinkSync(fixturePath);
    for (const f of outputFiles) if (fs.existsSync(f)) fs.unlinkSync(f);
  });

  function run(extraArgs: string[] = []): {
    status: number | null;
    stdout: string;
    outPath: string;
  } {
    const result = cli([fixturePath, ...extraArgs]);
    const stdout = String(result.stdout);
    // Derive expected output path from stdout mentioning "Writing"
    const match = stdout.match(/Writing (.+?)\.\.\./);
    const outPath = match ? path.join(path.dirname(fixturePath), match[1]) : '';
    if (outPath) outputFiles.push(outPath);
    return { status: result.status, stdout, outPath };
  }

  it('exits 0 with default options', () => {
    const { status } = run();
    expect(status).to.equal(0);
  });

  it('produces an output file with default options', () => {
    const { outPath } = run();
    expect(fs.existsSync(outPath)).to.be.true;
  });

  it('exits 0 with --direction vertical', () => {
    expect(run(['-d', 'vertical']).status).to.equal(0);
  });

  it('exits 0 with --mode full', () => {
    expect(run(['-m', 'full']).status).to.equal(0);
  });

  it('exits 0 with --mode random', () => {
    expect(run(['-m', 'random']).status).to.equal(0);
  });

  it('exits 0 with --key hue', () => {
    expect(run(['-k', 'hue']).status).to.equal(0);
  });

  it('exits 0 with --reverse', () => {
    expect(run(['-r']).status).to.equal(0);
  });

  it('honours --output path', () => {
    const outPath = path.join(os.tmpdir(), `pixel-sort-explicit-out-${Date.now()}.png`);
    outputFiles.push(outPath);
    const result = cli([fixturePath, '-o', outPath]);
    expect(result.status).to.equal(0);
    expect(fs.existsSync(outPath)).to.be.true;
  });

  it('auto-generates output filename encoding the options', () => {
    const { outPath } = run(['-d', 'vertical', '-k', 'hue', '-m', 'full']);
    expect(path.basename(outPath)).to.include('v_hue_full');
  });
});
