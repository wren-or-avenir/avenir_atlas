import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveOceanLook } from '../src/components/ocean/colors';
import type { ClimateParams } from '../src/core/theme/theme';

const SUNNY: ClimateParams = {
  rainIntensity: 0,
  rainTilt: 0,
  lightningFrequency: 0,
  saturation: 1,
  brightness: 1,
};

const TYPHOON: ClimateParams = {
  rainIntensity: 1,
  rainTilt: 45,
  lightningFrequency: 0.5,
  saturation: 0.5,
  brightness: 0.7,
};

function assertClose(actual: number, expected: number, epsilon = 1e-4): void {
  assert.ok(
    Math.abs(actual - expected) < epsilon,
    `expected ${actual} to be close to ${expected}`,
  );
}

describe('resolveOceanLook', () => {
  it('晴天时返回参考图昼夜色板', () => {
    const day = resolveOceanLook('day', SUNNY);
    assert.ok(day.deep[2] > day.deep[1]);
    assert.ok(day.shallow[1] > day.deep[1]);
    assert.ok(day.foamIntensity > 0);
    const night = resolveOceanLook('night', SUNNY);
    assert.ok(night.deep[2] > night.deep[0]);
    assert.ok(night.crest[2] > night.crest[0]);
    assert.ok(night.deep[1] < day.deep[1]);
  });

  it('台风天气：降饱和降亮度', () => {
    const look = resolveOceanLook('day', TYPHOON);
    const sunny = resolveOceanLook('day', SUNNY);
    const luma=(c:readonly number[])=>c[0]*0.299+c[1]*0.587+c[2]*0.114;
    assert.ok(luma(look.shallow)<luma(sunny.shallow));
    assert.ok(Math.max(...look.shallow)-Math.min(...look.shallow)<Math.max(...sunny.shallow)-Math.min(...sunny.shallow));
    assertClose(look.glintStrength, resolveOceanLook('day', SUNNY).glintStrength * TYPHOON.brightness);
  });

  it('饱和度为 0 时三通道相等（纯灰）', () => {
    const look = resolveOceanLook('day', { ...SUNNY, saturation: 0, brightness: 1 });
    const [r, g, b] = look.deep;
    assertClose(r, g);
    assertClose(g, b);
  });

  it('夜晚由历史受激程度驱动，而不是换一套波形', () => {
    const day = resolveOceanLook('day', SUNNY);
    const night = resolveOceanLook('night', SUNNY);
    assert.equal(night.foamIntensity, 0.65);
    assert.equal(day.foamIntensity, 1);
    assert.ok(night.sparkleStrength > day.sparkleStrength);
  });
});
