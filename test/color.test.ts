import { expect } from 'chai';
import { brightness, getSortValue } from '../src/color';

describe('color: brightness()', () => {
  it('returns 0 for black', () => {
    expect(brightness(0, 0, 0)).to.equal(0);
  });

  it('returns 1 for white', () => {
    expect(brightness(255, 255, 255)).to.equal(1);
  });

  it('uses luma coefficients (red)', () => {
    expect(brightness(255, 0, 0)).to.be.closeTo(0.299, 0.001);
  });

  it('uses luma coefficients (green)', () => {
    expect(brightness(0, 255, 0)).to.be.closeTo(0.587, 0.001);
  });

  it('uses luma coefficients (blue)', () => {
    expect(brightness(0, 0, 255)).to.be.closeTo(0.114, 0.001);
  });
});

describe('color: getSortValue()', () => {
  it('brightness key delegates to brightness()', () => {
    expect(getSortValue(255, 255, 255, 'brightness')).to.equal(1);
    expect(getSortValue(0, 0, 0, 'brightness')).to.equal(0);
  });

  it('red key returns normalised red channel', () => {
    expect(getSortValue(128, 0, 0, 'red')).to.be.closeTo(128 / 255, 0.001);
    expect(getSortValue(0, 255, 255, 'red')).to.equal(0);
  });

  it('green key returns normalised green channel', () => {
    expect(getSortValue(0, 200, 0, 'green')).to.be.closeTo(200 / 255, 0.001);
  });

  it('blue key returns normalised blue channel', () => {
    expect(getSortValue(0, 0, 100, 'blue')).to.be.closeTo(100 / 255, 0.001);
  });

  it('hue is 0 for grey (no saturation)', () => {
    expect(getSortValue(128, 128, 128, 'hue')).to.equal(0);
  });

  // hue switch — red is max (case rn), gn >= bn branch
  it('hue is ~0 for pure red', () => {
    expect(getSortValue(255, 0, 0, 'hue')).to.be.closeTo(0, 0.01);
  });

  // hue switch — red is max (case rn), gn < bn branch — produces hue near 1 (magenta/violet)
  it('hue wraps correctly when red is max and green < blue', () => {
    const h = getSortValue(255, 0, 128, 'hue');
    expect(h).to.be.within(0.8, 1.0);
  });

  // hue switch — green is max (case gn)
  it('hue is ~1/3 for pure green', () => {
    expect(getSortValue(0, 255, 0, 'hue')).to.be.closeTo(1 / 3, 0.01);
  });

  // hue switch — blue is max (default case)
  it('hue is ~2/3 for pure blue', () => {
    expect(getSortValue(0, 0, 255, 'hue')).to.be.closeTo(2 / 3, 0.01);
  });

  it('saturation is 0 for grey', () => {
    expect(getSortValue(128, 128, 128, 'saturation')).to.equal(0);
  });

  // saturation formula: l <= 0.5 branch — dark vivid colour
  it('saturation is non-zero for a dark vivid colour (l <= 0.5 branch)', () => {
    expect(getSortValue(180, 0, 0, 'saturation')).to.be.closeTo(1, 0.01);
  });

  // saturation formula: l > 0.5 branch — light vivid colour
  it('saturation is non-zero for a light vivid colour (l > 0.5 branch)', () => {
    expect(getSortValue(255, 128, 128, 'saturation')).to.be.greaterThan(0);
  });

  it('lightness is ~0.5 for mid-grey', () => {
    expect(getSortValue(128, 128, 128, 'lightness')).to.be.closeTo(0.5, 0.01);
  });

  it('lightness is 0 for black', () => {
    expect(getSortValue(0, 0, 0, 'lightness')).to.equal(0);
  });

  it('lightness is 1 for white', () => {
    expect(getSortValue(255, 255, 255, 'lightness')).to.equal(1);
  });
});
