import { expect } from 'chai';
import { readImage, writeImage } from '../src/image';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { Jimp } from 'jimp';

const FIXTURE_WIDTH = 4;
const FIXTURE_HEIGHT = 4;

/** Write a small solid-colour PNG to a temp path and return the path. */
async function writeTempPng(): Promise<string> {
  const filePath = path.join(os.tmpdir(), `pixel-sort-test-${Date.now()}.png`);
  const img = Jimp.fromBitmap({
    data: new Uint8Array(FIXTURE_WIDTH * FIXTURE_HEIGHT * 4).fill(128),
    width: FIXTURE_WIDTH,
    height: FIXTURE_HEIGHT,
  });
  await (img as any).write(filePath);
  return filePath;
}

describe('image: readImage()', () => {
  let fixturePath: string;
  before(async () => {
    fixturePath = await writeTempPng();
  });
  after(() => {
    fs.unlinkSync(fixturePath);
  });

  it('returns correct dimensions', async () => {
    const img = await readImage(fixturePath);
    expect(img.width).to.equal(FIXTURE_WIDTH);
    expect(img.height).to.equal(FIXTURE_HEIGHT);
  });

  it('returns a Uint8Array of length width * height * 4', async () => {
    const img = await readImage(fixturePath);
    expect(img.data).to.be.instanceOf(Uint8Array);
    expect(img.data.length).to.equal(FIXTURE_WIDTH * FIXTURE_HEIGHT * 4);
  });

  it('throws on a non-existent file', async () => {
    let threw = false;
    try {
      await readImage('/nonexistent/file.png');
    } catch {
      threw = true;
    }
    expect(threw).to.be.true;
  });
});

describe('image: writeImage()', () => {
  let outPath: string;
  after(() => {
    if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
  });

  it('writes a file that can be read back with matching dimensions', async () => {
    outPath = path.join(os.tmpdir(), `pixel-sort-write-test-${Date.now()}.png`);
    const data = new Uint8Array(FIXTURE_WIDTH * FIXTURE_HEIGHT * 4).fill(200);
    await writeImage(outPath, { data, width: FIXTURE_WIDTH, height: FIXTURE_HEIGHT });

    expect(fs.existsSync(outPath)).to.be.true;
    const readBack = await readImage(outPath);
    expect(readBack.width).to.equal(FIXTURE_WIDTH);
    expect(readBack.height).to.equal(FIXTURE_HEIGHT);
  });
});
