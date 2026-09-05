import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveSiteConfig, toWeatherEnv } from '../src/config/site';

describe('resolveSiteConfig', () => {
  it('未设环境变量时使用 mock 默认值', () => {
    assert.deepEqual(resolveSiteConfig({}), {
      weatherProvider: 'mock',
      weatherMockCondition: undefined,
      weatherMockWind: undefined,
      musicProvider: 'mock',
    });
  });

  it('PUBLIC_ 前缀环境变量生效', () => {
    assert.deepEqual(
      resolveSiteConfig({
        PUBLIC_WEATHER_PROVIDER: 'qweather',
        PUBLIC_WEATHER_MOCK_CONDITION: 'typhoon',
        PUBLIC_MUSIC_PROVIDER: 'netease',
      }),
      {
        weatherProvider: 'qweather',
        weatherMockCondition: 'typhoon',
        weatherMockWind: undefined,
        musicProvider: 'netease',
      },
    );
  });
});

describe('toWeatherEnv', () => {
  it('映射回 core/weather 的键名', () => {
    assert.deepEqual(
      toWeatherEnv({
        weatherProvider: 'mock',
        weatherMockCondition: 'rain',
        weatherMockWind: '20',
        musicProvider: 'mock',
      }),
      {
        WEATHER_PROVIDER: 'mock',
        WEATHER_MOCK_CONDITION: 'rain',
        WEATHER_MOCK_WIND: '20',
      },
    );
  });
});
