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
    assertClose(day.deep[0], 0.19);
    assertClose(day.deep[1], 0.33);
    assertClose(day.deep[2], 0.33);
    assertClose(day.shallow[2], 0.47);
    const night = resolveOceanLook('night', SUNNY);
    assertClose(night.deep[0], 0.004);
    assertClose(night.deep[2], 0.03);
    assertClose(night.crest[0], 0.18);
    assertClose(night.crest[2], 0.9);
  });

  it('台风天气：降饱和降亮度', () => {
    const look = resolveOceanLook('day', TYPHOON);
    assertClose(look.shallow[0], 0.2112);
    assertClose(look.shallow[1], 0.2917);
    assertClose(look.shallow[2], 0.2987);
    assertClose(look.glintStrength, 0.35);
  });

  it('饱和度为 0 时三通道相等（纯灰）', () => {
    const look = resolveOceanLook('day', { ...SUNNY, saturation: 0, brightness: 1 });
    const [r, g, b] = look.deep;
    assertClose(r, g);
    assertClose(g, b);
  });

  it('夜晚荧光面积大于白天（泡沫阈值更低、闪点更强）', () => {
    const day = resolveOceanLook('day', SUNNY);
    const night = resolveOceanLook('night', SUNNY);
    assert.ok(night.foamThreshold < day.foamThreshold);
    assert.ok(night.sparkleStrength > day.sparkleStrength);
  });
});
