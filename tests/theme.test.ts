import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  getDayNight,
  getSeason,
  resolveWeatherParams,
  type ClimateParams,
  type WeatherInput,
} from '../src/core/theme/theme';
import { resolveThemeConfig } from '../src/core/theme/config';

function assertClose(actual: number, expected: number, epsilon = 1e-9): void {
  assert.ok(
    Math.abs(actual - expected) < epsilon,
    `expected ${actual} to be close to ${expected}`,
  );
}

describe('getSeason', () => {
  it('按月分四季', () => {
    const cases: readonly (readonly [number, string])[] = [
      [1, 'winter'],
      [2, 'winter'],
      [3, 'spring'],
      [5, 'spring'],
      [6, 'summer'],
      [8, 'summer'],
      [9, 'autumn'],
      [11, 'autumn'],
      [12, 'winter'],
    ];
    for (const [month, expected] of cases) {
      assert.equal(getSeason(new Date(2026, month - 1, 15)), expected, `月份 ${month}`);
    }
  });
});

describe('getDayNight', () => {
  it('默认 6 点起算白天，18 点起算夜晚', () => {
    assert.equal(getDayNight(new Date(2026, 0, 1, 5, 59)), 'night');
    assert.equal(getDayNight(new Date(2026, 0, 1, 6, 0)), 'day');
    assert.equal(getDayNight(new Date(2026, 0, 1, 17, 59)), 'day');
    assert.equal(getDayNight(new Date(2026, 0, 1, 18, 0)), 'night');
  });

  it('自定义配置覆盖默认阈值', () => {
    const config = { dayStartHour: 8, dayEndHour: 20 };
    assert.equal(getDayNight(new Date(2026, 0, 1, 7), config), 'night');
    assert.equal(getDayNight(new Date(2026, 0, 1, 8), config), 'day');
    assert.equal(getDayNight(new Date(2026, 0, 1, 19), config), 'day');
    assert.equal(getDayNight(new Date(2026, 0, 1, 20), config), 'night');
  });
});

describe('resolveWeatherParams', () => {
  it('晴天参数全默认', () => {
    const input: WeatherInput = { condition: 'sunny', windSpeed: 0 };
    const params: ClimateParams = {
      rainIntensity: 0,
      rainTilt: 0,
      lightningFrequency: 0,
      saturation: 1,
      brightness: 1,
    };
    assert.deepEqual(resolveWeatherParams(input), params);
  });

  it('雨天倾角与雨量随风速驱动', () => {
    const input: WeatherInput = { condition: 'rain', windSpeed: 25 };
    const params = resolveWeatherParams(input);
    assertClose(params.rainTilt, 22.5);
    assertClose(params.rainIntensity, 0.4);
    assert.equal(params.lightningFrequency, 0);
  });

  it('台风满档：倾角上限 45 度、雷电与降饱和', () => {
    const input: WeatherInput = { condition: 'typhoon', windSpeed: 80 };
    const params = resolveWeatherParams(input);
    assertClose(params.rainTilt, 45);
    assertClose(params.rainIntensity, 1);
    assertClose(params.lightningFrequency, 0.5);
    assertClose(params.saturation, 0.5);
    assertClose(params.brightness, 0.7);
  });

  it('雪天无风时也有基础雨量但无倾角', () => {
    const input: WeatherInput = { condition: 'snow', windSpeed: 0 };
    const params = resolveWeatherParams(input);
    assertClose(params.rainIntensity, 0.18);
    assertClose(params.rainTilt, 0);
  });
});

describe('resolveThemeConfig', () => {
  it('未设环境变量时使用默认值', () => {
    assert.deepEqual(resolveThemeConfig({}), { dayStartHour: 6, dayEndHour: 18 });
  });

  it('环境变量覆盖默认值', () => {
    const config = resolveThemeConfig({ THEME_DAY_START: '7', THEME_DAY_END: '19' });
    assert.deepEqual(config, { dayStartHour: 7, dayEndHour: 19 });
  });

  it('非法环境变量直接报错，不静默降级', () => {
    assert.throws(() => resolveThemeConfig({ THEME_DAY_START: 'abc' }));
    assert.throws(() => resolveThemeConfig({ THEME_DAY_END: '25' }));
  });
});
